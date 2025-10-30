import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class UpdateInventoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  allotment?: number;

  @IsOptional()
  @IsBoolean()
  stopSale?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  minStay?: number;
}
