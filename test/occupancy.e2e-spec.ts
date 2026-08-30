import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CU2: Consultar ocupación del parking (e2e)', () => {
  let app: INestApplication;
  let employeeToken: string;
  let clientToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    await request(app.getHttpServer()).post('/api/seed').expect(201);

    const empRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'employee@parking.com', password: 'Admin1234!' });

    const clientRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'client@parking.com', password: 'Admin1234!' });
    employeeToken = empRes.body.token;
    clientToken = clientRes.body.token;
  });

  afterAll(async () => await app.close());

  it('debe rechazar acceso sin token (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/parking-spot/occupancy')
      .expect(401);
  });

  it('debe rechazar acceso a clientes (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/parking-spot/occupancy')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });

  it('debe devolver la ocupación correctamente para empleados (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/parking-spot/occupancy')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(res.body.total).toBeDefined();
    expect(res.body.occupied).toBeDefined();
    expect(res.body.available).toBeDefined();
    expect(res.body.occupancyRate).toBeDefined();
    expect(res.body.spots).toBeInstanceOf(Array);
    expect(res.body.total).toBe(20); // seed crea 20 plazas
    expect(res.body.occupied).toBe(0); // sin reservas activas ahora mismo
  });
});
