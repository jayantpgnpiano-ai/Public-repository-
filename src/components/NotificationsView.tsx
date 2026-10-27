import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, CheckCheck, MessageSquare } from 'lucide-react';
import { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../utils/social';
import { useToast } from './Toast';

interface NotificationsViewProps {
  onSelectUser: (username: string) => void;
  onRefreshBadge: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onSelectUser,
  onRefreshBadge,
}) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        onRefreshBadge();
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        onRefreshBadge();
        showToast('All notifications marked as read.', 'info');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-[#8C2C1D] fill-[#8C2C1D]" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-[#536958]" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-[#2A2724]" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-[#8A5F38]" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-24 md:pb-12">
      <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-4 mb-6">
        <div>
          <h2 className="font-serif-editorial text-xl font-medium text-[#1C1917]">
            Notifications
          </h2>
          <p className="text-xs text-[#78716C]">
            Mindful updates on your reflections and connections.
          </p>
        </div>

        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E4DC] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#1C1917] transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-xs text-[#8C857B]">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E4DC] p-10 text-center">
          <Bell className="w-8 h-8 text-[#A8A29E] mx-auto mb-2 stroke-1" />
          <h3 className="font-serif-editorial text-lg font-medium text-[#1C1917] mb-1">
            All is peaceful
          </h3>
          <p className="text-xs text-[#78716C]">
            No new activity. Enjoy the quiet focus.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-colors flex items-start gap-3.5 ${
                notif.isRead
                  ? 'bg-white border-[#E8E4DC]'
                  : 'bg-[#FDFCFA] border-[#DCD6C8] shadow-xs'
              }`}
            >
              <div className="p-2 rounded-full bg-[#FAF8F5] border border-[#E8E4DC] mt-0.5">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#2A2724]">
                  <button
                    onClick={() => onSelectUser(notif.actor.username)}
                    className="font-semibold text-[#1C1917] hover:underline"
                  >
                    {notif.actor.displayName}
                  </button>{' '}
                  <span className="text-[#57534E]">{notif.content}</span>
                </div>
                <div className="text-[11px] text-[#8C857B] mt-1">
                  {formatTimeAgo(notif.createdAt)}
                </div>
              </div>

              {!notif.isRead && (
                <span className="w-2 h-2 rounded-full bg-[#8A5F38] mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
