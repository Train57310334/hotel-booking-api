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
    
    // Sum charges
    const totalCharges = booking.folioCharges.reduce((sum, c) => sum + c.amount, 0);

    // Sum payments 
    // If Payment model is 1:1 as per schema lines 301-311 (bookingId @unique), then it's a single object
    const totalPaid = (booking.payment?.status === 'captured') ? booking.payment.amount : 0;
    // NOTE: If you support multiple partial payments later, you'll need to change Payment relation to 1:N.
    // For now, let's assume single payment or multiple payments handled via external logic?
    // User requested "Pay Balance", which implies multiple payments might be needed.
    // BUT Schema has `model Payment { bookingId @unique }`.
    // LIMITATION: Current schema only supports ONE payment record per booking.
    // WORKAROUND for Option B: 
    // If they pay balance, we might need to update the existing Payment record amount? Or create a new one?
    // Converting Payment to 1:N is a big change. 
    // Let's assume for MVP: Folio tracks "Extra Charges", and Payment tracks "Main Payment".
    // If they need to pay EXTRA, maybe we just create another Stripe Intent and... wait, where do we store it?
    // We should probably allow 1:N payments to proper cashiering.
    // Let's check Schema line 303: `bookingId String @unique`.
    
    // DECISION: For this task, I will stick to adding CHARGES. 
    // If "Pay Balance" is required, I might need to allow multiple payments.
    // Let's modify schema to 1:N for Payment? 
    // User asked for "Folio", typically implies multiple transactions.
    // I will proceed with Folio Service first. 

    const balance = (totalRoom + totalCharges) - totalPaid;

    return {
      bookingId,
      currency: 'THB',
      roomTotal: totalRoom,
      totalCharges,
      totalPaid,
      balance,
      charges: booking.folioCharges,
      transactions: booking.payment ? [booking.payment] : []
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
