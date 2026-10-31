import { Request, Response } from 'express';
import { CopyService } from './copy.service';
import { createCopySchema, updateCopySchema } from './copy.schema';
import { AuditService } from '../audit/audit.service';

export class CopyController {
  static async listByBook(req: Request, res: Response): Promise<void> {
    const { bookId } = req.params;
    const copies = await CopyService.getCopiesByBookId(bookId);
    res.json({ success: true, data: copies });
  }

  static async lookup(req: Request, res: Response): Promise<void> {
    const { identifier } = req.params;
    const copy = await CopyService.getCopyByIdOrIdentifier(identifier);
    if (!copy) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Physical copy not found' },
      });
      return;
    }
    res.json({ success: true, data: copy });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const parseResult = createCopySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    const { bookId, ...copyData } = parseResult.data;

    try {
      const copy = await CopyService.createCopy({
        ...copyData,
        book: { connect: { id: bookId } },
      } as any);

      await AuditService.log({
        userId: req.user?.id,
        action: 'CREATE_BOOK_COPY',
        entity: 'BOOK_COPY',
        entityId: copy.id,
        newValues: copy as any,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: copy });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_IDENTIFIER',
            message: 'Accession number or barcode is already registered to another copy.',
          },
        });
        return;
      }
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { copyId } = req.params;
    const parseResult = updateCopySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    try {
      const existing = await CopyService.getCopyByIdOrIdentifier(copyId);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Physical copy not found' },
        });
        return;
      }

      const updated = await CopyService.updateCopy(copyId, parseResult.data as any);

      await AuditService.log({
        userId: req.user?.id,
        action: 'UPDATE_BOOK_COPY',
        entity: 'BOOK_COPY',
        entityId: copyId,
        oldValues: existing as any,
        newValues: updated as any,
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const { copyId } = req.params;
    try {
      const existing = await CopyService.getCopyByIdOrIdentifier(copyId);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Physical copy not found' },
        });
        return;
      }

      await CopyService.deleteCopy(copyId);

      await AuditService.log({
        userId: req.user?.id,
        action: 'DELETE_BOOK_COPY',
        entity: 'BOOK_COPY',
        entityId: copyId,
        oldValues: existing as any,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Physical copy deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }
}

