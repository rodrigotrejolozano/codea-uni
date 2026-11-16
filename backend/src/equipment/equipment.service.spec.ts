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
        {
          provide: PrismaService,
          useValue: {
            equipment: { findMany, count: vi.fn().mockResolvedValue(0) },
            $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
          },
        },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  it('returns equipment ordered by code', async () => {
    findMany.mockResolvedValue([]);
    await expect(service.findAll({ page: 1, limit: 10 })).resolves.toEqual({
      data: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ code: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip: 0,
        take: 10,
      }),
    );
  });
});
