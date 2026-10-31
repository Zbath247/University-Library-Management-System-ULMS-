import { Request, Response } from 'express';
import { ScannerService } from './scanner.service';
import { ScanImageType, CopyCondition } from '../../types/enums';
import { AuditService } from '../audit/audit.service';
import { z } from 'zod';

const approveSchema = z.object({
  mode: z.enum(['NEW_TITLE', 'ADD_COPY_TO_EXISTING']),
  existingBookId: z.string().uuid().optional(),
  bookData: z.object({
    titleKhmer: z.string().min(1, 'Khmer title is required'),
    titleEnglish: z.string().min(1, 'English title is required'),
    subtitle: z.string().optional().nullable(),
    isbn10: z.string().optional().nullable(),
    isbn13: z.string().optional().nullable(),
    authors: z.array(z.string().min(1)).min(1),
    publisher: z.string().optional().nullable(),
    publicationYear: z.number().int().optional().nullable(),
    edition: z.string().optional().nullable(),
    language: z.string().default('km'),
    categoryId: z.string().uuid(),
    descriptionKhmer: z.string().optional().nullable(),
    descriptionEnglish: z.string().optional().nullable(),
    coverImageUrl: z.string().optional().nullable(),
  }),
  copyData: z.object({
    accessionNumber: z.string().min(1, 'Accession number is required'),
    barcode: z.string().min(1, 'Barcode is required'),
    shelfLocation: z.string().min(1, 'Shelf location is required'),
    callNumber: z.string().optional().nullable(),
    condition: z.nativeEnum(CopyCondition).optional(),
  }),
});

export class ScannerController {
  static async createSession(req: Request, res: Response): Promise<void> {
    const session = await ScannerService.createSession(req.user!.id);
    res.status(201).json({ success: true, data: session });
  }

  static async uploadImage(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: { message: 'Image file is required' } });
      return;
    }

    const imageType = (req.body.imageType || 'COVER') as ScanImageType;
    if (!['COVER', 'TITLE_PAGE', 'COPYRIGHT_PAGE'].includes(imageType)) {
      res.status(400).json({ success: false, error: { message: 'Invalid imageType' } });
      return;
    }

    try {
      const image = await ScannerService.addImage({
        sessionId: id,
        imageType,
        buffer: file.buffer,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
      });

      res.status(201).json({ success: true, data: image });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async rotateImage(req: Request, res: Response): Promise<void> {
    const { id, imageId } = req.params;
    const degrees = parseInt(req.body.degrees || '90', 10);

    try {
      const updated = await ScannerService.rotateImage(id, imageId, degrees);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async streamImage(req: Request, res: Response): Promise<void> {
    const { id, imageId } = req.params;
    try {
      const fileData = await ScannerService.getImageStream(id, imageId);
      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Length', fileData.fileSizeBytes);
      fileData.stream.pipe(res);
    } catch (err: any) {
      res.status(404).json({ success: false, error: { message: err.message } });
    }
  }

  static async processOcr(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const session = await ScannerService.processOcrAndAi(id);
      res.json({ success: true, data: session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async getReview(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const reviewData = await ScannerService.getReviewDesk(id);
      res.json({ success: true, data: reviewData });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async approve(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const parseResult = approveSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    try {
      const result = await ScannerService.approveAndSaveCatalog({
        sessionId: id,
        ...parseResult.data,
      });

      await AuditService.log({
        userId: req.user?.id,
        action: 'APPROVE_SCAN_CATALOG',
        entity: 'BOOK_SCAN_SESSION',
        entityId: id,
        newValues: {
          bookTitle: result.book?.titleKhmer,
          accessionNumber: result.copy?.accessionNumber,
          mode: parseResult.data.mode,
        },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: result.alreadySaved
          ? 'Session was already committed previously (Idempotent response)'
          : 'Catalog record and physical copy created successfully',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async cancel(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    await ScannerService.cancelSession(id);
    res.json({ success: true, message: 'Scan session cancelled and temporary files removed' });
  }
}

