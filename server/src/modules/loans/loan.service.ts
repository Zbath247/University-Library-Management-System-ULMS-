import prisma from '../../db/prisma';
import { LoanStatus, CopyStatus, MemberStatus, MemberType } from '../../types/enums';
import { SettingsService } from '../settings/settings.service';

export class LoanService {
  static async issueLoan(params: {
    bookCopyIdentifier: string;
    memberIdentifier: string;
    issuedByUserId: string;
    dueDays?: number;
    notes?: string | null;
  }) {
    const { bookCopyIdentifier, memberIdentifier, issuedByUserId, dueDays, notes } = params;

    return prisma.$transaction(async (tx) => {
      // 1. Resolve physical copy
      const copy = await tx.bookCopy.findFirst({
        where: {
          OR: [
            { id: bookCopyIdentifier },
            { accessionNumber: bookCopyIdentifier },
            { barcode: bookCopyIdentifier },
          ],
        },
        include: { book: true },
      });

      if (!copy) {
        throw new Error('COPY_NOT_FOUND: Physical copy not found');
      }

      if (copy.status !== CopyStatus.AVAILABLE) {
        throw new Error(`COPY_NOT_AVAILABLE: Copy is currently ${copy.status}`);
      }

      // Check for any active loan on this copy (extra safeguard against concurrency)
      const existingActiveLoan = await tx.loan.findFirst({
        where: { bookCopyId: copy.id, status: LoanStatus.ACTIVE },
      });
      if (existingActiveLoan) {
        throw new Error('COPY_ALREADY_LOANED: Copy is already on an active loan');
      }

      // 2. Resolve member
      const member = await tx.member.findFirst({
        where: {
          OR: [
            { id: memberIdentifier },
            { memberCode: memberIdentifier },
            { email: memberIdentifier },
          ],
        },
        include: {
          _count: {
            select: { loans: { where: { status: LoanStatus.ACTIVE } } },
          },
        },
      });

      if (!member) {
        throw new Error('MEMBER_NOT_FOUND: Member not found');
      }

      if (member.status !== MemberStatus.ACTIVE) {
        throw new Error(`MEMBER_NOT_ACTIVE: Member account status is ${member.status}`);
      }

      if (member._count.loans >= member.maxActiveLoans) {
        throw new Error(`MAX_LOANS_EXCEEDED: Member has reached their limit of ${member.maxActiveLoans} active loans`);
      }

      // 3. Compute Due Date
      const configuredDays = await SettingsService.getLoanDuration(member.memberType);
      const loanDurationDays = dueDays || configuredDays;
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + loanDurationDays * 24 * 60 * 60 * 1000);

      // 4. Create Loan
      const loan = await tx.loan.create({
        data: {
          bookCopyId: copy.id,
          memberId: member.id,
          issuedByUserId,
          issueDate,
          dueDate,
          status: LoanStatus.ACTIVE,
          notes: notes || null,
        },
        include: {
          bookCopy: { include: { book: true } },
          member: true,
          issuedByUser: { select: { id: true, username: true, fullName: true } },
        },
      });

      // 5. Update physical copy status to BORROWED
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.BORROWED },
      });

      return loan;
    });
  }

  static async returnLoan(params: {
    bookCopyIdentifier: string;
    returnedToUserId?: string;
    notes?: string | null;
  }) {
    const { bookCopyIdentifier, returnedToUserId, notes } = params;

    return prisma.$transaction(async (tx) => {
      // 1. Resolve copy
      const copy = await tx.bookCopy.findFirst({
        where: {
          OR: [
            { id: bookCopyIdentifier },
            { accessionNumber: bookCopyIdentifier },
            { barcode: bookCopyIdentifier },
          ],
        },
      });

      if (!copy) {
        throw new Error('COPY_NOT_FOUND: Physical copy not found');
      }

      // 2. Find active loan for this copy
      const loan = await tx.loan.findFirst({
        where: {
          bookCopyId: copy.id,
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.EXTENDED] },
        },
        include: {
          bookCopy: { include: { book: true } },
          member: true,
        },
      });

      if (!loan) {
        throw new Error('NO_ACTIVE_LOAN: No active borrowing record found for this copy');
      }

      const returnDate = new Date();
      const isOverdue = returnDate.getTime() > loan.dueDate.getTime();

      // 3. Update Loan status to RETURNED
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          returnDate,
          status: LoanStatus.RETURNED,
          returnedToUserId: returnedToUserId || null,
          notes: notes ? `${loan.notes || ''} [Return Note: ${notes}]`.trim() : loan.notes,
        },
        include: {
          bookCopy: { include: { book: true } },
          member: true,
          issuedByUser: { select: { id: true, fullName: true } },
          returnedToUser: { select: { id: true, fullName: true } },
        },
      });

      // 4. Update physical copy status back to AVAILABLE
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: CopyStatus.AVAILABLE },
      });

      return {
        loan: updatedLoan,
        wasOverdue: isOverdue,
      };
    });
  }

  static async renewLoan(params: { loanId: string; additionalDays: number }) {
    const { loanId, additionalDays } = params;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.status !== LoanStatus.ACTIVE) {
      throw new Error('CANNOT_RENEW: Loan is not currently active');
    }

    const maxRenewals = await SettingsService.getMaxRenewals();
    if (loan.renewalCount >= maxRenewals) {
      throw new Error(`MAX_RENEWALS_REACHED: This loan has already reached the maximum renewal limit (${maxRenewals} times)`);
    }

    const defaultRenewalDays = await SettingsService.getRenewalDays();
    const renewalDays = additionalDays || defaultRenewalDays;
    const newDueDate = new Date(loan.dueDate.getTime() + renewalDays * 24 * 60 * 60 * 1000);

    return prisma.loan.update({
      where: { id: loanId },
      data: {
        dueDate: newDueDate,
        renewalCount: { increment: 1 },
        status: LoanStatus.EXTENDED,
      },
      include: {
        bookCopy: { include: { book: true } },
        member: true,
      },
    });
  }

  static async getActiveLoans(options: { q?: string; page: number; limit: number }) {
    const { q, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      status: { in: [LoanStatus.ACTIVE, LoanStatus.EXTENDED, LoanStatus.OVERDUE] },
    };

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { member: { memberCode: { contains: term } } },
        { member: { fullNameKhmer: { contains: term } } },
        { member: { fullNameEnglish: { contains: term } } },
        { bookCopy: { accessionNumber: { contains: term } } },
        { bookCopy: { barcode: { contains: term } } },
        { bookCopy: { book: { titleKhmer: { contains: term } } } },
        { bookCopy: { book: { titleEnglish: { contains: term } } } },
      ];
    }

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          bookCopy: { include: { book: true } },
          member: true,
          issuedByUser: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const now = new Date();
    const items = loans.map((l) => {
      const isOverdue = l.dueDate.getTime() < now.getTime();
      const overdueDays = isOverdue
        ? Math.floor((now.getTime() - l.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...l,
        isOverdue,
        overdueDays,
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

  static async getOverdueLoans() {
    const now = new Date();
    const loans = await prisma.loan.findMany({
      where: {
        status: { in: [LoanStatus.ACTIVE, LoanStatus.EXTENDED, LoanStatus.OVERDUE] },
        dueDate: { lt: now },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        bookCopy: { include: { book: true } },
        member: true,
      },
    });

    return loans.map((l) => ({
      ...l,
      overdueDays: Math.floor((now.getTime() - l.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  }
}

