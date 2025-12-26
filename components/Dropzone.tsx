/// <reference lib="dom" />
import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from '../Icons';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  accept?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, disabled, accept }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect, disabled]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.currentTarget.files && e.currentTarget.files.length > 0) {
      onFileSelect(e.currentTarget.files[0]);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const dragClass = isDragging 
    ? 'border-cyan-400 bg-slate-700/80 scale-105' 
    : 'border-slate-600 bg-slate-700/50';

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`flex flex-col items-center justify-center w-full min-h-[30rem] border-2 border-dashed ${dragClass} rounded-lg ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} transition-all duration-300`}
      aria-disabled={disabled}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
        <UploadIcon className={`w-10 h-10 mb-3 text-slate-400 transition-transform duration-300 ${isDragging ? 'transform -translate-y-1' : ''}`} />
        <p className="mb-2 text-sm text-slate-400">
          <span className="font-semibold text-cyan-400">クリックしてアップロード</span>、またはドラッグ＆ドロップ
        </p>
        <p className="text-xs text-slate-500">動画または画像ファイル (MP4, JPG, PNG など)</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept || "video/*,image/*"}
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  );
};