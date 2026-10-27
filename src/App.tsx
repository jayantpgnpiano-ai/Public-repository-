/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Navigation, NavTab } from './components/Navigation';
import { FeedView } from './components/FeedView';
import { DiscoverView } from './components/DiscoverView';
import { MessagesView } from './components/MessagesView';
import { AICompanionView } from './components/AICompanionView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { X, PenSquare, Sparkles } from 'lucide-react';

function MainApp() {
  const { user, token, isLoading, demoLogin } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('feed');
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [initialMessageUser, setInitialMessageUser] = useState<{
    id: string;
    username: string;
    displayName: string;
  } | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Modal States
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Badges
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Check URL params (?autostart=1 support as per ultra-mode requirement)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !token && !user) {
      demoLogin('elena');
    }
  }, [token, user]);

  // Fetch unread badge counters
  const fetchBadges = async () => {
    if (!token) {
      setUnreadMessagesCount(0);
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const [msgRes, notifRes] = await Promise.all([
        fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (msgRes.ok) {
        const conversations = await msgRes.json();
        const unreadMsgs = conversations.reduce(
          (acc: number, c: any) => acc + (c.unreadCount || 0),
          0
        );
        setUnreadMessagesCount(unreadMsgs);
      }
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setUnreadNotificationsCount(notifData.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const handleSelectUser = (username: string) => {
    setSelectedUsername(username);
    setActiveTab('profile');
  };

  const handleOpenConversationWithUser = (target: {
    id: string;
    username: string;
    displayName: string;
  }) => {
    setInitialMessageUser(target);
    setActiveTab('messages');
  };

  const handleSelectTag = (tag: string) => {
    setActiveTagFilter(tag);
    setActiveTab('feed');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#1C1917] border-t-transparent animate-spin mx-auto" />
          <p className="font-serif-editorial text-sm text-[#78716C]">Opening Project Connect...</p>
        </div>
      </div>
    );
  }

  // If visitor is not logged in and not explicitly exploring public feed
  if (!user && !token && activeTab !== 'feed') {
    return (
      <>
        <LandingPage
          onOpenAuth={mode => {
            setAuthModalMode(mode || 'login');
            setShowAuthModal(true);
          }}
          onExplorePublic={() => setActiveTab('feed')}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col md:flex-row text-[#1C1917] antialiased">
      {/* Navigation (Sidebar on desktop, bottom bar on mobile) */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={tab => {
          if (tab === 'profile' && user) {
            setSelectedUsername(user.username);
          }
          if (tab !== 'profile') {
            setSelectedUsername(null);
          }
          setActiveTab(tab);
        }}
        onOpenCreatePost={() => {
          if (!user) {
            setShowAuthModal(true);
          } else {
            setActiveTab('feed');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenSettings={() => setShowSettingsModal(true)}
        onSelectUserProfile={handleSelectUser}
        unreadMessagesCount={unreadMessagesCount}
        unreadNotificationsCount={unreadNotificationsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen overflow-x-hidden">
        {/* Banner for guest visitors on public feed */}
        {!user && (
          <div className="bg-[#FAF8F5] border-b border-[#E8E4DC] p-3 text-center text-xs flex items-center justify-center gap-3">
            <span className="text-[#57534E]">
              You are exploring the public preview of Project Connect.
            </span>
            <button
              onClick={() => {
                setAuthModalMode('login');
                setShowAuthModal(true);
              }}
              className="px-3 py-1 rounded bg-[#2A2724] text-white text-[11px] font-medium"
            >
              Sign In / Experience Demo
            </button>
          </div>
        )}

        {/* Dynamic Views */}
        {activeTab === 'feed' && (
          <FeedView
            onSelectUser={handleSelectUser}
            activeTagFilter={activeTagFilter}
            onClearTagFilter={() => setActiveTagFilter(null)}
            onSelectTag={handleSelectTag}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverView
            onSelectUser={handleSelectUser}
            onSelectTag={handleSelectTag}
            onOpenConversationWithUser={handleOpenConversationWithUser}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesView
            initialTargetUser={initialMessageUser}
            onClearInitialTargetUser={() => setInitialMessageUser(null)}
            onSelectUser={handleSelectUser}
          />
        )}

        {activeTab === 'ai' && <AICompanionView />}

        {activeTab === 'notifications' && (
          <NotificationsView
            onSelectUser={handleSelectUser}
            onRefreshBadge={fetchBadges}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            username={selectedUsername || user?.username || 'elena'}
            onSelectUser={handleSelectUser}
            onOpenMessageWithUser={handleOpenConversationWithUser}
            onBack={() => setActiveTab('feed')}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
