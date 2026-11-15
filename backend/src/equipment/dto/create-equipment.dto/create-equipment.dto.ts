import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EquipmentType } from '../../../generated/prisma/enums.js';

export class CreateEquipmentDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code!: string;

  @IsEnum(EquipmentType)
  type!: EquipmentType;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  hourMeter!: number;
}
