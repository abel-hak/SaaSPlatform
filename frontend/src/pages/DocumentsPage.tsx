import React, { useEffect, useState } from 'react';
import { UploadCloud, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { usePlan } from '../context/AuthContext';

interface DocumentItem {
  id: string;
  filename: string;
  size_bytes: number;
  status: string;
  chunk_count: number;
  created_at: string;
}

const DocumentsPage: React.FC = () => {
  const plan = usePlan();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [atLimit, setAtLimit] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<{ documents: DocumentItem[] }>('/documents/');
      setDocs(res.data.documents);
    } catch {
      // ignore
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
        validateStatus: () => true
      });
      if (res.status === 202) {
        toast.success('Document uploaded. Indexing in the background.');
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

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between text-xs">
        <div>
          <div className="text-slate-200 font-semibold">Documents</div>
          <div className="text-slate-400">Upload PDFs, markdown, and text. We&apos;ll index them for retrieval.</div>
        </div>
      </header>

      <div
        className={`rounded-2xl border border-dashed ${
          atLimit
            ? 'border-rose-500/60 bg-rose-950/40 text-rose-100'
            : 'border-slate-700 bg-slate-950/70 text-slate-200'
        } px-4 py-5 flex flex-col items-center justify-center text-center text-xs cursor-pointer`}
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
        <UploadCloud className="w-6 h-6 mb-2" />
        <div className="font-semibold mb-1">
          {atLimit ? "You've reached your upload limit" : 'Drag & drop or click to upload'}
        </div>
        <div className="text-[11px]">
          {atLimit ? 'Upgrade your plan for unlimited document uploads.' : 'We index content securely per tenant.'}
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-slate-800/80">
        <table className="w-full text-xs">
          <thead className="bg-slate-950/80 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Size</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Created</th>
              <th className="px-3 py-2 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-800/60">
                <td className="px-3 py-2">{d.filename}</td>
                <td className="px-3 py-2 text-slate-400">{(d.size_bytes / 1024).toFixed(1)} KB</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      d.status === 'ready'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : d.status === 'failed'
                        ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-amber-500/15 text-amber-200'
                    }`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500 hidden md:table-cell">
                  {new Date(d.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => remove(d.id)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 px-2 py-1 hover:bg-slate-900"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-slate-500 text-[11px]">
                  No documents yet.
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

