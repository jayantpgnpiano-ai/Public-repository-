import React, { useState, useEffect } from 'react';
import { Search, Compass, UserCheck, UserPlus, Sparkles, MessageSquare } from 'lucide-react';
import { UserProfile, PostItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { formatTimeAgo } from '../utils/social';

interface DiscoverViewProps {
  onSelectUser: (username: string) => void;
  onSelectTag: (tag: string) => void;
  onOpenConversationWithUser: (user: { id: string; username: string; displayName: string }) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  onSelectUser,
  onSelectTag,
  onOpenConversationWithUser,
}) => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'people' | 'reflections' | 'tags'>('all');
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<{
    users: UserProfile[];
    posts: PostItem[];
    tags: string[];
  }>({ users: [], posts: [], tags: [] });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);

  const fetchSuggested = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/discover/suggested-users', { headers });
      if (res.ok) {
        const data = await res.json();
        setSuggestedUsers(data);
      }
    } catch (err) {
      console.error('Error fetching suggested users:', err);
    }
  };

  useEffect(() => {
    fetchSuggested();
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ users: [], posts: [], tags: [] });
        return;
      }
      setIsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/discover/search?q=${encodeURIComponent(searchQuery)}`, {
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const handleFollowToggle = async (targetUser: UserProfile) => {
    if (!token) {
      showToast('Please sign in to follow creators.', 'info');
      return;
    }

    setFollowLoadingId(targetUser.id);
    try {
      const res = await fetch(`/api/users/${targetUser.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Update suggested users
        setSuggestedUsers(prev =>
          prev.map(u => (u.id === targetUser.id ? { ...u, isFollowing: data.isFollowing } : u))
        );
        // Update search results
        setSearchResults(prev => ({
          ...prev,
          users: prev.users.map(u =>
            u.id === targetUser.id ? { ...u, isFollowing: data.isFollowing } : u
          ),
        }));
        showToast(
          data.isFollowing
            ? `Now following ${targetUser.displayName}`
            : `Unfollowed ${targetUser.displayName}`,
          'info'
        );
      }
    } catch {
      showToast('Action failed', 'error');
    } finally {
      setFollowLoadingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-24 md:pb-12">
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C857B]" />
        <input
          type="search"
          placeholder="Search by name, handle, topic (#minimalism), or reflection..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8E4DC] bg-white text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#2A2724] shadow-xs"
        />
      </div>

      {/* Segmented Filter Buttons (Interactive Filter Controls as per design rules) */}
      {searchQuery && (
        <div className="flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg mb-6 w-fit">
          {(['all', 'people', 'reflections', 'tags'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                activeFilter === tab
                  ? 'bg-white text-[#1C1917] shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Search Results Display */}
      {searchQuery ? (
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-10 text-xs text-[#8C857B]">Searching...</div>
          ) : (
            <>
              {/* Matching Tags */}
              {(activeFilter === 'all' || activeFilter === 'tags') &&
                searchResults.tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-[#78716C] uppercase tracking-wider mb-3">
                      Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {searchResults.tags.map(t => (
                        <button
                          key={t}
                          onClick={() => onSelectTag(t)}
                          className="px-3 py-1.5 bg-white border border-[#E8E4DC] hover:border-[#1C1917] rounded-lg text-xs font-medium text-[#2A2724] transition-colors"
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Matching People */}
              {(activeFilter === 'all' || activeFilter === 'people') &&
                searchResults.users.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-[#78716C] uppercase tracking-wider mb-3">
                      People
                    </h3>
                    <div className="space-y-3">
                      {searchResults.users.map(u => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-[#E8E4DC]"
                        >
                          <div
                            onClick={() => onSelectUser(u.username)}
                            className="flex items-center gap-3 cursor-pointer group flex-1"
                          >
                            <img
                              src={u.avatarUrl}
                              alt={u.displayName}
                              className="w-10 h-10 rounded-full object-cover border border-[#E0DDD5]"
                            />
                            <div>
                              <div className="text-sm font-semibold text-[#1C1917] group-hover:underline">
                                {u.displayName}
                              </div>
                              <div className="text-xs text-[#78716C]">@{u.username}</div>
                              {u.bio && (
                                <p className="text-xs text-[#57534E] line-clamp-1 mt-0.5">
                                  {u.bio}
                                </p>
                              )}
                            </div>
                          </div>

                          {user && user.id !== u.id && (
                            <button
                              onClick={() => handleFollowToggle(u)}
                              disabled={followLoadingId === u.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                u.isFollowing
                                  ? 'bg-[#EFECE6] text-[#1C1917] hover:bg-[#E4E0D6]'
                                  : 'bg-[#2A2724] text-white hover:bg-black'
                              }`}
                            >
                              {u.isFollowing ? (
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
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Matching Reflections */}
              {(activeFilter === 'all' || activeFilter === 'reflections') &&
                searchResults.posts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-[#78716C] uppercase tracking-wider mb-3">
                      Reflections
                    </h3>
                    <div className="space-y-3">
                      {searchResults.posts.map(p => (
                        <div
                          key={p.id}
                          className="p-4 bg-white rounded-xl border border-[#E8E4DC]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <button
                              onClick={() => onSelectUser(p.author.username)}
                              className="text-xs font-semibold text-[#1C1917] hover:underline"
                            >
                              {p.author.displayName}
                            </button>
                            <span className="text-[11px] text-[#8C857B]">
                              {formatTimeAgo(p.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-[#2A2724] line-clamp-3">{p.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {searchResults.users.length === 0 &&
                searchResults.posts.length === 0 &&
                searchResults.tags.length === 0 && (
                  <div className="text-center py-12 text-[#78716C] text-sm">
                    No results found for "{searchQuery}". Try exploring topics like #minimalism or #architecture.
                  </div>
                )}
            </>
          )}
        </div>
      ) : (
        /* Suggested Thinkers & Creators */
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif-editorial text-lg font-medium text-[#1C1917]">
                Curated Creators & Thinkers
              </h2>
              <p className="text-xs text-[#78716C]">
                Writers, editorial designers, and architects shaping quiet perspectives.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {suggestedUsers.map(suggested => (
              <div
                key={suggested.id}
                className="bg-white rounded-xl border border-[#E8E4DC] p-4 flex items-start justify-between gap-4 shadow-xs hover:border-[#D5D0C4] transition-all"
              >
                <div
                  onClick={() => onSelectUser(suggested.username)}
                  className="flex items-start gap-3 cursor-pointer group flex-1"
                >
                  <img
                    src={suggested.avatarUrl}
                    alt={suggested.displayName}
                    className="w-12 h-12 rounded-full object-cover border border-[#E0DDD5] flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1C1917] group-hover:underline">
                        {suggested.displayName}
                      </span>
                      <span className="text-xs text-[#78716C]">@{suggested.username}</span>
                    </div>
                    <p className="text-xs text-[#57534E] mt-1 leading-relaxed line-clamp-2">
                      {suggested.bio}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-[#8C857B] mt-2">
                      <span>{suggested.followersCount || 0} followers</span>
                      <span aria-hidden="true">·</span>
                      <span>{suggested.postsCount || 0} reflections</span>
                    </div>
                  </div>
                </div>

                {user && user.id !== suggested.id && (
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => handleFollowToggle(suggested)}
                      disabled={followLoadingId === suggested.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        suggested.isFollowing
                          ? 'bg-[#EFECE6] text-[#1C1917] hover:bg-[#E4E0D6]'
                          : 'bg-[#2A2724] text-white hover:bg-black'
                      }`}
                    >
                      {suggested.isFollowing ? (
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
                      onClick={() =>
                        onOpenConversationWithUser({
                          id: suggested.id,
                          username: suggested.username,
                          displayName: suggested.displayName,
                        })
                      }
                      className="p-1.5 rounded text-[#78716C] hover:text-[#1C1917] hover:bg-[#F4F1EA] transition-colors"
                      title="Send message"
                      aria-label={`Message ${suggested.displayName}`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
