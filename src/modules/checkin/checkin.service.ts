import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly notificationsService: NotificationsService
  ) {}

  /**
   * Securely validates that the email matches the booking ID
   * and returns the booking info if successful.
   */
  async validateCheckin(bookingId: string, email: string) {
    if (!bookingId || !email) {
      throw new BadRequestException('Booking ID and Email are required');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: { select: { name: true, logoUrl: true } },
        roomType: { select: { name: true } },
        guests: true
      }
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.leadEmail.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException('The provided email does not match this booking record.');
    }

    if (booking.status === 'checked_in' || booking.status === 'checked_out') {
      throw new BadRequestException('This booking has already been checked in or out.');
    }

    return booking;
  }

  /**
   * Processes the web check-in submission payloads
   */
  async submitCheckin(
    bookingId: string, 
    payload: {
      email: string;
      signature: string; // Base64 Data URL
      eta: string;
      guests: { name: string; idType: string; idNumber?: string; documentBase64?: string }[];
    }
  ) {
    // 1. Re-validate to ensure security
    const booking = await this.validateCheckin(bookingId, payload.email);

    // 2. Setup Upload Directories (Saving directly to Frontend public folder)
    const uploadDir = path.join(process.cwd(), '../hotel-booking-frontend/public/uploads');
    const signaturesDir = path.join(uploadDir, 'signatures');
    const documentsDir = path.join(uploadDir, 'documents');
    
    if (!fs.existsSync(signaturesDir)) fs.mkdirSync(signaturesDir, { recursive: true });
    if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir, { recursive: true });

    // 3. Save Signature
    let signatureUrl = null;
    if (payload.signature && payload.signature.startsWith('data:image')) {
      const base64Data = payload.signature.replace(/^data:image\/\w+;base64,/, '');
      const ext = payload.signature.split(';')[0].split('/')[1] || 'png';
      const filename = `sig_${bookingId}_${uuidv4()}.${ext}`;
      const filePath = path.join(signaturesDir, filename);
      fs.writeFileSync(filePath, base64Data, 'base64');
      signatureUrl = `/uploads/signatures/${filename}`;
    }

    // 4. Update Booking Data
    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        isWebCheckedIn: true,
        signatureUrl,
        estimatedArrivalTime: payload.eta || null,
        // We do not change status to 'checked_in' yet. The front desk must hand over the physical keys.
      }
    });

    // 5. Process Guests and their Documents
    if (payload.guests && payload.guests.length > 0) {
      // First, remove existing guests to replace them, or we can upsert.
      // For simplicity, we delete existing and recreate.
      await this.prisma.guest.deleteMany({ where: { bookingId } });

      for (const g of payload.guests) {
        let documentUrl = null;
        if (g.documentBase64 && g.documentBase64.startsWith('data:image')) {
           const base64Data = g.documentBase64.replace(/^data:image\/\w+;base64,/, '');
           const ext = g.documentBase64.split(';')[0].split('/')[1] || 'jpeg';
           const filename = `doc_${bookingId}_${uuidv4()}.${ext}`;
           const filePath = path.join(documentsDir, filename);
           fs.writeFileSync(filePath, base64Data, 'base64');
           documentUrl = `/uploads/documents/${filename}`;
        }

        await this.prisma.guest.create({
          data: {
            bookingId,
            name: g.name,
            idType: g.idType || 'passport',
            idNumber: g.idNumber,
            documentUrl
          }
        });
      }
    }

    // 6. Audit Logging
    await this.activityLogsService.logAction(
      updatedBooking.hotelId,
      'GUEST_WEB_CHECKIN_COMPLETED',
      { bookingId: updatedBooking.id, leadName: updatedBooking.leadName }
    );

    // 7. Send confirmation email (non-blocking — don't await so it doesn't delay response)
    const bookingForEmail = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: { select: { name: true, logoUrl: true } },
        roomType: { select: { name: true } },
      }
    });
    if (bookingForEmail) {
      this.notificationsService.sendWebCheckinConfirmationEmail(bookingForEmail)
        .catch(err => this.logger.error('Failed to send web check-in email', err));
    }

    return { success: true, message: 'Web check-in completed successfully', booking: updatedBooking };
  }
}
