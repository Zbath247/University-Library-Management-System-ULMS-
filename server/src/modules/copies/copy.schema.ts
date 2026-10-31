import { z } from 'zod';
import { CopyStatus, CopyCondition } from '../../types/enums';

export const createCopySchema = z.object({
  bookId: z.string().uuid('Valid Book ID is required'),
  accessionNumber: z.string().min(1, 'Accession number is required').trim(),
  barcode: z.string().min(1, 'Barcode is required').trim(),
  callNumber: z.string().optional().nullable(),
  shelfLocation: z.string().min(1, 'Shelf location is required').trim(),
  status: z.nativeEnum(CopyStatus).default(CopyStatus.AVAILABLE),
  condition: z.nativeEnum(CopyCondition).default(CopyCondition.GOOD),
  notes: z.string().optional().nullable(),
});

export const updateCopySchema = z.object({
  callNumber: z.string().optional().nullable(),
  shelfLocation: z.string().optional(),
  status: z.nativeEnum(CopyStatus).optional(),
  condition: z.nativeEnum(CopyCondition).optional(),
  notes: z.string().optional().nullable(),
});

