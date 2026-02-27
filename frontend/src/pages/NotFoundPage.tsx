import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
      <div className="glass rounded-3xl p-6 max-w-sm w-full text-center space-y-3">
        <div className="text-5xl font-semibold">404</div>
        <div className="text-sm font-semibold">Page not found</div>
        <p className="text-xs text-slate-400">
          The page you&apos;re looking for doesn&apos;t exist. It may have been moved or deleted.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-indigo to-brand-violet text-xs font-semibold px-4 py-1.5"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

