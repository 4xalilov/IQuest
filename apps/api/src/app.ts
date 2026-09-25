import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { Config } from './config';
import type { Db } from './db/client';
import { users } from './db/schema';
import type { UserRow } from './lib/dto';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import referralRoutes from './routes/referrals';
import iqRoutes from './routes/iq';
import resultRoutes from './routes/results';
import statsRoutes from './routes/stats';
import leaderboardRoutes from './routes/leaderboard';
import paymentRoutes from './routes/payments';
import botRoutes from './routes/bot';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    config: Config;
    /** preHandler: JWT tekshiradi, request.userId ni o'rnatadi. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler: authenticate + ADMIN_TG_IDS tekshiruvi. */
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId: number;
  }
}
declare module '@fastify/jwt' {
  interface FastifyJWT { payload: { uid: number; tg: number }; user: { uid: number; tg: number } }
}

export class HttpError extends Error {
  constructor(public statusCode: number, public code: string, message?: string) { super(message ?? code); }
}

/** Joriy foydalanuvchi qatorini oladi (authenticate'dan keyin). */
export async function currentUser(app: FastifyInstance, req: FastifyRequest): Promise<UserRow> {
  const [u] = await app.db.select().from(users).where(eq(users.id, req.userId));
  if (!u) throw new HttpError(401, 'user_not_found');
  return u;
}

export async function buildApp(opts: { db: Db; config: Config; logger?: boolean }): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, trustProxy: true, bodyLimit: 1_048_576 });
  app.decorate('db', opts.db);
  app.decorate('config', opts.config);
  app.decorateRequest('userId', 0);

  await app.register(cors, {
    origin: opts.config.corsOrigins.length ? opts.config.corsOrigins : true,
    credentials: false,
  });
  await app.register(jwt, { secret: opts.config.jwtSecret, sign: { expiresIn: '30d' } });
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute', allowList: () => opts.config.env === 'test' });

  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const p = await req.jwtVerify<{ uid: number; tg: number }>();
      req.userId = p.uid;
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });
  app.decorate('requireAdmin', async (req: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(req, reply);
    if (reply.sent) return;
    const tg = (req.user as { tg: number }).tg;
    if (!opts.config.adminTgIds.has(String(tg))) return reply.code(403).send({ error: 'forbidden' });
  });

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string; validation?: unknown }, req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: 'validation', issues: err.issues });
    if (err instanceof HttpError) return reply.code(err.statusCode).send({ error: err.code, message: err.message });
    if (err.validation) return reply.code(400).send({ error: 'validation', message: err.message });
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error(err);
    return reply.code(status).send({ error: status >= 500 ? 'internal' : (err.code ?? 'error'), message: status >= 500 ? undefined : err.message });
  });

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(referralRoutes);
  await app.register(iqRoutes);
  await app.register(resultRoutes);
  await app.register(statsRoutes);
  await app.register(leaderboardRoutes);
  await app.register(paymentRoutes);
  await app.register(botRoutes);
  await app.register(adminRoutes);
  await app.register(settingsRoutes);
  await app.register(notificationRoutes);
  return app;
}
