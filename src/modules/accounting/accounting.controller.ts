import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin') // SECURITY FIX: Was missing @Roles — any user could access financial data
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('expenses')
  getExpenses(
    @Query('hotelId') hotelId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.getExpenses(
      hotelId, 
      startDate ? new Date(startDate) : undefined, 
      endDate ? new Date(endDate) : undefined
    );
  }

  @Post('expenses')
  createExpense(@Body() data: { hotelId: string; title: string; amount: number; category: string; date: string }) {
    return this.accountingService.createExpense({
        ...data,
        date: new Date(data.date)
    });
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return this.accountingService.deleteExpense(id);
  }

  @Get('pl-report')
  getProfitAndLoss(
    @Query('hotelId') hotelId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.accountingService.getProfitAndLoss(
        hotelId,
        new Date(startDate),
        new Date(endDate)
    );
  }
}
