import { z } from 'zod';

export const issueLoanSchema = z.object({
  bookCopyIdentifier: z.string().min(1, 'Accession number, barcode, or copy ID is required').trim(),
  memberIdentifier: z.string().min(1, 'Member code or ID is required').trim(),
  dueDays: z.number().int().min(1).max(90).optional(),
  notes: z.string().optional().nullable(),
});

export const returnLoanSchema = z.object({
  bookCopyIdentifier: z.string().min(1, 'Accession number, barcode, or copy ID is required').trim(),
  notes: z.string().optional().nullable(),
});

export const renewLoanSchema = z.object({
  loanId: z.string().uuid('Valid loan ID is required'),
  additionalDays: z.number().int().min(1).max(30).default(14),
});

