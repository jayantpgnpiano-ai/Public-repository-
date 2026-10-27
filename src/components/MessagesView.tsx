import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ArrowLeft, Plus, Search, User } from 'lucide-react';
import { ConversationItem, DirectMessage, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../utils/social';
import { useToast } from './Toast';

interface MessagesViewProps {
  initialTargetUser?: { id: string; username: string; displayName: string } | null;
  onClearInitialTargetUser?: () => void;
  onSelectUser: (username: string) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  initialTargetUser,
  onClearInitialTargetUser,
  onSelectUser,
}) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // New conversation modal state
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [contacts, setContacts] = useState<UserProfile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  // Handle when launched with an initial target user (e.g. from Profile or Discover)
  useEffect(() => {
    if (initialTargetUser && token) {
      startConversationWithUser(initialTargetUser.id);
      onClearInitialTargetUser?.();
    }
  }, [initialTargetUser, token]);

  const startConversationWithUser = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const conv = await res.json();
        setSelectedConvId(conv.id);
        setActiveOtherUser(conv.otherUser);
        loadMessages(conv.id);
        fetchConversations();
        setShowNewModal(false);
      }
    } catch {
      showToast('Could not start conversation', 'error');
    }
  };

  const loadMessages = async (convId: string) => {
    if (!token) return;
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setActiveOtherUser(data.otherUser);
        // Refresh conversations to clear unread badge
        fetchConversations();
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConvId || !token || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch(`/api/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        fetchConversations();
      } else {
        showToast('Message sending failed', 'error');
      }
    } catch {
      showToast('Network error while sending', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const openNewMessageModal = async () => {
    setShowNewModal(true);
    try {
      const res = await fetch('/api/discover/suggested-users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-4rem)] md:h-screen p-4 md:p-6 flex flex-col">
      <div className="bg-white rounded-2xl border border-[#E8E4DC] flex-1 flex overflow-hidden shadow-xs">
        {/* Left Column: Conversations List */}
        <div
          className={`w-full md:w-80 border-r border-[#E8E4DC] flex flex-col ${
            selectedConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-[#E8E4DC] flex items-center justify-between">
            <h2 className="font-serif-editorial text-lg font-medium text-[#1C1917]">Messages</h2>
            <button
              onClick={openNewMessageModal}
              className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E8E4DC] text-[#1C1917] hover:bg-[#EFECE6] transition-colors"
              aria-label="Start new message"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="p-4 text-xs text-[#8C857B]">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="w-8 h-8 text-[#A8A29E] mx-auto mb-2" />
                <p className="text-xs text-[#78716C] mb-3">No direct dialogues yet.</p>
                <button
                  onClick={openNewMessageModal}
                  className="px-3 py-1.5 bg-[#2A2724] text-white rounded-lg text-xs font-medium"
                >
                  Start Conversation
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#F4F1EA]">
                {conversations.map(conv => {
                  const isSelected = selectedConvId === conv.id;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors ${
                        isSelected ? 'bg-[#F4F1EA]' : 'hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <img
                        src={conv.otherUser.avatarUrl}
                        alt={conv.otherUser.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-[#E0DDD5] flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-semibold text-[#1C1917] truncate">
                            {conv.otherUser.displayName}
                          </span>
                          <span className="text-[10px] text-[#8C857B]">
                            {formatTimeAgo(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-xs text-[#57534E] truncate">
                          {conv.lastMessageText || 'No messages yet'}
                        </p>
                      </div>

                      {conv.unreadCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-[#8A5F38] self-center flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation */}
        <div
          className={`flex-1 flex-col ${
            selectedConvId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConvId && activeOtherUser ? (
            <>
              {/* Header */}
              <div className="p-3.5 border-b border-[#E8E4DC] flex items-center justify-between bg-[#FAF8F5]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConvId(null)}
                    className="md:hidden p-1 text-[#78716C] hover:text-[#1C1917]"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={activeOtherUser.avatarUrl}
                    alt={activeOtherUser.displayName}
                    className="w-9 h-9 rounded-full object-cover border border-[#E0DDD5]"
                  />
                  <div>
                    <button
                      onClick={() => onSelectUser(activeOtherUser.username)}
                      className="text-sm font-semibold text-[#1C1917] hover:underline text-left block"
                    >
                      {activeOtherUser.displayName}
                    </button>
                    <div className="text-[11px] text-[#78716C]">@{activeOtherUser.username}</div>
                  </div>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]/40">
                {isLoadingMessages ? (
                  <div className="text-center py-10 text-xs text-[#8C857B]">
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-xs text-[#78716C]">
                    This is the start of your private dialogue with {activeOtherUser.displayName}.
                  </div>
                ) : (
                  messages.map(msg => {
                    const isSelf = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isSelf
                              ? 'bg-[#2A2724] text-[#FAF8F5] rounded-br-xs'
                              : 'bg-white border border-[#E8E4DC] text-[#1C1917] rounded-bl-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-[#A8A29E] mt-1 px-1">
                          {formatTimeAgo(msg.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-[#E8E4DC] bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={`Write a thoughtful message to ${activeOtherUser.displayName}...`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#2A2724]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="p-2.5 rounded-xl bg-[#2A2724] hover:bg-black text-[#FAF8F5] disabled:opacity-40 transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAF8F5]/30">
              <MessageSquare className="w-12 h-12 text-[#A8A29E] mb-3 stroke-1" />
              <h3 className="font-serif-editorial text-xl font-medium text-[#1C1917] mb-1">
                Direct Conversations
              </h3>
              <p className="text-xs text-[#78716C] max-w-sm mb-4 leading-relaxed">
                Connect in private with creators and collaborators. Select a conversation or start a new dialogue.
              </p>
              <button
                onClick={openNewMessageModal}
                className="px-4 py-2 rounded-lg bg-[#2A2724] text-[#FAF8F5] text-xs font-medium hover:bg-black transition-colors"
              >
                New Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E4DC] max-w-md w-full p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC] mb-4">
              <h3 className="font-serif-editorial text-lg font-medium text-[#1C1917]">
                New Dialogue
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-[#78716C] hover:text-[#1C1917] text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="text-xs text-[#78716C] mb-3">
              Select a creator or connection to message:
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => startConversationWithUser(c.id)}
                  className="w-full p-2.5 rounded-xl hover:bg-[#FAF8F5] border border-transparent hover:border-[#E8E4DC] flex items-center gap-3 text-left transition-colors"
                >
                  <img
                    src={c.avatarUrl}
                    alt={c.displayName}
                    className="w-9 h-9 rounded-full object-cover border border-[#E0DDD5]"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[#1C1917]">{c.displayName}</div>
                    <div className="text-xs text-[#78716C]">@{c.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
