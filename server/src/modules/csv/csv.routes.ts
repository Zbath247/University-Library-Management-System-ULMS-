import { Router, Request, Response } from 'express';
import { CsvService } from './csv.service';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireRole([Role.LIBRARIAN, Role.ADMIN]));

// Export catalog to CSV
router.get('/export/books', async (_req: Request, res: Response) => {
  try {
    const csvData = await CsvService.exportBooksToCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="duc_library_catalog_${Date.now()}.csv"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Preview CSV before commit
router.post('/import/preview', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: { message: 'CSV file is required' } });
    return;
  }

  try {
    const csvContent = req.file.buffer.toString('utf-8');
    const preview = await CsvService.previewImportBooks(csvContent);
    res.json({ success: true, data: preview });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Commit batch import
router.post('/import/commit', async (req: Request, res: Response) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: { message: 'Items array is required' } });
    return;
  }

  try {
    const result = await CsvService.commitImportBooks(req.user!.id, items);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

export default router;

