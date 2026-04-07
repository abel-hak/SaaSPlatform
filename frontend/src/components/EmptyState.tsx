import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<Props> = ({ icon: Icon, title, description, action }) => (
  <div className="py-12 flex flex-col items-center text-center gap-2">
    <div className="empty-state-icon mb-1">
      <Icon className="w-5 h-5 text-slate-400" />
    </div>
    <p className="text-sm font-medium text-slate-700 dark:text-white">{title}</p>
    {description && <p className="text-xs text-slate-500 dark:text-[#8e8e8e] max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
