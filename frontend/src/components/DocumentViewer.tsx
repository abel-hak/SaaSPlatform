import React, { useCallback, useEffect, useState } from 'react';
import { X, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface DocumentChunk {
  chunk_index: number;
  content: string;
  filename: string;
}

interface Props {
  documentId: string;
  filename: string;
  highlightChunk?: number;
  onClose: () => void;
}

const DocumentViewer: React.FC<Props> = ({ documentId, filename, highlightChunk, onClose }) => {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChunk, setActiveChunk] = useState(highlightChunk ?? 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/documents/${documentId}/chunks`);
      setChunks(res.data.chunks);
      if (highlightChunk != null && highlightChunk < res.data.chunks.length) {
        setActiveChunk(highlightChunk);
      }
    } catch {
      setError('Unable to load document chunks.');
    } finally {
      setLoading(false);
    }
  }, [documentId, highlightChunk]);

  useEffect(() => {
    load();
  }, [load]);

  const chunk = chunks[activeChunk];

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-panel !max-w-2xl !max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{filename}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost !p-1" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : chunks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-sm text-slate-400">No indexed chunks found.</p>
          </div>
        ) : (
          <>
            {/* Chunk navigation */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <span className="text-xs text-slate-500 dark:text-[#8e8e8e]">
                Chunk {activeChunk + 1} of {chunks.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={activeChunk === 0}
                  onClick={() => setActiveChunk((p) => Math.max(0, p - 1))}
                  className="btn-ghost !p-1"
                  aria-label="Previous chunk"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={activeChunk === chunks.length - 1}
                  onClick={() => setActiveChunk((p) => Math.min(chunks.length - 1, p + 1))}
                  className="btn-ghost !p-1"
                  aria-label="Next chunk"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chunk strip — quick nav */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1 flex-shrink-0">
              {chunks.map((c, i) => (
                <button
                  key={c.chunk_index}
                  onClick={() => setActiveChunk(i)}
                  className={`flex-shrink-0 w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                    i === activeChunk
                      ? 'bg-brand-600 text-white'
                      : i === highlightChunk
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-700'
                        : 'bg-surface-subtle dark:bg-[#383838] text-slate-600 dark:text-[#d4d4d4] hover:bg-surface-border dark:hover:bg-[#424242]'
                  }`}
                  aria-label={`Go to chunk ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Chunk text */}
            <div className="flex-1 overflow-y-auto rounded-lg bg-surface-subtle dark:bg-[#2a2a2a] border border-surface-border dark:border-[#3a3a3a] p-4">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-[#d4d4d4] font-mono leading-relaxed">
                {chunk?.content}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
