import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CU1: Reservar una plaza (e2e)', () => {
  let app: INestApplication;
  let clientToken: string;
  let reservationId: string;

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

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'client@parking.com', password: 'Admin1234!' });
      
    clientToken = loginRes.body.token;
  });

  afterAll(async () => await app.close());

  it('debe rechazar una reserva sin token (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/reservation')
      .send({
        vehiclePlate: 'TEST001',
        date: '01/09/2026',
        startTime: '10:00',
        endTime: '12:00',
      })
      .expect(401);
  });

  it('debe rechazar datos inválidos (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/reservation')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        vehiclePlate: 'invalid plate!',
        date: '01/09/2026',
        startTime: '10:00',
        endTime: '08:00', // endTime antes que startTime
      })
      .expect(400);
  });

  it('debe crear una reserva correctamente (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/reservation')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        vehiclePlate: 'TEST001',
        date: '01/09/2026',
        startTime: '10:00',
        endTime: '12:00',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('active');
    expect(res.body.spot).toBeDefined();
    expect(res.body.vehiclePlate).toBe('TEST001');

    reservationId = res.body.id;
  });

  it('debe cancelar la reserva creada (200)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/reservation/${reservationId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(res.body.status).toBe('cancelled');
  });
});
