import prisma from '../../db/prisma';
import { CopyStatus, CopyCondition, LoanStatus } from '../../types/enums';

export class ReportService {
  static async getInventoryReport() {
    const [
      totalBooks,
      totalCopies,
      availableCopies,
      borrowedCopies,
      lostCopies,
      categoriesBreakdown,
      conditionBreakdown,
    ] = await Promise.all([
      prisma.book.count(),
      prisma.bookCopy.count(),
      prisma.bookCopy.count({ where: { status: CopyStatus.AVAILABLE } }),
      prisma.bookCopy.count({ where: { status: CopyStatus.BORROWED } }),
      prisma.bookCopy.count({ where: { status: CopyStatus.LOST } }),
      prisma.category.findMany({
        select: {
          id: true,
          code: true,
          nameKhmer: true,
          nameEnglish: true,
          _count: { select: { books: true } },
        },
      }),
      prisma.bookCopy.groupBy({
        by: ['condition'],
        _count: { id: true },
      }),
    ]);

    return {
      totalBooks,
      totalCopies,
      copiesByStatus: {
        available: availableCopies,
        borrowed: borrowedCopies,
        lost: lostCopies,
        other: totalCopies - (availableCopies + borrowedCopies + lostCopies),
      },
      categoriesBreakdown: categoriesBreakdown.map((c) => ({
        code: c.code,
        nameKhmer: c.nameKhmer,
        nameEnglish: c.nameEnglish,
        bookCount: c._count.books,
      })),
      conditionBreakdown: conditionBreakdown.map((cb) => ({
        condition: cb.condition,
        count: cb._count.id,
      })),
    };
  }

  static async getCirculationReport() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalActiveLoans,
      overdueLoans,
      loansThisMonth,
      returnsThisMonth,
      recentLoans,
    ] = await Promise.all([
      prisma.loan.count({ where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.EXTENDED] } } }),
      prisma.loan.count({
        where: {
          status: { in: [LoanStatus.ACTIVE, LoanStatus.EXTENDED, LoanStatus.OVERDUE] },
          dueDate: { lt: now },
        },
      }),
      prisma.loan.count({ where: { issueDate: { gte: startOfMonth } } }),
      prisma.loan.count({ where: { status: LoanStatus.RETURNED, returnDate: { gte: startOfMonth } } }),
      prisma.loan.findMany({
        take: 10,
        orderBy: { issueDate: 'desc' },
        include: {
          bookCopy: { include: { book: true } },
          member: true,
        },
      }),
    ]);

    return {
      summary: {
        totalActiveLoans,
        overdueLoans,
        loansThisMonth,
        returnsThisMonth,
      },
      recentLoans: recentLoans.map((l) => ({
        id: l.id,
        bookTitleKhmer: l.bookCopy.book.titleKhmer,
        bookTitleEnglish: l.bookCopy.book.titleEnglish,
        accessionNumber: l.bookCopy.accessionNumber,
        memberCode: l.member.memberCode,
        memberNameKhmer: l.member.fullNameKhmer,
        memberNameEnglish: l.member.fullNameEnglish,
        issueDate: l.issueDate,
        dueDate: l.dueDate,
        status: l.status,
      })),
    };
  }
}

