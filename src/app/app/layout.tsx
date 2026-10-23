'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { RegentLogo } from '@/components/ui/regent-logo';
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  CheckSquare,
  BookOpen,
  FolderKanban,
  Timer,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Loader2,
} from 'lucide-react';

const navItems = [
  { label: 'Today', href: '/app', icon: LayoutDashboard, module: 'dashboard' },
  { label: 'Calendar', href: '/app/calendar', icon: CalendarDays, module: 'calendar' },
  { label: 'Habits', href: '/app/habits', icon: Target, module: 'habits' },
  { label: 'Tasks', href: '/app/tasks', icon: CheckSquare, module: 'tasks' },
  { label: 'Study', href: '/app/study', icon: BookOpen, module: 'study' },
  { label: 'Projects', href: '/app/projects', icon: FolderKanban, module: 'projects' },
  { label: 'Focus', href: '/app/focus', icon: Timer, module: 'focus' },
  { label: 'Insights', href: '/app/insights', icon: BarChart3, module: 'insights' },
  { label: 'Settings', href: '/app/settings', icon: Settings, module: 'settings' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, preferences, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-regent-obsidian flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RegentLogo variant="monogram" size="lg" />
          <Loader2 className="w-5 h-5 text-regent-gold animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const enabledModules = preferences?.enabled_modules || ['tasks', 'habits', 'calendar', 'focus', 'insights'];
  
  const filteredNav = navItems.filter((item) => {
    if (item.module === 'dashboard' || item.module === 'settings') return true;
    return enabledModules.includes(item.module);
  });

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-regent-obsidian flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col border-r border-border-subtle bg-surface-1 transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle">
          {collapsed ? (
            <RegentLogo variant="monogram" size="sm" />
          ) : (
            <RegentLogo variant="full" size="sm" />
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden regent-btn-ghost p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => {
            const isActive = item.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-regent-gold/10 text-regent-gold border border-regent-gold/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden lg:block px-3 py-2 border-t border-border-subtle">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="regent-btn-ghost w-full flex items-center justify-center py-2"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* User */}
        <div className="px-3 py-3 border-t border-border-subtle">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-regent-gold/20 flex items-center justify-center text-regent-gold text-xs font-semibold shrink-0">
              {(profile?.display_name || user.email || 'R')[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {profile?.display_name || 'User'}
                </p>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleSignOut}
                className="regent-btn-ghost p-1.5"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-border-subtle bg-regent-obsidian/90 backdrop-blur-lg">
          <button
            onClick={() => setSidebarOpen(true)}
            className="regent-btn-ghost p-1.5"
          >
            <Menu className="w-5 h-5" />
          </button>
          <RegentLogo variant="wordmark" size="sm" />
          <div className="w-8" />
        </header>

        <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
