import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { EquipmentType } from '../../../generated/prisma/enums.js';

export class UpdateEquipmentDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(EquipmentType)
  type?: EquipmentType;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  hourMeter?: number;
}
