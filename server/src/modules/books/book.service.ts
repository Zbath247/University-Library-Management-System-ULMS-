import prisma from '../../db/prisma';
import { Prisma } from '@prisma/client';

export interface BookSearchOptions {
  q?: string;
  categoryId?: string;
  language?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export class BookService {
  static async searchBooks(options: BookSearchOptions) {
    const { q, categoryId, language, page, limit, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.BookWhereInput = {};

    if (q && q.trim()) {
      const searchTerm = q.trim();
      where.OR = [
        { titleKhmer: { contains: searchTerm } },
        { titleEnglish: { contains: searchTerm } },
        { subtitle: { contains: searchTerm } },
        { publisher: { contains: searchTerm } },
        { isbn10: { contains: searchTerm } },
        { isbn13: { contains: searchTerm } },
        { authors: { contains: searchTerm } },
      ];
    }

    if (categoryId) {
      // Support querying either a specific department or an entire faculty with all its sub-departments
      const childCategories = await prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true },
      });
      if (childCategories.length > 0) {
        where.categoryId = { in: [categoryId, ...childCategories.map((c) => c.id)] };
      } else {
        where.categoryId = categoryId;
      }
    }

    if (language) {
      where.language = language;
    }

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: { id: true, nameKhmer: true, nameEnglish: true, code: true },
          },
          copies: {
            select: { id: true, status: true },
          },
        },
      }),
    ]);

    // Derive availability counts dynamically from physical-copy states
    const items = books.map((book) => {
      const totalCopies = book.copies.length;
      const availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;
      const borrowedCopies = book.copies.filter((c) => c.status === 'BORROWED').length;
      const { copies, ...bookData } = book;

      const parsedAuthors = typeof book.authors === 'string'
        ? (() => { try { return JSON.parse(book.authors); } catch { return [book.authors]; } })()
        : book.authors;

      return {
        ...bookData,
        authors: parsedAuthors,
        availability: {
          totalCopies,
          availableCopies,
          borrowedCopies,
          isAvailable: availableCopies > 0,
        },
      };
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getBookById(id: string) {
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        category: true,
        copies: {
          orderBy: { accessionNumber: 'asc' },
          include: {
            loans: {
              where: { status: 'ACTIVE' },
              include: {
                member: {
                  select: { id: true, memberCode: true, fullNameKhmer: true, fullNameEnglish: true },
                },
              },
            },
          },
        },
      },
    });

    if (!book) return null;

    const totalCopies = book.copies.length;
    const availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;
    const borrowedCopies = book.copies.filter((c) => c.status === 'BORROWED').length;

    const parsedAuthors = typeof book.authors === 'string'
      ? (() => { try { return JSON.parse(book.authors); } catch { return [book.authors]; } })()
      : book.authors;

    return {
      ...book,
      authors: parsedAuthors,
      availability: {
        totalCopies,
        availableCopies,
        borrowedCopies,
        isAvailable: availableCopies > 0,
      },
    };
  }

  static async createBook(data: any) {
    const { copiesCount, shelfLocation, ...bookFields } = data;
    const authors = Array.isArray(bookFields.authors) ? JSON.stringify(bookFields.authors) : bookFields.authors;

    return prisma.$transaction(async (tx) => {
      const book = await tx.book.create({
        data: { ...bookFields, authors },
        include: { category: true },
      });

      const numCopies = Math.max(1, parseInt(copiesCount, 10) || 1);
      const location = shelfLocation?.trim() || 'ជាន់ទី ១, ធ្នើទូទៅ';
      const timestamp = Date.now().toString().slice(-6);

      for (let i = 1; i <= numCopies; i++) {
        const copyNum = String(i).padStart(2, '0');
        const accessionNumber = `DUC-BC-${timestamp}${copyNum}`;
        const barcode = (book.isbn13 ? `${book.isbn13}-${copyNum}` : `${accessionNumber}`).trim();

        await tx.bookCopy.create({
          data: {
            bookId: book.id,
            accessionNumber,
            barcode,
            shelfLocation: location,
            status: 'AVAILABLE',
            condition: 'NEW',
          },
        });
      }

      return book;
    });
  }

  static async updateBook(id: string, data: Prisma.BookUpdateInput) {
    return prisma.book.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  static async deleteBook(id: string) {
    // Check if any copy has active loans
    const activeLoan = await prisma.loan.findFirst({
      where: {
        bookCopy: { bookId: id },
        status: 'ACTIVE',
      },
    });

    if (activeLoan) {
      throw new Error('CANNOT_DELETE_ACTIVE_LOANS: Book copies are currently on loan');
    }

    return prisma.book.delete({
      where: { id },
    });
  }
}

