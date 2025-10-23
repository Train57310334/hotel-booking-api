import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  async sendBookingConfirmation(to: string, payload: any) {
    // TODO: implement email/sms provider
    return { ok: true };
  }
}
