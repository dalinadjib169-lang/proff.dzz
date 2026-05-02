import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  photoURL: string;
  bio?: string;
  subject?: string;
  school?: string;
  wilaya?: string;
  level?: string;
  yearsOfExperience?: number;
  role?: string;
  rank?: string;
  gender?: string;
  phoneNumber?: string;
  birthDate?: string;
  isProfileComplete?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  followers?: string[];
  following?: string[];
  friends?: string[];
  blockedUsers?: string[];
  bioBackground?: string;
  bioTextColor?: string;
  appBackground?: string;
  lastSeen?: Timestamp | any;
  createdAt: Timestamp | any;
  premiumUntil?: Timestamp | any;
  isActivated?: boolean;
  lastGenerationDate?: Timestamp | any;
  lastUsageResetDate?: Timestamp | any;
  dailyGenCount?: number;
  dailyCorrectCount?: number;
  usage?: {
    generate: number;
    correct: number;
    image: number;
    translate: number;
    lastUsed: string;
  };
  savedPreferences?: SavedPreferences;
  settings?: UserSettings;
  reminders?: {
    prayer?: boolean;
    water?: boolean;
    exercise?: boolean;
    exerciseDays?: number;
    waterGoal?: number;
    waterCurrent?: number;
    waterGlassCount?: number;
    lastWaterReset?: Timestamp | any;
  };
}

export interface UserSettings {
  language: 'en' | 'ar' | 'fr';
  theme: 'light' | 'dark';
  themeColor?: 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'glass' | 'transparent';
  textColor?: string;
  fontSize: 'small' | 'medium' | 'large';
  fontType: 'sans' | 'serif' | 'mono';
  defaultPostPrivacy: 'public' | 'friends' | 'private';
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhoto: string;
  sellerPhone?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  wilaya: string;
  images: string[];
  status: 'available' | 'sold';
  hasDelivery: boolean;
  createdAt: Timestamp | any;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  seen: boolean;
  reactions?: { [userId: string]: string };
  createdAt: Timestamp;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: string[];
  reactions?: { [userId: string]: string };
  commentCount: number;
  privacy: 'public' | 'friends' | 'private';
  background?: string | null;
  republishedFrom?: string;
  republishedAuthor?: string;
  createdAt: Timestamp;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageUrl?: string;
  parentId?: string;
  replyTo?: string;
  likes?: string[];
  createdAt: Timestamp | any;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  type: 'like' | 'comment' | 'follow' | 'market_interest' | 'group_invite' | 'group_request' | 'group_accepted' | 'group_rejected';
  postId?: string;
  groupId?: string;
  message?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface EducationalGroup {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  creatorId: string;
  admins: string[];
  members: string[];
  pendingRequests?: string[];
  privacy: 'public' | 'private' | 'hidden'; // public: anyone see/join, private: see/request, hidden: invite only
  autoJoin: boolean;
  requireTeacherVerification: boolean; // Must have role 'teacher' or rank verified
  memberCount: number;
  tags?: string[];
  rules?: string[];
  createdAt: Timestamp | any;
}

export interface GroupPost extends Post {
  groupId: string;
  reports?: { userId: string, reason: string, createdAt: Timestamp }[];
  isLocked?: boolean;
}

export interface SavedPreferences {
  teacherFirstName?: string;
  teacherLastName?: string;
  phase?: string;
  subject?: string;
  school?: string;
  level?: string;
  isEasyMode?: boolean;
  sectionNum?: string;
  field?: string;
  topic?: string;
  projectNum?: string;
  sequenceNum?: string;
  tache?: string;
  activity?: string;
  learningObjective?: string;
  competency?: string;
  materials?: string;
  genLanguage?: string;
}
