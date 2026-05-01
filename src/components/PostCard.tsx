import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, increment, Timestamp, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Post, Comment as CommentType, GroupPost } from '../types';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, GraduationCap, Send, Trash2, Globe, Users, Lock as LockIcon, X, Smile, Edit2, Reply, Image as ImageIcon, Camera, EyeOff, Loader2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../lib/sounds';
import { useUpload } from '../hooks/useUpload';
import { cn } from '../lib/utils';

// Helper for dropdown
function Dropdown({ children, trigger, align = 'right' }: { children: React.ReactNode, trigger: React.ReactNode, align?: 'left' | 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="cursor-pointer">
        {trigger}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={cn(
              "absolute mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] py-2",
              align === 'right' ? "right-0" : "left-0"
            )}
          >
            {React.Children.map(children, (child: any) => 
              child && React.cloneElement(child, { onClick: (...args: any[]) => {
                setIsOpen(false);
                child.props.onClick?.(...args);
              }})
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import CommentItem from './CommentItem';

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-400' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'haha', emoji: '😄', label: 'Haha', color: 'text-yellow-400' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-400' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-400' },
  { type: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-500' },
];

import ImageLightbox from './ImageLightbox';

export default function PostCard({ post, isGroupPost, groupId, onDelete }: { post: Post | GroupPost, isGroupPost?: boolean, groupId?: string, onDelete?: () => void }) {
  const { profile, user } = useAuth();
  const { startUpload } = useUpload();
  const [likes, setLikes] = useState(post.likes || []);
  const [reactions, setReactions] = useState<Record<string, string>>(post.reactions || {});
  const [isLiked, setIsLiked] = useState(post.likes?.includes(profile?.uid || ''));
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<CommentType | null>(null);
  const [editingComment, setEditingComment] = useState<CommentType | null>(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editedPostContent, setEditedPostContent] = useState(post.content);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [loading, setLoading] = useState(false);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const reactionTimeoutRef = React.useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const collectionName = isGroupPost ? 'group_posts' : 'posts';
  const commentCollectionName = isGroupPost ? 'group_comments' : 'comments';

  useEffect(() => {
    setIsLiked(likes.includes(profile?.uid || ''));
  }, [likes, profile?.uid]);

  const handleReport = async () => {
    if (!user || !profile) return;
    const reason = window.prompt('يرجى كتابة سبب التبليغ:');
    if (!reason) return;

    try {
      const postRef = doc(db, collectionName, post.id);
      await updateDoc(postRef, {
        reports: arrayUnion({
          userId: user.uid,
          reason,
          createdAt: serverTimestamp()
        })
      });
      alert('تم إرسال التبليغ للإدارة. شكراً لتعاونكم.');
    } catch (error) {
      console.error("Error reporting post:", error);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    try {
      await deleteDoc(doc(db, collectionName, post.id));
      if (onDelete) onDelete();
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

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
      await updateDoc(doc(db, collectionName, post.id), {
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
      collection(db, commentCollectionName), 
      where('postId', '==', post.id), 
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      const allComments = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        createdAt: d.data().createdAt || Timestamp.now()
      } as CommentType));
      
      // Sort manually to avoid composite index requirement
      const sorted = allComments.sort((a, b) => 
        (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
      );
      setComments(sorted);
    });
  }, [showComments, post.id]);

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setCommentImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || loading) return;
    if (!newComment.trim() && !commentImage) return;
    
    setLoading(true);
    const text = newComment;
    const isReply = !!replyTo;
    const isEditing = !!editingComment;

    try {
      let imageUrl = '';
      if (commentImage) {
        imageUrl = await startUpload(commentImage, 'comment', { skipFirestore: true }) || '';
      }

      if (isEditing && editingComment) {
        await updateDoc(doc(db, commentCollectionName, editingComment.id), {
          content: text,
          updatedAt: serverTimestamp(),
          ...(imageUrl && { imageUrl })
        });
      } else {
        await addDoc(collection(db, commentCollectionName), {
          postId: post.id,
          authorId: profile.uid,
          authorName: profile.displayName,
          authorPhoto: profile.photoURL,
          content: text,
          imageUrl,
          parentId: isReply ? (replyTo.parentId || replyTo.id) : null,
          replyTo: isReply ? replyTo.authorName : null,
          createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, collectionName, post.id), {
          commentCount: increment(1)
        });
        setCommentCount(prev => prev + 1);
        playSound('comment');
      }
      
      setNewComment('');
      setReplyTo(null);
      setEditingComment(null);
      setCommentImage(null);
      setCommentImagePreview(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('حذف هذا التعليق؟')) {
      try {
        await deleteDoc(doc(db, commentCollectionName, commentId));
        await updateDoc(doc(db, collectionName, post.id), {
          commentCount: increment(-1)
        });
        setCommentCount(prev => prev - 1);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleHideComment = async (comment: CommentType) => {
    if (window.confirm('إخفاء هذا التعليق؟ سيتم حذفه من المنشور.')) {
      handleDeleteComment(comment.id);
    }
  };

  const handleUpdatePost = async () => {
    if (!editedPostContent.trim() || loading) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, collectionName, post.id), {
        content: editedPostContent.trim(),
        updatedAt: serverTimestamp()
      });
      setIsEditingPost(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `منشور من ${post.authorName} على Teac DZ`,
      text: post.content,
      url: window.location.origin + '/post/' + post.id
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('تم نسخ رابط المنشور بنجاح!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const topLevelComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl mb-4 sm:mb-6">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <Link to={`/profile/${post.authorId}`} className="flex items-center gap-3">
          <img 
            src={post.authorPhoto} 
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary/10" 
            alt="" 
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-1.2">
               <h3 className="text-sm font-black text-white">{post.authorName}</h3>
               {post.authorId === 'dalinadjib1990' && <GraduationCap className="w-3.5 h-3.5 text-primary" />}
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
              <span>{formatDistanceToNow(post.createdAt.toDate())}</span>
              <span className="w-0.5 h-0.5 bg-slate-700 rounded-full"></span>
              {post.privacy === 'public' ? <Globe className="w-2.5 h-2.5" /> : post.privacy === 'friends' ? <Users className="w-2.5 h-2.5" /> : <LockIcon className="w-2.5 h-2.5" />}
            </div>
          </div>
        </Link>
        
        <Dropdown align="left" trigger={<button className="p-2 text-slate-500 hover:text-white transition-colors"><MoreHorizontal className="w-5 h-5" /></button>}>
          {(profile?.uid === post.authorId || profile?.email === 'dalinadjib1990@gmail.com') && (
            <>
              <button onClick={() => setIsEditingPost(true)} className="w-full text-right px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center justify-end gap-2">
                <Edit2 className="w-3 h-3" /> تعديل المنشور
              </button>
              <button onClick={handleDeletePost} className="w-full text-right px-4 py-2 text-xs font-bold text-red-500 hover:bg-slate-800 flex items-center justify-end gap-2">
                <Trash2 className="w-3 h-3" /> حذف المنشور
              </button>
            </>
          )}
          {profile?.uid !== post.authorId && (
             <button onClick={handleReport} className="w-full text-right px-4 py-2 text-xs font-bold text-amber-500 hover:bg-slate-800 flex items-center justify-end gap-2">
              <Flag className="w-3 h-3" /> تبليغ للإدارة (سينيال)
            </button>
          )}
          {onDelete && (
             <button onClick={handleDeletePost} className="w-full text-right px-4 py-2 text-xs font-bold text-red-500 hover:bg-slate-800 flex items-center justify-end gap-2 border-t border-slate-800">
              <ShieldAlert className="w-3 h-3" /> حذف (أدمن المجموعة)
            </button>
          )}
        </Dropdown>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {isEditingPost ? (
          <div className="space-y-3">
            <textarea
              value={editedPostContent}
              onChange={(e) => setEditedPostContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-primary min-h-[120px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsEditingPost(false)} 
                className="px-4 py-2 text-xs font-black text-slate-400 hover:text-white transition-all uppercase"
              >
                إلغاء
              </button>
              <button 
                onClick={handleUpdatePost}
                disabled={loading}
                className="px-6 py-2 bg-primary hover:bg-primary/80 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                حفظ التعديلات
              </button>
            </div>
          </div>
        ) : post.background ? (
          <div className="p-8 rounded-2xl flex items-center justify-center text-center text-lg sm:text-xl font-black text-white min-h-[160px] shadow-inner" style={{ background: post.background }}>
            <p className="leading-tight drop-shadow-md">{post.content}</p>
          </div>
        ) : (
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-bold">{post.content}</p>
        )}
      </div>

      {/* Image */}
      {post.imageUrl && !isEditingPost && (
        <div className="px-2 pb-2">
          <div 
            className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/50 min-h-[100px] flex items-center justify-center cursor-zoom-in group/img"
            onClick={() => setLightboxSrc(post.imageUrl || null)}
          >
            <img 
              src={post.imageUrl} 
              className="w-full h-auto max-h-[500px] object-cover transition-all duration-300 group-hover/img:scale-105" 
              alt="" 
              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
              style={{ opacity: 0 }}
              loading="lazy" 
            />
          </div>
        </div>
      )}

      {/* Lightbox */}
      <ImageLightbox 
        src={lightboxSrc || ''} 
        isOpen={!!lightboxSrc} 
        onClose={() => setLightboxSrc(null)} 
      />

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
               className="p-1 px-2 text-slate-500 hover:text-primary transition-all"
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
        <button 
          onClick={handleShare}
          className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="p-3 border-t border-white/5 space-y-4 bg-slate-950/20">
          <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {topLevelComments.map(c => (
              <div key={c.id} className="space-y-3">
                <CommentItem 
                  comment={c}
                  postId={post.id}
                  isPostOwner={profile?.uid === post.authorId}
                  canEdit={profile?.uid === c.authorId}
                  canDelete={profile?.uid === c.authorId}
                  onReply={(target) => {
                    setReplyTo(target);
                    if (fileInputRef.current) fileInputRef.current.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onDelete={handleDeleteComment}
                />
                
                {/* Replies */}
                <div className="mr-8 space-y-3 border-r-2 border-white/5 pr-2">
                  {getReplies(c.id).map(reply => (
                    <CommentItem 
                      key={reply.id} 
                      comment={reply}
                      postId={post.id}
                      isReply
                      isPostOwner={profile?.uid === post.authorId}
                      canEdit={profile?.uid === reply.authorId}
                      canDelete={profile?.uid === reply.authorId}
                      onReply={() => {
                        setReplyTo(c); // Always reply to thread
                        if (fileInputRef.current) fileInputRef.current.scrollIntoView({ behavior: 'smooth' });
                      }}
                      onDelete={handleDeleteComment}
                    />
                  ))}
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-[10px] text-center text-slate-600 font-bold uppercase py-4">لا توجد تعليقات بعد</p>}
          </div>

          <div className="space-y-2">
            {replyTo && (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
                <p className="text-[10px] font-bold text-slate-400">الرد على <span className="text-primary">{replyTo.authorName}</span></p>
                <button onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
              </div>
            )}
            {editingComment && (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
                <p className="text-[10px] font-bold text-amber-500">تعديل التعليق...</p>
                <button onClick={() => { setEditingComment(null); setNewComment(''); }} className="text-slate-500 hover:text-white"><X className="w-3 h-3" /></button>
              </div>
            )}
            
            {commentImagePreview && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-800 mb-2">
                <img src={commentImagePreview} className="w-full h-full object-cover" alt="" />
                <button onClick={() => { setCommentImage(null); setCommentImagePreview(null); }} className="absolute top-1 right-1 bg-red-500 p-0.5 rounded-md text-white shadow-lg">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleComment} className="flex gap-2 items-end relative">
              <button 
                className="bg-primary p-3 rounded-2xl text-white shadow-lg active:scale-95 transition-transform disabled:opacity-50" 
                disabled={loading || (!newComment.trim() && !commentImage)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
              </button>
              <div className="flex-1 relative">
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTo ? "اكتب ردك..." : "اكتب تعليقاً..."}
                  rows={1}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-primary font-bold resize-none min-h-[40px] pr-10"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-3 bottom-2.5 text-slate-500 hover:text-primary transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <input type="file" ref={fileInputRef} onChange={handleCommentImageSelect} accept="image/*" className="hidden" />
    </div>
  );
}
