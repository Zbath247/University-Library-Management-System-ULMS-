import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { DUC_FACULTIES } from '../constants/academicStructure';
import {
  BookOpen,
  Layers,
  CheckCircle,
  Repeat,
  AlertCircle,
  Scan,
  Users,
  BarChart3,
  ArrowRight,
  UserCheck,
  Search,
  Tag,
  Calendar,
  MapPin,
  X,
  ExternalLink,
  Sparkles,
  XCircle,
  Clock,
  Send,
} from 'lucide-react';

// Faculty Filter Categories
const FACULTY_FILTERS = [
  { code: 'ALL', labelKhmer: 'សៀវភៅទាំងអស់', icon: '📚' },
  { code: 'GEN_CULTURE', labelKhmer: 'វប្បធម៌ទូទៅ & ប្រវត្តិសាស្ត្រ', icon: '🏛️' },
  { code: 'FDI', labelKhmer: 'ឧស្សាហកម្មឌីជីថល', icon: '💻' },
  { code: 'FLP', labelKhmer: 'នីតិសាស្ត្រ & នយោបាយ', icon: '⚖️' },
  { code: 'FDES', labelKhmer: 'សេដ្ឋកិច្ចឌីជីថល', icon: '📈' },
  { code: 'FARD', labelKhmer: 'កសិកម្ម & ជនបទ', icon: '🌾' },
  { code: 'FEA', labelKhmer: 'វិស្វកម្ម & ស្ថាបត្យកម្ម', icon: '⚙️' },
  { code: 'FOE', labelKhmer: 'ភាសាអង់គ្លេស', icon: '🇬🇧' },
];

// Reusable Book Cover Component with 3D Effect & Fallback
export const BookCoverCard: React.FC<{
  book: any;
  className?: string;
}> = ({ book, className = 'h-48' }) => {
  if (book?.coverImageUrl) {
    return (
      <div className={`relative overflow-hidden rounded-xl shadow-md border border-slate-200/80 bg-slate-100 group ${className}`}>
        <img
          src={book.coverImageUrl}
          alt={book.titleKhmer || 'Book Cover'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        {/* Book spine glossy reflection */}
        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 via-white/10 to-transparent pointer-events-none" />
      </div>
    );
  }

  // Fallback: Authentic Academic DUC Cover
  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-md border border-slate-200/80 bg-gradient-to-br from-duc-navy via-duc-blue to-slate-900 text-white p-3 flex flex-col justify-between ${className}`}
    >
      <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none" />
      
      <div className="pl-2">
        <div className="flex items-center gap-1.5 opacity-90">
          <img src="/logo.png" alt="DUC" className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-bold tracking-wider text-duc-gold uppercase">DUC Library</span>
        </div>
        <div className="text-[10px] font-semibold text-duc-gold/90 mt-1.5 line-clamp-1">
          {book?.category?.nameKhmer || 'សៀវភៅបណ្ណាល័យ'}
        </div>
      </div>

      <div className="pl-2 my-auto py-2">
        <h4 className="font-extrabold text-xs sm:text-sm text-white line-clamp-3 leading-snug drop-shadow-sm">
          {book?.titleKhmer}
        </h4>
        {book?.titleEnglish && book?.titleEnglish !== book?.titleKhmer && (
          <p className="text-[10px] text-slate-300 italic line-clamp-1 mt-0.5">
            {book.titleEnglish}
          </p>
        )}
      </div>

      <div className="pl-2 border-t border-white/10 pt-1.5 flex items-center justify-between text-[10px] text-slate-300">
        <span className="truncate max-w-[100px]">
          {Array.isArray(book?.authors) ? book.authors[0] : book?.authors || 'DUC Faculty'}
        </span>
        <span className="font-mono text-duc-gold text-[9px]">{book?.publicationYear || '2024'}</span>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<{ onOpenLoginModal: () => void }> = ({ onOpenLoginModal }) => {
  const { t } = useLanguage();
  const { isStaff } = useAuth();
  const navigate = useNavigate();

  // Metrics
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any>(null);
  const [circulation, setCirculation] = useState<any>(null);

  // Book Showcase State
  const [books, setBooks] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [selectedFaculty, setSelectedFaculty] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Book Detail Preview Modal
  const [previewBook, setPreviewBook] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Filter available departments dynamically based on chosen faculty
  const availableDepartments = useMemo(() => {
    if (selectedFaculty === 'ALL') {
      return DUC_FACULTIES.flatMap((f) => f.departments);
    }
    const faculty = DUC_FACULTIES.find((f) => f.code === selectedFaculty);
    return faculty ? faculty.departments : [];
  }, [selectedFaculty]);

  const handleSelectFaculty = (code: string) => {
    setSelectedFaculty(code);
    setSelectedDepartment('ALL');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, circRes] = await Promise.all([
          api.get('/reports/inventory').catch(() => ({ data: { data: null } })),
          api.get('/reports/circulation').catch(() => ({ data: { data: null } })),
        ]);
        setInventory(invRes.data?.data);
        setCirculation(circRes.data?.data);
      } finally {
        setLoading(false);
      }
    };

    if (isStaff) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isStaff]);

  // Fetch Books for Showcase
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoadingBooks(true);
        const res = await api.get('/books', {
          params: { limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
        });
        const items = Array.isArray(res.data?.data)
          ? res.data.data
          : (res.data?.data?.items || []);
        setBooks(items);
      } catch (err) {
        console.error('Failed to load books for showcase', err);
      } finally {
        setLoadingBooks(false);
      }
    };
    fetchBooks();
  }, []);

  // Filter books based on selected faculty, department and search query
  const filteredBooks = books.filter((b) => {
    const catCode = b.category?.code || '';

    // Faculty filter
    if (selectedFaculty !== 'ALL') {
      if (selectedFaculty === 'GEN_CULTURE') {
        if (!catCode.startsWith('CUL_') && !catCode.startsWith('GEN_CULTURE')) {
          return false;
        }
      } else if (!catCode.startsWith(selectedFaculty)) {
        return false;
      }
    }

    // Department filter
    if (selectedDepartment !== 'ALL') {
      if (catCode !== selectedDepartment) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchKhmer = b.titleKhmer?.toLowerCase().includes(q);
      const matchEnglish = b.titleEnglish?.toLowerCase().includes(q);
      const matchAuthors = Array.isArray(b.authors)
        ? b.authors.some((a: string) => a.toLowerCase().includes(q))
        : String(b.authors || '').toLowerCase().includes(q);
      const matchIsbn = b.isbn13?.includes(q) || b.isbn10?.includes(q);
      const matchDept = b.category?.nameKhmer?.toLowerCase().includes(q) || b.category?.nameEnglish?.toLowerCase().includes(q);
      if (!matchKhmer && !matchEnglish && !matchAuthors && !matchIsbn && !matchDept) {
        return false;
      }
    }

    return true;
  });

  // Open Preview Modal
  const handleOpenPreview = async (bookId: string) => {
    try {
      setPreviewLoading(true);
      const res = await api.get(`/books/${bookId}`);
      setPreviewBook(res.data?.data);
    } catch (err) {
      console.error('Failed to load book preview', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // One-Click Borrow Action
  const handleBorrowRequest = (book: any) => {
    const bookTitle = book.titleKhmer || book.titleEnglish || 'សៀវភៅ';
    navigate(`/checkin?book=${encodeURIComponent(bookTitle)}`);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-duc-blue via-duc-accent to-duc-navy rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 text-white shadow-xl border border-duc-gold/25 flex items-center justify-between gap-4 animate-fadeInDown">
        <div className="max-w-2xl">
          <span className="inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 bg-duc-gold/20 text-duc-gold border border-duc-gold/40 text-[11px] sm:text-xs font-bold rounded-full mb-1.5 sm:mb-2 shadow-xs">
            {t.institutionName}
          </span>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug">
            {t.systemTitle}
          </h1>
        </div>

        {/* University Official Crest */}
        <div className="hidden md:flex flex-col items-center justify-center p-3.5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md shadow-inner shrink-0 text-center transition-all duration-300 hover:scale-105">
          <img
            src="/logo.png"
            alt="Digital University of Cambodia Official Crest"
            className="w-16 h-16 lg:w-20 lg:h-20 object-contain drop-shadow-xl"
          />
        </div>
      </div>

      {/* KPI Cards (Live Database Metrics for Staff) */}
      {isStaff && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 animate-fadeInUp">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
            <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">{t.statsTotalTitles}</span>
              <BookOpen className="w-4 h-4 text-duc-blue shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-800">
              {inventory?.totalBooks ?? '—'}
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
            <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">{t.statsTotalCopies}</span>
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-800">
              {inventory?.totalCopies ?? '—'}
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
            <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">{t.statsAvailableCopies}</span>
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600">
              {inventory?.copiesByStatus?.available ?? '—'}
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default">
            <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">{t.statsActiveLoans}</span>
              <Repeat className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-blue-600">
              {circulation?.summary?.totalActiveLoans ?? '—'}
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default col-span-2 sm:col-span-1 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">{t.statsOverdueLoans}</span>
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-red-600">
              {circulation?.summary?.overdueLoans ?? '—'}
            </div>
          </div>
        </div>
      )}

      {/* Staff Quick Action Cards */}
      {isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeInUp">
          <Link
            to="/catalog"
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-duc-gold shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-duc-blue flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 group-hover:text-duc-blue transition mb-1">
                {t.navCatalog}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ស្វែងរកសៀវភៅតាមចំណងជើង អ្នកនិពន្ធ លេខ ISBN និងពិនិត្យចំនួនក្បាលសៀវភៅដែលអាចខ្ចីបានជាក់ស្តែង។
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-duc-blue gap-1">
              <span>ចូលមើលកាតាឡុក</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          <Link
            to="/scanner"
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-duc-gold shadow-sm hover:shadow transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                <Scan className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 group-hover:text-duc-blue transition mb-1">
                {t.navScanner}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ប្រើប្រាស់កាមេរ៉ាទូរស័ព្ទដើម្បីស្កេនក្របសៀវភៅ ស្រង់ទិន្នន័យដោយ OCR និង AI ហើយរក្សាទុកដោយស្វ័យប្រវត្តិ។
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-duc-blue gap-1">
              <span>បើកកម្មវិធីស្កេន AI</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          <Link
            to="/attendance"
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-duc-gold shadow-sm hover:shadow transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 group-hover:text-duc-blue transition mb-1">
                វត្តមាន & សំណើខ្ចី-សង
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                កត់ត្រាវត្តមាននិស្សិត ពិនិត្យអនុម័តសំណើខ្ចី ឬ សងសៀវភៅ និងតាមដានអ្នកនៅក្នុងបណ្ណាល័យជាក់ស្តែង។
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-duc-blue gap-1">
              <span>ទៅកាន់កន្លែងវត្តមាន & ខ្ចី-សង</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 FEATURED BOOKS & VISUAL SHOWCASE (FOR USERS & STUDENTS) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3.5 sm:p-6 lg:p-7 shadow-sm space-y-4 sm:space-y-6">
        {/* Showcase Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-3.5 sm:pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 sm:p-2 rounded-xl bg-duc-blue/10 text-duc-blue shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-duc-gold" />
              </span>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-800 tracking-tight leading-snug">
                សៀវភៅលេចធ្លោ & ឯកសារសិក្សាថ្មីៗ <span className="hidden sm:inline text-slate-400 font-semibold text-sm">(Featured Books)</span>
              </h2>
            </div>
            <p className="text-[11px] sm:text-sm text-slate-500 leading-tight">
              ស្វែងរកសៀវភៅតាមដេប៉ាតឺម៉ង់ និងចុចប៊ូតុង «ស្នើសុំខ្ចី» ដើម្បីកក់ទុក ឬខ្ចីភ្លាមៗ
            </p>
          </div>

          {/* Quick Search on Dashboard */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 top-2.5 sm:top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកចំណងជើង, អ្នកនិពន្ធ..."
              className="w-full pl-8 sm:pl-9 pr-8 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 sm:top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Faculty Filter Category Pills & Department Selector */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="-mx-1 px-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {FACULTY_FILTERS.map((f) => {
              const isSelected = selectedFaculty === f.code;
              return (
                <button
                  key={f.code}
                  onClick={() => handleSelectFaculty(f.code)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                    isSelected
                      ? 'bg-duc-blue text-duc-gold shadow-xs ring-2 ring-duc-gold/40'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.labelKhmer}</span>
                </button>
              );
            })}
          </div>

          {/* Department Sub-filter & Book Count Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/90 p-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 text-xs">
            <div className="flex flex-col xs:flex-row xs:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-600 flex items-center gap-1 shrink-0 text-[11px] sm:text-xs">
                <Tag className="w-3.5 h-3.5 text-duc-blue" />
                <span>ដេប៉ាតឺម៉ង់ (Department):</span>
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full sm:w-auto text-[11px] sm:text-xs font-medium bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-duc-blue cursor-pointer shadow-xs truncate"
                >
                  <option value="ALL">-- គ្រប់ដេប៉ាតឺម៉ង់ទាំងអស់ ({availableDepartments.length}) --</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept.code} value={dept.code}>
                      {dept.nameKhmer}
                    </option>
                  ))}
                </select>

                {selectedDepartment !== 'ALL' && (
                  <button
                    onClick={() => setSelectedDepartment('ALL')}
                    className="text-[10px] sm:text-[11px] text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded bg-rose-50 border border-rose-200 active:scale-95 transition whitespace-nowrap shrink-0"
                  >
                    សម្អាត
                  </button>
                )}
              </div>
            </div>

            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs self-start sm:self-auto">
              បង្ហាញសៀវភៅ <span className="font-bold text-duc-blue">{filteredBooks.length}</span> ក្បាល
            </div>
          </div>
        </div>

        {/* Books Grid with Visual Covers */}
        {loadingBooks ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            កំពុងទាញយកបញ្ជីសៀវភៅ...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700">មិនមានសៀវភៅត្រូវនឹងការស្វែងរកទេ</h4>
            <p className="text-xs text-slate-400 mt-1">សូមសាកល្បងជ្រើសរើសមហាវិទ្យាល័យ ឬពាក្យគន្លឹះផ្សេងទៀត</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
            {filteredBooks.map((book) => {
              const isAvail = (book.availability?.availableCopies ?? 0) > 0;
              return (
                <div
                  key={book.id}
                  className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 p-2.5 sm:p-3.5 flex flex-col justify-between group"
                >
                  <div>
                    {/* Visual Book Cover with 3D Effect */}
                    <div
                      onClick={() => handleOpenPreview(book.id)}
                      className="cursor-pointer mb-2 sm:mb-3 relative"
                    >
                      <BookCoverCard book={book} className="h-36 sm:h-52 w-full" />

                      {/* Floating Category Tag */}
                      <span className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 text-[8px] sm:text-[10px] font-bold text-white bg-slate-900/80 backdrop-blur-md px-1.5 py-0.5 rounded shadow-xs max-w-[85px] sm:max-w-[140px] truncate">
                        {book.category?.nameKhmer || book.category?.code}
                      </span>

                      {/* Availability Badge */}
                      <span
                        className={`absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 ${
                          isAvail
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {isAvail ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            <span>នៅសល់ {book.availability?.availableCopies}</span>
                          </>
                        ) : (
                          <span>ខ្ចីអស់</span>
                        )}
                      </span>
                    </div>

                    {/* Book Metadata */}
                    <h3
                      onClick={() => handleOpenPreview(book.id)}
                      className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-duc-blue transition line-clamp-2 cursor-pointer leading-snug mb-1"
                      title={book.titleKhmer}
                    >
                      {book.titleKhmer}
                    </h3>
                    {book.titleEnglish && book.titleEnglish !== book.titleKhmer && (
                      <p className="text-[10px] sm:text-[11px] text-slate-400 italic line-clamp-1 mb-1">
                        {book.titleEnglish}
                      </p>
                    )}

                    <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1 mb-1.5 sm:mb-2">
                      <span className="text-slate-400">អ្នកនិពន្ធ:</span>
                      <span className="font-semibold text-slate-700 truncate">
                        {Array.isArray(book.authors) ? book.authors[0] : book.authors}
                      </span>
                    </p>
                  </div>

                  {/* Actions: Preview & 1-Click Borrow */}
                  <div className="pt-2 sm:pt-3 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => handleOpenPreview(book.id)}
                      className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] sm:text-xs font-semibold rounded-lg transition"
                      title="ពិនិត្យព័ត៌មានលម្អិត & ទីតាំងធ្នើ"
                    >
                      លម្អិត
                    </button>

                    <button
                      onClick={() => handleBorrowRequest(book)}
                      className="flex-1 py-1 sm:py-1.5 px-2 sm:px-3 bg-duc-blue hover:bg-duc-navy text-duc-gold font-bold text-[10px] sm:text-xs rounded-lg transition flex items-center justify-center gap-1 shadow-xs active:scale-95"
                    >
                      <span>ស្នើសុំខ្ចី</span>
                      <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All in Catalog Link */}
        <div className="text-center pt-2">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-duc-blue hover:text-duc-gold text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition group shadow-sm"
          >
            <span>ចូលមើលកាតាឡុកសៀវភៅទាំងអស់</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUICK BOOK PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scaleIn">
            {/* Header */}
            <div className="bg-duc-blue p-5 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-duc-gold" />
                <h3 className="font-bold text-base">ព័ត៌មានលម្អិតសៀវភៅ</h3>
              </div>
              <button
                onClick={() => setPreviewBook(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-duc-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Cover & Main Info */}
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-36 sm:w-44 shrink-0 mx-auto sm:mx-0">
                  <BookCoverCard book={previewBook} className="h-56 w-full shadow-lg" />
                </div>

                <div className="flex-1 space-y-2">
                  <span className="text-xs font-bold text-duc-blue bg-blue-50 px-2.5 py-0.5 rounded-md inline-block">
                    {previewBook.category?.nameKhmer || previewBook.category?.nameEnglish || ''}
                  </span>

                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                    {previewBook.titleKhmer}
                  </h2>
                  {previewBook.titleEnglish && (
                    <p className="text-xs text-slate-500 italic">
                      {previewBook.titleEnglish}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block font-semibold">អ្នកនិពន្ធ:</span>
                      <span className="font-medium">
                        {Array.isArray(previewBook.authors)
                          ? previewBook.authors.join(', ')
                          : previewBook.authors}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">រោងពុម្ព:</span>
                      <span className="font-medium">{previewBook.publisher || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">ឆ្នាំបោះពុម្ព:</span>
                      <span className="font-medium">{previewBook.publicationYear || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">ISBN-13:</span>
                      <span className="font-mono">{previewBook.isbn13 || '—'}</span>
                    </div>
                  </div>

                  {/* 1-Click Borrow Button */}
                  <div className="pt-3">
                    <button
                      onClick={() => {
                        handleBorrowRequest(previewBook);
                        setPreviewBook(null);
                      }}
                      className="w-full py-2.5 px-4 bg-duc-blue hover:bg-duc-navy text-duc-gold font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md active:scale-95"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>ស្នើសុំខ្ចីសៀវភៅនេះ ➜</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              {previewBook.descriptionKhmer && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-duc-gold" />
                    <span>សង្ខេបខ្លឹមសារ៖</span>
                  </div>
                  <p>{previewBook.descriptionKhmer}</p>
                </div>
              )}

              {/* Physical Copies & Shelf Location */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>ទីតាំងធ្នើ និងក្បាលសៀវភៅរូបវន្ត ({previewBook.copies?.length || 0} ក្បាល)</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">លេខកូដបាកូដ</th>
                        <th className="py-2 px-3">ទីតាំងធ្នើ (Shelf)</th>
                        <th className="py-2 px-3 text-right">ស្ថានភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewBook.copies?.map((copy: any) => (
                        <tr key={copy.id}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-700">
                            {copy.accessionNumber}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-medium">
                            📍 {copy.shelfLocation || 'ធ្នើទូទៅ'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                copy.status === 'AVAILABLE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {copy.status === 'AVAILABLE' ? 'នៅសល់លើធ្នើ' : 'ត្រូវបានខ្ចី'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;

