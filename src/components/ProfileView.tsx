import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Globe,
  Calendar,
  Lock,
  Edit3,
  UserCheck,
  UserPlus,
  MessageSquare,
  ShieldAlert,
  ArrowLeft,
  X,
  Camera,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { UserProfile, PostItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../utils/social';
import { useToast } from './Toast';

interface ProfileViewProps {
  username: string;
  onSelectUser: (username: string) => void;
  onOpenMessageWithUser: (user: { id: string; username: string; displayName: string }) => void;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  username,
  onSelectUser,
  onOpenMessageWithUser,
  onBack,
}) => {
  const { user: currentUser, token, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'reflections' | 'media'>('reflections');

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editLocation, setEditLocation] = useState<string>('');
  const [editWebsite, setEditWebsite] = useState<string>('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');
  const [editCoverUrl, setEditCoverUrl] = useState<string>('');
  const [editIsPrivate, setEditIsPrivate] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const curatedCovers = [
    {
      title: 'Serene Coastal',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    },
    {
      title: 'Architectural Light',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    },
    {
      title: 'Minimal Studio',
      url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80',
    },
    {
      title: 'Abstract Paper',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    },
  ];

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/users/${username}`, { headers });
      if (res.ok) {
        const userData = await res.json();
        setProfile(userData);

        // Fetch user's posts
        const postsRes = await fetch(`/api/posts?feed=user&username=${username}`, { headers });
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [username, token]);

  const handleFollowToggle = async () => {
    if (!token || !profile) {
      showToast('Please sign in to follow.', 'info');
      return;
    }

    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev =>
          prev
            ? {
                ...prev,
                isFollowing: data.isFollowing,
                followersCount: data.followersCount,
              }
            : null
        );
        showToast(
          data.isFollowing ? `Following @${profile.username}` : `Unfollowed @${profile.username}`,
          'info'
        );
      }
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const handleBlockUser = async () => {
    if (!token || !profile) return;
    if (!confirm(`Are you sure you want to block @${profile.username}?`)) return;

    try {
      const res = await fetch(`/api/users/${profile.id}/block`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev => (prev ? { ...prev, isBlocked: data.isBlocked } : null));
        showToast(data.isBlocked ? 'User blocked' : 'User unblocked', 'info');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName || '');
    setEditBio(profile.bio || '');
    setEditLocation(profile.location || '');
    setEditWebsite(profile.website || '');
    setEditAvatarUrl(profile.avatarUrl || '');
    setEditCoverUrl(profile.coverUrl || '');
    setEditIsPrivate(profile.isPrivate || false);
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    const result = await updateProfile({
      displayName: editDisplayName,
      bio: editBio,
      location: editLocation,
      website: editWebsite,
      avatarUrl: editAvatarUrl,
      coverUrl: editCoverUrl,
      isPrivate: editIsPrivate,
    });

    setIsSavingProfile(false);
    if (result.success) {
      setShowEditModal(false);
      showToast('Profile updated gracefully.', 'success');
      fetchProfileData();
    } else {
      showToast(result.error || 'Failed to update profile', 'error');
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image file should be under 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setEditCoverUrl(String(ev.target.result));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        showToast('Avatar file should be under 3MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setEditAvatarUrl(String(ev.target.result));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center text-xs text-[#8C857B]">
        <div className="w-8 h-8 rounded-full border-2 border-[#1C1917] border-t-transparent animate-spin mx-auto mb-3" />
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h3 className="font-serif-editorial text-xl font-medium text-[#1C1917] mb-2">
          Profile Not Found
        </h3>
        <p className="text-sm text-[#78716C] mb-4">The requested user does not exist.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[#2A2724] text-white rounded-lg text-xs font-medium"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  const isSelf = currentUser?.id === profile.id;
  const filteredPosts =
    activeTab === 'media' ? posts.filter(p => Boolean(p.imageUrl)) : posts;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-24 md:pb-12">
      {/* Back button */}
      {onBack && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-medium text-[#78716C] hover:text-[#1C1917] transition-colors"
            aria-label="Back to feed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Reflections</span>
          </button>
          <span className="text-xs text-[#8C857B]">@{profile.username}</span>
        </div>
      )}

      {/* Unified Profile Card (with bordered, cohesive rounded layout) */}
      <section
        aria-label="User profile card"
        className="bg-white rounded-2xl border border-[#E8E4DC] overflow-hidden shadow-xs mb-6"
      >
        {/* Cover Banner Container */}
        <div className="relative h-48 sm:h-56 md:h-60 w-full bg-[#EFECE6] overflow-hidden group">
          {profile.coverUrl ? (
            <img
              src={profile.coverUrl}
              alt="Profile cover banner"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#FAF8F5] via-[#EFECE6] to-[#E8E4DC]" />
          )}

          {/* Subtle dark gradient overlay at bottom for avatar separation */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

          {/* Change Cover Shortcut Button for profile owner */}
          {isSelf && (
            <button
              onClick={openEditModal}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-xs transition-colors"
              aria-label="Change profile cover photo"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Cover</span>
            </button>
          )}
        </div>

        {/* Profile Info & Header Details */}
        <div className="px-5 sm:px-6 pb-6 pt-0">
          {/* Avatar and Action Buttons Row */}
          <div className="flex items-end justify-between -mt-12 sm:-mt-14 md:-mt-16 mb-4">
            {/* Avatar with Ring */}
            <div className="relative group">
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-30 md:h-30 rounded-full object-cover ring-4 ring-white shadow-md bg-white border border-[#E8E4DC]"
              />
              {isSelf && (
                <button
                  onClick={openEditModal}
                  className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Update avatar"
                  aria-label="Update avatar image"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {isSelf ? (
                <button
                  onClick={openEditModal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#D5D0C4] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#1C1917] transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() =>
                      onOpenMessageWithUser({
                        id: profile.id,
                        username: profile.username,
                        displayName: profile.displayName,
                      })
                    }
                    className="p-2 rounded-xl border border-[#D5D0C4] bg-white hover:bg-[#FAF8F5] text-[#1C1917] transition-colors shadow-2xs"
                    title="Send message"
                    aria-label={`Send direct message to ${profile.displayName}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleFollowToggle}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-2xs ${
                      profile.isFollowing
                        ? 'bg-[#EFECE6] text-[#1C1917] hover:bg-[#E4E0D6]'
                        : 'bg-[#2A2724] text-white hover:bg-black'
                    }`}
                  >
                    {profile.isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleBlockUser}
                    className="p-2 text-[#A8A29E] hover:text-[#8C2C1D] transition-colors"
                    title="Block user"
                    aria-label="Block or unblock user"
                  >
                    <ShieldAlert className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Identity & Bio */}
          <div className="space-y-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif-editorial text-2xl sm:text-3xl font-medium tracking-tight text-[#1C1917]">
                  {profile.displayName}
                </h1>
                {profile.isPrivate && (
                  <span title="Private Profile">
                    <Lock className="w-3.5 h-3.5 text-[#78716C]" />
                  </span>
                )}
              </div>
              <div className="text-xs text-[#78716C] font-mono mt-0.5">@{profile.username}</div>
            </div>

            {profile.bio && (
              <p className="text-sm text-[#3E3A35] leading-relaxed max-w-xl font-normal">
                {profile.bio}
              </p>
            )}

            {/* Metadata (Location, Website, Date) */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#78716C] pt-1">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#A8A29E]" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:underline text-[#8A5F38]"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{profile.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" />
                <span>
                  Joined{' '}
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Connection Metrics (Zero-Pill Discipline) */}
            <div className="flex items-center gap-6 text-xs text-[#1C1917] pt-2 border-t border-[#F4F1EA]">
              <div>
                <span className="font-semibold">{profile.followingCount || 0}</span>{' '}
                <span className="text-[#78716C]">Following</span>
              </div>
              <div>
                <span className="font-semibold">{profile.followersCount || 0}</span>{' '}
                <span className="text-[#78716C]">Followers</span>
              </div>
              <div>
                <span className="font-semibold">{profile.postsCount || posts.length}</span>{' '}
                <span className="text-[#78716C]">Reflections</span>
              </div>
            </div>
          </div>

          {/* Integrated Profile Tabs */}
          <div className="flex items-center gap-6 border-t border-[#E8E4DC] pt-3 text-xs font-medium">
            <button
              onClick={() => setActiveTab('reflections')}
              className={`pb-1 transition-colors ${
                activeTab === 'reflections'
                  ? 'text-[#1C1917] border-b-2 border-[#1C1917] font-semibold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Reflections ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`pb-1 transition-colors ${
                activeTab === 'media'
                  ? 'text-[#1C1917] border-b-2 border-[#1C1917] font-semibold'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Media ({posts.filter(p => Boolean(p.imageUrl)).length})
            </button>
          </div>
        </div>
      </section>

      {/* User's Reflections List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E8E4DC] p-8 text-center text-xs text-[#78716C]">
            No reflections published under this tab yet.
          </div>
        ) : (
          filteredPosts.map(post => (
            <article
              key={post.id}
              className="bg-white rounded-xl border border-[#E8E4DC] p-5 shadow-xs transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between text-xs text-[#8C857B] mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1C1917]">{post.author.displayName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatTimeAgo(post.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    <span>{post.likesCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{post.commentsCount}</span>
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#2A2724] leading-relaxed mb-3 font-normal whitespace-pre-line">
                {post.content}
              </p>

              {post.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-[#E8E4DC] max-h-96 bg-[#F7F5F0]">
                  <img
                    src={post.imageUrl}
                    alt="Reflection visual"
                    className="w-full h-auto object-cover max-h-96"
                    loading="lazy"
                  />
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {/* Comprehensive Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E4DC] max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC] mb-5">
              <h3 className="font-serif-editorial text-xl font-medium text-[#1C1917]">
                Edit Profile
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-[#78716C] hover:text-[#1C1917]"
                aria-label="Close edit profile modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Cover Photo Selection / URL */}
              <div>
                <label className="block text-[#57534E] font-medium mb-1.5">
                  Cover Banner
                </label>
                {editCoverUrl && (
                  <div className="relative h-28 rounded-lg overflow-hidden border border-[#E8E4DC] mb-2 group">
                    <img
                      src={editCoverUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditCoverUrl('')}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                      aria-label="Remove cover photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="Cover photo URL (https://...)"
                    value={editCoverUrl}
                    onChange={e => setEditCoverUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#D5D0C4] text-xs text-[#1C1917] focus:outline-none focus:border-[#2A2724]"
                  />
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="px-3 py-2 rounded-lg border border-[#D5D0C4] bg-[#FAF8F5] hover:bg-[#EFECE6] text-[#57534E] flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                  <input
                    type="file"
                    ref={coverFileInputRef}
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                </div>

                {/* Preset Editorial Covers */}
                <div className="text-[11px] text-[#78716C] mb-1">Pick a curated cover banner:</div>
                <div className="grid grid-cols-4 gap-2">
                  {curatedCovers.map((cov, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditCoverUrl(cov.url)}
                      className={`h-12 rounded-lg overflow-hidden border relative ${
                        editCoverUrl === cov.url ? 'border-[#1C1917] ring-1 ring-[#1C1917]' : 'border-[#E0DDD5]'
                      }`}
                    >
                      <img src={cov.url} alt={cov.title} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Image URL & Upload */}
              <div>
                <label className="block text-[#57534E] font-medium mb-1.5">Avatar Photo</label>
                <div className="flex items-center gap-3">
                  <img
                    src={editAvatarUrl || profile.avatarUrl}
                    alt="Avatar preview"
                    className="w-12 h-12 rounded-full object-cover border border-[#E0DDD5]"
                  />
                  <div className="flex-1 flex gap-2">
                    <input
                      type="url"
                      placeholder="Avatar image URL"
                      value={editAvatarUrl}
                      onChange={e => setEditAvatarUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#D5D0C4] text-xs text-[#1C1917] focus:outline-none focus:border-[#2A2724]"
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="px-3 py-2 rounded-lg border border-[#D5D0C4] bg-[#FAF8F5] hover:bg-[#EFECE6] text-[#57534E] flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                    <input
                      type="file"
                      ref={avatarFileInputRef}
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-[#57534E] font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D5D0C4] text-sm text-[#1C1917] focus:outline-none focus:border-[#2A2724]"
                  required
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-[#57534E] font-medium mb-1">
                  Bio <span className="text-[#8C857B] font-normal">({280 - editBio.length} left)</span>
                </label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#D5D0C4] text-sm text-[#1C1917] focus:outline-none focus:border-[#2A2724] resize-none"
                  maxLength={280}
                />
              </div>

              {/* Location & Website */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={e => setEditLocation(e.target.value)}
                    placeholder="e.g. Kyoto, Japan"
                    className="w-full px-3 py-2 rounded-lg border border-[#D5D0C4] text-xs text-[#1C1917]"
                  />
                </div>
                <div>
                  <label className="block text-[#57534E] font-medium mb-1">Website</label>
                  <input
                    type="url"
                    value={editWebsite}
                    onChange={e => setEditWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D5D0C4] text-xs text-[#1C1917]"
                  />
                </div>
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalPrivateToggle"
                  checked={editIsPrivate}
                  onChange={e => setEditIsPrivate(e.target.checked)}
                  className="rounded border-[#D5D0C4] text-[#2A2724] focus:ring-0"
                />
                <label htmlFor="modalPrivateToggle" className="text-[#57534E] cursor-pointer">
                  Private Profile (only connections view reflections)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#F0ECE1]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#D5D0C4] text-[#78716C] hover:text-[#1C1917]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-lg bg-[#2A2724] text-white hover:bg-black font-medium transition-colors"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
