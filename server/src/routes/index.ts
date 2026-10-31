import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes';
import categoryRouter from '../modules/categories/category.routes';
import bookRouter from '../modules/books/book.routes';
import copyRouter from '../modules/copies/copy.routes';
import memberRouter from '../modules/members/member.routes';
import loanRouter from '../modules/loans/loan.routes';
import scannerRouter from '../modules/scanner/scanner.routes';
import reportRouter from '../modules/reports/report.routes';
import csvRouter from '../modules/csv/csv.routes';
import attendanceRouter from '../modules/attendance/attendance.routes';
import settingsRouter from '../modules/settings/settings.routes';
import { AuditService } from '../modules/audit/audit.service';
import { requireRole } from '../middleware/auth';
import { Role } from '../types/enums';
import prisma from '../db/prisma';

const router = Router();

// Health check endpoint
router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      institution: 'Digital University of Cambodia (សាកលវិទ្យាល័យឌីជីថលកម្ពុជា)',
      database: 'connected',
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message,
    });
  }
});

// Audit logs query endpoint (Admin only)
router.get('/audit-logs', requireRole([Role.ADMIN]), async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
  const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
  const entity = req.query.entity as string | undefined;

  const result = await AuditService.getLogs(limit, offset, entity);
  res.json({ success: true, data: result.logs, meta: { total: result.total, limit, offset } });
});

// Modular subroutes
router.use('/auth', authRouter);
router.use('/categories', categoryRouter);
router.use('/books', bookRouter);
router.use('/copies', copyRouter);
router.use('/members', memberRouter);
router.use('/loans', loanRouter);
router.use('/scan-sessions', scannerRouter);
router.use('/reports', reportRouter);
router.use('/csv', csvRouter);
router.use('/attendance', attendanceRouter);
router.use('/settings', settingsRouter);

export default router;

