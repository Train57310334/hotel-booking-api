import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 🔔 Create DB Notification
  async createNotification(title: string, message: string, type: string = 'info') {
      try {
          await this.prisma.notification.create({
              data: { title, message, type }
          });
      } catch (e) {
          this.logger.error('Failed to create notification', e);
      }
  }

  // ✅ 1. ยืนยันการจอง
  async sendBookingConfirmationEmail(booking: any) {
    const subject = `Booking Confirmation - ${booking.hotel.name}`;
    const html = this.templateBookingConfirmation(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
    await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} confirmed for ${booking.leadName}`, 'success');
  }

  // 💳 2. ยืนยันการชำระเงิน
  async sendPaymentSuccessEmail(booking: any) {
    const subject = `Payment Successful - ${booking.hotel.name}`;
    const html = this.templatePaymentSuccess(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
    await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} confirmed for ${booking.leadName}`, 'success');
  }

  // 🚫 3. การยกเลิกการจอง
  async sendCancellationEmail(booking: any) {
    const subject = `Booking Cancelled - ${booking.hotel.name}`;
    const html = this.templateCancellation(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
    await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} confirmed for ${booking.leadName}`, 'success');
  }

  // 🕒 4. เตือนก่อนเข้าพัก 1 วัน
  async sendPreCheckinReminder(booking: any) {
    const subject = `Your Stay Starts Tomorrow - ${booking.hotel.name}`;
    const html = this.templatePreCheckin(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
    await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} confirmed for ${booking.leadName}`, 'success');
  }

  // ⭐ 5. ขอ Feedback หลัง Check-out
  async sendFeedbackRequest(booking: any) {
    const subject = `How was your stay at ${booking.hotel.name}?`;
    const html = this.templateFeedbackRequest(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
    // await this.createNotification('Feedback', `Sent feedback request to ${booking.leadName}`, 'info');
  }

  // --------------------------------------------------------------------
  // 🔧 UTILITIES
  // --------------------------------------------------------------------

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Hotel Booking" <no-reply@hotel.com>',
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${subject}`, error);
    }
  }

  private formatDate(date: Date) {
    return new Date(date).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // --------------------------------------------------------------------
  // 📩 EMAIL TEMPLATES
  // --------------------------------------------------------------------

  private templateBookingConfirmation(booking: any): string {
    return `
      <div style="background-color: #f8fafc; padding: 20px; font-family: sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header Image -->
          ${booking.hotel.imageUrl ? `<img src="${booking.hotel.imageUrl}" alt="${booking.hotel.name}" style="width: 100%; height: 200px; object-fit: cover;">` : ''}
          
          <div style="padding: 30px;">
            <h2 style="color:#2E86C1; margin-top: 0;">Booking Confirmed!</h2>
            <p>สวัสดีคุณ <b>${booking.leadName}</b>,</p>
            <p>ขอบคุณที่จองห้องพักกับ <b>${booking.hotel.name}</b></p>
            
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><b>Booking ID:</b> ${booking.id}</p>
              <p style="margin: 5px 0;"><b>Check-in:</b> ${this.formatDate(booking.checkIn)}</p>
              <p style="margin: 5px 0;"><b>Check-out:</b> ${this.formatDate(booking.checkOut)}</p>
              <p style="margin: 5px 0;"><b>Room Type:</b> ${booking.roomType.name}</p>
              <p style="margin: 5px 0; font-size: 1.2em; color: #0f172a;"><b>Total: ${booking.totalAmount.toLocaleString()} THB</b></p>
            </div>
            
            ${booking.roomType.images?.[0] ? `<img src="${booking.roomType.images[0]}" alt="Room" style="width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;">` : ''}

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <small style="color: #64748b;">See you soon at ${booking.hotel.name}!</small>
          </div>
        </div>
      </div>
    `;
  }

  private templatePaymentSuccess(booking: any): string {
    return `
      <div style="background-color: #f8fafc; padding: 20px; font-family: sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
           <div style="background-color: #22c55e; padding: 20px; text-align: center; color: white;">
             <h1 style="margin:0;">Payment Received</h1>
           </div>
          <div style="padding: 30px;">
            <p>Dear ${booking.leadName},</p>
            <p>Your payment for booking <b>${booking.id}</b> has been confirmed.</p>
            <ul>
              <li>Hotel: ${booking.hotel.name}</li>
              <li>Amount Paid: ${booking.totalAmount.toLocaleString()} THB</li>
              <li>Payment Status: <b>Paid</b></li>
            </ul>
            <p>We look forward to your stay!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <small style="color: #64748b;">This is an automated message.</small>
          </div>
        </div>
      </div>
    `;
  }

  private templateCancellation(booking: any): string {
    return `
      <div style="background-color: #fef2f2; padding: 20px; font-family: sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
           <div style="background-color: #ef4444; padding: 20px; text-align: center; color: white;">
             <h1 style="margin:0;">Booking Cancelled</h1>
           </div>
          <div style="padding: 30px;">
            <p>Dear ${booking.leadName},</p>
            <p>Your booking with ID <b>${booking.id}</b> has been successfully cancelled.</p>
            <p>If this was not intended, please contact our support team immediately.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <small style="color: #64748b;">Thank you for using our service.</small>
          </div>
        </div>
      </div>
    `;
  }

  private templatePreCheckin(booking: any): string {
    return `
      <div style="background-color: #fff7ed; padding: 20px; font-family: sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          ${booking.hotel.imageUrl ? `<img src="${booking.hotel.imageUrl}" alt="${booking.hotel.name}" style="width: 100%; height: 200px; object-fit: cover;">` : ''}
          <div style="padding: 30px;">
            <h2 style="color:#f59e0b; margin-top: 0;">Your Stay Starts Tomorrow!</h2>
            <p>Dear ${booking.leadName},</p>
            <p>We are excited to welcome you to <b>${booking.hotel.name}</b> tomorrow.</p>
            <ul>
              <li>Check-in: ${this.formatDate(booking.checkIn)}</li>
              <li>Room Type: ${booking.roomType.name}</li>
            </ul>
            <p>See you soon!</p>
          </div>
        </div>
      </div>
    `;
  }

  private templateFeedbackRequest(booking: any): string {
    const reviewLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/review/${booking.id}`;
    return `
      <div style="background-color: #f0fdf4; padding: 20px; font-family: sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
           <div style="background-color: #10b981; padding: 20px; text-align: center; color: white;">
             <h1 style="margin:0;">We value your feedback</h1>
           </div>
          <div style="padding: 30px; text-align: center;">
            <p style="font-size: 1.1em;">Hi <b>${booking.leadName}</b>,</p>
            <p>We hope you enjoyed your stay at <b>${booking.hotel.name}</b>.</p>
            <p>Would you mind taking a moment to rate your experience?</p>
            
            <a href="${reviewLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; border-radius: 30px; text-decoration: none; font-weight: bold; margin: 20px 0; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
              ★★★★★ Write a Review
            </a>

            <p style="color: #64748b; font-size: 0.9em;">Or click here: <a href="${reviewLink}" style="color: #10b981;">${reviewLink}</a></p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <small style="color: #64748b;">Thank you for choosing BookingKub!</small>
          </div>
        </div>
      </div>
    `;
  }
}
