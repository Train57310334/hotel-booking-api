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
    adults?: number,
    children?: number,
    amenities?: string[]
  ) {
    // Calculate total guests needed (default to guests parameter if adults/children not set, or 1)
    const totalNeeded = (adults || 0) + (children || 0) || guests || 1;

    const where: any = {
      city: {
        contains: city || '', // Allow empty city for single hotel view
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
              ...(totalNeeded ? { capacity: { gte: totalNeeded } } : {})
            }
          }
        }
      };
    } else if (totalNeeded) {
      where.roomTypes = {
        some: {
          rooms: {
            some: {
              capacity: { gte: totalNeeded }
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
  async globalSearch(q: string, hotelId?: string) {
    if (!q || q.length < 2) return { users: [], bookings: [], rooms: [], roomTypes: [], hotels: [], packages: [] };

    // Common search promises
    const usersPromise = this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
        ...(hotelId ? { bookings: { some: { hotelId } } } : {})
      },
      take: 5,
    });

    const bookingsPromise = this.prisma.booking.findMany({
      where: {
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { leadName: { contains: q, mode: 'insensitive' } },
        ],
        ...(hotelId ? { hotelId } : {})
      },
      take: 5,
      include: { roomType: true },
    });

    if (hotelId) {
        // Normal Admin: Search Rooms and RoomTypes
        const [users, bookings, rooms, roomTypes] = await Promise.all([
            usersPromise,
            bookingsPromise,
            this.prisma.room.findMany({
              where: {
                roomNumber: { contains: q, mode: 'insensitive' },
                ...(hotelId ? { roomType: { hotelId } } : {})
              },
              take: 5,
              include: { roomType: true },
            }),
            this.prisma.roomType.findMany({
              where: {
                name: { contains: q, mode: 'insensitive' },
                ...(hotelId ? { hotelId } : {})
              },
              take: 5,
            })
        ]);
        return { users, bookings, rooms, roomTypes, hotels: [], packages: [] };
    } else {
        // Super Admin: Search Hotels and SubscriptionPlans (exclude Rooms/RoomTypes)
        const [users, bookings, hotels, packages] = await Promise.all([
            usersPromise,
            bookingsPromise,
            this.prisma.hotel.findMany({
                where: {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { city: { contains: q, mode: 'insensitive' } },
                        { owner: { email: { contains: q, mode: 'insensitive' } } }
                    ]
                },
                take: 5,
                include: { owner: true }
            }),
            this.prisma.subscriptionPlan.findMany({
                where: {
                    name: { contains: q, mode: 'insensitive' }
                },
                take: 5
            })
        ]);
        return { users, bookings, rooms: [], roomTypes: [], hotels, packages };
    }
  }
}
