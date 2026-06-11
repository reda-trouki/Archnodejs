import path from 'path';
import { writeFile } from '../../utils/file';

export const generateFastifyTemplate = async (projectPath: string): Promise<void> => {
  await writeFile(
    path.join(projectPath, 'src', 'presentation', 'http', 'app.ts'),
    `import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { AppError } from '@/shared/errors/AppError';

export const createApp = async (): Promise<FastifyInstance> => {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // ── Plugins ───────────────────────────────────────────────────
  await fastify.register(cors, { origin: process.env.CORS_ORIGIN ?? '*' });
  await fastify.register(helmet);

  // ── Health Check ──────────────────────────────────────────────
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // ── Routes ────────────────────────────────────────────────────
  // fastify.register(userRoutes, { prefix: '/api/users' });

  // ── Error Handler ─────────────────────────────────────────────
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
      });
      return;
    }
    fastify.log.error(error);
    reply.status(500).send({ message: 'Internal server error' });
  });

  return fastify;
};
`
  );

  await writeFile(
    path.join(projectPath, 'src', 'presentation', 'http', 'middlewares', 'auth.middleware.ts'),
    `import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../../../shared/errors/AppError';

export const authHook = async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError();

  // TODO: Verify JWT token here
  // (request as any).user = verifyToken(token);
};
`
  );
};
