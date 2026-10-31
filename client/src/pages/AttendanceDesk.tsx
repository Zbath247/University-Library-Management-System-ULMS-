import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { api } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { DUC_FACULTIES } from '../constants/academicStructure';
import {
  UserCheck,
  Users,
  Clock,
  BookOpen,
  Search,
  RefreshCw,
  Laptop,
  Layers,
  Printer,
  Download,
  Filter,
  LogOut,
  Calendar,
  Building2,
  CheckCircle,
  AlertTriangle,
  QrCode,
  X,
  ExternalLink,
  Bell,
  Check,
  XCircle,
  Send,
  Edit2,
  Trash2,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  memberCode: string;
  fullName: string;
  fullNameEnglish?: string | null;
  telegramUsername?: string | null;
  memberType: string;
  gender: string | null;
  department: string;
  phoneNumber: string | null;
  purpose: string;
  purposeDetails: string | null;
  checkInTime: string;
  checkOutTime: string | null;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'PENDING_APPROVAL' | 'REJECTED';
  notes: string | null;
}

interface AttendanceStats {
  totalToday: number;
  currentlyInside: number;
  pendingCount?: number;
  purposeBreakdown: Record<string, number>;
  departmentBreakdown: Record<string, number>;
  memberTypeBreakdown: Record<string, number>;
}

export const AttendanceDesk: React.FC = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'LIVE' | 'PENDING' | 'HISTORY'>('LIVE');

  // Stats
  const [stats, setStats] = useState<AttendanceStats>({
    totalToday: 0,
    currentlyInside: 0,
    pendingCount: 0,
    purposeBreakdown: {},
    departmentBreakdown: {},
    memberTypeBreakdown: {},
  });

  // Live Occupants
  const [activeVisitors, setActiveVisitors] = useState<AttendanceRecord[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // Pending Approvals for Borrow/Return
  const [pendingRequests, setPendingRequests] = useState<AttendanceRecord[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // History Log
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit Attendance State (Admin)
  const [isEditAttModalOpen, setIsEditAttModalOpen] = useState(false);
  const [editingAttId, setEditingAttId] = useState<string | null>(null);
  const [editAttCode, setEditAttCode] = useState('');
  const [editAttFullName, setEditAttFullName] = useState('');
  const [editAttFullNameEnglish, setEditAttFullNameEnglish] = useState('');
  const [editAttTelegram, setEditAttTelegram] = useState('');
  const [editAttPhone, setEditAttPhone] = useState('');
  const [editAttDept, setEditAttDept] = useState('');
  const [editAttPurpose, setEditAttPurpose] = useState('READING');
  const [editAttPurposeDetails, setEditAttPurposeDetails] = useState('');
  const [editAttStatus, setEditAttStatus] = useState<'CHECKED_IN' | 'CHECKED_OUT' | 'PENDING_APPROVAL' | 'REJECTED'>('CHECKED_IN');

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // QR Code Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qrPrintCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check-in URL
  const checkInUrl = `${window.location.origin}/checkin`;

  // Fetch Stats, Active Occupants & Pending Approvals
  const fetchStatsAndActive = async () => {
    try {
      setLoadingActive(true);
      const [statsRes, activeRes, pendingRes] = await Promise.all([
        api.get('/attendance/stats'),
        api.get('/attendance/active'),
        api.get('/attendance/pending'),
      ]);
      setStats(statsRes.data?.data || stats);
      setActiveVisitors(activeRes.data?.data || []);
      setPendingRequests(pendingRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load stats/active visitors', err);
    } finally {
      setLoadingActive(false);
    }
  };

  // Handle Approve Borrow/Return Request
  const handleApprove = async (id: string, name: string) => {
    try {
      setProcessingId(id);
      await api.post(`/attendance/${id}/approve`);
      await fetchStatsAndActive();
      if (activeTab === 'HISTORY') fetchHistory();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'បរាជ័យក្នុងការអនុម័ត');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject Borrow/Return Request
  const handleReject = async (id: string, name: string) => {
    const reason = prompt(`សូមបញ្ជាក់មូលហេតុនៃការបដិសេធសំណើរបស់ «${name}» (បើមាន)៖`, 'មិនស្របតាមលក្ខខណ្ឌបណ្ណាល័យ');
    if (reason === null) return;
    try {
      setProcessingId(id);
      await api.post(`/attendance/${id}/reject`, { reason });
      await fetchStatsAndActive();
      if (activeTab === 'HISTORY') fetchHistory();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'បរាជ័យក្នុងការបដិសេធ');
    } finally {
      setProcessingId(null);
    }
  };

  const openEditAttendance = (r: AttendanceRecord) => {
    setEditingAttId(r.id);
    setEditAttCode(r.memberCode);
    setEditAttFullName(r.fullName);
    setEditAttFullNameEnglish(r.fullNameEnglish || '');
    setEditAttTelegram(r.telegramUsername || '');
    setEditAttPhone(r.phoneNumber || '');
    setEditAttDept(r.department);
    setEditAttPurpose(r.purpose);
    setEditAttPurposeDetails(r.purposeDetails || '');
    setEditAttStatus(r.status);
    setIsEditAttModalOpen(true);
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttId) return;
    try {
      await api.put(`/attendance/${editingAttId}`, {
        fullName: editAttFullName.trim(),
        fullNameEnglish: editAttFullNameEnglish.trim() || null,
        telegramUsername: editAttTelegram.trim().replace(/^@/, '') || null,
        phoneNumber: editAttPhone.trim() || null,
        department: editAttDept.trim(),
        purpose: editAttPurpose,
        purposeDetails: editAttPurposeDetails.trim() || null,
        status: editAttStatus,
      });

      setIsEditAttModalOpen(false);
      setEditingAttId(null);
      await fetchStatsAndActive();
      if (activeTab === 'HISTORY') fetchHistory();
    } catch (err: any) {
      alert('Error updating attendance: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteAttendance = async (id: string, name: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបកំណត់ត្រាវត្តមានរបស់ «${name}» នេះមែនទេ? (សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយបានទេ)`)) {
      return;
    }
    try {
      await api.delete(`/attendance/${id}`);
      await fetchStatsAndActive();
      if (activeTab === 'HISTORY') fetchHistory();
    } catch (err: any) {
      alert('Error deleting attendance: ' + (err.response?.data?.error || err.message));
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/attendance/history', {
        params: {
          date: selectedDate || undefined,
          department: selectedDept || undefined,
          purpose: selectedPurpose || undefined,
          status: selectedStatus || undefined,
          search: searchQuery || undefined,
          page,
          limit: 20,
        },
      });
      const data = res.data?.data;
      setHistoryRecords(data?.records || []);
      setHistoryTotal(data?.pagination?.total || 0);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchStatsAndActive();
    const interval = setInterval(fetchStatsAndActive, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab, page, selectedDate, selectedDept, selectedPurpose, selectedStatus]);

  // Generate QR Code when Modal opens
  useEffect(() => {
    if (showQrModal && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, checkInUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0F2B48',
          light: '#FFFFFF',
        },
      });
    }
  }, [showQrModal, checkInUrl]);

  // Handle Manual Staff Checkout
  const handleManualCheckOut = async (id: string, name: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់កត់ត្រាចេញសម្រាប់សមាជិក «${name}» មែនទេ?`)) {
      return;
    }
    try {
      await api.post(`/attendance/${id}/checkout`);
      fetchStatsAndActive();
      if (activeTab === 'HISTORY') fetchHistory();
    } catch (err: any) {
      alert(err.response?.data?.error || 'បរាជ័យក្នុងការកត់ត្រាចេញ');
    }
  };

  // Export Attendance CSV
  const handleExportCsv = () => {
    if (historyRecords.length === 0) {
      alert('មិនមានទិន្នន័យសម្រាប់ Export ទេ');
      return;
    }

    const headers = ['ID,អត្តលេខ,ឈ្មោះ,ប្រភេទ,ភេទ,ដេប៉ាតឺម៉ង់,លេខទូរស័ព្ទ,គោលបំណង,ព័ត៌មានសៀវភៅខ្ចីសង,ម៉ោងចូល,ម៉ោងចេញ,ស្ថានភាព'];
    const rows = historyRecords.map((r) => {
      const clean = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        clean(r.id),
        clean(r.memberCode),
        clean(r.fullName),
        clean(r.memberType),
        clean(r.gender || '—'),
        clean(r.department),
        clean(r.phoneNumber || '—'),
        clean(r.purpose),
        clean(r.purposeDetails || '—'),
        clean(new Date(r.checkInTime).toLocaleString('km-KH')),
        clean(r.checkOutTime ? new Date(r.checkOutTime).toLocaleString('km-KH') : 'កំពុងស្ថិតក្នុងបណ្ណាល័យ'),
        clean(r.status),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DUC_Attendance_Export_${selectedDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPurposeBadge = (purpose: string) => {
    switch (purpose) {
      case 'READING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3 h-3" /> អានសៀវភៅ
          </span>
        );
      case 'RESEARCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Search className="w-3 h-3" /> ស្រាវជ្រាវ
          </span>
        );
      case 'BORROW_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3" /> ខ្ចី-សង
          </span>
        );
      case 'COMPUTER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Laptop className="w-3 h-3" /> កុំព្យូទ័រ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Layers className="w-3 h-3" /> ផ្សេងៗ
          </span>
        );
    }
  };

  const calculateMinutes = (start: string) => {
    const mins = Math.round((Date.now() - new Date(start).getTime()) / 60000);
    if (mins < 60) return `${mins} នាទី`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours} ម៉ោង ${remMins} នាទី`;
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-duc-blue/10 border border-duc-blue/20 flex items-center justify-center shrink-0 mt-0.5 text-duc-blue">
              <UserCheck className="w-5 h-5 text-duc-gold" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold text-slate-800 leading-tight">
                វត្តមានចូល-ចេញ & ខ្ចី-សង
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                គ្រប់គ្រងវត្តមានផ្ទាល់ និងពិនិត្យអនុម័តសំណើខ្ចី-សងសៀវភៅ DUC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-duc-gold hover:bg-amber-400 active:scale-95 text-slate-900 font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-slate-900 shrink-0" />
              <span>ប័ណ្ណ QR Standee</span>
            </button>

            <a
              href="/checkin"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              title="បើកទំព័រស្កេន"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">ទំព័រស្កេន</span>
            </a>

            <button
              onClick={fetchStatsAndActive}
              className="p-2 text-slate-600 hover:text-duc-blue bg-white border border-slate-200 hover:border-slate-300 active:scale-95 rounded-xl transition shadow-sm cursor-pointer shrink-0"
              title="ទាញយកទិន្នន័យថ្មី"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Currently Inside */}
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-duc-blue to-duc-navy text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-duc-blue/30 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-duc-gold font-bold uppercase tracking-wider">
              វត្តមានផ្ទាល់
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-[10px] text-emerald-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              LIVE
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-white">{stats.currentlyInside}</div>
            <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-duc-gold shrink-0" />
              <span>មនុស្សក្នុងបណ្ណាល័យ</span>
            </div>
          </div>
        </div>

        {/* Total Today */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col justify-between">
          <div className="text-xs text-slate-500 font-bold mb-1">អ្នកចូលសរុបថ្ងៃនេះ</div>
          <div>
            <div className="text-2xl font-black text-slate-800">{stats.totalToday}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>លើកចូលថ្ងៃនេះ</span>
            </div>
          </div>
        </div>

        {/* Reading */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col justify-between">
          <div className="text-xs text-blue-600 font-bold mb-1 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>អានសៀវភៅ</span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {stats.purposeBreakdown?.READING || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">ស្វ័យសិក្សា & អាន</div>
          </div>
        </div>

        {/* Research */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/90 flex flex-col justify-between">
          <div className="text-xs text-indigo-600 font-bold mb-1 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span>ស្រាវជ្រាវ</span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {stats.purposeBreakdown?.RESEARCH || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">កិច្ចការ & ស្រាវជ្រាវ</div>
          </div>
        </div>

        {/* Borrow & Return */}
        <div
          onClick={() => {
            setSelectedPurpose('BORROW_RETURN');
            setActiveTab('HISTORY');
          }}
          className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/90 cursor-pointer hover:border-amber-400 hover:shadow-md transition group flex flex-col justify-between"
          title="ចុចដើម្បីមើលកំណត់ត្រាខ្ចី-សងទាំងអស់"
        >
          <div className="text-xs text-amber-600 font-bold mb-1 flex items-center justify-between gap-1">
            <span className="flex items-center gap-1 truncate">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>ខ្ចី-សងសៀវភៅ</span>
            </span>
            <span className="text-[10px] text-amber-700 bg-amber-50 group-hover:bg-amber-100 px-1.5 py-0.5 rounded font-bold transition shrink-0">
              បញ្ជី →
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {stats.purposeBreakdown?.BORROW_RETURN || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">ប្រវត្តិខ្ចី-សង</div>
          </div>
        </div>
      </div>

      {/* Pending Approval Notification Banner */}
      {pendingRequests.length > 0 && activeTab !== 'PENDING' && (
        <div
          onClick={() => setActiveTab('PENDING')}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border-2 border-amber-400/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/25 transition shadow-sm animate-pulse"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 font-bold flex items-center justify-center shadow shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-amber-900 text-xs sm:text-sm leading-snug">
                មានសំណើខ្ចី-សងសៀវភៅ {pendingRequests.length} រង់ចាំការអនុម័ត!
              </div>
              <div className="text-[11px] sm:text-xs text-amber-800 mt-0.5 truncate">
                ចុចទីនេះដើម្បីពិនិត្យឈ្មោះសៀវភៅ និងអនុម័តជូននិស្សិត
              </div>
            </div>
          </div>
          <button className="w-full sm:w-auto px-4 py-2 bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-900 font-bold rounded-xl text-xs shadow transition text-center shrink-0 cursor-pointer">
            ពិនិត្យ & អនុម័ត ({pendingRequests.length})
          </button>
        </div>
      )}

      {/* Tabs Switcher with Smooth Horizontal Scroll */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-2 overflow-x-auto scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab('LIVE')}
          className={`pb-2.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'LIVE'
              ? 'border-duc-blue text-duc-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>វត្តមានផ្ទាល់ ({stats.currentlyInside})</span>
        </button>

        <button
          onClick={() => setActiveTab('PENDING')}
          className={`pb-2.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'PENDING'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <span>សំណើរង់ចាំអនុម័ត</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-2.5 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'border-duc-blue text-duc-blue'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>ប្រវត្តិកត់ត្រាទាំងអស់</span>
        </button>
      </div>

      {/* TAB: PENDING REQUESTS */}
      {activeTab === 'PENDING' && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-4 sm:p-5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  បញ្ជីសំណើខ្ចី-សងសៀវភៅដែលរង់ចាំ Admin / បណ្ណារក្ស អនុម័ត
                </h3>
                <p className="text-xs text-slate-500">
                  និស្សិតបានស្នើសុំតាមរយៈទំព័រស្កេនវត្តមាន។ សូមពិនិត្យសៀវភៅ និងចុចអនុម័ត។
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-900 font-bold text-xs">
              {pendingRequests.length} សំណើ
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-slate-700">មិនមានសំណើរង់ចាំអនុម័តទេនៅពេលនេះ</p>
              <p className="text-xs text-slate-400 mt-1">
                រាល់សំណើខ្ចី ឬ សងសៀវភៅថ្មីនឹងលេចឡើងនៅទីនេះដោយស្វ័យប្រវត្ត។
              </p>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-slate-900 text-base">{req.fullName}</h4>
                          {req.fullNameEnglish && (
                            <span className="text-xs font-semibold text-slate-500">({req.fullNameEnglish})</span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-600">
                          {req.memberCode} • {req.memberType}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                        រង់ចាំអនុម័ត
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 font-medium">
                      🏛️ {req.department}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {req.phoneNumber && (
                        <div className="text-slate-600">
                          📞 លេខទូរស័ព្ទ៖ <span className="font-mono">{req.phoneNumber}</span>
                        </div>
                      )}
                      {req.telegramUsername && (
                        <a
                          href={`https://t.me/${req.telegramUsername.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-800 font-semibold border border-sky-300 transition"
                          title="បើក Telegram Chat ផ្ញើសារ Alert"
                        >
                          <Send className="w-3 h-3 text-sky-600" />
                          <span>@{req.telegramUsername.replace(/^@/, '')}</span>
                        </a>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-amber-200">
                      <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                        <span>ព័ត៌មានសៀវភៅស្នើសុំ៖</span>
                      </div>
                      <div className="text-xs font-extrabold text-slate-800">
                        {req.purposeDetails || 'ខ្ចី ឬ សងសៀវភៅ'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        ស្នើនៅម៉ោង៖ {new Date(req.checkInTime).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Approve & Reject */}
                  <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                    <button
                      onClick={() => handleApprove(req.id, req.fullName)}
                      disabled={processingId === req.id}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>{processingId === req.id ? 'កំពុងអនុម័ត...' : 'យល់ព្រម / អនុម័ត'}</span>
                    </button>

                    <button
                      onClick={() => handleReject(req.id, req.fullName)}
                      disabled={processingId === req.id}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>បដិសេធ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: LIVE OCCUPANTS */}
      {activeTab === 'LIVE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                បញ្ជីអ្នកកំពុងស្ថិតនៅក្នុងបណ្ណាល័យ
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              សរុប៖ <strong className="text-slate-800">{activeVisitors.length} នាក់</strong>
            </span>
          </div>

          {loadingActive ? (
            <div className="p-12 text-center text-slate-400 text-sm">កំពុងទាញយកទិន្នន័យ...</div>
          ) : activeVisitors.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">មិនទាន់មានអ្នកនៅក្នុងបណ្ណាល័យទេនៅពេលនេះ</p>
              <p className="text-xs text-slate-400 mt-1">
                និស្សិត ឬសាស្រ្តាចារ្យអាចស្កេន QR Code នៅមាត់ទ្វារដើម្បីកត់ត្រាវត្តមានចូល។
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">សមាជិក / អត្តលេខ</th>
                    <th className="py-3 px-4">មហាវិទ្យាល័យ / ដេប៉ាតឺម៉ង់</th>
                    <th className="py-3 px-4">គោលបំណង</th>
                    <th className="py-3 px-4">ម៉ោងចូល</th>
                    <th className="py-3 px-4">រយៈពេលស្នាក់នៅ</th>
                    <th className="py-3 px-4 text-right">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeVisitors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-duc-blue/10 text-duc-blue font-bold flex items-center justify-center text-xs border border-duc-blue/20">
                            {v.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>{v.fullName}</span>
                              {v.fullNameEnglish && (
                                <span className="text-[11px] text-slate-500 font-normal">({v.fullNameEnglish})</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                              <span>{v.memberCode} • {v.memberType}</span>
                              {v.telegramUsername && (
                                <a
                                  href={`https://t.me/${v.telegramUsername.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-0.5 ml-1"
                                  title="Telegram"
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>@{v.telegramUsername.replace(/^@/, '')}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{v.department}</td>
                      <td className="py-3.5 px-4">
                        <div>{getPurposeBadge(v.purpose)}</div>
                        {v.purposeDetails && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1 font-medium max-w-xs break-words">
                            {v.purposeDetails}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(v.checkInTime).toLocaleTimeString('km-KH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                          {calculateMinutes(v.checkInTime)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openEditAttendance(v)}
                                className="p-1.5 text-duc-blue hover:text-white bg-blue-50 hover:bg-duc-blue border border-blue-200 rounded-lg transition"
                                title="កែប្រែ (Edit)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendance(v.id, v.fullName)}
                                className="p-1.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition"
                                title="លុបកំណត់ត្រា (Delete)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleManualCheckOut(v.id, v.fullName)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition text-xs inline-flex items-center gap-1.5"
                            title={v.purpose === 'BORROW_RETURN' ? 'កត់ត្រាសងសៀវភៅ និងចាកចេញ' : 'កត់ត្រាចេញ'}
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>{v.purpose === 'BORROW_RETURN' ? 'កត់ត្រាសង / ចេញ' : 'កត់ត្រាចេញ'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY LOG */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">កាលបរិច្ឆេទ</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">មហាវិទ្យាល័យ</label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none bg-white"
              >
                <option value="">គ្រប់មហាវិទ្យាល័យ / ដេប៉ាតឺម៉ង់</option>
                {DUC_FACULTIES.map((fac) => (
                  <optgroup key={fac.code} label={fac.nameKhmer}>
                    {fac.departments.map((d) => (
                      <option key={d.code} value={`${d.nameKhmer} (${d.nameEnglish})`}>
                        ↳ {d.nameKhmer}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">គោលបំណង</label>
              <select
                value={selectedPurpose}
                onChange={(e) => {
                  setSelectedPurpose(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none bg-white"
              >
                <option value="">គ្រប់គោលបំណង</option>
                <option value="READING">អានសៀវភៅ (Reading)</option>
                <option value="RESEARCH">ស្រាវជ្រាវ (Research)</option>
                <option value="BORROW_RETURN">ខ្ចី-សង (Borrow/Return)</option>
                <option value="COMPUTER">កុំព្យូទ័រ (Computer)</option>
                <option value="OTHER">ផ្សេងៗ (Other)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ស្វែងរក</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                <input
                  type="text"
                  placeholder="ឈ្មោះ, អត្តលេខ, ទូរស័ព្ទ..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-8 pr-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleExportCsv}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingHistory ? (
              <div className="p-12 text-center text-slate-400 text-sm">កំពុងទាញយកទិន្នន័យ...</div>
            ) : historyRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-500">មិនមានកំណត់ត្រាវត្តមានត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">សមាជិក</th>
                      <th className="py-3 px-4">ដេប៉ាតឺម៉ង់</th>
                      <th className="py-3 px-4">គោលបំណង</th>
                      <th className="py-3 px-4">ម៉ោងចូល</th>
                      <th className="py-3 px-4">ម៉ោងចេញ</th>
                      <th className="py-3 px-4">ស្ថានភាព</th>
                      {isAdmin && <th className="py-3 px-4 text-right">សកម្មភាព (Admin)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span>{r.fullName}</span>
                            {r.fullNameEnglish && (
                              <span className="text-[11px] text-slate-500 font-normal">({r.fullNameEnglish})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                            <span>{r.memberCode} • {r.memberType}</span>
                            {r.telegramUsername && (
                              <a
                                href={`https://t.me/${r.telegramUsername.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-0.5 ml-1"
                                title="Telegram"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>@{r.telegramUsername.replace(/^@/, '')}</span>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{r.department}</td>
                        <td className="py-3 px-4">
                          <div>{getPurposeBadge(r.purpose)}</div>
                          {r.purposeDetails && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md mt-1 font-medium max-w-xs break-words">
                              {r.purposeDetails}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(r.checkInTime).toLocaleString('km-KH', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {r.checkOutTime ? (
                            new Date(r.checkOutTime).toLocaleTimeString('km-KH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ) : (
                            <span className="text-emerald-600 font-semibold">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {r.status === 'CHECKED_IN' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              នៅក្នុងបណ្ណាល័យ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              បានចាកចេញ
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditAttendance(r)}
                                className="p-1.5 text-duc-blue hover:text-white bg-blue-50 hover:bg-duc-blue border border-blue-200 rounded-lg transition"
                                title="កែប្រែ (Edit)"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAttendance(r.id, r.fullName)}
                                className="p-1.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition"
                                title="លុបកំណត់ត្រា (Delete)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  ទំព័រទី <strong>{page}</strong> នៃ <strong>{totalPages}</strong> (សរុប {historyTotal} នាក់)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    ថយក្រោយ
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                  >
                    បន្ទាប់
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR CODE ENTRANCE STANDEE / POSTER MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="bg-duc-blue text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-duc-gold" />
                <h3 className="font-bold text-base">ប័ណ្ណ QR Code សម្រាប់ដាក់មុខទ្វារបណ្ណាល័យ</h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-duc-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Standee View */}
            <div id="printable-standee" className="p-6 text-center space-y-4">
              {/* University Emblem */}
              <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-duc-blue/5 border border-duc-gold/30 shadow-sm">
                <img
                  src="/logo.png"
                  alt="DUC Logo"
                  className="w-16 h-16 object-contain drop-shadow"
                />
              </div>
              <div>
                <h2 className="font-extrabold text-duc-blue text-lg">សាកលវិទ្យាល័យឌីជីថលកម្ពុជា</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  Digital University of Cambodia
                </p>
                <p className="text-xs font-semibold text-duc-gold mt-1">បណ្ណាល័យឌីជីថល • DIGITAL LIBRARY</p>
              </div>

              {/* QR Canvas */}
              <div className="inline-block p-4 bg-white rounded-2xl border-2 border-duc-gold/60 shadow-lg">
                <canvas ref={qrCanvasRef} className="mx-auto" />
              </div>

              {/* Instructions */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">
                  ស្កេន QR Code ដើម្បីកត់ត្រាវត្តមានចូល និងចេញ
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  បើកកាមេរ៉ាទូរស័ព្ទរបស់អ្នកដើម្បីស្កេនកូដនេះ (អ្នកចូលលើកដំបូងបំពេញព័ត៌មានតែម្តងប៉ុណ្ណោះ)។
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 bg-duc-blue hover:bg-duc-navy text-white font-bold rounded-xl text-xs sm:text-sm shadow transition"
              >
                <Printer className="w-4 h-4 text-duc-gold" />
                <span>បោះពុម្ពប័ណ្ណ (Print Standee)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-slate-100 transition"
              >
                បិទ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ATTENDANCE MODAL (ADMIN ONLY) */}
      {isEditAttModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="bg-duc-blue text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-duc-gold" />
                <h3 className="font-bold text-base">កែប្រែកំណត់ត្រាវត្តមាន (Admin)</h3>
              </div>
              <button
                onClick={() => setIsEditAttModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-duc-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAttendance} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-bold">អត្តលេខ / Member Code:</span>
                <span className="font-mono font-bold text-duc-blue">{editAttCode}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ឈ្មោះពេញជាភាសាខ្មែរ (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={editAttFullName}
                  onChange={(e) => setEditAttFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ឈ្មោះជាអក្សរឡាតាំង (Latin Name)
                </label>
                <input
                  type="text"
                  value={editAttFullNameEnglish}
                  onChange={(e) => setEditAttFullNameEnglish(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  placeholder="e.g. MOK SAMBATH"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Telegram
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">@</span>
                    <input
                      type="text"
                      value={editAttTelegram}
                      onChange={(e) => setEditAttTelegram(e.target.value.replace(/^@/, ''))}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none font-mono"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    លេខទូរស័ព្ទ (Phone Number)
                  </label>
                  <input
                    type="text"
                    value={editAttPhone}
                    onChange={(e) => setEditAttPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none font-mono"
                    placeholder="012 345 678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  មហាវិទ្យាល័យ / ដេប៉ាតឺម៉ង់ (Department) *
                </label>
                <select
                  required
                  value={editAttDept}
                  onChange={(e) => setEditAttDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none bg-white"
                >
                  <option value="">-- ជ្រើសរើសដេប៉ាតឺម៉ង់ --</option>
                  {DUC_FACULTIES.map((fac) => (
                    <optgroup key={fac.code} label={fac.nameKhmer}>
                      {fac.departments.map((d) => (
                        <option key={d.code} value={`${d.nameKhmer} (${d.nameEnglish})`}>
                          ↳ {d.nameKhmer}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {editAttDept && !DUC_FACULTIES.some(f => f.departments.some(d => `${d.nameKhmer} (${d.nameEnglish})` === editAttDept)) && (
                    <option value={editAttDept}>{editAttDept}</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    គោលបំណង (Purpose) *
                  </label>
                  <select
                    value={editAttPurpose}
                    onChange={(e) => setEditAttPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none bg-white"
                  >
                    <option value="READING">អានសៀវភៅ (Reading)</option>
                    <option value="RESEARCH">ស្រាវជ្រាវ (Research)</option>
                    <option value="BORROW_RETURN">ខ្ចី ឬ សងសៀវភៅ (Borrow/Return)</option>
                    <option value="COMPUTER">ប្រើកុំព្យូទ័រ / អ៊ីនធឺណិត (Computer)</option>
                    <option value="OTHER">ផ្សេងៗ (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ស្ថានភាព (Status) *
                  </label>
                  <select
                    value={editAttStatus}
                    onChange={(e: any) => setEditAttStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none bg-white"
                  >
                    <option value="CHECKED_IN">កំពុងនៅក្នុងបណ្ណាល័យ (Checked In)</option>
                    <option value="CHECKED_OUT">បានចាកចេញ (Checked Out)</option>
                    <option value="PENDING_APPROVAL">រង់ចាំការអនុម័ត (Pending)</option>
                    <option value="REJECTED">បានបដិសេធ (Rejected)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ព័ត៌មានលម្អិតគោលបំណង (Purpose Details)
                </label>
                <input
                  type="text"
                  value={editAttPurposeDetails}
                  onChange={(e) => setEditAttPurposeDetails(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  placeholder="ចំណងជើងសៀវភៅ ឬព័ត៌មានផ្សេងៗ..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditAttModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm hover:bg-slate-100 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-duc-blue hover:bg-duc-navy text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition"
                >
                  រក្សាទុកការកែប្រែ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AttendanceDesk;

