import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { BookService } from './book.service';
import { bookQuerySchema, createBookSchema, updateBookSchema } from './book.schema';
import { AuditService } from '../audit/audit.service';

export class BookController {
  static async search(req: Request, res: Response): Promise<void> {
    const parseResult = bookQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    const results = await BookService.searchBooks(parseResult.data);
    res.json({
      success: true,
      data: results.items,
      meta: results.meta,
    });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const book = await BookService.getBookById(id);

    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: book,
    });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const parseResult = createBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    const { categoryId, copiesCount, shelfLocation, ...data } = parseResult.data;
    const finalTitleEnglish = data.titleEnglish || data.titleKhmer;

    const book = await BookService.createBook({
      ...data,
      titleEnglish: finalTitleEnglish,
      category: { connect: { id: categoryId } },
      copiesCount: copiesCount || 1,
      shelfLocation: shelfLocation || 'ជាន់ទី ១, ធ្នើទូទៅ',
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'CREATE_BOOK',
      entity: 'BOOK',
      entityId: book.id,
      newValues: book as any,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: book,
    });
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const parseResult = updateBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    const { categoryId, ...data } = parseResult.data;
    const updateData: any = { ...data };
    if (categoryId) {
      updateData.category = { connect: { id: categoryId } };
    }

    const existingBook = await BookService.getBookById(id);
    if (!existingBook) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Book not found' },
      });
      return;
    }

    const updatedBook = await BookService.updateBook(id, updateData);

    await AuditService.log({
      userId: req.user?.id,
      action: 'UPDATE_BOOK',
      entity: 'BOOK',
      entityId: id,
      oldValues: existingBook as any,
      newValues: updatedBook as any,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: updatedBook,
    });
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const existingBook = await BookService.getBookById(id);
      if (!existingBook) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Book not found' },
        });
        return;
      }

      await BookService.deleteBook(id);

      await AuditService.log({
        userId: req.user?.id,
        action: 'DELETE_BOOK',
        entity: 'BOOK',
        entityId: id,
        oldValues: existingBook as any,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: 'Book successfully deleted',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'CANNOT_DELETE', message: err.message },
      });
    }
  }

  static async clearAll(req: Request, res: Response): Promise<void> {
    const { confirmText } = req.body || {};
    if (confirmText !== 'DELETE' && confirmText !== 'លុបទាំងអស់') {
      res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'សូមវាយពាក្យ DELETE ឬ លុបទាំងអស់ ដើម្បីបញ្ជាក់ការលុបសៀវភៅទាំងអស់!',
        },
      });
      return;
    }

    try {
      const result = await BookService.clearAllBooks();

      await AuditService.log({
        userId: req.user?.id,
        action: 'CLEAR_ALL_BOOKS',
        entity: 'BOOK',
        entityId: 'ALL',
        newValues: { deletedCount: result.deletedCount },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: `បានលុបសៀវភៅទាំងអស់ចំនួន ${result.deletedCount} ក្បាលដោយជោគជ័យ`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'CLEAR_FAILED', message: err.message },
      });
    }
  }

  static async batchDelete(req: Request, res: Response): Promise<void> {
    const { bookIds } = req.body || {};
    if (!Array.isArray(bookIds) || bookIds.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'សូមជ្រើសរើសសៀវភៅដែលត្រូវលុបយ៉ាងតិច ១ ក្បាល / Select at least one book to delete' },
      });
      return;
    }

    try {
      const result = await BookService.batchDeleteBooks(bookIds);

      await AuditService.log({
        userId: req.user?.id,
        action: 'BATCH_DELETE_BOOKS',
        entity: 'BOOK',
        entityId: 'BATCH',
        newValues: { deletedCount: result.deletedCount, bookIds },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: `បានលុបសៀវភៅចំនួន ${result.deletedCount} ក្បាលដោយជោគជ័យ`,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'BATCH_DELETE_FAILED', message: err.message },
      });
    }
  }

  static async uploadCover(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        error: { message: 'សូមជ្រើសរើសឯកសាររូបភាព / Image file is required' },
      });
      return;
    }

    try {
      const uploadsDir = path.resolve(process.cwd(), 'storage/uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const ext = file.mimetype.includes('png')
        ? 'png'
        : file.mimetype.includes('webp')
        ? 'webp'
        : 'jpg';
      const filename = `cover-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, file.buffer);

      const relativeUrl = `/api/v1/uploads/${filename}`;
      res.status(201).json({
        success: true,
        data: {
          filename,
          url: relativeUrl,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { message: err.message || 'Failed to upload cover image' },
      });
    }
  }
}

