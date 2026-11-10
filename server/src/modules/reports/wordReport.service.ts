import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  ShadingType,
  VerticalAlign,
  IFontAttributesProperties,
} from 'docx';
import { MonthlyReportService } from './monthlyReport.service';

export class WordReportService {
  /**
   * Generates official DUC Monthly Library Report Word (.docx) document
   * Formatted strictly with official Cambodian administrative typography:
   * - Headings & Titles: Khmer OS Muol Light
   * - Body, Tables & Signatures: Khmer OS Battambang
   * Using OpenXML Complex Script (cs) attributes for flawless rendering in Microsoft Word.
   */
  static async generateMonthlyReadingDocx(monthName: string = 'តុលា', year: number = 2026, mode: 'benchmark' | 'live' = 'benchmark'): Promise<Buffer> {
    const FONT_MUOL: IFontAttributesProperties = {
      ascii: 'Khmer OS Muol Light',
      cs: 'Khmer OS Muol Light',
      hAnsi: 'Khmer OS Muol Light',
      hint: 'cs',
    };

    const FONT_BATTAMBANG: IFontAttributesProperties = {
      ascii: 'Khmer OS Battambang',
      cs: 'Khmer OS Battambang',
      hAnsi: 'Khmer OS Battambang',
      hint: 'cs',
    };

    // Standard borders for table cells
    const cellBorders = {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    };

    const noBorders = {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    };

    // Helper: Header table cell with light blue background
    const makeHeaderCell = (text: string, widthPct: number) => {
      return new TableCell({
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        shading: { fill: 'b9d5f7', type: ShadingType.CLEAR },
        borders: cellBorders,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { line: 260, lineRule: 'auto' },
            children: [
              new TextRun({
                text,
                bold: true,
                boldComplexScript: true,
                font: FONT_MUOL,
                size: 20, // 10pt
                sizeComplexScript: 20,
                color: '000000',
              }),
            ],
          }),
        ],
      });
    };

    // Helper: Standard table cell
    const makeDataCell = (
      text: string,
      widthPct: number,
      alignment: any = AlignmentType.CENTER,
      isBold: boolean = false,
      fillColor?: string
    ) => {
      return new TableCell({
        width: { size: widthPct, type: WidthType.PERCENTAGE },
        shading: fillColor ? { fill: fillColor, type: ShadingType.CLEAR } : undefined,
        borders: cellBorders,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 90, bottom: 90, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment,
            spacing: { line: 260, lineRule: 'auto' },
            children: [
              new TextRun({
                text,
                bold: isBold,
                boldComplexScript: isBold,
                font: FONT_BATTAMBANG,
                size: 20, // 10pt
                sizeComplexScript: 20,
                color: '000000',
              }),
            ],
          }),
        ],
      });
    };

    // Logo image loading
    let logoImageRun: ImageRun | null = null;
    try {
      const logoPath = path.resolve(process.cwd(), 'storage', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        logoImageRun = new ImageRun({
          data: logoData,
          transformation: { width: 55, height: 55 },
          type: 'png',
        } as any);
      }
    } catch (e) {
      console.warn('Could not load logo for Word report:', e);
    }

    // Tacteing flourish image loading
    let tacteingImageRun: ImageRun | null = null;
    try {
      const tacteingPath = path.resolve(process.cwd(), 'storage', 'tacteing.png');
      if (fs.existsSync(tacteingPath)) {
        const tacteingData = fs.readFileSync(tacteingPath);
        tacteingImageRun = new ImageRun({
          data: tacteingData,
          transformation: { width: 95, height: 41 },
          type: 'png',
        } as any);
      }
    } catch (e) {
      console.warn('Could not load tacteing image for Word report:', e);
    }

    // Fetch unified monthly report data (benchmark or live database)
    const reportData = await MonthlyReportService.getMonthlyReportData(monthName, year, mode);
    const {
      studentsList,
      loanList,
      maleCount,
      femaleCount,
      totalReaders,
      totalBorrowed,
      totalReturned,
      totalUnreturned,
    } = reportData;

    // -------------------------------------------------------------
    // BUILD THE DOCUMENT ELEMENTS
    // -------------------------------------------------------------

    // Top Header: 2-column borderless table
    // Left: Logo + DUC Name + Library
    // Right: Kingdom of Cambodia Motto
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            // Left Column (Logo centered above University Name)
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                ...(logoImageRun
                  ? [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { line: 260, lineRule: 'auto', after: 60 },
                        children: [logoImageRun],
                      }),
                    ]
                  : []),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto', after: 40 },
                  children: [
                    new TextRun({
                      text: 'សាកលវិទ្យាល័យឌីជីថលកម្ពុជា',
                      font: FONT_MUOL,
                      size: 21, // ~10.5pt
                      sizeComplexScript: 21,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto' },
                  children: [
                    new TextRun({
                      text: 'បណ្ណាល័យសិក្សា',
                      font: FONT_BATTAMBANG,
                      size: 20, // 10pt
                      sizeComplexScript: 20,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
              ],
            }),
            // Right Column: Kingdom Motto & Tacteing
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto', after: 40 },
                  children: [
                    new TextRun({
                      text: 'ព្រះរាជាណាចក្រកម្ពុជា',
                      font: FONT_MUOL,
                      size: 23, // ~11.5pt
                      sizeComplexScript: 23,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto', after: 60 },
                  children: [
                    new TextRun({
                      text: 'ជាតិ សាសនា ព្រះមហាក្សត្រ',
                      font: FONT_MUOL,
                      size: 23, // ~11.5pt
                      sizeComplexScript: 23,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: tacteingImageRun
                    ? [tacteingImageRun]
                    : [
                        new TextRun({
                          text: '🙢 🙠 🙢 🙠 🙢',
                          size: 16,
                          sizeComplexScript: 16,
                          color: '475569',
                        }),
                      ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // Main Title
    const titleParagraphs = [
      new Paragraph({ spacing: { before: 200, after: 100 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 280, lineRule: 'auto', after: 60 },
        children: [
          new TextRun({
            text: 'របាយការណ៍',
            font: FONT_MUOL,
            size: 28, // 14pt
            sizeComplexScript: 28,
            bold: true,
            boldComplexScript: true,
            color: '000000',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 280, lineRule: 'auto', after: 250 },
        children: [
          new TextRun({
            text: `ស្តីពីការអានសៀវភៅប្រចាំខែ${monthName} ឆ្នាំ${year}`,
            font: FONT_MUOL,
            size: 23, // 11.5pt
            sizeComplexScript: 23,
            bold: true,
            boldComplexScript: true,
            color: '000000',
          }),
        ],
      }),
    ];

    // Section I: Summary Table
    const sectionIHeading = new Paragraph({
      spacing: { before: 150, after: 100, line: 260, lineRule: 'auto' },
      children: [
        new TextRun({
          text: `I. របាយការណ៍សរុបអ្នកអានសៀវភៅប្រចាំខែ${monthName}`,
          font: FONT_MUOL,
          size: 21,
          sizeComplexScript: 21,
          bold: true,
          boldComplexScript: true,
        }),
      ],
    });

    const tableI = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [
        new TableRow({
          cantSplit: true,
          tableHeader: true,
          children: [
            makeHeaderCell('ល.រ', 10),
            makeHeaderCell('ភេទ', 30),
            makeHeaderCell('ចំនួន', 30),
            makeHeaderCell('ផ្សេងៗ', 30),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            makeDataCell('1', 10),
            makeDataCell('ប្រុស', 30, AlignmentType.CENTER),
            makeDataCell(`${maleCount} នាក់`, 30, AlignmentType.CENTER, true),
            makeDataCell('', 30),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            makeDataCell('2', 10),
            makeDataCell('ស្រី', 30, AlignmentType.CENTER),
            makeDataCell(`${femaleCount} នាក់`, 30, AlignmentType.CENTER, true),
            makeDataCell('', 30),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 2,
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: cellBorders,
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto' },
                  children: [
                    new TextRun({
                      text: 'សរុប',
                      font: FONT_MUOL,
                      size: 20,
                      sizeComplexScript: 20,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
              ],
            }),
            makeDataCell(`${totalReaders} នាក់`, 30, AlignmentType.CENTER, true),
            makeDataCell('', 30),
          ],
        }),
      ],
    });

    // Section II: List of Students
    const sectionIIHeading = new Paragraph({
      spacing: { before: 250, after: 100, line: 260, lineRule: 'auto' },
      children: [
        new TextRun({
          text: `II. ឈ្មោះសិស្ស និងបុគ្គលិកដែលអានសៀវភៅប្រចាំខែ${monthName}`,
          font: FONT_MUOL,
          size: 21,
          sizeComplexScript: 21,
          bold: true,
          boldComplexScript: true,
        }),
      ],
    });

    const tableIIRows = [
      new TableRow({
        cantSplit: true,
        tableHeader: true,
        children: [
          makeHeaderCell('ល.រ', 8),
          makeHeaderCell('ឈ្មោះ', 30),
          makeHeaderCell('ភេទ', 14),
          makeHeaderCell('ជំនាញសិក្សា', 34),
          makeHeaderCell('ផ្សេងៗ', 14),
        ],
      }),
      ...studentsList.map(
        (st) =>
          new TableRow({
            cantSplit: true,
            children: [
              makeDataCell(String(st.no), 8),
              makeDataCell(st.name, 30, AlignmentType.LEFT, true),
              makeDataCell(st.gender, 14, AlignmentType.CENTER),
              makeDataCell(st.major, 34, AlignmentType.LEFT),
              makeDataCell('', 14),
            ],
          })
      ),
    ];

    const tableII = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: tableIIRows,
    });

    // Section III: Borrowed and Read outside Library Summary
    const sectionIIIHeading = new Paragraph({
      spacing: { before: 250, after: 100, line: 260, lineRule: 'auto' },
      children: [
        new TextRun({
          text: 'III. ចំនួនសៀវភៅ ដែលបានខ្ចី និងអាននៅក្រៅបណ្ណាល័យ',
          font: FONT_MUOL,
          size: 21,
          sizeComplexScript: 21,
          bold: true,
          boldComplexScript: true,
        }),
      ],
    });

    const tableIII = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [
        new TableRow({
          cantSplit: true,
          tableHeader: true,
          children: [
            makeHeaderCell('ល.រ', 10),
            makeHeaderCell('ប្រភេទ', 45),
            makeHeaderCell('ចំនួនសៀវភៅ', 25),
            makeHeaderCell('ផ្សេងៗ', 20),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            makeDataCell('1', 10),
            makeDataCell('ចំនួនសៀវភៅដែលបានខ្ចី', 45, AlignmentType.LEFT),
            makeDataCell(`${totalBorrowed} ក្បាល`, 25, AlignmentType.CENTER, true),
            makeDataCell('', 20),
          ],
        }),
        new TableRow({
          cantSplit: true,
          children: [
            makeDataCell('2', 10),
            makeDataCell('ចំនួនសៀវភៅដែលបានសង', 45, AlignmentType.LEFT),
            makeDataCell(`${totalReturned} ក្បាល`, 25, AlignmentType.CENTER, true),
            makeDataCell('', 20),
          ],
        }),
        // Highlighted Unreturned Books Row (Pink/Red)
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 2,
              width: { size: 55, type: WidthType.PERCENTAGE },
              shading: { fill: 'fecaca', type: ShadingType.CLEAR },
              borders: cellBorders,
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 90, bottom: 90, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto' },
                  children: [
                    new TextRun({
                      text: 'សៀវភៅមិនទាន់សង',
                      font: FONT_MUOL,
                      size: 20,
                      sizeComplexScript: 20,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
              ],
            }),
            makeDataCell(`${totalUnreturned} ក្បាល`, 25, AlignmentType.CENTER, true, 'fecaca'),
            makeDataCell('', 20, AlignmentType.CENTER, false, 'fecaca'),
          ],
        }),
      ],
    });

    // Section IV: Borrowed Book Names Details
    const sectionIVHeading = new Paragraph({
      spacing: { before: 250, after: 100, line: 260, lineRule: 'auto' },
      children: [
        new TextRun({
          text: 'IV. ឈ្មោះសៀវភៅ ដែលបានខ្ចីនៅក្រៅបណ្ណាល័យ',
          font: FONT_MUOL,
          size: 21,
          sizeComplexScript: 21,
          bold: true,
          boldComplexScript: true,
        }),
      ],
    });

    const tableIVRows = [
      new TableRow({
        cantSplit: true,
        tableHeader: true,
        children: [
          makeHeaderCell('ល.រ', 8),
          makeHeaderCell('ឈ្មោះ', 28),
          makeHeaderCell('ភេទ', 12),
          makeHeaderCell('ជំនាញសិក្សា', 26),
          makeHeaderCell('ចំនួនខ្ចី', 13),
          makeHeaderCell('ចំនួនសង', 13),
        ],
      }),
      ...loanList.map(
        (ln) =>
          new TableRow({
            cantSplit: true,
            children: [
              makeDataCell(String(ln.no), 8),
              makeDataCell(ln.name, 28, AlignmentType.LEFT, true),
              makeDataCell(ln.gender, 12, AlignmentType.CENTER),
              makeDataCell(ln.major, 26, AlignmentType.LEFT),
              makeDataCell(ln.borrowed, 13, AlignmentType.CENTER),
              makeDataCell(ln.returned, 13, AlignmentType.CENTER),
            ],
          })
      ),
    ];

    const tableIV = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: tableIVRows,
    });

    // Signatures and Dates
    const signatureTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            // Left: Reviewer
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({ spacing: { before: 300 } }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto', after: 40 },
                  children: [
                    new TextRun({
                      text: 'បានឃើញ និងឯកភាព',
                      font: FONT_BATTAMBANG,
                      size: 20,
                      sizeComplexScript: 20,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto', after: 700 },
                  children: [
                    new TextRun({
                      text: 'អ្នកត្រួតពិនិត្យ',
                      font: FONT_MUOL,
                      size: 21,
                      sizeComplexScript: 21,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
              ],
            }),
            // Right: Date & Library Manager
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({ spacing: { before: 300 } }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto', after: 40 },
                  children: [
                    new TextRun({
                      text: `ថ្ងៃពុធ ១២កើត ខែកត្តិក ឆ្នាំរោង ឆស័ក ព.ស. ២៥៦៩`,
                      font: FONT_BATTAMBANG,
                      size: 19,
                      sizeComplexScript: 19,
                      italics: true,
                      italicsComplexScript: true,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto', after: 60 },
                  children: [
                    new TextRun({
                      text: `រាជធានីភ្នំពេញ ថ្ងៃទី០៤ ខែ${monthName} ឆ្នាំ${year}`,
                      font: FONT_BATTAMBANG,
                      size: 20,
                      sizeComplexScript: 20,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto', after: 700 }, // Space for physical signature
                  children: [
                    new TextRun({
                      text: 'អ្នកគ្រប់គ្រងបណ្ណាល័យ',
                      font: FONT_MUOL,
                      size: 21,
                      sizeComplexScript: 21,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { line: 260, lineRule: 'auto' },
                  children: [
                    new TextRun({
                      text: 'សែម សុខុម',
                      font: FONT_MUOL,
                      size: 22,
                      sizeComplexScript: 22,
                      bold: true,
                      boldComplexScript: true,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // Compile into final Word Document with document-wide Battambang default
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: FONT_BATTAMBANG,
              size: 20,
              sizeComplexScript: 20,
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1000, // ~1.7 cm
                bottom: 1000,
                left: 1200, // ~2.1 cm
                right: 1200,
              },
            },
          },
          children: [
            headerTable,
            ...titleParagraphs,
            sectionIHeading,
            tableI,
            sectionIIHeading,
            tableII,
            sectionIIIHeading,
            tableIII,
            sectionIVHeading,
            tableIV,
            signatureTable,
          ],
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }
}
