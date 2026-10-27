import React, { useState } from 'react';
import { X, Shield, Lock, Trash2, LogOut, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, token, logout, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'account' | 'privacy' | 'safety'>('account');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>('');

  if (!isOpen || !user) return null;

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user.username) {
      showToast(`Please type "${user.username}" to confirm account deletion.`, 'error');
      return;
    }

    try {
      const res = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Your account and records have been deleted.', 'info');
        logout();
        onClose();
      }
    } catch {
      showToast('Account deletion failed.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#E8E4DC] max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#E8E4DC] flex items-center justify-between bg-[#FAF8F5]">
          <h2 className="font-serif-editorial text-xl font-medium text-[#1C1917]">
            Settings & Safety
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#78716C] hover:text-[#1C1917]"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#E8E4DC] px-4 bg-[#FAF8F5]">
          {[
            { id: 'account', label: 'Account' },
            { id: 'privacy', label: 'Privacy' },
            { id: 'safety', label: 'Safety & Moderation' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1C1917] text-[#1C1917] font-semibold'
                  : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          {activeTab === 'account' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-[#1C1917] mb-1">Account Information</h3>
                <p className="text-xs text-[#78716C]">
                  Basic credentials for your Project Connect presence.
                </p>
              </div>

              <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8E4DC] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#78716C]">Handle:</span>
                  <span className="font-medium text-[#1C1917]">@{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78716C]">Email:</span>
                  <span className="font-medium text-[#1C1917]">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78716C]">Display Name:</span>
                  <span className="font-medium text-[#1C1917]">{user.displayName}</span>
                </div>
              </div>

              <div className="border-t border-[#F0ECE1] pt-4">
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E8E4DC] text-xs font-medium text-[#57534E] hover:text-[#8C2C1D] hover:bg-[#FDF2F0] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out of this session</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-[#1C1917] mb-1">Privacy & Reflection Visibility</h3>
                <p className="text-xs text-[#78716C]">
                  Control how your thoughts are discovered across the network.
                </p>
              </div>

              <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E8E4DC] space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[#1C1917]">
                      Private Reflections
                    </div>
                    <div className="text-[12px] text-[#57534E] mt-0.5">
                      When enabled, only people who follow you can view your profile and reflections.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={user.isPrivate}
                    onChange={async e => {
                      await updateProfile({ isPrivate: e.target.checked });
                      showToast(
                        e.target.checked
                          ? 'Profile is now private.'
                          : 'Profile is now public.',
                        'info'
                      );
                    }}
                    className="rounded border-[#D5D0C4] text-[#2A2724] mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-[#1C1917] mb-1">Editorial Safety Guidelines</h3>
                <p className="text-xs text-[#78716C]">
                  Project Connect is dedicated to respectful discourse and quiet reflection.
                </p>
              </div>

              <div className="space-y-3 text-xs text-[#57534E] bg-[#FAF8F5] p-4 rounded-xl border border-[#E8E4DC]">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#536958] flex-shrink-0 mt-0.5" />
                  <span>Harassment, abusive language, and non-consensual sharing are strictly prohibited.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#536958] flex-shrink-0 mt-0.5" />
                  <span>You can block any user or report inappropriate reflections at any time.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#536958] flex-shrink-0 mt-0.5" />
                  <span>Your interactions with Connect AI are completely private to your account.</span>
                </div>
              </div>

              {/* Danger Zone: Delete Account */}
              <div className="border-t border-[#F0ECE1] pt-4">
                <div className="text-xs font-semibold text-[#8C2C1D] mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Danger Zone: Delete Account</span>
                </div>
                <p className="text-xs text-[#78716C] mb-3">
                  Permanently erase your reflections, connections, messages, and AI companion history.
                </p>

                {isDeleting ? (
                  <div className="p-3 bg-[#FDF2F0] border border-[#F5C2B8] rounded-xl space-y-2">
                    <p className="text-xs text-[#8C2C1D]">
                      Type your username <span className="font-bold">"{user.username}"</span> to confirm permanent deletion:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={e => setDeleteConfirmation(e.target.value)}
                      placeholder={user.username}
                      className="w-full px-3 py-1.5 rounded border border-[#E8A598] text-xs bg-white text-[#1C1917]"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setIsDeleting(false)}
                        className="px-3 py-1 rounded text-xs text-[#57534E]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        className="px-3 py-1 bg-[#8C2C1D] text-white rounded text-xs font-medium hover:bg-[#6D2216]"
                      >
                        Permanently Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsDeleting(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F5C2B8] bg-[#FDF2F0] text-xs font-medium text-[#8C2C1D] hover:bg-[#F9DDD7] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete My Account</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
