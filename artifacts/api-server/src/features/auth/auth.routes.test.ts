import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from './auth.routes';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

// Create a dummy error handler that mimics the app's real error handler
const dummyErrorHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
};

describe('Auth API Endpoints', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', authRoutes);
    app.use(dummyErrorHandler);
  });

  describe('POST /auth/register', () => {
    it('should return 400 if validation fails (short password)', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'John',
          email: 'john-short@example.com',
          password: 'short'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 201 when registration succeeds', async () => {
      const email = `valid-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Valid User',
          email: email,
          password: 'StrongPassword123!',
          role: 'user'
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(email);

      // Verify in DB
      const dbUser = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, email)
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(email);
    });
  });

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });
  });
});
