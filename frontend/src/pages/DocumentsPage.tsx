import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, Trash2, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import type { DocumentItem } from '../lib/types';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import DocumentViewer from '../components/DocumentViewer';

const POLL_INTERVAL = 4000;

const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [viewTarget, setViewTarget] = useState<DocumentItem | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ documents: DocumentItem[] }>('/documents/');
      setDocs(res.data.documents);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Poll while any document is still processing */
  useEffect(() => {
    const hasProcessing = docs.some((d) => d.status === 'processing' || d.status === 'pending');
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(load, POLL_INTERVAL);
    }
    if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [docs, load]);

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

  /* Optimistic delete */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const previous = [...docs];
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setDeleteTarget(null);
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
    } catch {
      setDocs(previous);
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

  const processingCount = docs.filter((d) => d.status === 'processing' || d.status === 'pending').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Upload PDFs, markdown, and text. We'll index them for retrieval."
        actions={
          processingCount > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {processingCount} processing…
            </div>
          ) : undefined
        }
      />

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
                      <button
                        onClick={() => d.status === 'ready' && setViewTarget(d)}
                        className={`flex items-center gap-2 text-left ${d.status === 'ready' ? 'hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer' : ''}`}
                        disabled={d.status !== 'ready'}
                      >
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-800 dark:text-white font-medium">{d.filename}</span>
                      </button>
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
                        onClick={() => setDeleteTarget(d)}
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
                <td colSpan={5}>
                  <EmptyState icon={FileText} title="No documents yet" description="Upload one to get started." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewTarget && (
        <DocumentViewer
          documentId={viewTarget.id}
          filename={viewTarget.filename}
          onClose={() => setViewTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete document"
        description={`Are you sure you want to delete "${deleteTarget?.filename}"? This will remove all indexed chunks and cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default DocumentsPage;
