import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { Plus, Loader2, Send, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, API_BASE_URL } from '../lib/api';
import type { PlanName, ChatMessage, Conversation } from '../lib/types';
import { useAuth, usePlan } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import MarkdownContent from '../components/MarkdownContent';

/* ── Source chip (shows which doc chunk was used) ── */
const SourceChip: React.FC<{ filename?: string; index?: number }> = memo(({ filename, index }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-2xs font-medium">
    <FileText className="w-3 h-3" />
    {filename ?? 'source'}{index != null ? ` #${index}` : ''}
  </span>
));
SourceChip.displayName = 'SourceChip';

/* ── Single message bubble ── */
const MessageBubble: React.FC<{ message: ChatMessage }> = memo(({ message: m }) => (
  <div className="flex gap-3 items-start animate-fade-in">
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
        m.role === 'user'
          ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
          : 'bg-surface-subtle text-slate-600 dark:bg-[#383838] dark:text-[#d4d4d4] border border-surface-border dark:border-[#4a4a4a]'
      }`}
    >
      {m.role === 'user' ? 'U' : 'AI'}
    </div>
    <div className="max-w-full md:max-w-2xl space-y-2">
      <div
        className={`px-3.5 py-2.5 rounded-xl text-sm ${
          m.role === 'user'
            ? 'bg-brand-600 text-white dark:bg-brand-500'
            : 'bg-surface-card dark:bg-[#2f2f2f] border border-surface-border dark:border-[#424242] text-slate-700 dark:text-[#d4d4d4]'
        }`}
      >
        {m.role === 'assistant' ? (
          <MarkdownContent content={m.content} />
        ) : (
          <div className="whitespace-pre-wrap">{m.content}</div>
        )}
      </div>
      {m.sources && m.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {m.sources.map((s, i) => (
            <SourceChip key={i} filename={s.filename} index={s.chunk_index} />
          ))}
        </div>
      )}
    </div>
  </div>
));
MessageBubble.displayName = 'MessageBubble';

/* ── Main page ── */
const AssistantPage: React.FC = () => {
  const { me: _me } = useAuth();
  const plan = usePlan() as PlanName | null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canUseHistory = plan === 'pro' || plan === 'enterprise';

  useEffect(() => {
    if (!canUseHistory) return;
    api.get('/assistant/conversations').then((r) => setConversations(r.data.conversations)).catch(() => {});
  }, [canUseHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const disabled = useMemo(() => loading || atLimit, [loading, atLimit]);

  const send = useCallback(async () => {
    if (!input.trim() || disabled) return;
    const question = input.trim();
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const body: Record<string, unknown> = { message: question };
      if (canUseHistory && selected) body.conversation_id = selected;

      const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        const data = await res.json();
        setAtLimit(true);
        toast.error(data.detail ?? 'Monthly limit reached.');
        return;
      }

      if (!res.ok || !res.body) {
        toast.error('Unable to reach assistant');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let answer = '';
      let streamDone = false;

      while (!streamDone) {
        const { value, done: doneReading } = await reader.read();
        streamDone = doneReading;
        if (!value) continue;
        const chunk = decoder.decode(value, { stream: !streamDone });
        for (const rawLine of chunk.split('\n')) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const token = line.slice(line.indexOf(':') + 1).trimStart();
          if (!token || token === '[DONE]') continue;
          answer += token;
          const current = answer;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'assistant') {
              return [...prev.slice(0, -1), { ...last, content: current }];
            }
            return [...prev, { role: 'assistant', content: current }];
          });
        }
      }
    } catch {
      toast.error('Something went wrong while streaming.');
    } finally {
      setLoading(false);
    }
  }, [input, disabled, canUseHistory, selected]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send]
  );

  const loadConversation = useCallback((id: string) => {
    setSelected(id);
    setMessages([]);
    api
      .get(`/assistant/conversations/${id}/messages`)
      .then((r) =>
        setMessages(r.data.messages.map((m: any) => ({ role: m.role, content: m.content })))
      )
      .catch(() => toast.error('Unable to load conversation'));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        subtitle="Answers grounded in your organization's documents."
        actions={
          loading ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </div>
          ) : undefined
        }
      />

      <div className="grid md:grid-cols-[240px,1fr] gap-4 min-h-[60vh]">
        {/* Sidebar */}
        <aside className="card p-3 hidden md:flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-[#8e8e8e] uppercase tracking-wide">
              Conversations
            </span>
            {canUseHistory ? (
              <button onClick={() => { setSelected(null); setMessages([]); }} className="btn-ghost !p-1 !rounded text-xs" aria-label="New conversation">
                <Plus className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="badge-brand text-2xs">Pro+</span>
            )}
          </div>
          {canUseHistory ? (
            <div className="flex-1 space-y-0.5 overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors hover:bg-surface-subtle dark:hover:bg-[#383838] ${
                    selected === c.id ? 'bg-surface-subtle dark:bg-[#383838] font-medium' : ''
                  }`}
                >
                  <div className="truncate text-slate-700 dark:text-[#d4d4d4]">{c.title}</div>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-[#8e8e8e] px-1.5 pt-2">No conversations yet.</p>
              )}
            </div>
          ) : (
            <div className="flex-1 rounded-lg bg-surface-subtle dark:bg-[#2f2f2f] border border-dashed border-surface-border dark:border-[#424242] flex flex-col items-center justify-center text-center px-3 py-6">
              <p className="text-sm font-medium text-slate-700 dark:text-white mb-1">Conversation history</p>
              <p className="text-xs text-slate-500 dark:text-[#8e8e8e]">Upgrade to Pro to unlock.</p>
            </div>
          )}
        </aside>

        {/* Chat area */}
        <div className="card p-4 flex flex-col">
          <div className="flex-1 rounded-lg bg-surface-subtle/50 dark:bg-[#2a2a2a] border border-surface-border dark:border-[#3a3a3a] px-4 py-4 overflow-y-auto space-y-4 mb-4 min-h-[300px]">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-[#8e8e8e] text-center py-12">
                Ask about your docs, architecture, or how your team uses Aurora.
              </div>
            )}
            {messages.map((m, idx) => (
              <MessageBubble key={idx} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="space-y-2">
            <div className="relative">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={disabled}
                placeholder={atLimit ? "Monthly limit reached. Upgrade to continue." : 'Ask a question about your workspace…'}
                className="input !rounded-xl !pr-12 resize-none"
              />
              <button
                disabled={disabled || !input.trim()}
                onClick={() => void send()}
                className="absolute right-2 bottom-2 btn-primary !p-2 !rounded-lg"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-[#8e8e8e]">Press Enter to send, Shift+Enter for a new line.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
