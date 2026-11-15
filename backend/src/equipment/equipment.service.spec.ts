import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentService } from './equipment.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('EquipmentService', () => {
  let service: EquipmentService;
  const findMany = vi.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: PrismaService, useValue: { equipment: { findMany } } },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  it('returns equipment ordered by code', async () => {
    findMany.mockResolvedValue([]);
    await expect(service.findAll()).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        orderBy: { code: 'asc' },
      }),
    );
  });
});
