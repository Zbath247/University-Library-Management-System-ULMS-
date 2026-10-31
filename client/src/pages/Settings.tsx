import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Clock,
  MapPin,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building,
  Calendar,
  Layers,
  Phone,
  Mail,
  Compass,
  ExternalLink,
  BookOpen,
  Users,
  Sparkles,
} from 'lucide-react';

interface SystemSettings {
  loanDurationStudentDays: number;
  loanDurationFacultyDays: number;
  maxActiveLoansStudent: number;
  maxActiveLoansFaculty: number;
  maxRenewalsAllowed: number;
  renewalDays: number;
  overdueGraceDays: number;
  finePerDay: number;

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

  shelfLocations: string[];
}

export const Settings: React.FC = () => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'LOANS' | 'LOCATION'>('LOANS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SystemSettings>({
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

    shelfLocations: [],
  });

  // Shelf management input
  const [newShelf, setNewShelf] = useState('');

  // Fetch settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data?.data) {
        setSettings(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setErrorMessage(err.response?.data?.error || err.message || 'បរាជ័យក្នុងការទាញយកការកំណត់');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save changes
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const res = await api.put('/settings', settings);
      if (res.data?.data) {
        setSettings(res.data.data);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setErrorMessage(err.response?.data?.error || err.message || 'បរាជ័យក្នុងការរក្សាទុកការកំណត់');
    } finally {
      setSaving(false);
    }
  };

  // Add shelf location
  const handleAddShelf = () => {
    if (!newShelf.trim()) return;
    if (settings.shelfLocations.includes(newShelf.trim())) {
      alert('ទីតាំងធ្នើនេះមានរួចហើយ!');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      shelfLocations: [...prev.shelfLocations, newShelf.trim()],
    }));
    setNewShelf('');
  };

  // Remove shelf location
  const handleRemoveShelf = (shelfToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      shelfLocations: prev.shelfLocations.filter((s) => s !== shelfToRemove),
    }));
  };

  // Get current device GPS coordinates
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រ Geolocation ទេ');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings((prev) => ({
          ...prev,
          libraryLatitude: parseFloat(pos.coords.latitude.toFixed(6)),
          libraryLongitude: parseFloat(pos.coords.longitude.toFixed(6)),
        }));
        alert(`បានយកទីតាំង GPS បច្ចុប្បន្នដោយជោគជ័យ៖ ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        alert('មិនអាចទាញយកទីតាំង GPS បានទេ៖ ' + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Calculated Example for preview
  const today = new Date();
  const studentDueDate = new Date(today.getTime() + (settings.loanDurationStudentDays || 14) * 24 * 60 * 60 * 1000);
  const facultyDueDate = new Date(today.getTime() + (settings.loanDurationFacultyDays || 30) * 24 * 60 * 60 * 1000);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 space-y-3">
        <div className="w-8 h-8 border-4 border-duc-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold">កំពុងទាញយកការកំណត់ប្រព័ន្ធ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-duc-blue/10 text-duc-blue">
              <Compass className="w-5 h-5 text-duc-gold" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
              {t.navSettings} (System Settings)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            កំណត់គោលការណ៍ពេលវេលាខ្ចី-សងសៀវភៅ និងទីតាំងភូមិសាស្ត្រ/ធ្នើសៀវភៅរបស់បណ្ណាល័យ
          </p>
        </div>

        {/* Save Changes Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition"
            title="ទាញយកឡើងវិញ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-duc-blue hover:bg-duc-navy text-duc-gold font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-duc-gold" />
            <span>{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកំណត់'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">ការកំណត់ត្រូវបានរក្សាទុកដោយជោគជ័យ! ប្រព័ន្ធបានធ្វើបច្ចុប្បន្នភាពរួចរាល់។</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Segment Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('LOANS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
            activeTab === 'LOANS'
              ? 'bg-duc-blue text-duc-gold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>១. កំណត់ពេលវេលាខ្ចី-សង (Loan Duration)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOCATION')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition ${
            activeTab === 'LOCATION'
              ? 'bg-duc-blue text-duc-gold shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>២. កំណត់ទីតាំង & ធ្នើសៀវភៅ (Location & Shelves)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LOAN DURATION & CIRCULATION RULES */}
      {/* ========================================================================= */}
      {activeTab === 'LOANS' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Card 1: Member Category Loan Durations */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-duc-blue" />
              <h2 className="font-extrabold text-slate-800 text-sm sm:text-base">
                រយៈពេលខ្ចីសៀវភៅតាមប្រភេទសមាជិក (Borrowing Periods)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Student duration */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-slate-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-duc-blue" />
                    <span>និស្សិត (Students)</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-duc-blue bg-blue-100/60 px-2 py-0.5 rounded">
                    {settings.loanDurationStudentDays} ថ្ងៃ
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">រយៈពេលខ្ចីអនុញ្ញាត (ថ្ងៃ) *</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={settings.loanDurationStudentDays}
                    onChange={(e) =>
                      setSettings({ ...settings, loanDurationStudentDays: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">ចំនួនសៀវភៅអតិបរមាដែលអាចខ្ចីក្នុងពេលតែមួយ (ក្បាល)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.maxActiveLoansStudent}
                    onChange={(e) =>
                      setSettings({ ...settings, maxActiveLoansStudent: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue bg-white"
                  />
                </div>
              </div>

              {/* Faculty duration */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>សាស្ត្រាចារ្យ & បុគ្គលិក (Faculty/Staff)</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                    {settings.loanDurationFacultyDays} ថ្ងៃ
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">រយៈពេលខ្ចីអនុញ្ញាត (ថ្ងៃ) *</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={settings.loanDurationFacultyDays}
                    onChange={(e) =>
                      setSettings({ ...settings, loanDurationFacultyDays: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">ចំនួនសៀវភៅអតិបរមាដែលអាចខ្ចីក្នុងពេលតែមួយ (ក្បាល)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.maxActiveLoansFaculty}
                    onChange={(e) =>
                      setSettings({ ...settings, maxActiveLoansFaculty: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Renewals & Overdue Rules */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="font-extrabold text-slate-800 text-sm sm:text-base">
                ការពន្យារពេល និងការផាកពិន័យ (Renewals & Overdue Fines)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ចំនួនដងពន្យារពេលអតិបរមា *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={settings.maxRenewalsAllowed}
                    onChange={(e) =>
                      setSettings({ ...settings, maxRenewalsAllowed: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">ដង</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">កម្រិតកំណត់នៃការស្នើសុំពន្យារពេលសៀវភៅ</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ចំនួនថ្ងៃបន្ថែមក្នុង ១ ដង *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={settings.renewalDays}
                    onChange={(e) =>
                      setSettings({ ...settings, renewalDays: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">ថ្ងៃ</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">ថ្ងៃបន្ថែមពេលចុច «ពន្យារពេលខ្ចី»</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ថ្ងៃអនុគ្រោះសងយឺត (Grace Period)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={settings.overdueGraceDays}
                    onChange={(e) =>
                      setSettings({ ...settings, overdueGraceDays: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">ថ្ងៃ</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">មិនទាន់គិតប្រាក់ពិន័យក្នុងកំឡុងពេលនេះ</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ប្រាក់ពិន័យក្នុង ១ ថ្ងៃយឺត
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={settings.finePerDay}
                    onChange={(e) =>
                      setSettings({ ...settings, finePerDay: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">រៀល</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">ពិន័យ (KHR) បន្ទាប់ពីហួសថ្ងៃអនុគ្រោះ</p>
              </div>
            </div>
          </div>

          {/* Card 3: Live Preview Simulation */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-duc-blue/10 via-duc-blue/5 to-slate-50 border border-duc-blue/20">
            <div className="flex items-center gap-2 mb-2 text-duc-blue font-bold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-duc-gold" />
              <span>ការគណនាកាលបរិច្ឆេទសាកល្បងជាក់ស្តែង (Live Calculation Preview)</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              ប្រសិនបើសិស្ស ឬសាស្ត្រាចារ្យខ្ចីសៀវភៅនៅថ្ងៃនេះ (<strong>{today.toLocaleDateString('km-KH')}</strong>)៖
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">និស្សិត (Student)៖</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">កាលបរិច្ឆេទត្រូវសង៖</span>
                  <span className="font-bold text-duc-blue font-mono">{studentDueDate.toLocaleDateString('km-KH')}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  អាចខ្ចីបាន {settings.loanDurationStudentDays} ថ្ងៃ, ពន្យារពេលបាន {settings.maxRenewalsAllowed} ដង (+{settings.maxRenewalsAllowed * settings.renewalDays} ថ្ងៃ)
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700">សាស្ត្រាចារ្យ (Faculty)៖</span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-slate-500">កាលបរិច្ឆេទត្រូវសង៖</span>
                  <span className="font-bold text-emerald-600 font-mono">{facultyDueDate.toLocaleDateString('km-KH')}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  អាចខ្ចីបាន {settings.loanDurationFacultyDays} ថ្ងៃ, ពន្យារពេលបាន {settings.maxRenewalsAllowed} ដង (+{settings.maxRenewalsAllowed * settings.renewalDays} ថ្ងៃ)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIBRARY LOCATION & SHELF SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === 'LOCATION' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Card 1: Campus & Building Profile */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building className="w-4 h-4 text-duc-blue" />
              <h2 className="font-extrabold text-slate-800 text-sm sm:text-base">
                ព័ត៌មានទីតាំងបរិវេណបណ្ណាល័យ (Campus & Building Profile)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ឈ្មោះសាខា / បរិវេណសាកលវិទ្យាល័យ (Campus Name) *
                </label>
                <input
                  type="text"
                  value={settings.campusName}
                  onChange={(e) => setSettings({ ...settings, campusName: e.target.value })}
                  placeholder="e.g. សាខាកណ្តាល (DUC Main Campus)"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ឈ្មោះអគារបណ្ណាល័យ (Building Name) *
                </label>
                <input
                  type="text"
                  value={settings.buildingName}
                  onChange={(e) => setSettings({ ...settings, buildingName: e.target.value })}
                  placeholder="e.g. អគារបណ្ណាល័យឌីជីថលកណ្តាល"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ជាន់ & បន្ទប់អាន (Floors & Reading Zones)
                </label>
                <input
                  type="text"
                  value={settings.floorLevels}
                  onChange={(e) => setSettings({ ...settings, floorLevels: e.target.value })}
                  placeholder="e.g. ជាន់ទី ១ (សាលអានទូទៅ & IT), ជាន់ទី ២ (បន្ទប់ស្រាវជ្រាវ & សៀវភៅជំនាញ)"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  អាសយដ្ឋានទីតាំងបណ្ណាល័យ (Physical Address)
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="e.g. មហាវិថីសហព័ន្ធរុស្ស៊ី, សង្កាត់ទឹកល្អក់១, ខណ្ឌទួលគោក, រាជធានីភ្នំពេញ"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ម៉ោងបើក-បិទបណ្ណាល័យ (Operating Hours)
                </label>
                <input
                  type="text"
                  value={settings.operatingHours}
                  onChange={(e) => setSettings({ ...settings, operatingHours: e.target.value })}
                  placeholder="e.g. ច័ន្ទ - សុក្រ: 7:30 ព្រឹក - 6:30 ល្ងាច"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  លេខទូរស័ព្ទ & អ៊ីមែលទំនាក់ទំនង
                </label>
                <input
                  type="text"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  placeholder="e.g. 023 888 999 / library@duc.edu.kh"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>
            </div>
          </div>

          {/* Card 2: GPS Coordinates & Geolocation */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                <h2 className="font-extrabold text-slate-800 text-sm sm:text-base">
                  កូអរដោនេទីតាំង GPS & Geofence (Coordinates)
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>យកទីតាំង GPS បច្ចុប្បន្ន</span>
                </button>

                <a
                  href={`https://www.google.com/maps?q=${settings.libraryLatitude},${settings.libraryLongitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>បើក Google Maps</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  រយៈទទឹង (Latitude) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={settings.libraryLatitude}
                  onChange={(e) =>
                    setSettings({ ...settings, libraryLatitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-2.5 font-mono text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  រយៈបណ្តោយ (Longitude) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={settings.libraryLongitude}
                  onChange={(e) =>
                    setSettings({ ...settings, libraryLongitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-2.5 font-mono text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  កាំដែនសុវត្ថិភាព (Radius in Meters)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={settings.geofenceRadiusMeters}
                    onChange={(e) =>
                      setSettings({ ...settings, geofenceRadiusMeters: parseInt(e.target.value) || 100 })
                    }
                    className="w-full p-2.5 font-mono text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">ម៉ែត្រ</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * កូអរដោនេ GPS នេះត្រូវបានប្រើប្រាស់សម្រាប់ផ្ទៀងផ្ទាត់ទីតាំងពេលសិស្ស-និស្សិតស្កេនកត់ត្រាវត្តមានចូល-ចេញបណ្ណាល័យជាក់ស្តែង។
            </p>
          </div>

          {/* Card 3: Library Shelf Locations Management */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h2 className="font-extrabold text-slate-800 text-sm sm:text-base">
                  បញ្ជីធ្នើសៀវភៅផ្លូវការ (Library Shelf Locations)
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-500">
                សរុប {settings.shelfLocations.length} ធ្នើ
              </span>
            </div>

            {/* Add new shelf input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newShelf}
                onChange={(e) => setNewShelf(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddShelf();
                  }
                }}
                placeholder="ឧទាហរណ៍៖ ជាន់ទី ១, ធ្នើ FDI-03 (វិស្វកម្មទិន្នន័យ Data Engineering)"
                className="flex-1 p-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-duc-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddShelf}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-duc-blue hover:bg-duc-navy text-duc-gold font-bold text-xs sm:text-sm rounded-xl transition shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>បន្ថែមធ្នើ</span>
              </button>
            </div>

            {/* Shelf tags list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {settings.shelfLocations.map((shelf, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 text-xs transition group"
                >
                  <span className="font-semibold text-slate-700 truncate pr-2">
                    {shelf}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveShelf(shelf)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="លុបធ្នើនេះ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Button at the Bottom */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-duc-blue hover:bg-duc-navy text-duc-gold font-bold text-sm rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4 text-duc-gold" />
          <span>{saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកការកំណត់ទាំងអស់ (Save Settings)'}</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;

