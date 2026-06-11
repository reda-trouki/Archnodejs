import path from 'path';
import { writeFile } from '../../utils/file';

export const generateExpressTemplate = async (projectPath: string): Promise<void> => {
  // App factory
  await writeFile(
    path.join(projectPath, 'src', 'presentation', 'http', 'app.ts'),
    `import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppError } from '@/shared/errors/AppError';

export const createApp = (): Application => {
  const app = express();

  // ── Middleware ────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Health Check ──────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Routes ────────────────────────────────────────────────────
  // import { userRouter } from './routes/user.routes';
  // app.use('/api/users', userRouter(container.userController));

  // ── 404 Handler ───────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  // ── Error Handler ─────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
      });
    }
    console.error('[Unhandled Error]', err);
    return res.status(500).json({ message: 'Internal server error' });
  });

  return app;
};
`
  );

  // Request validation middleware
  await writeFile(
    path.join(projectPath, 'src', 'presentation', 'http', 'middlewares', 'validate.middleware.ts'),
    `import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@/shared/errors/AppError';

type Schema = { parse: (data: unknown) => unknown };

/**
 * Generic request validation middleware.
 * Pass a Zod/Yup schema to validate req.body, req.params, or req.query.
 */
export const validate = (
  schema: Schema,
  source: 'body' | 'params' | 'query' = 'body'
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req[source]);
      next();
    } catch (err: any) {
      next(new ValidationError(err.message ?? 'Validation failed'));
    }
  };
};
`
  );

  // Auth middleware stub
  await writeFile(
    path.join(projectPath, 'src', 'presentation', 'http', 'middlewares', 'auth.middleware.ts'),
    `import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '@/shared/errors/AppError';

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new UnauthorizedError());

  // TODO: Verify JWT token here
  // const payload = verifyToken(token);
  // (req as any).user = payload;

  next();
};
`
  );
};
