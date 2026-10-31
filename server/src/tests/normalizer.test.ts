import { describe, it, expect } from 'vitest';
import { RegexFallbackNormalizer } from '../modules/scanner/adapters/ai.adapter';
import { extractedBookMetadataSchema } from '../modules/scanner/types';

describe('AI & Regex Fallback Metadata Normalization', () => {
  it('should extract structured fields from sample OCR text without throwing', async () => {
    const normalizer = new RegexFallbackNormalizer();
    const sampleOcr = `
      Structure and Interpretation of Computer Programs
      Second Edition
      Harold Abelson and Gerald Jay Sussman with Julie Sussman
      The MIT Press
      ISBN 978-0-262-51087-5
      Copyright 1996
    `;

    const result = await normalizer.normalizeMetadata(sampleOcr);

    expect(result.metadata.title).toBeDefined();
    expect(result.metadata.isbn13).toBe('9780262510875');
    expect(result.metadata.publicationYear).toBe(1996);
    expect(result.confidence).toBeGreaterThan(0);

    // Validate that the returned object satisfies the Zod schema
    const validated = extractedBookMetadataSchema.safeParse(result.metadata);
    expect(validated.success).toBe(true);
  });

  it('should detect Khmer language text correctly', async () => {
    const normalizer = new RegexFallbackNormalizer();
    const khmerOcr = `
      ប្រវត្តិវិទ្យាប្រទេសកម្ពុជា
      និពន្ធដោយ: សាស្ត្រាចារ្យ ហេង សម្បត្តិ
      បណ្ណាគារជាតិ
      បោះពុម្ពឆ្នាំ ២០២០
      ISBN 978-99950-01-23-4
    `;

    const result = await normalizer.normalizeMetadata(khmerOcr);
    expect(result.metadata.language).toBe('km');
  });
});

