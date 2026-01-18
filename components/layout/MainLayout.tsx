'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface MainLayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    topbar: React.ReactNode;
}

export function MainLayout({ children, sidebar, topbar }: MainLayoutProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Handle responsive behavior
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth < 1024) {
                setIsSidebarCollapsed(true);
            }
        };

        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-secondary/5 rounded-full blur-[100px] mix-blend-screen" />
            </div>

            {/* Sidebar Area */}
            <aside
                className={`
          relative z-30 transition-all duration-300 ease-in-out border-r border-border/50
          ${isSidebarCollapsed ? 'w-20' : 'w-72'}
          ${isMobile ? 'fixed inset-y-0 left-0 bg-background/95 backdrop-blur-xl shadow-2xl skew-x-0' : 'hidden lg:block'}
        `}
            >
                {sidebar}
            </aside>

            {/* Main Content Area */}
            <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
                {/* TopBar Area */}
                <header className="h-16 flex-shrink-0 z-20 px-6 flex items-center justify-between">
                    <div className="flex-1">
                        {topbar}
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
                    <div className="max-w-[1920px] mx-auto min-h-full">
                        {children}
                    </div>
                </div>

                {/* Footer Area (Optional) */}
                <footer className="py-2 px-6 text-xs text-slate-500 text-center bg-transparent">
                    <span className="opacity-50">NANO INTELLIGENCE DISPATCH SYSTEM v2.0</span>
                </footer>
            </main>
        </div>
    );
}
