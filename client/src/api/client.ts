import axios from 'axios';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl.replace(/\/$/, '')}/api/v1`;
  }
  return '/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'LIBRARIAN' | 'STUDENT';
}

export interface BookItem {
  id: string;
  titleKhmer: string;
  titleEnglish: string;
  subtitle?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  authors: string[];
  publisher?: string | null;
  publicationYear?: number | null;
  edition?: string | null;
  language: string;
  categoryId: string;
  descriptionKhmer?: string | null;
  descriptionEnglish?: string | null;
  coverImageUrl?: string | null;
  category: {
    id: string;
    code: string;
    nameKhmer: string;
    nameEnglish: string;
  };
  availability?: {
    totalCopies: number;
    availableCopies: number;
    borrowedCopies: number;
    isAvailable: boolean;
  };
}

export interface BookCopyItem {
  id: string;
  bookId: string;
  accessionNumber: string;
  barcode: string;
  callNumber?: string | null;
  shelfLocation: string;
  status: 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'MAINTENANCE' | 'LOST';
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  acquisitionDate: string;
  notes?: string | null;
  book?: BookItem;
}

export interface MemberItem {
  id: string;
  memberCode: string;
  fullNameKhmer: string;
  fullNameEnglish: string;
  email: string;
  phoneNumber?: string | null;
  telegramUsername?: string | null;
  department: string;
  memberType: 'STUDENT' | 'FACULTY' | 'STAFF';
  maxActiveLoans: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  activeLoansCount?: number;
}

export interface LoanItem {
  id: string;
  bookCopyId: string;
  memberId: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'EXTENDED' | 'LOST';
  renewalCount: number;
  fineAmount: string;
  notes?: string | null;
  bookCopy: BookCopyItem & { book: BookItem };
  member: MemberItem;
  isOverdue?: boolean;
  overdueDays?: number;
}

