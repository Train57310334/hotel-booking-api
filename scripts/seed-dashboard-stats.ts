import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const EXPENSE_CATEGORIES = ['utilities', 'salary', 'maintenance', 'marketing', 'general'];
const EXPENSE_TITLES = {
    'utilities': ['Electricity Bill', 'Water Bill', 'Internet/Phone Bill'],
    'salary': ['Staff Payroll', 'Management Salaries', 'Security Guard Payroll'],
    'maintenance': ['AC Repair', 'Plumbing Fix', 'Pool Cleaning', 'Elevator Maintenance'],
    'marketing': ['Facebook Ads', 'Google Ads', 'Local Billboard'],
    'general': ['Office Supplies', 'Cleaning Supplies', 'Staff Lunch']
};

const MESSAGE_SUBJECTS = ['Lost Item', 'Group Booking Inquiry', 'Late Check-in Request', 'Airport Transfer Booking', 'Complaint'];
const MESSAGE_NAMES = ['Tom Ford', 'Anna Wintour', 'Gordon Ramsay', 'Tony Stark', 'Bruce Wayne'];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);

  console.log('--- Seeding Dashboard Stats (DailyStat, Expense, Message) ---');

  const hotels = await prisma.hotel.findMany();
  if (hotels.length === 0) {
      console.error('No hotels found. Please create a hotel first.');
      await app.close();
      return;
  }
  
  const hotelId = hotels[0].id; // We'll seed against the first hotel

  // 1. Seed DailyStats for the past 6 months
  // Although DailyStat is global in the schema, we'll just populate it.
  const today = new Date();
  today.setHours(0,0,0,0);
  
  let statsCreated = 0;
  for (let i = 180; i >= 0; i--) {
      const date = addDays(today, -i);
      
      // Calculate realistic random figures
      const rooms = getRandomInt(10, 50);
      const occupied = getRandomInt(0, rooms);
      const occupancyRate = (occupied / rooms) * 100;
      const adr = getRandomInt(1500, 3500); // 1500 to 3500 THB
      const totalRevenue = occupied * adr;
      const revPar = totalRevenue / rooms;
      
      await prisma.dailyStat.upsert({
          where: { date: date },
          update: { 
             totalRevenue, 
             totalBookings: occupied + getRandomInt(0, 5), 
             occupiedRooms: occupied,
             occupancyRate,
             adr,
             revPar
          },
          create: {
             date: date,
             totalRevenue, 
             totalBookings: occupied + getRandomInt(0, 5), 
             occupiedRooms: occupied,
             occupancyRate,
             adr,
             revPar
          }
      });
      statsCreated++;
  }
  console.log(`✅ Created/Updated ${statsCreated} DailyStat records for the past 6 months.`);

  // 2. Seed Expenses for the past 6 months
  await prisma.expense.deleteMany({ where: { hotelId } }); // clear old
  let expensesCreated = 0;
  
  for (let m = 0; m < 6; m++) { // Past 6 months
      const monthStart = addDays(today, -(m * 30));
      
      // Generate 5-10 expenses per month
      const count = getRandomInt(5, 10);
      for(let i=0; i<count; i++) {
          const category = EXPENSE_CATEGORIES[getRandomInt(0, EXPENSE_CATEGORIES.length - 1)];
          const titles = EXPENSE_TITLES[category];
          const title = titles[getRandomInt(0, titles.length - 1)];
          
          let amount = 0;
          if (category === 'salary') amount = getRandomInt(50000, 200000);
          else if (category === 'utilities') amount = getRandomInt(10000, 50000);
          else amount = getRandomInt(500, 15000);

          let expenseDate = addDays(monthStart, getRandomInt(-28, 0));
          
          await prisma.expense.create({
              data: {
                  hotelId,
                  title,
                  amount,
                  category,
                  date: expenseDate
              }
          });
          expensesCreated++;
      }
  }
  console.log(`✅ Created ${expensesCreated} Expense records for the past 6 months.`);


  // 3. Seed Messages (Inbox)
  await prisma.message.deleteMany({ where: { hotelId } });
  let messagesCreated = 0;
  
  for(let i=0; i < 15; i++) {
      const name = MESSAGE_NAMES[getRandomInt(0, MESSAGE_NAMES.length - 1)];
      const subject = MESSAGE_SUBJECTS[getRandomInt(0, MESSAGE_SUBJECTS.length - 1)];
      const statuses = ['unread', 'unread', 'read', 'replied'];
      const status = statuses[getRandomInt(0, statuses.length - 1)];
      
      const msgDate = addDays(today, -getRandomInt(0, 14)); // Last 2 weeks
      
      await prisma.message.create({
          data: {
              hotelId,
              name,
              email: `${name.replace(' ', '.').toLowerCase()}@example.com`,
              subject,
              content: `This is an automated test message regarding ${subject.toLowerCase()}. Please contact me as soon as possible.`,
              status,
              createdAt: msgDate
          }
      });
      messagesCreated++;
  }
  console.log(`✅ Created ${messagesCreated} Message records (Inbox).`);

  await app.close();
}

bootstrap().catch((e) => {
    console.error(e);
    process.exit(1);
});
