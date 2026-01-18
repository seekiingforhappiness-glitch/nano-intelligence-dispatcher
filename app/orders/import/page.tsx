'use client';

import { useState, useRef } from 'react';
import { Upload, FileUp, AlertCircle, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ImportOrdersPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setStatus('idle');
        setMessage('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/orders/import', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || '上传失败');

            setStatus('success');
            setMessage(`成功导入 ${data.count} 条订单数据`);

            // Delay redirect to let user see success
            setTimeout(() => {
                router.push('/orders');
            }, 1500);

        } catch (error: any) {
            setStatus('error');
            setMessage(error.message);
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* 头部 */}
            <div className="flex items-center gap-4">
                <Link href="/orders" className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">批量导入订单</h1>
                    <p className="text-slate-400 text-sm mt-1">支持上传 Excel (.xlsx, .xls) 或 CSV 文件</p>
                </div>
            </div>

            {/* 上传区域 */}
            <div className="bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl p-8">
                <div
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer group
            ${status === 'error' ? 'border-red-500/50 bg-red-500/5' :
                            status === 'success' ? 'border-green-500/50 bg-green-500/5' :
                                'border-white/10 hover:border-primary-500/50 hover:bg-white/5'}
          `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-12 h-12 text-primary-400 animate-spin mb-4" />
                            <h3 className="text-lg font-medium text-white">正在处理数据...</h3>
                        </div>
                    ) : status === 'success' ? (
                        <div className="flex flex-col items-center">
                            <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
                            <h3 className="text-lg font-medium text-white">导入成功</h3>
                            <p className="text-slate-400 mt-2">{message}</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                <FileUp className="w-8 h-8 text-primary-400" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">点击或拖拽文件到这里上传</h3>
                            <p className="text-slate-500 text-sm mb-6">
                                支持的文件格式：.xlsx, .xls, .csv <br />
                                单次最大支持 5000 条数据
                            </p>
                            <button className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors pointer-events-none">
                                选择文件
                            </button>
                        </>
                    )}
                </div>

                {/* 错误提示 */}
                {status === 'error' && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-200 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        {message}
                    </div>
                )}

                {/* 提示信息 */}
                {status === 'idle' && (
                    <div className="mt-6 flex gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-200">
                        <AlertCircle className="w-5 h-5 shrink-0 text-blue-400" />
                        <div className="space-y-1">
                            <p className="font-medium text-blue-400">导入说明</p>
                            <p className="opacity-80">系统会自动识别表头字段（如：订单号、地址、重量、体积等），无需严格按照模板格式。如果遇到识别错误，可以在下一步进行手动映射。</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 模板下载 */}
            <div className="flex justify-end">
                <button className="text-sm text-slate-400 hover:text-white transition-colors underline">
                    下载标准导入模板
                </button>
            </div>
        </div>
    );
}
