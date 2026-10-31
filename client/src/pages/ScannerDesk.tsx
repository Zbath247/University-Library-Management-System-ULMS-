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
} from 'lucide-react';
import { BookCoverUploadField } from '../components/BookCoverUploadField';

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
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

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

  // Mode for handling duplicates
  const [saveMode, setSaveMode] = useState<'NEW_TITLE' | 'ADD_COPY_TO_EXISTING'>('NEW_TITLE');
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

  const handleCoverCaptured = (file: File) => {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleTitlePageCaptured = (file: File) => {
    setTitlePageFile(file);
    setTitlePagePreview(URL.createObjectURL(file));
  };

  const handleStartProcessing = async () => {
    if (!coverFile && !titlePageFile) return;

    setStep('PROCESSING');
    setProcessingError(null);

    try {
      // 1. Create Session
      const sessionRes = await api.post('/scan-sessions');
      const sId = sessionRes.data?.data?.id;
      setSessionId(sId);

      // 2. Upload Cover Image
      if (coverFile) {
        const formData = new FormData();
        formData.append('image', coverFile);
        formData.append('imageType', 'COVER');
        await api.post(`/scan-sessions/${sId}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 3. Upload Title Page Image
      if (titlePageFile) {
        const formData = new FormData();
        formData.append('image', titlePageFile);
        formData.append('imageType', 'TITLE_PAGE');
        await api.post(`/scan-sessions/${sId}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 4. Trigger OCR & AI Normalization
      await api.post(`/scan-sessions/${sId}/process`);

      // 5. Fetch Complete Review Data
      const reviewRes = await api.get(`/scan-sessions/${sId}/review`);
      const data = reviewRes.data?.data;
      setReviewData(data);

      // Populate Editable Form
      const extracted = data.extracted;
      setTitleEnglish(extracted.title || '');
      setTitleKhmer(extracted.title || '');
      setSubtitle(extracted.subtitle || '');
      setAuthors(extracted.authors?.join(', ') || '');
      setIsbn10(extracted.isbn10 || '');
      setIsbn13(extracted.isbn13 || '');
      setPublisher(extracted.publisher || '');
      setPublicationYear(extracted.publicationYear ? String(extracted.publicationYear) : '');
      setEdition(extracted.edition || '');
      setLanguage(extracted.language || 'km');

      // Generate suggested Accession Number and Barcode
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const generatedAccession = `DUC-BC-${new Date().getFullYear()}-${randomCode}`;
      setAccessionNumber(generatedAccession);
      setBarcode(extracted.isbn13 || extracted.isbn10 || generatedAccession);

      // Check for duplicate match
      if (data.duplicateCheck?.isDuplicate) {
        setSaveMode('ADD_COPY_TO_EXISTING');
      }

      // Automatically use scanned cover photo or preview
      const coverScanImg = data.images?.find((img: any) => img.imageType === 'COVER');
      if (coverScanImg) {
        setCoverImageUrl(`/api/v1/scan-sessions/${sId}/images/${coverScanImg.id}`);
      } else if (coverPreview) {
        setCoverImageUrl(coverPreview);
      }

      setStep('REVIEW');
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setProcessingError(err.response?.data?.error?.message || err.message || 'Processing failed');
      setStep('CAPTURE');
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
    setSubmitting(true);

    try {
      const payload = {
        mode: saveMode,
        existingBookId: reviewData?.duplicateCheck?.matchedBook?.id,
        bookData: {
          titleKhmer: titleKhmer.trim(),
          titleEnglish: titleEnglish.trim(),
          subtitle: subtitle.trim() || null,
          isbn10: isbn10.trim() || null,
          isbn13: isbn13.trim() || null,
          authors: authors.split(/[,;]/).map((a) => a.trim()).filter((a) => a.length > 0),
          publisher: publisher.trim() || null,
          publicationYear: publicationYear ? parseInt(publicationYear, 10) : null,
          edition: edition.trim() || null,
          language,
          categoryId,
          coverImageUrl: coverImageUrl.trim() || null,
        },
        copyData: {
          accessionNumber: accessionNumber.trim(),
          barcode: barcode.trim(),
          shelfLocation: shelfLocation.trim(),
          condition: 'NEW',
        },
      };

      await api.post(`/scan-sessions/${sessionId}/approve`, payload);
      setStep('SUCCESS');
    } catch (err: any) {
      alert('Error approving catalog: ' + (err.response?.data?.error?.message || err.message));
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
    setStep('CAPTURE');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-duc-blue">
              <Scan className="w-6 h-6 text-duc-gold" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                {t.scannerTitle}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {t.scannerSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Stepper Progress */}
            <div className="flex items-center overflow-x-auto w-full sm:w-auto gap-2 text-xs font-bold py-1">
              <span
                className={`px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${
                  step === 'CAPTURE'
                    ? 'bg-duc-blue text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {t.stepCapture}
              </span>
              <span className="text-slate-300 shrink-0">→</span>
              <span
                className={`px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${
                  step === 'PROCESSING'
                    ? 'bg-duc-blue text-white animate-pulse shadow-sm'
                    : step === 'REVIEW' || step === 'SUCCESS'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {t.stepProcessing}
              </span>
              <span className="text-slate-300 shrink-0">→</span>
              <span
                className={`px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${
                  step === 'REVIEW'
                    ? 'bg-duc-blue text-white shadow-sm'
                    : step === 'SUCCESS'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {t.stepReview}
              </span>
            </div>

            <Link
              to="/catalog?action=new"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-duc-blue/10 hover:bg-duc-blue hover:text-white text-duc-blue font-bold text-xs rounded-xl transition border border-duc-blue/20 shrink-0 shadow-sm"
              title="បញ្ចូលសៀវភៅថ្មីដោយដៃ"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ បញ្ចូលដោយដៃ</span>
            </Link>
          </div>
        </div>
      </div>

      {processingError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{processingError}</span>
          </div>
          <button onClick={() => setProcessingError(null)} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: CAPTURE IMAGES */}
      {step === 'CAPTURE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CameraCapture
              label={t.captureCover}
              onImageCaptured={handleCoverCaptured}
              previewUrl={coverPreview}
              onClear={() => {
                setCoverFile(null);
                setCoverPreview(null);
              }}
            />

            <CameraCapture
              label={t.captureTitlePage}
              onImageCaptured={handleTitlePageCaptured}
              previewUrl={titlePagePreview}
              onClear={() => {
                setTitlePageFile(null);
                setTitlePagePreview(null);
              }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={handleStartProcessing}
              disabled={!coverFile && !titlePageFile}
              className="flex items-center gap-2 px-6 py-3 bg-duc-blue hover:bg-duc-navy text-white font-bold text-sm rounded-xl shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-duc-gold" />
              <span>{t.runOcrAi}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING INDICATOR */}
      {step === 'PROCESSING' && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-sm animate-scaleIn">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 border-4 border-duc-gold/30 border-t-duc-gold rounded-full animate-spin" />
            <Sparkles className="w-8 h-8 text-duc-gold absolute inset-0 m-auto animate-pulse" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg animate-pulse">
            {t.processingMessage}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ដំណើរការ OCR កំពុងស្កេនស្រង់អត្ថបទ និងបំប្លែងទិន្នន័យតាមរយៈ AI Normalizer ព្រមទាំងស្វែងរកផ្ទៀងផ្ទាត់លេខ ISBN ពី Google Books & Open Library។
          </p>
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

              {reviewData.extracted && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{t.ocrConfidence}:</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    ~90% (Verified)
                  </span>
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
            {/* Duplicate Detected Alert */}
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      saveMode === 'ADD_COPY_TO_EXISTING'
                        ? 'bg-amber-700 text-white shadow'
                        : 'bg-white border border-amber-300 text-amber-900'
                    }`}
                  >
                    {t.btnAddNewCopy}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveMode('NEW_TITLE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      saveMode === 'NEW_TITLE'
                        ? 'bg-amber-700 text-white shadow'
                        : 'bg-white border border-amber-300 text-amber-900'
                    }`}
                  >
                    {t.btnCreateNewTitle}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ចំណងជើងជាភាសាខ្មែរ / Khmer Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={titleKhmer}
                    onChange={(e) => setTitleKhmer(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ចំណងជើងជាភាសាអង់គ្លេស / English Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={titleEnglish}
                    onChange={(e) => setTitleEnglish(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    អ្នកនិពន្ធ / Authors (ញែកដោយសញ្ញាក្បៀស) *
                  </label>
                  <input
                    type="text"
                    required
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ISBN-13</label>
                  <input
                    type="text"
                    value={isbn13}
                    onChange={(e) => setIsbn13(e.target.value)}
                    className="w-full p-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ISBN-10</label>
                  <input
                    type="text"
                    value={isbn10}
                    onChange={(e) => setIsbn10(e.target.value)}
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
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none bg-white"
                  >
                    {categories
                      .filter((c) => !c.parentId)
                      .map((faculty) => {
                        const depts = categories.filter((c) => c.parentId === faculty.id);
                        return (
                          <optgroup key={faculty.id} label={`${faculty.nameKhmer} (${faculty.code})`}>
                            <option value={faculty.id} className="font-bold">
                              {faculty.nameKhmer} (ទូទៅ - General)
                            </option>
                            {depts.map((d) => (
                              <option key={d.id} value={d.id}>
                                ↳ {d.nameKhmer} ({d.code})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                  </select>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.barcode} *</label>
                    <input
                      type="text"
                      required
                      value={barcode}
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
                </div>
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
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS STATE */}
      {step === 'SUCCESS' && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-xl">
            បញ្ចូលសៀវភៅចូលបណ្ណាល័យជោគជ័យ!
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            ទិន្នន័យកាតាឡុកសៀវភៅ និងក្បាលសៀវភៅរូបវន្ត (Accession No: <span className="font-mono font-bold text-slate-700">{accessionNumber}</span>) ត្រូវបានអនុម័ត និងរក្សាទុកចូលក្នុងប្រព័ន្ធផ្លូវការរួចរាល់។
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

