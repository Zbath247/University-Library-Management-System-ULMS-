import { Router, Request, Response } from 'express';
import { ReportService } from './report.service';
import { WordReportService } from './wordReport.service';
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

router.get('/executive-reading', async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || 2025;
    const data = await ReportService.getExecutiveReadingReport(year);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Official DUC Monthly Reading Word (.docx) Export Route
router.get('/monthly-reading-word', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || 'តុលា';
    const year = Number(req.query.year) || 2026;
    const mode = (req.query.mode as 'benchmark' | 'live') || 'benchmark';

    const buffer = await WordReportService.generateMonthlyReadingDocx(month, year, mode);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DUC_Library_Monthly_Report_${encodeURIComponent(month)}_${year}.docx"`
    );
    res.send(buffer);
  } catch (err: any) {
    console.error('Word report export error:', err);
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

