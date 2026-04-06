import React, { useEffect, useState } from 'react';
import { UploadCloud, Trash2, FileText, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

interface DocumentItem {
  id: string;
  filename: string;
  size_bytes: number;
  status: string;
  chunk_count: number;
  created_at: string;
}

const statusBadge = (status: string) => {
  if (status === 'ready')    return 'badge-success';
  if (status === 'failed')   return 'badge badge-neutral !bg-red-50 !text-red-600 !ring-red-200';
  return 'badge-warn';
};

const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<{ documents: DocumentItem[] }>('/documents/');
      setDocs(res.data.documents);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const onDrop = async (files: FileList | null) => {
    if (!files || files.length === 0 || atLimit) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', files[0]);
      const res = await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: () => true,
      });
      if (res.status === 202) {
        toast.success('Document uploaded — indexing in background.');
        await load();
      } else if (res.status === 429) {
        setAtLimit(true);
        toast.error(res.data.detail ?? 'Upload limit reached.');
      } else {
        toast.error(res.data?.detail ?? 'Unable to upload document');
      }
    } catch {
      toast.error('Unable to upload document');
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = () => {
    if (atLimit) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,.py,.js,.ts,.csv';
    input.onchange = () => onDrop(input.files);
    input.click();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this document and its vectors?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      await load();
    } catch {
      toast.error('Unable to delete document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Upload and manage files. We index them for AI retrieval.</p>
        </div>
        <button
          onClick={openFilePicker}
          disabled={atLimit || uploading}
          className="btn-primary text-sm"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
          ) : (
            <><UploadCloud className="w-4 h-4" /> Upload file</>
          )}
        </button>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && openFilePicker()}
        onClick={openFilePicker}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          onDrop(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-12 gap-3 transition-colors cursor-pointer select-none
          ${atLimit
            ? 'border-red-200 bg-red-50 cursor-not-allowed'
            : isDragging
              ? 'border-brand-500 bg-brand-50'
              : 'border-surface-border bg-surface-subtle hover:border-brand-400 hover:bg-brand-50/30'
          }`}
      >
        {atLimit ? (
          <>
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div className="text-center">
              <p className="text-sm font-semibold text-red-700">Upload limit reached</p>
              <p className="text-xs text-red-500 mt-0.5">Upgrade your plan to upload more documents.</p>
            </div>
          </>
        ) : (
          <>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-brand-100' : 'bg-surface-card border border-surface-border'}`}>
              <UploadCloud className={`w-5 h-5 ${isDragging ? 'text-brand-600' : 'text-slate-400'}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">
                {isDragging ? 'Drop to upload' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                PDF, Markdown, TXT, Python, JS, TS, CSV — max 10 MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Documents table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-subtle border-b border-surface-border">
              <th className="table-head">Name</th>
              <th className="table-head">Size</th>
              <th className="table-head">Status</th>
              <th className="table-head hidden md:table-cell">Uploaded</th>
              <th className="table-head text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="font-medium text-slate-800 text-sm">{d.filename}</span>
                  </div>
                </td>
                <td className="table-cell text-slate-500 text-xs">
                  {d.size_bytes < 1024
                    ? `${d.size_bytes} B`
                    : d.size_bytes < 1024 * 1024
                    ? `${(d.size_bytes / 1024).toFixed(1)} KB`
                    : `${(d.size_bytes / 1024 / 1024).toFixed(1)} MB`}
                </td>
                <td className="table-cell">
                  <span className={statusBadge(d.status)}>{d.status}</span>
                </td>
                <td className="table-cell hidden md:table-cell text-slate-500 text-xs">
                  {new Date(d.created_at).toLocaleDateString()}
                </td>
                <td className="table-cell text-right">
                  <button
                    onClick={() => remove(d.id)}
                    className="btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <FileText className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No documents yet. Upload your first file above.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentsPage;
