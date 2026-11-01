import React, { useEffect, useState, useRef, useMemo } from 'react';
import { api, BookItem } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  BookOpen,
  CheckCircle,
  XCircle,
  Tag,
  Calendar,
  Layers,
  MapPin,
  Barcode,
  X,
  Edit2,
  Trash2,
  UserCheck,
  PlusCircle,
  Sparkles,
  Image,
  BookPlus,
  ChevronDown,
  Check,
} from 'lucide-react';
import { BookCoverCard } from './Dashboard';
import { BookCoverUploadField } from '../components/BookCoverUploadField';
import { CompactCategorySelect } from '../components/CompactCategorySelect';

export const Catalog: React.FC = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategory) return `-- 📚 ${t.allCategories} (គ្រប់ដេប៉ាតឺម៉ង់) --`;
    const found = categories.find((c) => c.id === selectedCategory);
    if (!found) return `-- 📚 ${t.allCategories} --`;
    if (!found.parentId) {
      return `🏛️ ${found.nameKhmer} (សៀវភៅទាំងអស់)`;
    }
    return `↳ ${found.nameKhmer}`;
  }, [selectedCategory, categories, t.allCategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected book for details modal
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Add Book Modal (Admin)
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [addTitleKhmer, setAddTitleKhmer] = useState('');
  const [addTitleEnglish, setAddTitleEnglish] = useState('');
  const [addAuthors, setAddAuthors] = useState('');
  const [addPublisher, setAddPublisher] = useState('');
  const [addPublicationYear, setAddPublicationYear] = useState<number | ''>('');
  const [addIsbn13, setAddIsbn13] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addDescriptionKhmer, setAddDescriptionKhmer] = useState('');
  const [addLanguage, setAddLanguage] = useState('km');
  const [addCoverImageUrl, setAddCoverImageUrl] = useState('');
  const [addCopiesCount, setAddCopiesCount] = useState<number | ''>(1);
  const [addShelfLocation, setAddShelfLocation] = useState('ជាន់ទី ១, ធ្នើទូទៅ');
  const [addingBook, setAddingBook] = useState(false);

  // Clear All Books Modal (Admin)
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Edit Book Modal (Admin)
  const [isEditBookModalOpen, setIsEditBookModalOpen] = useState(false);
  const [editTitleKhmer, setEditTitleKhmer] = useState('');
  const [editTitleEnglish, setEditTitleEnglish] = useState('');
  const [editAuthors, setEditAuthors] = useState('');
  const [editPublisher, setEditPublisher] = useState('');
  const [editPublicationYear, setEditPublicationYear] = useState<number | ''>('');
  const [editIsbn13, setEditIsbn13] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDescriptionKhmer, setEditDescriptionKhmer] = useState('');
  const [editLanguage, setEditLanguage] = useState('km');
  const [editCoverImageUrl, setEditCoverImageUrl] = useState('');

  useEffect(() => {
    // Fetch categories for filter dropdown & manual entry
    api.get('/categories').then((res) => {
      const cats = res.data?.data || [];
      setCategories(cats);
      const firstChild = cats.find((c: any) => c.parentId) || cats[0];
      if (firstChild) {
        setAddCategoryId(firstChild.id);
      }
    });

    // Check if opened with ?action=new
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setIsAddBookModalOpen(true);
    }
  }, []);

  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitleKhmer.trim()) {
      alert('សូមបញ្ចូលចំណងជើងសៀវភៅជាភាសាខ្មែរ');
      return;
    }
    if (!addAuthors.trim()) {
      alert('សូមបញ្ចូលឈ្មោះអ្នកនិពន្ធយ៉ាងតិចម្នាក់');
      return;
    }
    if (!addCategoryId) {
      alert('សូមជ្រើសរើសដេប៉ាតឺម៉ង់ ឬជំនាញ');
      return;
    }

    const authorsArray = addAuthors
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    setAddingBook(true);
    try {
      await api.post('/books', {
        titleKhmer: addTitleKhmer.trim(),
        titleEnglish: addTitleEnglish.trim() || addTitleKhmer.trim(),
        authors: authorsArray,
        publisher: addPublisher.trim() || null,
        publicationYear: addPublicationYear ? Number(addPublicationYear) : null,
        isbn13: addIsbn13.trim() || null,
        categoryId: addCategoryId,
        descriptionKhmer: addDescriptionKhmer.trim() || null,
        language: addLanguage,
        coverImageUrl: addCoverImageUrl.trim() || null,
        copiesCount: Number(addCopiesCount) || 1,
        shelfLocation: addShelfLocation.trim() || 'ជាន់ទី ១, ធ្នើទូទៅ',
      });

      alert('បានបញ្ចូលសៀវភៅថ្មីដោយជោគជ័យ!');
      setIsAddBookModalOpen(false);

      // Reset form
      setAddTitleKhmer('');
      setAddTitleEnglish('');
      setAddAuthors('');
      setAddPublisher('');
      setAddPublicationYear('');
      setAddIsbn13('');
      setAddDescriptionKhmer('');
      setAddCoverImageUrl('');
      setAddCopiesCount(1);
      setAddShelfLocation('ជាន់ទី ១, ធ្នើទូទៅ');

      fetchBooks();
    } catch (err: any) {
      alert('បរាជ័យក្នុងការបញ្ចូលសៀវភៅ៖ ' + (err.response?.data?.error?.message || err.response?.data?.error || err.message));
    } finally {
      setAddingBook(false);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (query.trim()) params.q = query.trim();
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedLanguage) params.language = selectedLanguage;

      const res = await api.get('/books', { params });
      setBooks(res.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [selectedCategory, selectedLanguage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBooks();
  };

  const handleOpenDetail = async (bookId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/books/${bookId}`);
      setSelectedBook(res.data?.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const openEditBookModal = () => {
    if (!selectedBook) return;
    setEditTitleKhmer(selectedBook.titleKhmer || '');
    setEditTitleEnglish(selectedBook.titleEnglish || '');
    setEditAuthors(Array.isArray(selectedBook.authors) ? selectedBook.authors.join(', ') : selectedBook.authors || '');
    setEditPublisher(selectedBook.publisher || '');
    setEditPublicationYear(selectedBook.publicationYear || '');
    setEditIsbn13(selectedBook.isbn13 || '');
    setEditCategoryId(selectedBook.categoryId || selectedBook.category?.id || (categories[0]?.id || ''));
    setEditDescriptionKhmer(selectedBook.descriptionKhmer || '');
    setEditLanguage(selectedBook.language || 'km');
    setEditCoverImageUrl(selectedBook.coverImageUrl || '');
    setIsEditBookModalOpen(true);
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    try {
      const authorsArray = editAuthors.split(',').map((a) => a.trim()).filter(Boolean);
      await api.put(`/books/${selectedBook.id}`, {
        titleKhmer: editTitleKhmer.trim(),
        titleEnglish: editTitleEnglish.trim() || editTitleKhmer.trim(),
        authors: authorsArray,
        publisher: editPublisher.trim() || null,
        publicationYear: editPublicationYear ? Number(editPublicationYear) : null,
        isbn13: editIsbn13.trim() || null,
        categoryId: editCategoryId,
        descriptionKhmer: editDescriptionKhmer.trim() || null,
        language: editLanguage,
        coverImageUrl: editCoverImageUrl.trim() || null,
      });

      setIsEditBookModalOpen(false);
      const res = await api.get(`/books/${selectedBook.id}`);
      setSelectedBook(res.data?.data);
      fetchBooks();
    } catch (err: any) {
      alert('Error updating book: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleDeleteBook = async () => {
    if (!selectedBook) return;
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបសៀវភៅ «${selectedBook.titleKhmer}» នេះចេញពីកាតាឡុកបណ្ណាល័យមែនទេ? (សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយបានទេ)`)) {
      return;
    }
    try {
      await api.delete(`/books/${selectedBook.id}`);
      setSelectedBook(null);
      fetchBooks();
    } catch (err: any) {
      alert('Error deleting book: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleDeleteCopy = async (copyId: string, accessionNo: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបក្បាលសៀវភៅលេខចុះបញ្ជី «${accessionNo}» នេះមែនទេ?`)) {
      return;
    }
    try {
      await api.delete(`/copies/${copyId}`);
      if (selectedBook) {
        const res = await api.get(`/books/${selectedBook.id}`);
        setSelectedBook(res.data?.data);
      }
      fetchBooks();
    } catch (err: any) {
      alert('Error deleting copy: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleClearAllBooks = async () => {
    if (clearAllConfirmText !== 'DELETE' && clearAllConfirmText !== 'លុបទាំងអស់') {
      alert('សូមវាយពាក្យ DELETE ឬ លុបទាំងអស់ ដើម្បីបញ្ជាក់!');
      return;
    }

    setIsClearingAll(true);
    try {
      const res = await api.delete('/books/clear-all', {
        data: { confirmText: clearAllConfirmText },
      });
      alert(res.data?.message || 'បានលុបសៀវភៅទាំងអស់ដោយជោគជ័យ!');
      setIsClearAllModalOpen(false);
      setClearAllConfirmText('');
      fetchBooks();
    } catch (err: any) {
      alert('បរាជ័យក្នុងការលុបសៀវភៅទាំងអស់: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-800">
              {t.navCatalog}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500">
              ស្វែងរក និងពិនិត្យមើលសៀវភៅ ព្រមទាំងចំនួនក្បាលសៀវភៅដែលអាចខ្ចីបានជាក់ស្តែងក្នុងបណ្ណាល័យ
            </p>
          </div>

          {/* Admin Action Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAddBookModalOpen(true)}
                className="flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-duc-blue hover:bg-duc-navy text-duc-gold font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4 text-duc-gold" />
                <span>+ បញ្ចូលសៀវភៅថ្មីដោយដៃ</span>
              </button>

              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 whitespace-nowrap cursor-pointer"
                title="លុបសៀវភៅទាំងអស់ក្នុងបណ្ណាល័យ"
              >
                <Trash2 className="w-4 h-4" />
                <span>លុបទាំងអស់</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar & Filters Form */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 sm:top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-duc-blue font-medium"
            />
          </div>

          <div className="md:col-span-3 relative" ref={catDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
              className="w-full py-2 px-2.5 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-duc-blue bg-white font-medium flex items-center justify-between gap-1.5 shadow-xs text-left"
            >
              <span className="truncate text-slate-800">{selectedCategoryLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCatDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-72 sm:max-h-80 overflow-y-auto text-xs divide-y divide-slate-100 animate-fadeIn">
                <div
                  onClick={() => {
                    setSelectedCategory('');
                    setIsCatDropdownOpen(false);
                  }}
                  className={`px-3 py-2 font-bold cursor-pointer hover:bg-blue-50 transition flex items-center justify-between ${
                    !selectedCategory ? 'text-duc-blue bg-blue-50 font-black' : 'text-slate-700'
                  }`}
                >
                  <span>-- 📚 {t.allCategories} (គ្រប់ដេប៉ាតឺម៉ង់) --</span>
                  {!selectedCategory && <Check className="w-3.5 h-3.5 text-duc-blue shrink-0" />}
                </div>

                {categories
                  .filter((cat) => !cat.parentId)
                  .map((faculty) => {
                    const depts = categories.filter((c) => c.parentId === faculty.id);
                    const isFacultySelected = selectedCategory === faculty.id;
                    return (
                      <div key={faculty.id} className="py-0.5">
                        <div
                          onClick={() => {
                            setSelectedCategory(faculty.id);
                            setIsCatDropdownOpen(false);
                          }}
                          className={`px-2.5 py-1.5 font-bold cursor-pointer hover:bg-blue-50 transition flex items-center justify-between ${
                            isFacultySelected ? 'text-duc-blue bg-blue-50 font-black' : 'text-slate-800 bg-slate-50/70'
                          }`}
                        >
                          <span className="flex items-center gap-1 truncate text-xs">
                            <span>🏛️</span>
                            <span className="truncate">{faculty.nameKhmer}</span>
                            <span className="text-[10px] text-slate-400 font-normal shrink-0">(សៀវភៅទាំងអស់)</span>
                          </span>
                          {isFacultySelected && <Check className="w-3.5 h-3.5 text-duc-blue shrink-0" />}
                        </div>

                        <div className="space-y-0.5">
                          {depts.map((d) => {
                            const isDeptSelected = selectedCategory === d.id;
                            return (
                              <div
                                key={d.id}
                                onClick={() => {
                                  setSelectedCategory(d.id);
                                  setIsCatDropdownOpen(false);
                                }}
                                className={`pl-5 pr-3 py-1 cursor-pointer hover:bg-blue-50 transition flex items-center justify-between text-[11px] sm:text-xs ${
                                  isDeptSelected ? 'text-duc-blue bg-blue-50/80 font-bold' : 'text-slate-600'
                                }`}
                              >
                                <span className="truncate">↳ {d.nameKhmer}</span>
                                {isDeptSelected && <Check className="w-3 h-3 text-duc-blue shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full py-2 px-2.5 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-duc-blue bg-white font-medium"
            >
              <option value="">{t.filterByLanguage} (ទាំងអស់)</option>
              <option value="km">ភាសាខ្មែរ (Khmer)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full h-full py-2 px-3 sm:py-2.5 sm:px-4 bg-duc-blue hover:bg-duc-navy text-white font-bold text-xs sm:text-sm rounded-lg transition shadow-sm"
            >
              ស្វែងរក
            </button>
          </div>
        </form>
      </div>

      {/* Book Catalog Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {t.loading}
        </div>
      ) : books.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">មិនមានសៀវភៅដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</h3>
          <p className="text-xs text-slate-500 mt-1">សូមសាកល្បងផ្លាស់ប្តូរពាក្យគន្លឹះ ឬជ្រើសរើសប្រភេទផ្សេងទៀត</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeInUp">
          {books.map((book) => {
            const isAvail = (book.availability?.availableCopies ?? 0) > 0;
            return (
              <div
                key={book.id}
                onClick={() => handleOpenDetail(book.id)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-duc-gold/70 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-4 flex gap-4 cursor-pointer group"
              >
                <div className="w-24 sm:w-28 shrink-0">
                  <BookCoverCard book={book} className="h-36 w-full" />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-duc-blue bg-blue-50 px-2 py-0.5 rounded">
                        <Tag className="w-3 h-3" />
                        {book.category.nameKhmer}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {isAvail ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                        <span>
                          {book.availability?.availableCopies} / {book.availability?.totalCopies} {t.available}
                        </span>
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-sm group-hover:text-duc-blue transition line-clamp-2 leading-snug">
                      {book.titleKhmer}
                    </h3>
                    {book.titleEnglish && book.titleEnglish !== book.titleKhmer && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 italic mt-0.5">
                        {book.titleEnglish}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                      អ្នកនិពន្ធ: <span className="font-medium text-slate-700">{book.authors.join(', ')}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{book.publicationYear || '—'}</span>
                    </div>
                    {book.isbn13 && (
                      <div className="font-mono text-[10px]">
                        ISBN: {book.isbn13}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Book Detail & Physical Copies Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="bg-duc-blue p-5 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-duc-gold" />
                <h3 className="font-bold text-base">{t.bookDetails}</h3>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-duc-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title, Cover & Metadata */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-36 sm:w-44 shrink-0 mx-auto sm:mx-0">
                  <BookCoverCard book={selectedBook} className="h-56 w-full shadow-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-duc-blue bg-blue-50 px-2 py-0.5 rounded">
                    {selectedBook.category?.nameKhmer || selectedBook.category?.nameEnglish || ''}
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                    {selectedBook.titleKhmer}
                  </h2>
                  {selectedBook.titleEnglish && (
                    <p className="text-sm text-slate-500 italic mt-0.5">
                      {selectedBook.titleEnglish}
                    </p>
                  )}

                  {/* 1-Click Borrow Button */}
                  <div className="mt-3">
                    <a
                      href={`/checkin?book=${encodeURIComponent(selectedBook.titleKhmer)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-duc-blue hover:bg-duc-navy text-duc-gold font-bold text-xs rounded-xl shadow transition active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>ស្នើសុំខ្ចីសៀវភៅនេះ ➜</span>
                    </a>
                  </div>

                  {/* Admin Quick Actions for Book */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                      <button
                        onClick={openEditBookModal}
                        className="px-3 py-1.5 bg-duc-blue hover:bg-duc-navy text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-duc-gold" />
                        <span>កែប្រែព័ត៌មានសៀវភៅ (Edit)</span>
                      </button>
                      <button
                        onClick={handleDeleteBook}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>លុបសៀវភៅនេះចេញ (Delete)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-semibold mb-0.5">អ្នកនិពន្ធ:</span>
                    <span className="font-medium text-slate-700">{selectedBook.authors?.join(', ')}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-semibold mb-0.5">រោងពុម្ព:</span>
                    <span className="font-medium text-slate-700">{selectedBook.publisher || '—'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-semibold mb-0.5">ឆ្នាំបោះពុម្ព:</span>
                    <span className="font-medium text-slate-700">{selectedBook.publicationYear || '—'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-semibold mb-0.5">ISBN-13:</span>
                    <span className="font-mono text-slate-700">{selectedBook.isbn13 || '—'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-semibold mb-0.5">កាលរចនា/បោះពុម្ព:</span>
                    <span className="font-medium text-slate-700">{selectedBook.edition || 'ធម្មតា'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-semibold mb-0.5">ភាសា:</span>
                    <span className="font-medium text-slate-700 uppercase">{selectedBook.language}</span>
                  </div>
                </div>

                {selectedBook.descriptionKhmer && (
                  <div className="mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">
                    <p>{selectedBook.descriptionKhmer}</p>
                  </div>
                )}
              </div>

              {/* Physical Inventory Copies Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                    <Layers className="w-4 h-4 text-duc-blue" />
                    <span>{t.physicalCopies} ({selectedBook.copies?.length || 0})</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {selectedBook.availability?.availableCopies} ក្បាលអាចខ្ចីបាន
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 sm:px-4 py-2.5 whitespace-nowrap">លេខចុះបញ្ជី (Accession)</th>
                        <th className="px-3 sm:px-4 py-2.5 whitespace-nowrap">បាកូដ</th>
                        <th className="px-3 sm:px-4 py-2.5 whitespace-nowrap">ទីតាំងធ្នើ</th>
                        <th className="px-3 sm:px-4 py-2.5 whitespace-nowrap">ស្ថានភាព</th>
                        {isAdmin && <th className="px-3 sm:px-4 py-2.5 whitespace-nowrap text-right">សកម្មភាព</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBook.copies?.map((copy: any) => (
                        <tr key={copy.id} className="hover:bg-slate-50/70">
                          <td className="px-3 sm:px-4 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {copy.accessionNumber}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                            {copy.barcode}
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 text-slate-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {copy.shelfLocation}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                copy.status === 'AVAILABLE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : copy.status === 'BORROWED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {copy.status}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-3 sm:px-4 py-2.5 whitespace-nowrap text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCopy(copy.id, copy.accessionNumber);
                                }}
                                className="px-2 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded text-[11px] font-bold transition inline-flex items-center gap-1"
                                title="លុបក្បាលសៀវភៅនេះ"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>លុប</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal (Admin) */}
      {isEditBookModalOpen && selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-duc-blue text-white rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-duc-gold" />
                <h3 className="font-bold text-base">កែប្រែព័ត៌មានសៀវភៅ</h3>
              </div>
              <button
                onClick={() => setIsEditBookModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ចំណងជើងជាភាសាខ្មែរ (Title Khmer) *</label>
                <input
                  type="text"
                  required
                  value={editTitleKhmer}
                  onChange={(e) => setEditTitleKhmer(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ចំណងជើងជាភាសាអង់គ្លេស (Title English)</label>
                <input
                  type="text"
                  value={editTitleEnglish}
                  onChange={(e) => setEditTitleEnglish(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue italic"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">អ្នកនិពន្ធ (Authors - បំបែកដោយសញ្ញាក្បៀស) *</label>
                <input
                  type="text"
                  required
                  value={editAuthors}
                  onChange={(e) => setEditAuthors(e.target.value)}
                  placeholder="ឧ. សួង សុខា, ម៉ុក សម្បត្តិ"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">រោងពុម្ព (Publisher)</label>
                  <input
                    type="text"
                    value={editPublisher}
                    onChange={(e) => setEditPublisher(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ឆ្នាំបោះពុម្ព (Year)</label>
                  <input
                    type="number"
                    value={editPublicationYear}
                    onChange={(e) => setEditPublicationYear(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ISBN-13</label>
                  <input
                    type="text"
                    value={editIsbn13}
                    onChange={(e) => setEditIsbn13(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ប្រភេទសៀវភៅ (Category) *</label>
                  <CompactCategorySelect
                    categories={categories}
                    value={editCategoryId}
                    onChange={(id) => setEditCategoryId(id)}
                  />
                </div>
              </div>

              <BookCoverUploadField
                value={editCoverImageUrl}
                onChange={setEditCoverImageUrl}
                label="រូបភាពក្របសៀវភៅ (Cover Image)"
              />

              <div>
                <label className="block font-bold text-slate-700 mb-1">ការពិពណ៌នាសង្ខេប (Description)</label>
                <textarea
                  rows={3}
                  value={editDescriptionKhmer}
                  onChange={(e) => setEditDescriptionKhmer(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditBookModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-slate-600 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-duc-blue hover:bg-duc-navy text-white font-bold rounded-lg shadow transition"
                >
                  រក្សាទុកការកែប្រែ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADD BOOK MODAL (ADMIN ONLY) */}
      {isAddBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scaleIn">
            {/* Modal Header */}
            <div className="bg-duc-blue p-5 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <BookPlus className="w-5 h-5 text-duc-gold" />
                <h3 className="font-bold text-base">បញ្ចូលសៀវភៅថ្មីដោយដៃ (Manual Book Entry)</h3>
              </div>
              <button
                onClick={() => setIsAddBookModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-duc-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddBookSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ចំណងជើងសៀវភៅជាភាសាខ្មែរ (Khmer Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={addTitleKhmer}
                    onChange={(e) => setAddTitleKhmer(e.target.value)}
                    placeholder="e.g. គណិតវិទ្យាវិស្វកម្មកម្រិតខ្ពស់"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ចំណងជើងជាភាសាអង់គ្លេស (English Title)
                  </label>
                  <input
                    type="text"
                    value={addTitleEnglish}
                    onChange={(e) => setAddTitleEnglish(e.target.value)}
                    placeholder="e.g. Advanced Engineering Mathematics"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ឈ្មោះអ្នកនិពន្ធ (Authors) *
                  </label>
                  <input
                    type="text"
                    required
                    value={addAuthors}
                    onChange={(e) => setAddAuthors(e.target.value)}
                    placeholder="បំបែកដោយក្បៀស (,) បើមានច្រើននាក់"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    មហាវិទ្យាល័យ / ដេប៉ាតឺម៉ង់ (Department) *
                  </label>
                  <CompactCategorySelect
                    categories={categories}
                    value={addCategoryId}
                    onChange={(id) => setAddCategoryId(id)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ចំនួនក្បាលសៀវភៅ (Copies) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={addCopiesCount}
                    onChange={(e) => setAddCopiesCount(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    ទីតាំងធ្នើដាក់សៀវភៅ (Shelf Location)
                  </label>
                  <input
                    type="text"
                    value={addShelfLocation}
                    onChange={(e) => setAddShelfLocation(e.target.value)}
                    placeholder="e.g. ជាន់ទី ២, ធ្នើ FDI-01"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    រោងពុម្ព (Publisher)
                  </label>
                  <input
                    type="text"
                    value={addPublisher}
                    onChange={(e) => setAddPublisher(e.target.value)}
                    placeholder="e.g. MIT Press ឬ DUC"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ឆ្នាំបោះពុម្ព (Year)
                  </label>
                  <input
                    type="number"
                    value={addPublicationYear}
                    onChange={(e) => setAddPublicationYear(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="e.g. 2024"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ISBN-13
                  </label>
                  <input
                    type="text"
                    value={addIsbn13}
                    onChange={(e) => setAddIsbn13(e.target.value)}
                    placeholder="e.g. 978999500..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ភាសាសៀវភៅ (Language)
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="addLanguage"
                      value="km"
                      checked={addLanguage === 'km'}
                      onChange={() => setAddLanguage('km')}
                      className="text-duc-blue focus:ring-duc-blue"
                    />
                    <span>ភាសាខ្មែរ (Khmer)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="addLanguage"
                      value="en"
                      checked={addLanguage === 'en'}
                      onChange={() => setAddLanguage('en')}
                      className="text-duc-blue focus:ring-duc-blue"
                    />
                    <span>English</span>
                  </label>
                </div>
              </div>

              {/* Book Cover Image Upload (Computer / Phone or URL) */}
              <BookCoverUploadField
                value={addCoverImageUrl}
                onChange={setAddCoverImageUrl}
                label="រូបភាពក្របសៀវភៅ (Book Cover Image)"
              />

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ការពិពណ៌នាសង្ខេប (Description)
                </label>
                <textarea
                  rows={3}
                  value={addDescriptionKhmer}
                  onChange={(e) => setAddDescriptionKhmer(e.target.value)}
                  placeholder="សេចក្តីសង្ខេបខ្លឹមសារសៀវភៅ សម្រាប់ឱ្យនិស្សិតស្វែងយល់..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBookModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-700 transition text-xs sm:text-sm"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={addingBook}
                  className="px-5 py-2.5 bg-duc-blue hover:bg-duc-navy text-duc-gold font-bold rounded-xl shadow-md transition text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4 text-duc-gold" />
                  <span>{addingBook ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកសៀវភៅថ្មី'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Books Modal (Admin Only) */}
      {isAdmin && isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-scaleIn">
            <div className="bg-rose-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-extrabold text-base">លុបសៀវភៅទាំងអស់ (Clear All Books)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsClearAllModalOpen(false);
                  setClearAllConfirmText('');
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-1.5 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 text-rose-700">
                  <span>⚠️</span> ការព្រមានសំខាន់ (Irreversible Action):
                </p>
                <p>
                  សកម្មភាពនេះនឹងធ្វើការជម្រះនិងលុបសៀវភៅទាំងអស់ រួមទាំងក្បាលសៀវភៅ (Physical Copies) ចេញពីបណ្ណាល័យជាអចិន្ត្រៃយ៍។
                </p>
                <p className="font-bold text-rose-800">
                  ទិន្នន័យដែលលុបរួច នឹងមិនអាចត្រឡប់ក្រោយវិញបានទេ!
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                <span>ចំនួនសៀវភៅសរុបក្នុងកាតាឡុកបច្ចុប្បន្ន:</span>
                <span className="font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200">
                  {books.length} ចំណងជើង
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ដើម្បីបញ្ជាក់ សូមវាយពាក្យ <span className="font-mono text-rose-600 font-black bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">DELETE</span> ឬ <span className="font-mono text-rose-600 font-black bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">លុបទាំងអស់</span>:
                </label>
                <input
                  type="text"
                  value={clearAllConfirmText}
                  onChange={(e) => setClearAllConfirmText(e.target.value)}
                  placeholder="វាយពាក្យ DELETE ឬ លុបទាំងអស់"
                  className="w-full p-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isClearingAll}
                  onClick={() => {
                    setIsClearAllModalOpen(false);
                    setClearAllConfirmText('');
                  }}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  បោះបង់
                </button>

                <button
                  type="button"
                  disabled={
                    (clearAllConfirmText !== 'DELETE' && clearAllConfirmText !== 'លុបទាំងអស់') ||
                    isClearingAll
                  }
                  onClick={handleClearAllBooks}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isClearingAll ? 'កំពុងលុបទាំងអស់...' : 'យល់ព្រមលុបទាំងអស់ជាអចិន្ត្រៃយ៍'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

