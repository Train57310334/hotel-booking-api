import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  // ─── Expenses ────────────────────────────────────────────────────────────

  async getExpenses(hotelId: string, startDate?: Date, endDate?: Date) {
    const where: any = { hotelId };
    if (startDate && endDate) {
        // Inclusive search
        where.date = { gte: startDate, lte: endDate };
    }

    const expenses = await this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' }
    });

    // Aggregate by category
    const byCategory = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
    }, {} as Record<string, number>);

    return { expenses, byCategory };
  }

  async createExpense(data: { hotelId: string; title: string; amount: number; category: string; date: Date }) {
    return this.prisma.expense.create({
        data
    });
  }

  async deleteExpense(id: string) {
    return this.prisma.expense.delete({
        where: { id }
    });
  }


  // ─── Profit & Loss (P/L) ──────────────────────────────────────────────────

  async getProfitAndLoss(hotelId: string, startDate: Date, endDate: Date) {
    // 1. Get Revenue from DailyStats (Night Audit source of truth)
    // Note: DailyStat currently doesn't have hotelId, it's platform wide per-day.
    // If the system supports multi-hotel, DailyStat needs hotelId. Assuming single hotel config for now 
    // or we fetch sum of completed bookings in that date range.
    // Let's use DailyStat for speed, as Night Audit creates it.
    
    // Check if DailyStat has hotelId:
    const dailyStats = await this.prisma.dailyStat.findMany({
        where: {
            date: { gte: startDate, lte: endDate }
            // if hotelId was on DailyStat: hotelId
        }
    });

    const totalRevenue = dailyStats.reduce((sum, stat) => sum + stat.totalRevenue, 0);

    // 2. Get Expenses
    const expenses = await this.prisma.expense.findMany({
        where: {
            hotelId,
            date: { gte: startDate, lte: endDate }
        }
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 3. Build Daily Chart Data
    // We want an array of { date: 'YYYY-MM-DD', revenue: number, expense: number }
    const chartMap = new Map<string, { revenue: number; expense: number }>();
    
    // Initialize map with days
    let cur = new Date(startDate);
    while (cur <= endDate) {
        chartMap.set(cur.toISOString().split('T')[0], { revenue: 0, expense: 0 });
        cur.setDate(cur.getDate() + 1);
    }

    // Populate daily revenues
    dailyStats.forEach(stat => {
        const dateStr = stat.date.toISOString().split('T')[0];
        if (chartMap.has(dateStr)) {
            chartMap.get(dateStr)!.revenue = stat.totalRevenue;
        }
    });

    // Populate daily expenses
    expenses.forEach(exp => {
        const dateStr = exp.date.toISOString().split('T')[0];
        if (chartMap.has(dateStr)) {
            chartMap.get(dateStr)!.expense += exp.amount;
        }
    });

    const chartData = Array.from(chartMap.entries()).map(([date, data]) => ({
        date,
        ...data,
        profit: data.revenue - data.expense
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate expenses by category
    const expensesByCategory = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
    }, {} as Record<string, number>);

    // Summary
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
        summary: {
            totalRevenue,
            totalExpenses,
            netProfit,
            profitMargin
        },
        expensesByCategory: Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })),
        chartData
    };
  }
}
