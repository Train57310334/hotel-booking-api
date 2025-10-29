import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
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

  // ✅ 1. ยืนยันการจอง
  async sendBookingConfirmationEmail(booking: any) {
    const subject = `Booking Confirmation - ${booking.hotel.name}`;
    const html = this.templateBookingConfirmation(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
  }

  // 💳 2. ยืนยันการชำระเงิน
  async sendPaymentSuccessEmail(booking: any) {
    const subject = `Payment Successful - ${booking.hotel.name}`;
    const html = this.templatePaymentSuccess(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
  }

  // 🚫 3. การยกเลิกการจอง
  async sendCancellationEmail(booking: any) {
    const subject = `Booking Cancelled - ${booking.hotel.name}`;
    const html = this.templateCancellation(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
  }

  // 🕒 4. เตือนก่อนเข้าพัก 1 วัน
  async sendPreCheckinReminder(booking: any) {
    const subject = `Your Stay Starts Tomorrow - ${booking.hotel.name}`;
    const html = this.templatePreCheckin(booking);
    await this.sendEmail(booking.leadEmail, subject, html);
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
      <h2 style="color:#2E86C1;">Booking Confirmed!</h2>
      <p>สวัสดีคุณ <b>${booking.leadName}</b>,</p>
      <p>ขอบคุณที่จองห้องพักกับ <b>${booking.hotel.name}</b></p>
      <p><b>Booking ID:</b> ${booking.id}</p>
      <p><b>Check-in:</b> ${this.formatDate(booking.checkIn)}</p>
      <p><b>Check-out:</b> ${this.formatDate(booking.checkOut)}</p>
      <p><b>Total Amount:</b> ${booking.totalAmount.toLocaleString()} THB</p>
      <hr>
      <small>See you soon at ${booking.hotel.name}!</small>
    `;
  }

  private templatePaymentSuccess(booking: any): string {
    return `
      <h2 style="color:green;">Payment Successful!</h2>
      <p>Dear ${booking.leadName},</p>
      <p>Your payment for booking <b>${booking.id}</b> has been confirmed.</p>
      <ul>
        <li>Hotel: ${booking.hotel.name}</li>
        <li>Amount Paid: ${booking.totalAmount.toLocaleString()} THB</li>
        <li>Payment Status: <b>Paid</b></li>
      </ul>
      <p>We look forward to your stay!</p>
      <hr>
      <small>This is an automated message, please do not reply.</small>
    `;
  }

  private templateCancellation(booking: any): string {
    return `
      <h2 style="color:#C0392B;">Booking Cancelled</h2>
      <p>Dear ${booking.leadName},</p>
      <p>Your booking with ID <b>${booking.id}</b> has been successfully cancelled.</p>
      <p>If this was not intended, please contact our support team.</p>
      <hr>
      <small>Thank you for using our service.</small>
    `;
  }

  private templatePreCheckin(booking: any): string {
    return `
      <h2 style="color:#F39C12;">Reminder: Your Stay Starts Tomorrow</h2>
      <p>Dear ${booking.leadName},</p>
      <p>This is a friendly reminder that your stay at <b>${booking.hotel.name}</b> begins tomorrow.</p>
      <ul>
        <li>Check-in: ${this.formatDate(booking.checkIn)}</li>
        <li>Room Type: ${booking.roomType.name}</li>
        <li>Hotel: ${booking.hotel.name}</li>
      </ul>
      <p>We look forward to welcoming you!</p>
      <hr>
      <small>Safe travels and see you soon!</small>
    `;
  }
}
