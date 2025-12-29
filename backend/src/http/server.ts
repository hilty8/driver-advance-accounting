import * as http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { createCompanySettingsHandler } from './companySettings';
import { CompanySettingsService } from '../domain/companySettingsService';
import { PrismaCompanyRepository } from '../repositories/prisma/companyRepository';
import { createDefaultDailyBatchHandler } from './dailyBatch';
import { createEarningsImportHandler } from './earningsImport';
import { createPayrollsImportHandler } from './payrollsImport';
import { exportDriverBalancesCsv, exportMonthlyMetricsCsv } from './exports';
import { createDefaultWriteOffHandler } from './writeOff';
import { createBillingPreviewHandler } from './billingPreview';
import { createBillingRunHandler } from './billingRun';
import { createNotificationsListHandler, createNotificationsMarkAllReadHandler } from './notifications';
import { createSlaCheckHandler } from './slaCheck';
import { createStripeCustomerHandler } from './stripeCustomer';
import { createStripeInvoiceFinalizeHandler } from './stripeInvoiceFinalize';
import { createStripeInvoiceSendHandler } from './stripeInvoiceSend';
import { handleStripeWebhook } from './stripeWebhook';
import { createCompanySettingsGetHandler } from './companySettingsGet';
import { createDriverHandler, deleteDriverHandler, updateDriverHandler } from './drivers';
import { createIdRemindHandler, createLoginHandler, createPasswordResetConfirmHandler, createPasswordResetHandler } from './auth';
import { createUserHandler, deleteUserHandler, listUsersHandler, updateUserHandler } from './users';
import { createMailerFromEnv } from '../integrations/smtpMailer';
import {
  createAdvanceApproveHandler,
  createAdvanceMarkPaidHandler,
  createAdvancePayoutInstructHandler,
  createAdvanceRejectHandler,
  createAdvanceRequestHandler
} from './advances';
import { createCollectionOverrideHandler } from './payrolls';
import { createDriverInviteAcceptHandler, createDriverInviteHandler } from './driverInvites';
import { createCompanyOnboardingHandler } from './onboarding';
import { createCompensationLoanHandler } from './compensations';
import { jsonError } from './errors';
import jwt from 'jsonwebtoken';
import { UserRole } from '../domain/types';
import { prisma } from '../repositories/prisma/client';

const parseJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString('utf-8');
  return text.length ? JSON.parse(text) : null;
};

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)));
};

const matchCompanySettings = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'PUT' && method !== 'GET') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/companies\/([^/]+)\/settings$/);
  if (!match) return null;
  return { companyId: match[1], method };
};

const matchDriverCreate = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/drivers') return null;
  return {};
};

const matchDriverUpdate = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'PATCH') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/drivers\/([^/]+)$/);
  if (!match) return null;
  return { driverId: match[1] };
};

const matchDriverDelete = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'DELETE') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/drivers\/([^/]+)$/);
  if (!match) return null;
  return { driverId: match[1] };
};

const matchDailyBatch = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/admin/batch/daily') return null;
  return {};
};

const matchOnboardingCompany = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/onboarding/company') return null;
  return {};
};

const matchDriverInviteCreate = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/drivers\/([^/]+)\/invite$/);
  if (!match) return null;
  return { driverId: match[1] };
};

const matchDriverInviteAccept = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/driver-invitations/accept') return null;
  return {};
};

const matchAdvanceRequest = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/drivers\/([^/]+)\/advances$/);
  if (!match) return null;
  return { driverId: match[1] };
};

const matchAdvanceApprove = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/advances\/([^/]+)\/approve$/);
  if (!match) return null;
  return { advanceId: match[1] };
};

const matchAdvanceReject = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/advances\/([^/]+)\/reject$/);
  if (!match) return null;
  return { advanceId: match[1] };
};

const matchAdvancePayoutInstruct = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/advances\/([^/]+)\/payout-instruct$/);
  if (!match) return null;
  return { advanceId: match[1] };
};

const matchAdvanceMarkPaid = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/advances\/([^/]+)\/mark-paid$/);
  if (!match) return null;
  return { advanceId: match[1] };
};

const matchCollectionOverride = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/payrolls\/([^/]+)\/collection-override$/);
  if (!match) return null;
  return { payrollId: match[1] };
};

const matchCompensationLoan = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/drivers\/([^/]+)\/compensation-loans$/);
  if (!match) return null;
  return { driverId: match[1] };
};

const matchUserCreate = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/users') return null;
  return {};
};

const matchUserList = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'GET') return null;
  const path = url.split('?')[0];
  if (path !== '/users') return null;
  return {};
};

const matchUserUpdate = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'PATCH') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/users\/([^/]+)$/);
  if (!match) return null;
  return { userId: match[1] };
};

const matchUserDelete = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'DELETE') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/users\/([^/]+)$/);
  if (!match) return null;
  return { userId: match[1] };
};

const matchEarningsImport = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/earnings/import') return null;
  return {};
};

const matchPayrollsImport = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/payrolls/import') return null;
  return {};
};

const matchDriverBalancesExport = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'GET') return null;
  const path = url.split('?')[0];
  if (path !== '/exports/driver-balances') return null;
  return {};
};

const matchMonthlyMetricsExport = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'GET') return null;
  const path = url.split('?')[0];
  if (path !== '/exports/monthly-metrics') return null;
  return {};
};

const matchWriteOff = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  const match = path.match(/^\/advances\/([^/]+)\/write-off$/);
  if (!match) return null;
  return { advanceId: match[1] };
};

const matchBillingPreview = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/billing/preview') return null;
  return {};
};

const matchBillingRun = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/billing/run') return null;
  return {};
};

const matchNotificationsList = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/notifications/list') return null;
  return {};
};

const matchNotificationsMarkAllRead = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/notifications/mark-all-read') return null;
  return {};
};

const matchSlaCheck = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/admin/sla/check') return null;
  return {};
};

const matchStripeCustomerCreate = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/stripe/customers') return null;
  return {};
};

const matchStripeInvoiceFinalize = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/stripe/invoices/finalize') return null;
  return {};
};

const matchStripeInvoiceSend = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/stripe/invoices/send') return null;
  return {};
};

const matchStripeWebhook = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/stripe/webhook') return null;
  return {};
};

const matchPasswordReset = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/auth/password/reset') return null;
  return {};
};

const matchLogin = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/auth/login') return null;
  return {};
};

const matchPasswordResetConfirm = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/auth/password/reset/confirm') return null;
  return {};
};

const matchIdRemind = (method: string | undefined, url: string | undefined) => {
  if (!method || !url) return null;
  if (method !== 'POST') return null;
  const path = url.split('?')[0];
  if (path !== '/auth/id/remind') return null;
  return {};
};

const parseTextBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
};

type AuthUser = {
  id: string;
  role: UserRole;
  companyId?: string | null;
  driverId?: string | null;
};

const parseAuthUser = (req: IncomingMessage): AuthUser | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret) as {
      sub: string;
      role: UserRole;
      companyId?: string | null;
      driverId?: string | null;
    };
    return { id: payload.sub, role: payload.role, companyId: payload.companyId, driverId: payload.driverId };
  } catch {
    return null;
  }
};

const requireAuth = (user: AuthUser | null, roles?: UserRole[]) => {
  if (!user) return { status: 401, body: jsonError('unauthorized') };
  if (roles && !roles.includes(user.role)) {
    return { status: 403, body: jsonError('forbidden') };
  }
  return null;
};

const requireCompanyOwnership = (user: AuthUser | null, companyId: string) => {
  if (!user) return { status: 401, body: jsonError('unauthorized') };
  if (user.role === 'company' && user.companyId !== companyId) {
    return { status: 403, body: jsonError('forbidden') };
  }
  if (user.role === 'driver') {
    return { status: 403, body: jsonError('forbidden') };
  }
  return null;
};

const requireDriverAccess = async (user: AuthUser | null, driverId: string) => {
  if (!user) return { status: 401, body: jsonError('unauthorized') };
  if (user.role === 'driver' && user.driverId !== driverId) {
    return { status: 403, body: jsonError('forbidden') };
  }
  if (user.role === 'company') {
    const driver = await prisma.drivers.findUnique({ where: { id: driverId } });
    if (!driver) return { status: 404, body: jsonError('driver not found') };
    if (driver.company_id !== user.companyId) {
      return { status: 403, body: jsonError('forbidden') };
    }
  }
  return null;
};

const requireAdvanceAccess = async (user: AuthUser | null, advanceId: string) => {
  if (!user) return { status: 401, body: jsonError('unauthorized') };
  const advance = await prisma.advances.findUnique({ where: { id: advanceId } });
  if (!advance) return { status: 404, body: jsonError('advance not found') };
  if (user.role === 'company' && advance.company_id !== user.companyId) {
    return { status: 403, body: jsonError('forbidden') };
  }
  if (user.role === 'driver' && advance.driver_id !== user.driverId) {
    return { status: 403, body: jsonError('forbidden') };
  }
  return null;
};

const requirePayrollAccess = async (user: AuthUser | null, payrollId: string) => {
  if (!user) return { status: 401, body: jsonError('unauthorized') };
  const payroll = await prisma.payrolls.findUnique({ where: { id: payrollId } });
  if (!payroll) return { status: 404, body: jsonError('payroll not found') };
  if (user.role === 'company' && payroll.company_id !== user.companyId) {
    return { status: 403, body: jsonError('forbidden') };
  }
  if (user.role === 'driver' && payroll.driver_id !== user.driverId) {
    return { status: 403, body: jsonError('forbidden') };
  }
  return null;
};

export const createServer = () => {
  const companyRepo = new PrismaCompanyRepository();
  const settingsService = new CompanySettingsService(companyRepo);
  const settingsHandler = createCompanySettingsHandler(settingsService);
  const settingsGetHandler = createCompanySettingsGetHandler();
  const dailyBatchHandler = createDefaultDailyBatchHandler();
  const earningsImportHandler = createEarningsImportHandler();
  const payrollsImportHandler = createPayrollsImportHandler();
  const writeOffHandler = createDefaultWriteOffHandler();
  const billingPreviewHandler = createBillingPreviewHandler();
  const billingRunHandler = createBillingRunHandler();
  const notificationsListHandler = createNotificationsListHandler();
  const notificationsMarkAllReadHandler = createNotificationsMarkAllReadHandler();
  const slaCheckHandler = createSlaCheckHandler();
  const stripeCustomerHandler = createStripeCustomerHandler();
  const stripeInvoiceFinalizeHandler = createStripeInvoiceFinalizeHandler();
  const stripeInvoiceSendHandler = createStripeInvoiceSendHandler();
  const driverCreateHandler = createDriverHandler();
  const driverUpdateHandler = updateDriverHandler();
  const driverDeleteHandler = deleteDriverHandler();
  const mailer = createMailerFromEnv() ?? undefined;
  const passwordResetHandler = createPasswordResetHandler(mailer);
  const passwordResetConfirmHandler = createPasswordResetConfirmHandler();
  const idRemindHandler = createIdRemindHandler(mailer);
  const loginHandler = createLoginHandler();
  const userCreateHandler = createUserHandler();
  const userListHandler = listUsersHandler();
  const userUpdateHandler = updateUserHandler();
  const userDeleteHandler = deleteUserHandler();
  const advanceRequestHandler = createAdvanceRequestHandler();
  const advanceApproveHandler = createAdvanceApproveHandler();
  const advanceRejectHandler = createAdvanceRejectHandler();
  const advancePayoutInstructHandler = createAdvancePayoutInstructHandler();
  const advanceMarkPaidHandler = createAdvanceMarkPaidHandler();
  const collectionOverrideHandler = createCollectionOverrideHandler();
  const driverInviteHandler = createDriverInviteHandler(mailer);
  const driverInviteAcceptHandler = createDriverInviteAcceptHandler();
  const companyOnboardingHandler = createCompanyOnboardingHandler();
  const compensationLoanHandler = createCompensationLoanHandler();
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3001';

  return http.createServer(async (req, res) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const authUser = parseAuthUser(req);

      const match = matchCompanySettings(req.method, req.url);
      if (match) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = requireCompanyOwnership(authUser, match.companyId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        if (match.method === 'GET') {
          const url = req.url ? new URL(req.url, 'http://localhost') : null;
          const query = Object.fromEntries(url?.searchParams.entries() ?? []);
          const result = await settingsGetHandler({ companyId: match.companyId, query });
          return sendJson(res, result.status, result.body);
        }
        const body = await parseJsonBody(req);
        const result = await settingsHandler({ companyId: match.companyId, body });
        return sendJson(res, result.status, result.body);
      }

      if (matchDriverCreate(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        if (authUser?.role === 'company' && typeof body === 'object' && body) {
          const companyId = (body as { companyId?: string }).companyId;
          if (companyId && authUser.companyId !== companyId) {
            return sendJson(res, 403, jsonError('forbidden'));
          }
        }
        const result = await driverCreateHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      const driverUpdateMatch = matchDriverUpdate(req.method, req.url);
      if (driverUpdateMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireDriverAccess(authUser, driverUpdateMatch.driverId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await driverUpdateHandler({ driverId: driverUpdateMatch.driverId, body });
        return sendJson(res, result.status, result.body);
      }

      const driverDeleteMatch = matchDriverDelete(req.method, req.url);
      if (driverDeleteMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireDriverAccess(authUser, driverDeleteMatch.driverId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const result = await driverDeleteHandler({ driverId: driverDeleteMatch.driverId, body: null });
        return sendJson(res, result.status, result.body);
      }

      if (matchDailyBatch(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await dailyBatchHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchOnboardingCompany(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await companyOnboardingHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      const driverInviteMatch = matchDriverInviteCreate(req.method, req.url);
      if (driverInviteMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireDriverAccess(authUser, driverInviteMatch.driverId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await driverInviteHandler({ driverId: driverInviteMatch.driverId, body });
        return sendJson(res, result.status, result.body);
      }

      if (matchDriverInviteAccept(req.method, req.url)) {
        const body = await parseJsonBody(req);
        const result = await driverInviteAcceptHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      const advanceRequestMatch = matchAdvanceRequest(req.method, req.url);
      if (advanceRequestMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company', 'driver']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireDriverAccess(authUser, advanceRequestMatch.driverId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await advanceRequestHandler({ driverId: advanceRequestMatch.driverId, body });
        return sendJson(res, result.status, result.body);
      }

      const advanceApproveMatch = matchAdvanceApprove(req.method, req.url);
      if (advanceApproveMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireAdvanceAccess(authUser, advanceApproveMatch.advanceId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await advanceApproveHandler({ advanceId: advanceApproveMatch.advanceId, body });
        return sendJson(res, result.status, result.body);
      }

      const advanceRejectMatch = matchAdvanceReject(req.method, req.url);
      if (advanceRejectMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireAdvanceAccess(authUser, advanceRejectMatch.advanceId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await advanceRejectHandler({ advanceId: advanceRejectMatch.advanceId, body });
        return sendJson(res, result.status, result.body);
      }

      const advancePayoutInstructMatch = matchAdvancePayoutInstruct(req.method, req.url);
      if (advancePayoutInstructMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireAdvanceAccess(authUser, advancePayoutInstructMatch.advanceId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await advancePayoutInstructHandler({ advanceId: advancePayoutInstructMatch.advanceId, body });
        return sendJson(res, result.status, result.body);
      }

      const advanceMarkPaidMatch = matchAdvanceMarkPaid(req.method, req.url);
      if (advanceMarkPaidMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireAdvanceAccess(authUser, advanceMarkPaidMatch.advanceId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await advanceMarkPaidHandler({ advanceId: advanceMarkPaidMatch.advanceId, body });
        return sendJson(res, result.status, result.body);
      }

      const collectionOverrideMatch = matchCollectionOverride(req.method, req.url);
      if (collectionOverrideMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requirePayrollAccess(authUser, collectionOverrideMatch.payrollId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await collectionOverrideHandler({ payrollId: collectionOverrideMatch.payrollId, body });
        return sendJson(res, result.status, result.body);
      }

      const compensationLoanMatch = matchCompensationLoan(req.method, req.url);
      if (compensationLoanMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireDriverAccess(authUser, compensationLoanMatch.driverId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await compensationLoanHandler({ driverId: compensationLoanMatch.driverId, body });
        return sendJson(res, result.status, result.body);
      }

      if (matchUserCreate(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await userCreateHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchUserList(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const url = req.url ? new URL(req.url, 'http://localhost') : null;
        const query = Object.fromEntries(url?.searchParams.entries() ?? []);
        const result = await userListHandler({ query });
        return sendJson(res, result.status, result.body);
      }

      const userUpdateMatch = matchUserUpdate(req.method, req.url);
      if (userUpdateMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await userUpdateHandler({ userId: userUpdateMatch.userId, body });
        return sendJson(res, result.status, result.body);
      }

      const userDeleteMatch = matchUserDelete(req.method, req.url);
      if (userDeleteMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const result = await userDeleteHandler({ userId: userDeleteMatch.userId });
        return sendJson(res, result.status, result.body);
      }

      if (matchEarningsImport(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseTextBody(req);
        const result = await earningsImportHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchPayrollsImport(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseTextBody(req);
        const result = await payrollsImportHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchDriverBalancesExport(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const url = req.url ? new URL(req.url, 'http://localhost') : null;
        const companyId = url?.searchParams.get('companyId') ?? undefined;
        const result = await exportDriverBalancesCsv(companyId ?? undefined);
        res.statusCode = result.status;
        res.setHeader('Content-Type', result.status === 200 ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8');
        res.end(result.body);
        return;
      }

      if (matchMonthlyMetricsExport(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const url = req.url ? new URL(req.url, 'http://localhost') : null;
        const companyId = url?.searchParams.get('companyId') ?? undefined;
        const yearMonth = url?.searchParams.get('yearMonth') ?? undefined;
        const result = await exportMonthlyMetricsCsv(companyId ?? undefined, yearMonth ?? undefined);
        res.statusCode = result.status;
        res.setHeader('Content-Type', result.status === 200 ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8');
        res.end(result.body);
        return;
      }

      const writeOffMatch = matchWriteOff(req.method, req.url);
      if (writeOffMatch) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const ownershipError = await requireAdvanceAccess(authUser, writeOffMatch.advanceId);
        if (ownershipError) return sendJson(res, ownershipError.status, ownershipError.body);
        const body = await parseJsonBody(req);
        const result = await writeOffHandler({ advanceId: writeOffMatch.advanceId, body });
        return sendJson(res, result.status, result.body);
      }

      if (matchBillingPreview(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await billingPreviewHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchBillingRun(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await billingRunHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchNotificationsList(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company', 'driver']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        if (authUser?.role === 'company' && typeof body === 'object' && body) {
          const recipientId = (body as { recipientId?: string }).recipientId;
          if (recipientId && authUser.companyId !== recipientId) {
            return sendJson(res, 403, jsonError('forbidden'));
          }
        }
        if (authUser?.role === 'driver' && typeof body === 'object' && body) {
          const recipientId = (body as { recipientId?: string }).recipientId;
          if (recipientId && authUser.driverId !== recipientId) {
            return sendJson(res, 403, jsonError('forbidden'));
          }
        }
        const result = await notificationsListHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchNotificationsMarkAllRead(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator', 'company', 'driver']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        if (authUser?.role === 'company' && typeof body === 'object' && body) {
          const recipientId = (body as { recipientId?: string }).recipientId;
          if (recipientId && authUser.companyId !== recipientId) {
            return sendJson(res, 403, jsonError('forbidden'));
          }
        }
        if (authUser?.role === 'driver' && typeof body === 'object' && body) {
          const recipientId = (body as { recipientId?: string }).recipientId;
          if (recipientId && authUser.driverId !== recipientId) {
            return sendJson(res, 403, jsonError('forbidden'));
          }
        }
        const result = await notificationsMarkAllReadHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchSlaCheck(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await slaCheckHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchStripeCustomerCreate(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await stripeCustomerHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchStripeInvoiceFinalize(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await stripeInvoiceFinalizeHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchStripeInvoiceSend(req.method, req.url)) {
        const authError = requireAuth(authUser, ['admin', 'operator']);
        if (authError) return sendJson(res, authError.status, authError.body);
        const body = await parseJsonBody(req);
        const result = await stripeInvoiceSendHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchStripeWebhook(req.method, req.url)) {
        const result = await handleStripeWebhook(req);
        res.statusCode = result.status;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(result.body);
        return;
      }

      if (matchPasswordReset(req.method, req.url)) {
        const body = await parseJsonBody(req);
        const result = await passwordResetHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchLogin(req.method, req.url)) {
        const body = await parseJsonBody(req);
        const result = await loginHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchPasswordResetConfirm(req.method, req.url)) {
        const body = await parseJsonBody(req);
        const result = await passwordResetConfirmHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      if (matchIdRemind(req.method, req.url)) {
        const body = await parseJsonBody(req);
        const result = await idRemindHandler({ body });
        return sendJson(res, result.status, result.body);
      }

      return sendJson(res, 404, jsonError('not found'));
    } catch (error) {
      return sendJson(res, 500, jsonError((error as Error).message));
    }
  });
};

export const createApp = () => createServer();

export const startServer = (port: number) => {
  const server = createServer();
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server listening on ${port}`);
  });
  return server;
};
