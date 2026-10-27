import React from 'react';
import {
  Home,
  Compass,
  MessageSquare,
  Sparkles,
  Bell,
  User as UserIcon,
  Settings,
  LogOut,
  PenSquare,
  Feather,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'feed' | 'discover' | 'messages' | 'ai' | 'notifications' | 'profile';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenCreatePost: () => void;
  onOpenSettings: () => void;
  onSelectUserProfile?: (username: string) => void;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  onOpenCreatePost,
  onOpenSettings,
  onSelectUserProfile,
  unreadMessagesCount,
  unreadNotificationsCount,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'feed' as NavTab, label: 'Feed', icon: Home },
    { id: 'discover' as NavTab, label: 'Discover', icon: Compass },
    {
      id: 'messages' as NavTab,
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    {
      id: 'ai' as NavTab,
      label: 'Connect AI',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'notifications' as NavTab,
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { id: 'profile' as NavTab, label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-[#E8E4DC] bg-[#FAF8F5] p-5 justify-between select-none">
        <div className="flex flex-col gap-8">
          {/* Brand Header */}
          <button
            onClick={() => onSelectTab('feed')}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-lg p-1 transition-opacity hover:opacity-85"
            aria-label="Project Connect Home"
          >
            <div className="w-9 h-9 rounded-xl bg-[#2A2724] text-[#FAF8F5] flex items-center justify-center shadow-sm">
              <Feather className="w-5 h-5 text-[#EFECE6]" />
            </div>
            <div>
              <div className="font-serif-editorial text-xl font-medium tracking-tight text-[#1C1917]">
                Project Connect
              </div>
              <div className="text-[11px] text-[#78716C] tracking-wide uppercase font-medium">
                Mindful Social
              </div>
            </div>
          </button>

          {/* Nav Items */}
          <nav className="flex flex-col gap-1" aria-label="Main navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'profile' && user && onSelectUserProfile) {
                      onSelectUserProfile(user.username);
                    }
                    onSelectTab(item.id);
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#EFECE6] text-[#1C1917] font-semibold'
                      : 'text-[#57534E] hover:bg-[#F4F1EA] hover:text-[#1C1917]'
                  }`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-[#1C1917]'
                          : item.highlight
                          ? 'text-[#8A5F38]'
                          : 'text-[#78716C]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1C1917] text-[#FAF8F5]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Primary Action Button */}
          <button
            onClick={onOpenCreatePost}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#2A2724] hover:bg-[#1C1917] text-[#FAF8F5] text-sm font-medium transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600"
          >
            <PenSquare className="w-4 h-4" />
            <span>Write Reflection</span>
          </button>
        </div>

        {/* User Footer Profile & Settings */}
        {user && (
          <div className="border-t border-[#E8E4DC] pt-4 flex flex-col gap-2">
            <div
              onClick={() => {
                if (onSelectUserProfile) onSelectUserProfile(user.username);
                onSelectTab('profile');
              }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F4F1EA] transition-colors cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (onSelectUserProfile) onSelectUserProfile(user.username);
                  onSelectTab('profile');
                }
              }}
              aria-label={`View profile for ${user.displayName}`}
            >
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-9 h-9 rounded-full object-cover border border-[#E0DDD5]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1C1917] truncate group-hover:text-black">
                  {user.displayName}
                </div>
                <div className="text-xs text-[#78716C] truncate">@{user.username}</div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-xs text-[#78716C]">
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 hover:text-[#1C1917] transition-colors py-1 px-1.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400"
                aria-label="Settings and Safety"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 hover:text-[#8C2C1D] transition-colors py-1 px-1.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8E4DC] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#2A2724] text-[#FAF8F5] flex items-center justify-center">
            <Feather className="w-4 h-4 text-[#EFECE6]" />
          </div>
          <span className="font-serif-editorial text-lg font-medium text-[#1C1917]">Project Connect</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreatePost}
            className="p-2 rounded-lg bg-[#2A2724] text-[#FAF8F5]"
            aria-label="Write a new reflection"
          >
            <PenSquare className="w-4 h-4" />
          </button>
          {user && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-[#57534E] hover:text-[#1C1917]"
              aria-label="Open settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5] border-t border-[#E8E4DC] flex items-center justify-around py-2 px-1"
        aria-label="Mobile navigation"
      >
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'profile' && user && onSelectUserProfile) {
                  onSelectUserProfile(user.username);
                }
                onSelectTab(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg relative text-xs transition-colors ${
                isActive ? 'text-[#1C1917] font-semibold' : 'text-[#78716C]'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#1C1917]' : 'text-[#78716C]'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 text-[10px] font-bold rounded-full bg-[#1C1917] text-[#FAF8F5] flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
