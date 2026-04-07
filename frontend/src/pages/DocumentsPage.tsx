import React, { useEffect, useState } from 'react';
import { UploadCloud, Trash2, FileText, AlertCircle } from 'lucide-react';
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

const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get<{ documents: DocumentItem[] }>('/documents/');
      setDocs(res.data.documents);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
        toast.success('Document uploaded. Indexing in background.');
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

  const remove = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      await load();
    } catch {
      toast.error('Unable to delete document');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return 'badge-success';
      case 'failed':
        return 'badge-danger';
      default:
        return 'badge-warn';
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Upload PDFs, markdown, and text. We'll index them for retrieval.</p>
        </div>
      </div>

      {/* Upload area */}
      <div
        className={`card px-6 py-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
          atLimit
            ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10'
            : 'border-dashed hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/30 dark:hover:bg-brand-900/10'
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(e.dataTransfer.files);
        }}
        onClick={() => {
          if (atLimit) return;
          const input = document.createElement('input');
          input.type = 'file';
          input.onchange = () => onDrop(input.files);
          input.click();
        }}
      >
        {uploading ? (
          <div className="animate-pulse text-sm text-slate-500">Uploading…</div>
        ) : atLimit ? (
          <>
            <AlertCircle className="w-6 h-6 text-red-400 mb-2" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Upload limit reached</p>
            <p className="text-xs text-slate-500 dark:text-[#8e8e8e]">Upgrade your plan for more uploads.</p>
          </>
        ) : (
          <>
            <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-white mb-1">Drag & drop or click to upload</p>
            <p className="text-xs text-slate-500 dark:text-[#8e8e8e]">Content is indexed securely per tenant.</p>
          </>
        )}
      </div>

      {/* Documents table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-subtle dark:bg-[#2f2f2f] border-b border-surface-border dark:border-[#424242]">
              <th className="table-head">Name</th>
              <th className="table-head">Size</th>
              <th className="table-head">Status</th>
              <th className="table-head hidden md:table-cell">Created</th>
              <th className="table-head text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1, 2, 3].map((i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell"><div className="skeleton h-4 w-32" /></td>
                    <td className="table-cell"><div className="skeleton h-4 w-16" /></td>
                    <td className="table-cell"><div className="skeleton h-4 w-16" /></td>
                    <td className="table-cell hidden md:table-cell"><div className="skeleton h-4 w-24" /></td>
                    <td className="table-cell" />
                  </tr>
                ))
              : docs.map((d) => (
                  <tr key={d.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-800 dark:text-white font-medium">{d.filename}</span>
                      </div>
                    </td>
                    <td className="table-cell text-slate-500">{(d.size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="table-cell">
                      <span className={statusBadge(d.status)}>{d.status}</span>
                    </td>
                    <td className="table-cell hidden md:table-cell text-slate-500 text-xs">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => remove(d.id)}
                        className="btn-ghost !p-1.5 text-slate-400 hover:text-red-500"
                        aria-label={`Delete ${d.filename}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
            {!loading && docs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <FileText className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-[#8e8e8e]">No documents yet. Upload one to get started.</p>
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
