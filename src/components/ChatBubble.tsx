import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { 
  Plus,
  MessageSquare, 
  X, 
  Send, 
  User, 
  Search, 
  Circle, 
  Check,
  GraduationCap, 
  Image as ImageIcon, 
  Smile, 
  Mic, 
  Square,
  Paperclip, 
  Video, 
  Phone, 
  PhoneOff,
  MapPin, 
  Clock, 
  UserPlus, 
  UserCheck,
  Compass,
  BookOpen,
  Zap,
  FlaskConical,
  Brain,
  Music,
  Camera,
  Palette,
  Monitor,
  Languages,
  ScrollText,
  Dumbbell,
  Droplets,
  Moon,
  MoreVertical,
  Minimize2,
  Maximize2,
  StopCircle,
  Play,
  Trash2,
  Edit2,
  Reply,
  AlertCircle,
  Loader2,
  Users,
  Globe,
  TrendingUp,
  Heart,
  ChevronRight,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import { db, storage, onConnectionChange } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, limit, Timestamp, updateDoc, doc, arrayUnion, arrayRemove, setDoc, writeBatch, getDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString, uploadBytesResumable } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { playSound } from '../lib/sounds';
import { displayNotification } from '../lib/notifications';
import { useUpload } from '../hooks/useUpload';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';

import ImageLightbox from './ImageLightbox';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  senderId: string;
  senderName: string;
  createdAt: any;
  reactions?: { [uid: string]: string };
  deletedFor?: string[];
  replyTo?: {
    text: string;
    senderName: string;
    id: string;
  } | null;
}

// Emoji & Profile Trigger Component
const ChatTrigger = ({ 
  isOpen, 
  setIsOpen, 
  emojiState, 
  activeChat, 
  profile, 
  unreadCount,
  unreadMessages = [],
  users = [],
  cachedUsers = {},
  onClearActiveChat,
  onClick
}: { 
  isOpen: boolean, 
  setIsOpen: (v: boolean) => void, 
  emojiState: string,
  activeChat: any,
  profile: any,
  unreadCount: number,
  unreadMessages?: any[],
  users?: any[],
  cachedUsers?: {[uid: string]: any},
  onClearActiveChat?: () => void,
  onClick?: () => void
}) => {
  // Find sender of the latest unread message if chat is closed
  let unreadSender: any = null;
  if (!isOpen && unreadMessages && unreadMessages.length > 0) {
    const latestMsg = unreadMessages[unreadMessages.length - 1];
    unreadSender = users.find(u => u.uid === latestMsg.senderId) || cachedUsers[latestMsg.senderId];
  }

  // Use activeChat profile picture if selected, or unread sender picture, otherwise fallback to the teachers image
  const defaultTeachersImage = "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=200&h=200&fit=crop";
  const triggerImage = activeChat 
    ? (activeChat.photoURL || null) 
    : (unreadSender ? (unreadSender.photoURL || null) : defaultTeachersImage);

  return (
    <motion.div
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className="relative cursor-pointer"
    >
      {/* Neon Glow Rings */}
      <motion.div 
        className="absolute inset-0 rounded-full bg-purple-500/50 blur-xl z-0"
        animate={{ 
          scale: [1, 1.4, 1],
          opacity: [0.3, 0.6, 0.3] 
        }}
        transition={{ repeat: Infinity, duration: 3 }}
      />
      
      {/* Floating unread message alert (Sender name & avatar alert) */}
      {!isOpen && unreadSender && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          className="absolute right-24 bottom-2 sm:bottom-4 bg-slate-950/95 border border-purple-500/50 backdrop-blur-md text-white px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 w-48 z-30"
          style={{ direction: 'rtl' }}
        >
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 ring-2 ring-purple-500/30">
            <img src={unreadSender.photoURL || '/prof_dali_logo.png'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[11px] font-black text-purple-400 truncate">{unreadSender.displayName}</p>
            <p className="text-[9px] text-slate-300 truncate">أرسل رسالة جديدة 💬</p>
          </div>
        </motion.div>
      )}

      <div className="relative w-16 h-16 sm:w-20 sm:h-20 z-10">
        {/* Neon Orbit Line */}
        <motion.div 
          className="absolute -inset-1 rounded-full border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        />

        <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden shadow-2xl relative bg-slate-900">
          <img 
            src={triggerImage} 
            className="w-full h-full object-cover" 
            alt="Teachers in Hall"
            referrerPolicy="no-referrer"
          />
          
          {/* Status Indicator */}
          {activeChat && (
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 shadow-lg" />
          )}
        </div>

        {unreadCount > 0 && !isOpen && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-slate-900 shadow-lg z-20"
          >
            {unreadCount}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default function ChatBubble() {
  const { profile } = useAuth();
  const { startUpload, activeUploads } = useUpload();
  const unreadCount = useUnreadMessages();
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('chat_bubble_open');
    return saved === 'true';
  });

  const [showChatHeads, setShowChatHeads] = useState(() => {
    const saved = localStorage.getItem('show_chat_heads');
    return saved !== 'false'; // default true
  });

  const [activeChat, setActiveChat] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('active_chat_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [cachedUsers, setCachedUsers] = useState<{[uid: string]: any}>({});

  const [activeChatHeads, setActiveChatHeads] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('active_chat_heads');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const removeChatHead = (uid: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveChatHeads(prev => {
      const newList = prev.filter(u => u.uid !== uid);
      localStorage.setItem('active_chat_heads', JSON.stringify(newList));
      return newList;
    });
    if (activeChat?.uid === uid) {
      setActiveChat(null);
    }
  };

  // Resolve missing user profiles for unread messages senders
  useEffect(() => {
    if (!unreadMessages || unreadMessages.length === 0) return;
    const missingUids = unreadMessages
      .map(m => m.senderId)
      .filter(uid => uid && uid !== profile?.uid && !users.find(u => u.uid === uid) && !cachedUsers[uid]);

    if (missingUids.length === 0) return;

    missingUids.forEach(async (uid) => {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = { uid: docSnap.id, ...docSnap.data() };
          setCachedUsers(prev => ({ ...prev, [uid]: userData }));
        }
      } catch (e) {
        console.error("Error fetching missing user profile:", e);
      }
    });
  }, [unreadMessages, users, profile?.uid]);

  // Fetch recent conversations and groups for the lobby
  useEffect(() => {
    if (!profile?.uid) return;

    // Listen to messages to deduce recent chats
    const qMessages = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    // Listen to chat_rooms for groups
    const qRooms = query(
      collection(db, 'chat_rooms'),
      where('participants', 'array-contains', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const convosMap = new Map();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.roomId === 'global') return;
        
        // If it's a group room (not a UID_UID pattern)
        const isGroupRoom = !data.roomId.includes('_');
        
        if (isGroupRoom) {
          if (!convosMap.has(data.roomId)) {
            convosMap.set(data.roomId, {
              uid: data.roomId,
              isGroup: true,
              displayName: data.roomName || 'مجموعة عمل',
              lastMessage: data.text || 'صورة/صوت ✨',
              lastTime: data.createdAt || Timestamp.now(),
              unread: data.senderId !== profile.uid && data.seen === false
            });
          }
        } else {
          const otherId = data.senderId === profile.uid 
            ? (data.roomId.split('_').find((id: string) => id !== profile.uid))
            : data.senderId;
          
          if (otherId && !convosMap.has(otherId)) {
            convosMap.set(otherId, {
              uid: otherId,
              isGroup: false,
              lastMessage: data.text || 'صورة/صوت ✨',
              lastTime: data.createdAt || Timestamp.now(),
              unread: data.senderId !== profile.uid && data.seen === false
            });
          }
        }
      });
      const convos = Array.from(convosMap.values());
      convos.sort((a, b) => {
        const timeA = a.lastTime?.toMillis ? a.lastTime.toMillis() : 0;
        const timeB = b.lastTime?.toMillis ? b.lastTime.toMillis() : 0;
        return timeB - timeA;
      });
      setConversations(convos);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    const unsubscribeRooms = onSnapshot(qRooms, (snapshot) => {
      // Logic to merge rooms info with conversations if needed
      // For now we'll just use the message-based approach for recency
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chat_rooms');
    });

    return () => {
      unsubscribeMessages();
      unsubscribeRooms();
    };
  }, [profile?.uid]);

  useEffect(() => {
    const handleShare = (e: any) => {
      const post = e.detail;
      const url = `${window.location.origin}/post/${post.id}`;
      setNewMessage(prev => prev + (prev ? '\n' : '') + `شاركت منشوراً: ${url}`);
      setIsOpen(true);
      if (chatInputRef.current) chatInputRef.current.focus();
    };
    window.addEventListener('share-post', handleShare);
    return () => window.removeEventListener('share-post', handleShare);
  }, []);

  const [newMessage, setNewMessage] = useState('');
    const [chatView, setChatView] = useState<'main' | 'requests'>('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const [filterSameSubject, setFilterSameSubject] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCalling, setIsCalling] = useState<'video' | 'audio' | null>(null);
  const [agoraJoined, setAgoraJoined] = useState(false);
  const agoraJoinedRef = useRef(false);
  const isJoiningRef = useRef(false);
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const remoteUsersRef = useRef<{ [uid: string]: IAgoraRTCRemoteUser }>({});
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [emojiState, setEmojiState] = useState<'happy' | 'sad' | 'angry' | 'laughing' | 'pointing' | 'sleeping' | 'excited' | 'awake'>('sleeping');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [lastOpenTime, setLastOpenTime] = useState<number>(Date.now());
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId for reactions, or 'input' for new message
  const sessionID = useRef(Math.random().toString(36).substring(7)).current;
  const typingTimeoutRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      console.log('Stopping ringtone...');
      try {
        ringtoneRef.current.pause();
        ringtoneRef.current.muted = true; // Extra safety
        ringtoneRef.current.currentTime = 0;
      } catch (e) {
        console.warn('Ringtone stop error:', e);
      }
      ringtoneRef.current = null;
    }
  };

  const [vHeight, setVHeight] = useState('100dvh');
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyMessage, setReplyMessage] = useState<any | null>(null);
  const pressTimer = useRef<any>(null);

  useEffect(() => {
    const handleConnection = (status: boolean) => setIsConnected(status);
    onConnectionChange(handleConnection);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    if (window.visualViewport) {
      const handleVisualResize = () => {
        if (window.visualViewport) {
          setVHeight(`${window.visualViewport.height}px`);
          setIsKeyboardOpen(window.visualViewport.height < window.innerHeight * 0.8);
        }
      };
      window.visualViewport.addEventListener('resize', handleVisualResize);
      handleVisualResize();
      return () => {
        window.removeEventListener('resize', checkMobile);
        window.visualViewport?.removeEventListener('resize', handleVisualResize);
      };
    }
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100dvh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isOpen, isMobile]);

  const [tick, setTick] = useState(0);

  // Auto-scroll to bottom when messages change or chat is opened
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current && isOpen && activeChat) {
      const scrollContainer = scrollRef.current;
      // Use multiple frames to ensure DOM is fully rendered and images (if any) are accounted for
      const scrollToBottom = () => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      };
      
      requestAnimationFrame(scrollToBottom);
      // Extra safety for slower renders or images loading
      const timeout = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeout);
    }
  }, [messages.length, activeChat?.uid, isOpen]);

  useEffect(() => {
    localStorage.setItem('chat_bubble_open', isOpen.toString());
  }, [isOpen]);

  useEffect(() => {
    const handleShowChat = async (e: any) => {
      if (e.detail) {
        let userData = e.detail;
        
        // If it's a developer placeholder or just email, resolve full profile
        if (userData.email === 'dalinadjib1990@gmail.com' && !userData.uid) {
          const q = query(collection(db, 'users'), where('email', '==', 'dalinadjib1990@gmail.com'), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            userData = { uid: snap.docs[0].id, ...snap.docs[0].data() };
          }
        }
        
        setActiveChat(userData);
      }
      setIsOpen(true);
    };
    window.addEventListener('show-chat', handleShowChat);
    return () => window.removeEventListener('show-chat', handleShowChat);
  }, []);

  const notifiedMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!profile?.uid) return;

    // Global listener for new unread messages to play sound
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid),
      where('seen', '==', false)
    );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((m: any) => m.senderId !== profile.uid)
        .sort((a: any, b: any) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tA - tB;
        });
      setUnreadMessages(msgs);

      // Ignore initial snapshot of already existing unread messages on mount/load
      if (isFirstLoad) {
        isFirstLoad = false;
        snapshot.docs.forEach(d => notifiedMessagesRef.current.add(d.id));
        return;
      }

      const newChanges = snapshot.docChanges().filter(
        change => change.type === 'added' && change.doc.data().senderId !== profile.uid && !notifiedMessagesRef.current.has(change.doc.id)
      );

      if (newChanges.length > 0) {
        // Only play sound if document is hidden or if it's from a different chat than the active one
        // To avoid double-playing, we just use a small pop or nothing if it's the active chat
        // We will remove the sound from here if it's active chat, but we don't have access to activeChat easily here.
        // Actually, we can just play 'message'
        playSound('message');
        
        // Find the newest message added
        const latestChange = newChanges[newChanges.length - 1];
        if (latestChange) {
          notifiedMessagesRef.current.add(latestChange.doc.id);
          const data = latestChange.doc.data();
          const senderUser = users.find(u => u.uid === data.senderId);
          if (senderUser) {
            setActiveChatHeads(prev => {
              const filtered = prev.filter(u => u.uid !== senderUser.uid);
              const newList = [senderUser, ...filtered].slice(0, 3);
              localStorage.setItem('active_chat_heads', JSON.stringify(newList));
              return newList;
            });
          }
          const senderPhoto = senderUser?.photoURL || '/prof_dali_logo.png';

          // Show elegant in-app Custom Toast so user can immediately see who sent the message
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-fade-in' : 'opacity-0 scale-95'
                } max-w-sm w-full bg-slate-950/95 border border-purple-500/50 backdrop-blur-md shadow-2xl rounded-3xl pointer-events-auto flex p-4 transition-all duration-300`}
                style={{ direction: 'rtl' }}
              >
                <div className="flex-1 w-0">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <img
                        className="h-10 w-10 rounded-xl object-cover ring-2 ring-purple-500/30"
                        src={senderPhoto}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="mr-3 flex-1 text-right">
                      <p className="text-sm font-bold text-white">
                        {data.senderName}
                      </p>
                      <p className="mt-1 text-xs text-slate-300 line-clamp-1 font-sans">
                        {data.text || '💬 أرسل لك ملفاً/صوت/صورة'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex border-r border-slate-800 pr-3 mr-3 items-center">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      if (senderUser) {
                        setActiveChat(senderUser);
                        setIsOpen(true);
                      }
                    }}
                    className="w-full border border-transparent p-2 flex items-center justify-center text-xs font-black text-purple-400 hover:text-purple-300"
                  >
                    عرض
                  </button>
                </div>
              </div>
            ),
            { duration: 4500 }
          );

          // Background Notification for messages
          if (document.visibilityState !== 'visible') {
            displayNotification(`رسالة جديدة من ${data.senderName}`, {
              body: data.text || 'أرسل لك ملفاً/صورة',
              icon: senderPhoto,
              tag: 'new-message'
            });
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return unsubscribe;
  }, [profile, users]);

  useEffect(() => {
    if (unreadCount > 0 && !isOpen) {
      setEmojiState('awake');
    } else if (isOpen) {
      setEmojiState('excited');
      setLastOpenTime(Date.now());
      // Reset to happy after a while
      const timer = setTimeout(() => setEmojiState('happy'), 3000);
      return () => clearTimeout(timer);
    } else {
      setEmojiState('sleeping');
    }
  }, [unreadCount, isOpen]);

  // Handle "Closing eyes" after 1 hour of no opening
  useEffect(() => {
    if (isOpen) return;
    
    const timeout = setTimeout(() => {
      setEmojiState('sleeping');
    }, 3600000); // 1 hour
    
    return () => clearTimeout(timeout);
  }, [isOpen, lastOpenTime]);

  // Typing Indicator Logic
  useEffect(() => {
    if (!profile?.uid || !activeChat?.uid) return;
    const uidA = profile.uid;
    const uidB = activeChat.uid;
    const roomId = uidB === 'global' ? 'global' : (activeChat.isGroup ? uidB : [uidA, uidB].sort().join('_'));
    
    const typingRef = doc(db, 'typing', roomId);
    const unsubscribe = onSnapshot(typingRef, (docSnap) => {
      if (!docSnap.exists()) {
        setIsOtherTyping(false);
        return;
      }
      
      const data = docSnap.data() || {};
      if (uidB === 'global' || activeChat.isGroup) {
        // In global or group chat, check if anyone else is typing
        const othersTyping = Object.entries(data).some(([u, isTyping]) => u !== uidA && u !== 'participants' && isTyping);
        setIsOtherTyping(othersTyping);
      } else {
        setIsOtherTyping(!!data[uidB] && uidB !== 'participants');
      }
    }, (error) => {
      // Silently handle typing errors as they are non-critical
      console.warn("Typing listener error:", error);
    });

    return unsubscribe;
  }, [profile?.uid, activeChat?.uid]);

  useEffect(() => {
    localStorage.setItem('chat_bubble_open', isOpen.toString());
  }, [isOpen]);

  useEffect(() => {
    if (activeChat) {
      localStorage.setItem('active_chat_user', JSON.stringify(activeChat));
      if (activeChat.uid && activeChat.uid !== 'global') {
        setActiveChatHeads(prev => {
          if (prev[0]?.uid === activeChat.uid) return prev;
          const filtered = prev.filter(u => u.uid !== activeChat.uid);
          const newList = [activeChat, ...filtered].slice(0, 3);
          localStorage.setItem('active_chat_heads', JSON.stringify(newList));
          return newList;
        });
      }
    } else {
      localStorage.removeItem('active_chat_user');
    }
  }, [activeChat]);

  // Mark messages as seen (VU) - Optimized with writeBatch for real-time performance
  useEffect(() => {
    if (!profile?.uid || !activeChat?.uid || !isOpen || activeChat.uid === 'global') return;
    
    const roomId = activeChat.isGroup ? activeChat.uid : [profile.uid, activeChat.uid].sort().join('_');
    const q = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      where('participants', 'array-contains', profile.uid),
      where('senderId', '!=', profile.uid),
      where('seen', '==', false)
    );

    const unsubscribeSeen = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) return;
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(doc(db, 'messages', d.id), { seen: true });
      });
      
      try {
        await batch.commit();
        const { clearSystemNotifications } = await import('../lib/notifications');
        clearSystemNotifications();
      } catch (e) {
        console.error("Error committing seen batch:", e);
      }
    }, (error) => {
      console.warn("Seen listener error:", error);
    });

    return unsubscribeSeen;
  }, [profile?.uid, activeChat?.uid, isOpen]);

  useEffect(() => {
    if (isOpen) {
      import('../lib/notifications').then(({ clearSystemNotifications }) => {
        clearSystemNotifications();
      });
    }
  }, [isOpen]);

  // Cleanup recording on chat change or close
  useEffect(() => {
    return () => {
      if (isRecording) {
        cancelRecording();
      }
    };
  }, [activeChat?.uid, isOpen, isRecording]);

  const handleTyping = async (isTyping: boolean) => {
    if (!profile || !activeChat) return;
    const roomId = activeChat.uid === 'global' ? 'global' : (activeChat.isGroup ? activeChat.uid : [profile.uid, activeChat.uid].sort().join('_'));
    const typingRef = doc(db, 'typing', roomId);
    
    // Use a local ref to prevent redundant writes
    const lastWrite = (window as any).lastTypingWrite || 0;
    const now = Date.now();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Only write to Firestore if status changed or 2 seconds passed since last write
    if (isTyping !== (window as any).isCurrentlyTyping || (isTyping && now - lastWrite > 2000)) {
      (window as any).isCurrentlyTyping = isTyping;
      (window as any).lastTypingWrite = now;
      
      try {
        const participants = activeChat.uid === 'global' ? ['global'] : [profile.uid, activeChat.uid];
        await setDoc(typingRef, { 
          [profile.uid]: isTyping,
          participants: participants 
        }, { merge: true });
      } catch (e) {
        console.error("Typing error:", e);
      }
    }
    
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        (window as any).isCurrentlyTyping = false;
        const participants = activeChat.uid === 'global' ? ['global'] : [profile.uid, activeChat.uid];
        setDoc(typingRef, { 
          [profile.uid]: false,
          participants: participants
        }, { merge: true });
      }, 4000);
    }
  };

  // Random emoji state changes to make it look "alive"
  useEffect(() => {
    if (isOpen || unreadCount > 0) return;
    
    const interval = setInterval(() => {
      const states: ('happy' | 'pointing' | 'laughing' | 'angry' | 'sad')[] = ['happy', 'pointing', 'laughing'];
      const randomState = states[Math.floor(Math.random() * states.length)];
      setEmojiState(randomState);
      
      // Reset to happy after 3 seconds
      setTimeout(() => {
        if (!isOpen) setEmojiState('happy');
      }, 3000);
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, [isOpen]);

  // Reminders Logic - Removed polling setInterval as per user request for real-time performance
  useEffect(() => {
    if (!profile?.reminders) return;
    // Reminders are now handled via system events or triggers rather than polling
  }, [profile]);

  // Update lastSeen periodically when using the chat
  useEffect(() => {
    if (!profile?.uid) return;
    
    // Heartbeat for status and connectivity
    const updateStatus = async () => {
      try {
        if (profile?.uid) {
          await updateDoc(doc(db, 'users', profile.uid), {
            lastSeen: serverTimestamp(),
            // No more peerId needed for Agora
          });
        }
      } catch (err) {
        console.error("Status update error:", err);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Pulse every minute
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && profile?.uid) {
        console.log('App visible, checking signaling connection...');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile?.uid]);

  const leaveAgora = async () => {
    if (isJoiningRef.current) {
       console.warn("Agora: Attempted to leave while joining, waiting...");
       // Busy wait or just flag it? Better to prevent.
    }
    
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }
    if (agoraClientRef.current) {
      try {
        await agoraClientRef.current.leave();
      } catch(e) {}
      agoraClientRef.current = null;
    }
    setAgoraJoined(false);
    agoraJoinedRef.current = false;
    remoteUsersRef.current = {};
    setRemoteStream(null);
  };

   const joinAgoraChannel = async (channelName: string, uid: string, type: 'video' | 'audio') => {
    // Strictly using App ID for Testing Mode (No Token)
    const APP_ID = '30a4b4ce20e741b6bfdb1140015f6de0';
    
    console.log("APP_ID:", APP_ID);
    console.log("CHANNEL:", channelName);
    
    if (agoraJoinedRef.current || isJoiningRef.current) {
      return;
    }

    isJoiningRef.current = true;
    try {
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      agoraClientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
          const remoteVideoTrack = user.videoTrack;
          if (remoteVideoTrack) {
            const ms = new MediaStream([remoteVideoTrack.getMediaStreamTrack()]);
            setRemoteStream(ms);
          }
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (user) => {
        setRemoteStream(null);
      });

      // Strictly joining with null token and null uid for Testing Mode
      await client.join(APP_ID, channelName, null, null);
      console.log("Agora: JOINED SUCCESSFULLY");
      
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack().catch(e => {
        console.error("Agora: Mic track failed", e);
        return null;
      });
      
      if (audioTrack) {
        localAudioTrackRef.current = audioTrack;
        await client.publish([audioTrack]);
      }
      
      if (type === 'video') {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: 1280,
            height: 720,
            frameRate: 30,
            bitrateMin: 600,
            bitrateMax: 1500
          }
        }).catch(e => {
          console.error("Agora: Cam track failed", e);
          return null;
        });
        if (videoTrack) {
          localVideoTrackRef.current = videoTrack;
          await client.publish([videoTrack]);
          const tracks = [videoTrack.getMediaStreamTrack()];
          if (audioTrack) tracks.push(audioTrack.getMediaStreamTrack());
          setLocalStream(new MediaStream(tracks));
        }
      } else if (audioTrack) {
        setLocalStream(new MediaStream([audioTrack.getMediaStreamTrack()]));
      }
      
      setAgoraJoined(true);
      agoraJoinedRef.current = true;
      console.log("Agora joined and published successfully");
    } catch (err: any) {
      if (err.code === 'OPERATION_ABORTED' || err.message?.includes('OPERATION_ABORTED') || err.message?.includes('cancel token canceled')) {
        console.warn("Agora: Join process interrupted/aborted.");
        return;
      }
      
      console.error("Agora join ERROR details:", JSON.stringify(err, null, 2));
      console.error("Agora full error message:", err.message);
      
      const isDynamicError = err.message?.includes('dynamic use static key') || 
                             err.code === 'CAN_NOT_GET_GATEWAY_SERVER' || 
                             err.message?.includes('4096');
      
      if (isDynamicError) {
        toast.error("تنبيه هام: إعدادات Agora لديك تتطلب Token. يرجى حذف (Delete) الـ 'Primary Certificate' من لوحة تحكم Agora ليعمل التطبيق بوضع الاختبار المباشر.", { duration: 10000 });
        console.warn("SOLUTION: Go to Agora Console -> Project -> Delete Primary Certificate. Currently using ID:", APP_ID);
      } else {
        toast.error(`تعذر بدء المكالمة: ${err.message || 'خطأ في الربط'}`);
      }
      
      // Reset call state securely
      await leaveAgora().catch(() => {});
      endCall();
    } finally {
      isJoiningRef.current = false;
    }
  };

  useEffect(() => {
    if (!profile) return;

    return () => {
      leaveAgora();
    };
  }, [profile?.uid]);

  const endCall = async () => {
    if (currentCallId) {
      await updateDoc(doc(db, 'calls', currentCallId), { status: 'ended' }).catch(console.error);
      setCurrentCallId(null);
    }
    if (incomingCall?.id) {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'ended' }).catch(console.error);
    }
    
    stopRingtone();

    setIsCalling(null);
    setIncomingCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    
    await leaveAgora();
  };

  // Handle Incoming Calls
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'calls'),
      where('recipientId', '==', profile.uid),
      where('status', 'in', ['ringing', 'accepted']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      if (!snapshot.empty) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() as any };
        setIncomingCall(callData);
        
        // Handle ringtone based on status
        if (callData.status === 'ringing' && !isCalling) {
          if (!ringtoneRef.current) {
            ringtoneRef.current = playSound('ringtone', true);
            
            // Background Notification for calls
            if (document.visibilityState !== 'visible') {
              displayNotification(`مكالمة واردة من ${callData.senderName}`, {
                body: `يتصل بك الآن (${callData.type === 'video' ? 'فيديو' : 'صوت'})`,
                icon: '/prof_dali_logo.png',
                tag: `call-${callData.id}`,
                requireInteraction: true // Keep it until user acts
              });
            }
          }
        } else {
          // If status moved to accepted/connected/ended, stop ringing
          stopRingtone();
        }
        
        setEmojiState('happy');
      } else {
        setIncomingCall(null);
        stopRingtone();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'calls');
    });

    return () => {
      unsubscribe();
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
      }
    };
  }, [profile]);

  // Handle Call Status Updates (Unified for both Caller and Recipient)
  useEffect(() => {
    if (!profile?.uid || !currentCallId) return;

    console.log("CallListener: Monitoring call status for", currentCallId);
    
    const unsubscribe = onSnapshot(doc(db, 'calls', currentCallId), async (snapshot) => {
      if (snapshot.exists()) {
        const call = { id: snapshot.id, ...snapshot.data() as any };
        console.log("Call Status Update:", call.status);
        
        // Anyone in the call joins Agora when status moves to accepted or connected
        if ((call.status === 'accepted' || call.status === 'connected') && !agoraJoinedRef.current) {
          stopRingtone();
          console.log("Agora: Joining channel", call.channelName);
          
          toast.loading("جاري الربط المشفر...", { id: 'call-negotiating' });
          await joinAgoraChannel(call.channelName, profile.uid, call.type);
          toast.dismiss('call-negotiating');
          
          // Only update to 'connected' if we were the one who moved it from 'accepted'
          // or just generally to mark presence. If both do it, it's fine.
          if (call.status === 'accepted') {
            await updateDoc(doc(db, 'calls', call.id), { status: 'connected' }).catch(() => {});
          }
        } 
        else if (call.status === 'rejected' || call.status === 'ended' || call.status === 'failed' || call.status === 'missed') {
          stopRingtone();
          if (call.status === 'failed') {
            toast.error("فشل تأسيس الاتصال.");
          } else if (call.status === 'rejected') {
            toast.error("تم رفض المكالمة.");
          }
          console.log("Call ended by status:", call.status);
          endCall();
        }
      } else {
        // Doc deleted
        endCall();
      }
    }, (error) => {
      console.error("Call Status Listener Error:", error);
      // Don't toast here to avoid spamming if permissions are tight, 
      // but end call if we can't listen anymore
      if (isCalling) endCall();
    });

    return unsubscribe;
  }, [profile?.uid, currentCallId]);

  useEffect(() => {
    if (!profile?.uid || !activeChat?.uid) {
      setMessages([]);
      return;
    }

    const roomId = activeChat.uid === 'global' ? 'global' : (activeChat.isGroup ? activeChat.uid : [profile.uid, activeChat.uid].sort().join('_'));
    const participantsValue = activeChat.uid === 'global' ? 'global' : profile.uid;
    
    if (!participantsValue) return;

    const q = activeChat.uid === 'global' ? 
      query(
        collection(db, 'messages'),
        where('roomId', '==', roomId),
        orderBy('createdAt', 'desc'),
        limit(100)
      ) : 
      query(
        collection(db, 'messages'),
        where('roomId', '==', roomId),
        where('participants', 'array-contains', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return { 
            ...data,
            id: doc.id, 
            createdAt: data.createdAt || Timestamp.now()
          };
        })
        .filter(msg => !(msg as any).deletedFor?.includes(profile.uid)) as any[];
      
      // Sort ascending locally for display (oldest to newest)
      msgs.sort((a, b) => {
        const timeA = (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : a.createdAt) || a.clientCreatedAt || 0;
        const timeB = (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : b.createdAt) || b.clientCreatedAt || 0;
        return timeA - timeB;
      });
      
      setMessages(msgs);
      
      if (isFirstLoad) {
        isFirstLoad = false;
        return;
      }
      
      const hasNewMessage = snapshot.docChanges().some(
        change => change.type === 'added' && change.doc.data().senderId !== profile.uid
      );
      // Removed playSound('message') here to avoid double-triggering sound when global unread listener already played it.
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'messages');
    });

    return unsubscribe;
  }, [profile, activeChat]);

  // Real-time users status listener
  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(collection(db, 'users'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      
      // Filter out current user AND blocked users
      const filtered = allUsers.filter(u => {
        const isMe = u.uid === profile.uid;
        const isBlockedByMe = profile.blockedUsers?.includes(u.uid);
        const amIBlockedByThem = u.blockedUsers?.includes(profile.uid);
        return !isMe && !isBlockedByMe && !amIBlockedByThem;
      });

      setUsers(filtered);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return unsubscribe;
  }, [profile?.uid]);

  useEffect(() => {
    const handleOpenChat = (e: any) => {
      const user = e.detail as UserProfile;
      if (profile?.blockedUsers?.includes(user.uid) || user.blockedUsers?.includes(profile?.uid || '')) {
        alert("You cannot message this user.");
        return;
      }
      setActiveChat(user);
      setIsOpen(true);
    };

    window.addEventListener('openChat', handleOpenChat);
    
    const handleStartCallEvent = (e: any) => {
      const { type, user } = e.detail;
      setActiveChat(user);
      setIsOpen(true);
      setTimeout(() => {
        handleStartCall(type);
      }, 500);
    };

    window.addEventListener('startCall', handleStartCallEvent);

    return () => {
      window.removeEventListener('openChat', handleOpenChat);
      window.removeEventListener('startCall', handleStartCallEvent);
    };
  }, []);

  const [isFriend, setIsFriend] = useState(false);
  const [localIsFriendOverride, setLocalIsFriendOverride] = useState(false);
  const [friendRequest, setFriendRequest] = useState<any>(null);
  const [allInvitations, setAllInvitations] = useState<any[]>([]);

  const [isSelectingFriend, setIsSelectingFriend] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupPhoto, setGroupPhoto] = useState<string | null>(null);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<string[]>([]);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Sound effect for ringing
  useEffect(() => {
    let interval: any;
    if (incomingCall) {
      const ring = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'); // Ringing sound
      ring.loop = true;
      ring.play().catch(e => console.log('Audio play blocked:', e));
      return () => {
        ring.pause();
        ring.currentTime = 0;
      };
    }
  }, [incomingCall]);

  // Check friendship status for activeChat
  useEffect(() => {
    setLocalIsFriendOverride(false); // Reset override on chat change
    if (!profile?.uid || !activeChat?.uid || activeChat.uid === 'global') {
      setIsFriend(true); 
      setFriendRequest(null);
      return;
    }

    const isAlreadyFriend = !!(profile.friends?.includes(activeChat.uid) || profile.followers?.includes(activeChat.uid) || profile.following?.includes(activeChat.uid));

    const q = query(
      collection(db, 'invitations'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setAllInvitations(invs);
      const inv = invs.find(i => i.participants.includes(activeChat.uid));
      
      if (inv) {
        setFriendRequest(inv);
        setIsFriend(inv.status === 'accepted' || isAlreadyFriend);
      } else {
        setFriendRequest(null);
        setIsFriend(isAlreadyFriend);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invitations');
    });

    return unsubscribe;
  }, [profile, activeChat?.uid]);

  const handleAcceptRequest = async () => {
    if (!friendRequest || !profile?.uid) {
      console.warn("Cannot accept request: missing friendRequest or profile UID");
      return;
    }
    setIsAccepting(true);
    try {
      const batch = writeBatch(db);
      
      // Update invitation status
      batch.update(doc(db, 'invitations', friendRequest.id), { 
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
      
      // Update both users' friends and followers/following
      const myRef = doc(db, 'users', profile.uid);
      const theirRef = doc(db, 'users', activeChat!.uid);
      
      batch.update(myRef, {
        friends: arrayUnion(activeChat!.uid),
        followers: arrayUnion(activeChat!.uid),
        following: arrayUnion(activeChat!.uid)
      });
      
      batch.update(theirRef, {
        friends: arrayUnion(profile.uid),
        followers: arrayUnion(profile.uid),
        following: arrayUnion(profile.uid)
      });

      // Notify recipient (the one who sent the request)
      await addDoc(collection(db, 'notifications'), {
        recipientId: activeChat!.uid,
        senderId: profile.uid,
        senderName: profile.displayName,
        type: 'friend_request_accepted',
        read: false,
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      setLocalIsFriendOverride(true);
      playSound('notification');
      toast.success('تم قبول طلب المراسلة!');
    } catch (e) {
      console.error("Error accepting request:", e);
      toast.error('حدث خطأ أثناء قبول الطلب');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!friendRequest || !profile?.uid) return;
    try {
      // Delete invitation
      await deleteDoc(doc(db, 'invitations', friendRequest.id));
      
      await addDoc(collection(db, 'notifications'), {
        recipientId: activeChat!.uid,
        senderId: profile.uid,
        senderName: profile.displayName,
        type: 'friend_request_declined',
        read: false,
        createdAt: serverTimestamp()
      });
      
      setActiveChat(null);
      playSound('notification');
      toast.success('تم رفض طلب المراسلة');
    } catch (e) {
      console.error("Error declining request:", e);
      toast.error('حدث خطأ أثناء رفض الطلب');
    }
  };

  const handleSendMessage = async (e: React.FormEvent, type: 'text' | 'image' | 'audio' = 'text', directFile?: File) => {
    if (e) e.preventDefault();
    
    const hasFiles = selectedFiles.length > 0 || !!directFile;
    if (!newMessage.trim() && !hasFiles && type === 'text') return;
    if (!profile || !activeChat) return;

    if (!isFriend && activeChat.uid !== 'global' && !activeChat.isGroup && !friendRequest) {
      await addDoc(collection(db, 'invitations'), {
        senderId: profile.uid,
        recipientId: activeChat.uid,
        participants: [profile.uid, activeChat.uid],
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        recipientId: activeChat.uid,
        senderId: profile.uid,
        senderName: profile.displayName,
        type: 'follow',
        read: false,
        createdAt: serverTimestamp()
      });
    }

    const roomId = activeChat.uid === 'global' ? 'global' : (activeChat.isGroup ? activeChat.uid : [profile.uid, activeChat.uid].sort().join('_'));
    const participants = activeChat.uid === 'global' ? ['global'] : (activeChat.isGroup ? activeChat.participants : [profile.uid, activeChat.uid].sort());
    
    try {
      const messageText = newMessage;
      const isReply = !!replyMessage;
      const currentReply = replyMessage;
      
      // Handle files (selected or direct)
      const filesToUpload = directFile ? [directFile] : selectedFiles;
      
      if (filesToUpload.length > 0) {
        // Clear selection immediately for better UX
        setSelectedFiles([]);
        setNewMessage('');
        setReplyMessage(null);
        
        for (const file of filesToUpload) {
          const messageData = {
            roomId,
            participants,
            senderId: profile.uid,
            senderName: profile.displayName,
            createdAt: serverTimestamp(),
            clientCreatedAt: Date.now(),
            seen: false,
            replyTo: isReply ? {
              text: currentReply.text || 'صورة',
              senderName: currentReply.senderName,
              id: currentReply.id
            } : null
          };
          
          await startUpload(file, 'message', messageData);
        }

        // If there was text too and it wasn't cleared yet (though we cleared it above, let's play safe)
        if (messageText.trim() && filesToUpload.length === 0) {
           // This part won't run because filesToUpload.length > 0
        }
        
        // If they also typed text, send it as a separate message
        if (messageText.trim()) {
          const textMessageData = {
            roomId,
            participants,
            senderId: profile.uid,
            senderName: profile.displayName,
            createdAt: serverTimestamp(),
            clientCreatedAt: Date.now(),
            seen: false,
            text: messageText,
            replyTo: isReply ? {
              text: currentReply.text || 'صورة',
              senderName: currentReply.senderName,
              id: currentReply.id
            } : null
          };
          await addDoc(collection(db, 'messages'), textMessageData);
        }

        setEmojiState('happy');
        return;
      }

      // Plain text message
      setNewMessage('');
      setReplyMessage(null);
      chatInputRef.current?.focus();
      
      const messageData: any = {
        roomId,
        participants,
        senderId: profile.uid,
        senderName: profile.displayName,
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
        seen: false,
        text: messageText,
        replyTo: isReply ? {
          text: currentReply.text || 'صورة',
          senderName: currentReply.senderName,
          id: currentReply.id
        } : null
      };

      await addDoc(collection(db, 'messages'), messageData);
      setEmojiState('happy');
      setTimeout(() => chatInputRef.current?.focus(), 50);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
      setEmojiState('sad');
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        handleSendMessage(null as any, 'audio', file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error starting recording:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert("Microphone access was denied. Please enable it in your browser settings to record voice notes.");
      } else {
        alert("Could not start recording. Please check your microphone connection.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent sending on stop
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
      // Clean up tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!profile || !activeChat) return;

    try {
      setIsCalling(type);

      // Start ringing for caller (dial tone)
      if (!ringtoneRef.current) {
        ringtoneRef.current = playSound('ringtone', true);
      }

      const channelName = `call_${profile.uid}_${Date.now()}`;
      const callDoc = await addDoc(collection(db, 'calls'), {
        senderId: profile.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL || null,
        recipientId: activeChat.uid,
        type,
        status: 'ringing',
        channelName,
        createdAt: serverTimestamp()
      });
      setCurrentCallId(callDoc.id);
      
      // Auto-timeout after 60 seconds if not answered
      setTimeout(async () => {
        try {
          const docRef = doc(db, 'calls', callDoc.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().status === 'ringing') {
            await updateDoc(docRef, { status: 'missed' });
            toast.error("لم يتم الرد على الاتصال.");
            endCall();
          }
        } catch (e) {
          console.error("Call timeout error:", e);
        }
      }, 60000);
      
      console.log('Call document created:', callDoc.id, 'Waiting for recipient to accept...');

    } catch (err: any) {
      console.error("Call error:", err);
      stopRingtone();
      toast.error("تعذر بدء المكالمة. يرجى التأكد من استقرار الإنترنت.");
      endCall();
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    stopRingtone(); 

    try {
      // Setting isCalling and currentCallId triggers the listener in useEffect to join Agora
      setIsCalling(incomingCall.type);
      setCurrentCallId(incomingCall.id);
      
      await updateDoc(doc(db, 'calls', incomingCall.id), { 
        status: 'accepted'
      });

    } catch (err: any) {
      console.error("Accept call error:", err);
      toast.error("فشل قبول المكالمة.");
      endCall();
    }
  };
  const handleRejectCall = async () => {
    if (!incomingCall) return;
    stopRingtone();
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' });
      setIncomingCall(null);
    } catch (e) {
      console.error(e);
      setIncomingCall(null);
    }
  };



  const getSubjectIcon = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes('رياضيات') || s.includes('math')) return <Compass className="w-3 h-3" />;
    if (s.includes('عربية') || s.includes('arabic')) return <ScrollText className="w-3 h-3" />;
    if (s.includes('فيزياء') || s.includes('physics')) return <Zap className="w-3 h-3" />;
    if (s.includes('علوم') || s.includes('science')) return <FlaskConical className="w-3 h-3" />;
    if (s.includes('فلسفة') || s.includes('philosophy')) return <Brain className="w-3 h-3" />;
    if (s.includes('فرنسية') || s.includes('french') || s.includes('إنجليزية') || s.includes('english')) return <Languages className="w-3 h-3" />;
    if (s.includes('تاريخ') || s.includes('جغرافيا') || s.includes('history')) return <MapPin className="w-3 h-3" />;
    if (s.includes('إسلامية') || s.includes('islamic')) return <BookOpen className="w-3 h-3" />;
    if (s.includes('بدنية') || s.includes('physical')) return <Dumbbell className="w-3 h-3" />;
    if (s.includes('إعلام') || s.includes('computer')) return <Monitor className="w-3 h-3" />;
    if (s.includes('فنية') || s.includes('arts')) return <Palette className="w-3 h-3" />;
    if (s.includes('موسيقية') || s.includes('music')) return <Music className="w-3 h-3" />;
    return <GraduationCap className="w-3 h-3" />;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const filteredUsers = users.filter(u => {
    const displayName = u.displayName || 'Teacher';
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSameSubject ? u.subject === profile?.subject : true;
    return matchesSearch && matchesSubject;
  });

  const handleConnect = async () => {
    if (!profile || !activeChat || activeChat.uid === 'global') return;
    setIsConnecting(true);
    try {
      const isFollowing = profile.following?.includes(activeChat.uid);
      const userRef = doc(db, 'users', profile.uid);
      const targetRef = doc(db, 'users', activeChat.uid);

      if (isFollowing) {
        await updateDoc(userRef, { following: arrayRemove(activeChat.uid) });
        await updateDoc(targetRef, { followers: arrayRemove(profile.uid) });
      } else {
        await updateDoc(userRef, { following: arrayUnion(activeChat.uid) });
        await updateDoc(targetRef, { followers: arrayUnion(profile.uid) });
        
        // Add notification
        await addDoc(collection(db, 'notifications'), {
          recipientId: activeChat.uid,
          senderId: profile.uid,
          senderName: profile.displayName,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!profile) return;
    try {
      const msgRef = doc(db, 'messages', messageId);
      if (forEveryone) {
        // Hard delete for everyone
        const msgSnap = await getDoc(msgRef);
        if (msgSnap.exists() && msgSnap.data().senderId === profile.uid) {
          await deleteDoc(msgRef);
        }
      } else {
        // Delete for me (soft delete)
        await updateDoc(msgRef, {
          deletedFor: arrayUnion(profile.uid)
        });
      }
      setEmojiState('happy');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
      setEmojiState('sad');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupUsers.length === 0 || !profile) {
      toast.error('يرجى إدخال اسم المجموعة واختيار أعضاء');
      return;
    }
    setIsSavingGroup(true);
    try {
      const allParticipants = [profile.uid, ...selectedGroupUsers];
      const finalPhoto = groupPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random`;
      
      const groupDoc = await addDoc(collection(db, 'chat_rooms'), {
        name: groupName,
        participants: allParticipants,
        createdBy: profile.uid,
        isGroup: true,
        photoURL: finalPhoto,
        createdAt: serverTimestamp()
      });

      const groupData = {
        uid: groupDoc.id,
        displayName: groupName,
        isGroup: true,
        participants: allParticipants,
        photoURL: finalPhoto
      };

      // Send initial system message
      await addDoc(collection(db, 'messages'), {
        roomId: groupDoc.id,
        roomName: groupName,
        participants: allParticipants,
        senderId: profile.uid,
        senderName: 'النظام',
        text: `تم إنشاء المجموعة: ${groupName}`,
        createdAt: serverTimestamp(),
        seen: false
      });

      // Notify participants
      const notifPromises = selectedGroupUsers.map(uid => 
        addDoc(collection(db, 'notifications'), {
          recipientId: uid,
          senderId: profile.uid,
          senderName: profile.displayName,
          type: 'group_addition',
          groupName: groupName,
          read: false,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(notifPromises);

      toast.success('تم إنشاء المجموعة بنجاح');
      setActiveChat(groupData as any);
      setIsCreatingGroup(false);
      setGroupName('');
      setGroupPhoto(null);
      setSelectedGroupUsers([]);
    } catch (e) {
      console.error(e);
      toast.error('فشل إنشاء المجموعة');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const isOnline = (lastSeen: any) => {
    if (lastSeen === true) return true;
    if (!lastSeen) return false;
    try {
      const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
      // Increased tolerance to 10 minutes for better stability
      return Date.now() - lastSeenDate.getTime() < 600000;
    } catch (e) {
      return false;
    }
  };

  const getAbbreviated = (text: string) => {
    if (!text) return '';
    const cleanText = text.trim();
    const map: Record<string, string> = {
      'رياضيات': 'Math',
      'Mathematics': 'Math',
      'فرنسية': 'FRE',
      'الفرنسية': 'FRE',
      'French': 'FRE',
      'فيزياء': 'PHY',
      'Physics': 'PHY',
      'متوسط': 'CEM',
      'CEM': 'CEM',
      'Middle School': 'CEM',
      'الطور المتوسط': 'CEM',
      'ثانوي': 'SEC',
      'SEC': 'SEC',
      'Secondary School': 'SEC',
      'الطور الثانوي': 'SEC',
      'ابتدائي': 'PRI',
      'Primary School': 'PRI',
      'الطور الابتدائي': 'PRI',
      'علوم الطبيعة': 'SVT',
      'العلوم': 'SCI',
      'Science': 'SCI',
      'SVT': 'SVT',
      'انجليزية': 'ENG',
      'الإنجليزية': 'ENG',
      'English': 'ENG',
      'عربية': 'ARA',
      'اللغة العربية': 'ARA',
      'Arabic': 'ARA',
      'فلسفة': 'PHI',
      'تاريخ': 'H-G',
      'إسلامية': 'ISL',
      'رياضة': 'SPT'
    };

    if (map[cleanText]) return map[cleanText];

    // Then try partial match
    const normalized = cleanText.toLowerCase();
    for (const key in map) {
      if (cleanText.includes(key) || normalized.includes(key.toLowerCase())) return map[key];
    }

    return cleanText;
  };

  const [friends, setFriends] = useState<any[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    
    // In a real app, you'd fetch your following/friends
    // For this context, we'll listen to the last 20 active users
    const q = query(
      collection(db, 'users'),
      orderBy('lastSeen', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const activeUsers = snap.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(u => u.uid !== profile.uid);
      setFriends(activeUsers);
    });

    return unsubscribe;
  }, [profile?.uid]);

  const getStatus = (lastSeen: any) => {
    if (!lastSeen) return 'offline';
    const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const diff = Date.now() - lastSeenDate.getTime();
    if (diff < 300000) return 'online'; // 5 mins
    if (diff < 3600000) return 'idle';   // 1 hour
    return 'offline';
  };

  const getStatusColor = (lastSeen: any) => {
    const status = getStatus(lastSeen);
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500'; 
      default: return 'bg-red-500';
    }
  };

  const formatLastSeenTime = (lastSeen: any) => {
    if (!lastSeen) return 'غير معلوم';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return 'الآن';
    if (diff < 60) return `${diff}د`;
    if (diff < 1440) return `${Math.floor(diff / 60)}سا`;
    return `${Math.floor(diff / 1440)}ي`;
  };

  const isImageModalOpen = false; // Placeholder if needed

  if (!profile) return null;

  return (
    <div className={`fixed bottom-32 right-4 sm:bottom-8 sm:right-8 z-[150]`}>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="chat-bubble-window"
            initial={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.8, y: 20, x: 20 }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={isMobile ? { opacity: 0, y: '100%' } : { opacity: 0, scale: 0.8, y: 20, x: 20 }}
            drag={false}
            dragMomentum={false}
            dragElastic={0.1}
            className={`fixed bg-slate-950/40 backdrop-blur-2xl overflow-hidden flex flex-col z-[200] ${
              isMobile 
                ? 'inset-0 w-full rounded-none' 
                : 'bottom-24 right-8 w-96 h-[600px] rounded-[2.5rem] border border-slate-800/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] origin-bottom-right'
            }`}
            style={{ height: isMobile ? vHeight : undefined }}
          >
            {/* Header */}
            <div className={`shrink-0 bg-slate-900/60 backdrop-blur-xl border-b border-white/10 transition-all ${isMobile && isKeyboardOpen ? 'p-1' : 'p-2 sm:p-3'}`}>
              {activeChat ? (
                <div className="flex items-center gap-2 sm:gap-4 h-24 sm:h-28" dir="rtl">
                  {/* Exit/Profile (Right) with specialized close button underneath */}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div 
                      onClick={() => setIsOpen(false)}
                      title="اضغط للإغلاق"
                      className="group/profile flex items-center justify-center cursor-pointer bg-white/5 hover:bg-red-500/10 rounded-2xl p-1 border border-white/10 hover:border-red-500/30 transition-all active:scale-95 shadow-lg"
                    >
                      <div className="relative">
                        <img 
                          src={activeChat.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChat.displayName || 'U')}&background=random`} 
                          className={`rounded-xl object-cover border-2 border-white/20 shadow-2xl group-hover/profile:border-red-500/50 ${isMobile && isKeyboardOpen ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'}`} 
                          referrerPolicy="no-referrer"
                          alt={activeChat.displayName}
                        />
                        <div className={`absolute -bottom-1 -right-1 rounded-full border-2 border-slate-900 ${isOnline(activeChat.uid === 'global' || activeChat.isGroup ? null : activeChat.lastSeen) ? 'bg-green-500' : 'bg-slate-500'} ${isMobile && isKeyboardOpen ? 'w-3 h-3' : 'w-4 h-4'}`}></div>
                        <div className="absolute inset-0 bg-red-500/20 group-hover/profile:bg-red-500/40 rounded-xl transition-all flex items-center justify-center">
                          <X className="w-5 h-5 text-red-100 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                    {/* Explicit indicator/button "X" underneath the peer photo */}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md hover:shadow-red-500/40 cursor-pointer active:scale-75 transition-all text-xs font-black border border-red-500/40"
                      title="إغلاق الفقاعة"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Info Section (Center) */}
                  <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2 overflow-hidden border-r border-white/5">
                    {!isKeyboardOpen && (
                      <div className="flex flex-wrap items-center justify-center gap-1 mb-1">
                        {activeChat.subject && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm">
                            <span className="text-[9px] font-black uppercase whitespace-nowrap">{getAbbreviated(activeChat.subject)}</span>
                          </div>
                        )}
                        {activeChat.level && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm">
                            <span className="text-[9px] font-black uppercase whitespace-nowrap">{getAbbreviated(activeChat.level)}</span>
                          </div>
                        )}
                        {!activeChat.isGroup && activeChat.uid !== 'global' && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm">
                            <span className="text-[9px] font-black uppercase whitespace-nowrap">{(activeChat.yearsOfExperience || 1)} EXP</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1 sm:gap-2">
                       {activeChat.isGroup ? (
                         <div className="flex items-center gap-1">
                           <Users className="w-3 h-3 text-blue-400" />
                           <p className="text-[10px] font-bold text-slate-500 truncate">{activeChat.participants?.length || 0} أعضاء</p>
                         </div>
                       ) : (
                         <div className="flex items-center gap-1">
                           <MapPin className="w-3 h-3 text-red-400" />
                           <p className="text-[10px] font-bold text-slate-400 truncate tracking-wide">
                             {activeChat.uid === 'global' ? 'Dz Teacher Lounge' : (activeChat.wilaya || '16 الجزائر')}
                           </p>
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Actions Section (Left) */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 mr-auto">
                    {activeChat.uid !== 'global' && !activeChat.isGroup && (
                      <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                        <button 
                          onClick={() => handleStartCall('audio')}
                          className="p-2 rounded-lg bg-emerald-500 text-white shadow-lg active:scale-95 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/30"
                          title="صوتي"
                        >
                          <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </button>
                        <button 
                          onClick={() => handleStartCall('video')}
                          className="p-2 rounded-lg bg-indigo-500 text-white shadow-lg active:scale-95 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/30"
                          title="فيديو"
                        >
                          <Video className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex flex-row flex-wrap gap-1.5 items-center justify-center max-w-[80px] sm:max-w-[95px]">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('show-soul-medicine'))}
                        className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 group/soul"
                        title="دواء الروح - الآيات والأذكار"
                      >
                        <Heart className="w-4 h-4 sm:w-5 sm:h-5 group-hover/soul:animate-pulse" />
                      </button>

                      <button
                        onClick={() => setIsSelectingFriend(!isSelectingFriend)}
                        className={`p-2.5 sm:p-3 rounded-xl transition-all active:scale-95 border shadow-lg ${
                          isSelectingFriend 
                            ? 'bg-blue-500 text-white border-blue-400 shadow-blue-500/20' 
                            : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20 shadow-blue-500/5'
                        }`}
                        title="اختيار زميل للمحادثة"
                      >
                        <Plus className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${isSelectingFriend ? 'rotate-45' : ''}`} />
                      </button>

                      <div className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-slate-900 border border-slate-800" title="Stream Engine Status">
                        <div className={`w-1 h-1 rounded-full ${agoraJoined ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></div>
                        <span className="text-[5px] sm:text-[6px] font-black text-slate-500 uppercase tracking-tighter shrink-0">
                          {agoraJoined ? 'Live' : 'Ready'}
                        </span>
                      </div>
                      
                      {activeChat.uid !== 'global' && (
                        <button 
                          onClick={handleConnect}
                          disabled={isConnecting}
                          className={`p-1 sm:p-1.5 rounded-lg transition-all active:scale-95 border shadow-lg ${
                            profile?.following?.includes(activeChat.uid) 
                              ? 'bg-amber-500 text-white border-amber-400' 
                              : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 shadow-amber-500/5'
                          }`}
                          title="Connect / متابعة"
                        >
                          {profile?.following?.includes(activeChat.uid) ? <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full h-12">
                   <div className="flex items-center gap-3">
                      <div className="bg-purple-500/20 p-2 rounded-xl border border-purple-500/30">
                        <MessageSquare className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-right" dir="rtl">
                        <h4 className="font-black text-white text-sm sm:text-base tracking-tight">قاعة الأساتذة المباشرة 🇩🇿</h4>
                        <Link to="/discussions" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-all font-bold">
                          <TrendingUp className="w-2.5 h-2.5" />
                          <span>تصفح منتدى المذكرات</span>
                        </Link>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <button
                        onClick={() => window.dispatchEvent(new CustomEvent('show-soul-medicine'))}
                        className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/10 active:scale-95"
                        title="دواء الروح"
                      >
                        <Heart className="w-5 h-5" />
                      </button>
                    <button
                        onClick={() => setIsSelectingFriend(!isSelectingFriend)}
                        className={`p-3.5 sm:p-4 rounded-2xl transition-all border active:scale-95 shadow-lg ${
                          isSelectingFriend
                            ? 'bg-blue-500 text-white border-blue-400 shadow-blue-500/20'
                            : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border-blue-500/10 shadow-blue-500/5'
                        }`}
                        title="البحث عن زملاء"
                      >
                        <Plus className={`w-7 h-7 transition-transform duration-300 ${isSelectingFriend ? 'rotate-45' : ''}`} />
                      </button>
                      <button 
                        onClick={() => setIsOpen(false)} 
                        className="p-2 rounded-xl bg-white/5 text-white/50 hover:bg-red-500 hover:text-white transition-all border border-white/10 active:scale-95"
                        title="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                   </div>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col bg-slate-950/50 overflow-hidden relative">
              {/* Group Creation View Overlay */}
              <AnimatePresence>
                {isCreatingGroup && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 z-[60] bg-slate-950 flex flex-col"
                  >
                    <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center justify-between" dir="rtl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-right">
                          <h3 className="text-white font-black text-sm text-right">إنشاء مجموعة جديدة</h3>
                          <p className="text-[10px] text-slate-400 font-bold text-right">اختر الأعضاء وقم بتسمية المجموعة</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsCreatingGroup(false)}
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4 flex-1 flex flex-col overflow-hidden">
                       <div className="flex flex-col items-center gap-3 mb-2">
                         <div className="relative group/avatar">
                           <img 
                            src={groupPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName || 'Group')}&background=random`} 
                            className="w-20 h-20 rounded-3xl object-cover border-4 border-slate-800 shadow-2xl"
                            alt="Group Profile"
                           />
                           <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-3xl opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-all">
                             <Camera className="w-8 h-8 text-white" />
                             <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Simplified: just use data URL or prompt for URL if no storage
                                  // In AI Studio we usually use Cloudinary or just dataURL for demo
                                  const reader = new FileReader();
                                  reader.onload = (re) => setGroupPhoto(re.target?.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                             />
                           </label>
                         </div>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">صورة المجموعة</p>
                       </div>

                       <input 
                        type="text"
                        placeholder="اسم المجموعة..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/30 font-bold"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        dir="rtl"
                       />

                       <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                         <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2" dir="rtl">اختر الزملاء ({selectedGroupUsers.length})</h5>
                         {friends.length === 0 ? (
                           <div className="text-center py-10">
                             <p className="text-xs text-slate-500 font-bold">لا يوجد زملاء متاحين للإضافة حالياً</p>
                           </div>
                         ) : friends.map(u => (
                           <button
                             key={`group-sel-${u.uid}`}
                             onClick={() => {
                               setSelectedGroupUsers(prev => 
                                 prev.includes(u.uid) ? prev.filter(id => id !== u.uid) : [...prev, u.uid]
                               );
                             }}
                             className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${selectedGroupUsers.includes(u.uid) ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-slate-900 border-transparent hover:border-slate-800'}`}
                             dir="rtl"
                           >
                             <div className="relative shrink-0">
                               <img src={u.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                               {selectedGroupUsers.includes(u.uid) && (
                                 <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-slate-900">
                                   <Check className="w-2.5 h-2.5 text-white" />
                                 </div>
                               )}
                             </div>
                             <div className="flex-1 text-right min-w-0">
                               <h5 className="text-sm font-black text-white truncate">{u.displayName}</h5>
                               <p className="text-[10px] text-slate-500 font-bold truncate">{u.subject || 'زميل'}</p>
                             </div>
                           </button>
                         ))}
                       </div>

                       <button
                         onClick={handleCreateGroup}
                         disabled={isSavingGroup || !groupName.trim() || selectedGroupUsers.length === 0}
                         className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                       >
                         {isSavingGroup ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إنشاء المجموعة الآن'}
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Separate Friend List View */}
              <AnimatePresence mode="wait">
                {isSelectingFriend && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="absolute inset-0 z-50 bg-slate-950 flex flex-col"
                  >
                    <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-black text-sm">قائمة الزملاء</h3>
                          <p className="text-[10px] text-slate-400 font-bold">اختر زميلاً لبدء محادثة</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsSelectingFriend(false)}
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {friends.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full opacity-50 grayscale py-10">
                          <Users className="w-16 h-16 mb-4 text-slate-600" />
                          <p className="text-sm font-black text-slate-500">لا يوجد زملاء نشطون حالياً</p>
                        </div>
                      ) : (
                        friends.map((friend) => (
                          <motion.div
                            key={friend.uid}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setActiveChat(friend);
                              setIsSelectingFriend(false);
                            }}
                            className="flex items-center gap-4 p-4 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-blue-500/30 hover:bg-slate-900 transition-all cursor-pointer group"
                            dir="rtl"
                          >
                            <div className="relative shrink-0">
                              <img 
                                src={friend.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.displayName || 'U')}&background=random`} 
                                className="w-12 h-12 rounded-2xl object-cover border-2 border-white/5 group-hover:border-blue-500/30 transition-all" 
                                alt="" 
                              />
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-slate-900 ${getStatusColor(friend.lastSeen)} ${getStatus(friend.lastSeen) === 'online' ? 'animate-pulse' : ''}`}></div>
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-black text-white truncate">{friend.displayName || 'زميل جديد'}</h4>
                                {friend.subject && (
                                  <span className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                                    {getAbbreviated(friend.subject)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className="text-[11px] text-slate-400 font-bold">
                                  {getStatus(friend.lastSeen) === 'online' ? 'متصل الآن' : `أغلق منذ ${formatLastSeenTime(friend.lastSeen)}`}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-blue-500 transition-colors" />
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Incoming Call Overlay */}
              <AnimatePresence>
                {incomingCall && !isCalling && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 50 }}
                    className="absolute inset-x-4 top-4 z-[60] bg-slate-900/95 backdrop-blur-md border border-purple-500/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col items-center text-center"
                  >
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20"></div>
                      <img 
                        src={incomingCall.senderPhoto} 
                        className="w-20 h-20 rounded-2xl object-cover ring-4 ring-purple-500/30 relative z-10" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <h3 className="text-lg font-black text-white mb-1">{incomingCall.senderName}</h3>
                    <p className="text-purple-400 text-xs font-bold mb-6 animate-pulse">
                      {incomingCall.type === 'video' ? 'Incoming Video Call...' : 'Incoming Audio Call...'}
                    </p>
                    <div className="flex gap-4 w-full">
                      <button 
                        onClick={handleRejectCall}
                        className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <PhoneOff className="w-4 h-4" /> Reject
                      </button>
                      <button 
                        onClick={handleAcceptCall}
                        className="flex-1 py-3 bg-green-500 text-white rounded-2xl font-black text-xs hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4" /> Accept
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Calling Overlay */}
              <AnimatePresence initial={false}>
                {isCalling && (
                  <motion.div
                    key="calling-overlay"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 text-center"
                  >
                    {/* Video Streams */}
                    <div className="absolute inset-0 w-full h-full bg-slate-900 overflow-hidden">
                      {remoteStream && (
                        <video
                          ref={(el) => {
                            if (el && el.srcObject !== remoteStream) {
                              el.srcObject = remoteStream;
                            }
                          }}
                          autoPlay
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute bottom-4 right-4 w-32 h-48 bg-slate-800 rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-2xl z-20">
                        {localStream && (
                          <video
                            ref={(el) => {
                              if (el && el.srcObject !== localStream) {
                                el.srcObject = localStream;
                              }
                            }}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </div>

                    <div className={`relative z-10 flex flex-col items-center justify-center h-full w-full ${!remoteStream ? 'bg-slate-950/40 backdrop-blur-sm' : ''} p-8`}>
                      {!remoteStream && (
                        <>
                          <div className="relative mb-8">
                            <div className="absolute inset-0 bg-purple-500 rounded-full animate-ping opacity-20"></div>
                            <img 
                              src={activeChat?.photoURL} 
                              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-purple-500/30 relative z-10" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <h3 className="text-xl font-black text-white mb-2">{activeChat?.displayName}</h3>
                          <p className="text-purple-400 font-bold text-sm mb-4 animate-pulse">
                            {isCalling === 'video' ? 'Starting Video Call...' : 'Calling...'}
                          </p>
                          <div className="flex flex-col gap-1 items-center mb-8 px-6 py-2 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                             <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                 {remoteStream ? "Connected" : "Connecting to Secure Channel (Agora)..."}
                               </span>
                             </div>
                             {!remoteStream && (
                               <p className="text-[8px] text-slate-500 font-medium">
                                 Optimizing network path...
                               </p>
                             )}
                          </div>
                        </>
                      )}
                      
                      <div className="mt-auto flex gap-6">
                        <button 
                          onClick={endCall}
                          className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-90"
                        >
                          <PhoneOff className="w-8 h-8" />
                        </button>
                        {!remoteStream && (
                          <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/20 animate-bounce">
                            {isCalling === 'video' ? <Video className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
                          </div>
                        )}
                      </div>
                      
                      {!remoteStream && (
                        <p className="mt-12 text-slate-500 text-xs font-bold">
                          Waiting for {activeChat?.displayName} to join...
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!activeChat ? (
                <>
                  <div className={`p-4 transition-all ${isMobile && isKeyboardOpen ? 'p-2' : ''}`}>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <textarea 
                        ref={searchInputRef as any}
                        rows={1}
                        id="chat_search_field"
                        name="search_query_input"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore
                        placeholder="Search colleagues..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-medium resize-none overflow-hidden pt-2.5"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {!isKeyboardOpen && (
                      <div className="flex gap-2 mb-4">
                        <button 
                          onClick={() => setFilterSameSubject(false)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${!filterSameSubject ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
                        >
                          All
                        </button>
                        <button 
                          onClick={() => setFilterSameSubject(true)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filterSameSubject ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
                        >
                          Same Subject
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {/* Online Colleagues horizontal scroll */}
                    {!searchTerm && (
                      <div className="mb-6">
                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-3 flex items-center gap-2">
                           الزملاء المتصلون
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        </h5>
                        <div className="flex gap-4 overflow-x-auto pb-4 px-2 custom-scrollbar-hide">
                          {/* Search/Add Button */}
                          <button
                            onClick={() => {
                              if (searchInputRef.current) {
                                searchInputRef.current.focus();
                                setSearchTerm('');
                              }
                            }}
                            className="flex flex-col items-center gap-1 min-w-[75px] group"
                          >
                            <div className="relative">
                              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border-2 border-dashed border-purple-500/30 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:scale-105 group-hover:border-purple-500 transition-all shadow-lg shadow-purple-500/5">
                                <Plus className="w-9 h-9 text-purple-400 group-hover:rotate-90 transition-transform duration-500" />
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-slate-500 text-center uppercase tracking-tighter group-hover:text-purple-400 transition-colors">زميل جديد</span>
                          </button>

                          {users.filter(u => isOnline(u.lastSeen)).length > 0 ? (
                            users.filter(u => isOnline(u.lastSeen)).map(u => (
                              <button
                                key={`online-${u.uid}`}
                                onClick={() => setActiveChat(u)}
                                className="flex flex-col items-center gap-1 min-w-[60px] group"
                              >
                                <div className="relative">
                                  <img 
                                    src={u.photoURL} 
                                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-800 group-hover:ring-green-500/50 transition-all" 
                                    alt="" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <Circle className="absolute -bottom-1 -right-1 w-3 h-3 fill-green-500 text-slate-900" />
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center group-hover:text-white">{u.displayName.split(' ')[0]}</span>
                              </button>
                            ))
                          ) : (
                            <div className="text-[10px] text-slate-600 font-bold px-2 py-4 bg-slate-900/50 rounded-2xl w-full text-center border border-slate-800/50 border-dashed">
                              لا يوجد زملاء متصلون حالياً
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    
                    {/* Chat Navigation Tabs */}
                    <div className="flex gap-2 mb-4 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800" dir="rtl">
                      <button 
                        onClick={() => setChatView('main')}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${chatView === 'main' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        المحادثات
                      </button>
                      <button 
                        onClick={() => setChatView('requests')}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all relative flex items-center justify-center gap-1.5 ${chatView === 'requests' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        طلبات المراسلة
                        {conversations.filter(c => {
                          if (c.isGroup || c.uid === 'global') return false;
                          const inv = allInvitations.find(i => i.participants.includes(c.uid));
                          return (!inv || inv.status !== 'accepted') && c.unread;
                        }).length > 0 && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        )}
                      </button>
                    </div>

                    {chatView === 'requests' ? (
                      <div className="space-y-2">
                        {conversations.filter(c => {
                          if (c.isGroup || c.uid === 'global') return false;
                          const inv = allInvitations.find(i => i.participants.includes(c.uid));
                          return (!inv || inv.status !== 'accepted');
                        }).length === 0 ? (
                          <div className="text-center py-10">
                            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-slate-500 text-xs font-bold">لا توجد طلبات مراسلة</p>
                          </div>
                        ) : (
                          conversations.filter(c => {
                            if (c.isGroup || c.uid === 'global') return false;
                            const inv = allInvitations.find(i => i.participants.includes(c.uid));
                            return (!inv || inv.status !== 'accepted');
                          }).map(conv => {
                            const user = users.find(u => u.uid === conv.uid);
                            if (!user) return null;
                            return (
                              <button
                                key={`req-${conv.uid}`}
                                onClick={() => setActiveChat(user)}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${conv.unread ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/5' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                              >
                                <div className="relative shrink-0">
                                  <img src={user.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="flex justify-between items-center bg-transparent">
                                    <h5 className={`text-sm font-black truncate ${conv.unread ? 'text-red-400' : 'text-slate-200'}`}>{user.displayName}</h5>
                                    {conv.unread && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-500 truncate">{conv.lastMessage}</p>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Global Chat & New Group Options */}
                        <div className="flex gap-2 mb-4">
                           <button
                            onClick={() => setActiveChat({
                              uid: 'global',
                              displayName: 'Global Teacher Lounge',
                              photoURL: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=100&h=100&fit=crop',
                              email: '',
                              createdAt: Timestamp.now()
                            } as any)}
                            className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all group"
                          >
                            <div className="relative">
                              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-white" />
                              </div>
                              <Circle className="absolute -bottom-1 -right-1 w-3 h-3 fill-green-500 text-slate-900" />
                            </div>
                            <div className="text-left">
                              <h5 className="text-sm font-black text-purple-400">Global Chat</h5>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">All Teachers</p>
                            </div>
                          </button>

                          <button
                            onClick={() => setIsCreatingGroup(true)}
                            className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                              <h5 className="text-sm font-black text-blue-400">إنشاء مجموعة</h5>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Group Chat</p>
                            </div>
                          </button>
                        </div>

                        {/* Recent Main Conversations */}
                        {conversations.filter(c => {
                          if (c.isGroup || c.uid === 'global') return true;
                          const inv = allInvitations.find(i => i.participants.includes(c.uid));
                          return inv && inv.status === 'accepted';
                        }).length > 0 && (
                          <div className="space-y-2 mb-6">
                            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">محادثات أخيرة</h5>
                            {conversations.filter(c => {
                              if (c.isGroup || c.uid === 'global') return true;
                              const inv = allInvitations.find(i => i.participants.includes(c.uid));
                              return inv && inv.status === 'accepted';
                            }).map(conv => {
                              const user = users.find(u => u.uid === conv.uid);
                              const isGroupDoc = conv.isGroup;
                              
                              return (
                                <button
                                  key={`main-conv-${conv.uid}`}
                                  onClick={async () => {
                                    if (isGroupDoc) {
                                       try {
                                         const roomSnap = await getDoc(doc(db, 'chat_rooms', conv.uid));
                                         if (roomSnap.exists()) {
                                           const roomData = roomSnap.data();
                                           setActiveChat({
                                             uid: conv.uid,
                                             displayName: roomData.name,
                                             isGroup: true,
                                             participants: roomData.participants,
                                             photoURL: roomData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(roomData.name)}&background=random`
                                           } as any);
                                         } else {
                                           setActiveChat({
                                             uid: conv.uid,
                                             displayName: 'مجموعة مفقودة',
                                             isGroup: true,
                                             participants: [profile.uid]
                                           } as any);
                                         }
                                       } catch (e) {
                                         console.error(e);
                                       }
                                    } else if (user) {
                                      setActiveChat(user);
                                    }
                                  }}
                                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${conv.unread ? 'bg-purple-600/10 border-purple-500/50 shadow-lg shadow-purple-500/5' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                >
                                  <div className="relative shrink-0">
                                    {isGroupDoc ? (
                                       <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                                         <Users className="w-6 h-6 text-white" />
                                       </div>
                                    ) : (
                                       <>
                                         <img src={user?.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                                         <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline(user?.lastSeen) ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                                       </>
                                    )}
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-center bg-transparent">
                                      <h5 className={`text-sm font-black truncate ${conv.unread ? 'text-purple-400' : 'text-slate-200'}`}>{isGroupDoc ? (conv.displayName || 'مجموعة') : (user?.displayName || 'زميل')}</h5>
                                      {conv.unread && <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 truncate">{conv.lastMessage}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Search Results / Users List */}
                        {filteredUsers.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">جميع الزملاء</h5>
                            {filteredUsers.map(u => (
                              <button
                                key={u.uid}
                                onClick={() => setActiveChat(u)}
                                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all group"
                              >
                                <div className="relative">
                                  <img 
                                     src={u.photoURL} 
                                     className="w-10 h-10 rounded-xl object-cover" 
                                     referrerPolicy="no-referrer"
                                  />
                                  <Circle className={`absolute -bottom-1 -right-1 w-3 h-3 ${isOnline(u.lastSeen) ? 'fill-green-500 text-slate-900' : 'fill-slate-600 text-slate-900'}`} />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <h5 className="text-sm font-black text-slate-200 truncate group-hover:text-white transition-colors">{u.displayName}</h5>
                                  <p className="text-[10px] font-bold text-slate-500 truncate">{u.subject || 'Teacher'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Active Chats Quick Switcher Bar */}
                  {activeChatHeads.length > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-slate-900/90 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none shadow-lg z-10" dir="rtl">
                      <span className="text-[10px] font-black text-slate-400 whitespace-nowrap ml-1 font-sans">محادثات سريعة:</span>
                      <div className="flex items-center gap-1.5 py-0.5">
                        {activeChatHeads.map((head) => {
                          const isCurrent = head.uid === activeChat.uid;
                          const hasUnread = unreadMessages.some(m => m.senderId === head.uid);
                          
                          return (
                            <div key={`quick-head-${head.uid}`} className="relative flex items-center shrink-0 group">
                              <button
                                onClick={() => {
                                  setActiveChat(head);
                                  playSound('message');
                                }}
                                className={`relative w-9 h-9 rounded-2xl overflow-hidden transition-all duration-300 ${
                                  isCurrent 
                                    ? 'ring-2 ring-purple-500 scale-105 shadow-[0_0_12px_rgba(168,85,247,0.6)]' 
                                    : 'ring-1 ring-white/10 opacity-60 hover:opacity-100 hover:scale-105'
                                }`}
                                title={head.displayName}
                              >
                                <img 
                                  src={head.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(head.displayName || 'U')}&background=random`} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                                {hasUnread && (
                                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border border-slate-950 rounded-full animate-pulse" />
                                )}
                              </button>
                              
                              {/* Quick Close Button - Always visible for touch ease */}
                              <button
                                onClick={(e) => removeChatHead(head.uid, e)}
                                className="absolute -top-1 -left-1 w-4 h-4 bg-red-500/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center border border-slate-950 shadow-md transition-all duration-200"
                                title="إغلاق المحادثة السريعة"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar overscroll-contain w-full">
                    {/* Message Request UI */}
                    {!isFriend && !localIsFriendOverride && activeChat.uid !== 'global' && (
                      <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 text-center shadow-xl mb-6">
                        <div className="w-16 h-16 bg-purple-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                          <UserPlus className="w-8 h-8 text-purple-500" />
                        </div>
                        <h4 className="text-white font-black mb-2 font-amiri text-lg">طلب مراسلة - Message Request</h4>
                        <p className="text-slate-400 text-xs font-bold mb-6">
                          {!friendRequest 
                            ? 'أرسل رسالة للزميل لطلب التواصل معه.'
                            : friendRequest.senderId === profile.uid 
                              ? 'لقد ارسلت طلب صداقة، انتظر قبول الزميل لكي تتمكنا من التحدث.'
                              : 'يريد هذا الزميل التواصل معك، هل توافق؟'}
                        </p>
                        {!friendRequest ? null : friendRequest.senderId !== profile.uid ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={handleDeclineRequest}
                              className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                            >
                              رفض (Decline)
                            </button>
                            <button 
                              onClick={handleAcceptRequest}
                              disabled={isAccepting}
                              className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'قبول (Accept)'}
                            </button>
                          </div>
                        ) : (
                          <div className="py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            انتظار الموافقة... Pending Approval
                          </div>
                        )}
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${msg.senderId === profile.uid ? 'items-end' : 'items-start'}`}
                        onMouseDown={() => {
                          pressTimer.current = setTimeout(() => {
                            setSelectedMessageId(msg.id);
                            if (navigator.vibrate) navigator.vibrate(50);
                          }, 600);
                        }}
                        onMouseUp={() => clearTimeout(pressTimer.current)}
                        onTouchStart={() => {
                          pressTimer.current = setTimeout(() => {
                            setSelectedMessageId(msg.id);
                            if (navigator.vibrate) navigator.vibrate(50);
                          }, 600);
                        }}
                        onTouchEnd={() => clearTimeout(pressTimer.current)}
                      >
                        <div className="group relative">
                          <div 
                            className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium shadow-sm transition-all relative overflow-visible ${
                              msg.senderId === profile.uid 
                                ? 'bg-purple-600 text-white rounded-tr-none' 
                                : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800'
                            } ${selectedMessageId === msg.id ? 'ring-2 ring-amber-500 scale-95' : ''}`}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setSelectedMessageId(msg.id);
                            }}
                          >
                            {/* Reply Preview */}
                            {msg.replyTo && (
                              <div className={`mb-2 p-2 rounded-xl text-[10px] border-r-2 ${msg.senderId === profile.uid ? 'bg-black/20 border-white/30 text-white/80' : 'bg-slate-800 border-purple-500 text-slate-400'}`}>
                                <p className="font-black opacity-70">{msg.replyTo.senderName}</p>
                                <p className="truncate line-clamp-1">{msg.replyTo.text}</p>
                              </div>
                            )}

                            {msg.text && <p className="whitespace-pre-wrap select-text min-w-fit" dir="auto" style={{ overflowWrap: "anywhere" }}>{msg.text}</p>}
                            {msg.imageUrl && (
                              <img 
                                src={msg.imageUrl} 
                                className="rounded-xl max-w-full h-auto mb-1 cursor-pointer hover:opacity-90 transition-opacity" 
                                alt="Chat media" 
                                referrerPolicy="no-referrer"
                                onClick={() => setLightboxSrc(msg.imageUrl || null)}
                              />
                            )}
                            {msg.audioUrl && (
                              <audio src={msg.audioUrl} controls className="w-full h-8 mt-1" />
                            )}
                            
                            {/* Reactions Display */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="absolute -bottom-2 right-1 flex -space-x-1 group/reacted z-20">
                                {Object.entries(msg.reactions as Record<string, string>).slice(0, 3).map(([uid, emoji], i) => (
                                  <motion.div 
                                    key={uid} 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="bg-slate-800 border border-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-[11px] shadow-lg ring-1 ring-black/20"
                                  >
                                    {emoji}
                                  </motion.div>
                                ))}
                                {Object.keys(msg.reactions).length > 3 && (
                                  <div className="bg-slate-800 border border-slate-700 rounded-full w-5 h-5 flex items-center justify-center text-[8px] font-bold shadow-lg ring-1 ring-black/20 text-slate-400">
                                    +{Object.keys(msg.reactions).length - 3}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Reaction Picker Trigger */}
                            <div className={`absolute top-0 ${msg.senderId === profile.uid ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-1`}>
                              <button 
                                onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-purple-400 transition-colors shadow-lg border border-slate-700"
                              >
                                <Smile className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setReplyMessage(msg);
                                  chatInputRef.current?.focus();
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-blue-400 transition-colors shadow-lg border border-slate-700"
                              >
                                <Reply className="w-4 h-4 rotate-180" />
                              </button>
                            </div>

                            {/* Selected Context Menu Overlay */}
                            <AnimatePresence>
                              {selectedMessageId === msg.id && (
                                <>
                                  {/* Backdrop for mobile to ensure focus and prevent accidental clicks */}
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedMessageId(null)}
                                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99]"
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, x: -50 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, x: -50 }}
                                    className="fixed top-1/2 left-4 -translate-y-1/2 w-[220px] max-w-[calc(100vw-2rem)] shadow-[0_0_50px_rgba(0,0,0,0.4)] z-[1000] flex flex-col bg-slate-950/98 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden ring-1 ring-white/10"
                                    dir="rtl"
                                  >
                                    {/* Horizontal Emoji Bar */}
                                    <div className="p-3 border-b border-white/10 bg-white/5 flex flex-row flex-wrap gap-1.5 justify-center">
                                      {['👍', '❤️', '😂', '🤔', '😡', '🔥', '👏', '🙏'].map(emoji => (
                                        <button
                                          key={emoji}
                                          onClick={() => {
                                            const msgRef = doc(db, 'messages', msg.id);
                                            updateDoc(msgRef, { [`reactions.${profile.uid}`]: emoji });
                                            setSelectedMessageId(null);
                                          }}
                                          className="text-xl hover:scale-125 active:scale-90 transition-transform p-1"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-px bg-white/5">
                                      <button 
                                        onClick={() => {
                                          setReplyMessage(msg);
                                          setSelectedMessageId(null);
                                          chatInputRef.current?.focus();
                                        }}
                                        className="w-full text-right px-4 py-3 text-xs font-black text-slate-100 hover:bg-white/10 transition-colors flex items-center justify-start gap-3"
                                      >
                                        <Reply className="w-4 h-4 text-blue-400 rotate-180" />
                                        <span>رد على الرسالة</span>
                                      </button>
                                      <button 
                                        onClick={() => {
                                          handleDeleteMessage(msg.id, false);
                                          setSelectedMessageId(null);
                                        }}
                                        className="w-full text-right px-4 py-3 text-xs font-black text-slate-100 hover:bg-white/10 transition-colors flex items-center justify-start gap-3 border-t border-white/5"
                                      >
                                        <Trash2 className="w-4 h-4 text-slate-400" />
                                        <span>حذف من عندي</span>
                                      </button>
                                      {msg.senderId === profile.uid && (
                                        <button 
                                          onClick={() => {
                                            handleDeleteMessage(msg.id, true);
                                            setSelectedMessageId(null);
                                          }}
                                          className="w-full text-right px-4 py-3 text-xs font-black text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-start gap-3 border-t border-white/5"
                                        >
                                          <ShieldAlert className="w-4 h-4" />
                                          <span>حذف للجميع</span>
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => setSelectedMessageId(null)}
                                        className="w-full text-center px-4 py-3 text-[10px] font-black text-slate-500 hover:text-white transition-colors border-t border-white/5"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                            
                            <AnimatePresence initial={false}>
                              {showEmojiPicker === msg.id && (
                                <motion.div 
                                  key={`picker-${msg.id}`}
                                  initial={{ opacity: 0, scale: 0.5, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.5, y: 10 }}
                                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-full p-2 flex gap-1 shadow-2xl z-50 ring-2 ring-purple-500/20"
                                >
                                  {['❤️', '😂', '😮', '😢', '👍', '🔥', '👏', '🙏'].map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => {
                                        const msgRef = doc(db, 'messages', msg.id);
                                        updateDoc(msgRef, { [`reactions.${profile.uid}`]: emoji });
                                        setShowEmojiPicker(null);
                                      }}
                                      className="hover:scale-130 transition-transform p-0.5 text-lg"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <p className={`text-[10px] font-bold ${msg.senderId === profile.uid ? 'text-white/60' : 'text-slate-500'}`}>
                            {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                          </p>
                          {msg.senderId === profile.uid && (
                            <div className="flex items-center">
                              {msg.seen ? (
                                <div className="flex items-center gap-0.5 bg-purple-500/10 px-1 rounded-full border border-purple-500/20">
                                  <span className="text-[10px]" title="Seen / شوهد">👀</span>
                                  <div className="flex -space-x-1">
                                    <Check className="w-2.5 h-2.5 text-purple-400" strokeWidth={4} />
                                    <Check className="w-2.5 h-2.5 text-purple-400" strokeWidth={4} />
                                  </div>
                                </div>
                              ) : (
                                <Check className="w-3 h-3 text-white/40" strokeWidth={4} />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <ImageLightbox 
                      src={lightboxSrc || ''} 
                      isOpen={!!lightboxSrc} 
                      onClose={() => setLightboxSrc(null)} 
                    />
                    
                    {/* Pending Uploads */}
                    {activeUploads
                      .filter(u => u.type === 'message' && u.data?.roomId === (activeChat?.uid === 'global' ? 'global' : [profile?.uid, activeChat?.uid].sort().join('_')))
                      .map(upload => (
                        <div key={upload.id} className="flex flex-col items-end">
                          <div className="max-w-[80%] p-3 rounded-2xl bg-purple-600/50 text-white rounded-tr-none border border-purple-500/30 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Envoi en cours...</span>
                            </div>
                            <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-white"
                                initial={{ width: 0 }}
                                animate={{ width: `${upload.progress}%` }}
                              />
                            </div>
                            <p className="text-[10px] font-bold mt-1 opacity-60 truncate max-w-[120px]">{upload.fileName}</p>
                          </div>
                        </div>
                      ))}
                    
                    {isOtherTyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900/80 border border-purple-500/30 rounded-2xl rounded-tl-none p-3 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-left-2 transition-all">
                          <div className="flex gap-1.5 h-6 items-center">
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} 
                              transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                              className="w-1.5 h-1.5 bg-purple-500 rounded-full" 
                            />
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} 
                              transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                              className="w-1.5 h-1.5 bg-purple-500 rounded-full" 
                            />
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} 
                              transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                              className="w-1.5 h-1.5 bg-purple-500 rounded-full" 
                            />
                          </div>
                          <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
                            {activeChat?.uid === 'global' ? 'زميل يكتب...' : `${activeChat?.displayName.split(' ')[0]} يكتب الآن...`}
                            <Edit2 className="w-3 h-3 animate-bounce" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {(!friendRequest || isFriend || localIsFriendOverride || activeChat.uid === 'global') && (
                  <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex flex-col gap-3">
                    {replyMessage && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/80 border border-primary/30 rounded-xl p-2 px-3 flex items-center justify-between gap-3 text-[10px]"
                      >
                        <div className="flex-1 min-w-0 border-r-2 border-primary pr-2">
                          <p className="font-black text-primary uppercase text-[8px] mb-0.5 tracking-wider">Répondre à {replyMessage.senderName}</p>
                          <p className="text-slate-300 truncate font-bold">{replyMessage.text || 'صورة/صوت'}</p>
                        </div>
                        <button 
                          onClick={() => setReplyMessage(null)}
                          className="p-1 hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}

                    {/* Multi-Image Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-950/60 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <AnimatePresence mode="popLayout">
                          {selectedFiles.map((file, idx) => {
                            const url = URL.createObjectURL(file);
                            return (
                              <motion.div 
                                key={file.name + idx}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative group overflow-hidden rounded-xl border border-white/10 shadow-2xl bg-slate-900"
                              >
                                <img 
                                  src={url} 
                                  alt="preview" 
                                  className="w-20 h-20 object-cover transition-transform group-hover:scale-110"
                                />
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeSelectedFile(idx);
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full p-1 shadow-lg backdrop-blur-sm transition-all transform scale-90 group-hover:scale-100"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        <motion.button 
                          layout
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-20 h-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:border-purple-500/50 hover:text-purple-400 hover:bg-purple-500/5 transition-all group"
                        >
                          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">أضف</span>
                        </motion.button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          if (isRecording) {
                            stopRecording();
                          } else {
                            handleSendMessage(null as any);
                            handleTyping(false);
                          }
                        }}
                        disabled={isUploading}
                        onMouseDown={(e) => e.preventDefault()} // Prevent focus stealing
                        className="bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-xl transition-all active:scale-90 disabled:opacity-50 shrink-0"
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="w-5 h-5 rotate-180" />
                        )}
                      </button>
                      <textarea
                        ref={chatInputRef as any}
                        rows={1}
                        id="chat_message_field"
                        name="chat_message_input"
                        placeholder={isUploading ? "Uploading..." : "Type your message..."}
                        disabled={isUploading}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-form-type="other"
                        data-lpignore="true"
                        data-1p-ignore
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-medium disabled:opacity-50 resize-none overflow-hidden"
                        value={newMessage}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(null as any);
                            handleTyping(false);
                          }
                        }}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping(e.target.value.length > 0);
                        }}
                        onBlur={() => handleTyping(false)}
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-4">
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-slate-500 hover:text-purple-400 transition-colors"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setShowEmojiPicker(showEmojiPicker === 'input' ? null : 'input')}
                          className={`transition-colors ${showEmojiPicker === 'input' ? 'text-purple-400' : 'text-slate-500 hover:text-purple-400'}`}
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        
                        <AnimatePresence initial={false}>
                          {showEmojiPicker === 'input' && (
                            <motion.div 
                              key="input-emoji-picker"
                              initial={{ opacity: 0, y: 10, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.9 }}
                              className="absolute bottom-full mb-4 left-4 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl z-50 flex flex-wrap gap-2 max-w-[200px]"
                            >
                              {['❤️', '😂', '😮', '😢', '👍', '🔥', '👏', '🎉', '🙏', '✨', '📚', '🎓', '🤔', '😡', '😱', '🥳', '💪', '💡', '✅', '❌', '💯', '🚀'].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => {
                                    setNewMessage(prev => prev + emoji);
                                    setShowEmojiPicker(null);
                                  }}
                                  className="text-xl hover:scale-125 transition-transform p-1"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-slate-500 hover:text-purple-400 transition-colors"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRecording && (
                          <button 
                            type="button"
                            onClick={cancelRecording}
                            className="p-2 text-slate-500 hover:text-red-500 transition-colors animate-in slide-in-from-right-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          type="button"
                          onClick={() => {
                            if (isRecording) {
                              stopRecording();
                            } else {
                              startRecording();
                            }
                          }}
                          className={`p-2 rounded-full transition-all relative ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-slate-500 hover:bg-slate-800'}`}
                        >
                          {isRecording ? <div className="w-5 h-5 flex items-center justify-center"><Square className="w-3 h-3 fill-current" /></div> : <Mic className="w-5 h-5" />}
                          {isRecording && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap shadow-lg">
                              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      multiple
                      onChange={handleFileSelect}
                    />
                  </div>
                )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        drag={!isOpen}
        dragMomentum={false}
        className="relative"
      >
        {/* Floating Active Chat Heads (Messenger-like bubbles) */}
        {!isOpen && activeChatHeads.length > 0 && (
          <div className="absolute bottom-24 right-2 flex flex-col gap-3 items-center mb-2 z-[160]" dir="rtl">
            {/* Toggle Visibility Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newVal = !showChatHeads;
                setShowChatHeads(newVal);
                localStorage.setItem('show_chat_heads', String(newVal));
              }}
              className="w-8 h-8 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white rounded-full flex items-center justify-center shadow-lg transition-all z-[170]"
              title={showChatHeads ? "إخفاء الفقاعات" : "إظهار الفقاعات"}
            >
              {showChatHeads ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence initial={false}>
              {showChatHeads && activeChatHeads.map((head, index) => {
                const hasUnread = unreadMessages.some(m => m.senderId === head.uid);
                return (
                  <motion.div
                    key={`floating-head-${head.uid}`}
                    initial={{ opacity: 0, scale: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.05 }}
                    className="relative group cursor-pointer"
                    drag
                    dragConstraints={{ left: -300, right: 0, top: -600, bottom: 0 }}
                    dragElastic={0.8}
                    onDragEnd={(e, info) => {
                      if (info.offset.y > 60 || info.offset.y < -60) {
                        removeChatHead(head.uid);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveChat(head);
                      setIsOpen(true);
                      playSound('message');
                    }}
                  >
                    {/* Glowing Accent */}
                    <div className="absolute -inset-1 rounded-2xl bg-purple-500/20 blur-sm group-hover:bg-purple-500/40 transition-all duration-300 pointer-events-none" />
                    
                    {/* Message Preview Bubble */}
                    {(hasUnread || true) && (() => {
                      const conv = conversations.find(c => c.uid === head.uid);
                      const displayMsg = conv?.lastMessage;
                      if (!displayMsg) return null;
                      return (
                        <div className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 max-w-[150px] bg-slate-900/95 border border-slate-700/50 rounded-2xl rounded-tr-sm px-3 py-2 shadow-xl ${hasUnread ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'} transition-all duration-300 pointer-events-none z-[-1] backdrop-blur-sm`}>
                          <p className={`text-[10px] ${hasUnread ? 'font-black text-white' : 'font-bold text-slate-300'} line-clamp-2 leading-relaxed text-right dir-rtl`}>
                            {displayMsg}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Avatar Container */}
                    <div className="relative w-12 h-12 rounded-2xl border-2 border-slate-900 overflow-hidden shadow-2xl bg-slate-900 ring-2 ring-purple-500/40 group-hover:ring-purple-500 transition-all duration-300 group-hover:scale-105 pointer-events-none">
                      <img 
                        src={head.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(head.displayName || 'U')}&background=random`} 
                        className="w-full h-full object-cover" 
                        alt={head.displayName}
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Active Status Dot */}
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900 shadow-md" />
                      
                      {/* Unread dot */}
                      {hasUnread && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-slate-950 animate-ping" />
                      )}
                    </div>

                    {/* Quick Close Button - Always visible for touch ease */}
                    <button
                      onClick={(e) => removeChatHead(head.uid, e)}
                      className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center border border-slate-950 shadow-lg transition-all duration-200 z-30"
                      title="إغلاق المحادثة"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Tooltip Name Label */}
                    <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-slate-950/95 border border-slate-800 text-white text-[11px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap opacity-100 pointer-events-none shadow-2xl z-20 font-sans hidden sm:block" dir="rtl">
                      {head.displayName}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <motion.div
          className={`relative group transition-transform ${isOpen && isMobile ? 'scale-0' : 'scale-100'}`}
        >
          <ChatTrigger 
            isOpen={isOpen} 
            setIsOpen={() => {}} 
            emojiState={emojiState} 
            activeChat={activeChat}
            profile={profile}
            unreadCount={unreadCount}
            unreadMessages={unreadMessages}
            users={users}
            cachedUsers={cachedUsers}
            onClearActiveChat={() => setActiveChat(null)}
            onClick={() => {
              if (activeChat) {
                setActiveChat(null);
              } else {
                setIsOpen(!isOpen);
              }
            }}
          />
          {!isOpen && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white animate-bounce">
              {unreadCount}
            </div>
          )}
        </motion.div>

        {/* Incoming Call UI */}
        <AnimatePresence initial={false}>
          {incomingCall && !isCalling && (
            <motion.div
              key={`incoming-call-${incomingCall.id}`}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: -100 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-20 right-0 w-64 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col items-center gap-4 z-[120]"
            >
              <div className="flex items-center gap-3 w-full">
                <img src={incomingCall.senderPhoto} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                <div className="flex-1 text-left">
                  <h5 className="text-white font-bold text-sm truncate">{incomingCall.senderName}</h5>
                  <p className="text-purple-400 text-[10px] font-black animate-pulse uppercase">Incoming {incomingCall.type} Call...</p>
                </div>
              </div>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={handleRejectCall}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition-all"
                >
                  Decline
                </button>
                <button 
                  onClick={handleAcceptCall}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                >
                  Accept
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
