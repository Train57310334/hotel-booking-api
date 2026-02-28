const fs = require('fs');

const path = 'c:/Users/ASUS/workspace/hotel-booking/hotel-booking-nest-postgres/src/modules/bookings/bookings.service.ts';
let content = fs.readFileSync(path, 'utf8');

const missingFunctions = `
  // --- RECOVERED FUNCTIONS ---

  async findForGuest(id: string, email: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        hotel: true,
        roomType: true,
        ratePlan: true,
        payment: true,
        guests: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.leadEmail.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException('Invalid email for this booking');
    }
    return booking;
  }

  async getAllPlatformBookings(query: any = {}) {
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
      if (query.search) {
          whereClause.OR = [
            { leadName: { contains: query.search, mode: 'insensitive' } },
            { id: { contains: query.search, mode: 'insensitive' } },
            { leadEmail: { contains: query.search, mode: 'insensitive' } },
          ];
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

  async getCalendarBookings(hotelId: string, month: number, year: number) {
      if (!hotelId) throw new BadRequestException('Hotel ID required');
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      
      return this.prisma.booking.findMany({
          where: {
              hotelId,
              status: { not: 'cancelled' },
              checkIn: { lte: end },
              checkOut: { gte: start }
          },
          select: {
              id: true,
              checkIn: true,
              checkOut: true,
              roomId: true,
              status: true,
              leadName: true
          }
      });
  }

  async getCalendarEvents(hotelId: string, start: string, end: string) {
      if (!hotelId) throw new BadRequestException('Hotel ID required');
      const startDate = new Date(start);
      const endDate = new Date(end);
      return this.prisma.booking.findMany({
          where: {
              hotelId,
              status: { not: 'cancelled' },
              checkIn: { lte: endDate },
              checkOut: { gte: startDate }
          },
          select: {
              id: true,
              checkIn: true,
              checkOut: true,
              roomId: true,
              status: true,
              leadName: true,
              room: { select: { roomNumber: true } }
          }
      });
  }

  async getDashboardStatsNew(hotelId: string, period?: string) {
      if (!hotelId) throw new BadRequestException('Hotel ID required');
      const startDate = new Date();
      if (period === 'monthly') {
          startDate.setDate(1);
      } else if (period === 'yearly') {
          startDate.setMonth(0, 1);
      } else {
          startDate.setDate(startDate.getDate() - 30);
      }

      const totalBookings = await this.prisma.booking.count({
          where: { hotelId, createdAt: { gte: startDate } }
      });

      const totalRevenueResult = await this.prisma.booking.aggregate({
          _sum: { totalAmount: true },
          where: { hotelId, status: { in: ['confirmed', 'checked_in', 'checked_out'] }, createdAt: { gte: startDate } }
      });
      const revenue = totalRevenueResult._sum.totalAmount || 0;

      const upcomingCheckIns = await this.prisma.booking.count({
          where: { hotelId, status: 'confirmed', checkIn: { gte: new Date() } }
      });

      return { totalBookings, revenue, upcomingCheckIns };
  }

  async updateStatus(bookingId: string, hotelId: string, status: string, roomId?: string) {
      const data: any = { status };
      if (roomId) data.roomId = roomId;
      
      const updated = await this.prisma.booking.updateMany({
          where: { id: bookingId, hotelId },
          data
      });
      
      if (updated.count === 0) throw new NotFoundException('Booking not found or not belonging to this hotel');
      return { success: true };
  }

  async generateInvoice(bookingId: string) {
      const booking = await this.find(bookingId);
      if (!booking) throw new NotFoundException('Booking not found');
      // Dummy invoice generation
      return { invoiceUrl: \`https://dummy-invoice.com/inv-\${booking.id}.pdf\` };
  }

  // Override findAll to accept full pagination/search params
  async findAll(hotelId: string, search?: string, status?: string, sortBy: string = 'createdAt', order: string = 'desc', page: number = 1, limit: number = 50) {
      const skip = (page - 1) * limit;
      const where: any = { hotelId };
      
      if (status) where.status = status;
      if (search) {
          where.OR = [
              { leadName: { contains: search, mode: 'insensitive' } },
              { leadEmail: { contains: search, mode: 'insensitive' } },
              { id: { contains: search, mode: 'insensitive' } }
          ];
      }

      const [data, total] = await Promise.all([
          this.prisma.booking.findMany({
              where,
              include: { roomType: true, room: true, ratePlan: true },
              orderBy: { [sortBy]: order },
              skip,
              take: limit
          }),
          this.prisma.booking.count({ where })
      ]);

      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
`;

// Remove the old simple findAll method to prevent duplicates
content = content.replace(/  async findAll\(hotelId: string\) \{[\s\S]*?    \}\);\n  \}/g, '');

// Append the missing functions before the closing brace
content = content.replace(/}\s*$/, missingFunctions + '\n}');

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched missing functions.');
