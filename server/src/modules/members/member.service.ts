import prisma from '../../db/prisma';
import { Prisma } from '@prisma/client';

export class MemberService {
  static async searchMembers(options: {
    q?: string;
    department?: string;
    status?: any;
    memberType?: any;
    page: number;
    limit: number;
  }) {
    const { q, department, status, memberType, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.MemberWhereInput = {};

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { memberCode: { contains: term } },
        { fullNameKhmer: { contains: term } },
        { fullNameEnglish: { contains: term } },
        { email: { contains: term } },
        { phoneNumber: { contains: term } },
        { telegramUsername: { contains: term } },
      ];
    }

    if (department) where.department = department;
    if (status) where.status = status;
    if (memberType) where.memberType = memberType;

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { memberCode: 'asc' },
        include: {
          _count: {
            select: {
              loans: { where: { status: 'ACTIVE' } },
            },
          },
        },
      }),
    ]);

    const items = members.map((m) => ({
      ...m,
      activeLoansCount: m._count.loans,
    }));

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

  static async getMemberById(id: string) {
    return prisma.member.findUnique({
      where: { id },
      include: {
        loans: {
          orderBy: { issueDate: 'desc' },
          include: {
            bookCopy: {
              include: { book: true },
            },
          },
        },
      },
    });
  }

  static async getMemberByCode(memberCode: string) {
    return prisma.member.findUnique({
      where: { memberCode },
      include: {
        loans: {
          where: { status: 'ACTIVE' },
          include: {
            bookCopy: {
              include: { book: true },
            },
          },
        },
      },
    });
  }

  static async createMember(data: Prisma.MemberCreateInput) {
    return prisma.member.create({ data });
  }

  static async updateMember(id: string, data: Prisma.MemberUpdateInput) {
    return prisma.member.update({ where: { id }, data });
  }

  static async deleteMember(id: string) {
    const activeLoans = await prisma.loan.count({
      where: { memberId: id, status: 'ACTIVE' },
    });
    if (activeLoans > 0) {
      throw new Error('មិនអាចលុបសមាជិកដែលមានសៀវភៅកំពុងខ្ចីបានទេ / Cannot delete member with active loans');
    }
    // Delete any inactive loans or history associated with member
    await prisma.loan.deleteMany({ where: { memberId: id } });
    return prisma.member.delete({ where: { id } });
  }

  static async batchDeleteMembers(memberIds: string[]) {
    if (!memberIds || memberIds.length === 0) return { deletedCount: 0 };

    const activeLoans = await prisma.loan.findMany({
      where: {
        memberId: { in: memberIds },
        status: 'ACTIVE',
      },
      include: {
        member: { select: { fullNameKhmer: true, memberCode: true } },
      },
    });

    if (activeLoans.length > 0) {
      const memberNames = Array.from(
        new Set(activeLoans.map((l) => `${l.member.fullNameKhmer} (${l.member.memberCode})`))
      ).join(', ');
      throw new Error(
        `មិនអាចលុបបានទេ ព្រោះសមាជិក [${memberNames}] កំពុងមានសៀវភៅខ្ចីមិនទាន់សង!`
      );
    }

    return prisma.$transaction(async (tx) => {
      await tx.loan.deleteMany({
        where: { memberId: { in: memberIds } },
      });
      const result = await tx.member.deleteMany({
        where: { id: { in: memberIds } },
      });
      return { deletedCount: result.count };
    });
  }
}

