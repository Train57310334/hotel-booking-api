import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return { q, suggestions: [] };
  }

  // ✅ Now backed by Prisma search service
  @Get('hotels')
  async searchHotels(
    @Query('city') city: string,
    @Query('checkIn') checkIn?: string,
    @Query('checkOut') checkOut?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('guests') guests?: string,
    @Query('amenities') amenities?: string[]
  ) {
    if (!city) return { hotels: [] };
    const hotels = await this.searchService.findHotelsByCity(
      city,
      checkIn,
      checkOut,
      minPrice ? Number(minPrice) : undefined,
      maxPrice ? Number(maxPrice) : undefined,
      guests ? Number(guests) : undefined,
      amenities
    );
    return hotels;
  }
}

