import { prisma } from '../../src/repositories/prisma/client';

export const createCompany = async (name = 'Test Company') => {
  return prisma.companies.create({
    data: {
      name,
      limit_rate: 0.8,
      fee_rate: 0.05,
      payout_day: 25,
      payout_day_is_month_end: false,
      payout_offset_months: 2,
      allow_advance_over_salary: false,
      is_active: true
    }
  });
};

export const createDriver = async (companyId: string, email = 'driver@example.com') => {
  return prisma.drivers.create({
    data: {
      company_id: companyId,
      name: 'Test Driver',
      email,
      is_active: true
    }
  });
};

export const createAdvance = async (driverId: string, companyId: string, amount = 100000n) => {
  return prisma.advances.create({
    data: {
      driver_id: driverId,
      company_id: companyId,
      requested_amount: amount,
      requested_at: new Date(),
      status: 'requested'
    }
  });
};

export const createPayroll = async (driverId: string, companyId: string, payoutDate: Date) => {
  return prisma.payrolls.create({
    data: {
      driver_id: driverId,
      company_id: companyId,
      payout_date: payoutDate,
      gross_salary_amount: 200000n,
      advance_collection_amount: 0n,
      status: 'planned'
    }
  });
};
