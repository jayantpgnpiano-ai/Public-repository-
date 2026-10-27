import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
  location?: string;
  website?: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  imageUrl?: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

export interface Conversation {
  id: string;
  participantIds: string[];
  updatedAt: string;
  lastMessageText?: string;
  lastMessageAt?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  type: 'follow' | 'like' | 'comment' | 'message';
  postId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  messages: AIMessage[];
  updatedAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'post' | 'user';
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  posts: Post[];
  likes: Like[];
  comments: Comment[];
  follows: Follow[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  aiConversations: AIConversation[];
  blocks: Block[];
  reports: Report[];
}

const DB_PATH = path.resolve(process.cwd(), 'data', 'db.json');

// Security helper: password hashing using scrypt
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

// In-memory store initialized with seed data
let db: DatabaseSchema = getInitialSeedData();

function getInitialSeedData(): DatabaseSchema {
  const salt1 = crypto.randomBytes(16).toString('hex');
  const hash1 = crypto.scryptSync('password123', salt1, 64).toString('hex');

  const users: User[] = [
    {
      id: 'usr_elena',
      username: 'elena',
      email: 'elena@projectconnect.app',
      passwordHash: hash1,
      salt: salt1,
      displayName: 'Elena Vance',
      bio: 'Editorial designer & art director. Crafting quiet digital spaces and typographies that breathe.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
      location: 'Copenhagen, Denmark',
      website: 'https://elenavance.design',
      isPrivate: false,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'usr_marcus',
      username: 'marcus',
      email: 'marcus@projectconnect.app',
      passwordHash: hash1,
      salt: salt1,
      displayName: 'Marcus Thorne',
      bio: 'Architect, essayist on spatial quietude. Exploring the balance between physical light and digital serenity.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
      location: 'Kyoto / London',
      website: 'https://marcusthorne.arch',
      isPrivate: false,
      createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'usr_maya',
      username: 'maya',
      email: 'maya@projectconnect.app',
      passwordHash: hash1,
      salt: salt1,
      displayName: 'Maya Lin',
      bio: 'Creative technologist & generative artist. Curious about deliberate software and human warmth.',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      location: 'Stockholm, Sweden',
      isPrivate: false,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'usr_julian',
      username: 'julian',
      email: 'julian@projectconnect.app',
      passwordHash: hash1,
      salt: salt1,
      displayName: 'Julian Croft',
      bio: 'Analog photographer, tea drinker, and collector of vintage field notebooks.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      location: 'Vancouver, BC',
      website: 'https://juliancroft.photo',
      isPrivate: false,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'usr_sophia',
      username: 'sophia',
      email: 'sophia@projectconnect.app',
      passwordHash: hash1,
      salt: salt1,
      displayName: 'Sophia Reyes',
      bio: 'Product strategist researching digital wellness, attention economies, and deliberate communication.',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
      location: 'Zurich, Switzerland',
      isPrivate: false,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ];

  const follows: Follow[] = [
    { id: 'fol_1', followerId: 'usr_elena', followingId: 'usr_marcus', createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'fol_2', followerId: 'usr_elena', followingId: 'usr_maya', createdAt: new Date(Date.now() - 18 * 86400000).toISOString() },
    { id: 'fol_3', followerId: 'usr_marcus', followingId: 'usr_elena', createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
    { id: 'fol_4', followerId: 'usr_maya', followingId: 'usr_elena', createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
    { id: 'fol_5', followerId: 'usr_julian', followingId: 'usr_marcus', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
    { id: 'fol_6', followerId: 'usr_sophia', followingId: 'usr_elena', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  ];

  const posts: Post[] = [
    {
      id: 'post_1',
      authorId: 'usr_elena',
      content: 'True luxury in modern software is silence. An interface that honors your attention rather than demanding it every second. Here is a study of a physical publication layout translated to responsive web space.',
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1000&auto=format&fit=crop&q=80',
      tags: ['minimalism', 'editorial', 'design'],
      likesCount: 14,
      commentsCount: 3,
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 'post_2',
      authorId: 'usr_marcus',
      content: 'In classical Japanese timber framing, joints are cut so precisely that no nails are required. The strength comes from the harmony of the components. Good social platforms should feel like this—held together by trust, not algorithmic panic.',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
      tags: ['architecture', 'craft', 'philosophy'],
      likesCount: 28,
      commentsCount: 5,
      createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
    {
      id: 'post_3',
      authorId: 'usr_maya',
      content: 'Experimenting with gentle AI assistants that operate like thoughtful research companions rather than chatty salesmen. When you ask a question, you want clarity and perspective, not synthetic enthusiasm.',
      tags: ['ai', 'mindfulness', 'tools'],
      likesCount: 19,
      commentsCount: 2,
      createdAt: new Date(Date.now() - 14 * 3600000).toISOString(),
    },
    {
      id: 'post_4',
      authorId: 'usr_julian',
      content: 'Early morning light on 35mm Tri-X film. The beauty of analog grain is that it does not attempt to be sterile or infinite—it accepts its own frame and imperfection.',
      imageUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1000&auto=format&fit=crop&q=80',
      tags: ['photography', 'film', 'analog'],
      likesCount: 31,
      commentsCount: 4,
      createdAt: new Date(Date.now() - 28 * 3600000).toISOString(),
    },
    {
      id: 'post_5',
      authorId: 'usr_sophia',
      content: 'We need fewer feeds that scroll endlessly and more spaces where conversations have a natural beginning, thoughtful middle, and quiet conclusion. What made your internet experience feel grounded today?',
      tags: ['digitalwellness', 'community'],
      likesCount: 22,
      commentsCount: 6,
      createdAt: new Date(Date.now() - 40 * 3600000).toISOString(),
    },
  ];

  const likes: Like[] = [
    { id: 'lik_1', postId: 'post_1', userId: 'usr_marcus', createdAt: new Date(Date.now() - 1 * 3600000).toISOString() },
    { id: 'lik_2', postId: 'post_1', userId: 'usr_maya', createdAt: new Date(Date.now() - 1 * 3600000).toISOString() },
    { id: 'lik_3', postId: 'post_2', userId: 'usr_elena', createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 'lik_4', postId: 'post_3', userId: 'usr_elena', createdAt: new Date(Date.now() - 10 * 3600000).toISOString() },
    { id: 'lik_5', postId: 'post_4', userId: 'usr_elena', createdAt: new Date(Date.now() - 20 * 3600000).toISOString() },
  ];

  const comments: Comment[] = [
    {
      id: 'com_1',
      postId: 'post_1',
      authorId: 'usr_marcus',
      content: 'The proportional balance in this editorial layout is striking, Elena. Reminds me of Tschichold’s canonical grid.',
      createdAt: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    },
    {
      id: 'com_2',
      postId: 'post_1',
      authorId: 'usr_maya',
      content: 'The subtle off-white tones prevent the stark glare of pure #FFFFFF screens. Very restful on the eyes.',
      createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    },
    {
      id: 'com_3',
      postId: 'post_2',
      authorId: 'usr_sophia',
      content: 'Kigumi woodworking! The philosophy applies so deeply to organizational psychology too.',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
  ];

  const conversations: Conversation[] = [
    {
      id: 'conv_elena_marcus',
      participantIds: ['usr_elena', 'usr_marcus'],
      updatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
      lastMessageText: 'Looking forward to the typography drafts! Send them whenever you are ready.',
      lastMessageAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: 'conv_elena_maya',
      participantIds: ['usr_elena', 'usr_maya'],
      updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      lastMessageText: 'The generative canvas runs so smoothly with the software fallback.',
      lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
  ];

  const messages: Message[] = [
    {
      id: 'msg_1',
      conversationId: 'conv_elena_marcus',
      senderId: 'usr_marcus',
      text: 'Hi Elena! I loved your note on intentional software design.',
      createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
      readBy: ['usr_marcus', 'usr_elena'],
    },
    {
      id: 'msg_2',
      conversationId: 'conv_elena_marcus',
      senderId: 'usr_elena',
      text: 'Thank you Marcus! I am preparing a few specimen pages pairing Fraunces with clean sans body text.',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      readBy: ['usr_marcus', 'usr_elena'],
    },
    {
      id: 'msg_3',
      conversationId: 'conv_elena_marcus',
      senderId: 'usr_marcus',
      text: 'Looking forward to the typography drafts! Send them whenever you are ready.',
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      readBy: ['usr_marcus'],
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'notif_1',
      recipientId: 'usr_elena',
      actorId: 'usr_marcus',
      type: 'like',
      postId: 'post_1',
      content: 'liked your post "True luxury in modern software..."',
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    },
    {
      id: 'notif_2',
      recipientId: 'usr_elena',
      actorId: 'usr_marcus',
      type: 'comment',
      postId: 'post_1',
      content: 'commented: "The proportional balance in this editorial layout..."',
      isRead: false,
      createdAt: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    },
    {
      id: 'notif_3',
      recipientId: 'usr_elena',
      actorId: 'usr_sophia',
      type: 'follow',
      content: 'started following you',
      isRead: true,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];

  const aiConversations: AIConversation[] = [
    {
      id: 'ai_conv_1',
      userId: 'usr_elena',
      title: 'Mindful Social Platform Principles',
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      messages: [
        {
          id: 'ai_m1',
          role: 'user',
          text: 'What are three core guidelines for designing a social interface that reduces cognitive fatigue?',
          timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        {
          id: 'ai_m2',
          role: 'model',
          text: 'Here are three foundational principles for low-fatigue social design:\n\n1. **Finite Consumption Horizons**: Replace bottomless infinite scroll with clear pagination or "You are caught up" milestones that allow the brain to find natural closure.\n\n2. **Quiet Metadata Architecture**: Strip loud badges, high-contrast notification counters, and pulsing indicators. Keep dates and tags unboxed with subtle typography.\n\n3. **Asynchronous Intent**: Provide deliberate composition tools rather than ephemeral pressure, encouraging thoughtful longer reflections over rapid-fire reactions.',
          timestamp: new Date(Date.now() - 1 * 86400000 + 2000).toISOString(),
        },
      ],
    },
  ];

  return {
    users,
    posts,
    likes,
    comments,
    follows,
    conversations,
    messages,
    notifications,
    aiConversations,
    blocks: [],
    reports: [],
  };
}

// Load database from file or fallback to seed
export function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && Array.isArray(parsed.users)) {
        db = parsed;
        return db;
      }
    }
  } catch (err) {
    console.warn('Could not read existing database file, using in-memory state:', err);
  }
  saveDatabase();
  return db;
}

// Save database to file
export function saveDatabase(): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist database to disk (operating in-memory):', err);
  }
}

// Get raw DB reference
export function getDb(): DatabaseSchema {
  return db;
}

// Simple in-memory session manager
const sessions = new Map<string, { userId: string; expiresAt: number }>();

export function createSession(userId: string): string {
  const token = 'tok_' + crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  sessions.set(token, { userId, expiresAt });
  return token;
}

export function verifySession(token: string): string | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.userId;
}

export function revokeSession(token: string): void {
  sessions.delete(token);
}

// Initialize on load
loadDatabase();
