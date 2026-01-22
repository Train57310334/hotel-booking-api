import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { OwnersService } from './owners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('owners')
@Controller('owners')
@UseGuards(JwtAuthGuard)
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.ownersService.findAll(search);
  }

  @Post()
  create(@Body() createOwnerDto: any) {
    return this.ownersService.create(createOwnerDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ownersService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateOwnerDto: any) {
    return this.ownersService.update(id, updateOwnerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ownersService.remove(id);
  }
}
