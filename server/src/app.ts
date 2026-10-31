import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';
import apiRouter from './routes';

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err);
});

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Trust reverse proxies (Render, Vercel, Nginx HTTPS)
app.set('trust proxy', 1);

// CORS configuration supporting authenticated credentials
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [config.CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:3000'];
      if (
        allowed.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Rate limiting (generous for library kiosk / dev usage)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.NODE_ENV === 'production' ? 10000 : 100000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
  },
});
app.use(config.API_PREFIX, apiLimiter);

// Request logger
if (config.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const isProd = config.NODE_ENV === 'production';
app.use(
  session({
    name: 'duc_ulms_sid',
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: config.SESSION_MAX_AGE_MS,
    },
  })
);

// Serve uploaded book cover images statically
const uploadsDir = path.resolve(process.cwd(), 'storage/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(`${config.API_PREFIX}/uploads`, express.static(uploadsDir));

// Mount API routes
app.use(config.API_PREFIX, apiRouter);

// Root informational endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'University Library Management System (ULMS)',
    institution: 'Digital University of Cambodia (សាកលវិទ្យាល័យឌីជីថលកម្ពុជា)',
    version: '1.0.0',
    apiDocs: `${config.API_PREFIX}/health`,
  });
});

// Central 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found on this server' },
  });
});

// Central structured error handler (prevents leaking stack traces to clients)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (config.NODE_ENV === 'development') {
    console.error('Unhandled server error:', err);
  }

  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: config.NODE_ENV === 'production' && status === 500 ? 'An unexpected error occurred' : message,
    },
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`🚀 ULMS Backend Server running on http://localhost:${config.PORT}`);
    console.log(`📡 API Endpoints available at http://localhost:${config.PORT}${config.API_PREFIX}`);
  });
}

export default app;

