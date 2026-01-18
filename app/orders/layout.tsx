import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';

export default function OrdersLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 relative z-10 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
