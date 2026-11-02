import React, { useState, useEffect } from 'react';
import { api, MemberItem } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { DUC_FACULTIES } from '../constants/academicStructure';
import { Users, Search, Plus, Mail, Phone, Building, CheckCircle, X, Filter, Send, Edit2, Trash2 } from 'lucide-react';

export const Members: React.FC = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Add Member Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberCode, setMemberCode] = useState('');
  const [fullNameKhmer, setFullNameKhmer] = useState('');
  const [fullNameEnglish, setFullNameEnglish] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [department, setDepartment] = useState('មហាវិទ្យាល័យឧស្សាហកម្មឌីជីថល > អភិវឌ្ឍន៍កម្មវិធីសូហ្វវែរ');
  const [memberType, setMemberType] = useState<'STUDENT' | 'FACULTY' | 'STAFF'>('STUDENT');

  // Edit Member Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMemberCode, setEditMemberCode] = useState('');
  const [editFullNameKhmer, setEditFullNameKhmer] = useState('');
  const [editFullNameEnglish, setEditFullNameEnglish] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editTelegramUsername, setEditTelegramUsername] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editMemberType, setEditMemberType] = useState<'STUDENT' | 'FACULTY' | 'STAFF'>('STUDENT');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'EXPIRED'>('ACTIVE');
  const [editMaxLoans, setEditMaxLoans] = useState(3);

  // Multi-select & Batch Delete (Admin)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/members', { params: { q: searchQuery, limit: 50 } });
      const mList = res.data?.data || [];
      setMembers(mList);
      setSelectedMemberIds((prev) => prev.filter((id) => mList.some((m: any) => m.id === id)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [searchQuery]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/members', {
        memberCode: memberCode.trim(),
        fullNameKhmer: fullNameKhmer.trim(),
        fullNameEnglish: fullNameEnglish.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || null,
        telegramUsername: telegramUsername.trim().replace(/^@/, '') || null,
        department: department.trim(),
        memberType,
        maxActiveLoans: memberType === 'FACULTY' ? 10 : 3,
      });

      setIsModalOpen(false);
      setMemberCode('');
      setFullNameKhmer('');
      setFullNameEnglish('');
      setEmail('');
      setPhoneNumber('');
      setTelegramUsername('');
      fetchMembers();
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const openEditModal = (m: MemberItem) => {
    setEditingId(m.id);
    setEditMemberCode(m.memberCode);
    setEditFullNameKhmer(m.fullNameKhmer);
    setEditFullNameEnglish(m.fullNameEnglish);
    setEditEmail(m.email);
    setEditPhoneNumber(m.phoneNumber || '');
    setEditTelegramUsername(m.telegramUsername || '');
    setEditDepartment(m.department);
    setEditMemberType(m.memberType);
    setEditStatus(m.status);
    setEditMaxLoans(m.maxActiveLoans || (m.memberType === 'FACULTY' ? 10 : 3));
    setIsEditModalOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await api.put(`/members/${editingId}`, {
        fullNameKhmer: editFullNameKhmer.trim(),
        fullNameEnglish: editFullNameEnglish.trim(),
        email: editEmail.trim(),
        phoneNumber: editPhoneNumber.trim() || null,
        telegramUsername: editTelegramUsername.trim().replace(/^@/, '') || null,
        department: editDepartment.trim(),
        memberType: editMemberType,
        status: editStatus,
        maxActiveLoans: Number(editMaxLoans),
      });

      setIsEditModalOpen(false);
      setEditingId(null);
      fetchMembers();
    } catch (err: any) {
      alert('Error updating member: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបសមាជិក «${name}» នេះមែនទេ? (សកម្មភាពនេះមិនអាចត្រឡប់ក្រោយបានទេ)`)) {
      return;
    }
    try {
      await api.delete(`/members/${id}`);
      fetchMembers();
    } catch (err: any) {
      alert('Error deleting member: ' + (err.response?.data?.error?.message || err.response?.data?.error || err.message));
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!selectedDeptFilter) return true;
    return m.department?.includes(selectedDeptFilter);
  });

  const handleToggleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map((m) => m.id));
    }
  };

  const handleToggleSelectMember = (memberId: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedMemberIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const res = await api.post('/members/batch-delete', { memberIds: selectedMemberIds });
      alert(res.data?.message || `បានលុបសមាជិកចំនួន ${selectedMemberIds.length} នាក់ដោយជោគជ័យ!`);
      setSelectedMemberIds([]);
      setIsBatchDeleteModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      alert('បរាជ័យក្នុងការលុបសមាជិក: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-duc-blue">
            <Users className="w-6 h-6 text-duc-gold" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
              {t.membersTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            គ្រប់គ្រងបញ្ជីឈ្មោះនិស្សិត និងសាស្ត្រាចារ្យ តាមដានដេប៉ាតឺម៉ង់ និងចំនួនសៀវភៅដែលកំពុងខ្ចី
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-duc-blue hover:bg-duc-navy text-white text-xs font-bold rounded-lg shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t.registerMember}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដសមាជិក, ឬអ៊ីមែល..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-duc-blue"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-duc-blue font-medium text-slate-700"
            >
              <option value="">-- 📚 គ្រប់ដេប៉ាតឺម៉ង់ទាំងអស់ / All Departments --</option>
              {DUC_FACULTIES.map((fac) => (
                <optgroup key={fac.code} label={`🏛️ ${fac.nameKhmer}`}>
                  <option value={fac.nameKhmer}>🏛️ {fac.nameKhmer} (ទាំងមូល)</option>
                  {fac.departments.map((dept) => (
                    <option key={dept.code} value={dept.nameKhmer}>
                      ↳ {dept.nameKhmer}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Admin Multi-select Toolbar */}
        {isAdmin && filteredMembers.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-700 hover:text-duc-blue">
                <input
                  type="checkbox"
                  checked={filteredMembers.length > 0 && selectedMemberIds.length === filteredMembers.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-duc-blue focus:ring-duc-blue cursor-pointer"
                />
                <span>
                  {selectedMemberIds.length === filteredMembers.length
                    ? 'ដកការជ្រើសរើសទាំងអស់ (Deselect All)'
                    : `ជ្រើសរើសទាំងអស់ (Select All - ${filteredMembers.length} នាក់)`}
                </span>
              </label>
              {selectedMemberIds.length > 0 && (
                <span className="bg-blue-100 text-duc-blue font-bold px-2.5 py-0.5 rounded-full text-xs">
                  បានជ្រើស {selectedMemberIds.length} / {filteredMembers.length} នាក់
                </span>
              )}
            </div>

            {selectedMemberIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMemberIds([])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer rounded hover:bg-slate-200/60 transition"
                >
                  បោះបង់
                </button>
                <button
                  type="button"
                  onClick={() => setIsBatchDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>លុបដែលបានជ្រើស ({selectedMemberIds.length})</span>
                </button>
              </div>
            ) : (
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                ធីកលើប្រអប់ជួរនីមួយៗ ឬធីក «ជ្រើសរើសទាំងអស់» ដើម្បីលុបសមាជិកជាក្រុម
              </span>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                {isAdmin && (
                  <th className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={filteredMembers.length > 0 && selectedMemberIds.length === filteredMembers.length}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-duc-blue focus:ring-duc-blue cursor-pointer"
                      title="ជ្រើសរើសទាំងអស់ (Select All)"
                    />
                  </th>
                )}
                <th className="px-4 py-3 whitespace-nowrap">លេខកូដសមាជិក</th>
                <th className="px-4 py-3 whitespace-nowrap">ឈ្មោះពេញ (Khmer / English)</th>
                <th className="px-4 py-3 whitespace-nowrap">មហាវិទ្យាល័យ / ដេប៉ាតឺម៉ង់</th>
                <th className="px-4 py-3 whitespace-nowrap">ទំនាក់ទំនង</th>
                <th className="px-4 py-3 whitespace-nowrap">ប្រភេទ</th>
                <th className="px-4 py-3 whitespace-nowrap">សៀវភៅកំពុងខ្ចី</th>
                <th className="px-4 py-3 whitespace-nowrap">ស្ថានភាព</th>
                {isAdmin && <th className="px-4 py-3 whitespace-nowrap text-right">សកម្មភាព (Admin)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {isAdmin && (
                      <td className="w-10 px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectMember(m.id, e)}
                          className="w-4 h-4 rounded border-slate-300 text-duc-blue focus:ring-duc-blue cursor-pointer"
                          title="ជ្រើសរើសសមាជិកនេះ"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {m.memberCode}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{m.fullNameKhmer}</div>
                    <div className="text-[10px] text-slate-500 italic">{m.fullNameEnglish}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{m.department}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 space-y-1 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span>{m.email}</span>
                    </div>
                    {m.phoneNumber && (
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>{m.phoneNumber}</span>
                      </div>
                    )}
                    {m.telegramUsername && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://t.me/${m.telegramUsername.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200 transition"
                          title="បើក Telegram Chat"
                        >
                          <Send className="w-2.5 h-2.5 text-sky-500" />
                          <span>@{m.telegramUsername.replace(/^@/, '')}</span>
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {m.memberType}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        (m.activeLoansCount || 0) > 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {m.activeLoansCount || 0} / {m.maxActiveLoans}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      {m.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(m)}
                          className="px-2.5 py-1 text-duc-blue hover:text-white bg-blue-50 hover:bg-duc-blue border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          title="កែប្រែព័ត៌មាន (Edit Member)"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>កែប្រែ</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m.id, m.fullNameKhmer)}
                          className="px-2.5 py-1 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          title="លុបសមាជិក (Delete Member)"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>លុប</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800">{t.registerMember}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខកូដសមាជិក (Member Code) *</label>
                <input
                  type="text"
                  required
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  placeholder="ឧ. DUC-STU-2026-003"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះជាភាសាខ្មែរ *</label>
                <input
                  type="text"
                  required
                  value={fullNameKhmer}
                  onChange={(e) => setFullNameKhmer(e.target.value)}
                  placeholder="ឧ. ហេង សម្បត្តិ"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះជាភាសាអង់គ្លេស *</label>
                <input
                  type="text"
                  required
                  value={fullNameEnglish}
                  onChange={(e) => setFullNameEnglish(e.target.value)}
                  placeholder="ឧ. Heng Sambath"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">អ៊ីមែល *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sambath.heng@duc.edu.kh"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="012 345 678"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                  <span>គណនី Telegram (Username)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs select-none">@</span>
                  <input
                    type="text"
                    value={telegramUsername.replace(/^@/, '')}
                    onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ''))}
                    placeholder="moksambath"
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  មហាវិទ្យាល័យ និង ដេប៉ាតឺម៉ង់ (Faculty & Department) *
                </label>
                <select
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue bg-white font-medium"
                >
                  <option value="">-- សូមជ្រើសរើសដេប៉ាតឺម៉ង់ --</option>
                  {DUC_FACULTIES.map((fac) => (
                    <optgroup key={fac.code} label={`🏛️ ${fac.nameKhmer}`}>
                      {fac.departments.map((dept) => (
                        <option
                          key={dept.code}
                          value={`${fac.nameKhmer} > ${dept.nameKhmer}`}
                        >
                          ↳ {dept.nameKhmer}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ប្រភេទសមាជិក</label>
                <select
                  value={memberType}
                  onChange={(e) => setMemberType(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue bg-white"
                >
                  <option value="STUDENT">និស្សិត (Student - Max 3 Books)</option>
                  <option value="FACULTY">សាស្ត្រាចារ្យ (Faculty - Max 10 Books)</option>
                  <option value="STAFF">បុគ្គលិក (Staff - Max 5 Books)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-600"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-duc-blue hover:bg-duc-navy text-white font-bold rounded-lg shadow"
                >
                  ចុះឈ្មោះ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal (Admin) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-duc-blue" />
                <h3 className="font-bold text-base text-slate-800">
                  កែប្រែព័ត៌មានសមាជិក ({editMemberCode})
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះពេញជាភាសាខ្មែរ *</label>
                <input
                  type="text"
                  required
                  value={editFullNameKhmer}
                  onChange={(e) => setEditFullNameKhmer(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ឈ្មោះជាភាសាអង់គ្លេស / ឡាតាំង *</label>
                <input
                  type="text"
                  required
                  value={editFullNameEnglish}
                  onChange={(e) => setEditFullNameEnglish(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">អ៊ីមែល *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">លេខទូរស័ព្ទ</label>
                  <input
                    type="text"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                  <span>គណនី Telegram (Username)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs select-none">@</span>
                  <input
                    type="text"
                    value={editTelegramUsername.replace(/^@/, '')}
                    onChange={(e) => setEditTelegramUsername(e.target.value.replace(/^@/, ''))}
                    placeholder="username"
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  មហាវិទ្យាល័យ និង ដេប៉ាតឺម៉ង់ (Department) *
                </label>
                <select
                  required
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue bg-white font-medium"
                >
                  <option value="">-- សូមជ្រើសរើសដេប៉ាតឺម៉ង់ --</option>
                  {DUC_FACULTIES.map((fac) => (
                    <optgroup key={fac.code} label={`🏛️ ${fac.nameKhmer}`}>
                      {fac.departments.map((dept) => (
                        <option
                          key={dept.code}
                          value={dept.nameKhmer}
                        >
                          ↳ {dept.nameKhmer}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ប្រភេទសមាជិក</label>
                  <select
                    value={editMemberType}
                    onChange={(e) => setEditMemberType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue bg-white"
                  >
                    <option value="STUDENT">និស្សិត</option>
                    <option value="FACULTY">សាស្ត្រាចារ្យ</option>
                    <option value="STAFF">បុគ្គលិក</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ស្ថានភាព</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue bg-white"
                  >
                    <option value="ACTIVE">សកម្ម (ACTIVE)</option>
                    <option value="SUSPENDED">ផ្អាក (SUSPENDED)</option>
                    <option value="EXPIRED">ផុតកំណត់ (EXPIRED)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ចំនួនសៀវភៅខ្ចី</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editMaxLoans}
                    onChange={(e) => setEditMaxLoans(parseInt(e.target.value) || 3)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-bold text-center"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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

      {/* Batch Delete Confirmation Modal (Admin Only) */}
      {isAdmin && isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-scaleIn">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  បញ្ជាក់ការលុបសមាជិកដែលបានជ្រើសរើស
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  តើអ្នកពិតជាចង់លុបសមាជិកចំនួន{' '}
                  <span className="font-extrabold text-rose-600 underline text-base">
                    {selectedMemberIds.length} នាក់
                  </span>{' '}
                  ដែលបានជ្រើសរើសនេះចេញពីប្រព័ន្ធបណ្ណាល័យមែនទេ?
                </p>
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-3 text-left">
                  ⚠️ <strong>ចំណាំ៖</strong> ប្រព័ន្ធនឹងពិនិត្យស្វ័យប្រវត្តិ។ ប្រសិនបើសមាជិកណាមានសៀវភៅកំពុងខ្ចីមិនទាន់សង ប្រព័ន្ធនឹងមិនអនុញ្ញាតឱ្យលុបឡើយ។
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isBatchDeleting}
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition cursor-pointer"
                >
                  បោះបង់ (Cancel)
                </button>
                <button
                  type="button"
                  disabled={isBatchDeleting}
                  onClick={handleBatchDelete}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isBatchDeleting ? (
                    <span>កំពុងលុប...</span>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>យល់ព្រមលុប ({selectedMemberIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

