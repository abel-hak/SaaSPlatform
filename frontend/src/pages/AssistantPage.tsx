import React, { useEffect, useRef, useState } from 'react';
import { Plus, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, PlanName } from '../lib/api';
import { useAuth, usePlan } from '../context/AuthContext';

interface Conversation {
  id: string;
  title: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

const AssistantPage: React.FC = () => {
  const { me } = useAuth();
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

  const disabled = loading || atLimit;

  const send = async () => {
    if (!input.trim() || disabled) return;
    const question = input.trim();
    setInput('');
    const existing = [...messages, { role: 'user' as const, content: question }];
    setMessages(existing);
    setLoading(true);

    try {
      const body: any = { message: question };
      if (canUseHistory && selected) body.conversation_id = selected;

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/assistant/chat`, {
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
        toast.error(data.detail ?? 'You have reached your monthly limit.');
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        toast.error('Unable to reach assistant');
        setLoading(false);
        return;
      }

      let answer = '';
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          const lines = chunk.split('\n');
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line.startsWith('data:')) continue;
            const token = line.slice(line.indexOf(':') + 1).trimStart();
            if (!token || token === '[DONE]') continue;
            answer += token;
            setMessages((prev) => {
              const base = [...existing];
              const last = base[base.length - 1];
              if (!last || last.role !== 'assistant') {
                return [...base, { role: 'assistant', content: token }];
              }
              return [...base.slice(0, -1), { ...last, content: last.content + token }];
            });
          }
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 429) setAtLimit(true);
      toast.error('Something went wrong while streaming the answer.');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const newConversation = () => {
    setSelected(null);
    setMessages([]);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">Answers grounded in your organization's documents.</p>
        </div>
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking…
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[240px,1fr] gap-4 min-h-[60vh]">
        {/* Sidebar */}
        <aside className="card p-3 hidden md:flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-[#8e8e8e] uppercase tracking-wide">
              Conversations
            </span>
            {canUseHistory ? (
              <button onClick={newConversation} className="btn-ghost !p-1 !rounded text-xs">
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
                  onClick={() => {
                    setSelected(c.id);
                    setMessages([]);
                    api
                      .get(`/assistant/conversations/${c.id}/messages`)
                      .then((r) => {
                        setMessages(
                          r.data.messages.map((m: any) => ({
                            role: m.role,
                            content: m.content,
                          }))
                        );
                      })
                      .catch(() => toast.error('Unable to load conversation'));
                  }}
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
              <p className="text-xs text-slate-500 dark:text-[#8e8e8e]">
                Upgrade to Pro to unlock history and multi-threaded chats.
              </p>
            </div>
          )}
        </aside>

        {/* Chat area */}
        <div className="card p-4 flex flex-col">
          {/* Messages */}
          <div className="flex-1 rounded-lg bg-surface-subtle/50 dark:bg-[#2a2a2a] border border-surface-border dark:border-[#3a3a3a] px-4 py-4 overflow-y-auto space-y-4 mb-4 min-h-[300px]">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-[#8e8e8e] text-center py-12">
                Ask about your docs, architecture, or how your team uses Aurora.
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                    m.role === 'user'
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'bg-surface-subtle text-slate-600 dark:bg-[#383838] dark:text-[#d4d4d4] border border-surface-border dark:border-[#4a4a4a]'
                  }`}
                >
                  {m.role === 'user' ? 'U' : 'AI'}
                </div>
                <div
                  className={`max-w-full md:max-w-2xl px-3.5 py-2.5 rounded-xl text-sm ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white dark:bg-brand-500'
                      : 'bg-surface-card dark:bg-[#2f2f2f] border border-surface-border dark:border-[#424242] text-slate-700 dark:text-[#d4d4d4]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="space-y-2">
            <div className="relative">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={disabled}
                placeholder={
                  atLimit
                    ? "You've reached your monthly limit. Upgrade to continue."
                    : 'Ask a question about your workspace…'
                }
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
            <p className="text-xs text-slate-400 dark:text-[#8e8e8e]">
              Press Enter to send, Shift+Enter for a new line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
