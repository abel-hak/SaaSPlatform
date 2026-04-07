import React, { useEffect, useState, memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';

interface DailyPoint {
  date: string;
  queries: number;
  documents: number;
}

interface AnalyticsData {
  daily: DailyPoint[];
  total_queries: number;
  total_documents: number;
}

const formatDate = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 shadow-dialog text-xs">
      <p className="font-medium text-slate-700 dark:text-white mb-1">{formatDate(label)}</p>
      <p className="text-brand-600 dark:text-brand-400">
        {payload[0]?.value ?? 0} queries
      </p>
      <p className="text-emerald-600 dark:text-emerald-400">
        {payload[1]?.value ?? 0} documents
      </p>
    </div>
  );
};

const UsageChart: React.FC = memo(() => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AnalyticsData>('/usage/analytics')
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="skeleton h-4 w-40 mb-4" />
        <div className="skeleton h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!data || data.daily.length === 0) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Activity this month</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
            <span className="text-slate-500 dark:text-[#8e8e8e]">Queries</span>
            <span className="font-semibold text-slate-700 dark:text-white">{data.total_queries}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-500 dark:text-[#8e8e8e]">Uploads</span>
            <span className="font-semibold text-slate-700 dark:text-white">{data.total_documents}</span>
          </span>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-surface-border dark:text-[#3a3a3a]" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11 }}
              className="text-slate-400 dark:text-[#8e8e8e]"
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              className="text-slate-400 dark:text-[#8e8e8e]"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="queries"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorQueries)"
            />
            <Area
              type="monotone"
              dataKey="documents"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorDocs)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.total_queries === 0 && data.total_documents === 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-[#8e8e8e] mt-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Activity will appear here as you use Aurora.
        </div>
      )}
    </div>
  );
});

UsageChart.displayName = 'UsageChart';

export default UsageChart;
