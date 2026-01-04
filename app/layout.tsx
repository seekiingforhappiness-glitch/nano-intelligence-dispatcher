import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '纳米智能排线助手 | 车辆智能调度系统',
  description: '一键智能排线，优化物流配送路径，降低运营成本',
  keywords: '物流调度,排线系统,车辆调度,路径优化',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {/* 背景效果 */}
        <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        {/* 主内容 */}
        <div className="relative z-10 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}


