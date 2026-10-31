export interface DepartmentDef {
  code: string;
  nameKhmer: string;
  nameEnglish: string;
}

export interface FacultyDef {
  code: string;
  nameKhmer: string;
  nameEnglish: string;
  departments: DepartmentDef[];
}

export const DUC_FACULTIES: FacultyDef[] = [
  {
    code: 'FDI',
    nameKhmer: 'មហាវិទ្យាល័យឧស្សាហកម្មឌីជីថល',
    nameEnglish: 'Faculty of Digital Industry',
    departments: [
      { code: 'FDI_GD', nameKhmer: 'ក្រាហ្វិកឌីហ្សាញ', nameEnglish: 'Graphic Design' },
      { code: 'FDI_DM', nameKhmer: 'ទីផ្សារឌីជីថល', nameEnglish: 'Digital Marketing' },
      { code: 'FDI_SMS', nameKhmer: 'ប្រព័ន្ធផ្សព្វផ្សាយសង្គម', nameEnglish: 'Social Media Systems' },
      { code: 'FDI_SAD', nameKhmer: 'អភិវឌ្ឍន៍កម្មវិធីសូហ្វវែរ', nameEnglish: 'Software Application Development' },
      { code: 'FDI_CNSS', nameKhmer: 'បណ្ដាញកុំព្យូទ័រ និងប្រព័ន្ធសុវត្ថិភាព', nameEnglish: 'Computer Networks & Security Systems' },
    ],
  },
  {
    code: 'FLP',
    nameKhmer: 'មហាវិទ្យាល័យនីតិសាស្ត្រ និងវិទ្យាសាស្ត្រនយោបាយ',
    nameEnglish: 'Faculty of Law & Political Science',
    departments: [
      { code: 'FLP_PL', nameKhmer: 'នីតិសាធារណៈ', nameEnglish: 'Public Law' },
      { code: 'FLP_PRL', nameKhmer: 'នីតិឯកជន', nameEnglish: 'Private Law' },
      { code: 'FLP_ICL', nameKhmer: 'នីតិពាណិជ្ជកម្មអន្តរជាតិ', nameEnglish: 'International Commercial Law' },
      { code: 'FLP_PA', nameKhmer: 'រដ្ឋបាលសាធារណៈ', nameEnglish: 'Public Administration' },
      { code: 'FLP_PS', nameKhmer: 'វិទ្យាសាស្ត្រនយោបាយ', nameEnglish: 'Political Science' },
    ],
  },
  {
    code: 'FARD',
    nameKhmer: 'មហាវិទ្យាល័យកសិកម្ម និងអភិវឌ្ឍន៍ជនបទ',
    nameEnglish: 'Faculty of Agriculture & Rural Development',
    departments: [
      { code: 'FARD_AH', nameKhmer: 'វប្បកម្មសាស្ត្រ និងសាកវប្បកម្ម', nameEnglish: 'Agronomy & Horticulture' },
      { code: 'FARD_AE', nameKhmer: 'សេដ្ឋកិច្ចកសិកម្ម', nameEnglish: 'Agricultural Economics' },
      { code: 'FARD_RD', nameKhmer: 'អភិវឌ្ឍន៍ជនបទ', nameEnglish: 'Rural Development' },
    ],
  },
  {
    code: 'FEA',
    nameKhmer: 'មហាវិទ្យាល័យវិស្វកម្ម និងស្ថាបត្យកម្ម',
    nameEnglish: 'Faculty of Engineering & Architecture',
    departments: [
      { code: 'FEA_CE', nameKhmer: 'វិស្វកម្មសំណង់ស៊ីវិល', nameEnglish: 'Civil Engineering' },
      { code: 'FEA_AR', nameKhmer: 'ស្ថាបត្យកម្ម', nameEnglish: 'Architecture' },
      { code: 'FEA_ID', nameKhmer: 'រចនាផ្ទៃខាងក្នុង', nameEnglish: 'Interior Design' },
    ],
  },
  {
    code: 'FOE',
    nameKhmer: 'មហាវិទ្យាល័យភាសាអង់គ្លេស',
    nameEnglish: 'Faculty of English',
    departments: [
      { code: 'FOE_EBC', nameKhmer: 'ភាសាអង់គ្លេសសម្រាប់ទំនាក់ទំនងធុរកិច្ច', nameEnglish: 'English for Business Communication' },
      { code: 'FOE_TEFL', nameKhmer: 'បង្រៀនភាសាអង់គ្លេស', nameEnglish: 'Teaching English as a Foreign Language' },
      { code: 'FOE_ETI', nameKhmer: 'ភាសាអង់គ្លេសសម្រាប់ការបកប្រែ', nameEnglish: 'English for Translation & Interpreting' },
    ],
  },
  {
    code: 'FDES',
    nameKhmer: 'មហាវិទ្យាល័យវិទ្យាសាស្ត្រសេដ្ឋកិច្ចឌីជីថល',
    nameEnglish: 'Faculty of Digital Economic Sciences',
    departments: [
      { code: 'FDES_DE', nameKhmer: 'សេដ្ឋកិច្ចឌីជីថល', nameEnglish: 'Digital Economy' },
      { code: 'FDES_DB', nameKhmer: 'ធុរកិច្ចឌីជីថល', nameEnglish: 'Digital Business' },
      { code: 'FDES_DIT', nameKhmer: 'ពាណិជ្ជកម្មអន្តរជាតិឌីជីថល', nameEnglish: 'Digital International Trade' },
    ],
  },
  {
    code: 'GEN_CULTURE',
    nameKhmer: 'វប្បធម៌ទូទៅ និងប្រវត្តិសាស្ត្រខ្មែរ',
    nameEnglish: 'General Culture & Khmer Civilization',
    departments: [
      { code: 'CUL_CIV', nameKhmer: 'អារ្យធម៌ និងប្រវត្តិសាស្ត្រខ្មែរ', nameEnglish: 'Khmer Civilization & History' },
      { code: 'CUL_LIT', nameKhmer: 'អក្សរសិល្ប៍ និងទស្សនវិជ្ជា', nameEnglish: 'Literature & Philosophy' },
      { code: 'CUL_SOC', nameKhmer: 'សីលធម៌ និងសង្គមវិទ្យា', nameEnglish: 'Social Ethics & Sociology' },
    ],
  },
];

/**
 * Returns a flat list of all 22 departments formatted for display with their faculty prefix.
 */
export const getAllDepartmentsFlat = () => {
  const list: {
    facultyCode: string;
    facultyNameKhmer: string;
    facultyNameEnglish: string;
    deptCode: string;
    deptNameKhmer: string;
    deptNameEnglish: string;
    fullLabelKhmer: string;
    fullLabelEnglish: string;
  }[] = [];

  for (const faculty of DUC_FACULTIES) {
    for (const dept of faculty.departments) {
      list.push({
        facultyCode: faculty.code,
        facultyNameKhmer: faculty.nameKhmer,
        facultyNameEnglish: faculty.nameEnglish,
        deptCode: dept.code,
        deptNameKhmer: dept.nameKhmer,
        deptNameEnglish: dept.nameEnglish,
        fullLabelKhmer: `${faculty.nameKhmer} > ${dept.nameKhmer}`,
        fullLabelEnglish: `${faculty.nameEnglish} > ${dept.nameEnglish}`,
      });
    }
  }

  return list;
};

