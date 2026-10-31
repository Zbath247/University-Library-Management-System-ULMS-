import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, Loader2, Link2, Sparkles, Check } from 'lucide-react';
import { api } from '../api/client';

export const SAMPLE_COVER_PRESETS = [
  { label: '💻 បច្ចេកវិទ្យា & IT', url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=500' },
  { label: '🏛️ វប្បធម៌ & ប្រវត្តិសាស្ត្រ', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500' },
  { label: '⚖️ នីតិសាស្ត្រ & ច្បាប់', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500' },
  { label: '📈 សេដ្ឋកិច្ច & ធុរកិច្ច', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500' },
  { label: '🌾 កសិកម្ម & ធម្មជាតិ', url: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=500' },
  { label: '🤖 បញ្ញាសិប្បនិម្មិត AI', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=500' },
  { label: '⚙️ វិស្វកម្ម & សំណង់', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500' },
  { label: '🇬🇧 ភាសាអង់គ្លេស', url: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=500' },
];

interface BookCoverUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export const BookCoverUploadField: React.FC<BookCoverUploadFieldProps> = ({
  value,
  onChange,
  label = 'រូបភាពក្របសៀវភៅ (Book Cover Image)',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlOption, setShowUrlOption] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('សូមជ្រើសរើសឯកសារជារូបភាព (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ទំហំរូបភាពមិនត្រូវលើសពី 10MB ទេ');
      return;
    }

    setErrorMsg(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/books/upload-cover', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.data?.url) {
        onChange(res.data.data.url);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      // Fallback: Read as Local Base64 Data URL if server upload fails
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            onChange(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      } catch {
        setErrorMsg(err.response?.data?.error?.message || 'បរាជ័យក្នុងការ Upload រូបភាព');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700 text-xs sm:text-sm">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlOption(!showUrlOption)}
          className="text-[11px] font-semibold text-duc-blue hover:underline flex items-center gap-1"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>{showUrlOption ? 'លាក់ជម្រើស URL' : 'ប្រើតំណភ្ជាប់ URL / រូបភាពគំរូ'}</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* Visual Upload Area */}
      {value ? (
        <div className="flex items-start gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          {/* Cover Preview Card */}
          <div className="relative w-24 h-32 rounded-xl overflow-hidden shadow-md border border-slate-300 bg-slate-200 shrink-0 group">
            <img
              src={value}
              alt="Book Cover Preview"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Spine Reflection */}
            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/30 via-white/10 to-transparent pointer-events-none" />
          </div>

          <div className="flex-1 min-w-0 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>បានកំណត់រូបភាពក្របសៀវភៅរួចរាល់</span>
            </div>

            <p className="font-mono text-[11px] text-slate-500 truncate" title={value}>
              {value}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg shadow-xs transition flex items-center gap-1 active:scale-95"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-duc-blue" />
                    <span>កំពុងបញ្ចូល...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5 text-duc-blue" />
                    <span>ប្តូររូបភាពថ្មី</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold rounded-lg transition flex items-center gap-1 active:scale-95"
                title="ដករូបភាពនេះចេញ"
              >
                <X className="w-3.5 h-3.5" />
                <span>លុប</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 select-none ${
            isDragOver
              ? 'border-duc-blue bg-duc-blue/5 scale-[1.01]'
              : 'border-slate-300 hover:border-duc-blue hover:bg-slate-50/80 bg-slate-50/40'
          }`}
        >
          {uploading ? (
            <div className="py-3 flex flex-col items-center justify-center text-duc-blue gap-2">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs font-bold">កំពុង Upload រូបភាពចូលប្រព័ន្ធ...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-1">
              <div className="w-12 h-12 rounded-2xl bg-duc-blue/10 text-duc-blue flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6 text-duc-blue" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-xs sm:text-sm">
                  ចុចដើម្បីជ្រើសរើសរូបភាពពីម៉ាស៊ីន ឬអូសទម្លាក់ទីនេះ
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  គាំទ្រឯកសារ PNG, JPG, WebP ទំហំអតិបរមា 10MB
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-duc-blue text-white text-[11px] font-bold rounded-lg shadow-sm hover:bg-duc-navy transition">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload រូបភាពក្រប</span>
              </span>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
          <X className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </p>
      )}

      {/* Optional URL input & presets accordion */}
      {showUrlOption && (
        <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 space-y-2 animate-fadeIn text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              តំណភ្ជាប់ URL រូបភាពផ្ទាល់៖
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://... (ទុកទទេដើម្បីប្រើក្របស្វ័យប្រវត្ត DUC)"
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-duc-blue font-mono text-xs bg-white"
            />
          </div>

          <div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1">
              <Sparkles className="w-3 h-3 text-duc-gold" />
              <span>ឬជ្រើសរើសរូបភាពគំរូរហ័ស៖</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SAMPLE_COVER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange(preset.url)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white hover:bg-duc-blue hover:text-white transition border border-slate-200 shadow-2xs"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

