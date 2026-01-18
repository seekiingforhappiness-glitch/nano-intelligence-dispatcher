'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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
      <Card variant="glass" className="p-6 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium tracking-wide">{uploadedFile.name}</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              已识别 <span className="text-emerald-400 font-mono font-bold mx-1">{uploadedFile.rowCount}</span> 条订单数据
            </p>
          </div>
          {onClear && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        'relative group rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden',
        'flex flex-col items-center justify-center gap-4 p-10 min-h-[240px]',
        isDragging
          ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_30px_rgba(59,130,246,0.2)]'
          : 'border-white/10 hover:border-primary/50 hover:bg-white/[0.02] bg-black/20',
        isLoading && 'opacity-50 pointer-events-none cursor-not-allowed'
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
    >
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
          'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 relative',
          isDragging ? 'bg-primary/20 scale-110' : 'bg-white/5 group-hover:bg-primary/10'
        )}
      >
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-0 transition-opacity duration-500",
          (isDragging || !isLoading) && "group-hover:opacity-100"
        )} />

        <Upload
          className={cn(
            'w-10 h-10 transition-colors duration-300 relative z-10',
            isDragging ? 'text-primary' : 'text-slate-400 group-hover:text-primary'
          )}
        />
      </div>

      <div className="text-center space-y-2 relative z-10">
        <p className="text-lg font-medium text-slate-200 group-hover:text-white transition-colors">
          {isLoading ? '正在解析数据谱...' : '点击或拖拽上传文件'}
        </p>
        <p className="text-slate-500 text-sm">
          支持 .xlsx, .xls, .csv 格式 (Max 10MB)
        </p>
      </div>

      <div className="mt-4">
        <Button
          variant={isDragging ? 'primary' : 'secondary'}
          className="pointer-events-none group-hover:scale-105"
        >
          选择文件
        </Button>
      </div>
    </div>
  );
}


