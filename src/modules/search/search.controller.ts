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
    @Query('adults') adults?: string,
    @Query('children') children?: string,
    @Query('amenities') amenities?: string[]
  ) {
    // If city is empty, we still want to return results for single hotel mode
    // if (!city) return { hotels: [] }; 
    
    const hotels = await this.searchService.findHotelsByCity(
      city,
      checkIn,
      checkOut,
      minPrice ? Number(minPrice) : undefined,
      maxPrice ? Number(maxPrice) : undefined,
      guests ? Number(guests) : undefined,
      adults ? Number(adults) : undefined,
      children ? Number(children) : undefined,
      amenities
    );
    return hotels;
  }
  @Get('global')
  async globalSearch(@Query('q') q: string, @Query('hotelId') hotelId?: string) {
    return this.searchService.globalSearch(q, hotelId);
  }
}

