import { Request, Response, Router } from 'express';
import prisma from '../../db/prisma';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';

const router = Router();

const categorySchema = z.object({
  nameKhmer: z.string().min(1, 'Khmer name is required'),
  nameEnglish: z.string().min(1, 'English name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase().trim(),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

// GET /api/v1/categories - Public search & browse
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { nameKhmer: 'asc' },
      include: {
        _count: { select: { books: true } },
        parent: true,
        children: true,
      },
    });
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// POST /api/v1/categories - Admin only
router.post('/', requireRole([Role.ADMIN]), async (req: Request, res: Response) => {
  const parseResult = categorySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', details: parseResult.error.errors },
    });
    return;
  }

  const existing = await prisma.category.findUnique({
    where: { code: parseResult.data.code },
  });
  if (existing) {
    res.status(409).json({
      success: false,
      error: { code: 'CATEGORY_EXISTS', message: 'Category code already exists' },
    });
    return;
  }

  const category = await prisma.category.create({
    data: parseResult.data,
  });

  await AuditService.log({
    userId: req.user?.id,
    action: 'CREATE_CATEGORY',
    entity: 'CATEGORY',
    entityId: category.id,
    newValues: category as any,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: category });
});

export default router;

