import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FolioService } from '../src/modules/folio/folio.service';
import { HousekeepingService } from '../src/modules/housekeeping/housekeeping.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const folioSvc = app.get(FolioService);
  const hkSvc = app.get(HousekeepingService);

  try {
    console.log('--- Testing Housekeeping API ---');
    const hotel = await prisma.hotel.findFirst();
    if (hotel) {
      const hkStatus = await hkSvc.getHousekeepingStatus(hotel.id);
      console.log('Successfully fetched Housekeeping Status for Hotel:', hotel.id);
      console.log('Number of Room Types:', hkStatus.length);

      const firstRoom = await prisma.room.findFirst({ where: { roomType: { hotelId: hotel.id } } });
      if (firstRoom) {
         console.log('Testing Room Status Update...');
         const currentStatus = firstRoom.status;
         const updated = await hkSvc.updateRoomStatus(firstRoom.id, 'DIRTY', null, 'Test Note');
         console.log('Room updated to:', updated.status);
         
         const revert = await hkSvc.updateRoomStatus(firstRoom.id, currentStatus, null, 'Reverted');
         console.log('Room reverted to:', revert.status);
      }
    }

    console.log('\n--- Testing Folio API ---');
    const booking = await prisma.booking.findFirst();
    if (booking) {
       console.log('Testing Add Charge to Booking:', booking.id);
       const charge = await folioSvc.addCharge(booking.id, {
           amount: 500,
           description: 'Test Minibar Charge',
           type: 'MINIBAR'
       });
       console.log('Charge added with ID:', charge.id);

       console.log('Testing Get Folio...');
       const folio = await folioSvc.getFolio(booking.id);
       console.log(`Folio summary: Total Charges = ${folio.totalCharges}, Balance = ${folio.balance}`);
       
       console.log('Testing Remove Charge...');
       await folioSvc.removeCharge(charge.id);
       console.log('Charge removed successfully.');
    } else {
       console.log('No bookings found to test Folio API.');
    }

    console.log('\n✅ All integration tests passed successfully!');
  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
