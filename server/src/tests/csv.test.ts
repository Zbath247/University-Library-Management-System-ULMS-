import { describe, it, expect } from 'vitest';
import { CsvService } from '../modules/csv/csv.service';

describe('CSV Security - Spreadsheet Formula Injection Protection', () => {
  it('should neutralize formula prefixes (=, +, -, @, tab, cr)', () => {
    // Dangerous DDE formula execution payloads
    const formulaPayload = '=cmd|\'/C calc\'!A0';
    const plusPayload = '+1+2';
    const atPayload = '@SUM(A1:A10)';
    const minusPayload = '-100';

    expect(CsvService.sanitizeForCsv(formulaPayload)).toBe(`'=cmd|'/C calc'!A0`);
    expect(CsvService.sanitizeForCsv(plusPayload)).toBe(`'+1+2`);
    expect(CsvService.sanitizeForCsv(atPayload)).toBe(`'@SUM(A1:A10)`);
    expect(CsvService.sanitizeForCsv(minusPayload)).toBe(`'-100`);
  });

  it('should leave normal titles and numbers untouched', () => {
    expect(CsvService.sanitizeForCsv('Introduction to Algorithms')).toBe('Introduction to Algorithms');
    expect(CsvService.sanitizeForCsv('ប្រវត្តិសាស្ត្រខ្មែរ')).toBe('ប្រវត្តិសាស្ត្រខ្មែរ');
    expect(CsvService.sanitizeForCsv(2024)).toBe('2024');
    expect(CsvService.sanitizeForCsv(null)).toBe('');
  });
});

