import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
  ShieldAlert
} from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, limit, Timestamp, updateDoc, doc, arrayUnion, arrayRemove, setDoc, writeBatch, getDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString, uploadBytesResumable } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { playSound } from '../lib/sounds';
import { useUpload } from '../hooks/useUpload';
import { Peer } from 'peerjs';

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
const ChatTrigger = ({ isOpen, setIsOpen, emojiState, activeChat, profile, unreadCount }: { 
  isOpen: boolean, 
  setIsOpen: (v: boolean) => void, 
  emojiState: string,
  activeChat: any,
  profile: any,
  unreadCount: number
}) => {
  const triggerImage = activeChat?.photoURL || profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`;

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="relative cursor-pointer group"
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
      
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 z-10">
        {/* Neon Orbit Line */}
        <motion.div 
          className="absolute -inset-1 rounded-full border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        />

        <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden shadow-2xl relative bg-slate-900">
          {activeChat || unreadCount > 0 ? (
            <img 
              src={triggerImage} 
              className="w-full h-full object-cover" 
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600`}>
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          )}
          
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
  const [isHidden, setIsHidden] = useState(false);
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

  // Fetch recent conversations for the lobby
  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convosMap = new Map();
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.roomId === 'global') return;
        
        const otherId = data.senderId === profile.uid 
          ? (data.roomId.split('_').find((id: string) => id !== profile.uid))
          : data.senderId;
        
        if (otherId && !convosMap.has(otherId)) {
          convosMap.set(otherId, {
            uid: otherId,
            lastMessage: data.text || 'صورة/صوت ✨',
            lastTime: data.createdAt || Timestamp.now(),
            unread: data.senderId !== profile.uid && data.seen === false
          });
        }
      });
      setConversations(Array.from(convosMap.values()));
    }, () => {});

    return unsubscribe;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const [filterSameSubject, setFilterSameSubject] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCalling, setIsCalling] = useState<'video' | 'audio' | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const activePeerCallRef = useRef<any>(null);
  const [activePeerCall, setActivePeerCall] = useState<any>(null);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [emojiState, setEmojiState] = useState<'happy' | 'sad' | 'angry' | 'laughing' | 'pointing' | 'sleeping' | 'excited' | 'awake'>('sleeping');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [lastOpenTime, setLastOpenTime] = useState<number>(Date.now());
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId for reactions, or 'input' for new message
  const typingTimeoutRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const [vHeight, setVHeight] = useState('100dvh');
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<any | null>(null);
  const pressTimer = useRef<any>(null);

  useEffect(() => {
    const handleConnection = (status: boolean) => setIsConnected(status);
    // @ts-ignore - Assuming exported from firebase.ts
    import('../firebase').then(m => m.onConnectionChange(handleConnection));
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

  useEffect(() => {
    if (!profile?.uid) return;

    // Global listener for new unread messages to play sound
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid),
      where('seen', '==', false)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const hasNewMessage = snapshot.docChanges().some(
        change => change.type === 'added' && change.doc.data().senderId !== profile.uid
      );
      if (hasNewMessage) {
        playSound('message');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return unsubscribe;
  }, [profile]);

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
    const roomId = uidB === 'global' ? 'global' : [uidA, uidB].sort().join('_');
    
    const typingRef = doc(db, 'typing', roomId);
    const unsubscribe = onSnapshot(typingRef, (docSnap) => {
      if (!docSnap.exists()) {
        setIsOtherTyping(false);
        return;
      }
      
      const data = docSnap.data() || {};
      if (uidB === 'global') {
        // In global chat, check if anyone else is typing
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
    } else {
      localStorage.removeItem('active_chat_user');
    }
  }, [activeChat]);

  // Mark messages as seen (VU) - Optimized with writeBatch for real-time performance
  useEffect(() => {
    if (!profile?.uid || !activeChat?.uid || !isOpen || activeChat.uid === 'global') return;
    
    const roomId = [profile.uid, activeChat.uid].sort().join('_');
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
      } catch (e) {
        console.error("Error committing seen batch:", e);
      }
    }, (error) => {
      console.warn("Seen listener error:", error);
    });

    return unsubscribeSeen;
  }, [profile?.uid, activeChat?.uid, isOpen]);

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
    const roomId = activeChat.uid === 'global' ? 'global' : [profile.uid, activeChat.uid].sort().join('_');
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

  // Initialize PeerJS
  useEffect(() => {
    if (!profile) return;

    // Avoid recreating if already connected with same ID
    if (peerRef.current && peerRef.current.id === profile.uid && !peerRef.current.destroyed) {
      return;
    }

    // Cleanup existing peer if any
    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }

    const peer = new Peer(profile.uid, {
      debug: 0, // Silence logs for cleaner production experience
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('Peer connected to signaling server with ID:', id);
    });

    peer.on('disconnected', () => {
      console.log('Peer signaling connection lost. Attempting to reconnect...');
      // Reconnect to signaling server
      if (peerRef.current && !peerRef.current.destroyed) {
        setTimeout(() => {
          if (peerRef.current && peerRef.current.disconnected && !peerRef.current.destroyed) {
            peerRef.current.reconnect();
          }
        }, 1000);
      }
    });

    peer.on('call', async (call) => {
      console.log('Incoming PeerJS call from:', call.peer);
      activePeerCallRef.current = call;
      setActivePeerCall(call);
    });

    peer.on('error', (err: any) => {
      const errorStr = (err?.message || String(err)).toLowerCase();
      const errorType = err?.type;
      
      // Handle known error types
      if (errorType === 'unavailable-id') {
        console.warn('Peer ID already taken. This usually happens after a quick refresh.');
      } else if (errorType === 'peer-unavailable') {
        console.warn('Target peer unavailable:', err);
        if (isCalling || incomingCall) {
          alert("المستخدم غير متاح حالياً للاتصال.");
          endCall();
        }
      } else if (errorType === 'network' || errorStr.includes('lost connection to server') || errorStr.includes('socket-error')) {
        // These are signaling server connectivity issues, often transient
        console.warn('PeerJS signaling connectivity issue (non-critical):', errorStr);
        
        // Reconnect attempt if we were disconnected from signaling server
        if (peerRef.current && !peerRef.current.destroyed && peerRef.current.disconnected) {
          peerRef.current.reconnect();
        }
      } else if (errorType === 'socket-closed' || errorType === 'socket-error') {
        console.warn('PeerJS socket issue, signaling will attempt recovery...');
      } else {
        // Only log other errors as errors, but don't throw them
        console.error('PeerJS error:', err);
      }
    });

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
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
    
    // Stop any active ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }

    setIsCalling(null);
    setIncomingCall(null);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    localStreamRef.current = null;
    setRemoteStream(null);
    if (activePeerCallRef.current) {
      activePeerCallRef.current.close();
    }
    activePeerCallRef.current = null;
    setActivePeerCall(null);
  };

  // Handle Incoming Calls
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'calls'),
      where('recipientId', '==', profile.uid),
      where('status', '==', 'ringing'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      if (!snapshot.empty) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setIncomingCall(callData);
        // Only play ringtone if one isn't already playing and we aren't already in a call
        if (!ringtoneRef.current && !isCalling) {
          ringtoneRef.current = playSound('ringtone', true);
        }
        setEmojiState('happy');
      } else {
        setIncomingCall(null);
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
          ringtoneRef.current = null;
        }
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

  // Handle Call Status Updates (for the caller)
  useEffect(() => {
    if (!profile?.uid || !isCalling) return;

    const q = query(
      collection(db, 'calls'),
      where('senderId', '==', profile.uid),
      where('status', 'in', ['connected', 'rejected', 'ended']),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const call = snapshot.docs[0].data();
        if (call.status === 'rejected') {
          endCall();
        } else if (call.status === 'ended') {
          endCall();
        } else if (call.status === 'connected') {
          // Stop ringing once connected
          if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
            ringtoneRef.current = null;
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'calls_status');
    });

    return unsubscribe;
  }, [profile, isCalling, localStream]);

  useEffect(() => {
    if (!profile?.uid || !activeChat?.uid) {
      setMessages([]);
      return;
    }

    const roomId = activeChat.uid === 'global' ? 'global' : [profile.uid, activeChat.uid].sort().join('_');
    const participantsValue = activeChat.uid === 'global' ? 'global' : profile.uid;
    
    if (!participantsValue) return;

    const q = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      where('participants', 'array-contains', participantsValue),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
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
      
      if (snapshot.docChanges().some(change => change.type === 'added' && change.doc.data().senderId !== profile.uid)) {
        playSound('message');
      }
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
  const [friendRequest, setFriendRequest] = useState<any>(null);

  // Check friendship status for activeChat
  useEffect(() => {
    if (!profile?.uid || !activeChat?.uid || activeChat.uid === 'global') {
      setIsFriend(true); 
      setFriendRequest(null);
      return;
    }

    const q = query(
      collection(db, 'invitations'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const inv = invs.find(i => i.participants.includes(activeChat.uid));
      
      if (inv) {
        setFriendRequest(inv);
        setIsFriend(inv.status === 'accepted');
      } else {
        setFriendRequest(null);
        setIsFriend(false);
      }
    });

    return unsubscribe;
  }, [profile?.uid, activeChat?.uid]);

  const handleAcceptRequest = async () => {
    if (!friendRequest) return;
    try {
      await updateDoc(doc(db, 'invitations', friendRequest.id), { status: 'accepted' });
      setIsFriend(true);
      playSound('notification');
    } catch (e) {
      console.error("Error accepting request:", e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, type: 'text' | 'image' | 'audio' = 'text', file?: File) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !file && type === 'text') return;
    if (!profile || !activeChat) return;

    // Auto-connect on message if not connected ? No, let's keep it strict or auto-send request
    if (!isFriend && activeChat.uid !== 'global' && !friendRequest) {
      // Auto-send invitation if none exists
      await addDoc(collection(db, 'invitations'), {
        senderId: profile.uid,
        recipientId: activeChat.uid,
        participants: [profile.uid, activeChat.uid],
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    }

    const roomId = activeChat.uid === 'global' ? 'global' : [profile.uid, activeChat.uid].sort().join('_');
    const participants = activeChat.uid === 'global' ? ['global'] : [profile.uid, activeChat.uid].sort();
    
    try {
      const messageText = newMessage;
      const isReply = !!replyMessage;
      const currentReply = replyMessage;
      
      if (file) {
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
        setEmojiState('happy');
        setReplyMessage(null);
        return;
      }

      // OPTIMISTIC UI: Clear input immediately and let onSnapshot handle the local update
      setNewMessage('');
      setReplyMessage(null);
      
      // Focus input again on mobile to keep keyboard open (instantly)
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

      // Add to Firestore - onSnapshot with includeMetadataChanges will show it instantly
      await addDoc(collection(db, 'messages'), messageData);
      setEmojiState('happy');
      // Final focus enforcement
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

    // Call allowed regardless of calculated online status for better reliability
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices not supported or unsecure context");
      }

      // More robust constraints
      const constraints = {
        video: type === 'video' ? {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : false,
        audio: true
      };

      console.log('Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCalling(type);

      // Start ringing for caller
      if (!ringtoneRef.current) {
        ringtoneRef.current = playSound('ringtone', true);
      }

      const callDoc = await addDoc(collection(db, 'calls'), {
        senderId: profile.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        recipientId: activeChat.uid,
        type,
        status: 'ringing',
        createdAt: serverTimestamp()
      });
      setCurrentCallId(callDoc.id);

      // Initiate PeerJS call
      const call = peerRef.current?.call(activeChat.uid, stream);
      if (call) {
        call.on('stream', (remoteStream) => {
          setRemoteStream(remoteStream);
        });
        call.on('close', () => {
          endCall();
        });
        setActivePeerCall(call);

        // Call Timeout: End call if not connected within 45 seconds
        setTimeout(() => {
          if (isCalling && !remoteStream) {
            console.log("Call timed out");
            alert("لم يتم الرد على المكالمة. قد يكون المستخدم غير متاح.");
            endCall();
          }
        }, 45000);
      }
    } catch (err) {
      console.error("Call error:", err);
      alert("تعذر بدء المكالمة. يرجى التأكد من منح أذونات الكاميرا والميكروفون.");
      endCall();
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    
    // Stop ringtone immediately
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices not supported or unsecure context");
      }

      const constraints = {
        video: incomingCall.type === 'video' ? {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : false,
        audio: true
      };

      console.log('Answering call with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Wait if peer call hasn't arrived yet (race condition with Firestore)
      let currentPeerCall = activePeerCallRef.current;
      if (!currentPeerCall) {
        console.log("Peer call not found yet, waiting...");
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 500));
          if (activePeerCallRef.current) {
            currentPeerCall = activePeerCallRef.current;
            console.log("Peer call arrived after waiting");
            break;
          }
        }
      }

      if (currentPeerCall) {
        currentPeerCall.answer(stream);
        currentPeerCall.on('stream', (remoteStream: MediaStream) => {
          console.log('Received remote stream');
          setRemoteStream(remoteStream);
        });
        currentPeerCall.on('close', () => {
          endCall();
        });
      } else {
        console.error("Peer call failed to arrive after timeout");
        throw new Error("Failed to establish peer connection");
      }

      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'connected' });
      setIsCalling(incomingCall.type);
      setIncomingCall(null);
      playSound('message'); 
    } catch (err) {
      console.error("Accept call error:", err);
      alert("تعذر الوصول إلى الكاميرا أو الميكروفون. يرجى التأكد من منح الأذونات في المتصفح.");
      handleRejectCall();
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    // Stop ringtone immediately
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }

    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' });
      
      // Add missed call notification
      await addDoc(collection(db, 'notifications'), {
        recipientId: incomingCall.senderId,
        senderId: profile?.uid,
        senderName: profile?.displayName,
        type: 'missed_call',
        callType: incomingCall.type,
        read: false,
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now()
      });
      
      setIncomingCall(null);
      if (activePeerCall) {
        activePeerCall.close();
      }
      setActivePeerCall(null);
    } catch (err) {
      console.error("Reject call error:", err);
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
    const file = e.target.files?.[0];
    if (file) {
      handleSendMessage(null as any, file.type.startsWith('image') ? 'image' : 'text', file);
    }
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

  const isOnline = (lastSeen: any) => {
    if (!lastSeen) return false;
    try {
      const lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
      return Date.now() - lastSeenDate.getTime() < 600000; // Increased to 10 minutes for better tolerance
    } catch (e) {
      return false;
    }
  };

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
            drag={!isMobile}
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
            <div className={`shrink-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-slate-900 flex items-center justify-between border-b border-white/10 transition-all ${isMobile && isKeyboardOpen ? 'p-2' : 'p-4 sm:p-5'}`}>
              <div className="flex items-center gap-3">
                {activeChat ? (
                  <>
                    <button onClick={() => setActiveChat(null)} className="text-white/80 hover:text-white transition-colors">
                      {isMobile && isKeyboardOpen ? <X className="w-4 h-4 rotate-45" /> : <X className="w-5 h-5 rotate-45" />}
                    </button>
                    <div className="relative">
                      <img 
                        src={activeChat.photoURL} 
                        className={`${isMobile && isKeyboardOpen ? 'w-8 h-8' : 'w-10 h-10'} rounded-2xl object-cover border-2 border-white/20 transition-all`} 
                        referrerPolicy="no-referrer"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline(activeChat.uid === 'global' ? null : activeChat.lastSeen) ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                    </div>
                    <div>
                      <h4 className={`font-black text-white leading-tight ${isMobile && isKeyboardOpen ? 'text-[12px]' : 'text-sm'}`}>
                        {activeChat.displayName}
                        {!isConnected && <span className="ml-2 text-[10px] text-yellow-400 font-normal animate-pulse">(Connecting...)</span>}
                      </h4>
                      {!isKeyboardOpen && (
                        <div className="flex flex-col">
                          <p className="text-[10px] font-bold text-white/90 flex items-center gap-1">
                            {activeChat.uid === 'global' ? (
                              <>
                                <Users className="w-2 h-2" />
                                <span>Professional Global Lounge</span>
                              </>
                            ) : (
                              <>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline(activeChat.lastSeen) ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></span>
                                {isOnline(activeChat.lastSeen) ? 'متصل (Online)' : 'غير متصل (Offline)'}
                              </>
                            )}
                          </p>
                          {!isKeyboardOpen && (
                            <>
                              <p className="text-[10px] font-bold text-white/90 flex items-center gap-1">
                                {activeChat.uid === 'global' ? <Globe className="w-2 h-2" /> : getSubjectIcon(activeChat.subject || '')}
                                {activeChat.uid === 'global' ? 'All Subjects' : (activeChat.subject || 'Teacher')} • {activeChat.level || 'General'}
                              </p>
                              <p className="text-[9px] font-bold text-white/70 flex items-center gap-1">
                                <MapPin className="w-2 h-2" /> {activeChat.uid === 'global' ? 'Algeria (National)' : (activeChat.wilaya || 'Algeria')} • <Clock className="w-2 h-2" /> {activeChat.uid === 'global' ? '24/7 Live' : `${activeChat.yearsOfExperience || 0} ans exp`}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                      {isMobile && isKeyboardOpen && (
                         <p className="text-[9px] font-bold text-white/80">Online</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white/20 p-2 rounded-xl">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-white">Teacher Lounge</h4>
                      <Link to="/discussions" className="text-[10px] text-white/70 hover:text-white flex items-center gap-1 transition-all">
                        <TrendingUp className="w-2 h-2" />
                        <span>Visit Forum - اذهب إلى منتدى النقاشات</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            <div className="flex items-center gap-1">
                {activeChat && activeChat.uid !== 'global' && (
                  <>
                    <button 
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className={`p-2 rounded-xl transition-all ${profile?.following?.includes(activeChat.uid) ? 'text-green-400 bg-green-400/10' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                      title={profile?.following?.includes(activeChat.uid) ? "Connected" : "Connect"}
                    >
                      {profile?.following?.includes(activeChat.uid) ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleStartCall('audio')}
                      className="p-2 rounded-xl transition-all text-white/90 hover:text-white hover:bg-white/10 active:scale-95 bg-white/5"
                      title="اتصال صوتي (Audio Call)"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleStartCall('video')}
                      className="p-2 rounded-xl transition-all text-white/90 hover:text-white hover:bg-white/10 active:scale-95 bg-white/5"
                      title="اتصال فيديو (Video Call)"
                    >
                      <Video className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setIsOpen(false)} 
                  className={`bg-white/10 text-white hover:bg-red-500 rounded-xl transition-all shadow-lg border border-white/20 ${isMobile && isKeyboardOpen ? 'p-1' : 'p-2'}`}
                  title="Close / أغلق"
                >
                  <X className={isMobile && isKeyboardOpen ? 'w-4 h-4' : 'w-5 h-5'} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col bg-slate-950/50 overflow-hidden relative">
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

                    <div className="relative z-10 flex flex-col items-center justify-center h-full w-full bg-slate-950/40 backdrop-blur-sm p-8">
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
                          <p className="text-purple-400 font-bold text-sm mb-12 animate-pulse">
                            {isCalling === 'video' ? 'Starting Video Call...' : 'Calling...'}
                          </p>
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

                    {/* Recent Conversations */}
                    {conversations.length > 0 && !searchTerm && (
                      <div className="space-y-2 mb-6">
                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">محادثات أخيرة</h5>
                        {conversations.map(conv => {
                          const user = users.find(u => u.uid === conv.uid);
                          if (!user) return null;
                          return (
                            <button
                              key={`conv-${conv.uid}`}
                              onClick={() => setActiveChat(user)}
                              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${conv.unread ? 'bg-purple-600/10 border-purple-500/50 shadow-lg shadow-purple-500/5' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                            >
                              <div className="relative shrink-0">
                                <img src={user.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline(user.lastSeen) ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-center bg-transparent">
                                  <h5 className={`text-sm font-black truncate ${conv.unread ? 'text-purple-400' : 'text-slate-200'}`}>{user.displayName}</h5>
                                  {conv.unread && <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>}
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 truncate">{conv.lastMessage}</p>
                              </div>
                            </button>
                          );
                        })}
                        <div className="h-px bg-slate-800 mx-2 my-4"></div>
                      </div>
                    )}

                    {/* Global Chat Option */}
                    <button
                      onClick={() => setActiveChat({
                        uid: 'global',
                        displayName: 'Global Teacher Lounge',
                        photoURL: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=100&h=100&fit=crop',
                        email: '',
                        createdAt: Timestamp.now()
                      } as any)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all group"
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
                          <Circle className={`absolute -bottom-1 -right-1 w-3 h-3 ${isOnline(u.lastSeen) ? 'fill-green-500 text-slate-900' : 'fill-slate-700 text-slate-900'}`} />
                        </div>
                        <div className="text-left">
                          <h5 className="text-sm font-black text-slate-100 group-hover:text-purple-400 transition-colors">{u.displayName}</h5>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{u.subject || 'Teacher'}</p>
                            <span className="text-[8px] text-slate-600">•</span>
                            <p className={`text-[9px] font-bold ${isOnline(u.lastSeen) ? 'text-green-500' : 'text-slate-600'}`}>
                              {isOnline(u.lastSeen) ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar overscroll-contain">
                    {/* Message Request UI */}
                    {!isFriend && activeChat.uid !== 'global' && (
                      <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 text-center shadow-xl mb-6">
                        <div className="w-16 h-16 bg-purple-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                          <UserPlus className="w-8 h-8 text-purple-500" />
                        </div>
                        <h4 className="text-white font-black mb-2">طلب مراسلة - Message Request</h4>
                        <p className="text-slate-400 text-xs font-bold mb-6">
                          {friendRequest?.senderId === profile.uid 
                            ? 'لقد ارسلت طلب صداقة، انتظر قبول الزميل لكي تتمكنا من التحدث.'
                            : 'يريد هذا الزميل التواصل معك، هل توافق؟'}
                        </p>
                        {friendRequest?.senderId !== profile.uid ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                if (friendRequest) deleteDoc(doc(db, 'invitations', friendRequest.id));
                                setActiveChat(null);
                              }}
                              className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-700 hover:text-white transition-all"
                            >
                              رفض (Decline)
                            </button>
                            <button 
                              onClick={handleAcceptRequest}
                              className="flex-1 py-3 bg-purple-600 text-white rounded-2xl font-black text-xs hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20"
                            >
                              قبول (Accept)
                            </button>
                          </div>
                        ) : (
                          <div className="py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            Pending Approval...
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

                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
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
                      onChange={handleFileSelect}
                    />
                  </div>
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
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsOpen(!isOpen);
            playSound('message');
          }}
          className={`relative group cursor-pointer transition-transform ${isOpen && isMobile ? 'scale-0' : 'scale-100'}`}
        >
        <ChatTrigger 
          isOpen={isOpen} 
          setIsOpen={() => {}} 
          emojiState={emojiState} 
          activeChat={activeChat}
          profile={profile}
          unreadCount={unreadCount}
        />
          {!isOpen && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white animate-bounce">
              {unreadCount}
            </div>
          )}
        </motion.div>

        {/* Incoming Call UI */}
        <AnimatePresence initial={false}>
          {incomingCall && (
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
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs transition-all animate-bounce"
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
