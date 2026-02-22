import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
    constructor(private prisma: PrismaService) {}

    async upgradePackage(user: any, requestHotelId: string, newPackage: string) {
        // Enforce basic auth logic
        const userHotelId = user.hotelId;
        const isAdmin = user.roles?.includes('platform_admin');

        if (!isAdmin && userHotelId !== requestHotelId) {
             throw new ForbiddenException('You do not have permission to upgrade this hotel');
        }

        // We no longer upgrade directly. This should really route to Checkout, but for legacy compatibility we can keep it calling handleSubscriptionPayment directly if needed, or throw an error.
        throw new BadRequestException('Direct upgrades are no longer supported. Please use /checkout-session.');
    }

    async handleSubscriptionPayment(hotelId: string, planId: string, amount: number, chargeId: string) {
        // Fetch package from DB
        const plan = await this.prisma.subscriptionPlan.findUnique({
             where: { id: planId }
        });

        if (!plan) {
             console.error(`Webhook Error: Plan ${planId} not found`);
             return;
        }

        // Determine Limits based on Package
        const limits = {
            maxRooms: plan.maxRooms,
            maxRoomTypes: plan.maxRoomTypes,
            maxStaff: plan.maxStaff,
            hasPromotions: plan.hasPromotions,
            hasOnlinePayment: plan.hasOnlinePayment,
        };

        // Perform the upgrade & log payment in transaction
        await this.prisma.$transaction([
            this.prisma.hotel.update({
                where: { id: hotelId },
                data: {
                     package: plan.id,
                     ...limits
                }
            }),
            this.prisma.subscriptionPayment.create({
                data: {
                    hotelId: hotelId,
                    amount: amount,
                    currency: 'THB',
                    plan: plan.id,
                    status: 'success',
                    provider: 'stripe',
                    chargeId: chargeId
                }
            })
        ]);
        
        console.log(`Successfully upgraded hotel ${hotelId} to ${plan.id}`);
    }

    async getAllPayments() {
        // Platform Admin only viewing.
        const payments = await this.prisma.subscriptionPayment.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                hotel: { select: { name: true, contactEmail: true } }
            }
        });

        // Calculate summary
        const totalRevenue = payments.reduce((sum, p) => p.status === 'success' ? sum + p.amount : sum, 0);
        
        return {
            payments,
            summary: {
                totalRevenue,
                currency: 'THB',
                totalTransactions: payments.length
            }
        };
    }
}
