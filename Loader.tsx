import React from 'react';

interface LoaderProps {
  progress?: number;
  statusText?: string;
}

export const Loader: React.FC<LoaderProps> = ({ progress, statusText }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center text-slate-300">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            className="text-slate-700"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
          />
          <circle
            className="text-cyan-400"
            strokeWidth="8"
            strokeDasharray={251.2}
            strokeDashoffset={251.2 - (progress || 0) / 100 * 251.2}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
            {progress !== undefined ? `${progress}%` : ''}
        </span>
      </div>
      {statusText && <p className="mt-4 text-sm font-medium">{statusText}</p>}
    </div>
  );
};