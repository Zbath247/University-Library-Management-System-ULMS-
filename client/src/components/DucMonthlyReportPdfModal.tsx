import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Calendar,
  FileText,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

interface DucMonthlyReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DucMonthlyReportPdfModal: React.FC<DucMonthlyReportPdfModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [month, setMonth] = useState<string>('តុលា');
  const [year, setYear] = useState<number>(2026);
  const [dataSource, setDataSource] = useState<'benchmark' | 'live'>('benchmark');
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);

  const monthsList = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];

  // Fetch report data whenever month, year or dataSource changes
  useEffect(() => {
    if (!isOpen) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/v1/reports/monthly-reading-data?month=${encodeURIComponent(month)}&year=${year}&mode=${dataSource}`
        );
        if (res.data?.success) {
          setReportData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch monthly report data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [isOpen, month, year, dataSource]);

  if (!isOpen) return null;

  const data = reportData || {
    maleCount: 24,
    femaleCount: 17,
    totalReaders: 41,
    totalBorrowed: 12,
    totalReturned: 8,
    totalUnreturned: 4,
    studentsList: [
      { no: 1, name: 'សុខ ដាវីដ', gender: 'ប្រុស', major: 'វិទ្យាសាស្ត្រកុំព្យូទ័រ' },
      { no: 2, name: 'ចាន់ ណាវី', gender: 'ស្រី', major: 'ព័ត៌មានវិទ្យា' },
      { no: 3, name: 'ហេង ធីតា', gender: 'ស្រី', major: 'ព័ត៌មានវិទ្យា' },
      { no: 4, name: 'វ៉ាន់ វឌ្ឍនា', gender: 'ប្រុស', major: 'ព័ត៌មានវិទ្យា' },
      { no: 5, name: 'ជួន សុជាតិ', gender: 'ប្រុស', major: 'ធុរកិច្ចឌីជីថល' },
      { no: 6, name: 'គង់ សម្បត្តិ', gender: 'ប្រុស', major: 'វិទ្យាសាស្ត្រសេដ្ឋកិច្ច' },
      { no: 7, name: 'ឡាយ ម៉ារី', gender: 'ស្រី', major: 'ធុរកិច្ចឌីជីថល' },
      { no: 8, name: 'អ៊ឹម បូរិន', gender: 'ប្រុស', major: 'ព័ត៌មានវិទ្យា' },
      { no: 9, name: 'ហុង ស្រីនី', gender: 'ស្រី', major: 'ព័ត៌មានវិទ្យា' },
      { no: 10, name: 'សេង វិបុល', gender: 'ប្រុស', major: 'ព័ត៌មានវិទ្យា' },
      { no: 11, name: 'មាស ចាន់ណា', gender: 'ស្រី', major: 'បង្រៀនភាសាអង់គ្លេស' },
      { no: 12, name: 'អ៊ុក ដារ៉ូ', gender: 'ប្រុស', major: 'បង្រៀនភាសាអង់គ្លេស' },
    ],
    loanList: [
      { no: 1, name: 'ហេង សំណាង', gender: 'ប្រុស', major: 'បង្រៀនភាសាអង់គ្លេស', borrowed: '1 ក្បាល', returned: '1 ក្បាល' },
      { no: 2, name: 'ផាត់ ពិសី', gender: 'ស្រី', major: 'បង្រៀនភាសាអង់គ្លេស', borrowed: '1 ក្បាល', returned: '1 ក្បាល' },
      { no: 3, name: 'ឡាយ ម៉ារី', gender: 'ស្រី', major: 'ធុរកិច្ចឌីជីថល', borrowed: '1 ក្បាល', returned: '1 ក្បាល' },
      { no: 4, name: 'អ៊ឹម បូរិន', gender: 'ប្រុស', major: 'វិទ្យាសាស្ត្រកុំព្យូទ័រ', borrowed: '1 ក្បាល', returned: '1 ក្បាល' },
      { no: 5, name: 'វ៉ាន់ វឌ្ឍនា', gender: 'ប្រុស', major: 'ព័ត៌មានវិទ្យា', borrowed: '1 ក្បាល', returned: '1 ក្បាល' },
      { no: 6, name: 'គុយលាង ស្រីម៉ី', gender: 'ស្រី', major: 'ធុរកិច្ចឌីជីថល', borrowed: '1 ក្បាល', returned: '0 ក្បាល' },
      { no: 7, name: 'គឹម រ៉ូ', gender: 'ប្រុស', major: 'បញ្ញាសិប្បនិម្មិត', borrowed: '1 ក្បាល', returned: '0 ក្បាល' },
      { no: 8, name: 'សេង វិបុល', gender: 'ប្រុស', major: 'អភិវឌ្ឍន៍កម្មវិធី', borrowed: '1 ក្បាល', returned: '1 ក្បាល' },
      { no: 9, name: 'ឡេង វុទ្ធី', gender: 'ប្រុស', major: 'ក្រាហ្វិកឌីហ្សាញ', borrowed: '1 ក្បាល', returned: '0 ក្បាល' },
      { no: 10, name: 'ថៃ គឹមស្រ៊ី', gender: 'ស្រី', major: 'វិទ្យាសាស្ត្រកុំព្យូទ័រ', borrowed: '1 ក្បាល', returned: '0 ក្បាល' },
      { no: 11, name: 'ទី ពិសិដ្ឋ', gender: 'ប្រុស', major: 'ក្រាហ្វិកឌីហ្សាញ', borrowed: '1 ក្បាល', returned: '1 ក្បាល' },
      { no: 12, name: 'សន សុភា', gender: 'ស្រី', major: 'ព័ត៌មានវិទ្យា', borrowed: '1 ក្បាល', returned: '1 ក្បាល' },
    ],
    lunarDate: 'ថ្ងៃពុធ ១២កើត ខែកត្តិក ឆ្នាំរោង ឆស័ក ព.ស. ២៥៦៩',
    solarDate: `រាជធានីភ្នំពេញ, ថ្ងៃទី០៤ ខែ${month} ឆ្នាំ${year}`,
    reviewerTitle: 'អ្នកត្រួតពិនិត្យ',
    managerTitle: 'អ្នកគ្រប់គ្រងបណ្ណាល័យ',
    managerName: 'សែម សុខុម',
  };

  const page2Loans = (data.loanList || []).slice(0, 6);
  const page3Loans = (data.loanList || []).slice(6);

  // Single-Click Multi-Page PDF Download (300DPI crisp rendering)
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pages = [page1Ref.current, page2Ref.current, page3Ref.current].filter(Boolean);

      for (let i = 0; i < pages.length; i++) {
        const pageElem = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageElem, {
          scale: 2, // 2x resolution for ultra-sharp Khmer text & sub-vowels
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`DUC_Library_Monthly_Report_${encodeURIComponent(month)}_${year}.pdf`);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('មានបញ្ហាក្នុងការទាញយក PDF សូមសាកល្បងម្ដងទៀត ឬប្រើប៊ូតុងបោះពុម្ព (Print)');
    } finally {
      setIsExporting(false);
    }
  };

  // Browser Print Handler (Save as PDF) with Isolated Iframe for Vector Output
  const handlePrint = () => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const origin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    const printUrl = `${origin}/api/v1/reports/monthly-reading-html?month=${encodeURIComponent(
      month
    )}&year=${year}&mode=${dataSource}&print=true`;

    // Open clean print window
    const printWindow = window.open(printUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  // Direct Word (.docx) Download Handler
  const handleDownloadWord = () => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const origin = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
    const url = `${origin}/api/v1/reports/monthly-reading-word?month=${encodeURIComponent(
      month
    )}&year=${year}&mode=${dataSource}`;
    window.open(url, '_blank');
  };

  return (
    <div className="duc-monthly-modal-container fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Global CSS for Khmer Fonts and Table Styling */}
      <style>{`
        .duc-monthly-sheet {
          font-family: 'Khmer OS Battambang', 'Battambang', 'Kantumruy Pro', sans-serif !important;
          color: #000000 !important;
        }
        .duc-monthly-sheet .font-moul,
        .duc-monthly-sheet h2,
        .duc-monthly-sheet h3,
        .duc-monthly-sheet th {
          font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', 'Moulpali', serif !important;
        }
        .duc-monthly-sheet table.doc-table {
          width: 100% !important;
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          margin-top: 8px !important;
          margin-bottom: 16px !important;
        }
        .duc-monthly-sheet table.doc-table th,
        .duc-monthly-sheet table.doc-table td {
          border: 1px solid #000000 !important;
          padding: 5px 8px !important;
          vertical-align: middle !important;
          line-height: 1.4 !important;
          font-size: 13px !important;
        }
        .duc-monthly-sheet table.doc-table th {
          background-color: #b9d5f7 !important;
          text-align: center !important;
          font-weight: bold !important;
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 font-moul">
                របាយការណ៍បណ្ណាល័យ DUC (A4 PDF)
              </h2>
              <p className="text-xs text-slate-300">
                ពុម្ពអក្សរផ្លូវការ៖ <span className="text-amber-300 font-bold">Khmer OS Battambang</span> &amp;{' '}
                <span className="text-amber-300 font-bold">Khmer OS Muol Light</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Month selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-medium">ខែ៖</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {monthsList.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Year selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-300 font-medium">ឆ្នាំ៖</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value={2026} className="bg-slate-900">2026</option>
                <option value={2025} className="bg-slate-900">2025</option>
                <option value={2024} className="bg-slate-900">2024</option>
              </select>
            </div>

            {/* Data Mode Toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setDataSource('benchmark')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  dataSource === 'benchmark'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                គំរូផ្លូវការ DUC
              </button>
              <button
                type="button"
                onClick={() => setDataSource('live')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  dataSource === 'live'
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ទិន្នន័យជាក់ស្តែង (Live)
              </button>
            </div>

            {/* Single-click PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition-all disabled:opacity-50 cursor-pointer"
              title="ទាញយកជាឯកសារ PDF ភ្លាមៗ (Download PDF)"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>កំពុងបង្កើត PDF...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>ទាញយកបានជោគជ័យ!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>ទាញយកជា PDF</span>
                </>
              )}
            </button>

            {/* Print / Save as PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow transition-all cursor-pointer"
              title="បើកផ្ទាំង Print ដើម្បីរក្សាទុកជា PDF (Save as PDF)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>បោះពុម្ព / Save as PDF</span>
            </button>

            {/* Word Download */}
            <button
              type="button"
              onClick={handleDownloadWord}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold shadow transition-all cursor-pointer border border-slate-700"
              title="ទាញយកជាឯកសារ Microsoft Word (.docx)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-300" />
              <span>ទាញយក Word</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-200/80 p-3 sm:p-6 flex flex-col items-center gap-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">កំពុងរៀបចំទិន្នន័យរបាយការណ៍...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 w-full max-w-[794px]">
              {/* ================= PAGE 1 ================= */}
              <div
                ref={page1Ref}
                className="duc-monthly-sheet bg-white text-slate-950 w-full min-h-[1123px] p-[18mm] sm:p-[20mm] shadow-xl border border-slate-300 select-none"
                style={{ width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}
              >
                {/* Header Table */}
                <table className="w-full border-none mb-6">
                  <tbody>
                    <tr>
                      {/* Left: DUC Logo & Name (Logo centered relative to University Name) */}
                      <td className="w-1/2 align-top text-left border-none p-0">
                        <div className="inline-flex flex-col items-center text-center">
                          <img
                            src="/logo.png"
                            alt="DUC Logo"
                            className="w-14 h-14 object-contain mb-1.5 mx-auto block"
                            onError={(e: any) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="font-moul text-[14.5px] font-bold text-slate-950 mb-0.5 text-center">
                            សាកលវិទ្យាល័យឌីជីថលកម្ពុជា
                          </div>
                          <div className="font-battambang text-[13.5px] font-bold text-slate-900 text-center">
                            បណ្ណាល័យសិក្សា
                          </div>
                        </div>
                      </td>

                      {/* Right: Royal Kingdom Motto & Tacteing */}
                      <td className="w-1/2 align-top text-center border-none p-0">
                        <div className="font-moul text-[15px] font-bold text-slate-950 mb-1">
                          ព្រះរាជាណាចក្រកម្ពុជា
                        </div>
                        <div className="font-moul text-[15px] font-bold text-slate-950 mb-1">
                          ជាតិ សាសនា ព្រះមហាក្សត្រ
                        </div>
                        <div className="flex justify-center items-center mt-1">
                          <img
                            src="/tacteing.png"
                            alt="Tacteing"
                            className="w-[125px] h-auto object-contain block mx-auto"
                            onError={(e: any) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Main Title */}
                <div className="text-center my-6">
                  <h2 className="font-moul text-[19px] font-bold text-slate-950 mb-1.5">
                    របាយការណ៍
                  </h2>
                  <h3 className="font-moul text-[15px] font-bold text-slate-950">
                    ស្តីពីការអានសៀវភៅប្រចាំខែ{month} ឆ្នាំ{year}
                  </h3>
                </div>

                {/* Section I */}
                <div className="font-moul text-[14px] font-bold text-slate-950 mt-5 mb-1.5">
                  I. របាយការណ៍សង្ខេបការអានសៀវភៅប្រចាំខែ{month}
                </div>
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>ល.រ</th>
                      <th style={{ width: '30%' }}>ភេទ</th>
                      <th style={{ width: '30%' }}>ចំនួន</th>
                      <th style={{ width: '30%' }}>ផ្សេងៗ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-center">1</td>
                      <td className="text-center">ប្រុស</td>
                      <td className="text-center font-bold">{data.maleCount} នាក់</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td className="text-center">2</td>
                      <td className="text-center">ស្រី</td>
                      <td className="text-center font-bold">{data.femaleCount} នាក់</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="text-center font-bold font-moul bg-slate-50">
                        សរុប
                      </td>
                      <td className="text-center font-bold">{data.totalReaders} នាក់</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>

                {/* Section II */}
                <div className="font-moul text-[14px] font-bold text-slate-950 mt-6 mb-1.5">
                  II. ឈ្មោះសិស្ស និងបុគ្គលិកដែលអានសៀវភៅប្រចាំខែ{month}
                </div>
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>ល.រ</th>
                      <th style={{ width: '32%' }}>ឈ្មោះ</th>
                      <th style={{ width: '14%' }}>ភេទ</th>
                      <th style={{ width: '32%' }}>ជំនាញសិក្សា</th>
                      <th style={{ width: '14%' }}>ផ្សេងៗ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.studentsList || []).map((st: any) => (
                      <tr key={st.no}>
                        <td className="text-center">{st.no}</td>
                        <td className="text-left font-bold">{st.name}</td>
                        <td className="text-center">{st.gender}</td>
                        <td className="text-left">{st.major}</td>
                        <td className="text-center">{st.remark || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-right text-[11px] text-slate-400 mt-4">
                  ទំព័រ ១ នៃ ៣
                </div>
              </div>

              {/* ================= PAGE 2 ================= */}
              <div
                ref={page2Ref}
                className="duc-monthly-sheet bg-white text-slate-950 w-full min-h-[1123px] p-[18mm] sm:p-[20mm] shadow-xl border border-slate-300 select-none"
                style={{ width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}
              >
                {/* Section III */}
                <div className="font-moul text-[14px] font-bold text-slate-950 mb-1.5">
                  III. ចំនួនសៀវភៅ ដែលបានខ្ចី និងអាននៅក្នុងបណ្ណាល័យ
                </div>
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>ល.រ</th>
                      <th style={{ width: '45%' }}>ប្រភេទ</th>
                      <th style={{ width: '25%' }}>ចំនួនសៀវភៅ</th>
                      <th style={{ width: '20%' }}>ផ្សេងៗ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-center">1</td>
                      <td className="text-left">ចំនួនសៀវភៅដែលបានខ្ចី</td>
                      <td className="text-center font-bold">{data.totalBorrowed} ក្បាល</td>
                      <td></td>
                    </tr>
                  </tbody>
                  <thead>
                    <tr>
                      <th style={{ width: '10%' }}>ល.រ</th>
                      <th style={{ width: '45%' }}>ប្រភេទ</th>
                      <th style={{ width: '25%' }}>ចំនួនសៀវភៅ</th>
                      <th style={{ width: '20%' }}>ផ្សេងៗ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-center">2</td>
                      <td className="text-left">ចំនួនសៀវភៅដែលបានសង</td>
                      <td className="text-center font-bold">{data.totalReturned} ក្បាល</td>
                      <td></td>
                    </tr>
                    <tr style={{ backgroundColor: '#fecaca' }}>
                      <td colSpan={2} className="text-center font-bold font-moul" style={{ backgroundColor: '#fecaca' }}>
                        សៀវភៅមិនទាន់សង
                      </td>
                      <td className="text-center font-bold" style={{ backgroundColor: '#fecaca' }}>
                        {data.totalUnreturned} ក្បាល
                      </td>
                      <td style={{ backgroundColor: '#fecaca' }}></td>
                    </tr>
                  </tbody>
                </table>

                {/* Section IV: First Half (Rows 1-6) */}
                <div className="font-moul text-[14px] font-bold text-slate-950 mt-8 mb-1.5">
                  IV. ឈ្មោះសៀវភៅ ដែលបានខ្ចីនៅក្រៅបណ្ណាល័យ
                </div>
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>ល.រ</th>
                      <th style={{ width: '28%' }}>ឈ្មោះ</th>
                      <th style={{ width: '12%' }}>ភេទ</th>
                      <th style={{ width: '26%' }}>ជំនាញសិក្សា</th>
                      <th style={{ width: '13%' }}>ចំនួនខ្ចី</th>
                      <th style={{ width: '13%' }}>ចំនួនសង</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page2Loans.map((ln: any) => (
                      <tr key={ln.no}>
                        <td className="text-center">{ln.no}</td>
                        <td className="text-left font-bold">{ln.name}</td>
                        <td className="text-center">{ln.gender}</td>
                        <td className="text-left">{ln.major}</td>
                        <td className="text-center">{ln.borrowed}</td>
                        <td className="text-center">{ln.returned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-right text-[11px] text-slate-400 mt-20">
                  ទំព័រ ២ នៃ ៣
                </div>
              </div>

              {/* ================= PAGE 3 ================= */}
              <div
                ref={page3Ref}
                className="duc-monthly-sheet bg-white text-slate-950 w-full min-h-[1123px] p-[18mm] sm:p-[20mm] shadow-xl border border-slate-300 select-none flex flex-col justify-between"
                style={{ width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}
              >
                <div>
                  {/* Section IV: Second Half (Rows 7-12) */}
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th style={{ width: '8%' }}>ល.រ</th>
                        <th style={{ width: '28%' }}>ឈ្មោះ</th>
                        <th style={{ width: '12%' }}>ភេទ</th>
                        <th style={{ width: '26%' }}>ជំនាញសិក្សា</th>
                        <th style={{ width: '13%' }}>ចំនួនខ្ចី</th>
                        <th style={{ width: '13%' }}>ចំនួនសង</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page3Loans.map((ln: any) => (
                        <tr key={ln.no}>
                          <td className="text-center">{ln.no}</td>
                          <td className="text-left font-bold">{ln.name}</td>
                          <td className="text-center">{ln.gender}</td>
                          <td className="text-left">{ln.major}</td>
                          <td className="text-center">{ln.borrowed}</td>
                          <td className="text-center">{ln.returned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Signatures and Approval Block */}
                  <table className="w-full border-none mt-10">
                    <tbody>
                      <tr>
                        {/* Left Column: Reviewer */}
                        <td className="w-1/2 align-top text-center border-none p-0">
                          <div className="h-7"></div>
                          <div className="font-battambang font-bold text-[14px] text-slate-950 mb-1.5">
                            បានឃើញ និងឯកភាព
                          </div>
                          <div className="font-moul font-bold text-[14px] text-slate-950 mb-20">
                            {data.reviewerTitle}
                          </div>
                        </td>

                        {/* Right Column: Date & Library Manager */}
                        <td className="w-1/2 align-top text-center border-none p-0">
                          <div className="font-battambang italic text-[13px] text-slate-800 mb-1">
                            {data.lunarDate}
                          </div>
                          <div className="font-battambang text-[13.5px] text-slate-950 mb-1.5">
                            {data.solarDate}
                          </div>
                          <div className="font-moul font-bold text-[14px] text-slate-950 mb-20">
                            {data.managerTitle}
                          </div>
                          <div className="font-moul font-bold text-[14.5px] text-slate-950">
                            {data.managerName}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-right text-[11px] text-slate-400 mt-8">
                  ទំព័រ ៣ នៃ ៣
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

