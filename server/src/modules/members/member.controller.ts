import { Request, Response } from 'express';
import { MemberService } from './member.service';
import { memberQuerySchema, createMemberSchema, updateMemberSchema } from './member.schema';
import { AuditService } from '../audit/audit.service';

export class MemberController {
  static async search(req: Request, res: Response): Promise<void> {
    const parseResult = memberQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    const result = await MemberService.searchMembers(parseResult.data as any);
    res.json({ success: true, data: result.items, meta: result.meta });
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const member = await MemberService.getMemberById(id);
    if (!member) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
      return;
    }
    res.json({ success: true, data: member });
  }

  static async lookupByCode(req: Request, res: Response): Promise<void> {
    const { code } = req.params;
    const member = await MemberService.getMemberByCode(code);
    if (!member) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
      return;
    }
    res.json({ success: true, data: member });
  }

  static async create(req: Request, res: Response): Promise<void> {
    const parseResult = createMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    try {
      const member = await MemberService.createMember(parseResult.data as any);

      await AuditService.log({
        userId: req.user?.id,
        action: 'CREATE_MEMBER',
        entity: 'MEMBER',
        entityId: member.id,
        newValues: member as any,
        ipAddress: req.ip,
      });

      res.status(201).json({ success: true, data: member });
    } catch (err: any) {
      if (err.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_MEMBER', message: 'Member code or email is already in use.' },
        });
        return;
      }
      res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const parseResult = updateMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
      });
      return;
    }

    try {
      const existing = await MemberService.getMemberById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
        return;
      }

      const updated = await MemberService.updateMember(id, parseResult.data as any);

      await AuditService.log({
        userId: req.user?.id,
        action: 'UPDATE_MEMBER',
        entity: 'MEMBER',
        entityId: id,
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
    const { id } = req.params;
    try {
      const existing = await MemberService.getMemberById(id);
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
        return;
      }

      await MemberService.deleteMember(id);

      await AuditService.log({
        userId: req.user?.id,
        action: 'DELETE_MEMBER',
        entity: 'MEMBER',
        entityId: id,
        oldValues: existing as any,
        ipAddress: req.ip,
      });

      res.json({ success: true, message: 'Member deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message } });
    }
  }

  static async batchDelete(req: Request, res: Response): Promise<void> {
    const { memberIds } = req.body || {};
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'សូមជ្រើសរើសសមាជិកដែលត្រូវលុបយ៉ាងតិច ១ នាក់ / Select at least one member to delete' },
      });
      return;
    }

    try {
      const result = await MemberService.batchDeleteMembers(memberIds);

      await AuditService.log({
        userId: req.user?.id,
        action: 'BATCH_DELETE_MEMBERS',
        entity: 'MEMBER',
        entityId: 'BATCH',
        newValues: { deletedCount: result.deletedCount, memberIds },
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        message: `បានលុបសមាជិកចំនួន ${result.deletedCount} នាក់ដោយជោគជ័យ`,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { message: err.message },
      });
    }
  }
}

