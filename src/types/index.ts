export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
  location?: string;
  website?: string;
  isPrivate: boolean;
  createdAt: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  isBlocked?: boolean;
  isSelf?: boolean;
}

export interface PostItem {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  isLiked?: boolean;
  isAuthor?: boolean;
}

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

export interface ConversationItem {
  id: string;
  otherUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  lastMessageText: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId: string;
  type: 'follow' | 'like' | 'comment' | 'message';
  postId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

export interface AIMessageItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface AIConversationData {
  id: string;
  userId: string;
  title: string;
  messages: AIMessageItem[];
  updatedAt: string;
}
