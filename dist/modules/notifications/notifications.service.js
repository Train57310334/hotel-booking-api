"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
const settings_service_1 = require("../settings/settings.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, settingsService) {
        this.prisma = prisma;
        this.settingsService = settingsService;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async createNotification(title, message, type = 'info') {
        try {
            await this.prisma.notification.create({
                data: { title, message, type }
            });
        }
        catch (e) {
            this.logger.error('Failed to create notification', e);
        }
    }
    async sendBookingReceivedEmail(booking) {
        const subject = `Booking Received (Pending Payment) - ${booking.hotel.name}`;
        const html = this.templateBookingReceived(booking);
        await this.sendEmail(booking.leadEmail, subject, html);
        await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} received for ${booking.leadName}`, 'info');
    }
    async sendBookingConfirmationEmail(booking) {
        const subject = `Booking Confirmed - ${booking.hotel.name}`;
        const html = this.templateBookingConfirmation(booking);
        await this.sendEmail(booking.leadEmail, subject, html);
        await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} confirmed for ${booking.leadName}`, 'success');
    }
    async sendPaymentSuccessEmail(booking) {
        const subject = `Payment Successful - ${booking.hotel.name}`;
        const html = this.templatePaymentSuccess(booking);
        await this.sendEmail(booking.leadEmail, subject, html);
        await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} confirmed for ${booking.leadName}`, 'success');
    }
    async sendCancellationEmail(booking) {
        const subject = `Booking Cancelled - ${booking.hotel.name}`;
        const html = this.templateCancellation(booking);
        await this.sendEmail(booking.leadEmail, subject, html);
        await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} confirmed for ${booking.leadName}`, 'success');
    }
    async sendPreCheckinReminder(booking) {
        const subject = `Your Stay Starts Tomorrow - ${booking.hotel.name}`;
        const html = this.templatePreCheckin(booking);
        await this.sendEmail(booking.leadEmail, subject, html);
        await this.createNotification('New Booking', `Booking ${booking.id.slice(-6)} confirmed for ${booking.leadName}`, 'success');
    }
    async sendFeedbackRequest(booking) {
        const subject = `How was your stay at ${booking.hotel.name}?`;
        const html = this.templateFeedbackRequest(booking);
        await this.sendEmail(booking.leadEmail, subject, html);
    }
    async getTransporter() {
        const host = await this.settingsService.get('smtpHost', 'SMTP_HOST');
        const port = await this.settingsService.get('smtpPort', 'SMTP_PORT');
        const user = await this.settingsService.get('smtpUser', 'SMTP_USER');
        const pass = await this.settingsService.get('smtpPass', 'SMTP_PASS');
        if (!host || !user || !pass) {
            this.logger.warn('SMTP Settings missing. Email will not be sent.');
            return null;
        }
        return nodemailer.createTransport({
            host,
            port: Number(port) || 587,
            secure: false,
            auth: { user, pass },
        });
    }
    async sendEmail(to, subject, html) {
        try {
            const transporter = await this.getTransporter();
            if (!transporter)
                return;
            const fromName = await this.settingsService.get('siteName', 'APP_NAME') || 'Hotel Booking';
            const fromEmail = await this.settingsService.get('smtpUser', 'SMTP_USER') || 'no-reply@hotel.com';
            const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent to ${to}: ${subject}`);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                this.logger.log(`📧 Preview Email: ${previewUrl}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to send email: ${subject}`, error);
        }
    }
    formatDate(date) {
        return new Date(date).toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }
    templateBookingReceived(booking) {
        const guestPortalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/manage-booking`;
        const hasPromptPay = booking.hotel.promptPayId;
        const qrCol = hasPromptPay ? `
        <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Scan to Pay</p>
          <img src="https://promptpay.io/${booking.hotel.promptPayId}/${booking.totalAmount}.png" alt="PromptPay QR Code" style="width: 150px; height: 150px;" />
          <p style="margin: 10px 0 0 0; font-size: 14px; font-weight: bold; color: #0f172a;">${booking.hotel.bankName || 'PromptPay'}</p>
          ${booking.hotel.bankAccountName ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${booking.hotel.bankAccountName}</p>` : ''}
          ${booking.hotel.bankAccountNumber ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${booking.hotel.bankAccountNumber}</p>` : ''}
        </div>
    ` : '';
        return `
      <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          ${booking.hotel.imageUrl ? `<div style="height: 220px; background-image: url('${booking.hotel.imageUrl}'); background-size: cover; background-position: center; border-bottom: 4px solid #f59e0b;"></div>` : ''}
          
          <div style="padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <span style="display: inline-block; background-color: #fef3c7; color: #d97706; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Pending Payment</span>
                <h1 style="color: #0f172a; margin: 15px 0 5px 0; font-size: 24px;">Booking Received</h1>
                <p style="color: #64748b; margin: 0; font-size: 16px;">Hello <b>${booking.leadName}</b>,</p>
            </div>

            <p style="color: #334155; line-height: 1.6; text-align: center;">We have successfully received your booking. To secure your reservation at <b>${booking.hotel.name}</b>, please complete your payment.</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; margin: 30px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Booking ID</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${booking.id}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Check-in</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${this.formatDate(booking.checkIn)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Check-out</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${this.formatDate(booking.checkOut)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Room Type</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${booking.roomType.name}</td></tr>
                <tr><td colspan="2" style="border-bottom: 1px solid #cbd5e1; padding-top: 10px; margin-bottom: 10px;"></td></tr>
                <tr><td style="padding: 15px 0 0 0; color: #0f172a; font-size: 16px; font-weight: bold;">Total to Pay</td><td style="padding: 15px 0 0 0; text-align: right; font-weight: 900; color: #f59e0b; font-size: 22px;">฿${booking.totalAmount.toLocaleString()}</td></tr>
              </table>
            </div>
            
            ${qrCol}
            
            <div style="text-align: center; margin-top: 35px;">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 15px;">After completing your transfer, please upload the receipt to confirm your booking.</p>
                <a href="${guestPortalUrl}" style="display: inline-block; background-color: #0f172a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; transition: background-color 0.2s;">
                  Upload Payment Slip
                </a>
            </div>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you have any questions, contact us directly at ${booking.hotel.name}.</p>
                <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">This is an automated message generated by BookingKub.</p>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    templateBookingConfirmation(booking) {
        const guestPortalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/manage-booking`;
        return `
      <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          ${booking.hotel.imageUrl ? `<div style="height: 220px; background-image: url('${booking.hotel.imageUrl}'); background-size: cover; background-position: center; border-bottom: 4px solid #10b981;"></div>` : ''}
          
          <div style="padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <span style="display: inline-block; background-color: #dcfce7; color: #15803d; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Confirmed</span>
                <h1 style="color: #0f172a; margin: 15px 0 5px 0; font-size: 24px;">Booking Confirmed!</h1>
                <p style="color: #64748b; margin: 0; font-size: 16px;">Hello <b>${booking.leadName}</b>,</p>
            </div>

            <p style="color: #334155; line-height: 1.6; text-align: center;">Your reservation at <b>${booking.hotel.name}</b> is confirmed and secured. We are excited to host you!</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; margin: 30px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Booking ID</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${booking.id}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Check-in</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${this.formatDate(booking.checkIn)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Check-out</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${this.formatDate(booking.checkOut)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Room Type</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${booking.roomType.name}</td></tr>
                <tr><td colspan="2" style="border-bottom: 1px solid #cbd5e1; padding-top: 10px; margin-bottom: 10px;"></td></tr>
                <tr><td style="padding: 15px 0 0 0; color: #0f172a; font-size: 16px; font-weight: bold;">Total Paid</td><td style="padding: 15px 0 0 0; text-align: right; font-weight: 900; color: #10b981; font-size: 22px;">฿${booking.totalAmount.toLocaleString()}</td></tr>
              </table>
            </div>

            ${booking.roomType.images?.[0] ? `
                <div style="border-radius: 12px; overflow: hidden; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <img src="${booking.roomType.images[0]}" alt="Room" style="width: 100%; height: auto; display: block;">
                </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="${guestPortalUrl}" style="display: inline-block; background-color: #0f172a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  View Itinerary
                </a>
            </div>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">If you have any questions, contact us directly at ${booking.hotel.name}.</p>
                <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">This is an automated receipt generated by BookingKub.</p>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    templatePaymentSuccess(booking) {
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
    templateCancellation(booking) {
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
    templatePreCheckin(booking) {
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
    templateFeedbackRequest(booking) {
        const reviewLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/review/${booking.id}`;
        return `
      <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          ${booking.hotel.imageUrl ? `<div style="height: 180px; background-image: url('${booking.hotel.imageUrl}'); background-size: cover; background-position: center;"></div>` : ''}
          <div style="background-color: #0f172a; padding: 20px; text-align: center; color: white;">
             <h1 style="margin:0; font-size: 20px; letter-spacing: 1px;">How was your stay?</h1>
          </div>
          <div style="padding: 40px; text-align: center;">
            <p style="font-size: 18px; color: #0f172a; margin-top: 0;">Hi <b>${booking.leadName}</b>,</p>
            <p style="color: #64748b; line-height: 1.6; margin-bottom: 30px;">We hope you had a wonderful time at <b>${booking.hotel.name}</b>. Your feedback helps us improve and helps future guests know what to expect.</p>
            
            <a href="${reviewLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 16px 36px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 18px; margin: 10px 0; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: transform 0.2s;">
              <span style="font-size: 22px; vertical-align: middle; margin-right: 8px;">★</span> Write a Review
            </a>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Thank you for choosing ${booking.hotel.name}.</p>
                <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">Powered by BookingKub</p>
            </div>
          </div>
        </div>
      </div>
    `;
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map