import { z } from 'zod';

export interface OcrBlock {
  text: string;
  confidence: number | null;
}

export interface OcrResult {
  rawText: string;
  confidence: number | null; // Null if not calculated, never fabricated
  blocks?: OcrBlock[];
}

export interface IOcrAdapter {
  extractText(imageBuffer: Buffer, mimeType: string, languages: string[]): Promise<OcrResult>;
}

export const extractedBookMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional().nullable(),
  authors: z.array(z.string()).min(1, 'At least one author is required'),
  isbn10: z.string().optional().nullable(),
  isbn13: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publicationYear: z.number().int().optional().nullable(),
  edition: z.string().optional().nullable(),
  language: z.string().default('km'),
  categorySuggestion: z.string().optional().nullable(),
  series: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type ExtractedBookMetadata = z.infer<typeof extractedBookMetadataSchema>;

export interface IAiNormalizer {
  normalizeMetadata(ocrText: string): Promise<{
    metadata: ExtractedBookMetadata;
    confidence: number | null;
    rawResponse?: string;
  }>;
}

export interface ExternalBookCandidate {
  provider: 'GOOGLE_BOOKS' | 'OPEN_LIBRARY';
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher?: string | null;
  publicationYear?: number | null;
  isbn10?: string | null;
  isbn13?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
  rawJson?: any;
}

