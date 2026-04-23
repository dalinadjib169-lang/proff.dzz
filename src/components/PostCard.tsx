import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, getDocs, writeBatch, increment, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Post, Comment } from '../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, GraduationCap, Send, Edit3, Trash2, Globe, Users, Lock as LockIcon, ChevronDown, X, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import React from 'react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { playSound } from '../lib/sounds';
import CommentItem from './CommentItem';
import { useUpload } from '../hooks/useUpload';

interface PostCardProps {
  post: Post;
  key?: string;
}

export default function PostCard({ post }: PostCardProps) {
  const { profile } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [reactions, setReactions] = useState<Record<string, string>>(post.reactions || {});
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [privacy, setPrivacy] = useState(post.privacy || 'public');

  const reactionEmojis = {
    like: '👍',
    love: '❤️',
    haha: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😡'
  };

  useEffect(() => {
    if (profile) {
      setIsLiked(post.likes?.includes(profile.uid) || !!reactions[profile.uid]);
    }
  }, [profile, post.likes, reactions]);

  const handleReaction = async (type: string) => {
    if (!profile) return;
    const postRef = doc(db, 'posts', post.id);
    
    try {
      const newReactions = { ...reactions };
      if (newReactions[profile.uid] === type) {
        delete newReactions[profile.uid];
      } else {
        newReactions[profile.uid] = type;
        playSound('like');
        
        if (post.authorId !== profile.uid) {
          await addDoc(collection(db, 'notifications'), {
            recipientId: post.authorId,
            senderId: profile.uid,
            senderName: profile.displayName,
            type: 'like',
            reactionType: type,
            postId: post.id,
            read: false,
            createdAt: serverTimestamp(),
            clientCreatedAt: Date.now(),
          });
        }
      }
      
      setReactions(newReactions);
      await updateDoc(postRef, { reactions: newReactions });
      setShowReactions(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!post?.id) return;
    try {
      // Delete comments first
      const commentsQuery = query(collection(db, 'comments'), where('postId', '==', post.id));
      const commentsSnapshot = await getDocs(commentsQuery);
      
      const batch = writeBatch(db);
      commentsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete post
      batch.delete(doc(db, 'posts', post.id));
      
      await batch.commit();
      playSound('notification');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${post.id}`);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateDoc(doc(db, 'posts', post.id), { 
        content: editContent,
        privacy: privacy
      });
      setIsEditing(false);
      setShowMenu(false);
      playSound('post');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const updatePrivacy = async (newPrivacy: 'public' | 'friends' | 'private') => {
    try {
      await updateDoc(doc(db, 'posts', post.id), { 
        privacy: newPrivacy
      });
      setPrivacy(newPrivacy);
      setShowMenu(false);
      playSound('post');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${post.id}`);
    }
  };

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  useEffect(() => {
    if (!showComments || !post?.id) {
      setComments([]);
      return;
    }

    const q = query(collection(db, 'comments'), where('postId', '==', post.id), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          ...data,
          id: doc.id, 
          createdAt: data.createdAt || Timestamp.now(),
          clientCreatedAt: data.clientCreatedAt || Date.now()
        };
      }) as any as Comment[];
      
      // Secondary sort for instant local appearance
      commentsData.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : a.createdAt;
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : b.createdAt;
        return timeA - timeB;
      });
      
      setComments(commentsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });

    return () => unsubscribe();
  }, [showComments, post.id]);

  const { startUpload } = useUpload();
  const commentFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    startUpload(file, 'comment', {
      postId: post.id,
      authorId: profile.uid,
      authorName: profile.displayName,
      authorPhoto: profile.photoURL,
      content: newComment.trim() || 'تعليق بصورة ✨',
    });
    setNewComment('');
    if (commentFileInputRef.current) commentFileInputRef.current.value = '';
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;

    try {
      const commentData: any = {
        postId: post.id,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: newComment,
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
      };

      if (replyTo) {
        commentData.parentId = replyTo.parentId || replyTo.id;
        commentData.replyTo = replyTo.authorName;
      }

      await addDoc(collection(db, 'comments'), commentData);

      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: increment(1)
      });

      playSound('comment');

      // Notification
      const recipientId = replyTo ? replyTo.authorId : post.authorId;
      if (recipientId !== profile.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: recipientId,
          senderId: profile.uid,
          senderName: profile.displayName,
          type: 'comment',
          postId: post.id,
          read: false,
          createdAt: serverTimestamp(),
          clientCreatedAt: Date.now(),
        });
      }

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const batch = writeBatch(db);
      
      // Find replies if this is a parent comment
      const repliesQuery = query(collection(db, 'comments'), where('parentId', '==', commentId));
      const repliesSnapshot = await getDocs(repliesQuery);
      
      let countToDelete = 1;
      batch.delete(doc(db, 'comments', commentId));
      
      repliesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        countToDelete++;
      });
      
      // Update post comment count
      batch.update(doc(db, 'posts', post.id), {
        commentCount: increment(-countToDelete)
      });
      
      await batch.commit();
      playSound('notification');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: `Shared from ${post.authorName}: \n\n${post.content}`,
        imageUrl: post.imageUrl || '',
        videoUrl: post.videoUrl || '',
        likes: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
      });
      playSound('post');
      alert('Post shared successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-800 hover:border-purple-500/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Link to={`/profile/${post.authorId}`} className="flex items-center gap-3 sm:gap-4 group/author overflow-hidden">
          <img
            src={post.authorPhoto}
            alt={post.authorName}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover ring-2 ring-purple-500/10 group-hover/author:ring-purple-500/30 transition-all shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h4 className="font-black text-slate-100 group-hover/author:text-purple-400 transition-colors text-sm sm:text-base truncate">{post.authorName}</h4>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] sm:text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1 text-purple-400 bg-purple-500/10 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                  <GraduationCap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  {post.authorId === profile?.uid ? (profile?.subject || 'Teacher') : 'Teacher'}
                </span>
                {post.createdAt && (
                  <span className="whitespace-nowrap">{formatDistanceToNow(post.createdAt.toDate(), { addSuffix: false })}</span>
                )}
                {post.privacy && (
                  <div className="hidden sm:flex items-center gap-1 text-slate-600">
                    <span>•</span>
                    {post.privacy === 'public' && <Globe className="w-2.5 h-2.5" />}
                    {post.privacy === 'friends' && <Users className="w-2.5 h-2.5" />}
                    {post.privacy === 'private' && <LockIcon className="w-2.5 h-2.5" />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 relative shrink-0">
          {(post.authorId === profile?.uid || profile?.email === 'dalinadjib1990@gmail.com') && (
            <div className="flex items-center gap-1">
              {profile?.email === 'dalinadjib1990@gmail.com' && post.authorId !== profile?.uid && (
                <span className="hidden sm:inline text-[9px] font-black bg-red-500/10 text-red-500 px-2 py-1 rounded-lg border border-red-500/20 uppercase tracking-tighter">Admin</span>
              )}
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition-all"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

            <AnimatePresence initial={false}>
              {showMenu && (
                <motion.div 
                  key="menu-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                />
              )}
              {showMenu && (
                <motion.div
                  key="menu-panel"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-2 space-y-1">
                    {post.authorId === profile?.uid && (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-purple-400 rounded-xl transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                          تعديل المنشور
                        </button>
                        
                        <div className="h-px bg-slate-800 my-1 mx-2" />
                        
                        <div className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          الخصوصية - Privacy
                        </div>
                        
                        <button
                          onClick={() => updatePrivacy('public')}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${privacy === 'public' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-400 hover:bg-slate-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4" />
                            عام - Public
                          </div>
                          {privacy === 'public' && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />}
                        </button>

                        <button
                          onClick={() => updatePrivacy('friends')}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${privacy === 'friends' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-400 hover:bg-slate-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4" />
                            الزملاء - Friends
                          </div>
                          {privacy === 'friends' && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />}
                        </button>

                        <button
                          onClick={() => updatePrivacy('private')}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${privacy === 'private' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-400 hover:bg-slate-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <LockIcon className="w-4 h-4" />
                            أنا فقط - Private
                          </div>
                          {privacy === 'private' && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />}
                        </button>

                        <div className="h-px bg-slate-800 my-1 mx-2" />
                      </>
                    )}

                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف المنشور
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-100 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium min-h-[100px]"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <select 
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as any)}
                className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg outline-none"
              >
                <option value="public">Public - للجميع</option>
                <option value="friends">Friends - الزملاء فقط</option>
                <option value="private">Private - أنا فقط</option>
              </select>
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 text-slate-400 font-bold text-xs">Cancel</button>
                <button onClick={handleUpdate} className="px-4 py-1.5 bg-purple-600 text-white rounded-lg font-bold text-xs">Save</button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`rounded-3xl overflow-hidden transition-all ${post.background && post.content.length < 150 ? `${post.background} p-12 flex items-center justify-center text-center min-h-[250px] shadow-inner` : ''}`}>
            <p className={`${post.background && post.content.length < 150 ? 'text-3xl md:text-4xl font-black text-white drop-shadow-lg' : post.content.length < 100 ? 'text-2xl font-black text-slate-100' : 'text-lg font-medium text-slate-100'} leading-relaxed whitespace-pre-wrap`}>
              {post.content}
            </p>
          </div>
        )}
        {post.imageUrl && (
          <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-inner">
            <img 
              src={post.imageUrl} 
              alt="Post media" 
              className="w-full object-cover max-h-[500px] hover:scale-105 transition-transform duration-700" 
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        {post.videoUrl && (
          <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-inner bg-black">
            <video 
              src={post.videoUrl} 
              controls 
              className="w-full max-h-[500px]"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <div className="flex items-center gap-1 sm:gap-4 relative">
          <div className="relative">
            <button 
              onMouseEnter={() => setShowReactions(true)}
              onClick={() => handleReaction('like')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-90 ${
                reactions[profile?.uid || ''] 
                  ? 'bg-purple-500/10 text-purple-500' 
                  : 'text-slate-500 hover:bg-slate-800'
              }`}
            >
              {reactions[profile?.uid || ''] ? (
                <span className="text-xl">{reactionEmojis[reactions[profile?.uid || ''] as keyof typeof reactionEmojis]}</span>
              ) : (
                <Heart className="w-5 h-5" />
              )}
              <span>{Object.keys(reactions).length}</span>
            </button>

            <AnimatePresence initial={false}>
              {showReactions && (
                <motion.div 
                  key="reactions-picker"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: -50, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.8 }}
                  onMouseLeave={() => setShowReactions(false)}
                  className="absolute left-0 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-full p-1.5 flex gap-1 shadow-2xl z-50"
                >
                  {Object.entries(reactionEmojis).map(([type, emoji]) => (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-125 transition-transform active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:bg-slate-800 rounded-2xl font-black text-sm transition-all group"
          >
            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>{post.commentCount}</span>
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:bg-slate-800 rounded-2xl font-black text-sm transition-all group"
          >
            <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
        <button className="p-2.5 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-2xl transition-all">
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div 
            key="comments-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-slate-800 space-y-4"
          >
            <form onSubmit={handleAddComment} className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
                {replyTo && (
                  <motion.div 
                    key="reply-indicator"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-xl"
                  >
                    <p className="text-xs font-bold text-purple-400">
                      الرد على <span className="font-black">{replyTo.authorName}</span>
                    </p>
                    <button 
                      type="button" 
                      onClick={() => setReplyTo(null)}
                      className="p-1 hover:bg-purple-500/20 rounded-lg transition-all"
                    >
                      <X className="w-3.5 h-3.5 text-purple-400" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex gap-3">
                <img 
                  src={profile?.photoURL} 
                  className="w-8 h-8 rounded-lg object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={replyTo ? "اكتب ردك..." : "Write a comment..."}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-12 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium text-slate-100"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <input 
                    type="file" 
                    ref={commentFileInputRef} 
                    onChange={handleCommentImageSelect} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => commentFileInputRef.current?.click()}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-400">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {comments.filter(c => !c.parentId).map((comment) => (
                  <motion.div 
                    key={comment.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-2"
                  >
                    <CommentItem 
                      comment={comment} 
                      postId={post.id} 
                      onReply={setReplyTo}
                      onDelete={handleDeleteComment}
                      canEdit={profile?.uid === comment.authorId}
                      canDelete={profile?.uid === comment.authorId || profile?.uid === post.authorId}
                    />
                    {/* Render Replies */}
                    <AnimatePresence initial={false}>
                      {comments.filter(r => r.parentId === comment.id).map(reply => (
                        <motion.div 
                          key={reply.id}
                          initial={{ opacity: 0, height: 0, x: -10 }}
                          animate={{ opacity: 1, height: 'auto', x: 0 }}
                          exit={{ opacity: 0, height: 0, x: -10 }}
                        >
                          <CommentItem 
                            comment={reply}
                            postId={post.id}
                            onReply={setReplyTo}
                            onDelete={handleDeleteComment}
                            canEdit={profile?.uid === reply.authorId}
                            canDelete={profile?.uid === reply.authorId || profile?.uid === post.authorId}
                            isReply
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence initial={false}>
        {showDeleteConfirm && (
          <motion.div 
            key="delete-confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              key="delete-confirm-panel"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">حذف المنشور؟</h3>
              <p className="text-sm text-slate-400 mb-6">
                هل أنت متأكد من حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  حذف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
