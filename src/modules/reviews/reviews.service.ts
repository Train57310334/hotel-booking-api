import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { hotelId: string; userId: string; rating: number; comment?: string }) {
    return this.prisma.review.create({
      data: {
        ...data,
        status: 'pending' 
      }
    });
  }

  async findAll(status?: string, hotelId?: string) {
    const where: any = {};
    if (status && status !== 'All') {
      where.status = status.toLowerCase();
    }
    if (hotelId) {
      where.hotelId = hotelId;
    }

    return this.prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        hotel: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByHotel(hotelId: string) {
    return this.prisma.review.findMany({
      where: { 
        hotelId,
        status: 'approved'
      },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.review.update({
      where: { id },
      data: { status }
    });
  }

  async delete(id: string) {
    return this.prisma.review.delete({
      where: { id }
    });
  }

  async getStats(hotelId?: string) {
    const where: any = {};
    if (hotelId) where.hotelId = hotelId;

    const total = await this.prisma.review.count({ where });
    const pending = await this.prisma.review.count({ where: { ...where, status: 'pending' } });
    const approved = await this.prisma.review.count({ where: { ...where, status: 'approved' } });
    const avg = await this.prisma.review.aggregate({
        _avg: { rating: true },
        where: { ...where, status: 'approved' }
    });

    return { total, pending, approved, averageRating: avg._avg.rating || 0 };
  }

  // ─── Guest Token-Based Reviews ────────────────────────────────────────────

  async validateToken(token: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { reviewToken: token },
      include: {
        hotel: { select: { name: true, imageUrl: true, logoUrl: true } },
        roomType: { select: { name: true } },
      },
    });

    if (!booking) throw new NotFoundException('Review link is invalid.');
    if (booking.reviewTokenUsed) throw new BadRequestException('You have already submitted a review. Thank you!');

    return {
      guestName: booking.leadName,
      hotelName: booking.hotel.name,
      hotelLogo: booking.hotel.logoUrl,
      roomType: booking.roomType.name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      hotelId: booking.hotelId,
    };
  }

  async submitGuestReview(token: string, rating: number, comment: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { reviewToken: token },
    });

    if (!booking) throw new NotFoundException('Review link is invalid.');
    if (booking.reviewTokenUsed) throw new BadRequestException('Review already submitted.');

    // Mark token as used
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { reviewTokenUsed: true },
    });

    // Create review (no userId — guest is not logged in)
    return this.prisma.review.create({
      data: {
        hotelId: booking.hotelId,
        rating,
        comment,
        guestName: booking.leadName,
        source: 'post-stay-email',
        status: 'pending',
      },
    });
  }

  // Send review request email when a booking is checked out
  async sendReviewRequest(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { hotel: true },
    });
    if (!booking || booking.reviewToken) return; // Already has a token

    // Generate unique token
    const token = `${booking.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { reviewToken: token, reviewTokenUsed: false },
    });

    // Read SMTP from SystemSettings
    const smtpSettings = await this.getSmtpSettings();
    if (!smtpSettings) return; // No SMTP configured

    const reviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/review/${token}`;
    const transporter = nodemailer.createTransport(smtpSettings);

    await transporter.sendMail({
      from: smtpSettings.auth.user,
      to: booking.leadEmail,
      subject: `How was your stay at ${booking.hotel.name}? ⭐`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#1e293b">Thank you for staying with us, ${booking.leadName}!</h2>
          <p style="color:#475569">We hope you had a wonderful stay at <strong>${booking.hotel.name}</strong>.</p>
          <p style="color:#475569">Your feedback means the world to us — it only takes 30 seconds.</p>
          <a href="${reviewUrl}" style="display:inline-block;margin:16px 0;padding:14px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px">
            ⭐ Leave a Review
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">This link can only be used once. If you didn't stay with us recently, please ignore this email.</p>
        </div>
      `,
    });
  }

  private async getSmtpSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      where: { category: 'smtp' },
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    if (!map['smtp_host'] || !map['smtp_user'] || !map['smtp_pass']) return null;

    return {
      host: map['smtp_host'],
      port: parseInt(map['smtp_port'] || '587'),
      secure: map['smtp_secure'] === 'true',
      auth: { user: map['smtp_user'], pass: map['smtp_pass'] },
    };
  }
}
