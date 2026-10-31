import { describe, it, expect } from 'vitest';
import { IsbnUtils } from '../modules/scanner/utils/isbn.utils';

describe('IsbnUtils - Checksum Verification and Extraction', () => {
  it('should validate valid ISBN-10 numbers correctly', () => {
    expect(IsbnUtils.isValidIsbn10('026204630X')).toBe(true);
    expect(IsbnUtils.isValidIsbn10('0-262-04630-X')).toBe(true);
    expect(IsbnUtils.isValidIsbn10('0132350882')).toBe(true); // Clean Code
  });

  it('should reject invalid ISBN-10 numbers', () => {
    expect(IsbnUtils.isValidIsbn10('0262046301')).toBe(false); // wrong check digit
    expect(IsbnUtils.isValidIsbn10('12345')).toBe(false);
    expect(IsbnUtils.isValidIsbn10('ABCDEFGHIJ')).toBe(false);
  });

  it('should validate valid ISBN-13 numbers correctly', () => {
    expect(IsbnUtils.isValidIsbn13('9780262046305')).toBe(true); // CLRS
    expect(IsbnUtils.isValidIsbn13('978-0-262-04630-5')).toBe(true);
    expect(IsbnUtils.isValidIsbn13('9780132350884')).toBe(true); // Clean Code
  });

  it('should reject invalid ISBN-13 numbers', () => {
    expect(IsbnUtils.isValidIsbn13('9780262046300')).toBe(false); // wrong check digit
    expect(IsbnUtils.isValidIsbn13('978026204630')).toBe(false);
  });

  it('should extract valid ISBNs from messy OCR text', () => {
    const rawOcr = `
      THE ART OF COMPUTER PROGRAMMING
      Donald E. Knuth
      Addison-Wesley Professional
      ISBN-13: 978-0-201-89683-1
      ISBN-10: 0-201-89683-4
      Manufactured in the United States
    `;

    const extracted = IsbnUtils.extractIsbnsFromText(rawOcr);
    expect(extracted).toContain('9780201896831');
    expect(extracted).toContain('0201896834');
    expect(extracted.length).toBe(2);
  });
});

