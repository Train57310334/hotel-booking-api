import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class SubscriptionsService {
    constructor(
        private prisma: PrismaService,
        private activityLogsService: ActivityLogsService
    ) {}

    /**
     * Get comprehensive subscription status for a hotel
     */
    async getSubscriptionStatus(hotelId: string) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: {
                id: true,
                name: true,
                package: true,
                subscriptionStart: true,
                subscriptionEnd: true,
                subscriptionStatus: true,
                billingCycle: true,
                stripeSubscriptionId: true,
                maxRooms: true,
                maxRoomTypes: true,
                maxStaff: true,
                hasPromotions: true,
                hasOnlinePayment: true,
                hasSeo: true,
                hasCustomDomain: true,
                hasAdvancedAnalytics: true,
                isSuspended: true,
                roomTypes: {
                    select: { id: true },
                },
                _count: {
                    select: {
                        subscriptionPayments: true,
                    }
                }
            }
        });

        if (!hotel) {
            throw new NotFoundException('Hotel not found');
        }

        // Lookup current plan details from SubscriptionPlan table
        let currentPlanDetails = null;
        try {
            currentPlanDetails = await this.prisma.subscriptionPlan.findFirst({
                where: {
                    OR: [
                        { id: hotel.package },
                        { name: hotel.package },
                    ]
                }
            });
        } catch (e) {
            // Fallback: plan might not exist in table
        }

        // Calculate days remaining
        const now = new Date();
        let daysRemaining: number | null = null;
        let totalDays: number | null = null;
        let progressPercent: number = 0;
        let isExpired = false;

        if (hotel.subscriptionEnd) {
            const end = new Date(hotel.subscriptionEnd);
            daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            isExpired = daysRemaining <= 0;

            if (hotel.subscriptionStart) {
                const start = new Date(hotel.subscriptionStart);
                totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                const elapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
            }
        }

        // Determine effective status
        let effectiveStatus = hotel.subscriptionStatus || 'inactive';
        if (hotel.package === 'LITE' || !hotel.subscriptionEnd) {
            effectiveStatus = hotel.package === 'LITE' ? 'free' : 'inactive';
        } else if (isExpired && effectiveStatus === 'active') {
            effectiveStatus = 'expired';
        }

        // Get last payment
        const lastPayment = await this.prisma.subscriptionPayment.findFirst({
            where: { hotelId, status: 'success' },
            orderBy: { createdAt: 'desc' },
            select: {
                createdAt: true,
                amount: true,
                plan: true,
                planName: true,
                type: true,
            }
        });

        return {
            hotelId: hotel.id,
            hotelName: hotel.name,
            currentPlan: hotel.package,
            currentPlanDetails,
            subscriptionStart: hotel.subscriptionStart,
            subscriptionEnd: hotel.subscriptionEnd,
            subscriptionStatus: effectiveStatus,
            billingCycle: hotel.billingCycle || 'one_time',
            isAutoRenew: !!hotel.stripeSubscriptionId,
            daysRemaining,
            totalDays,
            progressPercent,
            isExpired,
            isSuspended: hotel.isSuspended,
            limits: {
                maxRooms: hotel.maxRooms,
                maxRoomTypes: hotel.maxRoomTypes,
                maxStaff: hotel.maxStaff,
                hasPromotions: hotel.hasPromotions,
                hasOnlinePayment: hotel.hasOnlinePayment,
                hasSeo: hotel.hasSeo,
                hasCustomDomain: hotel.hasCustomDomain,
                hasAdvancedAnalytics: hotel.hasAdvancedAnalytics,
            },
            lastPayment,
            totalPayments: hotel._count.subscriptionPayments,
        };
    }

    /**
     * Get payment history for a specific hotel
     */
    async getHotelPaymentHistory(hotelId: string) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { id: true, name: true },
        });

        if (!hotel) {
            throw new NotFoundException('Hotel not found');
        }

        const payments = await this.prisma.subscriptionPayment.findMany({
            where: { hotelId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                amount: true,
                currency: true,
                plan: true,
                planName: true,
                status: true,
                provider: true,
                chargeId: true,
                type: true,
                periodStart: true,
                periodEnd: true,
                previousPlan: true,
                invoiceUrl: true,
                createdAt: true,
            }
        });

        const totalSpent = payments
            .filter(p => p.status === 'success')
            .reduce((sum, p) => sum + p.amount, 0);

        return {
            hotelId,
            hotelName: hotel.name,
            payments,
            summary: {
                totalSpent,
                currency: 'THB',
                totalTransactions: payments.length,
                successfulTransactions: payments.filter(p => p.status === 'success').length,
            }
        };
    }

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

    async handleSubscriptionPayment(
        hotelId: string, 
        planId: string, 
        amount: number, 
        chargeId: string,
        billingCycle: string = 'one_time',
        stripeSubscriptionId?: string,
        stripeCustomerId?: string
    ) {
        // Fetch package from DB
        const plan = await this.prisma.subscriptionPlan.findUnique({
             where: { id: planId }
        });

        if (!plan) {
             console.error(`Webhook Error: Plan ${planId} not found`);
             return;
        }

        // Get current hotel data for previousPlan tracking
        const currentHotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { package: true }
        });

        const previousPlan = currentHotel?.package || 'LITE';

        // Determine Limits based on Package
        const limits = {
            maxRooms: plan.maxRooms,
            maxRoomTypes: plan.maxRoomTypes,
            maxStaff: plan.maxStaff,
            hasPromotions: plan.hasPromotions,
            hasOnlinePayment: plan.hasOnlinePayment,
            hasSeo: plan.hasSeo,
            hasCustomDomain: plan.hasCustomDomain,
            hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
        };

        // Calculate subscription period (30 days from now)
        const now = new Date();
        const subscriptionStart = now;
        const subscriptionEnd = new Date(now);
        subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

        // Determine payment type
        let type = 'upgrade';
        if (previousPlan === plan.id || previousPlan === plan.name) {
            type = 'renewal';
        }

        // Perform the upgrade & log payment in transaction
        await this.prisma.$transaction([
            this.prisma.hotel.update({
                where: { id: hotelId },
                data: {
                     package: plan.id,
                     subscriptionStart,
                     subscriptionEnd,
                     subscriptionStatus: 'active',
                     billingCycle,
                     stripeSubscriptionId,
                     stripeCustomerId,
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
                    chargeId: chargeId || stripeSubscriptionId, // Fallback if chargeId is null in subscription mode
                    type,
                    periodStart: subscriptionStart,
                    periodEnd: subscriptionEnd,
                    previousPlan,
                    planName: plan.name,
                }
            })
        ]);
        
        // Log the payment activity
        this.activityLogsService.logAction(
            hotelId,
            type === 'renewal' ? 'SUBSCRIPTION_RENEWED' : 'SUBSCRIPTION_UPGRADED',
            { 
                amount, 
                currency: 'THB', 
                plan: plan.name, 
                previousPlan,
                provider: 'stripe', 
                chargeId,
                periodStart: subscriptionStart.toISOString(),
                periodEnd: subscriptionEnd.toISOString(),
            }
        );

        console.log(`Successfully ${type === 'renewal' ? 'renewed' : 'upgraded'} hotel ${hotelId} to ${plan.name} (${plan.id}). Valid until ${subscriptionEnd.toISOString()}`);
    }

    /**
     * Cancel auto-renewal for a hotel subscription (does not cancel immediately)
     */
    async cancelAutoRenew(hotelId: string) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { 
                stripeSubscriptionId: true, 
                billingCycle: true,
                package: true,
            }
        });

        if (!hotel) {
            throw new NotFoundException('Hotel not found');
        }

        if (!hotel.stripeSubscriptionId) {
            throw new BadRequestException('No active auto-renewal subscription found');
        }

        // Update hotel to mark as non-auto-renew
        await this.prisma.hotel.update({
            where: { id: hotelId },
            data: {
                billingCycle: 'one_time',
                stripeSubscriptionId: null,
            }
        });

        this.activityLogsService.logAction(
            hotelId,
            'SUBSCRIPTION_AUTO_RENEW_CANCELLED',
            { plan: hotel.package }
        );

        return { message: 'Auto-renewal has been cancelled. Your subscription will remain active until the current period ends.' };
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
