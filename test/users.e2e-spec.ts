import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('CU3: Actualizar detalles de un usuario (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let clientToken: string;
  let clientId: string;

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

    let adminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@parking.com', password: 'Admin1234!' });

    let clientRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'client@parking.com', password: 'Admin1234!' });

    if (!adminRes.body.token || !clientRes.body.token) {
      await request(app.getHttpServer()).post('/api/seed').expect(201);

      adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@parking.com', password: 'Admin1234!' });

      clientRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'client@parking.com', password: 'Admin1234!' });
    }

    adminToken = adminRes.body.token;
    clientToken = clientRes.body.token;

    // obtener el id del cliente
    const usersRes = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    const clientUser = usersRes.body.data.find(
      (u: any) => u.email === 'client@parking.com',
    );
    clientId = clientUser.id;
  });

  afterAll(async () => await app.close());

  it('debe rechazar actualización sin token (401)', async () => {
    await request(app.getHttpServer())
      .put(`/api/users/${clientId}`)
      .send({ name: 'Hacker' })
      .expect(401);
  });

  it('debe rechazar actualización por un cliente (403)', async () => {
    await request(app.getHttpServer())
      .put(`/api/users/${clientId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'Hacker' })
      .expect(403);
  });

  it('debe actualizar el usuario correctamente como admin (200)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/users/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Client', phone: '600123456', roles: ['employee'] })
      .expect(200);
    console.log(res.body);
    expect(res.body.name).toBe('Updated Client');
    expect(res.body.phone).toBe('600123456');
    expect(res.body.email).toBe('client@parking.com');
    expect(res.body.roles).toStrictEqual(['employee']);
  });

  it('debe persistir el cambio al consultar el usuario (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/users/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.name).toBe('Updated Client');
  });
});
