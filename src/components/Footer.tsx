import React from 'react';

interface FooterProps {
  extraBottomPadding?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ extraBottomPadding = false }) => {
  return (
    <footer
      className={`mt-auto w-full border-t border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/80 print:hidden ${
        extraBottomPadding ? 'pb-20 lg:pb-0' : ''
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3.5 text-center sm:flex-row sm:px-6 sm:text-left">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Designed &amp; Developed by{' '}
          <span className="font-extrabold tracking-wide text-sky-700 dark:text-sky-400">
            PAPHANGKON
          </span>
        </p>

        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Built with{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Google AI Studio
          </span>
        </p>
      </div>
    </footer>
  );
};
