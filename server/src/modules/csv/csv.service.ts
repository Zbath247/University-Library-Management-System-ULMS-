import prisma from '../../db/prisma';

export class CsvService {
  /**
   * Neutralizes potential spreadsheet formula injection (DDE attacks).
   * Any cell starting with =, +, -, @, tab, or CR is prefixed with a single quote.
   */
  static sanitizeForCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str.replace(/"/g, '""')}`;
    }
    return str.replace(/"/g, '""');
  }

  static async exportBooksToCsv(): Promise<string> {
    const books = await prisma.book.findMany({
      include: {
        category: true,
        copies: { orderBy: { accessionNumber: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Book ID',
      'Title (Khmer)',
      'Title (English)',
      'ISBN-13',
      'ISBN-10',
      'Authors',
      'Publisher',
      'Year',
      'Category Code',
      'Category Name',
      'Total Copies',
      'Available Copies',
      'Accession Numbers',
    ];

    const rows: string[] = [headers.join(',')];

    for (const b of books) {
      const totalCopies = b.copies.length;
      const availableCopies = b.copies.filter((c) => c.status === 'AVAILABLE').length;
      const accessionNumbers = b.copies.map((c) => c.accessionNumber).join('; ');

      const authorsStr = typeof b.authors === 'string'
        ? (() => { try { return JSON.parse(b.authors).join(', '); } catch { return b.authors; } })()
        : (b.authors as any).join(', ');

      const row = [
        `"${this.sanitizeForCsv(b.id)}"`,
        `"${this.sanitizeForCsv(b.titleKhmer)}"`,
        `"${this.sanitizeForCsv(b.titleEnglish)}"`,
        `"${this.sanitizeForCsv(b.isbn13)}"`,
        `"${this.sanitizeForCsv(b.isbn10)}"`,
        `"${this.sanitizeForCsv(authorsStr)}"`,
        `"${this.sanitizeForCsv(b.publisher)}"`,
        `"${this.sanitizeForCsv(b.publicationYear)}"`,
        `"${this.sanitizeForCsv(b.category.code)}"`,
        `"${this.sanitizeForCsv(b.category.nameKhmer)}"`,
        `"${totalCopies}"`,
        `"${availableCopies}"`,
        `"${this.sanitizeForCsv(accessionNumbers)}"`,
      ];
      rows.push(row.join(','));
    }

    // Add UTF-8 BOM so Excel opens Khmer characters properly without encoding issues
    return '\uFEFF' + rows.join('\r\n');
  }

  static parseCsvLines(csvContent: string): string[][] {
    const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
    const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rows: string[][] = [];

    for (const line of lines) {
      const row: string[] = [];
      let inQuotes = false;
      let currentField = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());
      rows.push(row);
    }
    return rows;
  }

  static async previewImportBooks(csvContent: string) {
    const rows = this.parseCsvLines(csvContent);
    if (rows.length < 2) {
      throw new Error('CSV file is empty or missing headers');
    }

    const headers = rows[0].map((h) => h.toLowerCase());
    const titleKmIdx = headers.findIndex((h) => h.includes('khmer') || h.includes('ចំណងជើង'));
    const titleEnIdx = headers.findIndex((h) => h.includes('english') || h.includes('title'));
    const isbnIdx = headers.findIndex((h) => h.includes('isbn'));
    const authorIdx = headers.findIndex((h) => h.includes('author'));
    const categoryIdx = headers.findIndex((h) => h.includes('category'));
    const accessionIdx = headers.findIndex((h) => h.includes('accession'));

    const previewItems: any[] = [];
    const errors: string[] = [];

    const categories = await prisma.category.findMany();
    const defaultCategory = categories[0];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const titleKhmer = titleKmIdx >= 0 ? row[titleKmIdx] : row[0] || 'គ្មានចំណងជើង';
      const titleEnglish = titleEnIdx >= 0 ? row[titleEnIdx] : row[1] || titleKhmer;
      const isbn = isbnIdx >= 0 ? row[isbnIdx] : null;
      const authors = authorIdx >= 0 && row[authorIdx] ? row[authorIdx].split(/[,;]/).map((a) => a.trim()) : ['Unknown'];
      const categoryCode = categoryIdx >= 0 ? row[categoryIdx] : null;
      const accessionNumber = accessionIdx >= 0 ? row[accessionIdx] : `DUC-BC-IMP-${Date.now()}-${i}`;

      const matchedCategory = categories.find((c) => c.code.toUpperCase() === categoryCode?.toUpperCase()) || defaultCategory;

      previewItems.push({
        rowNumber: i,
        titleKhmer,
        titleEnglish,
        isbn,
        authors,
        categoryId: matchedCategory?.id,
        categoryName: matchedCategory?.nameKhmer,
        accessionNumber,
      });
    }

    return {
      totalRows: rows.length - 1,
      validRows: previewItems.length,
      previewItems: previewItems.slice(0, 10),
      errors,
    };
  }

  static async commitImportBooks(userId: string, items: any[]) {
    return prisma.$transaction(async (tx) => {
      let createdCount = 0;

      for (const item of items) {
        const book = await tx.book.create({
          data: {
            titleKhmer: item.titleKhmer,
            titleEnglish: item.titleEnglish,
            isbn13: item.isbn ? item.isbn.replace(/[^0-9X]/gi, '') : null,
            authors: JSON.stringify(item.authors),
            categoryId: item.categoryId,
          },
        });

        await tx.bookCopy.create({
          data: {
            bookId: book.id,
            accessionNumber: item.accessionNumber,
            barcode: item.isbn || item.accessionNumber,
            shelfLocation: 'ផ្នែកនាំចូលទូទៅ / General Import',
          },
        });

        createdCount++;
      }

      await tx.importBatch.create({
        data: {
          userId,
          entityType: 'BOOKS',
          originalFilename: 'batch_import.csv',
          totalRows: items.length,
          successRows: createdCount,
          errorRows: 0,
          status: 'COMMITTED',
        },
      });

      return { importedCount: createdCount };
    });
  }
}

