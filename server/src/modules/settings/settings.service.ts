import prisma from '../../db/prisma';

export interface SystemSettingsData {
  // 1. Loan Duration & Circulation
  loanDurationStudentDays: number;
  loanDurationFacultyDays: number;
  maxActiveLoansStudent: number;
  maxActiveLoansFaculty: number;
  maxRenewalsAllowed: number;
  renewalDays: number;
  overdueGraceDays: number;
  finePerDay: number;

  // 2. Library Location & Campus
  institutionNameKhmer: string;
  institutionNameEnglish: string;
  campusName: string;
  buildingName: string;
  floorLevels: string;
  address: string;
  operatingHours: string;
  contactPhone: string;
  contactEmail: string;
  libraryLatitude: number;
  libraryLongitude: number;
  geofenceRadiusMeters: number;

  // 3. Shelves
  shelfLocations: string[];
}

export const DEFAULT_SETTINGS: SystemSettingsData = {
  loanDurationStudentDays: 14,
  loanDurationFacultyDays: 30,
  maxActiveLoansStudent: 3,
  maxActiveLoansFaculty: 5,
  maxRenewalsAllowed: 2,
  renewalDays: 7,
  overdueGraceDays: 3,
  finePerDay: 500,

  institutionNameKhmer: 'សាកលវិទ្យាល័យឌីជីថលកម្ពុជា',
  institutionNameEnglish: 'Digital University of Cambodia',
  campusName: 'សាខាកណ្តាល (DUC Main Campus)',
  buildingName: 'អគារបណ្ណាល័យឌីជីថលកណ្តាល (Digital Library Building)',
  floorLevels: 'ជាន់ទី ១ (សាលអានទូទៅ & IT), ជាន់ទី ២ (បន្ទប់ស្រាវជ្រាវ & សៀវភៅជំនាញ)',
  address: 'មហាវិថីសហព័ន្ធរុស្ស៊ី, សង្កាត់ទឹកល្អក់១, ខណ្ឌទួលគោក, រាជធានីភ្នំពេញ',
  operatingHours: 'ច័ន្ទ - សុក្រ: 7:30 ព្រឹក - 6:30 ល្ងាច | សៅរ៍ - អាទិត្យ: 8:00 ព្រឹក - 5:00 ល្ងាច',
  contactPhone: '023 888 999 / 096 374 6352',
  contactEmail: 'library@duc.edu.kh',
  libraryLatitude: 11.5698,
  libraryLongitude: 104.8925,
  geofenceRadiusMeters: 150,

  shelfLocations: [
    'ជាន់ទី ១, ធ្នើ FDI-01 (វិទ្យាសាស្ត្រកុំព្យូទ័រ & AI)',
    'ជាន់ទី ១, ធ្នើ FDI-02 (បណ្ដាញកុំព្យូទ័រ & សន្តិសុខ Cyber)',
    'ជាន់ទី ១, ធ្នើ FLS-01 (នីតិសាស្ត្រ & ច្បាប់)',
    'ជាន់ទី ១, ធ្នើ FOB-01 (សេដ្ឋកិច្ច & ធុរកិច្ចឌីជីថល)',
    'ជាន់ទី ២, ធ្នើ FST-01 (វិស្វកម្ម & ស្ថាបត្យកម្ម)',
    'ជាន់ទី ២, ធ្នើ FA-01 (កសិកម្ម & បរិស្ថាន)',
    'ជាន់ទី ២, ធ្នើ FSS-01 (ភាសាបរទេស & វប្បធម៌ទូទៅ)',
  ],
};

export class SettingsService {
  /**
   * Fetch all settings, merging database rows over the defaults.
   */
  static async getAllSettings(): Promise<SystemSettingsData> {
    try {
      const rows = await prisma.systemSetting.findMany();
      if (!rows || rows.length === 0) {
        // Auto-seed defaults into DB
        await this.seedDefaults();
        return { ...DEFAULT_SETTINGS };
      }

      const result: any = { ...DEFAULT_SETTINGS };
      for (const row of rows) {
        try {
          result[row.key] = JSON.parse(row.value);
        } catch {
          result[row.key] = row.value;
        }
      }

      return result as SystemSettingsData;
    } catch (err) {
      console.error('SettingsService.getAllSettings fallback to defaults:', err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save / update a batch of settings.
   */
  static async updateSettings(updates: Partial<SystemSettingsData>): Promise<SystemSettingsData> {
    for (const [key, value] of Object.entries(updates)) {
      const serialized = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: serialized },
        create: { key, value: serialized },
      });
    }

    return this.getAllSettings();
  }

  /**
   * Helper to get loan duration in days by member type.
   */
  static async getLoanDuration(memberType: string): Promise<number> {
    const settings = await this.getAllSettings();
    if (memberType === 'FACULTY' || memberType === 'STAFF') {
      return Number(settings.loanDurationFacultyDays) || 30;
    }
    return Number(settings.loanDurationStudentDays) || 14;
  }

  /**
   * Helper to get max renewals allowed.
   */
  static async getMaxRenewals(): Promise<number> {
    const settings = await this.getAllSettings();
    return Number(settings.maxRenewalsAllowed) ?? 2;
  }

  /**
   * Helper to get renewal days added.
   */
  static async getRenewalDays(): Promise<number> {
    const settings = await this.getAllSettings();
    return Number(settings.renewalDays) || 7;
  }

  /**
   * Seed default settings in DB if none exist.
   */
  private static async seedDefaults(): Promise<void> {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const serialized = JSON.stringify(value);
      await prisma.systemSetting.upsert({
        where: { key },
        update: {},
        create: {
          key,
          value: serialized,
          description: `Default system setting for ${key}`,
        },
      });
    }
  }
}

