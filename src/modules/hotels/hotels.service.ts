import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

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
              where: {
                date: {
                  gte: startDate,
                  lt: endDate
                }
              }
            },
            overrides: {
              where: {
                date: {
                  gte: startDate,
                  lt: endDate
                }
              }
            },
            ratePlans: true
          }
        },
        reviews: true
      }
    });

    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const results = hotels.map(hotel => {
        const availableRooms = hotel.roomTypes.filter(rt => {
            // 1. Capacity Check
            if ((rt.maxAdults + rt.maxChildren) < guestCount) return false;

            // 2. Inventory Check
            // We need to ensure EVERY night has allotment > 0 and stopSale is false
            // But inventory records might be missing (default to 0 allotment if strictly enforced, or Assume Open? 
            // Usually if missing, treat as 0 allotment or default allotment. Let's assume strict: must exist and be > 0)
            
            // Check if we have records for all nights? 
            // Simplification: Iterate through dates
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                const record = rt.inventory.find(inv => inv.date.toDateString() === d.toDateString());
                if (!record || record.allotment <= 0 || record.stopSale) {
                    return false;
                }
            }
            return true;
        }).map(rt => {
           // 3. Price Calculation
           let totalPrice = 0;
           for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
               const override = rt.overrides.find(ovr => ovr.date.toDateString() === d.toDateString());
               if (override) {
                   totalPrice += override.baseRate;
               } else {
                   totalPrice += (rt.basePrice || 0);
               }
           }
           return {
               ...rt,
               totalPrice,
               averagePrice: totalPrice / nights
           };
        });

        if (availableRooms.length === 0) return null;

        // Find minimum price for the hotel
        const minPrice = Math.min(...availableRooms.map(r => r.totalPrice));

        return {
            ...hotel,
            roomTypes: availableRooms,
            minPrice,
            nights
        };
    }).filter(h => h !== null);

    return results;
  }

  async findWithAvailability(id: string, query: { checkIn?: string; checkOut?: string; guests?: string }) {
    const { checkIn, checkOut, guests } = query;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const guestCount = parseInt(guests || '1');

    // Adjust start date for timezone overlap (inventory stored as UTC midnight often shifts back)
    const queryStartDate = new Date(startDate);
    queryStartDate.setDate(queryStartDate.getDate() - 1);

    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      include: {
        roomTypes: {
          include: {
            inventory: {
                where: {
                    date: {
                        gte: queryStartDate,
                        lt: endDate
                    }
                }
            },
            overrides: {
                where: {
                    date: {
                        gte: queryStartDate,
                        lt: endDate
                    }
                }
            },
            ratePlans: true
          }
        },
        reviews: true
      }
    });

    if (!hotel) return null;

    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate availability and price for each room type
    const processedRoomTypes = hotel.roomTypes.map(rt => {
        // 1. Capacity
        if ((rt.maxAdults + rt.maxChildren) < guestCount) {
             return { ...rt, isAvailable: false, availabilityReason: 'Capacity exceeded' };
        }

        // 2. Inventory
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
            const record = rt.inventory.find(inv => inv.date.toDateString() === d.toDateString());
            if (!record || record.allotment <= 0 || record.stopSale) {
                return { ...rt, isAvailable: false, availabilityReason: 'No availability' };
            }
        }

        // 3. Price
        // We typically calculate a "Base Pricing" for the room type here to guide the UI
        // But the actual price depends on RatePlan.
        // Let's calculate a "Standard Rate" price (no specific plan logic here yet, or assume first plan?)
        // Better: Return the calculated base cost, and then let frontend apply RatePlan logic (breakfast included etc.)
        // But RateOverride is linked to RatePlan AND RoomType.
        // So we need to calculate price PER RatePlan.
        
        let baseCost = 0;
        for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
            // Find minimal override or base price?
            // Usually overrides are per RatePlan.
            // If we just want a "base" price for the room, we use RoomType.basePrice.
            baseCost += (rt.basePrice || 0);
        }

        // Now inject calculated prices into ratePlans
        const processedRatePlans = rt.ratePlans.map(rp => {
            let planTotal = 0;
            for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
                // Check if there is an override for this specific Plan and RoomType
                const override = rt.overrides.find(ovr => 
                    ovr.ratePlanId === rp.id && 
                    ovr.date.toDateString() === d.toDateString()
                );
                
                if (override) {
                    planTotal += override.baseRate;
                } else {
                    // Fallback to RoomType base + Plan adjustment? 
                    // Simplified: RoomType.basePrice + (Breakfast ? 300 : 0)
                    // Or if Plan has specific logic.
                    // For now let's assume RoomType.basePrice if no override.
                    planTotal += (rt.basePrice || 0);
                    if (rp.includesBreakfast) planTotal += 300; // Hardcoded mock adjustment for now
                }
            }
            return {
                ...rp,
                totalPrice: planTotal,
                pricePerNight: planTotal / nights
            };
        });

        // Determine if available based on inventory (already checked above)
        // If passed inventory check, it is available.
        return {
            ...rt,
            isAvailable: true,
            ratePlans: processedRatePlans,
            nights
        };
    });

    return {
        ...hotel,
        roomTypes: processedRoomTypes
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
}
