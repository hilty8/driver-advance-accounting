import request from 'supertest';
import { prisma } from '../../src/repositories/prisma/client';
import { hashPassword } from '../../src/domain/passwords';
import { buildApp } from './app';

type CreateUserInput = {
  email: string;
  password?: string;
  role: 'admin' | 'operator' | 'company' | 'driver';
  companyId?: string;
  driverId?: string;
};

export const createUser = async (input: CreateUserInput) => {
  const password = input.password ?? 'secret';
  return prisma.users.create({
    data: {
      email: input.email,
      password_hash: hashPassword(password),
      role: input.role,
      company_id: input.companyId ?? null,
      driver_id: input.driverId ?? null,
      is_active: true
    }
  });
};

export const loginAndGetToken = async (email: string, password: string) => {
  const app = buildApp();
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.token as string;
};
