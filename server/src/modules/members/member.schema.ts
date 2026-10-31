import { z } from 'zod';
import { MemberType, MemberStatus } from '../../types/enums';

export const memberQuerySchema = z.object({
  q: z.string().optional(),
  department: z.string().optional(),
  status: z.nativeEnum(MemberStatus).optional(),
  memberType: z.nativeEnum(MemberType).optional(),
  page: z.string().optional().default('1').transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z.string().optional().default('10').transform((val) => Math.min(50, Math.max(1, parseInt(val, 10) || 10))),
});

export const createMemberSchema = z.object({
  memberCode: z.string().min(1, 'Member code is required').trim(),
  fullNameKhmer: z.string().min(1, 'Khmer name is required').trim(),
  fullNameEnglish: z.string().min(1, 'English name is required').trim(),
  email: z.string().email('Valid email is required'),
  phoneNumber: z.string().optional().nullable(),
  department: z.string().min(1, 'Department is required').trim(),
  memberType: z.nativeEnum(MemberType).default(MemberType.STUDENT),
  maxActiveLoans: z.number().int().min(1).default(3),
  status: z.nativeEnum(MemberStatus).default(MemberStatus.ACTIVE),
});

export const updateMemberSchema = createMemberSchema.partial();

