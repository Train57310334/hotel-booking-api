import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { EventsGateway } from '@/modules/events/events.gateway';
import { ReviewsService } from '@/modules/reviews/reviews.service';
import { ActivityLogsService } from '@/modules/activity-logs/activity-logs.service';
import { SettingsService } from '@/modules/settings/settings.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

// Helper: generate date range array [checkIn, checkOut) exclusive of checkOut
function buildDateRange(checkIn: Date, checkOut: Date): Date[] {
  const range: Date[] = [];
  let d = new Date(checkIn);
  while (d < checkOut) {
    range.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return range;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private inventoryService: InventoryService,
    private eventsGateway: EventsGateway,
    private reviewsService: ReviewsService,
    private activityLogsService: ActivityLogsService,
    private settingsService: SettingsService,
  ) {}

  // ─── BOOKING DRAFT STORE (Database backed, 15-min TTL) ─────────────────────────
  // Allows payment page to recover booking payload if localStorage is cleared.
  
  async saveDraft(data: any): Promise<{ draftId: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const draft = await this.prisma.bookingDraft.create({
       data: {
          data,
          expiresAt
       }
    });
    return { draftId: draft.id, expiresAt };
  }

  async getDraft(draftId: string): Promise<any | null> {
    const draft = await this.prisma.bookingDraft.findUnique({ where: { id: draftId } });
    if (!draft) return null;
    if (new Date() > draft.expiresAt) {
      await this.prisma.bookingDraft.delete({ where: { id: draftId } });
      return null;
    }
    return draft.data;
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async cleanExpiredDrafts() {
    await this.prisma.bookingDraft.deleteMany({
       where: {
          expiresAt: { lt: new Date() }
       }
    });
  }

  @Cron('0 */15 * * * *') // Every 15 minutes
  async cleanExpiredPendingBookings() {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'pending',
        createdAt: { lt: thirtyMinsAgo }
      }
    });

    for (const booking of expiredBookings) {
      try {
        await this.cancelBooking(booking.id);
        // cancelBooking already handles inventory restore and notifications
      } catch (e) {
        console.error(`Failed to auto-cancel booking ${booking.id}:`, e);
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  async create(data: any) {
      // 1. Check Inventory Availability (General Room Type)
      const available = await this.inventoryService.checkAvailability(
        data.roomTypeId,
        data.checkIn,
        data.checkOut,
      );
      if (!available) throw new NotFoundException('No rooms available for selected dates');

      // 2. Check Specific Room Conflict (If roomId provided)
      const checkInDate = new Date(data.checkIn);
      const checkOutDate = new Date(data.checkOut);

      if (data.roomId) {
          const roomConflict = await this.prisma.booking.findFirst({
              where: {
                  roomId: data.roomId,
                  status: { not: 'cancelled' },
                  checkIn: { lt: checkOutDate }, // Overlap logic
                  checkOut: { gt: checkInDate }
              }
          });

          if (roomConflict) {
              throw new ConflictException(`Selected Room is already booked for these dates.`);
          }
      }

      // 2.1 Auto-assign Room if not provided
      if (!data.roomId) {
          const conflictingBookings = await this.prisma.booking.findMany({
              where: {
                  roomTypeId: data.roomTypeId,
                  roomId: { not: null },
                  status: { not: 'cancelled' },
                  checkIn: { lt: checkOutDate },
                  checkOut: { gt: checkInDate }
              },
              select: { roomId: true }
          });
          const conflictingRoomIds = conflictingBookings.map(b => b.roomId).filter((id): id is string => id !== null);

          const availableRoom = await this.prisma.room.findFirst({
              where: {
                  roomTypeId: data.roomTypeId,
                  deletedAt: null,
                  ...(conflictingRoomIds.length > 0 ? { id: { notIn: conflictingRoomIds } } : {})
              }
          });

          if (!availableRoom) {
             throw new NotFoundException('No specific room available for assignment (unexpected inventory mismatch)');
          }
          data.roomId = availableRoom.id;
      }

      // 3. Price Validation & Calculation
      const validatedPrice = await this.calculateTotalPrice(
        data.roomTypeId,
        data.ratePlanId,
        checkInDate,
        checkOutDate,
        data.promotionCode,
      );
      
      // If client sent a price deviance > 1% or > 50 units
      if (data.totalAmount && Math.abs(data.totalAmount - validatedPrice) > 50) {
          // Warning or Error? Let's be strict but clear.
          throw new BadRequestException(`Price validation failed: Server calculated ${validatedPrice}, but received ${data.totalAmount}`);
      }
      // Enforce server-side price (if client didn't send it, or if it was close enough)
      data.totalAmount = validatedPrice;

      // 4. Transaction: Create Booking + Deduct Inventory
      const booking = await this.prisma.$transaction(async (tx) => {
        let finalPromoId = null;
        if (data.promotionCode) {
            const promo = await tx.promotion.findUnique({ where: { code: data.promotionCode }, include: { hotel: true } });
            const now = new Date();
            const isValid = promo && promo.startDate <= now && promo.endDate >= now && promo.isActive && (promo.maxUses === null || promo.usedCount < promo.maxUses) && (!promo.hotel || promo.hotel.hasPromotions);
            if (isValid) {
                finalPromoId = promo.id;
                await tx.promotion.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
            }
        }

        const bookingData: Prisma.BookingUncheckedCreateInput = {
          userId: data.userId ?? null,
          hotelId: data.hotelId,
          roomTypeId: data.roomTypeId,
          ratePlanId: data.ratePlanId,
          roomId: data.roomId,
          promotionId: finalPromoId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guestsAdult: data.guests?.adult ?? 2,
          guestsChild: data.guests?.child ?? 0,
          totalAmount: data.totalAmount ?? 0,
          status: 'pending',
          leadName: data.leadGuest?.name ?? 'Guest',
          leadEmail: data.leadGuest?.email ?? 'guest@example.com',
          leadPhone: data.leadGuest?.phone ?? '',
          specialRequests: data.specialRequests ?? null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const newBooking = await tx.booking.create({
          data: bookingData,
          include: { hotel: true, roomType: true },
        });

        if (data.paymentMethod) {
            // Create nested payment
            await tx.payment.create({
                data: {
                    bookingId: newBooking.id,
                    amount: data.totalAmount ?? 0,
                    provider: data.paymentMethod,
                    status: data.paymentStatus ?? 'pending',
                    currency: 'THB'
                }
            });
        }

        // Deduct Stock
        const dateRange: Date[] = [];
        let d = new Date(checkInDate);
        while (d < checkOutDate) {
          dateRange.push(new Date(d));
          d.setDate(d.getDate() + 1);
        }

        await this.inventoryService.reduceInventory(data.roomTypeId, dateRange, tx);
        return newBooking;
      });

      // 4. Send Confirmation Email (Received / Pending)
      await this.notificationsService.sendBookingReceivedEmail(booking);

      // 5. Emit Real-time Notification to Hotel Staff
      this.eventsGateway.broadcastToHotel(booking.hotelId, 'newBooking', booking);

      return booking;
  }

  async checkoutBooking(draftId: string, payload: any) {
    // ⚠️  MOCK PAYMENT ONLY — This endpoint exists for local/dev testing.
    //     Toggle via Super Admin → CMS → Security → "Enable Mock Payment".
    //     Or set ALLOW_MOCK_PAYMENT=true in .env for local development.
    //     Always disabled in production unless explicitly enabled in DB.
    const mockEnabled = await this.settingsService.isMockPaymentEnabled();
    if (!mockEnabled) {
      throw new BadRequestException('Mock payment checkout is disabled. Please integrate a real payment gateway (Stripe, Omise, 2c2p).');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: draftId }
    });

    if (!booking) {
      throw new NotFoundException('Booking session expired or not found.');
    }

    if (booking.status !== 'pending') {
      throw new BadRequestException('This booking has already been processed.');
    }

    // Simulate payment processing delay (mock only)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const isSuccess = payload.cardNumber && payload.cardNumber.length >= 15;
    if (!isSuccess) {
      throw new BadRequestException('Payment declined. Please check your card details.');
    }

    const updatedBooking = await this.prisma.$transaction(async (tx) => {
        const confirmedBooking = await tx.booking.update({
            where: { id: draftId },
            data: { status: 'confirmed' }
        });

        // ✅ BUG FIX: Check for existing payment record before creating a new one.
        // `createPublicBooking` may have already created a pending payment record.
        const existingPayment = await tx.payment.findFirst({ where: { bookingId: draftId } });
        if (!existingPayment) {
            await tx.payment.create({
                data: {
                    bookingId: confirmedBooking.id,
                    amount: confirmedBooking.totalAmount,
                    method: 'Credit Card',
                    provider: 'System (Mock)',
                    status: 'captured',
                    currency: 'THB',
                    chargeId: `ch_mock_${Date.now()}`
                }
            });
        } else {
            // Update the existing payment record to captured
            await tx.payment.update({
                where: { id: existingPayment.id },
                data: { status: 'captured', chargeId: `ch_mock_${Date.now()}` }
            });
        }

        return confirmedBooking;
    });

    try {
        await this.notificationsService.sendBookingReceivedEmail(updatedBooking);
    } catch (e) {
        console.warn('Failed to send success email', e);
    }

    return { success: true, booking: updatedBooking };
  }

  /**
   * 🛒 สร้างการจองผ่าน Public Booking Engine (รองรับหลายห้อง)
   */
  async createPublicBooking(data: any) {
    const checkInDate = new Date(data.checkInDate);
    const checkOutDate = new Date(data.checkOutDate);

    // Ensure dates are valid
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new BadRequestException('Invalid check-in or check-out date');
    }

    if (!data.rooms || !Array.isArray(data.rooms) || data.rooms.length === 0) {
      throw new BadRequestException('At least one room must be selected');
    }

    // 1. Transactionally lock and validate everything
    return await this.prisma.$transaction(async (tx) => {
        let backendCalculatedTotal = 0;

        for (const roomOpt of data.rooms) {
           // A. Re-verify Inventory exactly for this quantity
           const dateRange: Date[] = [];
           let d = new Date(checkInDate);
           while (d < checkOutDate) {
              dateRange.push(new Date(d));
              d.setDate(d.getDate() + 1);
           }

           const totalRooms = await tx.room.count({ where: { roomTypeId: roomOpt.roomTypeId, deletedAt: null, status: { not: 'OOO' } } });
           for (const date of dateRange) {
              const inv = await tx.inventoryCalendar.findFirst({
                 where: { roomTypeId: roomOpt.roomTypeId, date }
              });
              
              const available = inv ? inv.allotment : totalRooms;
              if (available < roomOpt.quantity) {
                 throw new ConflictException(`Insufficient inventory for Room Type ${roomOpt.roomTypeId} on ${date.toISOString().split('T')[0]}`);
              }
           }

           // B. Re-calculate Price exactly for this room and rate plan
           // To reuse `calculateTotalPrice` inside a transaction reliably without race conditions,
           // we inline a simplified version or assume `calculateTotalPrice` doesn't do complex DB locking.
           // For safety, we recalculate manually within this `tx` block.
           
           const roomType = await tx.roomType.findUnique({ where: { id: roomOpt.roomTypeId } });
           if (!roomType) throw new NotFoundException('RoomType provided not found');

           const ratePlan = await tx.ratePlan.findUnique({ where: { id: roomOpt.ratePlanId } }) as any;
           if (!ratePlan) throw new NotFoundException('RatePlan provided not found');

           let roomTotal = 0;
           let cur = new Date(checkInDate);
           
           const overrides = await tx.rateOverride.findMany({
               where: { roomTypeId: roomOpt.roomTypeId, ratePlanId: roomOpt.ratePlanId, date: { gte: checkInDate, lt: checkOutDate } }
           });
           const overrideMap = new Map<string, number>();
           overrides.forEach(o => overrideMap.set(o.date.toISOString().split('T')[0], o.baseRate));

           while (cur < checkOutDate) {
               const dateKey = cur.toISOString().split('T')[0];
               if (overrideMap.has(dateKey)) {
                   roomTotal += overrideMap.get(dateKey);
               } else {
                   let nightly = roomType.basePrice || 0;
                   // Use breakfastPrice from RatePlan (set by hotel admin) — no more hardcoded value
                   if (ratePlan.includesBreakfast && ratePlan.breakfastPrice > 0) {
                       nightly += ratePlan.breakfastPrice;
                   }
                   roomTotal += nightly;
               }
               cur.setDate(cur.getDate() + 1);
           }

           // Multiply by quantity
           roomTotal *= roomOpt.quantity;
           backendCalculatedTotal += roomTotal;
        }

        let appliedDiscount = 0;
        let finalPromoLog = null;
        let finalPromoId = null;

        // C0. Validate Promotion Code if provided
        if (data.promotionCode) {
            const promo = await tx.promotion.findUnique({
                where: { code: data.promotionCode },
                include: { hotel: true }
            });

            if (promo) {
                const now = new Date();
                const isValid = now >= promo.startDate && now <= promo.endDate && 
                                (!promo.hotel || promo.hotel.hasPromotions) &&
                                promo.isActive &&
                                (promo.maxUses === null || promo.usedCount < promo.maxUses);
                
                if (isValid) {
                    if (promo.type === 'percent') {
                        appliedDiscount = Math.floor(backendCalculatedTotal * (promo.value / 100));
                    } else {
                        appliedDiscount = promo.value;
                    }
                    
                    // Cap discount
                    if (appliedDiscount > backendCalculatedTotal) {
                        appliedDiscount = backendCalculatedTotal;
                    }
                    
                    backendCalculatedTotal -= appliedDiscount;
                    finalPromoLog = `[PROMO: ${promo.code} - Saved ${appliedDiscount}]`;
                    finalPromoId = promo.id;
                    await tx.promotion.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
                }
            }
        }

        // C. Price Anti-Spoofing Check
        if (Math.abs((data.totalPrice || 0) - backendCalculatedTotal) > 50) {
            throw new BadRequestException(`Price manipulation detected. Expected ~${backendCalculatedTotal}, got ${data.totalPrice}. (Includes promo logic if applied)`);
        }

        // D. Create the parent Booking record
        // Since Prisma requires `roomTypeId` and `ratePlanId` at the top level for backwards compatibility,
        // we map the *first* room's details to the root level.
        // In a real multi-room DB schema, we'd have a `BookingRoom` Join Table. We will do our best with the current schema.
        
        const primaryRoom = data.rooms[0];
        
        const newBooking = await tx.booking.create({
            data: {
               userId: data.userId ?? null,
               hotelId: data.hotelId,
               roomTypeId: primaryRoom.roomTypeId,
               ratePlanId: primaryRoom.ratePlanId,
               promotionId: finalPromoId,
               checkIn: checkInDate,
               checkOut: checkOutDate,
               guestsAdult: data.adults ?? 2,
               guestsChild: data.children ?? 0,
               totalAmount: backendCalculatedTotal,
               status: 'pending',
               leadName: data.guestDetails?.name ?? 'Guest',
               leadEmail: data.guestDetails?.email ?? 'guest@example.com',
               leadPhone: data.guestDetails?.phone ?? '',
               specialRequests: data.guestDetails?.requests ? 
                    (finalPromoLog ? `${finalPromoLog}\n${data.guestDetails.requests}` : data.guestDetails.requests) : 
                    (finalPromoLog ? finalPromoLog : null),
            } as Prisma.BookingUncheckedCreateInput,
            include: { hotel: true, roomType: true }
        });

        // E. Save Payment record if paymentMethod is provided (from payment.js)
        // This is the SINGLE creation point — ensures payment is always linked to booking atomically
        if (data.paymentMethod) {
            await tx.payment.create({
                data: {
                    bookingId: newBooking.id,
                    amount: backendCalculatedTotal,
                    provider: data.paymentMethod,
                    status: data.paymentStatus ?? 'pending',
                    currency: 'THB',
                    method: data.paymentMethod,
                }
            });
        }

        // F. Deduct Inventory (Iterate all rooms again)
        for (const roomOpt of data.rooms) {
            const dateRange: Date[] = [];
            let d = new Date(checkInDate);
            while (d < checkOutDate) {
               dateRange.push(new Date(d));
               d.setDate(d.getDate() + 1);
            }

            for (const date of dateRange) {
               const inv = await tx.inventoryCalendar.findFirst({
                  where: { roomTypeId: roomOpt.roomTypeId, date }
               });
               
               if (inv) {
                   const updatedInv = await tx.inventoryCalendar.update({
                      where: { id: inv.id },
                      data: { allotment: { decrement: roomOpt.quantity } }
                   });
                   if (updatedInv.allotment < 0) {
                       throw new ConflictException(`Inventory exhausted mid-transaction for Room Type ${roomOpt.roomTypeId}`);
                   }
               } else {
                   const totalRooms = await tx.room.count({ where: { roomTypeId: roomOpt.roomTypeId, deletedAt: null, status: { not: 'OOO' } } });
                   if (totalRooms < roomOpt.quantity) {
                       throw new ConflictException(`Insufficient physical rooms for Room Type ${roomOpt.roomTypeId}`);
                   }
                   await tx.inventoryCalendar.create({
                       data: {
                           roomTypeId: roomOpt.roomTypeId,
                           date,
                           allotment: totalRooms - roomOpt.quantity,
                           stopSale: false,
                           minStay: 1
                       }
                   });
               }
            }
        }

        // G. Send Booking Received Email
        await this.notificationsService.sendBookingReceivedEmail(newBooking);

        // H. Emit Real-time Notification
        this.eventsGateway.broadcastToHotel(newBooking.hotelId, 'newBooking', newBooking);

        return newBooking;
    });
  }

  /** 👤 การจองของลูกค้า */
  // ✅ BUG #5 FIX: Include "active" stay (checkIn passed but checkOut not yet)
  async getMyBookings(userId: string, page: number = 1) {
    if (!userId) throw new NotFoundException('User ID is required');
    const now = new Date();
    const LIMIT = 50;
    const skip = (Math.max(1, page) - 1) * LIMIT;

    const [upcoming, active, past] = await Promise.all([
      // Future bookings (check-in is in the future)
      this.prisma.booking.findMany({
        where: { userId, checkIn: { gte: now } },
        include: { hotel: true, roomType: true, ratePlan: true, payment: true },
        orderBy: { checkIn: 'asc' },
        skip,
        take: LIMIT,
      }),
      // Active stays (checked-in but not yet checked out)
      this.prisma.booking.findMany({
        where: { userId, checkIn: { lt: now }, checkOut: { gte: now } },
        include: { hotel: true, roomType: true, ratePlan: true, payment: true },
        orderBy: { checkIn: 'asc' },
        take: LIMIT, // Active stays are typically few
      }),
      // Past bookings (already checked out) — most recent first, paginated
      this.prisma.booking.findMany({
        where: { userId, checkOut: { lt: now } },
        include: { hotel: true, roomType: true, ratePlan: true, payment: true },
        orderBy: { checkOut: 'desc' },
        skip,
        take: LIMIT,
      }),
    ]);
    return { upcoming, active, past, page, limit: LIMIT };
  }

  /** 💳 ยืนยันการชำระเงิน */
  async confirmPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hotel: true, roomType: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    await this.notificationsService.sendPaymentSuccessEmail(booking);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
    });
  }

  /** ❌ ยกเลิกการจอง */
  // ✅ BUG #4 FIX: Restore inventory when cancelling
  // ✅ BUG #10 FIX: Throw ForbiddenException instead of NotFoundException for unauthorized
  async cancelBooking(bookingId: string, userId?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (userId && booking.userId !== userId)
      throw new ForbiddenException('You do not have permission to cancel this booking');

    // Only restore inventory if booking was active (not already cancelled/checked_out)
    if (['pending', 'confirmed', 'checked_in'].includes(booking.status)) {
      const dateRange = buildDateRange(new Date(booking.checkIn), new Date(booking.checkOut));
      await this.inventoryService.restoreInventory(booking.roomTypeId, dateRange);
    }

    await this.notificationsService.sendCancellationEmail(booking);

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });

    this.activityLogsService.logAction(
      booking.hotelId,
      'BOOKING_CANCELLED',
      { bookingId },
      userId
    );

    return updatedBooking;
  }

  /** 👮 Admin: ยกเลิกการจอง (ไม่ต้องเช็ค Owner) */
  // ✅ BUG #4 FIX: Restore inventory on admin cancel too
  async cancelBookingByAdmin(bookingId: string, hotelId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hotel: true }
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.hotelId !== hotelId) throw new ForbiddenException('Booking does not belong to this hotel');

    // Only restore inventory if booking was active
    if (['pending', 'confirmed', 'checked_in'].includes(booking.status)) {
      const dateRange = buildDateRange(new Date(booking.checkIn), new Date(booking.checkOut));
      await this.inventoryService.restoreInventory(booking.roomTypeId, dateRange);
    }

    await this.notificationsService.sendCancellationEmail(booking);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled' },
    });
  }

  async requestFeedback(id: string) {
    const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { hotel: true, roomType: true }
    });
    if (!booking) throw new NotFoundException('Booking not found');

    await this.notificationsService.sendFeedbackRequest(booking);
    return { success: true, message: 'Feedback request sent' };
  }



  // ─── GUEST PORTAL ──────────────────────────────────────────────────────────

  async findMyBookings(userId: string, page: number = 1) {
    if (!userId) throw new BadRequestException('User ID is required');
    const LIMIT = 50;
    const skip = (Math.max(1, page) - 1) * LIMIT;
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { userId },
        include: {
          hotel: { select: { name: true, address: true, images: true, contactPhone: true } },
          roomType: { select: { name: true, images: true } },
          room: { select: { roomNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: LIMIT,
      }),
      this.prisma.booking.count({ where: { userId } }),
    ]);
    return { data, total, page, limit: LIMIT };
  }

  // ─────────────────────────────────────────────────────────────────────────

  async find(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        hotel: true,
        roomType: true,
        room: true,
        ratePlan: true,
        payment: true,
        guests: true,
        promotion: true,
      },
    });

    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  async findForGuest(id: string, email: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        hotel: true,
        roomType: true,
        ratePlan: true,
        payment: true,
        guests: true,
        promotion: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    
    // Security check: Must match the lead guest email exactly
    if (booking.leadEmail.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException('Invalid email address for this booking');
    }

    return booking;
  }

  // findAll method has been moved to the bottom with full pagination features.
  async updateStatus(bookingId: string, status: string, hotelId: string, userId?: string, roomId?: string) {
    const booking = await this.prisma.booking.findUnique({ 
        where: { id: bookingId },
        include: { room: true }
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.hotelId !== hotelId) throw new ForbiddenException('Booking does not belong to this hotel');

    // 🔒 State Machine Validations
    if (status === 'checked_in') {
        if (booking.status !== 'confirmed') throw new BadRequestException('Only confirmed bookings can be checked in.');
        if (!roomId && !booking.roomId) throw new BadRequestException('A physical room must be assigned to check in.');
        
        const finalRoomId = roomId || booking.roomId;
        
        // Ensure room belongs to the requested roomType and hotel
        const room = await this.prisma.room.findUnique({ where: { id: finalRoomId }, include: { roomType: true } });
        if (!room || room.roomTypeId !== booking.roomTypeId) throw new BadRequestException('Invalid room assignment.');

        // Update booking and mark room as occupied
        return await this.prisma.$transaction([
            this.prisma.booking.update({
                where: { id: bookingId },
                data: { status, roomId: finalRoomId }
            }),
            this.prisma.room.update({
                where: { id: finalRoomId },
                data: { status: 'OCCUPIED' }
            }),
            this.prisma.roomStatusLog.create({
                data: { roomId: finalRoomId, status: 'OCCUPIED', updatedBy: userId, note: `Checked in booking #${booking.id}` }
            })
        ]);
    }

    if (status === 'checked_out') {
         if (booking.status !== 'checked_in') throw new BadRequestException('Booking must be checked in before checking out.');
         
         const finalRoomId = booking.roomId;
         // Update booking and mark room as dirty
         const result = await this.prisma.$transaction(async (tx) => {
             const updatedBooking = await tx.booking.update({
                 where: { id: bookingId },
                 data: { status }
             });

             if (finalRoomId) {
                 await tx.room.update({
                     where: { id: finalRoomId },
                     data: { status: 'DIRTY' }
                 });
                 await tx.roomStatusLog.create({
                     data: { roomId: finalRoomId, status: 'DIRTY', updatedBy: userId, note: `Checked out booking #${booking.id}` }
                 });
             }
             return updatedBooking;
         });
         // Fire-and-forget review request email (non-blocking)
         this.reviewsService.sendReviewRequest(bookingId).catch(() => {});
         return result;
    }

    // Default status update (e.g. pending -> confirmed, or cancelled)
    // ✅ BUG #4 FIX: Restore inventory if cancelling via generic status update
    if (status === 'cancelled' && ['pending', 'confirmed', 'checked_in'].includes(booking.status)) {
      const dateRange = buildDateRange(new Date(booking.checkIn), new Date(booking.checkOut));
      await this.inventoryService.restoreInventory(booking.roomTypeId, dateRange);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    // ✅ BUG #11 FIX: Resolve roomNumber from DB instead of passing UUID
    let roomNumber: string | null = null;
    const finalRoomId = roomId || booking.roomId;
    if (finalRoomId) {
      const room = await this.prisma.room.findUnique({ where: { id: finalRoomId }, select: { roomNumber: true } });
      roomNumber = room?.roomNumber ?? null;
    }

    // Emit Real-time Notification for Status Update
    this.eventsGateway.broadcastToHotel(booking.hotelId, 'bookingUpdated', { 
        bookingId: updatedBooking.id, 
        status: updatedBooking.status,
        guestName: updatedBooking.leadName,
        roomNumber,
    });

    // Log Activity
    this.activityLogsService.logAction(
        booking.hotelId,
        'BOOKING_STATUS_UPDATED',
        { bookingId: updatedBooking.id, oldStatus: booking.status, newStatus: status },
        userId
    );

    return updatedBooking;
  }

  async getCalendarBookings(hotelId: string, month: number, year: number) {
    if (!hotelId) throw new BadRequestException('Hotel ID Required');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        hotelId,
        checkIn: { lte: endDate },
        checkOut: { gte: startDate },
        status: { not: 'cancelled' }
      },
      select: { checkIn: true, checkOut: true }
    });

    // Aggregate daily booking count efficiently using a Map instead of per-day JS filter
    const daysInMonth = endDate.getDate();
    const result = [];
    
    // Build a Set of occupied date strings from booking ranges
    const occupancyMap = new Map<number, number>(); // day -> count
    bookings.forEach(b => {
      let d = new Date(Math.max(new Date(b.checkIn).getTime(), startDate.getTime()));
      const bEnd = new Date(Math.min(new Date(b.checkOut).getTime(), endDate.getTime()));
      while (d < bEnd) {
        const day = d.getDate();
        occupancyMap.set(day, (occupancyMap.get(day) || 0) + 1);
        d.setDate(d.getDate() + 1);
      }
    });

    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ day: d, count: occupancyMap.get(d) || 0 });
    }
    return result;
  }

  async getCalendarEvents(hotelId: string, start: string, end: string) {
    if (!hotelId) throw new BadRequestException('Hotel ID Required');
    const startDate = new Date(start);
    const endDate = new Date(end);

    return this.prisma.booking.findMany({
      where: {
        hotelId,
        status: { not: 'cancelled' },
        checkIn: { lt: endDate },
        checkOut: { gt: startDate }
      },
      select: {
          id: true,
          checkIn: true,
          checkOut: true,
          status: true,
          leadName: true,
          leadEmail: true,
          leadPhone: true,
          guestsAdult: true,
          guestsChild: true,
          roomId: true,
          roomTypeId: true,
          totalAmount: true,
          isWebCheckedIn: true,
          room: { select: { id: true, roomNumber: true } },
          roomType: { select: { name: true } },
          payment: true
      }
    });
  }

  async rescheduleAdmin(bookingId: string, hotelId: string, roomId: string, checkIn: string, checkOut: string, userId: string) {
      if (!roomId) throw new BadRequestException('Room ID is required.');
      const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking || booking.hotelId !== hotelId) throw new NotFoundException('Booking not found');

      const room = await this.prisma.room.findFirst({ where: { id: roomId, roomType: { hotelId } } });
      if (!room) throw new BadRequestException('Invalid room selection');

      const newCheckIn = new Date(checkIn);
      const newCheckOut = new Date(checkOut);

      const overlap = await this.prisma.booking.findFirst({
          where: {
              roomId,
              id: { not: bookingId },
              status: { in: ['confirmed', 'checked_in'] },
              checkIn: { lt: newCheckOut },
              checkOut: { gt: newCheckIn }
          }
      });

      if (overlap) throw new ConflictException(`Room is already booked during these dates.`);

      return this.prisma.$transaction(async (tx) => {
          // 1. Restore OLD inventory
          if (booking.status === 'confirmed' || booking.status === 'checked_in') {
             const oldDates: Date[] = [];
             let d = new Date(booking.checkIn);
             while (d < new Date(booking.checkOut)) { oldDates.push(new Date(d)); d.setDate(d.getDate() + 1); }
             
             for (const dt of oldDates) {
                 const inv = await tx.inventoryCalendar.findUnique({ where: { roomTypeId_date: { roomTypeId: booking.roomTypeId, date: dt } } });
                 if (inv) await tx.inventoryCalendar.update({ where: { id: inv.id }, data: { allotment: inv.allotment + 1 } });
             }
          }

          // 2. Deduct NEW inventory
          if (booking.status === 'confirmed' || booking.status === 'checked_in') {
             const newDates: Date[] = [];
             let d = new Date(newCheckIn);
             while (d < newCheckOut) { newDates.push(new Date(d)); d.setDate(d.getDate() + 1); }

             for (const dt of newDates) {
                 const inv = await tx.inventoryCalendar.findUnique({ where: { roomTypeId_date: { roomTypeId: room.roomTypeId, date: dt } } });
                 if (inv) await tx.inventoryCalendar.update({ where: { id: inv.id }, data: { allotment: Math.max(0, inv.allotment - 1) } });
             }
          }

          // 3. Update Booking
          const updated = await tx.booking.update({
              where: { id: bookingId },
              data: { roomId, roomTypeId: room.roomTypeId, checkIn: newCheckIn, checkOut: newCheckOut }
          });

          return updated;
      });
  }

  async calculateTotalPrice(
    roomTypeId: string, 
    ratePlanId: string, 
    checkIn: Date, 
    checkOut: Date, 
    promoCode?: string
  ): Promise<number> {
      const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
      if (!roomType) throw new NotFoundException('RoomType provided not found');

      const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id: ratePlanId } });
      if (!ratePlan) throw new NotFoundException('RatePlan provided not found');

      let total = 0;
      const current = new Date(checkIn);

      // Pre-fetch overrides for the range
      const overrides = await this.prisma.rateOverride.findMany({
        where: {
          roomTypeId,
          ratePlanId,
          date: { gte: checkIn, lt: checkOut }
        }
      });
      
      const overrideMap = new Map<string, number>();
      overrides.forEach(o => overrideMap.set(o.date.toISOString().split('T')[0], o.baseRate));

      while (current < checkOut) {
          const dateKey = current.toISOString().split('T')[0];
          
          if (overrideMap.has(dateKey)) {
              total += overrideMap.get(dateKey);
          } else {
              let nightly = roomType.basePrice || 0;
              // Use configured breakfast price if available
              const rp = ratePlan as any;
              if (rp.includesBreakfast && rp.breakfastPrice > 0) {
                  nightly += rp.breakfastPrice; 
              }
              total += nightly;
          }
          current.setDate(current.getDate() + 1);
      }

      // Apply Promotion
      if (promoCode) {
        const promo = await this.prisma.promotion.findUnique({ where: { code: promoCode } });
        const now = new Date();
        if (promo && promo.startDate <= now && promo.endDate >= now && promo.isActive && (promo.maxUses === null || promo.usedCount < promo.maxUses)) {
            if (promo.type === 'percent') {
                const discount = Math.floor(total * (promo.value / 100));
                total = Math.max(0, total - discount);
            } else if (promo.type === 'fixed') {
                total = Math.max(0, total - promo.value);
            }
        }
      }

      return total;
  }


  // Single authoritative dashboard stats function (hotel-scoped, replaces old unscoped getDashboardStats)
  async getDashboardStatsNew(hotelId: string, period: string = 'month') {
    if (!hotelId) throw new BadRequestException('Hotel ID is required for dashboard stats');
    const now = new Date();
    let startDate = new Date();

    if (period === 'today') startDate.setHours(0,0,0,0);
    else if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date(0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        hotelId,
        createdAt: { gte: startDate },
        status: { not: 'cancelled' }
      },
      include: {
        folioCharges: true
      }
    });

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const totalRevenue = bookings.reduce((sum, b) => {
        const roomTotal = b.totalAmount || 0;
        const folioTotal = b.folioCharges ? b.folioCharges.reduce((acc, c) => acc + c.amount, 0) : 0;
        return sum + roomTotal + folioTotal;
    }, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIns = await this.prisma.booking.count({ 
        where: { hotelId, checkIn: { gte: new Date(todayStr), lt: new Date(new Date(todayStr).getTime() + 86400000) }, status: 'confirmed' } 
    });
    const checkOuts = await this.prisma.booking.count({ 
        where: { hotelId, checkOut: { gte: new Date(todayStr), lt: new Date(new Date(todayStr).getTime() + 86400000) }, status: 'confirmed' } 
    });

    const totalRooms = await this.prisma.room.count({
        where: { roomType: { hotelId }, deletedAt: null } // ✅ Exclude soft-deleted rooms
    });
    const activeBookings = await this.prisma.booking.count({
        where: {
            hotelId,
            checkIn: { lte: now },
            checkOut: { gt: now },
            status: { in: ['confirmed', 'checked_in'] }
        }
    });
    
    // ✅ BUG #13 FIX: Don't use hardcoded fallback of 10 — use 0 when no rooms configured
    const safeTotalRooms = totalRooms > 0 ? totalRooms : 0;
    const occupancyRate = Math.round((activeBookings / safeTotalRooms) * 100);

    const chartMap = new Map();
    bookings.forEach(b => {
        const date = new Date(b.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        chartMap.set(date, (chartMap.get(date) || 0) + b.totalAmount);
    });
    
    const chartData = Array.from(chartMap, ([name, value]) => ({ name, value }));
    const occupancyChart = []; // Fallback empty or implement logic similar to getDashboardStats if needed used by frontend.

    return {
        totalBookings,
        confirmedBookings,
        totalRevenue,
        checkInsToday: checkIns,
        checkOutsToday: checkOuts,
        totalRooms: safeTotalRooms,
        availableRooms: safeTotalRooms - activeBookings,
        occupancyRate,
        chartData,
        occupancyChart: occupancyChart.reverse()
    };
  }

  async getDailyOperationsStats(hotelId: string) {
    if (!hotelId) throw new BadRequestException('Hotel ID is required');
    
    const todayStr = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(todayStr);
    const endOfToday = new Date(startOfToday.getTime() + 86400000);

    const [arrivals, departures, inHouse, urgentCleaning] = await Promise.all([
      this.prisma.booking.findMany({
        where: { hotelId, checkIn: { gte: startOfToday, lt: endOfToday }, status: 'confirmed' },
        include: { roomType: true, room: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.booking.findMany({
        where: { hotelId, checkOut: { gte: startOfToday, lt: endOfToday }, status: 'checked_in' },
        include: { roomType: true, room: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.booking.findMany({
        where: { hotelId, status: 'checked_in' },
        include: { roomType: true, room: true },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.room.findMany({
        where: { roomType: { hotelId }, status: 'DIRTY', deletedAt: null },
        include: { roomType: true }
      })
    ]);

    return {
      arrivals,
      departures,
      inHouse,
      urgentCleaning
    };
  }

  async generateInvoice(bookingId: string) {
      const booking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
              hotel: true,
              roomType: true,
              ratePlan: true,
              folioCharges: true, 
              room: true,
          }
      });

      if (!booking) throw new NotFoundException('Booking not found');

      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

      // 1. Room Charges (Base)
      const baseRoomCharge = booking.totalAmount; // In a real app with taxes, you'd calculate subtotal vs tax
      const lineItems = [
          {
              description: `Accommodation: ${booking.roomType.name} (${nights} nights)`,
              amount: baseRoomCharge,
              quantity: 1
          }
      ];

      // 2. Extra Folio Charges (if any)
      if (booking.folioCharges && booking.folioCharges.length > 0) {
          booking.folioCharges.forEach(charge => {
              lineItems.push({
                  description: charge.description,
                  amount: charge.amount,
                  quantity: 1 // default
              });
          });
      }

      // ✅ BUG #3 FIX: VAT should be calculated ON TOP of the subtotal, not extracted from it.
      // totalAmount stored in DB is exclusive of VAT (pre-tax price).
      const subtotal = lineItems.reduce((acc, item) => acc + (item.amount * item.quantity), 0);
      const taxRate = 0.07; // 7% VAT
      const taxAmount = Math.round(subtotal * taxRate);
      const total = subtotal + taxAmount;

      return {
          invoiceId: `INV-${booking.id.toUpperCase().slice(-6)}`,
          date: new Date().toISOString(),
          hotel: {
              name: booking.hotel.name,
              address: booking.hotel.address,
              taxId: (booking.hotel as any).taxId || null, // ✅ BUG #12 FIX: Use hotel's actual taxId from DB
              email: booking.hotel.contactEmail,
              phone: booking.hotel.contactPhone
          },
          guest: {
              name: booking.leadName,
              email: booking.leadEmail,
              phone: booking.leadPhone
          },
          stay: {
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              nights: nights,
              roomNumber: booking.room?.roomNumber || 'Unassigned',
              guests: `${booking.guestsAdult} Adult(s), ${booking.guestsChild} Child(ren)`
          },
          lineItems,
          summary: {
              subtotal: Math.round(subtotal),
              tax: Math.round(taxAmount),
              total: total
          },
          paymentStatus: booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'checked_out' ? 'PAID' : 'DUE'
      };
  }

  async getAllPlatformBookings(query: any = {}) {
      // Platform Admin Only: Get all bookings across the entire system.
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 50;
      const skip = (page - 1) * limit;

      const whereClause: any = {};
      if (query.hotelId) {
          whereClause.hotelId = query.hotelId;
      }
      if (query.status) {
          whereClause.status = query.status;
      }

      const totalItems = await this.prisma.booking.count({ where: whereClause });
      
      const bookings = await this.prisma.booking.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
              hotel: { select: { name: true, contactEmail: true } },
              roomType: { select: { name: true } },
              user: { select: { name: true, email: true } }
          }
      });

      return {
          bookings,
          meta: {
              totalItems,
              itemCount: bookings.length,
              itemsPerPage: limit,
              totalPages: Math.ceil(totalItems / limit),
              currentPage: page
          }
      };
  }

  async findAll(hotelId: string, search?: string, status?: string, sortBy: string = 'createdAt', order: string = 'desc', page: number = 1, limit: number = 20) {
    const where: any = { hotelId };

    if (status && status !== 'All') {
      where.status = status.toLowerCase();
    }

    if (search) {
      where.OR = [
        { leadName: { contains: search, mode: 'insensitive' } },
        { leadEmail: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Default sort
    const orderBy: any = {};
    if (['createdAt', 'checkIn', 'checkOut', 'totalAmount', 'status'].includes(sortBy)) {
        orderBy[sortBy] = order === 'asc' ? 'asc' : 'desc';
    } else {
        orderBy.createdAt = 'desc';
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);

    const [data, total] = await Promise.all([
        this.prisma.booking.findMany({
            where,
            include: {
                hotel: true,
                user: true,
                roomType: true,
                room: true,
                payment: true,
                guests: true,
                promotion: true,
            },
            orderBy,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
        }),
        this.prisma.booking.count({ where })
    ]);

    return {
        data,
        meta: {
            total,
            page: pageNum,
            last_page: Math.ceil(total / limitNum),
            limit: limitNum
        }
    };
  }

}