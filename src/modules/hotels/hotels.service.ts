import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Hotel
      const hotel = await tx.hotel.create({
        data: {
          name: data.name,
          address: data.address,
          city: data.city,
          country: data.country,
          description: data.description,
          ownerId: userId // Optional ownership tracking
        }
      });

      // 2. Assign User as Admin of this Hotel
      await tx.roleAssignment.create({
        data: {
          userId,
          hotelId: hotel.id,
          role: 'hotel_admin'
        }
      });

      // 3. Ensure User has 'hotel_admin' in their main roles array (if not already)
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user.roles.includes('hotel_admin')) {
        await tx.user.update({
          where: { id: userId },
          data: { roles: { push: 'hotel_admin' } }
        });
      }

      // 4. (Optional) Create Default Content
      // Create a default Room Type so the dashboard isn't empty
      await tx.roomType.create({
        data: {
          hotelId: hotel.id,
          name: 'Standard Room',
          bedConfig: 'Queen',
          sizeSqm: 25,
          basePrice: 1000,
          maxAdults: 2,
          description: 'Standard comfortable room',
          ratePlans: {
            create: {
              hotelId: hotel.id,
              name: 'Standard Rate',
              cancellationRule: 'Free cancellation up to 24h',
              includesBreakfast: false
            }
          }
        }
      });

      return hotel;
    });
  }

  list() {
    return this.prisma.hotel.findMany({
      include: {
        roomTypes: {
          include: { ratePlans: true }
        },
        reviews: true
      }
    });
  }

  async search(query: { checkIn?: string; checkOut?: string; guests?: string }) {
    const { checkIn, checkOut, guests } = query;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const guestCount = parseInt(guests || '1');

    const hotels = await this.prisma.hotel.findMany({
      include: {
        roomTypes: {
          include: {
            inventory: {
                where: { date: { gte: startDate, lt: endDate } }
            },
            overrides: {
                where: { date: { gte: startDate, lt: endDate } }
            },
            ratePlans: true
          }
        },
        reviews: true
      }
    });

    const results = hotels.map(hotel => {
        const processed = this.processAvailability(hotel, startDate, endDate, guestCount);
        if (!processed.roomTypes.some(r => r.isAvailable)) return null;
        
        // Min price from available rooms
        const availableRooms = processed.roomTypes.filter(r => r.isAvailable);
        const minPrice = availableRooms.length > 0 ? Math.min(...availableRooms.map(r => r.ratePlans[0]?.totalPrice || 0)) : 0;

        return {
            ...hotel,
            roomTypes: availableRooms,
            minPrice,
            nights: processed.nights
        };
    }).filter(h => h !== null);

    return results;
  }

  async findWithAvailability(id: string, query: { checkIn?: string; checkOut?: string; guests?: string }) {
    const { checkIn, checkOut, guests } = query;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const guestCount = parseInt(guests || '1');

    // Adjust start date for timezone overlap? 
    // The previous code did this (-1 day). I'll keep it consistent if needed, 
    // but typically strict date matching is better. 
    // Let's stick to strict `gte startDate` as used in Search for consistency.
    // If exact timezone overlap is an issue, it should be fixed globally.
    // For now, removing the -1 day hack to ensure Search and Hotel match.

    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: {
        roomTypes: {
          include: {
            inventory: {
                where: { date: { gte: startDate, lt: endDate } }
            },
            overrides: {
                where: { date: { gte: startDate, lt: endDate } }
            },
            ratePlans: true
          }
        },
        reviews: true
      }
    });

    if (!hotel) return null;

    return this.processAvailability(hotel, startDate, endDate, guestCount);
  }

  // Shared Logic for processing availability and pricing
  private processAvailability(hotel: any, startDate: Date, endDate: Date, guestCount: number) {
      const calcNights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const nights = calcNights > 0 ? calcNights : 1;
      
      // Fix: If for some reason loop range is 0 (same day), force it to iterate 1 day
      const iterateEndDate = new Date(endDate);
      if (calcNights <= 0) {
          iterateEndDate.setDate(startDate.getDate() + 1);
      }

      const processedRoomTypes = hotel.roomTypes.map(rt => {
        // 1. Capacity
        if ((rt.maxAdults + rt.maxChildren) < guestCount) {
             return { ...rt, isAvailable: false, availabilityReason: 'Capacity exceeded' };
        }

        // 2. Inventory Check
        for (let d = new Date(startDate); d < iterateEndDate; d.setDate(d.getDate() + 1)) {
            const record = rt.inventory.find(inv => inv.date.toDateString() === d.toDateString());
            // Lenient: If no record, assume available. Only block if explicit stopSale or 0 allotment.
            if (record && (record.allotment <= 0 || record.stopSale)) {
                return { ...rt, isAvailable: false, availabilityReason: 'No availability' };
            }
        }

        // 3. Pricing Calculation (Per Rate Plan)
        const processedRatePlans = rt.ratePlans.map(rp => {
            let planTotal = 0;
            for (let d = new Date(startDate); d < iterateEndDate; d.setDate(d.getDate() + 1)) {
                 const override = rt.overrides.find(ovr => 
                    ovr.ratePlanId === rp.id && 
                    ovr.date.toDateString() === d.toDateString()
                );
                
                if (override) {
                    planTotal += override.baseRate;
                } else {
                    // Fallback to RoomType base price
                    planTotal += (rt.basePrice || 0);
                    // Mock Breakfast logic for demo consistency
                    if (rp.includesBreakfast) planTotal += 300; 
                }
            }
            return {
                ...rp,
                totalPrice: planTotal,
                pricePerNight: planTotal / nights
            };
        });
        
        // Sort plans by price?
        processedRatePlans.sort((a, b) => a.totalPrice - b.totalPrice);

        return {
            ...rt,
            isAvailable: true,
            ratePlans: processedRatePlans,
            nights
        };
      });

      return {
          ...hotel,
          roomTypes: processedRoomTypes,
          nights
      };
  }

  find(id: string) {
    return this.prisma.hotel.findUnique({
      where: { id },
      include: {
        roomTypes: {
          include: { ratePlans: true }
        },
        reviews: true
      }
    });
  }

  update(id: string, data: any) {
    return this.prisma.hotel.update({
      where: { id },
      data
    });
  }

  async listForSuperAdmin() {
    const hotels = await this.prisma.hotel.findMany({
      include: {
        roomTypes: {
          include: {
            rooms: { select: { id: true } }
          }
        },
        RoleAssignment: {
          select: { id: true }
        }
      },
      orderBy: { id: 'desc' }
    });

    return hotels.map(hotel => {
      // Calculate total rooms by summing the rooms in each roomType
      const totalRooms = hotel.roomTypes.reduce((sum, rt) => sum + (rt.rooms?.length || 0), 0);
      
      return {
        ...hotel,
        stats: {
          roomTypeCount: hotel.roomTypes.length,
          roomCount: totalRooms,
          staffCount: hotel.RoleAssignment.length,
        },
        roomTypes: undefined,
        RoleAssignment: undefined
      };
    });
  }

  async getSuperStats() {
    // 1. Fetch all hotels with their rooms to count inventory
    const hotels = await this.prisma.hotel.findMany({
      include: {
        roomTypes: {
          include: { rooms: { select: { id: true } } }
        }
      }
    });

    // 2. Aggregate
    let totalHotels = hotels.length;
    let totalRooms = 0;
    let estimatedMRR = 0;

    let planCounts = {
        LITE: 0,
        PRO: 0,
        ENTERPRISE: 0
    };

    hotels.forEach(h => {
        // Count rooms
        totalRooms += h.roomTypes.reduce((sum, rt) => sum + (rt.rooms?.length || 0), 0);
        
        // Count plans && MRR
        const pkg = h.package || 'LITE';
        if (pkg === 'PRO') {
            estimatedMRR += 990;
            planCounts.PRO++;
        } else if (pkg === 'ENTERPRISE') {
            estimatedMRR += 2990;
            planCounts.ENTERPRISE++;
        } else {
            planCounts.LITE++;
        }
    });

    // 3. Mock Chart Data for MRR Growth
    const revenueChart = [
        { name: 'Jan', value: estimatedMRR * 0.3 },
        { name: 'Feb', value: estimatedMRR * 0.5 },
        { name: 'Mar', value: estimatedMRR * 0.7 },
        { name: 'Apr', value: estimatedMRR * 0.8 },
        { name: 'May', value: estimatedMRR * 0.9 },
        { name: 'Jun', value: estimatedMRR },
    ];

    // 4. Mock Signups 
    const signupsChart = [
        { name: 'Jan', value: Math.floor(totalHotels * 0.2) },
        { name: 'Feb', value: Math.floor(totalHotels * 0.3) },
        { name: 'Mar', value: Math.floor(totalHotels * 0.4) },
        { name: 'Apr', value: Math.floor(totalHotels * 0.1) },
        { name: 'May', value: Math.floor(totalHotels * 0.5) },
        { name: 'Jun', value: Math.floor(totalHotels * 0.8) },
    ];

    return {
        totalHotels,
        totalRooms,
        estimatedMRR,
        planCounts,
        revenueChart,
        signupsChart
    }
  }

  async suspendHotel(id: string, isSuspended: boolean) {
    return this.prisma.hotel.update({
      where: { id },
      data: { isSuspended }
    });
  }
}
