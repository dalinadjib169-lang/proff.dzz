import React, { useState, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Comment } from '../types';
import { MoreHorizontal, Edit3, Trash2, Reply, Send, X, Image as ImageIcon, ThumbsUp, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../lib/sounds';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReply: (comment: Comment) => void;
  onDelete?: (commentId: string) => void;
  canDelete?: boolean;
  canEdit?: boolean;
  isReply?: boolean;
  isPostOwner?: boolean;
}

import ImageLightbox from './ImageLightbox';

export default function CommentItem({ 
  comment, 
  postId, 
  onReply, 
  onDelete, 
  canDelete = false, 
  canEdit = false, 
  isReply = false,
  isPostOwner = false
}: CommentItemProps) {
  const { profile } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isLiking, setIsLiking] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const pressTimer = useRef<any>(null);

  const likes = comment.likes || [];
  const isLiked = profile?.uid ? likes.includes(profile.uid) : false;

  const handleLike = async () => {
    if (!profile?.uid || isLiking) return;
    setIsLiking(true);
    playSound('like');
    
    try {
      await updateDoc(doc(db, 'comments', comment.id), {
        likes: isLiked ? arrayRemove(profile.uid) : arrayUnion(profile.uid)
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التعليق؟")) return;
    
    if (onDelete) {
      onDelete(comment.id);
      return;
    }

    try {
      await deleteDoc(doc(db, 'comments', comment.id));
      playSound('notification');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${comment.id}`);
    }
  };

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', comment.id), {
        content: editContent,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      setShowMenu(false);
      playSound('post');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${comment.id}`);
    }
  };

  // Simulated long press for mobile
  const handleTouchStart = () => {
    pressTimer.current = setTimeout(() => {
      if (canEdit || canDelete || isPostOwner) {
        setShowMenu(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 600);
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div className={`flex gap-2 group/comment relative ${isReply ? 'mr-6 mt-2' : ''}`}>
      {isReply && (
        <div className="absolute -right-3 top-0 bottom-1/2 w-3 border-r-2 border-b-2 border-slate-800 rounded-br-xl" />
      )}
      <img 
        src={comment.authorPhoto} 
        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-800 z-10 flex-shrink-0" 
        referrerPolicy="no-referrer"
        alt=""
      />
      <div className="flex-1 min-w-0">
        <div 
          className="bg-slate-950/80 rounded-2xl p-2.5 border border-slate-800 group-hover/comment:border-slate-700 transition-all cursor-default"
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <h5 className="text-[11px] font-black text-primary truncate">{comment.authorName}</h5>
              {comment.replyTo && (
                <span className="text-[9px] text-primary/60 font-bold truncate">
                  رد على {comment.replyTo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-600">
                {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate()) : 'الآن'}
              </span>
              {(canEdit || canDelete || isPostOwner) && (
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 text-slate-600 hover:text-slate-300 transition-all opacity-0 group-hover/comment:opacity-100"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  
                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-1 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        {canEdit && (
                          <button
                            onClick={() => { setIsEditing(true); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-800 hover:text-primary transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                        )}
                        {(canDelete || isPostOwner) && (
                          <button
                            onClick={handleDelete}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            حذف
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="space-y-2 mt-2">
              <textarea
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-primary/50 transition-all min-h-[60px] resize-none"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="px-2 py-1 text-[10px] text-slate-500 font-bold">إلغاء</button>
                <button onClick={handleUpdate} className="px-3 py-1 bg-primary text-white rounded-lg font-bold text-[10px]">حفظ</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {comment.content && <p className="text-sm text-slate-200 font-medium leading-tight whitespace-pre-wrap break-words">{comment.content}</p>}
              {comment.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-white/5 bg-slate-950/50 max-w-[200px]">
                  <img 
                    src={comment.imageUrl} 
                    alt="Comment media" 
                    className="w-full object-cover max-h-48 hover:scale-105 transition-transform duration-500 cursor-zoom-in" 
                    referrerPolicy="no-referrer"
                    onClick={() => setLightboxSrc(comment.imageUrl || null)}
                  />
                </div>
              )}
            </div>
          )}

          <ImageLightbox 
            src={lightboxSrc || ''} 
            isOpen={!!lightboxSrc} 
            onClose={() => setLightboxSrc(null)} 
          />

          {likes.length > 0 && (
            <div className="absolute -bottom-2 -left-1 flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-full px-1.5 py-0.5 shadow-lg group-hover/comment:scale-110 transition-transform">
              <div className="flex items-center justify-center p-0.5 bg-blue-500 rounded-full">
                <ThumbsUp className="w-2 h-2 text-white fill-white" />
              </div>
              <span className="text-[9px] font-black text-slate-400">{likes.length}</span>
            </div>
          )}
        </div>
        
        {!isEditing && (
          <div className="flex items-center gap-4 mt-1.5 ml-2">
            <button 
              onClick={handleLike}
              disabled={isLiking}
              className={`text-[10px] font-black transition-all flex items-center gap-1 ${isLiked ? 'text-blue-400' : 'text-slate-500 hover:text-blue-400'}`}
            >
              <ThumbsUp className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
              إعجاب
            </button>
            <button 
              onClick={() => onReply(comment)}
              className="text-[10px] font-black text-slate-500 hover:text-primary transition-all flex items-center gap-1"
            >
              <Reply className="w-3 h-3" />
              رد
            </button>
          </div>
        )}
      </div>
      
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
    </div>
  );
}
