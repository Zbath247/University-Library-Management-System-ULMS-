import { PrismaClient } from '@prisma/client';
import { Role, MemberType, MemberStatus, CopyStatus, CopyCondition, LoanStatus } from '../types/enums';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database for Digital University of Cambodia (ULMS)...');

  // 1. Create Official 6 Faculties + General Culture (25 Departments Total) as Category Hierarchy
  const facultiesData = [
    {
      code: 'GEN_CULTURE',
      nameKhmer: 'វប្បធម៌ទូទៅ និងប្រវត្តិសាស្ត្រខ្មែរ',
      nameEnglish: 'General Culture & Khmer Civilization',
      description: 'Khmer Civilization, History, Classical Literature, Philosophy, and Social Ethics',
      departments: [
        { code: 'CUL_CIV', nameKhmer: 'អារ្យធម៌ និងប្រវត្តិសាស្ត្រខ្មែរ', nameEnglish: 'Khmer Civilization & History' },
        { code: 'CUL_LIT', nameKhmer: 'អក្សរសិល្ប៍ និងទស្សនវិជ្ជា', nameEnglish: 'Literature & Philosophy' },
        { code: 'CUL_SOC', nameKhmer: 'សីលធម៌ និងសង្គមវិទ្យា', nameEnglish: 'Social Ethics & Sociology' },
      ],
    },
    {
      code: 'FDI',
      nameKhmer: 'មហាវិទ្យាល័យឧស្សាហកម្មឌីជីថល',
      nameEnglish: 'Faculty of Digital Industry',
      description: 'Digital Industry, Software, Networks, Social Media and Graphic Design',
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
      description: 'Law, Public Administration, International Trade Law, and Political Science',
      departments: [
        { code: 'FLP_PL', nameKhmer: 'នីតិសាធារណៈ', nameEnglish: 'Public Law' },
        { code: 'FLP_PRL', nameKhmer: 'នីតិឯកជន', nameEnglish: 'Private Law' },
        { code: 'FLP_ICL', nameKhmer: 'នីតិពាណិជ្ជកម្មអន្តរជាតិ', nameEnglish: 'International Commercial Law' },
        { code: 'FLP_PA', nameKhmer: 'រដ្ឋបាលសាធារណៈ', nameEnglish: 'Public Administration' },
        { code: 'FLP_PS', nameKhmer: 'វិទ្យាសាស្ត្រនយោបាយ', nameEnglish: 'Political Science' },
      ],
    },
    {
      code: 'FDES',
      nameKhmer: 'មហាវិទ្យាល័យវិទ្យាសាស្ត្រសេដ្ឋកិច្ចឌីជីថល',
      nameEnglish: 'Faculty of Digital Economic Sciences',
      description: 'Digital Economy, Digital Business, and International Digital Trade',
      departments: [
        { code: 'FDES_DE', nameKhmer: 'សេដ្ឋកិច្ចឌីជីថល', nameEnglish: 'Digital Economy' },
        { code: 'FDES_DB', nameKhmer: 'ធុរកិច្ចឌីជីថល', nameEnglish: 'Digital Business' },
        { code: 'FDES_DIT', nameKhmer: 'ពាណិជ្ជកម្មអន្តរជាតិឌីជីថល', nameEnglish: 'Digital International Trade' },
      ],
    },
    {
      code: 'FARD',
      nameKhmer: 'មហាវិទ្យាល័យកសិកម្ម និងអភិវឌ្ឍន៍ជនបទ',
      nameEnglish: 'Faculty of Agriculture & Rural Development',
      description: 'Agronomy, Horticulture, Agricultural Economics, and Rural Development',
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
      description: 'Civil Engineering, Architecture, and Interior Design',
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
      description: 'English for Business Communication, TEFL, and Translation & Interpreting',
      departments: [
        { code: 'FOE_EBC', nameKhmer: 'ភាសាអង់គ្លេសសម្រាប់ទំនាក់ទំនងធុរកិច្ច', nameEnglish: 'English for Business Communication' },
        { code: 'FOE_TEFL', nameKhmer: 'បង្រៀនភាសាអង់គ្លេស', nameEnglish: 'Teaching English as a Foreign Language' },
        { code: 'FOE_ETI', nameKhmer: 'ភាសាអង់គ្លេសសម្រាប់ការបកប្រែ', nameEnglish: 'English for Translation & Interpreting' },
      ],
    },
  ];

  const deptMap: Record<string, any> = {};

  for (const f of facultiesData) {
    const faculty = await prisma.category.upsert({
      where: { code: f.code },
      update: {
        nameKhmer: f.nameKhmer,
        nameEnglish: f.nameEnglish,
        description: f.description,
      },
      create: {
        code: f.code,
        nameKhmer: f.nameKhmer,
        nameEnglish: f.nameEnglish,
        description: f.description,
      },
    });

    for (const d of f.departments) {
      const dept = await prisma.category.upsert({
        where: { code: d.code },
        update: {
          nameKhmer: d.nameKhmer,
          nameEnglish: d.nameEnglish,
          parentId: faculty.id,
        },
        create: {
          code: d.code,
          nameKhmer: d.nameKhmer,
          nameEnglish: d.nameEnglish,
          parentId: faculty.id,
        },
      });
      deptMap[d.code] = dept;
    }
  }

  console.log('✅ 7 Official Categories & 25 Departments seeded into Categories');

  // 2. Create Users (Admin & User)
  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordUser = await bcrypt.hash('user123', 10);
  const passwordLibrarian = await bcrypt.hash('librarian123', 10);
  const passwordStudent = await bcrypt.hash('student123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      fullName: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
    },
    create: {
      username: 'admin',
      email: 'admin@duc.edu.kh',
      passwordHash: passwordAdmin,
      fullName: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { username: 'user' },
    update: {
      fullName: 'អ្នកប្រើប្រាស់បណ្ណាល័យ (User)',
    },
    create: {
      username: 'user',
      email: 'user@duc.edu.kh',
      passwordHash: passwordUser,
      fullName: 'អ្នកប្រើប្រាស់បណ្ណាល័យ (User)',
      role: Role.USER,
    },
  });

  const librarian = await prisma.user.upsert({
    where: { username: 'librarian' },
    update: {},
    create: {
      username: 'librarian',
      email: 'librarian@duc.edu.kh',
      passwordHash: passwordLibrarian,
      fullName: 'បណ្ណារក្ស ឌីជីថល (Librarian)',
      role: Role.LIBRARIAN,
    },
  });

  await prisma.user.upsert({
    where: { username: 'student' },
    update: {},
    create: {
      username: 'student',
      email: 'student@student.duc.edu.kh',
      passwordHash: passwordStudent,
      fullName: 'និស្សិត គំរូ (Student)',
      role: Role.STUDENT,
    },
  });

  console.log('✅ Users seeded: admin & user (with legacy aliases)');

  // 3. Create Library Members with Authentic DUC Departments
  const member1 = await prisma.member.upsert({
    where: { memberCode: 'DUC-STU-2026-001' },
    update: {
      department: 'មហាវិទ្យាល័យឧស្សាហកម្មឌីជីថល > អភិវឌ្ឍន៍កម្មវិធីសូហ្វវែរ',
    },
    create: {
      memberCode: 'DUC-STU-2026-001',
      fullNameKhmer: 'សុខ ចាន់ដារ៉ា',
      fullNameEnglish: 'Sok Chandara',
      email: 'chandara.sok@student.duc.edu.kh',
      phoneNumber: '012 345 678',
      department: 'មហាវិទ្យាល័យឧស្សាហកម្មឌីជីថល > អភិវឌ្ឍន៍កម្មវិធីសូហ្វវែរ',
      memberType: MemberType.STUDENT,
      maxActiveLoans: 3,
      status: MemberStatus.ACTIVE,
    },
  });

  await prisma.member.upsert({
    where: { memberCode: 'DUC-STU-2026-002' },
    update: {
      department: 'មហាវិទ្យាល័យវិទ្យាសាស្ត្រសេដ្ឋកិច្ចឌីជីថល > ធុរកិច្ចឌីជីថល',
    },
    create: {
      memberCode: 'DUC-STU-2026-002',
      fullNameKhmer: 'ចាន់ វល័ក្ខណ៍',
      fullNameEnglish: 'Chan Voleak',
      email: 'voleak.chan@student.duc.edu.kh',
      phoneNumber: '098 765 432',
      department: 'មហាវិទ្យាល័យវិទ្យាសាស្ត្រសេដ្ឋកិច្ចឌីជីថល > ធុរកិច្ចឌីជីថល',
      memberType: MemberType.STUDENT,
      maxActiveLoans: 3,
      status: MemberStatus.ACTIVE,
    },
  });

  await prisma.member.upsert({
    where: { memberCode: 'DUC-FAC-2026-001' },
    update: {
      department: 'មហាវិទ្យាល័យឧស្សាហកម្មឌីជីថល > បណ្ដាញកុំព្យូទ័រ និងប្រព័ន្ធសុវត្ថិភាព',
    },
    create: {
      memberCode: 'DUC-FAC-2026-001',
      fullNameKhmer: 'បណ្ឌិត កែវ សុភក្ត្រ',
      fullNameEnglish: 'Dr. Keo Sopheak',
      email: 'sopheak.keo@duc.edu.kh',
      phoneNumber: '011 223 344',
      department: 'មហាវិទ្យាល័យឧស្សាហកម្មឌីជីថល > បណ្ដាញកុំព្យូទ័រ និងប្រព័ន្ធសុវត្ថិភាព',
      memberType: MemberType.FACULTY,
      maxActiveLoans: 10,
      status: MemberStatus.ACTIVE,
    },
  });

  console.log('✅ Members seeded with authentic faculties/departments');

  // 4. Comprehensive Seed Books Covering Every Department (25 Departments Total)
  interface SeedBookDef {
    id: string;
    deptCode: string;
    titleKhmer: string;
    titleEnglish: string;
    subtitle?: string;
    isbn10?: string;
    isbn13: string;
    authors: string[];
    publisher: string;
    publicationYear: number;
    edition?: string;
    language: string;
    descriptionKhmer: string;
    descriptionEnglish: string;
    coverImageUrl: string;
    callNumber: string;
    shelfLocation: string;
    copiesCount: number;
  }

  const booksToSeed: SeedBookDef[] = [
    // 🏛️ GEN_CULTURE (វប្បធម៌ទូទៅ និងប្រវត្តិសាស្ត្រខ្មែរ)
    {
      id: 'book-cul-civ-treng-nga',
      deptCode: 'CUL_CIV',
      titleKhmer: 'អារ្យធម៌ខ្មែរ (Khmer Civilization)',
      titleEnglish: 'Khmer Civilization & Ancient Heritage',
      subtitle: 'ប្រវត្តិសាស្ត្រ សាសនា សិល្បៈ និងទំនៀមទម្លាប់ខ្មែរបុរាណ',
      isbn13: '9789995000111',
      authors: ['ត្រឹង ងា (Trang Nga)'],
      publisher: 'ពុទ្ធសាសនបណ្ឌិត្យ',
      publicationYear: 2018,
      edition: 'បោះពុម្ពលើកទី ៧',
      language: 'km',
      descriptionKhmer: 'ស្នាដៃស្រាវជ្រាវដ៏ល្បីល្បាញរបស់លោកសាស្រ្តាចារ្យ ត្រឹង ងា អំពីឫសគល់អារ្យធម៌ ប្រវត្តិសាស្ត្រ សាសនា និងសិល្បៈខ្មែរតាំងពីសម័យនគរភ្នំ រហូតដល់សម័យអង្គរ។',
      descriptionEnglish: 'The monumental work on Khmer civilization, ancient history, religious evolution, and Angkorian heritage by Professor Trang Nga.',
      coverImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
      callNumber: 'DS 554.4 T73 2018',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ CUL-CIV-01',
      copiesCount: 3,
    },
    {
      id: 'book-cul-history-cambodia',
      deptCode: 'CUL_CIV',
      titleKhmer: 'ប្រវត្តិសាស្ត្រកម្ពុជា សង្ខេប (A History of Cambodia)',
      titleEnglish: 'A History of Cambodia, Fourth Edition',
      subtitle: 'ពីសម័យបុរេប្រវត្តិនៃដែនដីសុវណ្ណភូមិ រហូតដល់យុគសម័យទំនើប',
      isbn13: '9780813343631',
      authors: ['David Chandler'],
      publisher: 'Westview Press',
      publicationYear: 2019,
      edition: '4th Edition',
      language: 'km',
      descriptionKhmer: 'ឯកសារប្រវត្តិសាស្ត្រស្រាវជ្រាវដ៏ពេញនិយមបំផុតជុំវិញពិភពលោក អំពីដំណើរវិវត្តន៍នយោបាយ សង្គម និងវប្បធម៌ខ្មែរឆ្លងកាត់សម័យកាលផ្សេងៗ។',
      descriptionEnglish: 'A comprehensive narrative of Cambodian history from prehistory, Funan, Chenla, Angkor Empire, to modern times.',
      coverImageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500',
      callNumber: 'DS 554.5 C48 2019',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ CUL-CIV-02',
      copiesCount: 2,
    },
    {
      id: 'book-cul-reamker-literature',
      deptCode: 'CUL_LIT',
      titleKhmer: 'រឿងរាមកេរ្តិ៍ និងអក្សរសិល្ប៍បុរាណខ្មែរ',
      titleEnglish: 'Reamker & Cambodian Classical Literature',
      subtitle: 'ការវិភាគទស្សនវិជ្ជា តម្លៃសីលធម៌ និងសិល្បៈកំណាព្យខ្មែរ',
      isbn13: '9789995000222',
      authors: ['ពុទ្ធសាសនបណ្ឌិត្យ (Buddhist Institute)'],
      publisher: 'គ្រឹះស្ថានបោះពុម្ពផ្សាយជាតិ',
      publicationYear: 2020,
      edition: 'បោះពុម្ពឡើងវិញ',
      language: 'km',
      descriptionKhmer: 'មរតកអក្សរសិល្ប៍រឿងរាមកេរ្តិ៍ខ្មែរ ការបកស្រាយអត្ថន័យទស្សនវិជ្ជានៃតួអង្គ និងឥទ្ធិពលលើរបាំព្រះរាជទ្រព្យ និងចម្លាក់ប្រាសាទបុរាណ។',
      descriptionEnglish: 'Classical Khmer literature on the Reamker epic, its moral philosophy, poetic forms, and reflection in traditional Cambodian performing arts.',
      coverImageUrl: 'https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=500',
      callNumber: 'PL 4328 R43 2020',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ CUL-LIT-01',
      copiesCount: 2,
    },
    {
      id: 'book-cul-customs-ethics',
      deptCode: 'CUL_SOC',
      titleKhmer: 'ប្រពៃណី ទំនៀមទម្លាប់ និងសីលធម៌សង្គមខ្មែរ',
      titleEnglish: 'Khmer Customs, Traditions and Social Ethics',
      subtitle: 'ច្បាប់ទូន្មាន និងក្បួនតម្រាពិធីការជីវិតប្រចាំថ្ងៃរបស់ខ្មែរ',
      isbn13: '9789995000333',
      authors: ['គណៈកម្មការស្រាវជ្រាវវប្បធម៌ជាតិ'],
      publisher: 'ក្រសួងវប្បធម៌ និងវិចិត្រសិល្បៈ',
      publicationYear: 2022,
      edition: 'លើកទី ៣',
      language: 'km',
      descriptionKhmer: 'ចងក្រងពិធីបុណ្យជាតិ ទំនៀមទម្លាប់មង្គលការ បុណ្យសព ពិធីចូលឆ្នាំ ច្បាប់ស្រី ច្បាប់ប្រុស និងគុណធម៌រស់នៅប្រកបដោយសេចក្តីថ្លៃថ្នូរ។',
      descriptionEnglish: 'A comprehensive compilation of Khmer rituals, family ceremonies, social etiquette, and ethical teachings.',
      coverImageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=500',
      callNumber: 'BJ 1533 K45 2022',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ CUL-SOC-01',
      copiesCount: 2,
    },

    // 💻 FDI: Faculty of Digital Industry
    {
      id: 'book-clrs-algorithms',
      deptCode: 'FDI_SAD',
      titleKhmer: 'សេចក្តីផ្តើមអំពីក្បួនដោះស្រាយ (Introduction to Algorithms)',
      titleEnglish: 'Introduction to Algorithms, Fourth Edition',
      subtitle: 'Comprehensive guide to algorithms and data structures',
      isbn10: '026204630X',
      isbn13: '9780262046305',
      authors: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
      publisher: 'MIT Press',
      publicationYear: 2022,
      edition: '4th Edition',
      language: 'en',
      descriptionKhmer: 'សៀវភៅគោលដ៏ល្បីល្បាញបំផុតលើពិភពលោកសម្រាប់ក្បួនដោះស្រាយ និងរចនាសម្ព័ន្ធទិន្នន័យ។',
      descriptionEnglish: 'A comprehensive textbook covering a broad range of algorithms in depth.',
      coverImageUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=500',
      callNumber: 'QA 76.6 C66 2022',
      shelfLocation: 'ជាន់ទី ២, ធ្នើ FDI-SAD-01',
      copiesCount: 3,
    },
    {
      id: 'book-fdi-computer-networks',
      deptCode: 'FDI_CNSS',
      titleKhmer: 'បណ្ដាញកុំព្យូទ័រ និងសន្តិសុខប្រព័ន្ធព័ត៌មាន (Computer Networks & Security)',
      titleEnglish: 'Computer Networking: A Top-Down Approach & Cybersecurity',
      subtitle: 'ស្ថាបត្យកម្មប្រព័ន្ធ Internet, TCP/IP, Cloud និងការទប់ស្កាត់ការវាយប្រហារតាមអ៊ីនធឺណិត',
      isbn13: '9780136681557',
      authors: ['James Kurose', 'Keith Ross'],
      publisher: 'Pearson Education',
      publicationYear: 2023,
      edition: '8th Edition',
      language: 'en',
      descriptionKhmer: 'សៀវភៅគោលដ៏ល្អឥតខ្ចោះសម្រាប់ការសិក្សាស្វែងយល់អំពីបណ្ដាញកុំព្យូទ័រ សុវត្ថិភាពទិន្នន័យ Cloud Architecture និង Firewalls។',
      descriptionEnglish: 'The premier text in networking, updated with the latest in 5G, IoT security, and software-defined networks.',
      coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500',
      callNumber: 'TK 5105.5 K87 2023',
      shelfLocation: 'ជាន់ទី ២, ធ្នើ FDI-CNSS-01',
      copiesCount: 2,
    },
    {
      id: 'book-fdi-graphic-design',
      deptCode: 'FDI_GD',
      titleKhmer: 'គោលការណ៍គ្រឹះនៃការរចនាក្រាហ្វិក និង UI/UX Design',
      titleEnglish: 'Universal Principles of Design & Modern UI/UX',
      subtitle: 'ការរៀបចំពណ៌ ប្លង់ Typography និងបទពិសោធន៍អ្នកប្រើប្រាស់ឌីជីថល',
      isbn13: '9781592535873',
      authors: ['William Lidwell', 'Kritina Holden'],
      publisher: 'Rockport Publishers',
      publicationYear: 2021,
      edition: 'Rev Edition',
      language: 'en',
      descriptionKhmer: 'សៀវភៅណែនាំគ្រប់ទម្រង់នៃការរចនាក្រាហ្វិក ប្លង់ទំព័រ និងការបង្កើតគេហទំព័រ ឬកម្មវិធីទូរស័ព្ទប្រកបដោយភាពទាក់ទាញ។',
      descriptionEnglish: 'Essential reference for designers covering key principles of visual hierarchy, ergonomics, and usability.',
      coverImageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500',
      callNumber: 'NK 1510 L53 2021',
      shelfLocation: 'ជាន់ទី ២, ធ្នើ FDI-GD-01',
      copiesCount: 2,
    },
    {
      id: 'book-fdi-digital-marketing',
      deptCode: 'FDI_DM',
      titleKhmer: 'យុទ្ធសាស្ត្រទីផ្សារឌីជីថល និងម៉ាកសញ្ញា (Digital Marketing Strategy)',
      titleEnglish: 'Digital Marketing Strategy: Implementation and Practice',
      subtitle: 'SEO, SEM, Social Ads, Content Marketing និងការវិភាគទិន្នន័យអតិថិជន',
      isbn13: '9780749484224',
      authors: ['Simon Kingsnorth'],
      publisher: 'Kogan Page',
      publicationYear: 2022,
      edition: '3rd Edition',
      language: 'en',
      descriptionKhmer: 'មគ្គុទ្ទេសក៍ពេញលេញសម្រាប់ការកសាងយុទ្ធនាការផ្សព្វផ្សាយពាណិជ្ជកម្មតាមប្រព័ន្ធឌីជីថល ដើម្បីបង្កើនការលក់ និងប្រជាប្រិយភាព។',
      descriptionEnglish: 'A step-by-step roadmap to setting up and executing high-ROI digital marketing strategies across modern channels.',
      coverImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500',
      callNumber: 'HF 5415 K56 2022',
      shelfLocation: 'ជាន់ទី ២, ធ្នើ FDI-DM-01',
      copiesCount: 2,
    },
    {
      id: 'book-fdi-social-media',
      deptCode: 'FDI_SMS',
      titleKhmer: 'ប្រព័ន្ធផ្សព្វផ្សាយសង្គម និងការបង្កើតមាតិកា (Social Media Systems)',
      titleEnglish: 'Social Media Marketing & Content Algorithms',
      subtitle: 'ការគ្រប់គ្រងមាតិកា TikTok, Facebook, YouTube និងយុទ្ធសាស្ត្រ Viral Marketing',
      isbn13: '9781119560104',
      authors: ['Mark W. Schaefer'],
      publisher: 'Wiley',
      publicationYear: 2023,
      edition: '2nd Edition',
      language: 'en',
      descriptionKhmer: 'ការវិភាគស៊ីជម្រៅអំពីក្បួនដោះស្រាយ Algorithm នៃបណ្តាញសង្គម និងការផលិតវីដេអូខ្លីដើម្បីទាក់ទាញអ្នកទស្សនារាប់លាននាក់។',
      descriptionEnglish: 'Mastering social media platforms, creator monetization, and virality algorithms in the contemporary creator economy.',
      coverImageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500',
      callNumber: 'HM 742 S33 2023',
      shelfLocation: 'ជាន់ទី ២, ធ្នើ FDI-SMS-01',
      copiesCount: 2,
    },

    // ⚖️ FLP: Faculty of Law & Political Science
    {
      id: 'book-flp-public-law',
      deptCode: 'FLP_PL',
      titleKhmer: 'គោលការណ៍នីតិសាធារណៈ និងរដ្ឋធម្មនុញ្ញ',
      titleEnglish: 'Principles of Public Law & Constitution',
      subtitle: 'ទ្រឹស្តីទូទៅនៃនីតិរដ្ឋ និងស្ថាប័នសាធារណៈ',
      isbn13: '9789995001234',
      authors: ['គណៈមេធាវីនៃព្រះរាជាណាចក្រកម្ពុជា'],
      publisher: 'បណ្ណាគារច្បាប់ភ្នំពេញ',
      publicationYear: 2021,
      edition: 'លើកទី ២',
      language: 'km',
      descriptionKhmer: 'សៀវភៅគោលសិក្សាស្រាវជ្រាវអំពីច្បាប់សាធារណៈ និងនីតិរដ្ឋធម្មនុញ្ញកម្ពុជា។',
      descriptionEnglish: 'Textbook on public law and Cambodian constitutional governance.',
      coverImageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500',
      callNumber: 'KHM 342.596 P97 2021',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ FLP-PL-01',
      copiesCount: 2,
    },
    {
      id: 'book-flp-civil-law',
      deptCode: 'FLP_PRL',
      titleKhmer: 'ក្រមរដ្ឋប្បវេណី និងនីតិកាតព្វកិច្ច (Civil Code & Obligations)',
      titleEnglish: 'Civil Law and Law of Obligations in Cambodia',
      subtitle: 'នីតិកិច្ចសន្យា កម្មសិទ្ធិដីធ្លី អចលនទ្រព្យ និងសំណងការខូចខាត',
      isbn13: '9789995001241',
      authors: ['ក្រុមអ្នកច្បាប់ជាន់ខ្ពស់កម្ពុជា'],
      publisher: 'រាជបណ្ឌិត្យសភាកម្ពុជា',
      publicationYear: 2022,
      edition: 'លើកទី ៣',
      language: 'km',
      descriptionKhmer: 'ការពន្យល់លម្អិតអំពីមាត្រានៃក្រមរដ្ឋប្បវេណី នីតិកាតព្វកិច្ច កិច្ចសន្យាពាណិជ្ជកម្ម និងសិទ្ធិលើទ្រព្យសម្បត្តិ។',
      descriptionEnglish: 'In-depth commentary and legal analysis of the Cambodian Civil Code, contractual responsibilities, and property law.',
      coverImageUrl: 'https://images.unsplash.com/photo-1453733197781-79df9de3f6ac?w=500',
      callNumber: 'KHM 346.596 C58 2022',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ FLP-PRL-01',
      copiesCount: 2,
    },
    {
      id: 'book-flp-international-trade-law',
      deptCode: 'FLP_ICL',
      titleKhmer: 'នីតិពាណិជ្ជកម្មអន្តរជាតិ និងកិច្ចព្រមព្រៀងសកល (International Commercial Law)',
      titleEnglish: 'International Trade & Commercial Law',
      subtitle: 'ច្បាប់អង្គការពាណិជ្ជកម្មពិភពលោក WTO, CISG និងមជ្ឈត្តកម្មអន្តរជាតិ',
      isbn13: '9780198826958',
      authors: ['Ingeborg Schwenzer'],
      publisher: 'Oxford University Press',
      publicationYear: 2022,
      edition: '4th Edition',
      language: 'en',
      descriptionKhmer: 'សៀវភៅច្បាប់ពាណិជ្ជកម្មអន្តរជាតិស្តីអំពីកិច្ចសន្យាទិញលក់ទំនិញឆ្លងដែន ការដឹកជញ្ជូន និងការដោះស្រាយវិវាទពាណិជ្ជកម្ម។',
      descriptionEnglish: 'Leading international reference for cross-border trade transactions, GATT/WTO treaties, and international arbitration.',
      coverImageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500',
      callNumber: 'K 1005 S39 2022',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ FLP-ICL-01',
      copiesCount: 2,
    },
    {
      id: 'book-flp-public-administration',
      deptCode: 'FLP_PA',
      titleKhmer: 'ការគ្រប់គ្រងរដ្ឋបាលសាធារណៈទំនើប (Modern Public Administration)',
      titleEnglish: 'Public Administration: Concepts, Cases and Governance',
      subtitle: 'កំណែទម្រង់រដ្ឋបាលសាធារណៈ សេវាសាធារណៈ និងអភិបាលកិច្ចល្អ',
      isbn13: '9781119426981',
      authors: ['Richard Stillman'],
      publisher: 'Cengage Learning',
      publicationYear: 2021,
      edition: '9th Edition',
      language: 'en',
      descriptionKhmer: 'ទ្រឹស្តី និងបទពិសោធន៍ជាក់ស្តែងក្នុងការដឹកនាំស្ថាប័នរដ្ឋ ការរៀបចំគោលនយោបាយសាធារណៈ និងការផ្តល់សេវាជូនពលរដ្ឋ។',
      descriptionEnglish: 'Comprehensive overview of governmental policymaking, bureaucracy, organizational ethics, and public sector modernization.',
      coverImageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500',
      callNumber: 'JF 1351 S75 2021',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ FLP-PA-01',
      copiesCount: 2,
    },
    {
      id: 'book-flp-political-science',
      deptCode: 'FLP_PS',
      titleKhmer: 'វិទ្យាសាស្ត្រនយោបាយ និងទំនាក់ទំនងអន្តរជាតិ (Political Science & Diplomacy)',
      titleEnglish: 'Understanding Political Science and Global Geopolitics',
      subtitle: 'ប្រព័ន្ធនយោបាយសកល មនោគមវិជ្ជា ភូមិសាស្ត្រនយោបាយ និងសន្តិសុខអន្តរជាតិ',
      isbn13: '9780198807605',
      authors: ['Andrew Heywood'],
      publisher: 'Palgrave Macmillan',
      publicationYear: 2022,
      edition: '5th Edition',
      language: 'en',
      descriptionKhmer: 'សៀវភៅមូលដ្ឋានគ្រឹះស្តីពីទស្សនវិជ្ជានយោបាយ ប្រព័ន្ធគ្រប់គ្រងរដ្ឋក្នុងពិភពលោក និងយុទ្ធសាស្ត្រការទូតសកល។',
      descriptionEnglish: 'Foundational study of global political regimes, diplomacy, foreign policy, and 21st-century international relations.',
      coverImageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=500',
      callNumber: 'JA 71 H49 2022',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ FLP-PS-01',
      copiesCount: 2,
    },

    // 📈 FDES: Faculty of Digital Economic Sciences
    {
      id: 'book-digital-economy',
      deptCode: 'FDES_DE',
      titleKhmer: 'សេដ្ឋកិច្ចឌីជីថល និងបច្ចេកវិទ្យាហិរញ្ញវត្ថុ (Fintech)',
      titleEnglish: 'Digital Economy and Financial Technology (Fintech)',
      subtitle: 'យុទ្ធសាស្ត្របរិវត្តកម្មឌីជីថល និងនវានុវត្តន៍ពាណិជ្ជកម្ម',
      isbn13: '9789995005678',
      authors: ['សាស្ត្រាចារ្យ ឌីជីថល'],
      publisher: 'គ្រឹះស្ថានបោះពុម្ពសាកលវិទ្យាល័យ',
      publicationYear: 2023,
      edition: 'លើកទី ១',
      language: 'km',
      descriptionKhmer: 'ការវិភាគអំពីនិន្នាការសេដ្ឋកិច្ចឌីជីថល ប្រព័ន្ធទូទាត់អេឡិចត្រូនិក និងបច្ចេកវិទ្យាប្លុកឆេន។',
      descriptionEnglish: 'Analysis of digital economy trends, e-payment systems, and fintech innovation.',
      coverImageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500',
      callNumber: 'HG 1710 D54 2023',
      shelfLocation: 'ជាន់ទី ២, ធ្នើ FDES-DE-01',
      copiesCount: 2,
    },
    {
      id: 'book-fdes-digital-business',
      deptCode: 'FDES_DB',
      titleKhmer: 'ធុរកិច្ចឌីជីថល និងការបង្កើតសហគ្រាសថ្មី (Digital Business & Startups)',
      titleEnglish: 'Digital Business and E-Commerce Management',
      subtitle: 'គំរូអាជីវកម្ម Business Model Canvas, Venture Capital និង Platform Economy',
      isbn13: '9781292193335',
      authors: ['Dave Chaffey'],
      publisher: 'Pearson Education',
      publicationYear: 2022,
      edition: '7th Edition',
      language: 'en',
      descriptionKhmer: 'របៀបកសាងក្រុមហ៊ុន Startup ឌីជីថល ការស្វែងរកទុនវិនិយោគ និងការគ្រប់គ្រងវេទិកាពាណិជ្ជកម្មអេឡិចត្រូនិក។',
      descriptionEnglish: 'Comprehensive strategy and applications for e-business startups, agile innovation, and digital business operations.',
      coverImageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500',
      callNumber: 'HF 5548.32 C43 2022',
      shelfLocation: 'ជាន់ទី ២, ធ្នើ FDES-DB-01',
      copiesCount: 2,
    },
    {
      id: 'book-fdes-digital-trade',
      deptCode: 'FDES_DIT',
      titleKhmer: 'ពាណិជ្ជកម្មអន្តរជាតិឌីជីថល និងសង្វាក់ផ្គត់ផ្គង់សកល (Digital Trade)',
      titleEnglish: 'Global Digital Trade and Cross-Border E-Commerce',
      subtitle: 'ភស្តុភារកម្មឌីជីថល Digital Logistics និងកិច្ចព្រមព្រៀងពាណិជ្ជកម្មសេរី RCEP',
      isbn13: '9781138344600',
      authors: ['David A. Dyker'],
      publisher: 'Routledge',
      publicationYear: 2023,
      edition: '2nd Edition',
      language: 'en',
      descriptionKhmer: 'ការរៀបចំពាណិជ្ជកម្មឆ្លងដែនតាមប្រព័ន្ធអេឡិចត្រូនិក ការគ្រប់គ្រងឃ្លាំងឆ្លាតវៃ និងបែបបទគយឌីជីថល។',
      descriptionEnglish: 'Explores cross-border customs integration, international digital freight forwarding, and smart logistics pipelines.',
      coverImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500',
      callNumber: 'HF 1379 D95 2023',
      shelfLocation: 'ជាន់ទី ២, ធ្នើ FDES-DIT-01',
      copiesCount: 2,
    },

    // 🌾 FARD: Faculty of Agriculture & Rural Development
    {
      id: 'book-fard-crop-science',
      deptCode: 'FARD_AH',
      titleKhmer: 'វប្បកម្មសាស្ត្រ និងបច្ចេកទេសដាំដុះដំណាំ (Agronomy & Crop Science)',
      titleEnglish: 'Principles of Agronomy & Sustainable Crop Production',
      subtitle: 'គុណភាពដី ជីធម្មជាតិ ការការពារជំងឺដំណាំ និងពូជដំណាំធន់នឹងអាកាសធាតុ',
      isbn13: '9789995007711',
      authors: ['វិទ្យាស្ថានស្រាវជ្រាវ និងអភិវឌ្ឍន៍កសិកម្ម'],
      publisher: 'ក្រសួងកសិកម្ម រុក្ខាប្រមាញ់ និងនេសាទ',
      publicationYear: 2023,
      edition: 'លើកទី ២',
      language: 'km',
      descriptionKhmer: 'បច្ចេកទេសកសិកម្មវិទ្យាសាស្ត្រក្នុងការបង្កាត់ពូជស្រូវ ដំណាំសាកវប្បកម្ម និងការការពារសត្វល្អិតដោយជីវសាស្ត្រ។',
      descriptionEnglish: 'Comprehensive textbook on agronomic principles, soil science, crop nutrition, and sustainable pest management.',
      coverImageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=500',
      callNumber: 'SB 185 A47 2023',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ FARD-AH-01',
      copiesCount: 2,
    },
    {
      id: 'book-smart-agriculture',
      deptCode: 'FARD_AE',
      titleKhmer: 'កសិកម្មឆ្លាតវៃ និងសេដ្ឋកិច្ចកសិកម្ម (Smart Agriculture & IoT)',
      titleEnglish: 'Smart Agriculture & Precision Farming with IoT',
      subtitle: 'ការអនុវត្តបច្ចេកវិទ្យាឌីជីថលដើម្បីបង្កើនទិន្នផលកសិកម្មប្រកបដោយចីរភាព',
      isbn13: '9789995009999',
      authors: ['បណ្ឌិត កសិកម្មឌីជីថល'],
      publisher: 'គ្រឹះស្ថានបោះពុម្ពកសិកម្មកម្ពុជា',
      publicationYear: 2024,
      edition: 'លើកទី ១',
      language: 'km',
      descriptionKhmer: 'ការស្រាវជ្រាវអំពីការប្រើប្រាស់ឧបករណ៍ចាប់សញ្ញា IoT, យន្តហោះគ្មានមនុស្សបើក (Drone), និងប្រព័ន្ធស្រោចស្រពស្វ័យប្រវត្តក្នុងវិស័យកសិកម្ម។',
      descriptionEnglish: 'Comprehensive textbook on IoT sensors, drones, and precision automation in modern agriculture.',
      coverImageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=500',
      callNumber: 'S 494.5 S63 2024',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ FARD-AE-01',
      copiesCount: 2,
    },
    {
      id: 'book-fard-rural-development',
      deptCode: 'FARD_RD',
      titleKhmer: 'ការអភិវឌ្ឍសហគមន៍ជនបទប្រកបដោយចីរភាព (Rural Development)',
      titleEnglish: 'Sustainable Rural Development: Policies and Community Management',
      subtitle: 'ការលើកកម្ពស់ជីវភាពកសិករ សន្តិសុខស្បៀង និងហេដ្ឋារចនាសម្ព័ន្ធមូលដ្ឋាន',
      isbn13: '9788132100850',
      authors: ['Katar Singh'],
      publisher: 'SAGE Publications',
      publicationYear: 2021,
      edition: '4th Edition',
      language: 'en',
      descriptionKhmer: 'យុទ្ធសាស្ត្រពង្រឹងសហគមន៍កសិកម្មជនបទ គម្រោងមីក្រូហិរញ្ញវត្ថុ និងការគ្រប់គ្រងធនធានទឹកសហគមន៍។',
      descriptionEnglish: 'Theoretical framework and field empirical methods for grassroots rural socio-economic empowerment.',
      coverImageUrl: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=500',
      callNumber: 'HN 49 S56 2021',
      shelfLocation: 'ជាន់ទី ១, ធ្នើ FARD-RD-01',
      copiesCount: 2,
    },

    // ⚙️ FEA: Faculty of Engineering & Architecture
    {
      id: 'book-fea-civil-engineering',
      deptCode: 'FEA_CE',
      titleKhmer: 'វិស្វកម្មសំណង់ស៊ីវិល និងការគណនារចនាសម្ព័ន្ធបេតុង',
      titleEnglish: 'Structural Analysis & Reinforced Concrete Design in Civil Engineering',
      subtitle: 'ការវិភាគកម្លាំងសង្កត់ គ្រឹះអាគារ ស្ពាន ថ្នល់ និងស្តង់ដារសំណង់ Eurocode',
      isbn13: '9780134610672',
      authors: ['Russell C. Hibbeler'],
      publisher: 'Pearson Education',
      publicationYear: 2022,
      edition: '10th Edition',
      language: 'en',
      descriptionKhmer: 'សៀវភៅគោលវិស្វកម្មសម្រាប់ការគណនាគ្រឹះសំណង់ ធ្នឹម សរសរ និងសុវត្ថិភាពសំណង់អាគារខ្ពស់ៗ។',
      descriptionEnglish: 'Comprehensive theory of structural mechanics, loads, deflection, and matrix structural analysis.',
      coverImageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500',
      callNumber: 'TA 645 H52 2022',
      shelfLocation: 'ជាន់ទី ៣, ធ្នើ FEA-CE-01',
      copiesCount: 2,
    },
    {
      id: 'book-fea-architecture',
      deptCode: 'FEA_AR',
      titleKhmer: 'ស្ថាបត្យកម្មទំនើប និងការរៀបចំនគរូបនីយកម្ម (Architecture & Urban Design)',
      titleEnglish: 'Architecture: Form, Space, and Order',
      subtitle: 'សិល្បៈនៃការបង្កើតទម្រង់លំហ ស្ថាបត្យកម្មបៃតង និងគំនូរប្លង់ 3D',
      isbn13: '9781118745083',
      authors: ['Francis D. K. Ching'],
      publisher: 'John Wiley & Sons',
      publicationYear: 2023,
      edition: '4th Edition',
      language: 'en',
      descriptionKhmer: 'កម្រងឯកសារគំនូរប្លង់ស្ថាបត្យកម្មដ៏ពេញនិយមបំផុតជុំវិញពិភពលោក បង្ហាញពីទំនាក់ទំនងរវាងលំហ និងបរិស្ថានរស់នៅ។',
      descriptionEnglish: 'The classic architectural reference manual illustrating spatial vocabulary, proportions, and environmental integration.',
      coverImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500',
      callNumber: 'NA 2760 C48 2023',
      shelfLocation: 'ជាន់ទី ៣, ធ្នើ FEA-AR-01',
      copiesCount: 2,
    },
    {
      id: 'book-fea-interior-design',
      deptCode: 'FEA_ID',
      titleKhmer: 'សិល្បៈរចនាផ្ទៃខាងក្នុង និងការតុបតែងលំហរស់នៅ (Interior Design)',
      titleEnglish: 'Interior Design Illustrated & Spatial Harmony',
      subtitle: 'ការជ្រើសរើសសម្ភារ ពន្លឺ គ្រឿងសង្ហារិម និងពណ៌សម្រាប់គេហដ្ឋាន និងការិយាល័យ',
      isbn13: '9781119377207',
      authors: ['Francis D. K. Ching', 'Corky Binggeli'],
      publisher: 'John Wiley & Sons',
      publicationYear: 2022,
      edition: '4th Edition',
      language: 'en',
      descriptionKhmer: 'ការរៀបចំតុបតែងផ្ទៃខាងក្នុងប្រកបដោយសោភ័ណភាព ផាសុកភាព និងការប្រើប្រាស់ពន្លឺធម្មជាតិឱ្យមានប្រសិទ្ធភាពខ្ពស់។',
      descriptionEnglish: 'Visual guide to interior architecture, color schemes, acoustic design, lighting, and finishes.',
      coverImageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500',
      callNumber: 'NK 2110 C55 2022',
      shelfLocation: 'ជាន់ទី ៣, ធ្នើ FEA-ID-01',
      copiesCount: 2,
    },

    // 🇬🇧 FOE: Faculty of English
    {
      id: 'book-foe-business-english',
      deptCode: 'FOE_EBC',
      titleKhmer: 'ភាសាអង់គ្លេសសម្រាប់ទំនាក់ទំនងធុរកិច្ច (Business English Communication)',
      titleEnglish: 'Market Leader: Advanced Business English Course Book',
      subtitle: 'ការចរចាពាណិជ្ជកម្ម ការធ្វើបទបង្ហាញ Presentation និងការសរសេរអ៊ីមែលវិជ្ជាជីវៈ',
      isbn13: '9781408236963',
      authors: ['David Cotton', 'David Falvey', 'Simon Kent'],
      publisher: 'Financial Times & Pearson',
      publicationYear: 2022,
      edition: '3rd Edition',
      language: 'en',
      descriptionKhmer: 'សៀវភៅបណ្តុះបណ្តាលជំនាញភាសាអង់គ្លេសកម្រិតខ្ពស់សម្រាប់អ្នកជំនួញ ទំនាក់ទំនងពាណិជ្ជកម្ម និងកិច្ចប្រជុំអន្តរជាតិ។',
      descriptionEnglish: 'Dynamic business English curriculum developed in partnership with the Financial Times.',
      coverImageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=500',
      callNumber: 'PE 1115 C68 2022',
      shelfLocation: 'ជាន់ទី ៣, ធ្នើ FOE-EBC-01',
      copiesCount: 2,
    },
    {
      id: 'book-foe-tefl-methods',
      deptCode: 'FOE_TEFL',
      titleKhmer: 'វិធីសាស្ត្របង្រៀនភាសាអង់គ្លេសសម័យទំនើប (Teaching English / TEFL)',
      titleEnglish: 'The Practice of English Language Teaching',
      subtitle: 'គរុកោសល្យបង្រៀន កិច្ចតែងការបង្រៀន Lesson Plan និងការគ្រប់គ្រងថ្នាក់រៀនសកម្ម',
      isbn13: '9781447980254',
      authors: ['Jeremy Harmer'],
      publisher: 'Pearson Education ESL',
      publicationYear: 2021,
      edition: '5th Edition',
      language: 'en',
      descriptionKhmer: 'សៀវភៅណែនាំគរុកោសល្យដ៏ល្បីល្បាញបំផុតសម្រាប់គ្រូបង្រៀនភាសាអង់គ្លេស ការរៀបចំសកម្មភាព និងការវាយតម្លៃសិស្ស។',
      descriptionEnglish: 'The definitive guide for teachers of English as a foreign or second language, highlighting modern digital pedagogy.',
      coverImageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=500',
      callNumber: 'PE 1128 H37 2021',
      shelfLocation: 'ជាន់ទី ៣, ធ្នើ FOE-TEFL-01',
      copiesCount: 2,
    },
    {
      id: 'book-foe-translation-interpreting',
      deptCode: 'FOE_ETI',
      titleKhmer: 'ទ្រឹស្តី និងការអនុវត្តការបកប្រែ អង់គ្លេស-ខ្មែរ (Translation & Interpreting)',
      titleEnglish: 'Introducing Translation Studies: Theories and Applications',
      subtitle: 'បច្ចេកទេសបកប្រែឯកសារផ្លូវការ ការបកប្រែផ្ទាល់មាត់ Simultaneous Interpreting',
      isbn13: '9781138912595',
      authors: ['Jeremy Munday'],
      publisher: 'Routledge',
      publicationYear: 2022,
      edition: '4th Edition',
      language: 'en',
      descriptionKhmer: 'មគ្គុទ្ទេសក៍ទ្រឹស្តី និងលំហាត់អនុវត្តជាក់ស្តែងសម្រាប់អ្នកបកប្រែអាជីព ទាំងការបកប្រែអត្ថបទច្បាប់ ព័ត៌មាន និងសន្និសីទ។',
      descriptionEnglish: 'Foundational handbook on translation theories, linguistic transposition, and modern computer-assisted translation (CAT) tools.',
      coverImageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500',
      callNumber: 'P 306 M86 2022',
      shelfLocation: 'ជាន់ទី ៣, ធ្នើ FOE-ETI-01',
      copiesCount: 2,
    },
  ];

  let copyIndexCounter = 1000;

  for (const b of booksToSeed) {
    const category = deptMap[b.deptCode] || deptMap['FDI_SAD'] || Object.values(deptMap)[0];

    const book = await prisma.book.upsert({
      where: { id: b.id },
      update: {
        titleKhmer: b.titleKhmer,
        titleEnglish: b.titleEnglish,
        subtitle: b.subtitle,
        isbn10: b.isbn10,
        isbn13: b.isbn13,
        authors: JSON.stringify(b.authors),
        publisher: b.publisher,
        publicationYear: b.publicationYear,
        edition: b.edition,
        language: b.language,
        categoryId: category.id,
        descriptionKhmer: b.descriptionKhmer,
        descriptionEnglish: b.descriptionEnglish,
        coverImageUrl: b.coverImageUrl,
      },
      create: {
        id: b.id,
        titleKhmer: b.titleKhmer,
        titleEnglish: b.titleEnglish,
        subtitle: b.subtitle,
        isbn10: b.isbn10,
        isbn13: b.isbn13,
        authors: JSON.stringify(b.authors),
        publisher: b.publisher,
        publicationYear: b.publicationYear,
        edition: b.edition,
        language: b.language,
        categoryId: category.id,
        descriptionKhmer: b.descriptionKhmer,
        descriptionEnglish: b.descriptionEnglish,
        coverImageUrl: b.coverImageUrl,
      },
    });

    // Create physical copies for this book
    const numCopies = b.copiesCount || 2;
    for (let c = 1; c <= numCopies; c++) {
      copyIndexCounter++;
      const barcode = `${b.isbn13}-${String(c).padStart(2, '0')}`;
      const accessionNumber = `DUC-BC-${copyIndexCounter}`;

      // Check if copy already exists by barcode
      const existingCopy = await prisma.bookCopy.findUnique({
        where: { barcode },
      });

      if (existingCopy) {
        await prisma.bookCopy.update({
          where: { id: existingCopy.id },
          data: {
            bookId: book.id,
            callNumber: b.callNumber,
            shelfLocation: b.shelfLocation,
            status: CopyStatus.AVAILABLE,
            condition: CopyCondition.NEW,
          },
        });
      } else {
        await prisma.bookCopy.create({
          data: {
            bookId: book.id,
            accessionNumber,
            barcode,
            callNumber: b.callNumber,
            shelfLocation: b.shelfLocation,
            status: CopyStatus.AVAILABLE,
            condition: CopyCondition.NEW,
          },
        });
      }
    }
  }

  console.log(`✅ ${booksToSeed.length} Books & Physical Copies seeded across all 25 departments and General Culture`);

  // 5. Create an Active Loan & Demo Copy for Testing
  const book1 = await prisma.book.findUnique({ where: { id: 'book-clrs-algorithms' } });
  if (book1) {
    const copyToBorrow = await prisma.bookCopy.upsert({
      where: { barcode: '9780262046305-DEMO-LOAN' },
      update: {},
      create: {
        bookId: book1.id,
        accessionNumber: 'DUC-BC-000999',
        barcode: '9780262046305-DEMO-LOAN',
        callNumber: 'QA 76.6 C66 2022',
        shelfLocation: 'ជាន់ទី ២, ធ្នើ FDI-SAD-01',
        status: CopyStatus.BORROWED,
        condition: CopyCondition.GOOD,
      },
    });

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const elevenDaysLater = new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000);

    const existingActiveLoan = await prisma.loan.findFirst({
      where: { bookCopyId: copyToBorrow.id, status: LoanStatus.ACTIVE },
    });

    if (!existingActiveLoan) {
      await prisma.loan.create({
        data: {
          bookCopyId: copyToBorrow.id,
          memberId: member1.id,
          issuedByUserId: librarian.id,
          issueDate: threeDaysAgo,
          dueDate: elevenDaysLater,
          status: LoanStatus.ACTIVE,
        },
      });
    }
  }

  console.log('✅ Sample active loan verified');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
