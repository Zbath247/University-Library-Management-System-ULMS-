import prisma from '../../db/prisma';
import { Prisma } from '@prisma/client';
import { CopyStatus, CopyCondition } from '../../types/enums';

export class CopyService {
  static async getCopiesByBookId(bookId: string) {
    return prisma.bookCopy.findMany({
      where: { bookId },
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
    });
  }

  static async getCopyByIdOrIdentifier(identifier: string) {
    return prisma.bookCopy.findFirst({
      where: {
        OR: [
          { id: identifier },
          { accessionNumber: identifier },
          { barcode: identifier },
        ],
      },
      include: {
        book: {
          include: { category: true },
        },
        loans: {
          where: { status: 'ACTIVE' },
          include: { member: true },
        },
      },
    });
  }

  static async createCopy(data: Prisma.BookCopyCreateInput) {
    return prisma.bookCopy.create({
      data,
      include: { book: true },
    });
  }

  static async updateCopy(id: string, data: Prisma.BookCopyUpdateInput) {
    return prisma.bookCopy.update({
      where: { id },
      data,
      include: { book: true },
    });
  }

  static async deleteCopy(id: string) {
    const activeLoan = await prisma.loan.findFirst({
      where: { bookCopyId: id, status: 'ACTIVE' },
    });

    if (activeLoan) {
      throw new Error('CANNOT_DELETE_COPY_ON_LOAN: This copy is currently borrowed.');
    }

    return prisma.bookCopy.delete({
      where: { id },
    });
  }
}

