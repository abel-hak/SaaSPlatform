import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page dark:bg-[#212121] px-4">
      <div className="card p-8 max-w-sm w-full text-center space-y-4 animate-fade-in">
        <div className="text-5xl font-bold text-slate-900 dark:text-white">404</div>
        <div className="text-base font-semibold text-slate-700 dark:text-[#d4d4d4]">Page not found</div>
        <p className="text-sm text-slate-500 dark:text-[#9a9a9a]">
          The page you're looking for doesn't exist. It may have been moved or deleted.
        </p>
        <Link to="/" className="btn-primary inline-flex text-sm py-2 px-5">
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
