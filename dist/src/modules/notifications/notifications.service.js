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
    async sendBookingConfirmationEmail(booking) {
        const subject = `Booking Confirmation - ${booking.hotel.name}`;
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
    templateBookingConfirmation(booking) {
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
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map