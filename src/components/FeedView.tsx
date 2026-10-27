import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  MoreHorizontal,
  Trash2,
  Edit2,
  X,
  Send,
  Sparkles,
  Check,
  AlertCircle,
  Camera,
} from 'lucide-react';
import { PostItem, CommentItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo, extractHashtags } from '../utils/social';
import { useToast } from './Toast';

interface FeedViewProps {
  onSelectUser: (username: string) => void;
  onOpenCreateModal?: () => void;
  activeTagFilter?: string | null;
  onClearTagFilter?: () => void;
  onSelectTag?: (tag: string) => void;
}

export const FeedView: React.FC<FeedViewProps> = ({
  onSelectUser,
  activeTagFilter,
  onClearTagFilter,
  onSelectTag,
}) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [feedType, setFeedType] = useState<'all' | 'following'>('all');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New post form state
  const [newContent, setNewContent] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [showImageInput, setShowImageInput] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Comments state per post
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);

  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editImageUrl, setEditImageUrl] = useState<string>('');

  // Dropdown menu state
  const [menuOpenPostId, setMenuOpenPostId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleEditorialImages = [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000&auto=format&fit=crop&q=80',
  ];

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const url = new URL('/api/posts', window.location.origin);
      url.searchParams.set('feed', feedType);
      if (activeTagFilter) {
        url.searchParams.set('tag', activeTagFilter);
      }
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url.toString(), { headers });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [feedType, activeTagFilter, token]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    if (!token) {
      showToast('Please sign in to publish a reflection.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newContent,
          imageUrl: newImageUrl || undefined,
        }),
      });

      if (res.ok) {
        const createdPost = await res.json();
        setPosts(prev => [createdPost, ...prev]);
        setNewContent('');
        setNewImageUrl('');
        setShowImageInput(false);
        showToast('Reflection published gracefully.', 'success');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to create post', 'error');
      }
    } catch {
      showToast('Network error while publishing.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeToggle = async (postId: string) => {
    if (!token) {
      showToast('Please sign in to appreciate reflections.', 'info');
      return;
    }

    // Optimistic UI update
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const wasLiked = p.isLiked;
          return {
            ...p,
            isLiked: !wasLiked,
            likesCount: wasLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1,
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        fetchPosts(); // Rollback if server fails
      }
    } catch {
      fetchPosts();
    }
  };

  const toggleComments = async (postId: string) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
      return;
    }

    setOpenCommentsPostId(postId);
    if (!commentsMap[postId]) {
      setLoadingCommentsPostId(postId);
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setCommentsMap(prev => ({ ...prev, [postId]: data }));
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setLoadingCommentsPostId(null);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    if (!token) {
      showToast('Please sign in to reply.', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const newCom = await res.json();
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newCom],
        }));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setPosts(prev =>
          prev.map(p => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
        );
        showToast('Reply added.', 'success');
      }
    } catch {
      showToast('Failed to add reply.', 'error');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you wish to delete this reflection?')) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        showToast('Reflection removed.', 'info');
      }
    } catch {
      showToast('Failed to delete reflection.', 'error');
    }
  };

  const handleStartEdit = (post: PostItem) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setEditImageUrl(post.imageUrl || '');
    setMenuOpenPostId(null);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent, imageUrl: editImageUrl }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPosts(prev => prev.map(p => (p.id === postId ? { ...p, ...updated } : p)));
        setEditingPostId(null);
        showToast('Reflection updated.', 'success');
      }
    } catch {
      showToast('Failed to update reflection.', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        showToast('Image file should be under 4MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setNewImageUrl(String(ev.target.result));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const copyPostLink = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/#post-${postId}`);
    showToast('Reflection link copied to clipboard.', 'info');
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-24 md:pb-12">
      {/* Active Tag Filter Header */}
      {activeTagFilter && (
        <div className="mb-6 p-3 rounded-xl bg-[#F4F1EA] border border-[#E8E4DC] flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-[#1C1917]">
            <span className="text-xs uppercase font-semibold text-[#78716C]">Filtered by topic:</span>
            <span className="font-medium text-[#2A2724]">#{activeTagFilter}</span>
          </div>
          <button
            onClick={onClearTagFilter}
            className="flex items-center gap-1 text-xs text-[#78716C] hover:text-[#1C1917] font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear filter</span>
          </button>
        </div>
      )}

      {/* Feed Type Switcher (Editorial Tabs) */}
      <div className="flex items-center justify-between border-b border-[#E8E4DC] pb-3 mb-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setFeedType('all')}
            className={`text-sm tracking-tight transition-colors pb-1 relative ${
              feedType === 'all'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#1C1917]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            All Reflections
          </button>
          <button
            onClick={() => setFeedType('following')}
            className={`text-sm tracking-tight transition-colors pb-1 relative ${
              feedType === 'following'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#1C1917]'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Following
          </button>
        </div>

        <div className="text-xs text-[#8C857B] font-medium hidden sm:block">
          Newest reflections first
        </div>
      </div>

      {/* Inline Create Reflection Box (if signed in) */}
      {user && (
        <section
          aria-label="Create a reflection"
          className="bg-white rounded-xl border border-[#E8E4DC] p-4 mb-8 shadow-xs"
        >
          <form onSubmit={handleCreatePost}>
            <div className="flex gap-3">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-10 h-10 rounded-full object-cover border border-[#E0DDD5] flex-shrink-0"
              />
              <div className="flex-1">
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Share a thoughtful observation, note on craftsmanship, or question..."
                  rows={3}
                  className="w-full resize-none border-0 p-0 text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-0 text-base leading-relaxed bg-transparent"
                  maxLength={2000}
                />

                {/* Hashtag Preview */}
                {extractHashtags(newContent).length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs text-[#78716C] mt-2 mb-1">
                    <span className="font-medium text-[#A8A29E]">Tags:</span>
                    {extractHashtags(newContent).map(tag => (
                      <span key={tag} className="text-[#57534E]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Attached Image Preview */}
                {newImageUrl && (
                  <div className="relative mt-3 rounded-lg overflow-hidden border border-[#E8E4DC] max-h-72 group">
                    <img
                      src={newImageUrl}
                      alt="Attachment preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Image URL input or sample selector */}
                {showImageInput && !newImageUrl && (
                  <div className="mt-3 p-3 rounded-lg bg-[#FAF8F5] border border-[#E8E4DC] text-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="url"
                        placeholder="Paste image URL (https://...)"
                        value={newImageUrl}
                        onChange={e => setNewImageUrl(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded border border-[#D5D0C4] bg-white text-[#1C1917] focus:outline-none focus:border-[#2A2724]"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#D5D0C4] bg-white hover:bg-[#F4F1EA] text-[#57534E]"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Upload</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    <div className="text-[11px] text-[#78716C] mb-1">Or pick a curated editorial photo:</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {sampleEditorialImages.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewImageUrl(img)}
                          className="h-12 rounded overflow-hidden border border-[#E0DDD5] hover:opacity-80 transition-opacity"
                        >
                          <img src={img} alt="Sample" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Controls */}
                <div className="flex items-center justify-between border-t border-[#F0ECE1] pt-3 mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImageInput(!showImageInput)}
                      className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
                        showImageInput || newImageUrl
                          ? 'bg-[#EFECE6] text-[#1C1917]'
                          : 'text-[#78716C] hover:text-[#1C1917]'
                      }`}
                      aria-label="Add image"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-xs">Photo</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#A8A29E] font-mono">
                      {2000 - newContent.length}
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting || !newContent.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#2A2724] hover:bg-[#1C1917] disabled:opacity-40 text-[#FAF8F5] text-xs font-medium transition-all"
                    >
                      {isSubmitting ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-xl border border-[#E8E4DC] p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#EFECE6]" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-32 h-3.5 bg-[#EFECE6] rounded" />
                  <div className="w-20 h-2.5 bg-[#F4F1EA] rounded" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="w-full h-3.5 bg-[#EFECE6] rounded" />
                <div className="w-4/5 h-3.5 bg-[#EFECE6] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && posts.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E8E4DC] p-10 text-center my-6">
          <div className="w-12 h-12 rounded-full bg-[#F4F1EA] text-[#78716C] flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-serif-editorial text-xl font-medium text-[#1C1917] mb-1">
            {feedType === 'following' ? 'No reflections from connections yet' : 'Quiet horizon'}
          </h3>
          <p className="text-sm text-[#78716C] max-w-sm mx-auto mb-5 leading-relaxed">
            {feedType === 'following'
              ? 'Connect with creators in Discover or switch to "All Reflections" to view community thoughts.'
              : 'Be the first to share an observation with the community.'}
          </p>
          {feedType === 'following' && (
            <button
              onClick={() => setFeedType('all')}
              className="px-4 py-2 rounded-lg bg-[#2A2724] text-[#FAF8F5] text-xs font-medium hover:bg-black transition-colors"
            >
              Browse All Reflections
            </button>
          )}
        </div>
      )}

      {/* Post Items */}
      {!isLoading && posts.length > 0 && (
        <div className="flex flex-col gap-5">
          {posts.map(post => {
            const isEditing = editingPostId === post.id;
            const comments = commentsMap[post.id] || [];
            const isCommentsOpen = openCommentsPostId === post.id;

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white rounded-xl border border-[#E8E4DC] p-5 shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Author row & Menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onSelectUser(post.author.username)}
                      className="group flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-full"
                    >
                      <img
                        src={post.author.avatarUrl}
                        alt={post.author.displayName}
                        className="w-10 h-10 rounded-full object-cover border border-[#E0DDD5] group-hover:opacity-90"
                      />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectUser(post.author.username)}
                          className="text-sm font-semibold text-[#1C1917] hover:underline"
                        >
                          {post.author.displayName}
                        </button>
                        <span className="text-xs text-[#78716C]">@{post.author.username}</span>
                      </div>

                      {/* Clean Unboxed Metadata with Typographic Separator (Zero-Pill Discipline) */}
                      <div className="flex items-center gap-1.5 text-xs text-[#8C857B]">
                        <span>{formatTimeAgo(post.createdAt)}</span>
                        {post.updatedAt && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>edited</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu button */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id)}
                      className="p-1 rounded text-[#8C857B] hover:text-[#1C1917] hover:bg-[#F4F1EA] transition-colors"
                      aria-label="Post options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {menuOpenPostId === post.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg border border-[#E8E4DC] shadow-md py-1 z-20 text-xs">
                        {post.isAuthor ? (
                          <>
                            <button
                              onClick={() => handleStartEdit(post)}
                              className="w-full px-3 py-1.5 text-left text-[#1C1917] hover:bg-[#F4F1EA] flex items-center gap-2"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setMenuOpenPostId(null);
                                handleDeletePost(post.id);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[#8C2C1D] hover:bg-[#FDF2F0] flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setMenuOpenPostId(null);
                              showToast('Report submitted for editorial moderation.', 'info');
                            }}
                            className="w-full px-3 py-1.5 text-left text-[#78716C] hover:bg-[#F4F1EA] flex items-center gap-2"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Report post</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setMenuOpenPostId(null);
                            copyPostLink(post.id);
                          }}
                          className="w-full px-3 py-1.5 text-left text-[#1C1917] hover:bg-[#F4F1EA] flex items-center gap-2"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Copy link</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Content (or Edit View) */}
                {isEditing ? (
                  <div className="my-3 space-y-3">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 rounded-lg border border-[#D5D0C4] text-sm text-[#1C1917] focus:outline-none focus:border-[#2A2724]"
                    />
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={editImageUrl}
                      onChange={e => setEditImageUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-[#D5D0C4] text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingPostId(null)}
                        className="px-3 py-1 rounded text-xs text-[#78716C] hover:text-[#1C1917]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(post.id)}
                        className="px-3 py-1 rounded bg-[#2A2724] text-white text-xs font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-[15px] leading-relaxed text-[#2A2724] whitespace-pre-line font-normal">
                      {post.content.split(' ').map((word, i) => {
                        if (word.startsWith('#') && word.length > 1) {
                          const tag = word.slice(1).replace(/[^a-zA-Z0-9_]/g, '');
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => onSelectTag?.(tag)}
                              className="text-[#8A5F38] hover:underline font-medium inline-block mr-1 focus:outline-none"
                            >
                              {word}{' '}
                            </button>
                          );
                        }
                        return word + ' ';
                      })}
                    </p>

                    {/* Attached Image */}
                    {post.imageUrl && (
                      <div className="mt-3.5 rounded-lg overflow-hidden border border-[#E8E4DC] max-h-96 bg-[#F7F5F0]">
                        <img
                          src={post.imageUrl}
                          alt="Reflection visual"
                          className="w-full h-auto object-cover max-h-96"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Bar */}
                <div className="flex items-center justify-between border-t border-[#F0ECE1] pt-3 text-xs text-[#78716C]">
                  <div className="flex items-center gap-5">
                    {/* Like button */}
                    <button
                      onClick={() => handleLikeToggle(post.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        post.isLiked ? 'text-[#8C2C1D] font-semibold' : 'hover:text-[#1C1917]'
                      }`}
                      aria-label={`Like reflection, ${post.likesCount} likes`}
                    >
                      <Heart
                        className={`w-4 h-4 ${post.isLiked ? 'fill-[#8C2C1D] text-[#8C2C1D]' : ''}`}
                      />
                      <span>{post.likesCount}</span>
                    </button>

                    {/* Comment button */}
                    <button
                      onClick={() => toggleComments(post.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        isCommentsOpen ? 'text-[#1C1917] font-semibold' : 'hover:text-[#1C1917]'
                      }`}
                      aria-label={`Comments, ${post.commentsCount} comments`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.commentsCount}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => copyPostLink(post.id)}
                    className="hover:text-[#1C1917] transition-colors p-1"
                    aria-label="Share reflection"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Comments Section */}
                {isCommentsOpen && (
                  <div className="mt-4 pt-3 border-t border-[#F0ECE1]">
                    {/* Add Comment Input */}
                    {user ? (
                      <div className="flex gap-2 mb-3">
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-7 h-7 rounded-full object-cover border border-[#E0DDD5] flex-shrink-0"
                        />
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            placeholder="Write a thoughtful reply..."
                            value={commentInputs[post.id] || ''}
                            onChange={e =>
                              setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleAddComment(post.id);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D5D0C4] bg-[#FAF8F5] text-[#1C1917] focus:outline-none focus:border-[#2A2724]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post.id)}
                            className="px-3 py-1.5 bg-[#2A2724] text-white rounded-lg text-xs font-medium hover:bg-black transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#78716C] mb-3">
                        Please sign in to join the conversation.
                      </div>
                    )}

                    {/* Comments List */}
                    {loadingCommentsPostId === post.id ? (
                      <div className="text-xs text-[#8C857B] py-2">Loading replies...</div>
                    ) : comments.length === 0 ? (
                      <div className="text-xs text-[#8C857B] py-2 italic">
                        No replies yet. Start the conversation.
                      </div>
                    ) : (
                      <div className="space-y-3 mt-2">
                        {comments.map(c => (
                          <div key={c.id} className="flex items-start gap-2.5 text-xs">
                            <img
                              src={c.author.avatarUrl}
                              alt={c.author.displayName}
                              className="w-6 h-6 rounded-full object-cover border border-[#E0DDD5] mt-0.5"
                            />
                            <div className="flex-1 bg-[#FAF8F5] p-2.5 rounded-lg border border-[#E8E4DC]">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-[#1C1917]">
                                  {c.author.displayName}
                                </span>
                                <span className="text-[10px] text-[#8C857B]">
                                  {formatTimeAgo(c.createdAt)}
                                </span>
                              </div>
                              <p className="text-[#3E3A35] leading-relaxed">{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {/* Caught Up Marker (Mindful Social Design) */}
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F4F1EA] border border-[#E8E4DC] text-xs text-[#78716C]">
              <Check className="w-3.5 h-3.5 text-[#536958]" />
              <span>You have reached the end of recent reflections</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
