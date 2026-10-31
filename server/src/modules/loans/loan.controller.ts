import { Request, Response } from 'express';
import { LoanService } from './loan.service';
import { issueLoanSchema, returnLoanSchema, renewLoanSchema } from './loan.schema';
import { AuditService } from '../audit/audit.service';

export class LoanController {
  static async issue(req: Request, res: Response): Promise<void> {
    const parseResult = issueLoanSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    try {
      const loan = await LoanService.issueLoan({
        ...parseResult.data,
        issuedByUserId: req.user!.id,
      });

      await AuditService.log({
        userId: req.user?.id,
        action: 'ISSUE_LOAN',
        entity: 'LOAN',
        entityId: loan.id,
        newValues: {
          bookTitle: loan.bookCopy.book.titleKhmer,
          accessionNumber: loan.bookCopy.accessionNumber,
          memberCode: loan.member.memberCode,
          dueDate: loan.dueDate,
        },
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: loan });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async return(req: Request, res: Response): Promise<void> {
    const parseResult = returnLoanSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    try {
      const result = await LoanService.returnLoan({
        ...parseResult.data,
        returnedToUserId: req.user?.id,
      });

      await AuditService.log({
        userId: req.user?.id,
        action: 'RETURN_LOAN',
        entity: 'LOAN',
        entityId: result.loan.id,
        newValues: {
          bookTitle: result.loan.bookCopy.book.titleKhmer,
          accessionNumber: result.loan.bookCopy.accessionNumber,
          memberCode: result.loan.member.memberCode,
          wasOverdue: result.wasOverdue,
        },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: result.wasOverdue ? 'Book returned (Item was overdue)' : 'Book returned successfully',
        data: result.loan,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async renew(req: Request, res: Response): Promise<void> {
    const parseResult = renewLoanSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    try {
      const updated = await LoanService.renewLoan(parseResult.data);

      await AuditService.log({
        userId: req.user?.id,
        action: 'RENEW_LOAN',
        entity: 'LOAN',
        entityId: updated.id,
        newValues: { newDueDate: updated.dueDate, renewalCount: updated.renewalCount },
        ipAddress: req.ip,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async getActive(req: Request, res: Response): Promise<void> {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const q = req.query.q as string | undefined;

    const result = await LoanService.getActiveLoans({ q, page, limit });
    res.json({ success: true, data: result.items, meta: result.meta });
  }

  static async getOverdue(_req: Request, res: Response): Promise<void> {
    const items = await LoanService.getOverdueLoans();
    res.json({ success: true, data: items });
  }
}

