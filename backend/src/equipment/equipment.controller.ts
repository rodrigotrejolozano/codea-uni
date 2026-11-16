import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EquipmentService } from './equipment.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto/create-equipment.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto/update-equipment.dto.js';
import { PaginationDto } from './dto/pagination/pagination.dto.js';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}
  @Get() findAll(@Query() pagination: PaginationDto) {
    return this.equipmentService.findAll(pagination);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }
  @Post() create(@Body() data: CreateEquipmentDto) {
    return this.equipmentService.create(data);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() data: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(id, data);
  }
  @Delete(':id') @HttpCode(204) remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }
  @Get(':id/maintenances') history(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.equipmentService.history(id, pagination);
  }
  @Post(':id/maintenances') registerMaintenance(@Param('id') id: string) {
    return this.equipmentService.registerMaintenance(id);
  }
}
