import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Download,
  Upload,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Users,
  Repeat,
  Sparkles,
  PieChart as PieChartIcon,
  TrendingUp,
  Globe2,
  ShieldCheck,
  RefreshCw,
  FileText,
  Printer,
} from 'lucide-react';
import { DucExecutiveReportModal } from '../components/DucExecutiveReportModal';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    const title = label || item.payload?.name || item.payload?.label || item.name;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl text-xs border border-white/10 space-y-1 z-50">
        <p className="font-bold text-duc-gold border-b border-white/10 pb-1">{title}</p>
        {payload.map((p: any, idx: number) => (
          <p key={idx} className="flex items-center justify-between gap-3 pt-0.5">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || p.fill }} />
              <span>{p.name || 'ចំនួន'}:</span>
            </span>
            <span className="font-bold font-mono text-white">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const Reports: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'CHARTS' | 'CSV_EXPORT' | 'DEPARTMENTS'>('CHARTS');
  const [analytics, setAnalytics] = useState<any>(null);
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDucPdfModal, setShowDucPdfModal] = useState(false);

  // CSV Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [analyticsRes, invRes] = await Promise.all([
        api.get('/reports/analytics').catch(() => ({ data: { data: null } })),
        api.get('/reports/inventory').catch(() => ({ data: { data: null } })),
      ]);
      setAnalytics(analyticsRes.data?.data);
      setInventory(invRes.data?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCsv = () => {
    window.location.href = '/api/v1/csv/export/books';
  };

  const handlePreviewImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/csv/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(res.data?.data);
    } catch (err: any) {
      alert('Error parsing CSV: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleCommitImport = async () => {
    if (!previewData?.previewItems) return;
    setImporting(true);

    try {
      const res = await api.post('/csv/import/commit', { items: previewData.previewItems });
      setImportSuccess(`បាននាំចូលទិន្នន័យសៀវភៅចំនួន ${res.data?.data?.importedCount} ក្បាលដោយជោគជ័យ!`);
      setPreviewData(null);
      setImportFile(null);
      fetchReports();
    } catch (err: any) {
      alert('Error committing import: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setImporting(false);
    }
  };

  const kpis = analytics?.kpis || {};
  const facultyData = analytics?.facultyBreakdown || [];
  const copyStatusData = (analytics?.copyStatusBreakdown || []).filter((c: any) => c.value > 0);
  const monthlyTrendsData = analytics?.monthlyTrends || [];
  const memberTypeData = analytics?.memberTypeBreakdown || [];
  const languageData = analytics?.languageBreakdown || [];
  const conditionData = analytics?.conditionBreakdown || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-duc-blue">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-duc-blue flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5 text-duc-blue" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                ស្ថិតិ & ក្រាហ្វិកវិភាគបណ្ណាល័យ (Library Analytics & Reports)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                តាមដានទិន្នន័យបណ្ណាល័យ ចរន្តខ្ចី-សង និងការបែងចែកសៀវភៅតាមមហាវិទ្យាល័យតាមរយៈក្រាហ្វិកអន្តរកម្ម
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowDucPdfModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer border border-blue-400/30"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>📄 ទាញយក PDF ទម្រង់ DUC (2025)</span>
          </button>

          <button
            type="button"
            onClick={fetchReports}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            title="ទាញយកទិន្នន័យថ្មី"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ផ្ទុកឡើងវិញ</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportCatalogCsv}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('CHARTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'CHARTS'
              ? 'bg-duc-blue text-duc-gold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PieChartIcon className="w-4 h-4" />
          <span>📊 ក្រាហ្វិកវិភាគទិន្នន័យ (Visual Charts)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowDucPdfModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 border border-amber-300/40"
        >
          <FileText className="w-4 h-4 text-amber-600" />
          <span>📄 របាយការណ៍ផ្លូវការ DUC (Executive PDF Sheet)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'DEPARTMENTS'
              ? 'bg-duc-blue text-duc-gold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>📚 សៀវភៅតាមដេប៉ាតឺម៉ង់ ({inventory?.categoriesBreakdown?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CSV_EXPORT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'CSV_EXPORT'
              ? 'bg-duc-blue text-duc-gold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>📁 នាំចូលទិន្នន័យ CSV (Batch Import)</span>
        </button>
      </div>

      {/* TAB 1: VISUAL CHARTS & ANALYTICS */}
      {activeTab === 'CHARTS' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">ចំណងជើងសរុប</span>
                <BookOpen className="w-4 h-4 text-duc-blue" />
              </div>
              <div className="text-2xl font-black text-slate-800">{kpis.totalBooks ?? '—'}</div>
              <span className="text-[10px] text-slate-400">ចំណងជើងសៀវភៅ</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">ក្បាលសៀវភៅ</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-800">{kpis.totalCopies ?? '—'}</div>
              <span className="text-[10px] text-slate-400">ក្បាលសៀវភៅជាក់ស្តែង</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">អាចខ្ចីបាន</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">{kpis.availableCopies ?? '—'}</div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                អត្រា {kpis.availableRate ?? 100}%
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">កំពុងខ្ចី</span>
                <Repeat className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-600">{kpis.activeLoans ?? '—'}</div>
              <span className="text-[10px] text-blue-600 font-medium">ចរន្តខ្ចីសកម្ម</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">ហួសកាលកំណត់</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600">{kpis.overdueLoans ?? 0}</div>
              <span className="text-[10px] text-rose-600 font-medium">សៀវភៅយឺតសង</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-semibold">សមាជិកបណ្ណាល័យ</span>
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-800">{kpis.totalMembers ?? '—'}</div>
              <span className="text-[10px] text-slate-400">និស្សិត & សាស្ត្រាចារ្យ</span>
            </div>
          </div>

          {/* MAIN CHARTS: ROW 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 1: Books by Faculty (Bar Chart) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-duc-blue" />
                    <span>ក្រាហ្វិកចំនួនសៀវភៅតាមមហាវិទ្យាល័យ (Books by Faculty)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ចំនួនចំណងជើងសៀវភៅដែលមានជាក់ស្តែងតាមមហាវិទ្យាល័យនីមួយៗ
                  </p>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={facultyData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      dataKey="short"
                      type="category"
                      tick={{ fontSize: 11, fontWeight: 'bold', fill: '#334155' }}
                      width={65}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="ចំនួនសៀវភៅ" radius={[0, 8, 8, 0]}>
                      {facultyData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Faculty Summary Chips */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                {facultyData.map((f: any) => (
                  <div
                    key={f.short}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-slate-50 border border-slate-200/80"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                    <span className="font-bold text-slate-700">{f.short}:</span>
                    <span className="font-mono font-extrabold text-slate-900">{f.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Copies Status & Availability (Donut Chart) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>ស្ថានភាពក្បាលសៀវភៅ (Physical Copies Utilization)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  អត្រាភាពទំនេរដែលអាចខ្ចីបាន និងសៀវភៅដែលកំពុងខ្ចី
                </p>
              </div>

              <div className="relative h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={copyStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {copyStatusData.map((entry: any, index: number) => (
                        <Cell key={`status-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-800">{kpis.totalCopies || 0}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ក្បាលសរុប</span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                {copyStatusData.map((s: any) => (
                  <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600 truncate text-[11px]">{s.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800 shrink-0">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MAIN CHARTS: ROW 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 3: Monthly Circulation Trends (Area Chart) */}
            <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-duc-blue" />
                    <span>ចរន្តខ្ចី និងសងសៀវភៅ ៦ ខែចុងក្រោយ (Circulation Trends)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    តាមដានសកម្មភាពខ្ចីសៀវភៅ និងសងសៀវភៅប្រចាំខែ
                  </p>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="loans"
                      name="សៀវភៅខ្ចី"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorLoans)"
                    />
                    <Area
                      type="monotone"
                      dataKey="returns"
                      name="សៀវភៅសង"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorReturns)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-slate-600 font-medium">ចំនួនសៀវភៅខ្ចី (Loans)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 font-medium">ចំនួនសៀវភៅសង (Returns)</span>
                </div>
              </div>
            </div>

            {/* Chart 4: Members Distribution (Bar Chart) */}
            <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>សមាជិកបណ្ណាល័យ (Members by Role)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  ការបែងចែកសមាជិកជានិស្សិត និងសាស្ត្រាចារ្យ
                </p>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="ចំនួនសមាជិក" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {memberTypeData.map((m: any) => (
                  <div key={m.type} className="flex items-center justify-between text-slate-700">
                    <span className="text-[11px] font-medium">{m.label}</span>
                    <span className="font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                      {m.count} នាក់
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 5: Language Distribution (Donut / Pie) */}
            <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-sky-600" />
                  <span>ភាសាសៀវភៅ (Book Languages)</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  សមាមាត្រសៀវភៅជាភាសាខ្មែរ និងអង់គ្លេស
                </p>
              </div>

              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languageData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      label={({ name, percent }: any) => `${(name || '').split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#0284c7" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {languageData.map((l: any, idx: number) => (
                  <div key={l.language} className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: idx === 0 ? '#0284c7' : '#10b981' }} />
                      <span className="text-[11px] font-medium">{l.label}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">{l.count} ចំណងជើង</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS BREAKDOWN TABLE */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-duc-blue" />
              <span>ស្ថិតិចំនួនសៀវភៅតាមដេប៉ាតឺម៉ង់ និងជំនាញសិក្សា</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ពិនិត្យមើលចំនួនសៀវភៅដែលមានជាក់ស្តែងតាមដេប៉ាតឺម៉ង់ និងស្ថានភាពគុណភាពរូបវន្ត
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {inventory?.categoriesBreakdown?.map((cat: any) => (
                <div
                  key={cat.code}
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-slate-200/80 transition text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-slate-800 block truncate">{cat.nameKhmer}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{cat.code}</span>
                  </div>
                  <span className="font-mono font-bold text-duc-blue bg-white border border-blue-200 px-3 py-1 rounded-lg shrink-0 shadow-2xs">
                    {cat.bookCount} ចំណងជើង
                  </span>
                </div>
              ))}
            </div>

            {/* Physical Condition Breakdown */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ស្ថានភាពគុណភាពរូបវន្តសៀវភៅ (Book Condition)</span>
                </h4>
                <div className="space-y-2.5">
                  {conditionData.map((c: any) => (
                    <div key={c.condition} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">{c.label}</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        {c.count} ក្បាល
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CSV BATCH IMPORT SECTION */}
      {activeTab === 'CSV_EXPORT' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-800">{t.importCsv}</h3>
              <p className="text-xs text-slate-500">
                បញ្ចូលសៀវភៅច្រើនក្បាលក្នុងពេលតែមួយតាមរយៈឯកសារ CSV (មានមុខងារ Preview ត្រួតពិនិត្យមុន Commit)
              </p>
            </div>
          </div>

          {importSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{importSuccess}</span>
            </div>
          )}

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs text-slate-600 font-medium mb-3">
              ជ្រើសរើសឯកសារ CSV ដែលមានទិន្នន័យសៀវភៅ
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handlePreviewImport}
              className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-duc-blue file:text-white hover:file:bg-duc-navy cursor-pointer"
            />
          </div>

          {/* CSV Preview Table */}
          {previewData && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  គំរូទិន្នន័យត្រូវនាំចូល (បង្ហាញ ១០ ជួរដំបូងនៃ {previewData.totalRows} ជួរ)
                </span>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={importing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {importing ? 'កំពុងនាំចូល...' : 'បញ្ជាក់ការ Commit ចូលប្រព័ន្ធ'}
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-semibold text-slate-600">
                    <tr>
                      <th className="p-2 whitespace-nowrap">ជួរ</th>
                      <th className="p-2 whitespace-nowrap">ចំណងជើងខ្មែរ</th>
                      <th className="p-2 whitespace-nowrap">English Title</th>
                      <th className="p-2 whitespace-nowrap">ISBN</th>
                      <th className="p-2 whitespace-nowrap">អ្នកនិពន្ធ</th>
                      <th className="p-2 whitespace-nowrap">Accession No.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.previewItems?.map((row: any) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-400 whitespace-nowrap">{row.rowNumber}</td>
                        <td className="p-2 font-medium text-slate-800 whitespace-nowrap">{row.titleKhmer}</td>
                        <td className="p-2 text-slate-600 italic whitespace-nowrap">{row.titleEnglish}</td>
                        <td className="p-2 font-mono text-slate-500 whitespace-nowrap">{row.isbn || '—'}</td>
                        <td className="p-2 text-slate-600 whitespace-nowrap">{row.authors?.join(', ')}</td>
                        <td className="p-2 font-mono text-duc-blue font-bold whitespace-nowrap">{row.accessionNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DUC Executive Report PDF Modal */}
      <DucExecutiveReportModal
        isOpen={showDucPdfModal}
        onClose={() => setShowDucPdfModal(false)}
      />
    </div>
  );
};
