import prisma from '../../../db/prisma';
import { IsbnUtils } from '../utils/isbn.utils';

export interface DuplicateCheckParams {
  isbn10?: string | null;
  isbn13?: string | null;
  barcode?: string | null;
  title?: string | null;
  titleKhmer?: string | null;
  titleEnglish?: string | null;
  authors?: string[];
}

export class DuplicateService {
  static async findPotentialDuplicates(params: DuplicateCheckParams) {
    const { isbn10, isbn13, barcode, title, titleKhmer, titleEnglish, authors = [] } = params;

    // Helper to format response with rich copy metadata
    const formatMatch = (book: any, matchType: string, reasonKhmer: string) => {
      const totalCopies = book.copies?.length || 0;
      const availableCopies = book.copies?.filter((c: any) => c.status === 'AVAILABLE').length || 0;
      const defaultShelf = book.copies?.[0]?.shelfLocation || 'ទូទី ១, ជាន់ A-01';

      // Suggest the next accession number based on existing copies
      let suggestedNextAccession = '';
      if (book.copies?.length > 0) {
        const lastCopy = book.copies[book.copies.length - 1];
        const lastAcc = lastCopy.accessionNumber || '';
        const matchNum = lastAcc.match(/^(.*?)(\d+)$/);
        if (matchNum) {
          const prefix = matchNum[1];
          const numDigits = matchNum[2].length;
          const nextVal = parseInt(matchNum[2], 10) + 1;
          suggestedNextAccession = `${prefix}${String(nextVal).padStart(numDigits, '0')}`;
        } else {
          suggestedNextAccession = `${lastAcc}-${String(totalCopies + 1).padStart(2, '0')}`;
        }
      } else {
        suggestedNextAccession = `DUC-BC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-01`;
      }

      const bookTitle = book.titleKhmer || book.titleEnglish || 'Unknown Title';

      return {
        isDuplicate: true,
        matchType,
        matchedBook: {
          ...book,
          authors: typeof book.authors === 'string'
            ? (() => { try { return JSON.parse(book.authors); } catch { return [book.authors]; } })()
            : book.authors,
        },
        totalCopies,
        availableCopies,
        defaultShelfLocation: defaultShelf,
        suggestedNextAccession,
        messageKhmer: `រកឃើញសៀវភៅ "${bookTitle}" មានក្នុងបណ្ណាល័យរួចហើយ! (បច្ចុប្បន្នមាន ${totalCopies} ក្បាល, ទំនេរ ${availableCopies} ក្បាល)`,
        message: `An existing book "${bookTitle}" was found in the library catalog (${totalCopies} copies registered). You can add additional physical copies directly.`,
      };
    };

    // 1. Exact ISBN Match (Supports raw & cleaned ISBNs)
    const rawIsbns = [isbn13, isbn10, barcode].filter((v): v is string => !!v && v.trim().length >= 8);
    const cleanedIsbns = rawIsbns.map((i) => IsbnUtils.clean(i)).filter((i) => i.length === 10 || i.length === 13);
    const allIsbnSearch = Array.from(new Set([...rawIsbns, ...cleanedIsbns]));

    if (allIsbnSearch.length > 0) {
      const isbnQueries = allIsbnSearch.flatMap((val) => [
        { isbn13: val },
        { isbn10: val },
      ]);

      const isbnMatch = await prisma.book.findFirst({
        where: { OR: isbnQueries },
        include: {
          category: true,
          copies: {
            select: { id: true, accessionNumber: true, barcode: true, status: true, shelfLocation: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (isbnMatch) {
        return formatMatch(
          isbnMatch,
          'EXACT_ISBN',
          `លេខកូដ ISBN ត្រូវគ្នានឹងសៀវភៅដែលមានស្រាប់`
        );
      }
    }

    // 2. Exact Barcode / Accession Number Match in BookCopy
    if (barcode && barcode.trim().length >= 4) {
      const cleanBar = barcode.trim();
      const copyMatch = await prisma.bookCopy.findFirst({
        where: {
          OR: [
            { barcode: cleanBar },
            { accessionNumber: cleanBar },
          ],
        },
        include: {
          book: {
            include: {
              category: true,
              copies: {
                select: { id: true, accessionNumber: true, barcode: true, status: true, shelfLocation: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      });

      if (copyMatch?.book) {
        return formatMatch(
          copyMatch.book,
          'BARCODE_MATCH',
          `លេខបាកូដត្រូវគ្នានឹងក្បាលសៀវភៅដែលមានស្រាប់`
        );
      }
    }

    // 3. Title Matching (Khmer & English, Case-Insensitive, Exact & Substring)
    const candidateTitles = Array.from(
      new Set(
        [titleKhmer, titleEnglish, title]
          .filter((t): t is string => typeof t === 'string' && t.trim().length >= 3)
          .map((t) => t.trim())
      )
    );

    for (const rawT of candidateTitles) {
      // 3A. Exact or Contains match in Database
      const matchedBooks = await prisma.book.findMany({
        where: {
          OR: [
            { titleKhmer: { contains: rawT, mode: 'insensitive' } },
            { titleEnglish: { contains: rawT, mode: 'insensitive' } },
          ],
        },
        include: {
          category: true,
          copies: {
            select: { id: true, accessionNumber: true, barcode: true, status: true, shelfLocation: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (matchedBooks.length > 0) {
        return formatMatch(
          matchedBooks[0],
          'EXACT_TITLE',
          `ចំណងជើងត្រូវគ្នានឹងសៀវភៅដែលមានស្រាប់`
        );
      }
    }

    // 3B. Substring cross-matching (e.g. Scanned contains DB title or DB title contains scanned)
    if (candidateTitles.length > 0) {
      const allBooks = await prisma.book.findMany({
        take: 300,
        select: {
          id: true,
          titleKhmer: true,
          titleEnglish: true,
          authors: true,
          coverImageUrl: true,
          categoryId: true,
          category: true,
          copies: {
            select: { id: true, accessionNumber: true, barcode: true, status: true, shelfLocation: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      for (const book of allBooks) {
        const dbKhmer = (book.titleKhmer || '').trim().toLowerCase();
        const dbEnglish = (book.titleEnglish || '').trim().toLowerCase();

        for (const scannedT of candidateTitles) {
          const sNorm = scannedT.toLowerCase();
          const khmerMatch = dbKhmer.length >= 4 && (sNorm.includes(dbKhmer) || dbKhmer.includes(sNorm));
          const englishMatch = dbEnglish.length >= 4 && (sNorm.includes(dbEnglish) || dbEnglish.includes(sNorm));

          if (khmerMatch || englishMatch) {
            return formatMatch(
              book,
              'SIMILAR_TITLE',
              `ចំណងជើងស្រដៀងនឹងសៀវភៅដែលមានស្រាប់`
            );
          }
        }
      }
    }

    // 4. No Duplicate Found
    return {
      isDuplicate: false,
      matchType: null,
      matchedBook: null,
      totalCopies: 0,
      availableCopies: 0,
      defaultShelfLocation: 'ទូទី ១, ជាន់ A-01',
      suggestedNextAccession: '',
      messageKhmer: 'មិនមានសៀវភៅជាន់គ្នាក្នុងប្រព័ន្ធឡើយ',
      message: 'No duplicate records found in the library catalog.',
    };
  }
}


