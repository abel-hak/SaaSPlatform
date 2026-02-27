import React, { useEffect, useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
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
    const load = async () => {
      try {
        const res = await api.get('/assistant/conversations');
        setConversations(res.data.conversations);
      } catch {
        // ignore
      }
    };
    load();
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
          Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`
        },
        body: JSON.stringify(body)
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
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const token = line.replace('data: ', '');
              if (token === '[DONE]') continue;
              answer += token;
              setMessages((prev) => {
                const base = [...existing];
                const last = base[base.length - 1];
                if (!last || last.role !== 'assistant') {
                  return [...base, { role: 'assistant', content: token }];
                }
                const updated = [...base.slice(0, -1), { ...last, content: last.content + token }];
                return updated;
              });
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setAtLimit(true);
      }
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
    <div className="grid md:grid-cols-[260px,1fr] gap-4 min-h-[70vh]">
      <aside className="glass rounded-2xl p-3 hidden md:flex flex-col">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="text-slate-200">Conversations</span>
          {canUseHistory ? (
            <button
              onClick={newConversation}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-slate-900/70 border border-slate-700"
            >
              <Plus className="w-3 h-3" />
              New
            </button>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300">Pro+</span>
          )}
        </div>
        {canUseHistory ? (
          <div className="flex-1 space-y-1 overflow-y-auto text-xs">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelected(c.id);
                  setMessages([]);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 ${
                  selected === c.id ? 'bg-slate-800' : ''
                }`}
              >
                <div className="truncate text-slate-100">{c.title}</div>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="text-[11px] text-slate-500 px-1.5 pt-1.5">No conversations yet.</div>
            )}
          </div>
        ) : (
          <div className="flex-1 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 flex flex-col items-center justify-center text-center px-3 text-[11px] text-slate-400">
            <div className="mb-1 font-semibold text-slate-200">Conversation history</div>
            <p className="mb-2">
              Upgrade to Pro to unlock full conversation history, multi-threaded chats and analytics.
            </p>
          </div>
        )}
      </aside>

      <section className="glass rounded-2xl p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div>
            <div className="text-slate-200 font-semibold">Ask Aurora</div>
            <div className="text-slate-400 text-[11px]">Answers grounded in your organization&apos;s documents.</div>
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        <div className="flex-1 rounded-2xl bg-slate-950/60 border border-slate-800/80 px-3 py-3 overflow-y-auto space-y-3 text-xs">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-[11px] text-slate-500 text-center">
              Ask about product docs, architecture decisions, or how your team is using Aurora this month.
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                  m.role === 'user'
                    ? 'bg-brand-indigo/30 text-brand-indigo'
                    : 'bg-slate-800 text-brand-violet border border-slate-700'
                }`}
              >
                {m.role === 'user' ? 'U' : 'AI'}
              </div>
              <div
                className={`max-w-full md:max-w-2xl px-3 py-2 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-brand-indigo/30 text-slate-50'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={
              atLimit
                ? "You've reached your monthly limit. Upgrade to continue →"
                : 'Ask a question about your workspace…'
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-indigo disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Press Enter to send, Shift+Enter for a new line.</span>
            <button
              disabled={disabled}
              onClick={() => void send()}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet text-xs font-semibold px-4 py-1.5 disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AssistantPage;

