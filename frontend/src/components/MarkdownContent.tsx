import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

const MarkdownContent: React.FC<Props> = memo(({ content }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-li:my-0.5 prose-pre:bg-slate-100 prose-pre:dark:bg-[#1e1e1e] prose-code:text-brand-600 prose-code:dark:text-brand-400 prose-code:before:content-none prose-code:after:content-none">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
));

MarkdownContent.displayName = 'MarkdownContent';

export default MarkdownContent;
