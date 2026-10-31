import { prisma } from '../../db/prisma';

export interface CheckInDTO {
  memberCode: string;
  fullName: string;
  fullNameEnglish?: string;
  telegramUsername?: string;
  memberType?: string; // STUDENT, FACULTY, STAFF, VISITOR
  gender?: string; // MALE, FEMALE
  department: string;
  phoneNumber?: string;
  purpose: string; // READING, RESEARCH, BORROW_RETURN, COMPUTER, OTHER
  purposeDetails?: string;
  notes?: string;
}

export interface CheckOutDTO {
  attendanceId?: string;
  memberCode?: string;
}

export class AttendanceService {
  /**
   * Check in a visitor / student / faculty to the library.
   */
  static async checkIn(data: CheckInDTO) {
    const code = data.memberCode.trim().toUpperCase();
    const fullName = data.fullName.trim();
    const fullNameEnglish = data.fullNameEnglish?.trim() || null;
    const telegramUsername = data.telegramUsername ? data.telegramUsername.trim().replace(/^@/, '') : null;
    const department = data.department.trim();
    const purpose = data.purpose.trim().toUpperCase() || 'READING';

    // 1. Check if user already has an active check-in or pending request
    const activeRecord = await prisma.attendance.findFirst({
      where: {
        memberCode: code,
        status: { in: ['CHECKED_IN', 'PENDING_APPROVAL'] },
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (activeRecord) {
      if (activeRecord.status === 'PENDING_APPROVAL') {
        return {
          isPendingApproval: true,
          record: activeRecord,
          message: 'សំណើខ្ចី ឬ សងសៀវភៅរបស់អ្នកកំពុងរង់ចាំការអនុម័តពី Admin/បណ្ណារក្ស / Your request is pending approval',
        };
      }
      return {
        isAlreadyCheckedIn: true,
        record: activeRecord,
        message: 'លោកអ្នកបានកត់ត្រាវត្តមានចូលរួចរាល់ហើយ / You are already checked in',
      };
    }

    // 2. Link or optionally auto-register in Member database
    let member = await prisma.member.findUnique({
      where: { memberCode: code },
    });

    if (!member) {
      // Auto register visitor in university member directory
      try {
        const dummyEmail = `${code.toLowerCase().replace(/[^a-z0-9]/g, '')}@duc.edu.kh`;
        member = await prisma.member.create({
          data: {
            memberCode: code,
            fullNameKhmer: fullName,
            fullNameEnglish: fullNameEnglish || fullName,
            email: dummyEmail,
            phoneNumber: data.phoneNumber || null,
            telegramUsername: telegramUsername,
            department: department,
            memberType: data.memberType || 'STUDENT',
            status: 'ACTIVE',
            maxActiveLoans: data.memberType === 'FACULTY' ? 5 : 3,
          },
        });
      } catch (err) {
        // If unique constraint hits or dummy email already exists, retrieve it
        member = await prisma.member.findFirst({
          where: { memberCode: code },
        });
      }
    } else if (telegramUsername || fullNameEnglish) {
      // Update member's telegram and latin name if provided
      try {
        member = await prisma.member.update({
          where: { id: member.id },
          data: {
            ...(telegramUsername ? { telegramUsername } : {}),
            ...(fullNameEnglish ? { fullNameEnglish } : {}),
            ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
          },
        });
      } catch (err) {
        // Non-blocking update
      }
    }

    // 3. Create attendance record
    const isBorrowReturn = purpose === 'BORROW_RETURN';
    const initialStatus = isBorrowReturn ? 'PENDING_APPROVAL' : 'CHECKED_IN';

    const attendance = await prisma.attendance.create({
      data: {
        memberCode: code,
        fullName: fullName,
        fullNameEnglish: fullNameEnglish || member?.fullNameEnglish || null,
        telegramUsername: telegramUsername || member?.telegramUsername || null,
        memberType: data.memberType || member?.memberType || 'STUDENT',
        gender: data.gender || null,
        department: department,
        phoneNumber: data.phoneNumber || member?.phoneNumber || null,
        purpose: purpose,
        purposeDetails: data.purposeDetails || null,
        notes: data.notes || null,
        memberId: member?.id || null,
        status: initialStatus,
        checkInTime: new Date(),
      },
    });

    if (isBorrowReturn) {
      return {
        isPendingApproval: true,
        record: attendance,
        message: 'សំណើខ្ចី ឬ សងសៀវភៅត្រូវបានកត់ត្រា និងកំពុងរង់ចាំការអនុម័តពី Admin/បណ្ណារក្ស / Borrow/Return request submitted, waiting for approval',
      };
    }

    return {
      isAlreadyCheckedIn: false,
      record: attendance,
      message: 'កត់ត្រាវត្តមានចូលបណ្ណាល័យដោយជោគជ័យ / Successfully checked in to library',
    };
  }

  /**
   * Check out of the library.
   */
  static async checkOut(params: CheckOutDTO) {
    let whereClause: any = { status: 'CHECKED_IN' };

    if (params.attendanceId) {
      whereClause = { id: params.attendanceId, status: 'CHECKED_IN' };
    } else if (params.memberCode) {
      whereClause = {
        memberCode: params.memberCode.trim().toUpperCase(),
        status: 'CHECKED_IN',
      };
    } else {
      throw new Error('Attendance ID or Member Code is required for checkout');
    }

    const record = await prisma.attendance.findFirst({
      where: whereClause,
      orderBy: { checkInTime: 'desc' },
    });

    if (!record) {
      throw new Error('មិនមានវត្តមានសកម្មដែលត្រូវចាកចេញទេ / No active check-in found');
    }

    const now = new Date();
    const durationMinutes = Math.round(
      (now.getTime() - new Date(record.checkInTime).getTime()) / 60000
    );

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: {
        status: 'CHECKED_OUT',
        checkOutTime: now,
      },
    });

    return {
      record: updated,
      durationMinutes,
      message: `បានកត់ត្រាការចាកចេញដោយជោគជ័យ (ស្នាក់នៅក្នុងបណ្ណាល័យ: ${durationMinutes} នាទី) / Checked out successfully`,
    };
  }

  /**
   * Quick visitor lookup by student code or phone number.
   * Useful for returning users or entrance kiosk autocomplete.
   */
  static async lookupVisitor(query: string) {
    const q = query.trim().toUpperCase();

    // Check recent attendance
    const recentAttendance = await prisma.attendance.findFirst({
      where: {
        OR: [{ memberCode: q }, { phoneNumber: query.trim() }],
      },
      orderBy: { checkInTime: 'desc' },
    });

    // Check member database
    const member = await prisma.member.findFirst({
      where: {
        OR: [{ memberCode: q }, { phoneNumber: query.trim() }],
      },
    });

    // Check if currently inside or pending approval
    const currentActive = await prisma.attendance.findFirst({
      where: {
        memberCode: q,
        status: { in: ['CHECKED_IN', 'PENDING_APPROVAL'] },
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (!recentAttendance && !member) {
      return null;
    }

    return {
      profile: {
        memberCode: member?.memberCode || recentAttendance?.memberCode || q,
        fullName: member?.fullNameKhmer || recentAttendance?.fullName || '',
        fullNameEnglish: member?.fullNameEnglish || recentAttendance?.fullNameEnglish || '',
        telegramUsername: member?.telegramUsername || recentAttendance?.telegramUsername || '',
        memberType: member?.memberType || recentAttendance?.memberType || 'STUDENT',
        gender: recentAttendance?.gender || 'MALE',
        department: member?.department || recentAttendance?.department || '',
        phoneNumber: member?.phoneNumber || recentAttendance?.phoneNumber || '',
      },
      currentSession: currentActive,
    };
  }

  /**
   * Get all pending borrow/return requests waiting for Admin approval.
   */
  static async getPendingRequests() {
    return prisma.attendance.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { checkInTime: 'desc' },
    });
  }

  /**
   * Approve a pending borrow/return request by Admin/Librarian.
   */
  static async approveRequest(id: string, approverNotes?: string) {
    const record = await prisma.attendance.findUnique({ where: { id } });
    if (!record) {
      throw new Error('រកមិនឃើញសំណើនេះទេ / Request not found');
    }
    return prisma.attendance.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        notes: approverNotes || 'អនុម័តដោយ Admin / Librarian',
      },
    });
  }

  /**
   * Reject a pending borrow/return request by Admin/Librarian.
   */
  static async rejectRequest(id: string, reason?: string) {
    const record = await prisma.attendance.findUnique({ where: { id } });
    if (!record) {
      throw new Error('រកមិនឃើញសំណើនេះទេ / Request not found');
    }
    return prisma.attendance.update({
      where: { id },
      data: {
        status: 'REJECTED',
        checkOutTime: new Date(),
        notes: reason || 'បដិសេធដោយ Admin / Librarian',
      },
    });
  }

  /**
   * Get all active visitors currently in the library.
   */
  static async getActiveVisitors() {
    return prisma.attendance.findMany({
      where: { status: 'CHECKED_IN' },
      orderBy: { checkInTime: 'desc' },
    });
  }

  /**
   * Get attendance statistics (today's counts, active count, purpose breakdown).
   */
  static async getStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [totalToday, currentlyInside, pendingCount, todayRecords] = await Promise.all([
      prisma.attendance.count({
        where: {
          checkInTime: { gte: startOfDay, lte: endOfDay },
        },
      }),
      prisma.attendance.count({
        where: { status: 'CHECKED_IN' },
      }),
      prisma.attendance.count({
        where: { status: 'PENDING_APPROVAL' },
      }),
      prisma.attendance.findMany({
        where: {
          checkInTime: { gte: startOfDay, lte: endOfDay },
        },
        select: {
          purpose: true,
          department: true,
          memberType: true,
          checkInTime: true,
        },
      }),
    ]);

    // Purpose aggregation
    const purposeCounts: Record<string, number> = {
      READING: 0,
      RESEARCH: 0,
      BORROW_RETURN: 0,
      COMPUTER: 0,
      OTHER: 0,
    };

    const departmentCounts: Record<string, number> = {};
    const memberTypeCounts: Record<string, number> = {};

    todayRecords.forEach((r) => {
      const p = r.purpose || 'OTHER';
      purposeCounts[p] = (purposeCounts[p] || 0) + 1;

      if (r.department) {
        departmentCounts[r.department] = (departmentCounts[r.department] || 0) + 1;
      }
      if (r.memberType) {
        memberTypeCounts[r.memberType] = (memberTypeCounts[r.memberType] || 0) + 1;
      }
    });

    return {
      totalToday,
      currentlyInside,
      pendingCount,
      purposeBreakdown: purposeCounts,
      departmentBreakdown: departmentCounts,
      memberTypeBreakdown: memberTypeCounts,
    };
  }

  /**
   * Get paginated and filtered attendance history.
   */
  static async getHistory(filters: {
    date?: string;
    department?: string;
    purpose?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      where.checkInTime = { gte: start, lte: end };
    }

    if (filters.department) {
      where.department = filters.department;
    }

    if (filters.purpose) {
      where.purpose = filters.purpose;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { memberCode: { contains: q } },
        { department: { contains: q } },
        { phoneNumber: { contains: q } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        orderBy: { checkInTime: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update attendance record (Admin permission).
   */
  static async updateAttendance(id: string, data: any) {
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('រកមិនឃើញកំណត់ត្រាវត្តមាននេះទេ / Attendance record not found');
    }

    return prisma.attendance.update({
      where: { id },
      data: {
        ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
        ...(data.fullNameEnglish !== undefined ? { fullNameEnglish: data.fullNameEnglish ? data.fullNameEnglish.trim() : null } : {}),
        ...(data.telegramUsername !== undefined ? { telegramUsername: data.telegramUsername ? data.telegramUsername.trim().replace(/^@/, '') : null } : {}),
        ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber ? data.phoneNumber.trim() : null } : {}),
        ...(data.department ? { department: data.department.trim() } : {}),
        ...(data.gender ? { gender: data.gender } : {}),
        ...(data.memberType ? { memberType: data.memberType } : {}),
        ...(data.purpose ? { purpose: data.purpose } : {}),
        ...(data.purposeDetails !== undefined ? { purposeDetails: data.purposeDetails ? data.purposeDetails.trim() : null } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  /**
   * Delete attendance record (Admin permission).
   */
  static async deleteAttendance(id: string) {
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('រកមិនឃើញកំណត់ត្រាវត្តមាននេះទេ / Attendance record not found');
    }

    return prisma.attendance.delete({ where: { id } });
  }
}

