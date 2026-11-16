import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { includeLatest, present } from './equipment.mapper.js';
import type { PaginationDto } from './dto/pagination/pagination.dto.js';
import type { CreateEquipmentDto } from './dto/create-equipment.dto/create-equipment.dto.js';
import type { UpdateEquipmentDto } from './dto/update-equipment.dto/update-equipment.dto.js';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({ page, limit }: PaginationDto) {
    const [equipment, total] = await this.prisma.$transaction(
      [
        this.prisma.equipment.findMany({
          orderBy: [{ code: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
          include: includeLatest,
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.equipment.count(),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      data: equipment.map(present),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id },
      include: includeLatest,
    });
    if (!equipment) throw new NotFoundException('Equipo no encontrado');
    return present(equipment);
  }

  async create(data: CreateEquipmentDto) {
    try {
      return present(
        await this.prisma.equipment.create({ data, include: includeLatest }),
      );
    } catch (error) {
      this.handleConflict(error);
    }
  }

  private async lockActive(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<
      Array<{ hourMeter: number }>
    >`SELECT "hourMeter" FROM "Equipment" WHERE "id" = ${id} AND "deletedAt" IS NULL FOR UPDATE`;
    if (!rows[0]) throw new NotFoundException('Equipo no encontrado');
    return rows[0];
  }

  async update(id: string, data: UpdateEquipmentDto) {
    if (Object.keys(data).length === 0)
      throw new BadRequestException('Indica al menos un campo para actualizar');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await this.lockActive(tx, id);
        if (data.hourMeter !== undefined && data.hourMeter < current.hourMeter)
          throw new BadRequestException('El horómetro no puede disminuir');
        return present(
          await tx.equipment.update({
            where: { id },
            data,
            include: includeLatest,
          }),
        );
      });
    } catch (error) {
      this.handleConflict(error);
    }
  }

  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.lockActive(tx, id);
      await tx.equipment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async history(id: string, { page, limit }: PaginationDto) {
    await this.findOne(id);
    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.maintenance.findMany({
          where: { equipmentId: id },
          orderBy: [{ performedAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.maintenance.count({ where: { equipmentId: id } }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async registerMaintenance(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const equipment = await this.lockActive(tx, id);
      return tx.maintenance.create({
        data: { equipmentId: id, hourMeter: equipment.hourMeter },
      });
    });
  }

  private handleConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ConflictException('El código ya está registrado');
    throw error;
  }
}
