import { Router, Request, Response } from 'express';
import { ReportService } from './report.service';
import { WordReportService } from './wordReport.service';
import { MonthlyReportService } from './monthlyReport.service';
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

// Official DUC Monthly Reading Report JSON Data
router.get('/monthly-reading-data', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || 'តុលា';
    const year = Number(req.query.year) || 2026;
    const mode = (req.query.mode as 'benchmark' | 'live') || 'benchmark';

    const data = await MonthlyReportService.getMonthlyReportData(month, year, mode);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Monthly reading data error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Official DUC Monthly Reading HTML/PDF Print Route (A4 Portrait, Khmer OS Battambang & Moul Light)
router.get('/monthly-reading-html', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || 'តុលា';
    const year = Number(req.query.year) || 2026;
    const mode = (req.query.mode as 'benchmark' | 'live') || 'benchmark';
    const autoPrint = req.query.print === 'true';

    const html = await MonthlyReportService.renderMonthlyReportHtml(month, year, mode, autoPrint);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    console.error('Monthly reading HTML render error:', err);
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

