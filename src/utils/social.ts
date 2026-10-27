/**
 * Pure helper and logic functions for Project Connect social platform
 */

export interface PostItem {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  tags?: string[];
}

/**
 * Extracts hashtags from post text (e.g. #minimalism, #design)
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map(tag => tag.slice(1).toLowerCase())));
}

/**
 * Formats relative or human-friendly timestamps for editorial presentation
 */
export function formatTimeAgo(isoString: string, currentTimestamp?: number): string {
  try {
    const now = currentTimestamp ?? Date.now();
    const date = new Date(isoString).getTime();
    const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;

    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'recently';
  }
}

/**
 * Filter and sort posts newest-first
 */
export function sortPostsNewestFirst(posts: PostItem[]): PostItem[] {
  return [...posts].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Simple client/server text moderation check for abusive terms
 */
export function validatePostContent(content: string): { isValid: boolean; error?: string } {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Post content cannot be empty.' };
  }
  if (trimmed.length > 2000) {
    return { isValid: false, error: 'Post exceeds maximum length of 2,000 characters.' };
  }
  return { isValid: true };
}

/**
 * Check if a user is followed in a follow relationship set
 */
export function isUserFollowed(followingIds: string[], targetUserId: string): boolean {
  return followingIds.includes(targetUserId);
}

/**
 * Search filtering for profiles and posts
 */
export function filterContentByQuery<T extends { [key: string]: any }>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(item => {
    return fields.some(field => {
      const val = item[field];
      if (typeof val === 'string') {
        return val.toLowerCase().includes(q);
      }
      if (Array.isArray(val)) {
        return val.some((v: unknown) => typeof v === 'string' && v.toLowerCase().includes(q));
      }
      return false;
    });
  });
}
