import { Request, Response } from 'express';
import { ScannerService } from './scanner.service';
import { ScanImageType, CopyCondition } from '../../types/enums';
import { AuditService } from '../audit/audit.service';
import prisma from '../../db/prisma';
import { z } from 'zod';

const approveSchema = z.object({
  mode: z.enum(['NEW_TITLE', 'ADD_COPY_TO_EXISTING']),
  existingBookId: z.string().uuid().optional().nullable(),
  bookData: z.object({
    titleKhmer: z.string().optional().default(''),
    titleEnglish: z.string().optional().default(''),
    subtitle: z.string().optional().nullable(),
    isbn10: z.string().optional().nullable(),
    isbn13: z.string().optional().nullable(),
    authors: z.array(z.string()).default([]),
    publisher: z.string().optional().nullable(),
    publicationYear: z.number().int().optional().nullable(),
    edition: z.string().optional().nullable(),
    language: z.string().default('km'),
    categoryId: z.string().optional().nullable(),
    descriptionKhmer: z.string().optional().nullable(),
    descriptionEnglish: z.string().optional().nullable(),
    coverImageUrl: z.string().optional().nullable(),
  }).optional().default({}),
  copyData: z.object({
    accessionNumber: z.string().min(1, 'Accession number is required'),
    barcode: z.string().optional().default(''),
    shelfLocation: z.string().optional().default('ទូទី ១, ជាន់ A-01'),
    callNumber: z.string().optional().nullable(),
    condition: z.nativeEnum(CopyCondition).optional(),
    copyCount: z.number().int().min(1).max(100).default(1),
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
    const skipAi = req.query.skipAi === 'true' || req.body?.skipAi === true;
    const manualOnly = req.query.manualOnly === 'true' || req.body?.manualOnly === true;
    try {
      const session = await ScannerService.processOcrAndAi(id, { skipAi, manualOnly });
      res.json({ success: true, data: session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async lookupIsbnDirect(req: Request, res: Response): Promise<void> {
    const { isbn } = req.params;
    try {
      const result = await ScannerService.lookupDirectIsbn(isbn);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
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
      const errorMsg = parseResult.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: errorMsg, details: parseResult.error.errors },
      });
      return;
    }

    try {
      const data = parseResult.data;

      // Validation depending on mode (with auto-fallback to NEW_TITLE if no existing book is supplied)
      let effectiveMode = data.mode;
      if (effectiveMode === 'ADD_COPY_TO_EXISTING' && !data.existingBookId) {
        effectiveMode = 'NEW_TITLE';
      }

      let categoryId = data.bookData?.categoryId;
      if (effectiveMode === 'NEW_TITLE') {
        const titleKhmer = data.bookData?.titleKhmer?.trim();
        const titleEnglish = data.bookData?.titleEnglish?.trim();
        if (!titleKhmer && !titleEnglish) {
          res.status(400).json({ success: false, error: { message: 'សូមបញ្ចូលចំណងជើងសៀវភៅជាមុនសិន' } });
          return;
        }
        if (!categoryId) {
          const fallbackCat = (await prisma.category.findFirst({
            where: { parentId: { not: null } },
          })) || (await prisma.category.findFirst());
          if (fallbackCat) {
            categoryId = fallbackCat.id;
          } else {
            res.status(400).json({ success: false, error: { message: 'សូមជ្រើសរើសមហាវិទ្យាល័យ / ដេប៉ាតឺម៉ង់ (Category)' } });
            return;
          }
        }
      }

      const cleanBookData = {
        titleKhmer: data.bookData?.titleKhmer?.trim() || data.bookData?.titleEnglish?.trim() || 'Untitled Book',
        titleEnglish: data.bookData?.titleEnglish?.trim() || data.bookData?.titleKhmer?.trim() || 'Untitled Book',
        subtitle: data.bookData?.subtitle || null,
        isbn10: data.bookData?.isbn10 || null,
        isbn13: data.bookData?.isbn13 || null,
        authors: data.bookData?.authors?.length ? data.bookData.authors : ['មិនស្គាល់ (Unknown)'],
        publisher: data.bookData?.publisher || null,
        publicationYear: data.bookData?.publicationYear || null,
        edition: data.bookData?.edition || null,
        language: data.bookData?.language || 'km',
        categoryId: categoryId || data.bookData?.categoryId || '',
        descriptionKhmer: data.bookData?.descriptionKhmer || null,
        descriptionEnglish: data.bookData?.descriptionEnglish || null,
        coverImageUrl: data.bookData?.coverImageUrl || null,
      };
      const cleanCopyData = {
        ...data.copyData,
        barcode: data.copyData.barcode?.trim() || data.copyData.accessionNumber.trim(),
        shelfLocation: data.copyData.shelfLocation?.trim() || 'ទូទី ១, ជាន់ A-01',
      };

      const result = await ScannerService.approveAndSaveCatalog({
        sessionId: id,
        mode: effectiveMode,
        existingBookId: effectiveMode === 'ADD_COPY_TO_EXISTING' ? (data.existingBookId || undefined) : undefined,
        bookData: cleanBookData,
        copyData: cleanCopyData,
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

