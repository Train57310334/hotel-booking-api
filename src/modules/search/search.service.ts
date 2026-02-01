import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async findHotelsByCity(
    city: string,
    checkIn?: string,
    checkOut?: string,
    minPrice?: number,
    maxPrice?: number,
    guests?: number,
    amenities?: string[]
  ) {
    const where: any = {
      city: {
        contains: city,
        mode: 'insensitive'
      }
    };

    if (amenities && amenities.length > 0) {
      where.amenities = {
        hasEvery: amenities
      };
    }

    if (checkIn && checkOut) {
      where.roomTypes = {
        some: {
          rooms: {
            some: {
              bookings: {
                none: {
                  OR: [
                    {
                      checkIn: { lt: new Date(checkOut) },
                      checkOut: { gt: new Date(checkIn) }
                    }
                  ]
                }
              },
              ...(guests ? { capacity: { gte: guests } } : {})
            }
          }
        }
      };
    } else if (guests) {
      where.roomTypes = {
        some: {
          rooms: {
            some: {
              capacity: { gte: guests }
            }
          }
        }
      };
    }

    const hotels = await this.prisma.hotel.findMany({
      where,
      include: {
        reviews: {
            where: { status: 'approved' },
            select: {
                id: true,
                rating: true,
                comment: true,
                user: { select: { name: true } },
                createdAt: true
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
        },
        roomTypes: {
          include: {
            rooms: {
              include: {
                bookings: true
              }
            }
          }
        }
      }
    });

    // Optional filter by minPrice/maxPrice after computation
    const computed = hotels.map(h => {
      const flatPrices = h.roomTypes.flatMap(rt => rt.rooms.map((r, i) => 1200 + i * 600));
      const minP = flatPrices.length ? Math.min(...flatPrices) : 0;
      return { ...h, minPrice: minP };
    });

    return computed.filter(h => {
      if (typeof minPrice === 'number' && h.minPrice < minPrice) return false;
      if (typeof maxPrice === 'number' && h.minPrice > maxPrice) return false;
      return true;
    });
  }
  async globalSearch(q: string) {
    if (!q || q.length < 2) return { users: [], bookings: [], rooms: [], roomTypes: [] };

    const [users, bookings, rooms, roomTypes] = await Promise.all([
      // 1. Search Users
      this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),

      // 2. Search Bookings
      this.prisma.booking.findMany({
        where: {
          OR: [
            { id: { contains: q, mode: 'insensitive' } },
            { leadName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { roomType: true },
      }),

      // 3. Search Rooms
      this.prisma.room.findMany({
        where: {
          roomNumber: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        include: { roomType: true },
      }),

      // 4. Search Room Types
      this.prisma.roomType.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
        },
        take: 5,
      }),
    ]);

    return { users, bookings, rooms, roomTypes };
  }
}
