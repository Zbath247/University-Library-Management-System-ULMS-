import React, { useState, useEffect } from 'react';
import { api, LoanItem } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Repeat,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle,
  Search,
  Calendar,
  Clock,
  User,
  Barcode,
  RotateCw,
  Send,
} from 'lucide-react';

export const Circulation: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ISSUE' | 'RETURN' | 'OVERDUE'>('ACTIVE');

  // Loans list
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Issue Form
  const [copyCode, setCopyCode] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [dueDays, setDueDays] = useState(14);
  const [issueNotes, setIssueNotes] = useState('');
  const [issueMessage, setIssueMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Return Form
  const [returnCopyCode, setReturnCopyCode] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnMessage, setReturnMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const [activeRes, overdueRes] = await Promise.all([
        api.get('/loans/active', { params: { q: searchQuery, limit: 50 } }),
        api.get('/loans/overdue'),
      ]);
      setLoans(activeRes.data?.data || []);
      setOverdueLoans(overdueRes.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [searchQuery]);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueMessage(null);
    try {
      const res = await api.post('/loans/issue', {
        bookCopyIdentifier: copyCode.trim(),
        memberIdentifier: memberCode.trim(),
        dueDays: Number(dueDays),
        notes: issueNotes.trim() || null,
      });

      setIssueMessage({
        type: 'success',
        text: `បានឱ្យខ្ចីសៀវភៅ "${res.data?.data?.bookCopy?.book?.titleKhmer}" ជោគជ័យ! កាលបរិច្ឆេទសង: ${new Date(res.data?.data?.dueDate).toLocaleDateString()}`,
      });
      setCopyCode('');
      setMemberCode('');
      setIssueNotes('');
      fetchLoans();
    } catch (err: any) {
      setIssueMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'ប្រតិបត្តិការឱ្យខ្ចីបរាជ័យ',
      });
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnMessage(null);
    try {
      const res = await api.post('/loans/return', {
        bookCopyIdentifier: returnCopyCode.trim(),
        notes: returnNotes.trim() || null,
      });

      setReturnMessage({
        type: 'success',
        text: res.data?.message || 'បានទទួលសៀវភៅសងត្រឡប់មកវិញដោយជោគជ័យ!',
      });
      setReturnCopyCode('');
      setReturnNotes('');
      fetchLoans();
    } catch (err: any) {
      setReturnMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'ប្រតិបត្តិការទទួលសងបរាជ័យ',
      });
    }
  };

  const handleRenew = async (loanId: string) => {
    try {
      await api.post('/loans/renew', { loanId, additionalDays: 14 });
      alert('បានពន្យារពេល ១៤ ថ្ងៃបន្ថែមដោយជោគជ័យ!');
      fetchLoans();
    } catch (err: any) {
      alert('មិនអាចពន្យារពេលបានទេ: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-duc-blue">
            <Repeat className="w-6 h-6 text-duc-gold" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
              {t.circulationTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ប្រតិបត្តិការឱ្យខ្ចី ទទួលសង និងតាមដានកាលបរិច្ឆេទសៀវភៅហួសកំណត់របស់និស្សិត និងសាស្ត្រាចារ្យ
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-xl text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
              activeTab === 'ACTIVE' ? 'bg-white text-duc-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.activeLoansList} ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab('ISSUE')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
              activeTab === 'ISSUE' ? 'bg-white text-duc-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.issueBook}
          </button>
          <button
            onClick={() => setActiveTab('RETURN')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
              activeTab === 'RETURN' ? 'bg-white text-duc-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.returnBook}
          </button>
          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
              activeTab === 'OVERDUE' ? 'bg-red-600 text-white shadow-sm' : 'text-red-700 hover:bg-red-50'
            }`}
          >
            {t.overdueLoansList} ({overdueLoans.length})
          </button>
        </div>
      </div>

      {/* TAB 1: ACTIVE LOANS */}
      {activeTab === 'ACTIVE' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះអ្នកខ្ចី, លេខកូដសមាជិក, ឬលេខបញ្ជីសៀវភៅ..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-duc-blue"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">ចំណងជើងសៀវភៅ</th>
                  <th className="px-4 py-3 whitespace-nowrap">លេខបញ្ជី (Accession)</th>
                  <th className="px-4 py-3 whitespace-nowrap">អ្នកខ្ចី</th>
                  <th className="px-4 py-3 whitespace-nowrap">កាលបរិច្ឆេទខ្ចី</th>
                  <th className="px-4 py-3 whitespace-nowrap">កាលបរិច្ឆេទសង</th>
                  <th className="px-4 py-3 whitespace-nowrap">ស្ថានភាព</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {loan.bookCopy?.book?.titleKhmer}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {loan.bookCopy?.accessionNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{loan.member?.fullNameKhmer}</div>
                      {loan.member?.fullNameEnglish && (
                        <div className="text-[10px] text-slate-500 italic">{loan.member.fullNameEnglish}</div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">{loan.member?.memberCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(loan.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <span className={loan.isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}>
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </span>
                      {loan.isOverdue && (
                        <span className="block text-[10px] text-red-500 font-bold">
                          ហួស {loan.overdueDays} ថ្ងៃ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          loan.isOverdue
                            ? 'bg-red-100 text-red-800'
                            : loan.status === 'EXTENDED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {loan.isOverdue ? 'OVERDUE' : loan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {loan.member?.telegramUsername && (
                          <a
                            href={`https://t.me/${loan.member.telegramUsername.replace(/^@/, '')}?text=${encodeURIComponent(
                              `សួស្តី ${loan.member.fullNameKhmer}! សូមរំលឹកពីបណ្ណាល័យ DUC ៖ សៀវភៅ «${loan.bookCopy?.book?.titleKhmer || ''}» ត្រូវសងត្រឡប់មកបណ្ណាល័យវិញនៅថ្ងៃ ${new Date(loan.dueDate).toLocaleDateString('km-KH')}។ សូមអរគុណ!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-white bg-sky-50 hover:bg-sky-600 px-2 py-1 rounded transition whitespace-nowrap border border-sky-200"
                            title="ផ្ញើសាររំលឹក Alert តាម Telegram"
                          >
                            <Send className="w-3 h-3" />
                            <span>Alert Telegram</span>
                          </a>
                        )}
                        <button
                          onClick={() => handleRenew(loan.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-duc-blue hover:text-duc-navy bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition whitespace-nowrap"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>{t.renew}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ISSUE BOOK DESK */}
      {activeTab === 'ISSUE' && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-duc-blue pb-3 border-b border-slate-100">
            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-800">{t.issueBook}</h3>
          </div>

          {issueMessage && (
            <div
              className={`p-3 text-xs rounded-lg flex items-center gap-2 ${
                issueMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {issueMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{issueMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t.scanAccessionOrBarcode} *
              </label>
              <div className="relative">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={copyCode}
                  onChange={(e) => setCopyCode(e.target.value)}
                  placeholder="ឧ. DUC-BC-000101 ឬបាកូដ"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.memberCode} *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  placeholder="ឧ. DUC-STU-2026-001"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t.loanPeriodDays} (លំនាំដើម: ១៤ ថ្ងៃ)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={dueDays}
                onChange={(e) => setDueDays(parseInt(e.target.value, 10))}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.notes}</label>
              <input
                type="text"
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="ចំណាំបន្ថែមលើការខ្ចី..."
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition text-xs"
            >
              {t.btnConfirmIssue}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: RETURN BOOK DESK */}
      {activeTab === 'RETURN' && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-duc-blue pb-3 border-b border-slate-100">
            <ArrowDownLeft className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-800">{t.returnBook}</h3>
          </div>

          {returnMessage && (
            <div
              className={`p-3 text-xs rounded-lg flex items-center gap-2 ${
                returnMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{returnMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {t.scanAccessionOrBarcode} *
              </label>
              <div className="relative">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={returnCopyCode}
                  onChange={(e) => setReturnCopyCode(e.target.value)}
                  placeholder="ស្កេនបាកូដ ឬវាយលេខចុះបញ្ជី Accession"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                កំណត់ត្រាស្ថានភាពពេលសង (Condition / Notes)
              </label>
              <input
                type="text"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="ឧ. សៀវភៅនៅល្អ ឬមានរហែកបន្តិច..."
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-duc-blue hover:bg-duc-navy text-white font-bold rounded-lg shadow transition text-xs"
            >
              {t.btnConfirmReturn}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: OVERDUE TRACKING */}
      {activeTab === 'OVERDUE' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{t.overdueLoansList} ({overdueLoans.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-red-50 text-red-900 font-semibold border-b border-red-200">
                <tr>
                  <th className="px-4 py-2.5 whitespace-nowrap">ចំណងជើងសៀវភៅ</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">លេខចុះបញ្ជី</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">អ្នកខ្ចី</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">កាលបរិច្ឆេទសង</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">ចំនួនថ្ងៃហួសកំណត់</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">ទំនាក់ទំនង & Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {overdueLoans.map((l) => (
                  <tr key={l.id} className="hover:bg-red-50/50">
                    <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                      {l.bookCopy?.book?.titleKhmer}
                    </td>
                    <td className="px-4 py-2.5 font-mono whitespace-nowrap">{l.bookCopy?.accessionNumber}</td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                      <div className="font-bold">{l.member?.fullNameKhmer}</div>
                      {l.member?.fullNameEnglish && (
                        <div className="text-[10px] text-slate-500 italic">{l.member.fullNameEnglish}</div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono">{l.member?.memberCode}</div>
                    </td>
                    <td className="px-4 py-2.5 text-red-600 font-bold whitespace-nowrap">
                      {new Date(l.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-red-700 whitespace-nowrap">
                      {l.overdueDays} ថ្ងៃ
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {l.member?.phoneNumber && (
                          <span className="font-mono text-slate-600 text-xs">📞 {l.member.phoneNumber}</span>
                        )}
                        {l.member?.telegramUsername ? (
                          <a
                            href={`https://t.me/${l.member.telegramUsername.replace(/^@/, '')}?text=${encodeURIComponent(
                              `[ជូនដំណឹងបន្ទាន់] សួស្តី ${l.member.fullNameKhmer}! សៀវភៅ «${l.bookCopy?.book?.titleKhmer || ''}» បានហួសកាលកំណត់សងចំនួន ${l.overdueDays} ថ្ងៃហើយ។ សូមយកមកសងបណ្ណាល័យ DUC ជាបន្ទាន់។ អរគុណ!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 px-2.5 py-1 rounded-lg transition whitespace-nowrap shadow-sm active:scale-95"
                            title="ផ្ញើសារ Alert តាម Telegram ភ្លាមៗ"
                          >
                            <Send className="w-3 h-3" />
                            <span>Alert Telegram</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">គ្មាន Telegram</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

