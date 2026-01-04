'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  uploadedFile?: {
    name: string;
    rowCount: number;
  } | null;
  onClear?: () => void;
}

export function FileUploader({
  onFileSelect,
  isLoading = false,
  uploadedFile,
  onClear,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      // 允许用户再次选择同一个文件（否则同文件二次选择不会触发 onChange）
      e.target.value = '';
    },
    [onFileSelect]
  );

  const triggerFileDialog = useCallback(() => {
    if (isLoading) return;
    fileInputRef.current?.click();
  }, [isLoading]);

  if (uploadedFile) {
    return (
      <div className="relative bg-dark-800/50 border border-primary-500/30 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-primary-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{uploadedFile.name}</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-dark-400 text-sm">
              已识别 <span className="text-primary-400">{uploadedFile.rowCount}</span> 条订单数据
            </p>
          </div>
          {onClear && (
            <button
              onClick={onClear}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-dark-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 transition-all duration-300',
        'flex flex-col items-center justify-center gap-4',
        isDragging
          ? 'border-primary-500 bg-primary-500/10'
          : 'border-dark-600 hover:border-primary-500/50 bg-dark-800/30',
        isLoading && 'opacity-50 pointer-events-none'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onClick={triggerFileDialog}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          triggerFileDialog();
        }
      }}
      aria-label="选择并上传发货计划文件"
    >
      {/* 不使用全屏透明 input 覆盖层，避免在 Chrome 中出现点击/触发异常 */}
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="sr-only"
        disabled={isLoading}
      />

      <div
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center transition-all',
          isDragging ? 'bg-primary-500/20 animate-pulse' : 'bg-dark-700'
        )}
      >
        <Upload
          className={cn(
            'w-8 h-8 transition-colors',
            isDragging ? 'text-primary-500' : 'text-dark-400'
          )}
        />
      </div>

      <div className="text-center">
        <p className="text-white font-medium">
          {isLoading ? '正在解析文件...' : '拖放文件到此处，或点击选择'}
        </p>
        <p className="text-dark-400 text-sm mt-1">
          支持 .xlsx、.xls、.csv 格式，最大 10MB
        </p>
        <div
          className="mt-4 px-4 py-2 rounded-lg bg-primary-500/80 text-dark-900 font-medium hover:bg-primary-500 transition-colors"
          aria-hidden="true"
        >
          选择文件
        </div>
      </div>
    </div>
  );
}


