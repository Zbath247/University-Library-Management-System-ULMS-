import { Router, Request, Response } from 'express';
import { ReportService } from './report.service';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';

const router = Router();

// High-level visual analytics and inventory (accessible to all roles / kiosk)
router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const data = await ReportService.getAnalyticsReport();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

router.get('/inventory', async (_req: Request, res: Response) => {
  try {
    const data = await ReportService.getInventoryReport();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Detailed member circulation reports (Librarian & Admin only)
router.use(requireRole([Role.LIBRARIAN, Role.ADMIN]));

router.get('/circulation', async (_req: Request, res: Response) => {
  const data = await ReportService.getCirculationReport();
  res.json({ success: true, data });
});

export default router;

