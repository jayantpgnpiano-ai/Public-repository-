import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import {
  getDb,
  saveDatabase,
  hashPassword,
  verifyPassword,
  createSession,
  verifySession,
  revokeSession,
  User,
  Post,
  Comment,
  Notification,
  Conversation,
  Message,
  AIConversation,
  AIMessage,
} from './db';
import { extractHashtags, validatePostContent, sortPostsNewestFirst } from '../src/utils/social';

export const apiRouter = Router();

// Middleware to extract authenticated user from Bearer token
export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: User;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  const userId = verifySession(token);
  if (userId) {
    req.userId = userId;
    const db = getDb();
    req.user = db.users.find(u => u.id === userId);
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.userId || !req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

apiRouter.use(authMiddleware);

// -------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { username, email, password, displayName } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getDb();
  if (db.users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return res.status(409).json({ error: 'Username is already taken' });
  }
  if (db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(409).json({ error: 'Email is already registered' });
  }

  const { hash, salt } = hashPassword(password);
  const newUser: User = {
    id: 'usr_' + crypto.randomBytes(8).toString('hex'),
    username: cleanUsername,
    email: email.trim().toLowerCase(),
    passwordHash: hash,
    salt,
    displayName: displayName?.trim() || cleanUsername,
    bio: '',
    avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${cleanUsername}&backgroundColor=f4f1ea`,
    isPrivate: false,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDatabase();

  const token = createSession(newUser.id);
  const { passwordHash: _, salt: __, ...userProfile } = newUser;
  return res.status(201).json({ token, user: userProfile });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username or email and password are required' });
  }

  const db = getDb();
  const idLower = identifier.trim().toLowerCase();
  const user = db.users.find(u => u.username.toLowerCase() === idLower || u.email.toLowerCase() === idLower);

  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }

  const token = createSession(user.id);
  const { passwordHash: _, salt: __, ...userProfile } = user;
  return res.json({ token, user: userProfile });
});

apiRouter.post('/auth/demo-login', (req: Request, res: Response) => {
  const { username } = req.body;
  const targetUsername = (username || 'elena').toLowerCase();
  const db = getDb();
  let user = db.users.find(u => u.username.toLowerCase() === targetUsername);

  if (!user) {
    user = db.users[0];
  }

  const token = createSession(user.id);
  const { passwordHash: _, salt: __, ...userProfile } = user;
  return res.json({ token, user: userProfile });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { passwordHash: _, salt: __, ...userProfile } = req.user!;
  const db = getDb();
  const followersCount = db.follows.filter(f => f.followingId === req.user!.id).length;
  const followingCount = db.follows.filter(f => f.followerId === req.user!.id).length;
  const postsCount = db.posts.filter(p => p.authorId === req.user!.id).length;

  return res.json({
    user: {
      ...userProfile,
      followersCount,
      followingCount,
      postsCount,
    },
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    revokeSession(authHeader.split(' ')[1]);
  }
  return res.json({ success: true });
});

apiRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  return res.json({
    message: 'If an account exists with this email, password reset instructions have been dispatched.',
  });
});

// -------------------------------------------------------------
// USER & PROFILE ROUTES
// -------------------------------------------------------------

apiRouter.get('/users/:username', (req: AuthenticatedRequest, res: Response) => {
  const username = req.params.username.toLowerCase();
  const db = getDb();
  const user = db.users.find(u => u.username.toLowerCase() === username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const followersCount = db.follows.filter(f => f.followingId === user.id).length;
  const followingCount = db.follows.filter(f => f.followerId === user.id).length;
  const postsCount = db.posts.filter(p => p.authorId === user.id).length;

  const isFollowing = req.userId
    ? db.follows.some(f => f.followerId === req.userId && f.followingId === user.id)
    : false;

  const isBlocked = req.userId
    ? db.blocks.some(b => b.blockerId === req.userId && b.blockedId === user.id)
    : false;

  const { passwordHash: _, salt: __, ...publicProfile } = user;

  return res.json({
    ...publicProfile,
    followersCount,
    followingCount,
    postsCount,
    isFollowing,
    isBlocked,
    isSelf: req.userId === user.id,
  });
});

apiRouter.put('/users/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { displayName, bio, avatarUrl, coverUrl, location, website, isPrivate } = req.body;
  const db = getDb();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (displayName !== undefined) user.displayName = displayName.trim().slice(0, 50);
  if (bio !== undefined) user.bio = bio.trim().slice(0, 280);
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl.trim();
  if (coverUrl !== undefined) user.coverUrl = coverUrl.trim();
  if (location !== undefined) user.location = location.trim().slice(0, 60);
  if (website !== undefined) user.website = website.trim().slice(0, 100);
  if (isPrivate !== undefined) user.isPrivate = Boolean(isPrivate);

  saveDatabase();
  const { passwordHash: _, salt: __, ...updated } = user;
  return res.json(updated);
});

apiRouter.post('/users/:id/block', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  if (targetId === req.userId) {
    return res.status(400).json({ error: 'Cannot block yourself' });
  }

  const db = getDb();
  const existingIndex = db.blocks.findIndex(b => b.blockerId === req.userId && b.blockedId === targetId);

  let isBlocked = false;
  if (existingIndex >= 0) {
    db.blocks.splice(existingIndex, 1);
  } else {
    db.blocks.push({
      id: 'blk_' + crypto.randomBytes(6).toString('hex'),
      blockerId: req.userId!,
      blockedId: targetId,
      createdAt: new Date().toISOString(),
    });
    // Remove follows in both directions
    db.follows = db.follows.filter(
      f => !(f.followerId === req.userId && f.followingId === targetId) &&
           !(f.followerId === targetId && f.followingId === req.userId)
    );
    isBlocked = true;
  }

  saveDatabase();
  return res.json({ isBlocked });
});

apiRouter.post('/users/:id/report', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const { reason, targetType = 'user' } = req.body;
  const db = getDb();

  db.reports.push({
    id: 'rep_' + crypto.randomBytes(6).toString('hex'),
    reporterId: req.userId!,
    targetType,
    targetId,
    reason: reason || 'Inappropriate content or behavior',
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  return res.json({ message: 'Thank you for your report. Our editorial safety team has been notified.' });
});

apiRouter.delete('/users/account', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const uid = req.userId!;

  // Cascade delete
  db.users = db.users.filter(u => u.id !== uid);
  db.posts = db.posts.filter(p => p.authorId !== uid);
  db.likes = db.likes.filter(l => l.userId !== uid);
  db.comments = db.comments.filter(c => c.authorId !== uid);
  db.follows = db.follows.filter(f => f.followerId !== uid && f.followingId !== uid);
  db.conversations = db.conversations.filter(c => !c.participantIds.includes(uid));
  db.messages = db.messages.filter(m => m.senderId !== uid);
  db.notifications = db.notifications.filter(n => n.recipientId !== uid && n.actorId !== uid);
  db.aiConversations = db.aiConversations.filter(a => a.userId !== uid);

  saveDatabase();
  return res.json({ success: true, message: 'Account and associated records deleted.' });
});

// -------------------------------------------------------------
// FOLLOW / UNFOLLOW
// -------------------------------------------------------------

apiRouter.post('/users/:id/follow', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  if (targetId === req.userId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  const db = getDb();
  const targetUser = db.users.find(u => u.id === targetId);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const followIndex = db.follows.findIndex(f => f.followerId === req.userId && f.followingId === targetId);
  let isFollowing = false;

  if (followIndex >= 0) {
    db.follows.splice(followIndex, 1);
  } else {
    db.follows.push({
      id: 'fol_' + crypto.randomBytes(6).toString('hex'),
      followerId: req.userId!,
      followingId: targetId,
      createdAt: new Date().toISOString(),
    });
    isFollowing = true;

    // Send notification
    db.notifications.push({
      id: 'notif_' + crypto.randomBytes(6).toString('hex'),
      recipientId: targetId,
      actorId: req.userId!,
      type: 'follow',
      content: 'started following your reflections',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  saveDatabase();
  const followersCount = db.follows.filter(f => f.followingId === targetId).length;
  return res.json({ isFollowing, followersCount });
});

// -------------------------------------------------------------
// POSTS ROUTES
// -------------------------------------------------------------

apiRouter.get('/posts', (req: AuthenticatedRequest, res: Response) => {
  const { feed = 'all', username, tag, search, page = '1', limit = '15' } = req.query;
  const db = getDb();

  let filtered = [...db.posts];

  // Block filter: hide posts from blocked users
  if (req.userId) {
    const blockedUserIds = db.blocks
      .filter(b => b.blockerId === req.userId || b.blockedId === req.userId)
      .map(b => (b.blockerId === req.userId ? b.blockedId : b.blockerId));
    filtered = filtered.filter(p => !blockedUserIds.includes(p.authorId));
  }

  if (feed === 'following' && req.userId) {
    const followingIds = db.follows.filter(f => f.followerId === req.userId).map(f => f.followingId);
    filtered = filtered.filter(p => followingIds.includes(p.authorId) || p.authorId === req.userId);
  } else if (feed === 'user' && username) {
    const user = db.users.find(u => u.username.toLowerCase() === String(username).toLowerCase());
    if (user) {
      filtered = filtered.filter(p => p.authorId === user.id);
    } else {
      filtered = [];
    }
  }

  if (tag) {
    const cleanTag = String(tag).toLowerCase().replace('#', '');
    filtered = filtered.filter(p => p.tags.map(t => t.toLowerCase()).includes(cleanTag));
  }

  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(p => p.content.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
  }

  const sorted = sortPostsNewestFirst(filtered);
  const pageNum = parseInt(String(page), 10) || 1;
  const limitNum = parseInt(String(limit), 10) || 15;
  const paginated = sorted.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  // Hydrate with author info and current user like status
  const hydrated = paginated.map(post => {
    const author = db.users.find(u => u.id === post.authorId);
    const isLiked = req.userId ? db.likes.some(l => l.postId === post.id && l.userId === req.userId) : false;
    const isAuthor = req.userId === post.authorId;
    return {
      ...post,
      author: author ? {
        id: author.id,
        username: author.username,
        displayName: author.displayName,
        avatarUrl: author.avatarUrl,
      } : { id: post.authorId, username: 'unknown', displayName: 'Anonymous', avatarUrl: '' },
      isLiked,
      isAuthor,
    };
  });

  return res.json({
    posts: hydrated,
    total: filtered.length,
    page: pageNum,
    hasMore: pageNum * limitNum < filtered.length,
  });
});

apiRouter.post('/posts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { content, imageUrl } = req.body;
  const validation = validatePostContent(content || '');
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  const db = getDb();
  const tags = extractHashtags(content);

  const newPost: Post = {
    id: 'post_' + crypto.randomBytes(8).toString('hex'),
    authorId: req.userId!,
    content: content.trim(),
    imageUrl: imageUrl?.trim() || undefined,
    tags,
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
  };

  db.posts.unshift(newPost);
  saveDatabase();

  return res.status(201).json({
    ...newPost,
    author: {
      id: req.user!.id,
      username: req.user!.username,
      displayName: req.user!.displayName,
      avatarUrl: req.user!.avatarUrl,
    },
    isLiked: false,
    isAuthor: true,
  });
});

apiRouter.put('/posts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const postId = req.params.id;
  const { content, imageUrl } = req.body;
  const db = getDb();
  const post = db.posts.find(p => p.id === postId);

  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.authorId !== req.userId) {
    return res.status(403).json({ error: 'You are not authorized to edit this post' });
  }

  const validation = validatePostContent(content || '');
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  post.content = content.trim();
  if (imageUrl !== undefined) post.imageUrl = imageUrl.trim() || undefined;
  post.tags = extractHashtags(content);
  post.updatedAt = new Date().toISOString();

  saveDatabase();
  return res.json(post);
});

apiRouter.delete('/posts/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const postId = req.params.id;
  const db = getDb();
  const postIndex = db.posts.findIndex(p => p.id === postId);

  if (postIndex === -1) return res.status(404).json({ error: 'Post not found' });
  const post = db.posts[postIndex];

  if (post.authorId !== req.userId) {
    return res.status(403).json({ error: 'You are not authorized to delete this post' });
  }

  db.posts.splice(postIndex, 1);
  // Cascade delete likes, comments, and post notifications
  db.likes = db.likes.filter(l => l.postId !== postId);
  db.comments = db.comments.filter(c => c.postId !== postId);
  db.notifications = db.notifications.filter(n => n.postId !== postId);

  saveDatabase();
  return res.json({ success: true, message: 'Post deleted' });
});

apiRouter.post('/posts/:id/like', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const postId = req.params.id;
  const db = getDb();
  const post = db.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existingLikeIndex = db.likes.findIndex(l => l.postId === postId && l.userId === req.userId);
  let isLiked = false;

  if (existingLikeIndex >= 0) {
    db.likes.splice(existingLikeIndex, 1);
    post.likesCount = Math.max(0, post.likesCount - 1);
  } else {
    db.likes.push({
      id: 'lik_' + crypto.randomBytes(6).toString('hex'),
      postId,
      userId: req.userId!,
      createdAt: new Date().toISOString(),
    });
    post.likesCount += 1;
    isLiked = true;

    // Send notification to author if not self
    if (post.authorId !== req.userId) {
      db.notifications.push({
        id: 'notif_' + crypto.randomBytes(6).toString('hex'),
        recipientId: post.authorId,
        actorId: req.userId!,
        type: 'like',
        postId,
        content: 'appreciated your reflection',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  saveDatabase();
  return res.json({ isLiked, likesCount: post.likesCount });
});

// -------------------------------------------------------------
// COMMENTS ROUTES
// -------------------------------------------------------------

apiRouter.get('/posts/:id/comments', (req: Request, res: Response) => {
  const postId = req.params.id;
  const db = getDb();
  const comments = db.comments
    .filter(c => c.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const hydrated = comments.map(comment => {
    const author = db.users.find(u => u.id === comment.authorId);
    return {
      ...comment,
      author: author ? {
        id: author.id,
        username: author.username,
        displayName: author.displayName,
        avatarUrl: author.avatarUrl,
      } : { id: comment.authorId, username: 'unknown', displayName: 'Anonymous', avatarUrl: '' },
    };
  });

  return res.json(hydrated);
});

apiRouter.post('/posts/:id/comments', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const postId = req.params.id;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty' });
  }

  const db = getDb();
  const post = db.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const newComment: Comment = {
    id: 'com_' + crypto.randomBytes(6).toString('hex'),
    postId,
    authorId: req.userId!,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  db.comments.push(newComment);
  post.commentsCount += 1;

  if (post.authorId !== req.userId) {
    db.notifications.push({
      id: 'notif_' + crypto.randomBytes(6).toString('hex'),
      recipientId: post.authorId,
      actorId: req.userId!,
      type: 'comment',
      postId,
      content: `replied: "${content.trim().slice(0, 50)}${content.trim().length > 50 ? '...' : ''}"`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  saveDatabase();

  return res.status(201).json({
    ...newComment,
    author: {
      id: req.user!.id,
      username: req.user!.username,
      displayName: req.user!.displayName,
      avatarUrl: req.user!.avatarUrl,
    },
  });
});

apiRouter.delete('/posts/comments/:commentId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const commentId = req.params.commentId;
  const db = getDb();
  const index = db.comments.findIndex(c => c.id === commentId);
  if (index === -1) return res.status(404).json({ error: 'Comment not found' });

  const comment = db.comments[index];
  const post = db.posts.find(p => p.id === comment.postId);

  if (comment.authorId !== req.userId && (!post || post.authorId !== req.userId)) {
    return res.status(403).json({ error: 'Not authorized to delete this comment' });
  }

  db.comments.splice(index, 1);
  if (post) {
    post.commentsCount = Math.max(0, post.commentsCount - 1);
  }

  saveDatabase();
  return res.json({ success: true });
});

// -------------------------------------------------------------
// DISCOVER & CONNECTIONS
// -------------------------------------------------------------

apiRouter.get('/discover/suggested-users', (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  let users = db.users;

  if (req.userId) {
    const followingIds = db.follows.filter(f => f.followerId === req.userId).map(f => f.followingId);
    const blockedIds = db.blocks.filter(b => b.blockerId === req.userId).map(b => b.blockedId);
    users = users.filter(u => u.id !== req.userId && !followingIds.includes(u.id) && !blockedIds.includes(u.id));
  }

  const mapped = users.slice(0, 6).map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    followersCount: db.follows.filter(f => f.followingId === u.id).length,
    postsCount: db.posts.filter(p => p.authorId === u.id).length,
    isFollowing: false,
  }));

  return res.json(mapped);
});

apiRouter.get('/discover/search', (req: AuthenticatedRequest, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const db = getDb();

  if (!q) {
    return res.json({ users: [], posts: [], tags: [] });
  }

  const matchingUsers = db.users
    .filter(u => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || u.bio.toLowerCase().includes(q))
    .slice(0, 8)
    .map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      isFollowing: req.userId ? db.follows.some(f => f.followerId === req.userId && f.followingId === u.id) : false,
    }));

  const matchingPosts = db.posts
    .filter(p => p.content.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)))
    .slice(0, 8)
    .map(post => {
      const author = db.users.find(u => u.id === post.authorId);
      return {
        ...post,
        author: author ? {
          id: author.id,
          username: author.username,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
        } : { id: post.authorId, username: 'unknown', displayName: 'Anonymous', avatarUrl: '' },
      };
    });

  // Extract unique matching tags
  const allTags = Array.from(new Set(db.posts.flatMap(p => p.tags)));
  const matchingTags = allTags.filter(t => t.toLowerCase().includes(q)).slice(0, 6);

  return res.json({
    users: matchingUsers,
    posts: matchingPosts,
    tags: matchingTags,
  });
});

// -------------------------------------------------------------
// PRIVATE MESSAGING ROUTES
// -------------------------------------------------------------

apiRouter.get('/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const userConversations = db.conversations
    .filter(c => c.participantIds.includes(req.userId!))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const formatted = userConversations.map(conv => {
    const otherParticipantId = conv.participantIds.find(id => id !== req.userId) || conv.participantIds[0];
    const otherUser = db.users.find(u => u.id === otherParticipantId);

    // Unread count
    const unreadCount = db.messages.filter(
      m => m.conversationId === conv.id && m.senderId !== req.userId && !m.readBy.includes(req.userId!)
    ).length;

    return {
      id: conv.id,
      otherUser: otherUser ? {
        id: otherUser.id,
        username: otherUser.username,
        displayName: otherUser.displayName,
        avatarUrl: otherUser.avatarUrl,
      } : { id: otherParticipantId, username: 'user', displayName: 'User', avatarUrl: '' },
      lastMessageText: conv.lastMessageText || '',
      lastMessageAt: conv.lastMessageAt || conv.updatedAt,
      unreadCount,
    };
  });

  return res.json(formatted);
});

apiRouter.post('/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  if (targetUserId === req.userId) return res.status(400).json({ error: 'Cannot message yourself' });

  const db = getDb();
  const targetUser = db.users.find(u => u.id === targetUserId);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  let conv = db.conversations.find(
    c => c.participantIds.includes(req.userId!) && c.participantIds.includes(targetUserId)
  );

  if (!conv) {
    conv = {
      id: 'conv_' + crypto.randomBytes(8).toString('hex'),
      participantIds: [req.userId!, targetUserId],
      updatedAt: new Date().toISOString(),
    };
    db.conversations.push(conv);
    saveDatabase();
  }

  return res.json({
    id: conv.id,
    otherUser: {
      id: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.displayName,
      avatarUrl: targetUser.avatarUrl,
    },
  });
});

apiRouter.get('/conversations/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const convId = req.params.id;
  const db = getDb();
  const conv = db.conversations.find(c => c.id === convId);

  if (!conv || !conv.participantIds.includes(req.userId!)) {
    return res.status(403).json({ error: 'Conversation not found or access denied' });
  }

  const messages = db.messages
    .filter(m => m.conversationId === convId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Mark messages as read by current user
  let changed = false;
  messages.forEach(m => {
    if (!m.readBy.includes(req.userId!)) {
      m.readBy.push(req.userId!);
      changed = true;
    }
  });
  if (changed) saveDatabase();

  const otherParticipantId = conv.participantIds.find(id => id !== req.userId) || conv.participantIds[0];
  const otherUser = db.users.find(u => u.id === otherParticipantId);

  return res.json({
    conversation: conv,
    otherUser: otherUser ? {
      id: otherUser.id,
      username: otherUser.username,
      displayName: otherUser.displayName,
      avatarUrl: otherUser.avatarUrl,
    } : null,
    messages,
  });
});

apiRouter.post('/conversations/:id/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const convId = req.params.id;
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text cannot be empty' });
  }

  const db = getDb();
  const conv = db.conversations.find(c => c.id === convId);
  if (!conv || !conv.participantIds.includes(req.userId!)) {
    return res.status(403).json({ error: 'Conversation not found or access denied' });
  }

  const newMsg: Message = {
    id: 'msg_' + crypto.randomBytes(8).toString('hex'),
    conversationId: convId,
    senderId: req.userId!,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    readBy: [req.userId!],
  };

  db.messages.push(newMsg);
  conv.updatedAt = newMsg.createdAt;
  conv.lastMessageText = newMsg.text;
  conv.lastMessageAt = newMsg.createdAt;

  // Send message notification to recipient
  const recipientId = conv.participantIds.find(id => id !== req.userId);
  if (recipientId) {
    db.notifications.push({
      id: 'notif_' + crypto.randomBytes(6).toString('hex'),
      recipientId,
      actorId: req.userId!,
      type: 'message',
      content: `sent you a private message: "${newMsg.text.slice(0, 40)}${newMsg.text.length > 40 ? '...' : ''}"`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  saveDatabase();
  return res.status(201).json(newMsg);
});

// -------------------------------------------------------------
// IN-APP NOTIFICATIONS
// -------------------------------------------------------------

apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const notifs = db.notifications
    .filter(n => n.recipientId === req.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  const hydrated = notifs.map(n => {
    const actor = db.users.find(u => u.id === n.actorId);
    return {
      ...n,
      actor: actor ? {
        id: actor.id,
        username: actor.username,
        displayName: actor.displayName,
        avatarUrl: actor.avatarUrl,
      } : { id: n.actorId, username: 'someone', displayName: 'A user', avatarUrl: '' },
    };
  });

  const unreadCount = db.notifications.filter(n => n.recipientId === req.userId && !n.isRead).length;

  return res.json({ notifications: hydrated, unreadCount });
});

apiRouter.post('/notifications/mark-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.body;
  const db = getDb();
  const notif = db.notifications.find(n => n.id === id && n.recipientId === req.userId);
  if (notif) {
    notif.isRead = true;
    saveDatabase();
  }
  return res.json({ success: true });
});

apiRouter.post('/notifications/mark-all-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  db.notifications.forEach(n => {
    if (n.recipientId === req.userId) {
      n.isRead = true;
    }
  });
  saveDatabase();
  return res.json({ success: true });
});

// -------------------------------------------------------------
// PERSONAL AI COMPANION
// -------------------------------------------------------------

apiRouter.get('/ai/conversations', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  let aiConv = db.aiConversations.find(a => a.userId === req.userId);
  if (!aiConv) {
    aiConv = {
      id: 'ai_conv_' + crypto.randomBytes(6).toString('hex'),
      userId: req.userId!,
      title: 'Companion Dialogue',
      messages: [
        {
          id: 'ai_init',
          role: 'model',
          text: `Welcome to your personal space, ${req.user!.displayName}. I am your thinking companion on Project Connect. Whether you want to reflect on an idea, refine a written piece, explore architectural minimalism, or untangle a complex topic—what is on your mind today?`,
          timestamp: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    db.aiConversations.push(aiConv);
    saveDatabase();
  }

  return res.json(aiConv);
});

apiRouter.post('/ai/companion', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const db = getDb();
  let aiConv = db.aiConversations.find(a => a.userId === req.userId);
  if (!aiConv) {
    aiConv = {
      id: 'ai_conv_' + crypto.randomBytes(6).toString('hex'),
      userId: req.userId!,
      title: 'Companion Dialogue',
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    db.aiConversations.push(aiConv);
  }

  const userMsg: AIMessage = {
    id: 'aim_' + crypto.randomBytes(6).toString('hex'),
    role: 'user',
    text: message.trim(),
    timestamp: new Date().toISOString(),
  };
  aiConv.messages.push(userMsg);

  // System instruction for the personal AI companion
  const systemInstruction = `You are "Connect AI", an editorial, intellectually grounded, and deeply thoughtful personal companion on Project Connect—a mindful, modern social platform.
The user you are conversing with is ${req.user!.displayName} (@${req.user!.username}).
Tone guidelines:
- Calm, articulate, concise, and authentic. Avoid corporate cheerleading, empty sycophancy, or robotic bullet spam.
- Write with warm editorial clarity inspired by literary essays, thoughtful dialogue, and deep work principles.
- Help the user with: brainstorming post drafts, refining ideas, thinking through design/architecture/minimalism, exploring books and philosophy, or finding quiet focus.
- Format responses cleanly with brief paragraphs and subtle markdown when useful. Never use fake scoreboards or buzzword slogans.`;

  let replyText = '';

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Prepare context from recent chat messages
      const recentHistory = aiConv.messages.slice(-8);
      const conversationContents = recentHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const result = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: conversationContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      replyText = result.text || 'I reflected on that, but could not produce a text output.';
    } else {
      // Graceful fallback when GEMINI_API_KEY is not configured
      replyText = getReflectiveFallback(message.trim(), req.user!.displayName);
    }
  } catch (err: any) {
    console.error('Gemini companion error:', err?.message || err);
    // Provide a graceful, elegant fallback response
    replyText = getReflectiveFallback(message.trim(), req.user!.displayName);
  }

  const modelMsg: AIMessage = {
    id: 'aim_' + crypto.randomBytes(6).toString('hex'),
    role: 'model',
    text: replyText,
    timestamp: new Date().toISOString(),
  };

  aiConv.messages.push(modelMsg);
  aiConv.updatedAt = new Date().toISOString();
  saveDatabase();

  return res.json({ message: modelMsg });
});

apiRouter.post('/ai/conversations/clear', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const conv = db.aiConversations.find(a => a.userId === req.userId);
  if (conv) {
    conv.messages = [
      {
        id: 'aim_reset',
        role: 'model',
        text: `A clean slate, ${req.user!.displayName}. What shall we explore together next?`,
        timestamp: new Date().toISOString(),
      },
    ];
    conv.updatedAt = new Date().toISOString();
    saveDatabase();
  }
  return res.json({ success: true, conversation: conv });
});

// Helper for graceful fallback reflections
function getReflectiveFallback(query: string, name: string): string {
  const lower = query.toLowerCase();

  if (lower.includes('post') || lower.includes('write') || lower.includes('draft')) {
    return `Here is a perspective for your draft, ${name}:\n\nFocus on the single observation that surprised you first. When we write for deliberate platforms, clarity outlasts cleverness.\n\n*Suggested opening:* "Often we mistake activity for progress. The most enduring work happens when we remove the noise and leave space for the core idea to speak for itself."\n\nHow does this resonance feel with what you had in mind?`;
  }

  if (lower.includes('design') || lower.includes('minimal') || lower.includes('quiet')) {
    return `Minimalism in digital spaces isn't the absence of elements, but the absence of distraction.\n\nWhen every border is delicate (#E8E4DC), typography is given generous breath, and actions are intentional, users feel respected rather than harvested.\n\nWhat specific interface or ritual are you currently refining?`;
  }

  return `That is a compelling thought, ${name}. Deliberate reflection asks us to consider not just the immediate answer, but the underlying intention.\n\nIf you peel back one layer of this question: what outcome would bring the greatest sense of calm and clarity to your current work?`;
}
