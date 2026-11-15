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
    if (app) await app.close();
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
    expect(history.body).toHaveLength(1);
    expect(history.body[0].hourMeter).toBe(250);
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
    await request(app.getHttpServer()).get(`/equipment/${id}`).expect(404);
    await request(app.getHttpServer())
      .post(`/equipment/${id}/maintenances`)
      .expect(404);
    await request(app.getHttpServer())
      .post('/equipment')
      .send({ code, type: 'TRUCK', hourMeter: 0 })
      .expect(409);
    expect(await prisma.maintenance.count({ where: { equipmentId: id } })).toBe(
      2,
    );
  });
});
