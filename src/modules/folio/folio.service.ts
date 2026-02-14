import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FolioService {
  constructor(private prisma: PrismaService) {}

  async getFolio(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true, // Assuming 1:1 for now, or use relation if 1:N
        folioCharges: true,
        roomType: true
      }
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const totalRoom = booking.totalAmount || 0;
    
    // Separate charges (positive) and credits (negative/payments)
    const charges = booking.folioCharges.filter(c => c.amount >= 0);
    const credits = booking.folioCharges.filter(c => c.amount < 0);

    // Sum positive charges
    const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);

    // Sum payments (Stripe + Manual Credits)
    const stripePayment = (booking.payment?.status === 'captured') ? booking.payment.amount : 0;
    const manualPayments = credits.reduce((sum, c) => sum + Math.abs(c.amount), 0);
    const totalPaid = stripePayment + manualPayments;

    const balance = (totalRoom + totalCharges) - totalPaid;

    // Combine Stripe Payment and Manual Credits for "Transactions" list
    const transactions = [
        ...(booking.payment ? [booking.payment] : []),
        ...credits.map(c => ({
            id: c.id,
            date: c.date,
            amount: Math.abs(c.amount), // Show as positive in transactions list
            method: c.description.includes('Cash') ? 'cash' : 'transfer', // Simple heuristic
            status: 'captured',
            isManual: true, // Flag for frontend
            description: c.description
        }))
    ].sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

    return {
      bookingId,
      currency: 'THB',
      roomTotal: totalRoom,
      totalCharges, // Only positive extra charges
      totalPaid,    // Stripe + Credits
      balance,
      charges,      // Only positive charges
      transactions  // Unified list of payments
    };
  }

  async addCharge(bookingId: string, data: { amount: number; description: string; type?: string }) {
    return this.prisma.folioCharge.create({
      data: {
        bookingId,
        amount: data.amount,
        description: data.description,
        type: data.type || 'OTHER'
      }
    });
  }

  async removeCharge(chargeId: string) {
    return this.prisma.folioCharge.delete({
      where: { id: chargeId }
    });
  }
}
