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
        reviews: true,
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
}
