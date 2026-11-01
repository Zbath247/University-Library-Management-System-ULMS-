import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useLanguage } from '../contexts/LanguageContext';
import {
  BarChart3,
  Download,
  Upload,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { t } = useLanguage();
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // CSV Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.get('/reports/inventory').then((res) => {
      setInventory(res.data?.data);
      setLoading(false);
    });
  }, []);

  const handleExportCsv = () => {
    window.location.href = '/api/v1/csv/export/books';
  };

  const handlePreviewImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/csv/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewData(res.data?.data);
    } catch (err: any) {
      alert('Error parsing CSV: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleCommitImport = async () => {
    if (!previewData?.previewItems) return;
    setImporting(true);

    try {
      const res = await api.post('/csv/import/commit', { items: previewData.previewItems });
      setImportSuccess(`បាននាំចូលទិន្នន័យសៀវភៅចំនួន ${res.data?.data?.importedCount} ក្បាលដោយជោគជ័យ!`);
      setPreviewData(null);
      setImportFile(null);
      // Refresh inventory
      api.get('/reports/inventory').then((r) => setInventory(r.data?.data));
    } catch (err: any) {
      alert('Error committing import: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-duc-blue">
            <BarChart3 className="w-6 h-6 text-duc-gold" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
              {t.reportsTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ទាញយកទិន្នន័យកាតាឡុកសៀវភៅជា CSV និងនាំចូលទិន្នន័យជាបាច់ប្រកបដោយសុវត្ថិភាព
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition"
        >
          <Download className="w-4 h-4" />
          <span>{t.exportCatalogCsv}</span>
        </button>
      </div>

      {/* Category Breakdown Cards */}
      {inventory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-duc-blue" />
              <span>សៀវភៅតាមប្រភេទ (Categories Breakdown)</span>
            </h3>

            <div className="space-y-2">
              {inventory.categoriesBreakdown?.map((cat: any) => (
                <div key={cat.code} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-bold text-slate-800">{cat.nameKhmer}</span>
                  </div>
                  <span className="font-bold text-duc-blue bg-blue-50 px-2.5 py-0.5 rounded">
                    {cat.bookCount} ចំណងជើង
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>ស្ថានភាពរូបវន្តសៀវភៅ (Physical Condition)</span>
            </h3>

            <div className="space-y-2">
              {inventory.conditionBreakdown?.map((cond: any) => (
                <div key={cond.condition} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="font-bold text-slate-700 uppercase">{cond.condition}</span>
                  <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded">
                    {cond.count} ក្បាល
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSV Batch Import Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-800">{t.importCsv}</h3>
            <p className="text-xs text-slate-500">
              បញ្ចូលសៀវភៅច្រើនក្បាលក្នុងពេលតែមួយតាមរយៈឯកសារ CSV (មានមុខងារ Preview ត្រួតពិនិត្យមុន Commit)
            </p>
          </div>
        </div>

        {importSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{importSuccess}</span>
          </div>
        )}

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-medium mb-3">
            ជ្រើសរើសឯកសារ CSV ដែលមានទិន្នន័យសៀវភៅ
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handlePreviewImport}
            className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-duc-blue file:text-white hover:file:bg-duc-navy"
          />
        </div>

        {/* CSV Preview Table */}
        {previewData && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                គំរូទិន្នន័យត្រូវនាំចូល (បង្ហាញ ១០ ជួរដំបូងនៃ {previewData.totalRows} ជួរ)
              </span>
              <button
                onClick={handleCommitImport}
                disabled={importing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
              >
                {importing ? 'កំពុងនាំចូល...' : 'បញ្ជាក់ការ Commit ចូលប្រព័ន្ធ'}
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 font-semibold text-slate-600">
                  <tr>
                    <th className="p-2 whitespace-nowrap">ជួរ</th>
                    <th className="p-2 whitespace-nowrap">ចំណងជើងខ្មែរ</th>
                    <th className="p-2 whitespace-nowrap">English Title</th>
                    <th className="p-2 whitespace-nowrap">ISBN</th>
                    <th className="p-2 whitespace-nowrap">អ្នកនិពន្ធ</th>
                    <th className="p-2 whitespace-nowrap">Accession No.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.previewItems?.map((row: any) => (
                    <tr key={row.rowNumber} className="hover:bg-slate-50">
                      <td className="p-2 font-mono text-slate-400 whitespace-nowrap">{row.rowNumber}</td>
                      <td className="p-2 font-medium text-slate-800 whitespace-nowrap">{row.titleKhmer}</td>
                      <td className="p-2 text-slate-600 italic whitespace-nowrap">{row.titleEnglish}</td>
                      <td className="p-2 font-mono text-slate-500 whitespace-nowrap">{row.isbn || '—'}</td>
                      <td className="p-2 text-slate-600 whitespace-nowrap">{row.authors?.join(', ')}</td>
                      <td className="p-2 font-mono text-duc-blue font-bold whitespace-nowrap">{row.accessionNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

