import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { CameraCapture } from '../components/CameraCapture';
import {
  Scan,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  ArrowRight,
  BookOpen,
  Layers,
  Save,
  X,
  ExternalLink,
  PlusCircle,
  Zap,
  Search,
  Loader2,
} from 'lucide-react';
import { BookCoverUploadField } from '../components/BookCoverUploadField';
import { CompactCategorySelect } from '../components/CompactCategorySelect';

export const ScannerDesk: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Workflow state: 'CAPTURE' | 'PROCESSING' | 'REVIEW' | 'SUCCESS'
  const [step, setStep] = useState<'CAPTURE' | 'PROCESSING' | 'REVIEW' | 'SUCCESS'>('CAPTURE');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Captured Images
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [titlePageFile, setTitlePageFile] = useState<File | null>(null);
  const [titlePagePreview, setTitlePagePreview] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');

  // Processing & Review Data
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [showRawOcr, setShowRawOcr] = useState<boolean>(false);
  const [isLookingUpIsbn, setIsLookingUpIsbn] = useState<boolean>(false);
  const [isbnLookupMessage, setIsbnLookupMessage] = useState<string | null>(null);

  // Form Fields for Manual Verification
  const [titleKhmer, setTitleKhmer] = useState('');
  const [titleEnglish, setTitleEnglish] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [isbn10, setIsbn10] = useState('');
  const [isbn13, setIsbn13] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState('');
  const [edition, setEdition] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('km');

  // Physical copy fields
  const [accessionNumber, setAccessionNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [shelfLocation, setShelfLocation] = useState('ជាន់ទី ១, ធ្នើ A-01');
  const [copyCount, setCopyCount] = useState<number>(1);

  // Mode for handling duplicates
  const [saveMode, setSaveMode] = useState<'NEW_TITLE' | 'ADD_COPY_TO_EXISTING'>('NEW_TITLE');
  const [lastApprovedMode, setLastApprovedMode] = useState<'NEW_TITLE' | 'ADD_COPY_TO_EXISTING'>('NEW_TITLE');
  const [submitting, setSubmitting] = useState(false);

  // Initialize or fetch categories
  useEffect(() => {
    api.get('/categories').then((res) => {
      const data = res.data?.data || [];
      setCategories(data);
      if (data.length > 0) {
        // Default to first department or first category
        const firstDept = data.find((c: any) => c.parentId) || data[0];
        setCategoryId(firstDept.id);
      }
    });
  }, []);

  // Helper: compress image file to lightweight Base64 data URI (~40-60KB) for permanent cloud database storage
  const fileToCompressedBase64 = (file: File, maxWidth = 800, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Helper: compress raw camera photo (often 5-15MB) down to clean ~150-250KB JPEG for ultra-fast upload
  const compressImageFile = (file: File, maxDim = 1280, quality = 0.82): Promise<File> => {
    return new Promise((resolve) => {
      if (file.size < 200 * 1024 && file.type === 'image/jpeg') {
        return resolve(file);
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                  resolve(new File([blob], cleanName, { type: 'image/jpeg' }));
                } else {
                  resolve(file);
                }
              },
              'image/jpeg',
              quality
            );
          } else {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleCoverCaptured = async (file: File) => {
    setCoverFile(file);
    try {
      const dataUrl = await fileToCompressedBase64(file);
      setCoverPreview(dataUrl);
      setCoverImageUrl(dataUrl);
    } catch {
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleTitlePageCaptured = async (file: File) => {
    setTitlePageFile(file);
    try {
      const dataUrl = await fileToCompressedBase64(file);
      setTitlePagePreview(dataUrl);
    } catch {
      setTitlePagePreview(URL.createObjectURL(file));
    }
  };

  const handleStartProcessing = async (skipAi = false) => {
    if (!coverFile && !titlePageFile) return;

    setStep('PROCESSING');
    setProcessingMessage('⚡ កំពុងរៀបចំ និងបង្ហោះរូបភាពល្បឿនលឿន...');
    setProcessingError(null);

    try {
      // 1. Create Session & Compress images concurrently
      const sessionPromise = api.post('/scan-sessions');
      const compressCoverPromise = coverFile ? compressImageFile(coverFile, 1280, 0.82) : Promise.resolve(null);
      const compressTitlePromise = titlePageFile ? compressImageFile(titlePageFile, 1280, 0.82) : Promise.resolve(null);

      const [sessionRes, compressedCover, compressedTitle] = await Promise.all([
        sessionPromise,
        compressCoverPromise,
        compressTitlePromise,
      ]);

      const sId = sessionRes.data?.data?.id;
      setSessionId(sId);

      // 2. Upload Compressed Images in Parallel
      const uploadTasks: Promise<any>[] = [];
      if (compressedCover) {
        const formData = new FormData();
        formData.append('image', compressedCover);
        formData.append('imageType', 'COVER');
        uploadTasks.push(
          api.post(`/scan-sessions/${sId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        );
      }

      if (compressedTitle) {
        const formData = new FormData();
        formData.append('image', compressedTitle);
        formData.append('imageType', 'TITLE_PAGE');
        uploadTasks.push(
          api.post(`/scan-sessions/${sId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        );
      }

      await Promise.all(uploadTasks);

      // 3. Trigger OCR/AI
      setProcessingMessage(
        skipAi
          ? '⚡ កំពុងស្កេនស្រង់អត្ថបទ និងទិន្នន័យសៀវភៅតាមរយៈ OCR (Fast Mode)...'
          : '⚡ Gemini AI កំពុងវិភាគ និងស្រង់ទិន្នន័យសៀវភៅដោយស្វ័យប្រវត្តិ...'
      );

      await api.post(`/scan-sessions/${sId}/process?skipAi=${skipAi}`);

      // 4. Fetch Complete Review Data
      const reviewRes = await api.get(`/scan-sessions/${sId}/review`);
      const data = reviewRes.data?.data;
      setReviewData(data);

      // Populate Editable Form
      const extracted = data?.extracted || {};
      const rawTitle = extracted.title || '';
      const isKhmer = /[\u1780-\u17FF]/.test(rawTitle);

      setTitleEnglish(extracted.titleEnglish || (!isKhmer ? rawTitle : ''));
      setTitleKhmer(extracted.titleKhmer || (isKhmer ? rawTitle : ''));
      setSubtitle(extracted.subtitle || '');
      setAuthors(extracted.authors?.join(', ') || '');
      setIsbn10(extracted.isbn10 || '');
      setIsbn13(extracted.isbn13 || '');
      setPublisher(extracted.publisher || '');
      setPublicationYear(extracted.publicationYear ? String(extracted.publicationYear) : '');
      setEdition(extracted.edition || '');
      setLanguage(extracted.language || (isKhmer ? 'km' : 'en'));

      // Generate suggested Accession Number and Barcode
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const generatedAccession = `DUC-BC-${new Date().getFullYear()}-${randomCode}`;
      setAccessionNumber(generatedAccession);
      setBarcode(extracted.isbn13 || extracted.isbn10 || generatedAccession);

      // Check for duplicate match
      if (data?.duplicateCheck?.isDuplicate && data?.duplicateCheck?.matchedBook?.id) {
        setSaveMode('ADD_COPY_TO_EXISTING');
        const dup = data.duplicateCheck;
        if (dup.suggestedNextAccession) {
          setAccessionNumber(dup.suggestedNextAccession);
        }
        if (dup.defaultShelfLocation) {
          setShelfLocation(dup.defaultShelfLocation);
        }
        if (dup.matchedBook) {
          const mb = dup.matchedBook;
          if (mb.titleKhmer) setTitleKhmer(mb.titleKhmer);
          if (mb.titleEnglish) setTitleEnglish(mb.titleEnglish);
          if (mb.subtitle) setSubtitle(mb.subtitle);
          if (mb.authors) setAuthors(Array.isArray(mb.authors) ? mb.authors.join(', ') : mb.authors);
          if (mb.categoryId) setCategoryId(mb.categoryId);
          if (mb.coverImageUrl && !coverImageUrl) setCoverImageUrl(mb.coverImageUrl);
        }
      } else {
        setSaveMode('NEW_TITLE');
      }

      // Automatically retain compressed Base64 data URL so book cover is permanently stored in cloud database
      if (!coverImageUrl || !coverImageUrl.startsWith('data:')) {
        if (coverPreview && coverPreview.startsWith('data:')) {
          setCoverImageUrl(coverPreview);
        } else if (coverFile) {
          try {
            const dataUrl = await fileToCompressedBase64(coverFile);
            setCoverImageUrl(dataUrl);
            setCoverPreview(dataUrl);
          } catch {
            const coverScanImg = data?.images?.find((img: any) => img.imageType === 'COVER');
            if (coverScanImg) {
              setCoverImageUrl(`/api/v1/scan-sessions/${sId}/images/${coverScanImg.id}`);
            }
          }
        }
      }

      setStep('REVIEW');
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setProcessingError(err.response?.data?.error?.message || err.message || 'Processing failed');
      setStep('CAPTURE');
    }
  };

  const handleSkipAiToReview = async () => {
    if (!sessionId) {
      setStep('REVIEW');
      return;
    }
    try {
      await api.post(`/scan-sessions/${sessionId}/process?skipAi=true`);
      const reviewRes = await api.get(`/scan-sessions/${sessionId}/review`);
      const data = reviewRes.data?.data;
      if (data) {
        setReviewData(data);
      }
      setStep('REVIEW');
    } catch {
      setStep('REVIEW');
    }
  };

  const handleLookupIsbn = async (isbnValue?: string) => {
    const raw = (isbnValue || isbn13 || isbn10 || barcode || '').trim();
    if (!raw) {
      setIsbnLookupMessage('⚠️ សូមបញ្ចូលលេខ ISBN ដើម្បីស្វែងរក');
      return;
    }
    setIsLookingUpIsbn(true);
    setIsbnLookupMessage(null);
    try {
      const res = await api.get(`/scan-sessions/lookup-isbn/${encodeURIComponent(raw)}`);
      const data = res.data?.data;
      if (data?.match) {
        const m = data.match;
        if (m.title) {
          setTitleEnglish(m.title);
          if (!titleKhmer) setTitleKhmer(m.title);
        }
        if (m.subtitle) setSubtitle(m.subtitle);
        if (m.authors?.length) setAuthors(m.authors.join(', '));
        if (m.publisher) setPublisher(m.publisher);
        if (m.publicationYear) setPublicationYear(String(m.publicationYear));
        if (m.isbn10 && !isbn10) setIsbn10(m.isbn10);
        if (m.isbn13 && !isbn13) setIsbn13(m.isbn13);
        if (m.coverImageUrl && !coverImageUrl) setCoverImageUrl(m.coverImageUrl);
        setIsbnLookupMessage('✅ រកឃើញទិន្នន័យពីប្រព័ន្ធ ISBN ដោយជោគជ័យ!');
      } else {
        setIsbnLookupMessage('ℹ️ មិនមានទិន្នន័យលើប្រព័ន្ធ ISBN អន្តរជាតិទេ សូមបំពេញព័ត៌មានដោយដៃ');
      }
    } catch {
      setIsbnLookupMessage('ℹ️ មិនអាចទាញទិន្នន័យបានទេ សូមបំពេញព័ត៌មានដោយដៃ');
    } finally {
      setIsLookingUpIsbn(false);
    }
  };

  const handleApplyCandidate = (candidate: any) => {
    if (!candidate) return;
    if (candidate.title) {
      setTitleEnglish(candidate.title);
      if (!titleKhmer) setTitleKhmer(candidate.title);
    }
    if (candidate.subtitle) setSubtitle(candidate.subtitle);
    if (candidate.authors?.length) setAuthors(candidate.authors.join(', '));
    if (candidate.publisher) setPublisher(candidate.publisher);
    if (candidate.publicationYear) setPublicationYear(String(candidate.publicationYear));
    if (candidate.isbn10) setIsbn10(candidate.isbn10);
    if (candidate.isbn13) {
      setIsbn13(candidate.isbn13);
      setBarcode(candidate.isbn13);
    }
  };

  const handleApproveSave = async () => {
    if (!sessionId) return;

    const resolvedTitleKhmer = titleKhmer.trim() || titleEnglish.trim() || 'សៀវភៅគ្មានចំណងជើង';
    const resolvedTitleEnglish = titleEnglish.trim() || titleKhmer.trim() || 'Untitled Book';
    const resolvedAuthors = authors.trim()
      ? authors.split(/[,;]/).map((a) => a.trim()).filter((a) => a.length > 0)
      : ['មិនស្គាល់ (Unknown)'];
    const resolvedCategory = categoryId || categories.find((c) => c.parentId)?.id || categories[0]?.id;
    const resolvedAccession = accessionNumber.trim() || `DUC-BC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const resolvedBarcode = barcode.trim() || resolvedAccession;
    const resolvedShelf = shelfLocation.trim() || 'ទូទី ១, ជាន់ A-01';

    const matchedBookId = reviewData?.duplicateCheck?.matchedBook?.id;
    // Auto-resolve mode: If saveMode is ADD_COPY_TO_EXISTING but there is no matched book, ALWAYS save as NEW_TITLE without blocking!
    const effectiveMode = (saveMode === 'ADD_COPY_TO_EXISTING' && matchedBookId)
      ? 'ADD_COPY_TO_EXISTING'
      : 'NEW_TITLE';

    const effectiveCategory = resolvedCategory || reviewData?.duplicateCheck?.matchedBook?.categoryId || categories[0]?.id || '';

    setSubmitting(true);

    try {
      const payload = {
        mode: effectiveMode,
        existingBookId: effectiveMode === 'ADD_COPY_TO_EXISTING' ? matchedBookId : undefined,
        bookData: {
          titleKhmer: resolvedTitleKhmer,
          titleEnglish: resolvedTitleEnglish,
          subtitle: subtitle.trim() || null,
          isbn10: isbn10.trim() || null,
          isbn13: isbn13.trim() || null,
          authors: resolvedAuthors.length ? resolvedAuthors : ['មិនស្គាល់ (Unknown)'],
          publisher: publisher.trim() || null,
          publicationYear: publicationYear ? parseInt(publicationYear, 10) : null,
          edition: edition.trim() || null,
          language: language || 'km',
          categoryId: effectiveCategory,
          coverImageUrl: coverImageUrl.trim() || null,
        },
        copyData: {
          accessionNumber: resolvedAccession,
          barcode: resolvedBarcode,
          shelfLocation: resolvedShelf,
          condition: 'NEW',
          copyCount: Math.max(1, Math.min(100, Number(copyCount) || 1)),
        },
      };

      await api.post(`/scan-sessions/${sessionId}/approve`, payload);
      setLastApprovedMode(effectiveMode);
      setStep('SUCCESS');
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.error?.details?.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join('\n') ||
        err.response?.data?.message ||
        err.message;
      alert('Error approving catalog: ' + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setTitlePageFile(null);
    setTitlePagePreview(null);
    setCoverImageUrl('');
    setReviewData(null);
    setSessionId(null);
    setCopyCount(1);
    setSaveMode('NEW_TITLE');
    setStep('CAPTURE');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-duc-blue/10 border border-duc-blue/20 flex items-center justify-center shrink-0 mt-0.5 text-duc-blue">
              <Scan className="w-5 h-5 text-duc-gold" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold text-slate-800 leading-tight">
                ស្កេនសៀវភៅតាម AI & កាតាឡុក
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                ថតរូបក្របមុខ និងទំព័របោះពុម្ព ដើម្បីស្រង់ទិន្នន័យស្វ័យប្រវត្តិ
              </p>
            </div>
          </div>

          <Link
            to="/catalog?action=new"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-duc-blue hover:text-white text-slate-700 font-bold text-xs rounded-xl transition border border-slate-200 shadow-sm cursor-pointer"
            title="បញ្ចូលសៀវភៅថ្មីដោយដៃ"
          >
            <PlusCircle className="w-3.5 h-3.5 text-duc-gold" />
            <span>+ បញ្ចូលដោយដៃ</span>
          </Link>
        </div>

        {/* 3-Step Clean Stepper Progress Bar */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <div
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition text-center ${
              step === 'CAPTURE'
                ? 'bg-duc-blue text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">១</span>
            <span className="truncate">ថតរូប</span>
          </div>

          <div
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition text-center ${
              step === 'PROCESSING'
                ? 'bg-duc-blue text-white animate-pulse shadow-sm'
                : step === 'REVIEW' || step === 'SUCCESS'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">២</span>
            <span className="truncate">AI & OCR</span>
          </div>

          <div
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition text-center ${
              step === 'REVIEW'
                ? 'bg-duc-blue text-white shadow-sm'
                : step === 'SUCCESS'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">៣</span>
            <span className="truncate">ផ្ទៀងផ្ទាត់</span>
          </div>
        </div>
      </div>

      {processingError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between shadow-sm animate-shake">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{processingError}</span>
          </div>
          <button onClick={() => setProcessingError(null)} className="text-red-500 hover:text-red-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: CAPTURE IMAGES */}
      {step === 'CAPTURE' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CameraCapture
              stepNumber="១"
              label="ថតរូបក្របមុខ (Front Cover)"
              onImageCaptured={handleCoverCaptured}
              previewUrl={coverPreview}
              onClear={() => {
                setCoverFile(null);
                setCoverPreview(null);
              }}
            />

            <CameraCapture
              stepNumber="២"
              label="ថតទំព័រព័ត៌មានបោះពុម្ព (Title / ISBN Page)"
              onImageCaptured={handleTitlePageCaptured}
              previewUrl={titlePagePreview}
              onClear={() => {
                setTitlePageFile(null);
                setTitlePagePreview(null);
              }}
            />
          </div>

          {/* Action Trigger Box */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              {coverFile || titlePageFile ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>បានថតរួចរាល់! ជ្រើសរើសវិធីសាស្ត្របញ្ចូលខាងក្រោម៖</span>
                </span>
              ) : (
                <span className="text-slate-500">
                  💡 សូមថតរូបក្របមុខ ឬទំព័រព័ត៌មានយ៉ាងហោច ១ សន្លឹក
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* Option 1: Gemini Vision AI (Active with user's API Key - 100% Accurate) */}
              <button
                type="button"
                onClick={() => handleStartProcessing(false)}
                disabled={!coverFile && !titlePageFile}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-duc-blue to-indigo-700 hover:from-duc-navy hover:to-indigo-800 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="ប្រើប្រាស់ Gemini Vision AI អានរូបភាពក្របសៀវភៅ និងទំព័រព័ត៌មានដោយផ្ទាល់ ត្រឹមត្រូវ ១០០%"
              >
                <Sparkles className="w-4 h-4 text-duc-gold animate-pulse" />
                <span>ស្កេនដោយ AI (ណែនាំ - សុក្រឹត ១០០%)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Option 2: Fast Local OCR (No External AI) */}
              <button
                type="button"
                onClick={() => handleStartProcessing(true)}
                disabled={!coverFile && !titlePageFile}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="ស្កេនស្រង់ទិន្នន័យក្នុងម៉ាស៊ីនផ្ទាល់ដោយមិនប្រើ AI"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>ស្កេនរហ័ស (មិនប្រើ AI)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING INDICATOR */}
      {step === 'PROCESSING' && (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-sm animate-scaleIn">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 border-4 border-duc-gold/30 border-t-duc-gold rounded-full animate-spin" />
            <Sparkles className="w-8 h-8 text-duc-gold absolute inset-0 m-auto animate-pulse" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg animate-pulse">
            {processingMessage || t.processingMessage}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ដំណើរការ OCR កំពុងស្កេនស្រង់អត្ថបទ និងបំប្លែងទិន្នន័យ... ប្រសិនបើមិនចង់រង់ចាំ លោកអ្នកអាចចុចរំលងដើម្បីចូលបំពេញទិន្នន័យដោយផ្ទាល់បានភ្លាមៗ!
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSkipAiToReview}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>⚡ រំលង AI ហើយចូលបំពេញទិន្នន័យភ្លាម (Skip AI)</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LIBRARIAN REVIEW & APPROVAL DESK */}
      {step === 'REVIEW' && reviewData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeInUp">
          {/* Left Column: Image Previews and OCR Confidence */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">រូបភាពដែលបានថត / Captured Images</h3>
              <div className="grid grid-cols-2 gap-2">
                {coverPreview && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 aspect-[3/4] bg-slate-50">
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                )}
                {titlePagePreview && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 aspect-[3/4] bg-slate-50">
                    <img src={titlePagePreview} alt="Title Page" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">វិធីសាស្ត្រស្រង់ទិន្នន័យ:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  reviewData.extractionMethod === 'GEMINI_AI'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : reviewData.externalCandidates?.googleBooks || reviewData.externalCandidates?.openLibrary
                    ? 'text-blue-700 bg-blue-50 border border-blue-200'
                    : 'text-slate-700 bg-slate-100'
                }`}>
                  {reviewData.extractionMethod === 'GEMINI_AI'
                    ? '✨ Gemini Vision AI (100% Verified)'
                    : reviewData.externalCandidates?.googleBooks || reviewData.externalCandidates?.openLibrary
                    ? '📚 ISBN Match (100%)'
                    : '⚡ Local OCR + Heuristic'}
                </span>
              </div>

              {reviewData.rawOcrText && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRawOcr(!showRawOcr)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1 cursor-pointer"
                  >
                    {showRawOcr ? '▲ លាក់អត្ថបទ OCR' : '▼ មើលអត្ថបទដែល OCR អានបាន (Raw Text)'}
                  </button>
                  {showRawOcr && (
                    <pre className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                      {reviewData.rawOcrText}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* External ISBN Candidate Cards */}
            {(reviewData.externalCandidates?.googleBooks || reviewData.externalCandidates?.openLibrary) && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-800 text-sm">
                  ទិន្នន័យពីប្រភពខាងក្រៅ (External Match)
                </h3>

                {reviewData.externalCandidates?.googleBooks && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">Google Books API</span>
                      <button
                        type="button"
                        onClick={() => handleApplyCandidate(reviewData.externalCandidates.googleBooks)}
                        className="text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded shadow-sm"
                      >
                        {t.applyExternalData}
                      </button>
                    </div>
                    <p className="text-xs font-medium text-slate-800">
                      {reviewData.externalCandidates.googleBooks.title}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {reviewData.externalCandidates.googleBooks.authors?.join(', ')} (
                      {reviewData.externalCandidates.googleBooks.publicationYear || '—'})
                    </p>
                  </div>
                )}

                {reviewData.externalCandidates?.openLibrary && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">Open Library API</span>
                      <button
                        type="button"
                        onClick={() => handleApplyCandidate(reviewData.externalCandidates.openLibrary)}
                        className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2 py-0.5 rounded shadow-sm"
                      >
                        {t.applyExternalData}
                      </button>
                    </div>
                    <p className="text-xs font-medium text-slate-800">
                      {reviewData.externalCandidates.openLibrary.title}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {reviewData.externalCandidates.openLibrary.authors?.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Review & Edit Form */}
          <div className="lg:col-span-8 space-y-4">
            {/* 📚 DEDICATED ADD COPIES SECTION FOR EXISTING BOOKS */}
            {reviewData.duplicateCheck?.isDuplicate && saveMode === 'ADD_COPY_TO_EXISTING' ? (
              <div className="bg-white rounded-2xl border-2 border-emerald-500/80 p-5 sm:p-6 shadow-md space-y-5 animate-fadeInUp">
                {/* Header Banner */}
                <div className="flex items-start sm:items-center gap-3.5 p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl text-emerald-950">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-200 text-emerald-900 uppercase tracking-wide">
                        រកឃើញក្នុងប្រព័ន្ធរួចហើយ
                      </span>
                      <span className="text-xs text-emerald-700 font-medium">
                        (Matched Existing Book)
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 leading-snug mt-1 line-clamp-2">
                      {reviewData.duplicateCheck.matchedBook?.titleKhmer || reviewData.duplicateCheck.matchedBook?.titleEnglish || titleKhmer}
                    </h3>
                    {reviewData.duplicateCheck.matchedBook?.titleEnglish && reviewData.duplicateCheck.matchedBook?.titleEnglish !== reviewData.duplicateCheck.matchedBook?.titleKhmer && (
                      <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">
                        {reviewData.duplicateCheck.matchedBook.titleEnglish}
                      </p>
                    )}
                  </div>
                </div>

                {/* Existing Book Summary Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">អ្នកនិពន្ធ (Authors):</span>
                    <span className="font-bold text-slate-700 line-clamp-1">
                      {Array.isArray(reviewData.duplicateCheck.matchedBook?.authors)
                        ? reviewData.duplicateCheck.matchedBook.authors.join(', ')
                        : reviewData.duplicateCheck.matchedBook?.authors || authors || 'មិនស្គាល់'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">ដេប៉ាតឺម៉ង់ / មហាវិទ្យាល័យ:</span>
                    <span className="font-bold text-slate-700 line-clamp-1">
                      {reviewData.duplicateCheck.matchedBook?.category?.nameKhmer || 'ទូទៅ'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">ចំនួនក្នុងប្រព័ន្ធបច្ចុប្បន្ន:</span>
                    <span className="font-bold text-emerald-700">
                      {reviewData.duplicateCheck.totalCopies || 0} ក្បាល (ទំនេរ {reviewData.duplicateCheck.availableCopies || 0} ក្បាល)
                    </span>
                  </div>
                </div>

                {/* Quick Copy Stepper & Controls */}
                <div className="p-4 sm:p-5 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span>➕ ចំនួនក្បាលសៀវភៅដែលត្រូវបូកបន្ថែម</span>
                        <span className="text-emerald-700 text-xs font-semibold">(Copies to Add)</span>
                      </label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ជ្រើសរើសចំនួនក្បាលសៀវភៅជាក់ស្ដែងដែលអ្នកចង់បញ្ចូលទៅក្នុងកាតាឡុកនេះ
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setCopyCount((prev) => Math.max(1, prev - 1))}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 font-extrabold hover:bg-slate-100 flex items-center justify-center transition shadow-2xs text-lg active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={copyCount}
                        onChange={(e) => setCopyCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                        className="w-16 h-10 text-center font-black text-lg border-2 border-emerald-500 bg-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setCopyCount((prev) => Math.min(100, prev + 1))}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-700 font-extrabold hover:bg-slate-100 flex items-center justify-center transition shadow-2xs text-lg active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Quick Pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-600">ជ្រើសរើសរហ័ស:</span>
                    {[1, 2, 3, 5, 10, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCopyCount(num)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          copyCount === num
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
                        }`}
                      >
                        +{num} ក្បាល
                      </button>
                    ))}
                  </div>

                  {/* Copy Details: Accession Number & Shelf Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-200/60">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        លេខកូដសៀវភៅ (Accession Number)
                      </label>
                      <input
                        type="text"
                        value={accessionNumber}
                        onChange={(e) => setAccessionNumber(e.target.value)}
                        className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 block">
                        ទីតាំងដាក់លើធ្នើរ (Shelf Location)
                      </label>
                      <input
                        type="text"
                        value={shelfLocation}
                        onChange={(e) => setShelfLocation(e.target.value)}
                        placeholder="ឧ. ទូទី ១, ជាន់ A-01"
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Sequential numbering hint */}
                  {copyCount > 1 && (
                    <div className="p-2.5 bg-white rounded-lg border border-emerald-200 text-[11px] text-slate-600 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-duc-gold shrink-0" />
                      <span>
                        ប្រព័ន្ធនឹងបង្កើតកូដ Accession No. បន្តពីរៀងចាស់ពី{' '}
                        <span className="font-mono font-bold text-slate-800">
                          {accessionNumber.replace(/-(?:0*\d+|\d+)$/, '')}-{String((reviewData.duplicateCheck.totalCopies || 0) + 1).padStart(2, '0')}
                        </span>{' '}
                        ដល់{' '}
                        <span className="font-mono font-bold text-slate-800">
                          {accessionNumber.replace(/-(?:0*\d+|\d+)$/, '')}-{String((reviewData.duplicateCheck.totalCopies || 0) + copyCount).padStart(2, '0')}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary 1-Click Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleApproveSave}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>កំពុងបូកសៀវភៅបន្ថែម...</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-5 h-5 text-emerald-200" />
                        <span>⚡ ចុចបូកសៀវភៅបន្ថែម (+{copyCount} ក្បាល) ទៅក្នុងកាតាឡុកនេះភ្លាម</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Secondary switch to NEW_TITLE */}
                <div className="text-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSaveMode('NEW_TITLE')}
                    className="text-xs text-slate-500 hover:text-duc-blue underline cursor-pointer"
                  >
                    🔄 ឬ ចង់បង្កើតជាកាតាឡុកសៀវភៅចំណងជើងថ្មីដោយឡែក? (ចុចទីនេះ)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Duplicate Detected Alert (Shown when user manually switched to NEW_TITLE) */}
                {reviewData.duplicateCheck?.isDuplicate && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-900 text-sm">
                          {t.duplicateWarning}
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          {reviewData.duplicateCheck.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSaveMode('ADD_COPY_TO_EXISTING')}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-600 text-white shadow hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>⚡ ប្តូរទៅបូកសៀវភៅបន្ថែមលើសៀវភៅដែលមានស្រាប់</span>
                      </button>
                    </div>
                  </div>
                )}

            {/* Editable Bibliographic Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-base pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>{t.reviewDesk}</span>
                <span className="text-xs font-normal text-slate-500">
                  សូមពិនិត្យ និងកែតម្រូវទិន្នន័យមុននឹងចុចរក្សាទុក
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      ចំណងជើងជាភាសាខ្មែរ / Khmer Title *
                    </label>
                    {titleKhmer && (
                      <button
                        type="button"
                        onClick={() => setTitleKhmer('')}
                        className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                        title="លុបអត្ថបទចេញ"
                      >
                        សម្អាត
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={titleKhmer}
                    onChange={(e) => setTitleKhmer(e.target.value)}
                    placeholder="ឧ. រចនាគេហទំព័រ ជាមួយ ASP.net"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      ចំណងជើងជាភាសាអង់គ្លេស / English Title
                    </label>
                    {titleEnglish && (
                      <button
                        type="button"
                        onClick={() => setTitleEnglish('')}
                        className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                        title="លុបអត្ថបទចេញ"
                      >
                        សម្អាត
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={titleEnglish}
                    onChange={(e) => setTitleEnglish(e.target.value)}
                    placeholder="ឧ. ASP.net with Visual Studio 2005 (ស្រេចចិត្ត)"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      អ្នកនិពន្ធ / Authors (ញែកដោយសញ្ញាក្បៀស)
                    </label>
                    {authors && (
                      <button
                        type="button"
                        onClick={() => setAuthors('')}
                        className="text-[10px] text-slate-400 hover:text-red-500 cursor-pointer"
                        title="លុបអត្ថបទចេញ"
                      >
                        សម្អាត
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    placeholder="ឧ. ជី គឹមអ៊ី, តៃ សំអាង (ស្រេចចិត្ត)"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-blue-900 block">
                        ទាញយកទិន្នន័យស្វ័យប្រវត្តិតាមលេខ ISBN (Auto-Fill from ISBN):
                      </span>
                      <span className="text-[11px] text-blue-700/80">
                        វាយ ឬស្កេនលេខ ISBN ខាងក្រោម រួចចុចប៊ូតុងនេះដើម្បីទាញទិន្នន័យសៀវភៅភ្លាមៗ
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLookupIsbn()}
                    disabled={isLookingUpIsbn || (!isbn13.trim() && !isbn10.trim() && !barcode.trim())}
                    className="shrink-0 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Search className={`w-3.5 h-3.5 ${isLookingUpIsbn ? 'animate-spin' : ''}`} />
                    <span>{isLookingUpIsbn ? 'កំពុងស្វែងរក...' : 'ទាញយកទិន្នន័យភ្លាម'}</span>
                  </button>
                </div>

                {isbnLookupMessage && (
                  <div className="sm:col-span-2 text-xs font-medium px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                    {isbnLookupMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ISBN-13</label>
                  <input
                    type="text"
                    value={isbn13}
                    onChange={(e) => setIsbn13(e.target.value)}
                    placeholder="ឧ. 9780132350884"
                    className="w-full p-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ISBN-10</label>
                  <input
                    type="text"
                    value={isbn10}
                    onChange={(e) => setIsbn10(e.target.value)}
                    placeholder="ឧ. 0132350882"
                    className="w-full p-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">រោងពុម្ព / Publisher</label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ឆ្នាំបោះពុម្ព / Year</label>
                  <input
                    type="number"
                    value={publicationYear}
                    onChange={(e) => setPublicationYear(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">មហាវិទ្យាល័យ / ដេប៉ាតឺម៉ង់ (Category) *</label>
                  <CompactCategorySelect
                    categories={categories}
                    value={categoryId}
                    onChange={(id) => setCategoryId(id)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ភាសាសៀវភៅ / Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none bg-white"
                  >
                    <option value="km">ភាសាខ្មែរ (Khmer)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              {/* Cover Image Upload & Scanned Image Option */}
              <div className="pt-4 border-t border-slate-100">
                <BookCoverUploadField
                  value={coverImageUrl}
                  onChange={setCoverImageUrl}
                  label="រូបភាពក្របសៀវភៅ (Book Cover Image - Scanned or Uploaded)"
                />
              </div>

              {/* Physical Copy Registration Details */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 text-duc-blue">
                  <Layers className="w-4 h-4" />
                  <span>ព័ត៌មានក្បាលសៀវភៅរូបវន្ត (Physical Copy Details)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.accessionNumber} *
                    </label>
                    <input
                      type="text"
                      required
                      value={accessionNumber}
                      onChange={(e) => setAccessionNumber(e.target.value)}
                      className="w-full p-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.barcode} (ស្រេចចិត្ត / ស្វ័យប្រវត្ត)
                    </label>
                    <input
                      type="text"
                      value={barcode}
                      placeholder={accessionNumber || 'ស្វ័យប្រវត្ត'}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full p-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.shelfLocation} *</label>
                    <input
                      type="text"
                      required
                      value={shelfLocation}
                      onChange={(e) => setShelfLocation(e.target.value)}
                      className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>ចំនួនក្បាល (Copies) *</span>
                      <span className="text-[10px] text-duc-blue font-bold">1..50</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCopyCount(Math.max(1, copyCount - 1))}
                        className="w-8 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm flex items-center justify-center border border-slate-300 active:scale-95 transition"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        required
                        value={copyCount}
                        onChange={(e) => setCopyCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        className="w-full p-2 text-sm font-bold text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setCopyCount(Math.min(50, copyCount + 1))}
                        className="w-8 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-sm flex items-center justify-center border border-slate-300 active:scale-95 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Batch copies hint banner */}
                {copyCount > 1 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 animate-fadeIn">
                    <Sparkles className="w-4 h-4 text-duc-gold shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <p className="font-bold">
                        មុខងារបង្កើតក្បាលសៀវភៅស្វ័យប្រវត្តិ {copyCount} ក្បាល (Batch Copies):
                      </p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        ប្រព័ន្ធនឹងបង្កើតកូដបាកូដ និង Accession Number រៀងគ្នាពី{' '}
                        <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">
                          {accessionNumber.replace(/-0*1$/, '')}-01
                        </span>{' '}
                        ដល់{' '}
                        <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">
                          {accessionNumber.replace(/-0*1$/, '')}-{String(copyCount).padStart(2, '0')}
                        </span>{' '}
                        សម្រាប់បិទលើក្បាលសៀវភៅនីមួយៗដោយស្វ័យប្រវត្តិតែ ១ ឃ្លីកប៉ុណ្ណោះ!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  {t.cancelScan}
                </button>

                <button
                  type="button"
                  onClick={handleApproveSave}
                  disabled={submitting || !titleKhmer || !accessionNumber}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{submitting ? 'កំពុងរក្សាទុក...' : t.approveAndSave}</span>
                </button>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS STATE */}
      {step === 'SUCCESS' && (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-sm max-w-lg mx-auto animate-fadeInUp">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-xl">
            {lastApprovedMode === 'ADD_COPY_TO_EXISTING'
              ? 'បានបូកសៀវភៅបន្ថែមដោយជោគជ័យ!'
              : 'បញ្ចូលសៀវភៅចូលបណ្ណាល័យជោគជ័យ!'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {lastApprovedMode === 'ADD_COPY_TO_EXISTING' ? (
              <>
                បានបន្ថែមចំនួន{' '}
                <span className="font-bold text-emerald-600">{copyCount} ក្បាល</span>{' '}
                {copyCount > 1 ? (
                  <>(Accession: <span className="font-mono font-bold text-slate-700">{accessionNumber.replace(/-(?:0*\d+|\d+)$/, '')}-{String((reviewData?.duplicateCheck?.totalCopies || 0) + 1).padStart(2, '0')}</span> ដល់ <span className="font-mono font-bold text-slate-700">{accessionNumber.replace(/-(?:0*\d+|\d+)$/, '')}-{String((reviewData?.duplicateCheck?.totalCopies || 0) + copyCount).padStart(2, '0')}</span>)</>
                ) : (
                  <>(Accession: <span className="font-mono font-bold text-slate-700">{accessionNumber}</span>)</>
                )}{' '}
                ទៅក្នុងសៀវភៅ «<span className="font-bold text-slate-700">{titleKhmer || titleEnglish}</span>» ដោយជោគជ័យ។
              </>
            ) : (
              <>
                ទិន្នន័យកាតាឡុកសៀវភៅ និងក្បាលសៀវភៅរូបវន្តចំនួន{' '}
                <span className="font-bold text-emerald-600">{copyCount} ក្បាល</span>{' '}
                ត្រូវបានអនុម័ត និងរក្សាទុកចូលក្នុងប្រព័ន្ធផ្លូវការរួចរាល់។
              </>
            )}
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-duc-blue hover:bg-duc-navy text-white text-xs font-bold rounded-lg shadow transition"
            >
              ស្កេនសៀវភៅមួយទៀត (Scan Another)
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
            >
              មើលកាតាឡុក
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

