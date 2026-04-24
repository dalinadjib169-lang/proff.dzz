import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, increment, Timestamp, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Post, Comment } from '../types';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, GraduationCap, Send, Trash2, Globe, Users, Lock as LockIcon, X, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../lib/sounds';

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-2 p-2 bg-slate-950 rounded-xl">
      <img src={comment.authorPhoto} className="w-8 h-8 rounded-lg object-cover" alt="" />
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <p className="text-xs font-black text-purple-400">{comment.authorName}</p>
          <span className="text-[10px] text-slate-600 font-bold">{formatDistanceToNow(comment.createdAt.toDate())}</span>
        </div>
        <p className="text-sm text-slate-300 leading-tight">{comment.content}</p>
      </div>
    </div>
  );
}

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-400' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'haha', emoji: '😄', label: 'Haha', color: 'text-yellow-400' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-400' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-400' },
  { type: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-500' },
];

export default function PostCard({ post }: { post: Post }) {
  const { profile } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [reactions, setReactions] = useState<Record<string, string>>(post.reactions || {});
  const [isLiked, setIsLiked] = useState(post.likes?.includes(profile?.uid || ''));
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [loading, setLoading] = useState(false);
  const reactionTimeoutRef = React.useRef<any>(null);

  useEffect(() => {
    setIsLiked(likes.includes(profile?.uid || ''));
  }, [likes, profile?.uid]);

  const handleReaction = async (type: string) => {
    if (!profile?.uid) return;
    setShowReactions(false);
    playSound('like');

    const currentReaction = reactions[profile.uid];
    const isRemoving = currentReaction === type;

    const newReactions = { ...reactions };
    if (isRemoving) {
      delete newReactions[profile.uid];
    } else {
      newReactions[profile.uid] = type;
    }

    const newLikes = isRemoving 
      ? likes.filter(id => id !== profile.uid)
      : likes.includes(profile.uid) ? likes : [...likes, profile.uid];

    setReactions(newReactions);
    setLikes(newLikes);

    try {
      await updateDoc(doc(db, 'posts', post.id), {
        reactions: newReactions,
        likes: newLikes
      });
    } catch (e) {
      setReactions(post.reactions || {});
      setLikes(post.likes || []);
    }
  };

  const currentReaction = profile?.uid ? reactions[profile.uid] : null;
  const reactionData = REACTIONS.find(r => r.type === currentReaction);

  const startReactionTimer = () => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  };

  const clearReactionTimer = () => {
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
    }
  };

  useEffect(() => {
    if (!showComments) return;
    const q = query(
      collection(db, 'comments'), 
      where('postId', '==', post.id), 
      orderBy('createdAt', 'asc'),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        createdAt: d.data().createdAt || Timestamp.now()
      } as Comment)));
    });
  }, [showComments, post.id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile || loading) return;
    
    setLoading(true);
    const text = newComment;
    setNewComment('');
    setCommentCount(prev => prev + 1);
    playSound('comment');

    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: increment(1)
      });
    } catch (e) {
      setCommentCount(prev => prev - 1);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('حذف هذا المنشور؟')) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
      } catch (e) {}
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl mb-4 sm:mb-6">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <Link to={`/profile/${post.authorId}`} className="flex items-center gap-3">
          <img 
            src={post.authorPhoto} 
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/10" 
            alt="" 
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-1.2">
               <h3 className="text-sm font-black text-white">{post.authorName}</h3>
               {post.authorId === 'dalinadjib1990' && <GraduationCap className="w-3.5 h-3.5 text-purple-500" />}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
              <span>{formatDistanceToNow(post.createdAt.toDate())}</span>
              <span className="w-0.5 h-0.5 bg-slate-700 rounded-full"></span>
              {post.privacy === 'public' ? <Globe className="w-2.5 h-2.5" /> : post.privacy === 'friends' ? <Users className="w-2.5 h-2.5" /> : <LockIcon className="w-2.5 h-2.5" />}
            </div>
          </div>
        </Link>
        
        {(profile?.uid === post.authorId || profile?.email === 'dalinadjib1990@gmail.com') && (
          <button onClick={handleDelete} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {post.background ? (
          <div className="p-8 rounded-2xl flex items-center justify-center text-center text-lg sm:text-xl font-black text-white min-h-[160px] shadow-inner" style={{ background: post.background }}>
            <p className="leading-tight drop-shadow-md">{post.content}</p>
          </div>
        ) : (
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-bold">{post.content}</p>
        )}
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div className="px-2 pb-2">
          <img src={post.imageUrl} className="w-full h-auto max-h-[500px] object-cover rounded-2xl border border-white/5" alt="" loading="lazy" />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.5 }}
                  animate={{ opacity: 1, y: -50, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.5 }}
                  className="absolute bottom-full left-0 mb-2 bg-slate-900 border border-slate-700 rounded-full flex items-center gap-2 p-1.5 shadow-2xl z-50 pointer-events-auto"
                >
                  {REACTIONS.map((re) => (
                    <motion.button
                      key={re.type}
                      whileHover={{ scale: 1.3 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReaction(re.type)}
                      className="text-2xl hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
                      title={re.label}
                    >
                      {re.emoji}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => handleReaction(currentReaction ? currentReaction : 'like')} 
              onMouseDown={startReactionTimer}
              onMouseUp={clearReactionTimer}
              onMouseLeave={clearReactionTimer}
              onTouchStart={startReactionTimer}
              onTouchEnd={clearReactionTimer}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${currentReaction ? 'bg-white/5 ' + reactionData?.color : 'text-slate-400 hover:bg-slate-800'}`}
            >
              {currentReaction ? (
                <span className="text-lg">{reactionData?.emoji}</span>
              ) : (
                <ThumbsUp className={`w-4.5 h-4.5 ${isLiked ? 'fill-current text-blue-500' : ''}`} />
              )}
              <span>{likes.length > 0 ? likes.length : 'إعجاب'}</span>
            </button>
            <button
               onClick={() => setShowReactions(!showReactions)}
               className="p-1 px-2 text-slate-500 hover:text-purple-400 transition-all"
            >
               <Smile className="w-4 h-4 opacity-50" />
            </button>
          </div>
          
          <button 
            onClick={() => setShowComments(!showComments)} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-slate-400 hover:bg-slate-800 transition-all"
          >
            <MessageCircle className="w-4.5 h-4.5" />
            <span>{commentCount > 0 ? commentCount : 'تعليق'}</span>
          </button>
        </div>
        <button className="p-2 text-slate-500 hover:text-slate-300">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="p-3 border-t border-white/5 space-y-3 bg-slate-950/20">
          <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {comments.map(c => <CommentItem key={c.id} comment={c} />)}
            {comments.length === 0 && <p className="text-[10px] text-center text-slate-600 font-bold uppercase py-2">No comments yet</p>}
          </div>
          <form onSubmit={handleComment} className="flex gap-2 relative">
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="اكتب تعليقاً..." 
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 font-bold"
            />
            <button className="bg-purple-600 p-2 rounded-xl text-white shadow-lg active:scale-95 transition-transform" disabled={loading}>
              {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
