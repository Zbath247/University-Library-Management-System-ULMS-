import { z } from 'zod';

export const bookQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  language: z.string().optional(),
  page: z.string().optional().default('1').transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z.string().optional().default('10').transform((val) => Math.min(50, Math.max(1, parseInt(val, 10) || 10))),
  sortBy: z.enum(['titleKhmer', 'titleEnglish', 'publicationYear', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createBookSchema = z.object({
  titleKhmer: z.string().min(1, 'សូមបញ្ចូលចំណងជើងសៀវភៅជាភាសាខ្មែរ').trim(),
  titleEnglish: z.string().optional().nullable().transform((val) => val?.trim() || ''),
  subtitle: z.string().optional().nullable().transform((val) => val?.trim() || null),
  isbn10: z.string().optional().nullable().transform((val) => val?.trim() || null),
  isbn13: z.string().optional().nullable().transform((val) => val?.trim() || null),
  authors: z.array(z.string().min(1)).min(1, 'សូមបញ្ចូលឈ្មោះអ្នកនិពន្ធយ៉ាងតិចម្នាក់'),
  publisher: z.string().optional().nullable().transform((val) => val?.trim() || null),
  publicationYear: z.number().int().min(1000).max(2100).optional().nullable(),
  edition: z.string().optional().nullable().transform((val) => val?.trim() || null),
  language: z.string().default('km'),
  categoryId: z.string().min(1, 'សូមជ្រើសរើសដេប៉ាតឺម៉ង់ ឬជំនាញ'),
  descriptionKhmer: z.string().optional().nullable().transform((val) => val?.trim() || null),
  descriptionEnglish: z.string().optional().nullable().transform((val) => val?.trim() || null),
  coverImageUrl: z.string().optional().nullable().transform((val) => val?.trim() || null),
  copiesCount: z.number().int().min(1).default(1).optional(),
  shelfLocation: z.string().optional().nullable().transform((val) => val?.trim() || null),
});

export const updateBookSchema = createBookSchema.partial();

