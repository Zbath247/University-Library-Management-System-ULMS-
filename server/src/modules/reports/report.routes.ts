import { Router, Request, Response } from 'express';
import { ReportService } from './report.service';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';

const router = Router();

router.use(requireRole([Role.LIBRARIAN, Role.ADMIN]));

router.get('/inventory', async (_req: Request, res: Response) => {
  const data = await ReportService.getInventoryReport();
  res.json({ success: true, data });
});

router.get('/circulation', async (_req: Request, res: Response) => {
  const data = await ReportService.getCirculationReport();
  res.json({ success: true, data });
});

export default router;

