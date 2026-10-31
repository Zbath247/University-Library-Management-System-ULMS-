import prisma from '../../../db/prisma';

export interface DuplicateCheckParams {
  isbn10?: string | null;
  isbn13?: string | null;
  title: string;
  authors: string[];
}

export class DuplicateService {
  static async findPotentialDuplicates(params: DuplicateCheckParams) {
    const { isbn10, isbn13, title, authors } = params;

    // 1. Exact ISBN match
    if (isbn13 || isbn10) {
      const isbnMatch = await prisma.book.findFirst({
        where: {
          OR: [
            isbn13 ? { isbn13 } : {},
            isbn10 ? { isbn10 } : {},
          ].filter((o) => Object.keys(o).length > 0),
        },
        include: {
          category: true,
          copies: { select: { id: true, accessionNumber: true, status: true } },
        },
      });

      if (isbnMatch) {
        return {
          isDuplicate: true,
          matchType: 'EXACT_ISBN' as const,
          matchedBook: isbnMatch,
          message: `An exact match was found with ISBN ${isbn13 || isbn10}. You can add another physical copy instead of creating a duplicate title.`,
        };
      }
    }

    // 2. Title & Author match
    const normalizedTitle = title.trim().toLowerCase();
    const booksWithSimilarTitle = await prisma.book.findMany({
      where: {
        OR: [
          { titleEnglish: { contains: normalizedTitle } },
          { titleKhmer: { contains: normalizedTitle } },
        ],
      },
      include: {
        category: true,
        copies: { select: { id: true, accessionNumber: true, status: true } },
      },
    });

    for (const book of booksWithSimilarTitle) {
      const bookAuthors: string[] = typeof book.authors === 'string'
        ? (() => { try { return JSON.parse(book.authors); } catch { return [book.authors]; } })()
        : book.authors;

      const authorOverlap = bookAuthors.some((author) =>
        authors.some((a) => a.toLowerCase().includes(author.toLowerCase()) || author.toLowerCase().includes(a.toLowerCase()))
      );

      if (authorOverlap) {
        return {
          isDuplicate: true,
          matchType: 'TITLE_AND_AUTHOR' as const,
          matchedBook: book,
          message: `A book with matching title "${book.titleEnglish}" and author was found. You can add another physical copy to this title.`,
        };
      }
    }

    return {
      isDuplicate: false,
      matchType: null,
      matchedBook: null,
      message: 'No duplicate records found in the library catalog.',
    };
  }
}

