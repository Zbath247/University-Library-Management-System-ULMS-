import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Loader2,
  FileText,
  RotateCcw
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

interface DucExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DucExecutiveReportModal: React.FC<DucExecutiveReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [year, setYear] = useState<number>(2025);
  const [dataSource, setDataSource] = useState<'benchmark' | 'live'>('benchmark');
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch report data whenever year changes
  useEffect(() => {
    if (!isOpen) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/v1/reports/executive-reading?year=${year}`);
        if (res.data?.success) {
          setReportData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch executive reading report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [isOpen, year]);

  if (!isOpen) return null;

  const activeDataSet = dataSource === 'benchmark' ? reportData?.benchmark : reportData?.live;

  const monthlyReading = activeDataSet?.monthlyReading || [
    { no: 1, month: 'January', qty: 179, ratio: 15, avgDay: 6 },
    { no: 2, month: 'February', qty: 108, ratio: 9, avgDay: 4 },
    { no: 3, month: 'March', qty: 281, ratio: 24, avgDay: 9 },
    { no: 4, month: 'April', qty: 103, ratio: 9, avgDay: 3 },
    { no: 5, month: 'May', qty: 287, ratio: 24, avgDay: 10 },
    { no: 6, month: 'June', qty: 180, ratio: 15, avgDay: 6 },
    { no: 7, month: 'July', qty: 50, ratio: 4, avgDay: 2 },
    { no: 8, month: 'August', qty: 0, ratio: 0, avgDay: 1 },
    { no: 9, month: 'September', qty: 0, ratio: 0, avgDay: 1 },
    { no: 10, month: 'October', qty: 0, ratio: 0, avgDay: 1 },
    { no: 11, month: 'November', qty: 0, ratio: 0, avgDay: 0 },
    { no: 12, month: 'December', qty: 0, ratio: 0, avgDay: 0 },
  ];
  const totalMonthly = activeDataSet?.totalMonthly ?? 1188;

  const topBooks = activeDataSet?.topBooks || [
    { no: 1, name: 'ប្រយោជន៍នៃការអាន', qty: 54, ratio: 15 },
    { no: 2, name: 'រៀនពូកែ ប្រលងជាប់', qty: 48, ratio: 13 },
    { no: 3, name: '៣០វិធីរៀនពូកែ', qty: 46, ratio: 12 },
    { no: 4, name: 'ចិត្តវិទ្យា', qty: 42, ratio: 11 },
    { no: 5, name: 'យល់ទាញ', qty: 37, ratio: 10 },
    { no: 6, name: 'កំចាត់ភាពភ័យខ្លាចដោយប្រើដៃ', qty: 34, ratio: 9 },
    { no: 7, name: 'របៀបបង្កើតផែនការអាជីវកម្ម', qty: 31, ratio: 8 },
    { no: 8, name: 'កំពូលយុទ្ធសាស្ត្រ', qty: 28, ratio: 8 },
    { no: 9, name: 'គិតបែបក្លិប ធ្វើការបែបជប៉ុន', qty: 27, ratio: 7 },
    { no: 10, name: 'ទឹកចិត្តធ្វើរឿង', qty: 22, ratio: 6 },
  ];
  const totalTopBooks = activeDataSet?.totalTopBooks ?? 369;

  const genderReading = activeDataSet?.genderReading || [
    { no: 1, gender: 'Male', label: 'Male', qty: 713, ratio: 60, remark: '' },
    { no: 2, gender: 'Female', label: 'Female', qty: 475, ratio: 40, remark: '' },
  ];
  const totalGender = activeDataSet?.totalGender ?? 1188;

  // Chart data for line chart (months)
  const lineChartData = monthlyReading.map((m: any) => ({
    name: m.month.slice(0, 3),
    fullName: m.month,
    qty: m.qty > 0 ? m.qty : null,
    displayQty: m.qty,
    num: m.no,
  }));

  // Bar chart colors for Top 10 Books
  const barColors = [
    '#eab308', // gold/yellow
    '#d97706', // amber
    '#f59e0b', // orange
    '#ea580c', // deep orange
    '#ca8a04', // dark yellow
    '#854d0e', // dark bronze
    '#dc2626', // red
    '#2563eb', // blue
    '#059669', // green
    '#7c3aed', // purple
  ];

  // Custom Gender Pie Chart Label (clean, dark, properly positioned)
  const renderGenderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 14;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = Math.round((percent || 0) * 100);

    return (
      <g>
        {/* Crisp badge for 100% legibility */}
        <rect
          x={x > cx ? x - 2 : x - 62}
          y={y - 8}
          width={64}
          height={16}
          rx={3}
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth={0.8}
        />
        <text
          x={x > cx ? x + 30 : x - 30}
          y={y + 3.5}
          fill="#0f172a"
          textAnchor="middle"
          fontSize={8.5}
          fontWeight="bold"
          style={{ fontFamily: "'Kantumruy Pro', sans-serif" }}
        >
          {name} {pct}%
        </text>
      </g>
    );
  };

  // Direct PDF Download Handler
  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`DUC_Monthly_Students_Reading_Report_${year}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('មានបញ្ហាក្នុងការទាញយក PDF សូមសាកល្បងម្ដងទៀត ឬប្រើប៊ូតុងបោះពុម្ព');
    } finally {
      setIsExporting(false);
    }
  };

  // Browser Print Handler (Save as PDF)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Global Style for Printing and Beautiful Khmer Typography */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 5mm 7mm;
        }
        #duc-executive-sheet,
        #duc-executive-sheet * {
          font-family: 'Kantumruy Pro', 'Battambang', 'Siemreap', sans-serif !important;
          -webkit-font-smoothing: antialiased;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #duc-executive-sheet, #duc-executive-sheet * {
            visibility: visible;
          }
          #duc-executive-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
            padding: 3mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-h-none print:max-w-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                ទម្រង់របាយការណ៍ផ្លូវការ DUC (Executive Reading Report - PDF)
              </h2>
              <p className="text-xs text-slate-400">
                ផ្ទាំងទិន្នន័យ A4 Landscape ទម្រង់ដើម DUC សម្រាប់បោះពុម្ព ឬទាញយកជា PDF
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Year selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-medium">ឆ្នាំ៖</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value={2026} className="bg-slate-900">2026</option>
                <option value={2025} className="bg-slate-900">2025 (ទម្រង់ដើម)</option>
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
                គំរូដើម DUC (1,188)
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
                ទិន្នន័យក្នុងប្រព័ន្ធ (Live)
              </button>
            </div>

            {/* Direct PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>កំពុងបង្កើត PDF...</span>
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
            >
              <Printer className="w-3.5 h-3.5" />
              <span>បោះពុម្ព (Print / PDF)</span>
            </button>

            {/* Close */}
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
        <div className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm font-medium">កំពុងរៀបចំទិន្នន័យរបាយការណ៍...</p>
            </div>
          ) : (
            /* The Exact A4 Landscape Sheet Matching the Uploaded Photo */
            <div
              id="duc-executive-sheet"
              ref={reportRef}
              className="bg-white text-slate-900 border border-slate-300 shadow-xl print:shadow-none print:border-none w-[1120px] min-w-[1120px] p-5 mx-auto select-none font-khmer"
              style={{ minHeight: '740px' }}
            >
              {/* Header: DUC Crest Logo + Main Title */}
              <div className="flex items-center justify-between relative mb-3 pb-2 border-b-2 border-slate-800">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.png"
                    alt="DUC Emblem"
                    className="w-12 h-12 object-contain drop-shadow-xs"
                  />
                  <div className="text-left">
                    <div className="text-[11px] font-bold text-slate-900 leading-tight">សាកលវិទ្យាល័យឌីជីថលកម្ពុជា</div>
                    <div className="text-[8.5px] text-slate-500 font-medium">Digital University of Cambodia</div>
                  </div>
                </div>

                <h1 className="text-xl md:text-2xl font-bold text-[#1e3a8a] tracking-normal text-center pr-8">
                  Monthly Students'Reading in Library Report - {year}
                </h1>

                <div className="w-12"></div>
              </div>

              {/* Main Content: 2-Column Modular Grid */}
              <div className="grid grid-cols-12 gap-3.5">
                {/* =========================================================================
                    LEFT COLUMN (Cols 1-7): Section 1 (Monthly Reading) & Section 3 (Gender)
                   ========================================================================= */}
                <div className="col-span-7 flex flex-col justify-between space-y-3">
                  {/* 1) Monthly Students' Reading Qty in Library Report */}
                  <div>
                    <h2 className="text-[12.5px] font-bold text-slate-900 mb-1">
                      1) Monthly Students' Reading Qty in Library Report
                    </h2>

                    <div className="grid grid-cols-12 gap-2">
                      {/* Section 1 Table */}
                      <div className="col-span-6 overflow-hidden">
                        <table className="w-full border-collapse border border-black text-[10px]">
                          <thead>
                            <tr className="bg-[#fef08a] text-black font-bold">
                              <th className="border border-black px-1 py-0.5 text-center w-7">No</th>
                              <th className="border border-black px-1.5 py-0.5 text-left">Month Report</th>
                              <th className="border border-black px-1 py-0.5 text-center w-10">Qty</th>
                              <th className="border border-black px-1 py-0.5 text-center w-12">Ratio (%)</th>
                              <th className="border border-black px-1 py-0.5 text-center w-16">Average/Day</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthlyReading.map((row: any) => (
                              <tr key={row.no} className="hover:bg-slate-50">
                                <td className="border border-black px-1 py-0.5 text-center text-slate-800">{row.no}</td>
                                <td className="border border-black px-1.5 py-0.5 text-slate-800">{row.month}</td>
                                <td className="border border-black px-1 py-0.5 text-center font-medium text-slate-900">
                                  {row.qty > 0 ? row.qty : ''}
                                </td>
                                <td className="border border-black px-1 py-0.5 text-center text-blue-700 font-medium">
                                  {row.ratio > 0 ? `${row.ratio}%` : ''}
                                </td>
                                <td className="border border-black px-1 py-0.5 text-center text-slate-700">
                                  {row.avgDay > 0 ? row.avgDay : ''}
                                </td>
                              </tr>
                            ))}
                            {/* Total Row in Yellow */}
                            <tr className="bg-[#fef08a] font-bold text-black border-t-2 border-black">
                              <td colSpan={2} className="border border-black px-2 py-0.5 text-center font-bold">
                                Total:
                              </td>
                              <td className="border border-black px-1 py-0.5 text-center font-bold text-black">
                                {totalMonthly.toLocaleString()}
                              </td>
                              <td className="border border-black px-1 py-0.5 text-center font-bold">
                                {totalMonthly > 0 ? '100%' : ''}
                              </td>
                              <td className="border border-black px-1 py-0.5 text-center"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Section 1 Line Chart */}
                      <div className="col-span-6 border border-black bg-white p-1.5 flex flex-col justify-between">
                        <div className="text-[10.5px] font-bold text-[#1e3a8a] text-center mb-0.5 leading-tight">
                          Monthly Student Reading Qty in Library Report <br />
                          (Jan-July - {year})
                        </div>
                        <div className="h-40 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineChartData} margin={{ top: 14, right: 10, left: -25, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 7.5, fill: '#334155' }}
                                interval={0}
                                tickLine={false}
                              />
                              <YAxis
                                domain={[0, 350]}
                                ticks={[0, 50, 100, 150, 200, 250, 300, 350]}
                                tick={{ fontSize: 7.5, fill: '#334155' }}
                                tickLine={false}
                              />
                              <Line
                                type="linear"
                                dataKey="qty"
                                stroke="#334155"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                                dot={{ fill: '#dc2626', stroke: '#dc2626', r: 3 }}
                                label={({ x, y, value }: any) =>
                                  value ? (
                                    <text
                                      x={x}
                                      y={y - 5}
                                      fill="#dc2626"
                                      fontSize={8}
                                      fontWeight="bold"
                                      textAnchor="middle"
                                    >
                                      {value}
                                    </text>
                                  ) : null
                                }
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Month index numbers row (1 to 12) */}
                        <div className="grid grid-cols-12 text-[7px] text-center text-slate-500 font-semibold border-t border-slate-200 pt-0.5">
                          {lineChartData.map((m: any) => (
                            <div key={m.num}>{m.num}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3) Monthly Reading Qty By Gender Report */}
                  <div>
                    <h2 className="text-[12.5px] font-bold text-slate-900 mb-1">
                      3) Monthly Reading Qty By Gender Report
                    </h2>

                    <div className="grid grid-cols-12 gap-2">
                      {/* Section 3 Table */}
                      <div className="col-span-6 overflow-hidden">
                        <table className="w-full border-collapse border border-black text-[10px]">
                          <thead>
                            <tr className="bg-[#fef08a] text-black font-bold">
                              <th className="border border-black px-1 py-1 text-center w-7">No</th>
                              <th className="border border-black px-2 py-1 text-left">By Gender</th>
                              <th className="border border-black px-1 py-1 text-center w-12">Qty</th>
                              <th className="border border-black px-1 py-1 text-center w-14">Ratio (%)</th>
                              <th className="border border-black px-1 py-1 text-center">Remark</th>
                            </tr>
                          </thead>
                          <tbody>
                            {genderReading.map((row: any) => (
                              <tr key={row.no} className="hover:bg-slate-50">
                                <td className="border border-black px-1 py-1 text-center text-slate-800">{row.no}</td>
                                <td className="border border-black px-2 py-1 font-medium text-slate-800">{row.gender}</td>
                                <td className="border border-black px-1 py-1 text-center font-bold text-slate-900">{row.qty}</td>
                                <td className="border border-black px-1 py-1 text-center font-semibold text-blue-700">{row.ratio}%</td>
                                <td className="border border-black px-1 py-1 text-center text-slate-600">{row.remark}</td>
                              </tr>
                            ))}
                            {/* Total Row in Yellow */}
                            <tr className="bg-[#fef08a] font-bold text-black border-t-2 border-black">
                              <td colSpan={2} className="border border-black px-2 py-1 text-center font-bold">
                                Total:
                              </td>
                              <td className="border border-black px-1 py-1 text-center font-bold text-black">
                                {totalGender.toLocaleString()}
                              </td>
                              <td className="border border-black px-1 py-1 text-center font-bold">100%</td>
                              <td className="border border-black px-1 py-1 text-center"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Section 3 Pie Chart (Fixed readable size, dark text, no overflow) */}
                      <div className="col-span-6 border border-black bg-white p-1.5 flex flex-col justify-between items-center h-[142px]">
                        <div className="text-[10.5px] font-bold text-[#1e3a8a] text-center mb-0.5">
                          Monthly Reading Qty By Gender-{year}
                        </div>

                        <div className="h-24 w-full flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 2, right: 10, left: 10, bottom: 2 }}>
                              <Pie
                                data={genderReading}
                                dataKey="qty"
                                nameKey="gender"
                                cx="50%"
                                cy="50%"
                                outerRadius={32}
                                label={renderGenderPieLabel}
                                labelLine={{ stroke: '#64748b', strokeWidth: 0.8 }}
                              >
                                <Cell fill="#b4835a" stroke="#451a03" strokeWidth={1} />
                                <Cell fill="#fef08a" stroke="#ca8a04" strokeWidth={1} />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Legend matching photo with percentages */}
                        <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-slate-800 pt-0.5 border-t border-slate-100 w-full">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-[#b4835a] border border-black inline-block"></span>
                            <span>Male (60%)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-[#fef08a] border border-black inline-block"></span>
                            <span>Female (40%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    RIGHT COLUMN (Cols 8-12): Section 2 (Top 10 Books Table + Bar Chart)
                   ========================================================================= */}
                <div className="col-span-5 flex flex-col justify-between space-y-2.5">
                  {/* 2) Top 10 Books' Title Reading Report Table */}
                  <div>
                    <h2 className="text-[12.5px] font-bold text-slate-900 mb-1">
                      2) Top 10 Books' Tittle Reading Report
                    </h2>
                    <div className="overflow-hidden">
                      <table className="w-full border-collapse border border-black text-[10px]">
                        <thead>
                          <tr className="bg-[#fef08a] text-black font-bold">
                            <th className="border border-black px-1 py-0.5 text-center w-7">No</th>
                            <th className="border border-black px-2 py-0.5 text-left font-bold">Book Name</th>
                            <th className="border border-black px-1 py-0.5 text-center w-10">Qty</th>
                            <th className="border border-black px-1 py-0.5 text-center w-14">Ratio (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topBooks.map((row: any) => (
                            <tr key={row.no} className="hover:bg-slate-50">
                              <td className="border border-black px-1 py-0.5 text-center text-slate-800">{row.no}</td>
                              <td
                                className="border border-black px-2 py-0.5 text-slate-900 font-medium text-[10.5px] leading-tight truncate max-w-[210px]"
                                title={row.name}
                              >
                                {row.name}
                              </td>
                              <td className="border border-black px-1 py-0.5 text-center font-bold text-slate-900">{row.qty}</td>
                              <td className="border border-black px-1 py-0.5 text-center text-blue-700 font-semibold">{row.ratio}%</td>
                            </tr>
                          ))}
                          {/* Total Row in Yellow */}
                          <tr className="bg-[#fef08a] font-bold text-black border-t-2 border-black">
                            <td colSpan={2} className="border border-black px-2 py-1 text-center font-bold">
                              Total:
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-bold text-black">
                              {totalTopBooks.toLocaleString()}
                            </td>
                            <td className="border border-black px-1 py-1 text-center font-bold">100%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Top 10 Books Bar Chart Box with Beautiful Khmer Rotated Labels */}
                  <div className="border border-black bg-white p-2 flex flex-col justify-between">
                    <div className="text-[10.5px] font-bold text-[#1e3a8a] text-center mb-0.5">
                      Top 10 Books' Tittle Reading in Library Report- {year}
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topBooks}
                          margin={{ top: 14, right: 10, left: -25, bottom: 48 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis
                            dataKey="name"
                            interval={0}
                            tick={({ x, y, payload }: any) => {
                              const raw = payload.value || '';
                              const displayVal = raw.length > 14 ? raw.substring(0, 14) + '...' : raw;
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <text
                                    x={0}
                                    y={0}
                                    dy={10}
                                    textAnchor="end"
                                    fill="#1e293b"
                                    fontSize={8}
                                    fontWeight="600"
                                    transform="rotate(-45)"
                                    style={{ fontFamily: "'Kantumruy Pro', sans-serif" }}
                                  >
                                    {displayVal}
                                  </text>
                                </g>
                              );
                            }}
                          />
                          <YAxis
                            domain={[0, 60]}
                            ticks={[0, 10, 20, 30, 40, 50, 60]}
                            tick={{ fontSize: 7.5, fill: '#334155' }}
                            tickLine={false}
                          />
                          <Bar
                            dataKey="qty"
                            label={({ x, y, width, value }: any) =>
                              value ? (
                                <text
                                  x={x + width / 2}
                                  y={y - 4}
                                  fill="#0f172a"
                                  fontSize={8}
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  style={{ fontFamily: "'Kantumruy Pro', sans-serif" }}
                                >
                                  {value}
                                </text>
                              ) : null
                            }
                          >
                            {topBooks.map((_: any, index: number) => (
                              <Cell
                                key={`bar-cell-${index}`}
                                fill={barColors[index % barColors.length]}
                                stroke="#1e293b"
                                strokeWidth={0.8}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Print Footer */}
              <div className="mt-3 pt-1.5 border-t border-slate-300 flex items-center justify-between text-[8.5px] text-slate-500 font-khmer">
                <div>
                  សាកលវិទ្យាល័យឌីជីថលកម្ពុជា (Digital University of Cambodia) • ប្រព័ន្ធគ្រប់គ្រងបណ្ណាល័យសាកលវិទ្យាល័យ
                </div>
                <div>
                  កាលបរិច្ឆេទបង្កើត៖ {new Date().toLocaleDateString('km-KH')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default DucExecutiveReportModal;
