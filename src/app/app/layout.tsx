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
  ChevronDown,
  Loader2,
  Sparkles,
  Bell,
  Plus,
} from 'lucide-react';
import { AmbientAtmosphere } from '@/components/ui/ambient-atmosphere';

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
    } else if (!loading && user && profile && profile.onboarding_completed === false) {
      router.push('/onboarding');
    }
  }, [user, profile, loading, router]);

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
    <div className="min-h-screen bg-regent-obsidian flex relative overflow-x-hidden">
      {/* Ambient champagne-gold atmosphere with curved cinematic waves */}
      <AmbientAtmosphere />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col border-r border-[#26241E]/90 bg-[#0A0B09]/95 backdrop-blur-2xl transition-all duration-300 shadow-[4px_0_30px_rgba(0,0,0,0.8),2px_0_18px_-3px_rgba(194,168,120,0.08)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border-subtle/80 bg-surface-1/40">
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
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5">
          {filteredNav.map((item) => {
            const isActive = item.href === '/app'
              ? pathname === '/app'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-regent-gold/25 via-regent-gold/15 to-regent-gold/5 text-regent-gold border border-regent-gold/35 shadow-sm shadow-regent-gold/15 font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/60 border border-transparent'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden lg:block px-3 py-2 border-t border-border-subtle/80 bg-surface-1/30">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="regent-btn-ghost w-full flex items-center justify-center py-2"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* User */}
        <div className="px-4 py-3.5 border-t border-border-subtle/80 bg-surface-1/40">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-surface-2 border border-border-default/80 flex items-center justify-center text-text-primary text-xs font-semibold shrink-0 shadow-inner">
              {(profile?.display_name || user.email || 'N')[0].toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">
                  {profile?.display_name || user?.email?.split('@')[0] || 'navadeep justin'}
                </p>
                <p className="text-[11px] text-text-muted truncate">{user.email}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleSignOut}
                className="regent-btn-ghost p-1.5 text-text-muted hover:text-regent-ivory"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen relative z-10 flex flex-col">
        {/* Desktop Top Header Bar (matches demo image top-right controls) */}
        <header className="hidden lg:flex items-center justify-end px-8 py-4 gap-3 border-b border-border-subtle/30 bg-transparent">
          <button
            className="w-8 h-8 rounded-full bg-surface-2/80 border border-border-subtle/80 hover:border-regent-gold/40 flex items-center justify-center text-text-muted hover:text-regent-gold transition-colors shadow-sm"
            title="Theme Mode"
            aria-label="Theme Mode"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            className="w-8 h-8 rounded-full bg-surface-2/80 border border-border-subtle/80 hover:border-regent-gold/40 flex items-center justify-center text-text-muted hover:text-regent-gold transition-colors shadow-sm"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/app/tasks"
            onClick={(e) => {
              if (pathname === '/app') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('regent:open-task-modal'));
              }
            }}
            className="regent-btn regent-btn-primary px-3.5 py-1.5 text-xs font-medium gap-1.5 shadow-sm shadow-regent-gold/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </Link>
          <div className="flex items-center gap-1.5 pl-1 text-xs text-text-primary cursor-default">
            <div className="w-8 h-8 rounded-full bg-surface-2 border border-border-default/80 flex items-center justify-center text-xs font-semibold shadow-inner">
              {(profile?.display_name || user.email || 'N')[0].toUpperCase()}
            </div>
            <ChevronDown className="w-3 h-3 text-text-muted" />
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-border-subtle/80 bg-regent-obsidian/90 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="regent-btn-ghost p-1.5"
          >
            <Menu className="w-5 h-5" />
          </button>
          <RegentLogo variant="wordmark" size="sm" />
          <div className="w-8" />
        </header>

        <div className="p-6 md:p-8 lg:p-10 max-w-7xl w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
