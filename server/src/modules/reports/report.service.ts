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

  static async getAnalyticsReport() {
    const now = new Date();
    const [
      totalBooks,
      totalCopies,
      availableCopies,
      borrowedCopies,
      lostCopies,
      activeLoans,
      overdueLoans,
      totalMembers,
      membersByType,
      languagesCount,
      categories,
      conditions,
      loansPast6Months,
    ] = await Promise.all([
      prisma.book.count(),
      prisma.bookCopy.count(),
      prisma.bookCopy.count({ where: { status: CopyStatus.AVAILABLE } }),
      prisma.bookCopy.count({ where: { status: CopyStatus.BORROWED } }),
      prisma.bookCopy.count({ where: { status: CopyStatus.LOST } }),
      prisma.loan.count({ where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.EXTENDED] } } }),
      prisma.loan.count({
        where: {
          status: { in: [LoanStatus.ACTIVE, LoanStatus.EXTENDED, LoanStatus.OVERDUE] },
          dueDate: { lt: now },
        },
      }),
      prisma.member.count(),
      prisma.member.groupBy({
        by: ['memberType'],
        _count: { id: true },
      }),
      prisma.book.groupBy({
        by: ['language'],
        _count: { id: true },
      }),
      prisma.category.findMany({
        select: {
          code: true,
          nameKhmer: true,
          _count: { select: { books: true } },
        },
      }),
      prisma.bookCopy.groupBy({
        by: ['condition'],
        _count: { id: true },
      }),
      prisma.loan.findMany({
        where: {
          issueDate: {
            gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          },
        },
        select: {
          issueDate: true,
          returnDate: true,
          status: true,
        },
      }),
    ]);

    // Group categories into faculties
    const facultiesMap: Record<string, { name: string; short: string; color: string; count: number }> = {
      FDI: { name: 'ឧស្សាហកម្មឌីជីថល (FDI)', short: 'FDI', color: '#0284c7', count: 0 },
      FLP: { name: 'នីតិសាស្ត្រ & នយោបាយ (FLP)', short: 'FLP', color: '#4f46e5', count: 0 },
      FOE: { name: 'ភាសាអង់គ្លេស (FOE)', short: 'FOE', color: '#059669', count: 0 },
      CUL: { name: 'វប្បធម៌ & ប្រវត្តិសាស្ត្រ (CUL)', short: 'វប្បធម៌', color: '#d97706', count: 0 },
      FDES: { name: 'សេដ្ឋកិច្ចឌីជីថល (FDES)', short: 'FDES', color: '#db2777', count: 0 },
      FEA: { name: 'វិស្វកម្ម & ស្ថាបត្យកម្ម (FEA)', short: 'FEA', color: '#7c3aed', count: 0 },
      FARD: { name: 'កសិកម្ម & ជនបទ (FARD)', short: 'FARD', color: '#65a30d', count: 0 },
    };

    categories.forEach((cat) => {
      const code = cat.code;
      const count = cat._count.books;
      if (code.startsWith('FDI')) facultiesMap.FDI.count += count;
      else if (code.startsWith('FLP')) facultiesMap.FLP.count += count;
      else if (code.startsWith('FOE')) facultiesMap.FOE.count += count;
      else if (code.startsWith('CUL') || code.startsWith('GEN')) facultiesMap.CUL.count += count;
      else if (code.startsWith('FDES')) facultiesMap.FDES.count += count;
      else if (code.startsWith('FEA')) facultiesMap.FEA.count += count;
      else if (code.startsWith('FARD')) facultiesMap.FARD.count += count;
      else facultiesMap.CUL.count += count;
    });

    const facultyBreakdown = Object.values(facultiesMap).sort((a, b) => b.count - a.count);

    // Group loans by month (last 6 months)
    const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    const monthlyTrends: Array<{ month: string; monthIndex: number; loans: number; returns: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const mLabel = `${khmerMonths[mIdx]} ${yr !== now.getFullYear() ? `'${String(yr).slice(2)}` : ''}`;

      const loansInMonth = loansPast6Months.filter((l) => {
        const issue = new Date(l.issueDate);
        return issue.getFullYear() === yr && issue.getMonth() === mIdx;
      }).length;

      const returnsInMonth = loansPast6Months.filter((l) => {
        if (!l.returnDate) return false;
        const ret = new Date(l.returnDate);
        return ret.getFullYear() === yr && ret.getMonth() === mIdx;
      }).length;

      monthlyTrends.push({
        month: mLabel,
        monthIndex: mIdx,
        loans: loansInMonth,
        returns: returnsInMonth,
      });
    }

    return {
      kpis: {
        totalBooks,
        totalCopies,
        availableCopies,
        borrowedCopies,
        lostCopies,
        activeLoans,
        overdueLoans,
        totalMembers,
        availableRate: totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 100,
        borrowedRate: totalCopies > 0 ? Math.round((borrowedCopies / totalCopies) * 100) : 0,
      },
      facultyBreakdown,
      monthlyTrends,
      copyStatusBreakdown: [
        { name: 'អាចខ្ចីបាន (Available)', value: availableCopies, color: '#10b981' },
        { name: 'កំពុងខ្ចី (Borrowed)', value: borrowedCopies, color: '#0284c7' },
        { name: 'ហួសកំណត់ (Overdue)', value: overdueLoans, color: '#ef4444' },
        { name: 'បាត់បង់/ខូច (Lost)', value: lostCopies, color: '#94a3b8' },
      ],
      memberTypeBreakdown: membersByType.map((m) => ({
        type: m.memberType,
        label: m.memberType === 'STUDENT' ? 'និស្សិត (Students)' : m.memberType === 'FACULTY' ? 'សាស្ត្រាចារ្យ (Faculty)' : 'បុគ្គលិក (Staff)',
        count: m._count.id,
      })),
      conditionBreakdown: conditions.map((c) => ({
        condition: c.condition,
        label: c.condition === 'NEW' ? 'ថ្មី (New)' : c.condition === 'GOOD' ? 'ល្អ (Good)' : c.condition === 'FAIR' ? 'មធ្យម (Fair)' : 'ខូចខាត (Poor)',
        count: c._count.id,
      })),
      languageBreakdown: languagesCount.map((l) => ({
        language: l.language,
        label: l.language === 'km' ? 'ភាសាខ្មែរ (Khmer)' : l.language === 'en' ? 'ភាសាអង់គ្លេស (English)' : l.language,
        count: l._count.id,
      })),
    };
  }
}

