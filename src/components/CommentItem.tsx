import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Comment } from '../types';
import { MoreHorizontal, Edit3, Trash2, Reply, Send, X, Image as ImageIcon } from 'lucide-react';
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
}

export default function CommentItem({ 
  comment, 
  postId, 
  onReply, 
  onDelete, 
  canDelete = false, 
  canEdit = false, 
  isReply = false 
}: CommentItemProps) {
  const { profile } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

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

  return (
    <div className={`flex gap-3 group/comment relative ${isReply ? 'ml-8 mt-2' : ''}`}>
      {isReply && (
        <div className="absolute -left-4 top-0 bottom-1/2 w-4 border-l-2 border-b-2 border-slate-800 rounded-bl-xl" />
      )}
      <img 
        src={comment.authorPhoto} 
        className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-800 z-10" 
        referrerPolicy="no-referrer"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 group-hover/comment:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-black text-slate-100">{comment.authorName}</h5>
              {comment.replyTo && (
                <span className="text-[10px] text-purple-400 font-bold">
                  رد على {comment.replyTo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500">
                {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate()) : 'Just now'}
              </span>
              {(canEdit || canDelete) && (
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
                        key="comment-menu-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowMenu(false)} 
                      />
                    )}
                    {showMenu && (
                      <motion.div
                        key="comment-menu-panel"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 mt-1 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                      >
                        {canEdit && (
                          <button
                            onClick={() => { setIsEditing(true); setShowMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-800 hover:text-purple-400 transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                        )}
                        {canDelete && (
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
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-purple-500/50 transition-all min-h-[60px]"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="px-2 py-1 text-[10px] text-slate-500 font-bold">إلغاء</button>
                <button onClick={handleUpdate} className="px-3 py-1 bg-purple-600 text-white rounded-lg font-bold text-[10px]">حفظ</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {comment.content && <p className="text-sm text-slate-300 font-medium leading-relaxed">{comment.content}</p>}
              {comment.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-900 shadow-inner max-w-sm">
                  <img 
                    src={comment.imageUrl} 
                    alt="Comment media" 
                    className="w-full object-cover max-h-60 hover:scale-105 transition-transform duration-500" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {!isEditing && (
          <div className="flex items-center gap-4 mt-1 ml-2">
            <button 
              onClick={() => onReply(comment)}
              className="text-[10px] font-black text-slate-500 hover:text-purple-400 transition-all flex items-center gap-1"
            >
              <Reply className="w-3 h-3" />
              رد
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
