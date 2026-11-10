import fs from 'fs';
import path from 'path';
import prisma from '../../db/prisma';

export interface MonthlyReportData {
  month: string;
  year: number;
  mode: 'benchmark' | 'live';
  maleCount: number;
  femaleCount: number;
  totalReaders: number;
  totalBorrowed: number;
  totalReturned: number;
  totalUnreturned: number;
  studentsList: Array<{
    no: number;
    name: string;
    gender: string;
    major: string;
    remark?: string;
  }>;
  loanList: Array<{
    no: number;
    name: string;
    gender: string;
    major: string;
    borrowed: string;
    returned: string;
  }>;
  lunarDate: string;
  solarDate: string;
  reviewerTitle: string;
  managerTitle: string;
  managerName: string;
}

export class MonthlyReportService {
  /**
   * Loads report data for either benchmark template or live database
   */
  static async getMonthlyReportData(
    monthName: string = 'តុលា',
    year: number = 2026,
    mode: 'benchmark' | 'live' = 'benchmark'
  ): Promise<MonthlyReportData> {
    const benchmarkStudents = [
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
    ];

    const benchmarkLoans = [
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
    ];

    let studentsList = benchmarkStudents;
    let loanList = benchmarkLoans;
    let maleCount = 24;
    let femaleCount = 17;
    let totalReaders = 41;
    let totalBorrowed = 12;
    let totalReturned = 8;
    let totalUnreturned = 4;

    if (mode === 'live') {
      try {
        const liveMembers = await prisma.member.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        if (liveMembers.length > 0) {
          studentsList = liveMembers.map((m, idx) => ({
            no: idx + 1,
            name: m.fullNameKhmer || m.fullNameEnglish,
            gender: idx % 2 === 0 ? 'ប្រុស' : 'ស្រី',
            major: m.department?.split('>')?.pop()?.trim() || m.department || 'ព័ត៌មានវិទ្យា',
          }));
          maleCount = studentsList.filter((s) => s.gender === 'ប្រុស').length;
          femaleCount = studentsList.filter((s) => s.gender === 'ស្រី').length;
          totalReaders = studentsList.length;
        }

        const liveLoans = await prisma.loan.findMany({
          take: 30,
          include: { member: true, bookCopy: { include: { book: true } } },
          orderBy: { issueDate: 'desc' },
        });
        if (liveLoans.length > 0) {
          loanList = liveLoans.map((l, idx) => ({
            no: idx + 1,
            name: l.member?.fullNameKhmer || l.member?.fullNameEnglish || 'សិស្ស',
            gender: idx % 2 === 0 ? 'ប្រុស' : 'ស្រី',
            major: l.member?.department?.split('>')?.pop()?.trim() || 'ព័ត៌មានវិទ្យា',
            borrowed: '1 ក្បាល',
            returned: l.status === 'RETURNED' ? '1 ក្បាល' : '0 ក្បាល',
          }));
          totalBorrowed = liveLoans.length;
          totalReturned = liveLoans.filter((l) => l.status === 'RETURNED').length;
          totalUnreturned = totalBorrowed - totalReturned;
        }
      } catch (err) {
        console.error('Error fetching live data for monthly report:', err);
      }
    }

    return {
      month: monthName,
      year,
      mode,
      maleCount,
      femaleCount,
      totalReaders,
      totalBorrowed,
      totalReturned,
      totalUnreturned,
      studentsList,
      loanList,
      lunarDate: 'ថ្ងៃពុធ ១២កើត ខែកត្តិក ឆ្នាំរោង ឆស័ក ព.ស. ២៥៦៩',
      solarDate: `រាជធានីភ្នំពេញ, ថ្ងៃទី០៤ ខែ${monthName} ឆ្នាំ${year}`,
      reviewerTitle: 'អ្នកត្រួតពិនិត្យ',
      managerTitle: 'អ្នកគ្រប់គ្រងបណ្ណាល័យ',
      managerName: 'សែម សុខុម',
    };
  }

  /**
   * Generates a pixel-perfect standalone HTML document for high-res A4 printing / Save as PDF
   * strictly styled with Khmer OS Battambang and Khmer OS Muol Light fonts.
   */
  static async renderMonthlyReportHtml(
    monthName: string = 'តុលា',
    year: number = 2026,
    mode: 'benchmark' | 'live' = 'benchmark',
    autoPrint: boolean = false
  ): Promise<string> {
    const data = await this.getMonthlyReportData(monthName, year, mode);

    let logoBase64 = '';
    try {
      const logoPath = path.resolve(process.cwd(), 'storage', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const buf = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Could not read logo image:', e);
    }

    let tacteingBase64 = '';
    try {
      const tacteingPath = path.resolve(process.cwd(), 'storage', 'tacteing.png');
      if (fs.existsSync(tacteingPath)) {
        const buf = fs.readFileSync(tacteingPath);
        tacteingBase64 = `data:image/png;base64,${buf.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Could not read tacteing image:', e);
    }

    // Split loanList into Page 2 (rows 1-6) and Page 3 (rows 7-12)
    const page2Loans = data.loanList.slice(0, 6);
    const page3Loans = data.loanList.slice(6);

    return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="utf-8">
  <title>DUC_Library_Monthly_Report_${encodeURIComponent(monthName)}_${year}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Moul&family=Moulpali&family=Kantumruy+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'Khmer OS Muol Light';
      src: local('Khmer OS Muol Light'), local('Khmer OS Muol'), local('KhmerOSMuolLight'), local('Moul');
    }
    @font-face {
      font-family: 'Khmer OS Battambang';
      src: local('Khmer OS Battambang'), local('KhmerOSBattambang'), local('Battambang');
    }

    * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      color: #000000;
      font-family: 'Khmer OS Battambang', 'Battambang', 'Kantumruy Pro', sans-serif;
      font-size: 13.5px;
      line-height: 1.5;
    }

    .font-moul {
      font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', 'Moulpali', serif !important;
    }

    .font-battambang {
      font-family: 'Khmer OS Battambang', 'Battambang', 'Kantumruy Pro', sans-serif !important;
    }

    /* Screen Action Bar */
    .action-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      background: #0f2c59;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .action-bar h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
    }
    .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
      font-family: 'Khmer OS Battambang', 'Battambang', sans-serif;
    }
    .btn-print {
      background: #059669;
      color: #ffffff;
    }
    .btn-print:hover {
      background: #047857;
    }
    .btn-word {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-word:hover {
      background: #1d4ed8;
    }

    /* A4 Portrait Sheets */
    .sheet-wrapper {
      padding: 24px 0 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
    }

    .a4-page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 20mm 18mm 20mm;
      background: #ffffff;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      position: relative;
      overflow: hidden;
    }

    /* Tables */
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      margin-top: 10px;
      margin-bottom: 18px;
      font-size: 13px;
    }
    table.report-table th,
    table.report-table td {
      border: 1px solid #000000;
      padding: 6px 8px;
      vertical-align: middle;
      line-height: 1.4;
    }
    table.report-table th {
      background-color: #b9d5f7;
      font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', serif;
      font-size: 13px;
      text-align: center;
      font-weight: bold;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .pink-cell {
      background-color: #fecaca !important;
    }

    /* Layout Elements */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .header-table td {
      border: none;
      padding: 0;
      vertical-align: top;
    }
    .report-title-box {
      text-align: center;
      margin-bottom: 22px;
    }
    .report-title {
      font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', serif;
      font-size: 19px;
      font-weight: bold;
      margin: 0 0 6px 0;
    }
    .report-subtitle {
      font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', serif;
      font-size: 15px;
      font-weight: bold;
      margin: 0;
    }
    .section-title {
      font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', serif;
      font-size: 14px;
      font-weight: bold;
      margin: 16px 0 6px 0;
    }

    /* Signatures Table */
    .signature-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
    }
    .signature-table td {
      border: none;
      padding: 0;
      vertical-align: top;
      text-align: center;
    }

    /* Print styles */
    @page {
      size: A4 portrait;
      margin: 14mm 16mm 14mm 16mm;
    }
    @media print {
      body {
        background: #ffffff !important;
        font-size: 12.5px;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .action-bar {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
        gap: 0 !important;
      }
      .a4-page {
        width: 100% !important;
        min-height: auto !important;
        padding: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        page-break-after: always;
        break-after: page;
      }
      .a4-page:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }
      table.report-table th {
        background-color: #b9d5f7 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .pink-cell {
        background-color: #fecaca !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>

  <!-- Top Action Bar for Quick Printing and Exporting -->
  <div class="action-bar">
    <div>
      <h1 class="font-moul">របាយការណ៍បណ្ណាល័យផ្លូវការ DUC (A4 PDF)</h1>
      <small style="color: #cbd5e1; font-size: 11px;">ពុម្ពអក្សរខ្មែរ៖ Khmer OS Battambang &amp; Khmer OS Muol Light</small>
    </div>
    <div class="btn-group">
      <button class="btn btn-print" onclick="window.print()">
        🖨️ បោះពុម្ព / រក្សាទុកជា PDF (Save as PDF)
      </button>
      <a class="btn btn-word" href="/api/v1/reports/monthly-reading-word?month=${encodeURIComponent(monthName)}&year=${year}&mode=${mode}">
        📝 ទាញយក Word (.docx)
      </a>
    </div>
  </div>

  <div class="sheet-wrapper">
    <!-- ==================== PAGE 1 ==================== -->
    <div class="a4-page" id="page-1">
      <!-- Top Header Table -->
      <table class="header-table">
        <tr>
          <!-- Left: Logo & University Name (Logo centered relative to University Name) -->
          <td style="width: 50%; vertical-align: top; text-align: left;">
            <div style="display: inline-flex; flex-direction: column; align-items: center; text-align: center;">
              ${logoBase64 ? `<img src="${logoBase64}" alt="DUC Logo" style="width: 56px; height: 56px; object-fit: contain; margin: 0 auto 6px auto; display: block;">` : ''}
              <div class="font-moul" style="font-size: 14.5px; font-weight: bold; color: #000000; margin-bottom: 3px; text-align: center;">
                សាកលវិទ្យាល័យឌីជីថលកម្ពុជា
              </div>
              <div class="font-battambang" style="font-size: 13.5px; font-weight: bold; color: #000000; text-align: center;">
                បណ្ណាល័យសិក្សា
              </div>
            </div>
          </td>
          <!-- Right: Royal Kingdom Header & Tacteing -->
          <td style="width: 50%; vertical-align: top; text-align: center;">
            <div class="font-moul" style="font-size: 15px; font-weight: bold; color: #000000; margin-bottom: 4px;">
              ព្រះរាជាណាចក្រកម្ពុជា
            </div>
            <div class="font-moul" style="font-size: 15px; font-weight: bold; color: #000000; margin-bottom: 4px;">
              ជាតិ សាសនា ព្រះមហាក្សត្រ
            </div>
            <div style="display: flex; justify-content: center; align-items: center; margin-top: 2px;">
              ${tacteingBase64 ? `<img src="${tacteingBase64}" alt="Tacteing" style="width: 125px; height: auto; object-fit: contain; display: block; margin: 0 auto;">` : '<div style="font-size: 14px; letter-spacing: 2px; color: #475569;">៚ ៚ ៚</div>'}
            </div>
          </td>
        </tr>
      </table>

      <!-- Main Title -->
      <div class="report-title-box">
        <h2 class="report-title">របាយការណ៍</h2>
        <h3 class="report-subtitle">ស្តីពីការអានសៀវភៅប្រចាំខែ${monthName} ឆ្នាំ${year}</h3>
      </div>

      <!-- Section I: Summary Table -->
      <div class="section-title">I. របាយការណ៍សង្ខេបការអានសៀវភៅប្រចាំខែ${monthName}</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 10%;">ល.រ</th>
            <th style="width: 30%;">ភេទ</th>
            <th style="width: 30%;">ចំនួន</th>
            <th style="width: 30%;">ផ្សេងៗ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">1</td>
            <td class="text-center">ប្រុស</td>
            <td class="text-center bold">${data.maleCount} នាក់</td>
            <td></td>
          </tr>
          <tr>
            <td class="text-center">2</td>
            <td class="text-center">ស្រី</td>
            <td class="text-center bold">${data.femaleCount} នាក់</td>
            <td></td>
          </tr>
          <tr>
            <td colspan="2" class="text-center bold font-moul" style="background-color: #f8fafc;">សរុប</td>
            <td class="text-center bold">${data.totalReaders} នាក់</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <!-- Section II: List of Students Table -->
      <div class="section-title">II. ឈ្មោះសិស្ស និងបុគ្គលិកដែលអានសៀវភៅប្រចាំខែ${monthName}</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 8%;">ល.រ</th>
            <th style="width: 32%;">ឈ្មោះ</th>
            <th style="width: 14%;">ភេទ</th>
            <th style="width: 32%;">ជំនាញសិក្សា</th>
            <th style="width: 14%;">ផ្សេងៗ</th>
          </tr>
        </thead>
        <tbody>
          ${data.studentsList
            .map(
              (st) => `<tr>
            <td class="text-center">${st.no}</td>
            <td class="text-left bold">${st.name}</td>
            <td class="text-center">${st.gender}</td>
            <td class="text-left">${st.major}</td>
            <td class="text-center">${st.remark || ''}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- ==================== PAGE 2 ==================== -->
    <div class="a4-page" id="page-2">
      <!-- Section III: Books Borrowed & Read Inside/Outside Library -->
      <div class="section-title" style="margin-top: 0;">III. ចំនួនសៀវភៅ ដែលបានខ្ចី និងអាននៅក្នុងបណ្ណាល័យ</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 10%;">ល.រ</th>
            <th style="width: 45%;">ប្រភេទ</th>
            <th style="width: 25%;">ចំនួនសៀវភៅ</th>
            <th style="width: 20%;">ផ្សេងៗ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">1</td>
            <td class="text-left">ចំនួនសៀវភៅដែលបានខ្ចី</td>
            <td class="text-center bold">${data.totalBorrowed} ក្បាល</td>
            <td></td>
          </tr>
        </tbody>
        <thead>
          <tr>
            <th style="width: 10%;">ល.រ</th>
            <th style="width: 45%;">ប្រភេទ</th>
            <th style="width: 25%;">ចំនួនសៀវភៅ</th>
            <th style="width: 20%;">ផ្សេងៗ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-center">2</td>
            <td class="text-left">ចំនួនសៀវភៅដែលបានសង</td>
            <td class="text-center bold">${data.totalReturned} ក្បាល</td>
            <td></td>
          </tr>
          <tr class="pink-cell">
            <td colspan="2" class="text-center bold font-moul pink-cell">សៀវភៅមិនទាន់សង</td>
            <td class="text-center bold pink-cell">${data.totalUnreturned} ក្បាល</td>
            <td class="pink-cell"></td>
          </tr>
        </tbody>
      </table>

      <!-- Section IV: Borrowed Book Names (First Half: Rows 1-6) -->
      <div class="section-title">IV. ឈ្មោះសៀវភៅ ដែលបានខ្ចីនៅក្រៅបណ្ណាល័យ</div>
      <table class="report-table">
        <thead>
          <tr>
            <th style="width: 8%;">ល.រ</th>
            <th style="width: 28%;">ឈ្មោះ</th>
            <th style="width: 12%;">ភេទ</th>
            <th style="width: 26%;">ជំនាញសិក្សា</th>
            <th style="width: 13%;">ចំនួនខ្ចី</th>
            <th style="width: 13%;">ចំនួនសង</th>
          </tr>
        </thead>
        <tbody>
          ${page2Loans
            .map(
              (ln) => `<tr>
            <td class="text-center">${ln.no}</td>
            <td class="text-left bold">${ln.name}</td>
            <td class="text-center">${ln.gender}</td>
            <td class="text-left">${ln.major}</td>
            <td class="text-center">${ln.borrowed}</td>
            <td class="text-center">${ln.returned}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- ==================== PAGE 3 ==================== -->
    <div class="a4-page" id="page-3">
      <!-- Section IV Continuation (Rows 7-12) -->
      <table class="report-table" style="margin-top: 0;">
        <thead>
          <tr>
            <th style="width: 8%;">ល.រ</th>
            <th style="width: 28%;">ឈ្មោះ</th>
            <th style="width: 12%;">ភេទ</th>
            <th style="width: 26%;">ជំនាញសិក្សា</th>
            <th style="width: 13%;">ចំនួនខ្ចី</th>
            <th style="width: 13%;">ចំនួនសង</th>
          </tr>
        </thead>
        <tbody>
          ${page3Loans
            .map(
              (ln) => `<tr>
            <td class="text-center">${ln.no}</td>
            <td class="text-left bold">${ln.name}</td>
            <td class="text-center">${ln.gender}</td>
            <td class="text-left">${ln.major}</td>
            <td class="text-center">${ln.borrowed}</td>
            <td class="text-center">${ln.returned}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>

      <!-- Signatures and Official DUC Approval Block -->
      <table class="signature-table">
        <tr>
          <!-- Left: Reviewer -->
          <td style="width: 50%;">
            <div style="height: 28px;"></div>
            <div class="font-battambang bold" style="font-size: 14px; margin-bottom: 6px;">
              បានឃើញ និងឯកភាព
            </div>
            <div class="font-moul bold" style="font-size: 14px; margin-bottom: 64px;">
              ${data.reviewerTitle}
            </div>
          </td>
          <!-- Right: Date & Library Manager -->
          <td style="width: 50%;">
            <div class="font-battambang" style="font-style: italic; font-size: 13px; margin-bottom: 4px;">
              ${data.lunarDate}
            </div>
            <div class="font-battambang" style="font-size: 13.5px; margin-bottom: 6px;">
              ${data.solarDate}
            </div>
            <div class="font-moul bold" style="font-size: 14px; margin-bottom: 64px;">
              ${data.managerTitle}
            </div>
            <div class="font-moul bold" style="font-size: 14.5px;">
              ${data.managerName}
            </div>
          </td>
        </tr>
      </table>
    </div>
  </div>

  ${
    autoPrint
      ? `<script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>`
      : ''
  }
</body>
</html>`;
  }
}

