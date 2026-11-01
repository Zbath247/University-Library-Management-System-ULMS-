import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Lock, User } from 'lucide-react';

export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(username, password);
    setLoading(false);

    if (success) {
      onClose();
    } else {
      setError('ឈ្មោះគណនី ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ / Invalid username or password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scaleIn">
        {/* Modal Header */}
        <div className="bg-duc-blue px-6 py-4 flex items-center justify-between text-white border-b border-duc-gold/30">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DUC Emblem" className="w-9 h-9 object-contain drop-shadow" />
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">{t.login}</h3>
              <p className="text-[11px] text-duc-gold font-medium">{t.institutionName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white rounded-lg p-1 hover:bg-duc-accent transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ឈ្មោះគណនី ឬអ៊ីមែល / Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin ឬ user"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ពាក្យសម្ងាត់ / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-duc-blue hover:bg-duc-navy text-white text-sm font-bold rounded-lg shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'កំពុងផ្ទៀងផ្ទាត់...' : t.login}
          </button>
        </form>
      </div>
    </div>
  );
};

