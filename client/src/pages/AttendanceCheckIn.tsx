import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DUC_FACULTIES } from '../constants/academicStructure';
import {
  UserCheck,
  CheckCircle,
  LogOut,
  LogIn,
  BookOpen,
  Search,
  RefreshCw,
  Clock,
  Laptop,
  GraduationCap,
  Sparkles,
  Edit2,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  Send,
  AtSign,
  ArrowLeft,
} from 'lucide-react';

interface VisitorProfile {
  memberCode: string;
  fullName: string;
  fullNameEnglish?: string;
  telegramUsername?: string;
  gender: string;
  memberType: string;
  department: string;
  phoneNumber: string;
}

const STORAGE_KEY = 'duc_library_visitor_profile';

const PURPOSES = [
  { id: 'READING', labelKhmer: 'អានសៀវភៅ', labelEn: 'Reading / Self-Study', icon: BookOpen, color: 'blue' },
  { id: 'RESEARCH', labelKhmer: 'ស្រាវជ្រាវ', labelEn: 'Research & Project', icon: Search, color: 'indigo' },
  { id: 'BORROW_RETURN', labelKhmer: 'ខ្ចី ឬ សងសៀវភៅ', labelEn: 'Borrow / Return Books', icon: RefreshCw, color: 'amber' },
  { id: 'COMPUTER', labelKhmer: 'ប្រើកុំព្យូទ័រ / អ៊ីនធឺណិត', labelEn: 'Computer & Internet', icon: Laptop, color: 'emerald' },
  { id: 'OTHER', labelKhmer: 'ផ្សេងៗ', labelEn: 'Other Activities', icon: Layers, color: 'slate' },
];

export const AttendanceCheckIn: React.FC = () => {
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form Fields
  const [memberCode, setMemberCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [fullNameEnglish, setFullNameEnglish] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [gender, setGender] = useState('MALE');
  const [memberType, setMemberType] = useState('STUDENT');
  const [department, setDepartment] = useState('បណ្ដាញកុំព្យូទ័រ និងប្រព័ន្ធសុវត្ថិភាព (FDI_CNSS)');
  const [selectedFacultyCode, setSelectedFacultyCode] = useState('FDI');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('READING');
  const [purposeDetails, setPurposeDetails] = useState('');

  const findFacultyByDept = (deptStr: string): string => {
    if (!deptStr) return 'FDI';
    for (const fac of DUC_FACULTIES) {
      if (
        deptStr.includes(fac.code) ||
        fac.departments.some((d) => deptStr.includes(d.nameKhmer) || deptStr.includes(d.code))
      ) {
        return fac.code;
      }
    }
    return 'FDI';
  };

  const activeFaculty = DUC_FACULTIES.find((f) => f.code === selectedFacultyCode) || DUC_FACULTIES[0];

  const handleFacultyChange = (code: string) => {
    setSelectedFacultyCode(code);
    const fac = DUC_FACULTIES.find((f) => f.code === code);
    if (fac && fac.departments.length > 0) {
      const firstDept = fac.departments[0];
      setDepartment(`${firstDept.nameKhmer} (${firstDept.code})`);
    }
  };

  // Dedicated Borrow/Return details
  const [borrowReturnOp, setBorrowReturnOp] = useState<'BORROW' | 'RETURN' | 'BOTH'>('BORROW');
  const [bookTitles, setBookTitles] = useState('');
  const [bookQuantity, setBookQuantity] = useState(1);

  // Search by code modal
  const [lookupCode, setLookupCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  // Load profile from localStorage on mount & handle incoming book request query
  useEffect(() => {
    // Check if user came from 1-Click Borrow button on Dashboard
    const params = new URLSearchParams(window.location.search);
    const bookParam = params.get('book');
    if (bookParam) {
      setSelectedPurpose('BORROW_RETURN');
      setBorrowReturnOp('BORROW');
      setBookTitles(decodeURIComponent(bookParam));
      setBookQuantity(1);
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setMemberCode(parsed.memberCode || '');
        setFullName(parsed.fullName || '');
        setFullNameEnglish(parsed.fullNameEnglish || '');
        setTelegramUsername(parsed.telegramUsername || '');
        setGender(parsed.gender || 'MALE');
        setMemberType(parsed.memberType || 'STUDENT');
        const deptVal = parsed.department || 'បណ្ដាញកុំព្យូទ័រ និងប្រព័ន្ធសុវត្ថិភាព (FDI_CNSS)';
        setDepartment(deptVal);
        setSelectedFacultyCode(findFacultyByDept(deptVal));
        setPhoneNumber(parsed.phoneNumber || '');
        checkActiveSession(parsed.memberCode);
      } catch (e) {
        setIsEditing(true);
      }
    } else {
      setIsEditing(true);
    }
  }, []);

  // Check if visitor is currently checked in
  const checkActiveSession = async (code: string, showFeedback = false) => {
    if (!code) return;
    try {
      if (showFeedback) setIsRefreshing(true);
      const res = await api.get(`/attendance/lookup/${encodeURIComponent(code)}`);
      const session = res.data?.data?.currentSession;
      if (session) {
        setActiveSession(session);
        if (showFeedback) {
          if (session.status === 'PENDING_APPROVAL') {
            setSuccessMessage('⏳ សំណើរបស់អ្នកកំពុងស្ថិតក្នុង [រង់ចាំការអនុម័ត] នៅឡើយ សូមរង់ចាំ Admin អនុម័តបន្តិច!');
          } else if (session.status === 'CHECKED_IN') {
            setSuccessMessage('🎉 សំណើត្រូវបានអនុម័តរួចរាល់ហើយ!');
          }
        }
      } else {
        setActiveSession(null);
        if (showFeedback) {
          setSuccessMessage('ℹ️ មិនមានសំណើសកម្មទេ ឬសំណើត្រូវបានបញ្ចប់/បោះបង់រួចរាល់។');
        }
      }
    } catch (e) {
      if (showFeedback) {
        setErrorMessage('បរាជ័យក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនបម្រើ');
      }
    } finally {
      if (showFeedback) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  // Auto-poll status when session is pending approval
  useEffect(() => {
    if (!profile?.memberCode) return;
    if (activeSession?.status === 'PENDING_APPROVAL') {
      const interval = setInterval(() => {
        checkActiveSession(profile.memberCode);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeSession?.status, profile?.memberCode]);

  // Handle Lookup for existing student
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setLookingUp(true);
    setErrorMessage(null);

    try {
      const res = await api.get(`/attendance/lookup/${encodeURIComponent(lookupCode.trim())}`);
      const data = res.data?.data;
      if (data?.profile) {
        const p: VisitorProfile = {
          memberCode: data.profile.memberCode,
          fullName: data.profile.fullName,
          fullNameEnglish: data.profile.fullNameEnglish || '',
          telegramUsername: data.profile.telegramUsername || '',
          gender: data.profile.gender || 'MALE',
          memberType: data.profile.memberType || 'STUDENT',
          department: data.profile.department || department,
          phoneNumber: data.profile.phoneNumber || '',
        };
        setProfile(p);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
        setMemberCode(p.memberCode);
        setFullName(p.fullName);
        setFullNameEnglish(p.fullNameEnglish || '');
        setTelegramUsername(p.telegramUsername || '');
        setGender(p.gender);
        setMemberType(p.memberType);
        setDepartment(p.department);
        setSelectedFacultyCode(findFacultyByDept(p.department));
        setPhoneNumber(p.phoneNumber);
        setActiveSession(data.currentSession || null);
        setIsEditing(false);
        setSuccessMessage('បានស្វែងរកឃើញព័ត៌មានរបស់អ្នកដោយជោគជ័យ!');
      } else {
        setErrorMessage('មិនទាន់មានទិន្នន័យអត្តលេខនេះទេ។ សូមបំពេញព័ត៌មានថ្មីខាងក្រោម។');
        setMemberCode(lookupCode.trim().toUpperCase());
      }
    } catch (err: any) {
      setErrorMessage('មិនអាចស្វែងរកទិន្នន័យបានទេ។ សូមបំពេញទម្រង់ដោយផ្ទាល់។');
    } finally {
      setLookingUp(false);
    }
  };

  const computeFinalPurposeDetails = (): string | undefined => {
    if (selectedPurpose === 'BORROW_RETURN') {
      const opText =
        borrowReturnOp === 'BORROW'
          ? 'ខ្ចីសៀវភៅ'
          : borrowReturnOp === 'RETURN'
          ? 'សងសៀវភៅ'
          : 'ខ្ចី និងសងសៀវភៅ';
      const titles = bookTitles.trim() || 'មិនបានបញ្ជាក់ចំណងជើង';
      return `${opText}: «${titles}» (ចំនួន ${bookQuantity} ក្បាល)`;
    }
    if (selectedPurpose === 'OTHER') {
      return purposeDetails.trim() || undefined;
    }
    return undefined;
  };

  // Submit First-Time or Edited Profile + Check In
  const handleSaveAndCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberCode.trim() || !fullName.trim() || !fullNameEnglish.trim() || !department.trim()) {
      setErrorMessage('សូមបំពេញព័ត៌មានចាំបាច់ (អត្តលេខ, ឈ្មោះខ្មែរ, ឈ្មោះឡាតាំង, ដេប៉ាតឺម៉ង់)');
      return;
    }

    if (selectedPurpose === 'BORROW_RETURN' && !bookTitles.trim()) {
      setErrorMessage('សូមបញ្ចូលចំណងជើងសៀវភៅដែលត្រូវខ្ចី ឬសង (Book Title is required)');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const sanitizedTelegram = telegramUsername.trim().replace(/^@/, '');

    const updatedProfile: VisitorProfile = {
      memberCode: memberCode.trim().toUpperCase(),
      fullName: fullName.trim(),
      fullNameEnglish: fullNameEnglish.trim(),
      telegramUsername: sanitizedTelegram,
      gender,
      memberType,
      department: department.trim(),
      phoneNumber: phoneNumber.trim(),
    };

    try {
      const finalDetails = computeFinalPurposeDetails();
      const res = await api.post('/attendance/check-in', {
        ...updatedProfile,
        purpose: selectedPurpose,
        purposeDetails: finalDetails,
      });

      // Save locally
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      setIsEditing(false);
      setActiveSession(res.data?.data?.record);
      setSuccessMessage('🎉 បានកត់ត្រាវត្តមានចូលបណ្ណាល័យដោយជោគជ័យ!');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'បរាជ័យក្នុងការកត់ត្រាវត្តមាន');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Check In for Returning Visitors
  const handleQuickCheckIn = async () => {
    if (!profile) return;

    if (selectedPurpose === 'BORROW_RETURN' && !bookTitles.trim()) {
      setErrorMessage('សូមបញ្ចូលចំណងជើងសៀវភៅដែលត្រូវខ្ចី ឬសង (Book Title is required)');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const finalDetails = computeFinalPurposeDetails();
      const res = await api.post('/attendance/check-in', {
        memberCode: profile.memberCode,
        fullName: profile.fullName,
        fullNameEnglish: profile.fullNameEnglish,
        telegramUsername: profile.telegramUsername,
        gender: profile.gender,
        memberType: profile.memberType,
        department: profile.department,
        phoneNumber: profile.phoneNumber,
        purpose: selectedPurpose,
        purposeDetails: finalDetails,
      });

      setActiveSession(res.data?.data?.record);
      setSuccessMessage('🎉 ស្វាគមន៍មកកាន់បណ្ណាល័យ! បានកត់ត្រាវត្តមានចូលដោយជោគជ័យ។');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'បរាជ័យក្នុងការកត់ត្រាវត្តមាន');
    } finally {
      setLoading(false);
    }
  };

  // Check Out
  const handleCheckOut = async () => {
    if (!profile) return;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.post('/attendance/check-out', {
        memberCode: profile.memberCode,
        attendanceId: activeSession?.id,
      });

      const duration = res.data?.data?.durationMinutes ?? 0;
      setActiveSession(null);
      setSuccessMessage(
        `👋 អរគុណសម្រាប់ការអាន និងស្រាវជ្រាវ! បានកត់ត្រាការចាកចេញដោយជោគជ័យ (រយៈពេលស្នាក់នៅ: ${duration} នាទី)។`
      );
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'បរាជ័យក្នុងការកត់ត្រាការចាកចេញ');
    } finally {
      setLoading(false);
    }
  };

  const renderBorrowReturnDetails = () => {
    if (selectedPurpose !== 'BORROW_RETURN') return null;

    return (
      <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/40 space-y-3 animate-fadeIn my-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ព័ត៌មានសៀវភៅខ្ចី ឬ សង (Book Details)</span>
          </div>
          <span className="text-[10px] text-amber-300 font-bold bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30">
            ចាំបាច់បំពេញ *
          </span>
        </div>

        {/* Operation Type: ខ្ចី vs សង */}
        <div>
          <label className="block text-[11px] font-bold text-slate-200 mb-1">
            ប្រតិបត្តិការ (Operation Type) *
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setBorrowReturnOp('BORROW')}
              className={`py-1.5 px-2 rounded-md text-xs font-bold transition text-center ${
                borrowReturnOp === 'BORROW'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              ខ្ចីសៀវភៅ
            </button>
            <button
              type="button"
              onClick={() => setBorrowReturnOp('RETURN')}
              className={`py-1.5 px-2 rounded-md text-xs font-bold transition text-center ${
                borrowReturnOp === 'RETURN'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              សងសៀវភៅ
            </button>
            <button
              type="button"
              onClick={() => setBorrowReturnOp('BOTH')}
              className={`py-1.5 px-2 rounded-md text-xs font-bold transition text-center ${
                borrowReturnOp === 'BOTH'
                  ? 'bg-amber-400 text-slate-900 shadow'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              ខ្ចីផង សងផង
            </button>
          </div>
        </div>

        {/* Book Title Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-200 mb-1">
            ចំណងជើងសៀវភៅ (Book Title / Titles) *
          </label>
          <input
            type="text"
            required
            placeholder="ឧ. មូលដ្ឋានគ្រឹះបណ្តាញកុំព្យូទ័រ, ច្បាប់ពាណិជ្ជកម្ម..."
            value={bookTitles}
            onChange={(e) => setBookTitles(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-black/40 border border-white/20 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Quantity Stepper */}
        <div>
          <label className="block text-[11px] font-bold text-slate-200 mb-1">
            ចំនួនក្បាលសៀវភៅ (Quantity) *
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBookQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-base flex items-center justify-center transition active:scale-95 border border-white/15"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={10}
              value={bookQuantity}
              onChange={(e) => setBookQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 p-1.5 text-center font-bold text-sm text-amber-300 bg-black/40 rounded-lg border border-white/20 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setBookQuantity((q) => Math.min(10, q + 1))}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-base flex items-center justify-center transition active:scale-95 border border-white/15"
            >
              +
            </button>
            <span className="text-xs text-slate-300 font-medium">ក្បាលសៀវភៅ (Copies)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-duc-navy to-slate-900 text-slate-100 flex flex-col justify-between p-3 sm:p-6 overflow-x-hidden">
      <div className="max-w-md w-full mx-auto my-auto py-3 sm:py-6 min-w-0">
        {/* University Header */}
        <div className="text-center mb-5">
          <Link
            to="/"
            className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-duc-gold/40 shadow-2xl mb-2.5 hover:scale-105 transition-transform duration-300 group"
            title="ត្រឡប់ទៅកាន់ទំព័រដើម / Back to Dashboard"
          >
            <img
              src="/logo.png"
              alt="Digital University of Cambodia Official Crest"
              className="w-16 h-16 sm:w-24 sm:h-24 object-contain drop-shadow-xl"
            />
          </Link>
          <Link to="/" className="block group">
            <h1 className="text-base sm:text-xl font-bold text-white tracking-wide group-hover:text-duc-gold transition-colors">
              សាកលវិទ្យាល័យឌីជីថលកម្ពុជា
            </h1>
          </Link>
          <p className="text-[11px] sm:text-xs text-duc-gold/90 font-medium mt-0.5">
            DIGITAL UNIVERSITY OF CAMBODIA • បណ្ណាល័យ
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-duc-gold/20 border border-duc-gold/40 text-duc-gold text-xs font-bold">
            <UserCheck className="w-3.5 h-3.5" />
            <span>កត់ត្រាវត្តមានចូល-ចេញបណ្ណាល័យ</span>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* MAIN CARD CONTAINER */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl w-full box-border overflow-hidden">
          {/* STATE 1: ACTIVE IN LIBRARY OR PENDING APPROVAL */}
          {activeSession && !isEditing ? (
            activeSession.status === 'PENDING_APPROVAL' ? (
              <div className="text-center space-y-5 animate-scaleIn">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 shadow-lg shadow-amber-500/20 animate-pulse">
                  <Clock className="w-9 h-9" />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/40">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    រង់ចាំ Admin / បណ្ណារក្ស អនុម័ត
                  </span>
                  <h2 className="text-xl font-bold text-white mt-2">
                    {profile?.fullName}
                    {profile?.fullNameEnglish && (
                      <span className="text-sm text-duc-gold font-normal ml-2">({profile.fullNameEnglish})</span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    {profile?.memberCode} • {profile?.department}
                  </p>
                  {profile?.telegramUsername && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
                        <Send className="w-2.5 h-2.5" /> @{profile.telegramUsername.replace(/^@/, '')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Requested Details Box */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 text-left text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" /> ម៉ោងស្នើសុំ៖
                    </span>
                    <span className="font-medium text-white">
                      {new Date(activeSession.checkInTime).toLocaleTimeString('km-KH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-amber-400" /> គោលបំណង៖
                    </span>
                    <span className="font-semibold text-amber-300">ខ្ចី ឬ សងសៀវភៅ</span>
                  </div>

                  {activeSession.purposeDetails && (
                    <div className="pt-2 border-t border-amber-400/20 text-left">
                      <div className="text-[11px] text-amber-300/80 font-semibold mb-1">ព័ត៌មានសៀវភៅដែលបានស្នើ៖</div>
                      <div className="text-xs text-amber-200 font-bold bg-black/40 p-2.5 rounded-lg border border-amber-400/20 break-words">
                        {activeSession.purposeDetails}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-200 text-xs text-left flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    សំណើខ្ចី/សងរបស់អ្នកត្រូវបានបញ្ជូនទៅ Admin/បណ្ណារក្សរួចរាល់ហើយ។ សូមរង់ចាំការអនុម័ត (ប្រព័ន្ធនឹង update ដោយស្វ័យប្រវត្តិ)។
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isRefreshing}
                    onClick={() => profile?.memberCode && checkActiveSession(profile.memberCode, true)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 text-duc-gold ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'កំពុងពិនិត្យ...' : 'ពិនិត្យស្ថានភាពម្តងទៀត'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCheckOut()}
                    className="py-3 px-3.5 rounded-xl font-bold text-xs bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                  >
                    បោះបង់
                  </button>
                </div>
              </div>
            ) : (
              /* Already Approved (Status: CHECKED_IN) */
              <div className="text-center space-y-5 animate-scaleIn">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-lg shadow-emerald-500/20 animate-pulse">
                  <CheckCircle className="w-9 h-9" />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    កំពុងស្ថិតក្នុងបណ្ណាល័យ (បានអនុម័ត)
                  </span>
                  <h2 className="text-xl font-bold text-white mt-2">
                    {profile?.fullName}
                    {profile?.fullNameEnglish && (
                      <span className="text-sm text-duc-gold font-normal ml-2">({profile.fullNameEnglish})</span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    {profile?.memberCode} • {profile?.department}
                  </p>
                  {profile?.telegramUsername && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
                        <Send className="w-2.5 h-2.5" /> @{profile.telegramUsername.replace(/^@/, '')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-black/25 border border-white/10 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-duc-gold" /> ម៉ោងចូល៖
                    </span>
                    <span className="font-medium text-white">
                      {new Date(activeSession.checkInTime).toLocaleTimeString('km-KH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-duc-gold" /> គោលបំណង៖
                    </span>
                    <span className="font-semibold text-duc-gold">
                      {PURPOSES.find((p) => p.id === activeSession.purpose)?.labelKhmer || activeSession.purpose}
                    </span>
                  </div>
                  {activeSession.purposeDetails && (
                    <div className="pt-2 border-t border-white/10 text-left">
                      <div className="text-[11px] text-slate-400 font-semibold mb-0.5">ព័ត៌មានសៀវភៅខ្ចី/សង៖</div>
                      <div className="text-xs text-amber-300 font-bold bg-amber-500/10 p-2 rounded-lg border border-amber-400/30">
                        {activeSession.purposeDetails}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{loading ? 'កំពុងកត់ត្រា...' : 'ចុចទីនេះដើម្បី «ចេញពីបណ្ណាល័យ»'}</span>
                </button>
              </div>
            )
          ) : !isEditing && profile ? (
            /* STATE 2: RETURNING VISITOR (1-CLICK CHECK-IN) */
            <div className="space-y-5 animate-fadeIn">
              {/* User greeting chip */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-duc-blue flex items-center justify-center font-bold text-duc-gold border border-duc-gold/40 text-base shrink-0">
                    {profile.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-white text-sm">{profile.fullName}</h3>
                      {profile.fullNameEnglish && (
                        <span className="text-xs text-duc-gold/90 font-medium">({profile.fullNameEnglish})</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                      {profile.memberCode} • {profile.department}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {profile.phoneNumber && (
                        <span className="text-[10px] text-slate-300">📞 {profile.phoneNumber}</span>
                      )}
                      {profile.telegramUsername && (
                        <a
                          href={`https://t.me/${profile.telegramUsername.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[10px] text-sky-300 hover:text-white transition"
                        >
                          <Send className="w-2.5 h-2.5 text-sky-400" />
                          <span>@{profile.telegramUsername.replace(/^@/, '')}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  title="កែប្រែព័ត៌មាន"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Purpose Selector */}
              <div>
                <label className="block text-xs font-bold text-duc-gold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ជ្រើសរើសគោលបំណងនៃការចូលបណ្ណាល័យ៖</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSES.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedPurpose === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedPurpose(item.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-duc-blue/80 border-duc-gold shadow-md shadow-duc-gold/20 ring-1 ring-duc-gold'
                            : 'bg-black/20 border-white/10 hover:bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-duc-gold' : 'text-slate-400'}`} />
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {item.labelKhmer}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{item.labelEn}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated Borrow/Return details */}
              {renderBorrowReturnDetails()}

              {/* Details if other or specific */}
              {selectedPurpose === 'OTHER' && (
                <input
                  type="text"
                  placeholder="បញ្ជាក់គោលបំណងផ្សេងៗ..."
                  value={purposeDetails}
                  onChange={(e) => setPurposeDetails(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-black/30 border border-white/20 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-duc-gold"
                />
              )}

              {/* One-Click Check-in Button */}
              <button
                onClick={handleQuickCheckIn}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-duc-gold via-amber-400 to-duc-gold text-slate-900 shadow-lg shadow-duc-gold/25 flex items-center justify-center gap-2 hover:opacity-95 transition transform active:scale-95 disabled:opacity-50"
              >
                <LogIn className="w-5 h-5 text-slate-900" />
                <span>{loading ? 'កំពុងកត់ត្រា...' : 'ចូលបណ្ណាល័យឥឡូវនេះ (Check-in)'}</span>
              </button>

              <div className="text-center pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-slate-400 hover:text-duc-gold transition underline"
                >
                  មិនមែនជាអ្នកមែនទេ? ប្តូរគណនី ឬចុះឈ្មោះថ្មី
                </button>
              </div>
            </div>
          ) : (
            /* STATE 3: FIRST-TIME REGISTRATION OR EDIT FORM */
            <form onSubmit={handleSaveAndCheckIn} className="space-y-4 animate-fadeIn">
              <div className="border-b border-white/10 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-duc-gold" />
                  <span>ព័ត៌មានផ្ទាល់ខ្លួន (ចុះឈ្មោះលើកដំបូង)</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  បំពេញតែម្តងគត់ ប្រព័ន្ធនឹងចងចាំព័ត៌មានរបស់អ្នកសម្រាប់លើកក្រោយៗ។
                </p>
              </div>

              {/* Quick ID lookup accordion */}
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមអត្តលេខនិស្សិត ឬទូរស័ព្ទ..."
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value)}
                    className="flex-1 p-2 rounded bg-black/40 border border-white/15 text-white text-xs placeholder:text-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={lookingUp}
                    className="px-3 py-2 bg-duc-blue hover:bg-duc-accent text-white font-bold rounded text-xs transition"
                  >
                    {lookingUp ? 'ស្វែងរក...' : 'ទាញយក'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  អត្តលេខនិស្សិត / សាស្រ្តាចារ្យ (ID Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. DUC-STU-2024-001"
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 rounded-lg bg-black/30 border border-white/20 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-duc-gold font-mono"
                />
              </div>

              {/* Names: Khmer & Latin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    ឈ្មោះពេញជាភាសាខ្មែរ (Khmer Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. ម៉ុក សម្បត្តិ"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/30 border border-white/20 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-duc-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-duc-gold mb-1">
                    ឈ្មោះឡាតាំង (Latin Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ឧ. MOK SAMBATH"
                    value={fullNameEnglish}
                    onChange={(e) => setFullNameEnglish(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/30 border border-duc-gold/40 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-duc-gold font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">ប្រភេទសមាជិក</label>
                  <select
                    value={memberType}
                    onChange={(e) => setMemberType(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-white/20 text-white text-xs focus:outline-none focus:ring-2 focus:ring-duc-gold"
                  >
                    <option value="STUDENT">និស្សិត (Student)</option>
                    <option value="FACULTY">សាស្រ្តាចារ្យ (Faculty)</option>
                    <option value="STAFF">បុគ្គលិក (Staff)</option>
                    <option value="VISITOR">ភ្ញៀវទូទៅ (Visitor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">ភេទ (Gender)</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-white/20 text-white text-xs focus:outline-none focus:ring-2 focus:ring-duc-gold"
                  >
                    <option value="MALE">ប្រុស (Male)</option>
                    <option value="FEMALE">ស្រី (Female)</option>
                  </select>
                </div>
              </div>

              {/* Faculty & Department (2-Step Mobile-Friendly Dropdowns) */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    ១. មហាវិទ្យាល័យ (Faculty) *
                  </label>
                  <select
                    value={selectedFacultyCode}
                    onChange={(e) => handleFacultyChange(e.target.value)}
                    className="w-full max-w-full p-2.5 rounded-lg bg-slate-800 border border-white/20 text-white text-xs focus:outline-none focus:ring-2 focus:ring-duc-gold truncate cursor-pointer"
                  >
                    {DUC_FACULTIES.map((fac) => (
                      <option key={fac.code} value={fac.code}>
                        {fac.nameKhmer} ({fac.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-duc-gold mb-1">
                    ២. ដេប៉ាតឺម៉ង់ (Department) *
                  </label>
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full max-w-full p-2.5 rounded-lg bg-slate-800 border border-duc-gold/40 text-white text-xs focus:outline-none focus:ring-2 focus:ring-duc-gold truncate cursor-pointer font-medium"
                  >
                    {activeFaculty.departments.map((dept) => (
                      <option key={dept.code} value={`${dept.nameKhmer} (${dept.code})`}>
                        {dept.nameKhmer} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact: Phone & Telegram Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    លេខទូរស័ព្ទ (Phone Number)
                  </label>
                  <input
                    type="tel"
                    placeholder="ឧ. 096 374 6352"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/30 border border-white/20 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-duc-gold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Username Telegram *</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs select-none">@</span>
                    <input
                      type="text"
                      required
                      placeholder="moksambath"
                      value={telegramUsername.replace(/^@/, '')}
                      onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ''))}
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-black/30 border border-white/20 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-duc-gold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Purpose Selection */}
              <div className="pt-2 border-t border-white/10">
                <label className="block text-xs font-bold text-duc-gold mb-2">
                  គោលបំណងនៃការចូលបណ្ណាល័យលើកនេះ *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSES.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedPurpose === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedPurpose(item.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-duc-blue/80 border-duc-gold text-white font-bold'
                            : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-duc-gold' : 'text-slate-400'}`} />
                        <span className="text-xs">{item.labelKhmer}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated Borrow/Return details */}
              {renderBorrowReturnDetails()}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-duc-gold via-amber-400 to-duc-gold text-slate-900 shadow-lg shadow-duc-gold/25 flex items-center justify-center gap-2 hover:opacity-95 transition transform active:scale-95 disabled:opacity-50"
              >
                <LogIn className="w-5 h-5 text-slate-900" />
                <span>{loading ? 'កំពុងកត់ត្រា...' : 'ចុះឈ្មោះ និងចូលបណ្ណាល័យ (Register & Check-in)'}</span>
              </button>

              {profile && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-full py-2 text-xs text-slate-400 hover:text-white transition text-center"
                >
                  បោះបង់ និងត្រឡប់ក្រោយ
                </button>
              )}
            </form>
          )}
        </div>

        {/* Bottom Back Link */}
        <div className="text-center mt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-duc-gold/90 hover:text-duc-gold font-bold hover:underline py-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ត្រឡប់ទៅកាន់ផ្ទាំងគ្រប់គ្រងដើម (Dashboard)</span>
          </Link>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} Digital University of Cambodia. All rights reserved.</p>
          <p className="mt-0.5 text-slate-500">ប្រព័ន្ធគ្រប់គ្រងវត្តមានបណ្ណាល័យឌីជីថលស្វ័យប្រវត្ត</p>
        </div>
      </div>
    </div>
  );
};
export default AttendanceCheckIn;

