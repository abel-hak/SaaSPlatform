import React, { useEffect, useRef, useState } from 'react';
import { Plus, Send, MessageSquare, Lock, Loader2, AlertCircle, Bot, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, PlanName } from '../lib/api';
import { usePlan } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Conversation {
  id: string;
  title: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: unknown[];
  error?: boolean;
}
const preprocessContent = (content: string) => {
  // Convert [Source 1] to a special link format that ReactMarkdown can render via custom component
  return content.replace(/\[Source\s*(\d+)\]/gi, '[$1](#source-$1)');
};

const AssistantPage: React.FC = () => {
  const plan = usePlan() as PlanName | null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canUseHistory = plan === 'pro' || plan === 'enterprise';

  useEffect(() => {
    if (!canUseHistory) return;
    api.get('/assistant/conversations')
      .then((r) => setConversations(r.data.conversations))
      .catch(() => {});
  }, [canUseHistory]);

  const loadConversationMessages = async (convId: string) => {
    setSelected(convId);
    setMessages([]);
    try {
      const res = await api.get(`/assistant/conversations/${convId}/messages`);
      const fetched: ChatMessage[] = res.data.messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
        role: m.role,
        content: m.content,
      }));
      setMessages(fetched);
    } catch {
      toast.error('Could not load conversation messages.');
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading || atLimit) return;
    const question = input.trim();
    setInput('');
    const existing: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(existing);
    setLoading(true);

    try {
      const body: Record<string, unknown> = { message: question };
      if (canUseHistory && selected) body.conversation_id = selected;

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/assistant/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (res.status === 429) {
        const data = await res.json();
        setAtLimit(true);
        toast.error(data.detail ?? 'You have reached your monthly AI query limit.');
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        setMessages([...existing, { role: 'assistant', content: 'Unable to reach assistant. Please try again.', error: true }]);
        setLoading(false);
        return;
      }

      // SSE streaming — buffer-based parser
      // Trim each token with .trimEnd() to strip \r from Windows-style chunked HTTP
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';
      let receivedAnyToken = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const rawLine of lines) {
            const line = rawLine.trimEnd(); // strips \r and trailing spaces
            if (!line.startsWith('data: ')) continue;
            const token = line.slice(6);
            if (!token || token === '[DONE]') continue;

            receivedAnyToken = true;
            setMessages((prev) => {
              const base = [...existing];
              const last = prev[prev.length - 1];
              if (!last || last.role !== 'assistant') {
                return [...base, { role: 'assistant', content: token }];
              }
              return [...prev.slice(0, -1), { ...last, content: last.content + token }];
            });
          }
        }
      }

      // If Groq timed out, we got 200 but no tokens
      if (!receivedAnyToken) {
        setMessages([
          ...existing,
          {
            role: 'assistant',
            content: 'The AI service timed out. This is usually a temporary network issue — please try again in a moment.',
            error: true,
          },
        ]);
      }

      // Refresh conversation list after a new message
      if (canUseHistory) {
        api.get('/assistant/conversations')
          .then((r) => setConversations(r.data.conversations))
          .catch(() => {});
      }
    } catch {
      setMessages([
        ...existing,
        { role: 'assistant', content: 'Something went wrong. Please try again.', error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
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
    textareaRef.current?.focus();
  };

  return (
    <div className="flex gap-5" style={{ height: 'calc(100vh - 8rem)' }}>

      {/* ── Sidebar: Conversations ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col card overflow-hidden">
        <div className="flex items-center justify-between px-3 py-3 border-b border-surface-border">
          <span className="text-xs font-semibold text-slate-700 dark:text-[#d4d4d4]">Conversations</span>
          {canUseHistory ? (
            <button
              onClick={newConversation}
              className="btn-ghost p-1 rounded text-slate-500"
              title="New conversation"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link to="/app/billing" className="badge-brand text-[10px] px-1.5 py-0.5">Pro+</Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {canUseHistory ? (
            conversations.length > 0 ? (
                              <div className="space-y-0.5">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => void loadConversationMessages(c.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors truncate ${
                      selected === c.id
                        ? 'bg-brand-50 dark:bg-[#383838] text-brand-700 dark:text-white font-medium'
                        : 'text-slate-600 dark:text-[#b0b0b0] hover:bg-surface-subtle dark:hover:bg-[#2f2f2f]'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-3 gap-2">
                <MessageSquare className="w-5 h-5 text-slate-300" />
                <p className="text-xs text-slate-400">No conversations yet.</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-3 gap-3">
              <Lock className="w-5 h-5 text-slate-300" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Upgrade to Pro to unlock conversation history.
              </p>
              <Link to="/app/billing" className="btn-primary text-xs py-1.5 px-3">
                Upgrade
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <section className="flex-1 flex flex-col card overflow-hidden min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Ask Aurora</h1>
            <p className="text-xs text-slate-400 dark:text-[#8e8e8e]">Answers grounded in your organization's documents.</p>
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
              Thinking…
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-brand-50 dark:bg-[#383838] flex items-center justify-center">
                <Bot className="w-7 h-7 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-white">How can I help?</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Ask about your uploaded documents, product decisions, or anything your team has shared.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {['Summarize recent documents', 'What APIs are available?', 'Explain this architecture'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-surface-border dark:border-[#424242] bg-white dark:bg-[#383838] text-slate-600 dark:text-[#d4d4d4] hover:border-brand-300 hover:text-brand-700 dark:hover:text-white transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white'
                  : m.error
                    ? 'bg-red-100 text-red-500'
                    : 'bg-surface-subtle dark:bg-[#383838] border border-surface-border dark:border-[#424242] text-slate-500 dark:text-[#b0b0b0]'
              }`}>
                {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : m.error ? <AlertCircle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-sm'
                  : m.error
                    ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-sm'
                    : 'bg-surface-subtle dark:bg-[#2f2f2f] border border-surface-border dark:border-[#424242] text-slate-800 dark:text-[#ececec] rounded-tl-sm'
              }`}>
                <div className={`break-words ${m.role === 'assistant' ? 'prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#212121] prose-pre:border prose-pre:border-[#424242]' : 'whitespace-pre-wrap'}`}>
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => {
                          if (props.href?.startsWith('#source-')) {
                            const num = props.href.replace('#source-', '');
                            return (
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[10px] font-bold leading-none text-brand-700 dark:text-brand-300 bg-brand-100/80 dark:bg-brand-900/30 rounded select-none shadow-sm border border-brand-200 dark:border-brand-800 align-text-bottom cursor-pointer" title={`Source Document ${num}`}>
                                {num}
                              </span>
                            );
                          }
                          return <a {...props} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline" />;
                        }
                      }}
                    >
                      {preprocessContent(m.content)}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-surface-subtle dark:bg-[#383838] border border-surface-border dark:border-[#424242] flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-subtle dark:bg-[#2f2f2f] border border-surface-border dark:border-[#424242]">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-surface-border dark:border-[#424242]">
          {atLimit && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Monthly AI query limit reached.</span>
              <Link to="/app/billing" className="font-semibold underline ml-auto">Upgrade →</Link>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={onKeyDown}
              disabled={loading || atLimit}
              placeholder={atLimit ? 'Upgrade to continue chatting →' : 'Ask a question about your workspace…'}
              className="input flex-1 resize-none overflow-hidden leading-relaxed"
              style={{ minHeight: '42px' }}
            />
            <button
              disabled={loading || atLimit || !input.trim()}
              onClick={() => void send()}
              className="btn-primary px-3 py-2.5 flex-shrink-0"
              title="Send (Enter)"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-[#8e8e8e] mt-2">Press Enter to send · Shift+Enter for a new line</p>
        </div>
      </section>
    </div>
  );
};

export default AssistantPage;
