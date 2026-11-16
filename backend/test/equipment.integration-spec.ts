import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const testUrl =
  'postgresql://mining_test:mining_test_local@localhost:55433/mining_test?schema=public';
if (process.env.DATABASE_URL !== testUrl)
  throw new Error(
    'Las pruebas de integración requieren exclusivamente la base de pruebas local en localhost:55433/mining_test',
  );

describe('Equipment API with PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let id: string;
  let replacementId: string;
  const paginationIds: string[] = [];
  const code = `test-${randomUUID()}`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma && id) {
      await prisma.maintenance.deleteMany({ where: { equipmentId: id } });
      await prisma.equipment.deleteMany({ where: { id } });
    }
    if (prisma && replacementId)
      await prisma.equipment.deleteMany({ where: { id: replacementId } });
    if (prisma && paginationIds.length) {
      await prisma.maintenance.deleteMany({
        where: { equipmentId: { in: paginationIds } },
      });
      await prisma.equipment.deleteMany({
        where: { id: { in: paginationIds } },
      });
    }
    if (app) await app.close();
  });

  it('defaults both paginated endpoints to five records', async () => {
    for (let i = 0; i < 6; i++) {
      const response = await request(app.getHttpServer())
        .post('/equipment')
        .send({ code: `page-${randomUUID()}`, type: 'TRUCK', hourMeter: 0 })
        .expect(201);
      paginationIds.push(response.body.id as string);
    }
    const list = await request(app.getHttpServer())
      .get('/equipment')
      .expect(200);
    expect(list.body.limit).toBe(5);
    expect(list.body.data).toHaveLength(5);
    for (let i = 0; i < 6; i++)
      await request(app.getHttpServer())
        .post(`/equipment/${paginationIds[0]}/maintenances`)
        .expect(201);
    const history = await request(app.getHttpServer())
      .get(`/equipment/${paginationIds[0]}/maintenances`)
      .expect(200);
    expect(history.body.limit).toBe(5);
    expect(history.body.data).toHaveLength(5);
    expect(history.body.total).toBe(6);
    expect(history.body.totalPages).toBe(2);
  });

  it('validates and completes the maintenance lifecycle', async () => {
    await request(app.getHttpServer())
      .post('/equipment')
      .send({ code: '', type: 'TRUCK', hourMeter: -1 })
      .expect(400);
    const created = await request(app.getHttpServer())
      .post('/equipment')
      .send({ code, type: 'TRUCK', hourMeter: 249 })
      .expect(201);
    id = created.body.id as string;
    expect(created.body.requiresMaintenance).toBe(false);
    await request(app.getHttpServer())
      .post('/equipment')
      .send({ code, type: 'TRUCK', hourMeter: 0 })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/equipment/${id}`)
      .send({ hourMeter: 248 })
      .expect(400);
    const due = await request(app.getHttpServer())
      .patch(`/equipment/${id}`)
      .send({ hourMeter: 250 })
      .expect(200);
    expect(due.body.requiresMaintenance).toBe(true);
    await request(app.getHttpServer())
      .post(`/equipment/${id}/maintenances`)
      .expect(201);
    const after = await request(app.getHttpServer())
      .get(`/equipment/${id}`)
      .expect(200);
    expect(after.body.hoursSinceMaintenance).toBe(0);
    expect(after.body.requiresMaintenance).toBe(false);
    const history = await request(app.getHttpServer())
      .get(`/equipment/${id}/maintenances`)
      .expect(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].hourMeter).toBe(250);
    const changed = await request(app.getHttpServer())
      .patch(`/equipment/${id}`)
      .send({ type: 'DRILL', hourMeter: 550 })
      .expect(200);
    expect(changed.body.requiresMaintenance).toBe(true);
    const [updateResponse, maintenanceResponse] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/equipment/${id}`)
        .send({ hourMeter: 600 }),
      request(app.getHttpServer()).post(`/equipment/${id}/maintenances`),
    ]);
    expect(updateResponse.status).toBe(200);
    expect(maintenanceResponse.status).toBe(201);
    expect([550, 600]).toContain(maintenanceResponse.body.hourMeter);
    const afterConcurrent = await request(app.getHttpServer())
      .get(`/equipment/${id}`)
      .expect(200);
    expect(afterConcurrent.body.hoursSinceMaintenance).toBe(
      600 - (maintenanceResponse.body.hourMeter as number),
    );
    await request(app.getHttpServer()).delete(`/equipment/${id}`).expect(204);
    const removed = await request(app.getHttpServer())
      .get(`/equipment/${id}`)
      .expect(200);
    expect(removed.body.deletedAt).not.toBeNull();
    await request(app.getHttpServer())
      .patch(`/equipment/${id}`)
      .send({ hourMeter: 700 })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/equipment/${id}/maintenances`)
      .expect(404);
    const oldHistory = await request(app.getHttpServer())
      .get(`/equipment/${id}/maintenances?page=1&limit=1`)
      .expect(200);
    expect(oldHistory.body.data).toHaveLength(1);
    expect(oldHistory.body.total).toBe(2);
    const secondHistory = await request(app.getHttpServer())
      .get(`/equipment/${id}/maintenances?page=2&limit=1`)
      .expect(200);
    expect(secondHistory.body.data).toHaveLength(1);
    expect(secondHistory.body.data[0].id).not.toBe(oldHistory.body.data[0].id);
    await request(app.getHttpServer()).delete(`/equipment/${id}`).expect(404);
    await request(app.getHttpServer())
      .patch(`/equipment/${id}`)
      .send({ deletedAt: null })
      .expect(400);
    const candidates = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/equipment')
          .send({ code, type: 'TRUCK', hourMeter: 0 }),
      ),
    );
    expect(
      candidates.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([201, 409]);
    replacementId = candidates.find((response) => response.status === 201)!.body
      .id as string;
    const newHistory = await request(app.getHttpServer())
      .get(`/equipment/${replacementId}/maintenances`)
      .expect(200);
    expect(newHistory.body.total).toBe(0);
    const page = await request(app.getHttpServer())
      .get('/equipment?page=1&limit=1')
      .expect(200);
    expect(page.body.data).toHaveLength(1);
    await request(app.getHttpServer()).get('/equipment?page=0').expect(400);
    await request(app.getHttpServer()).get('/equipment?limit=101').expect(400);
    expect(await prisma.maintenance.count({ where: { equipmentId: id } })).toBe(
      2,
    );
  });
});
