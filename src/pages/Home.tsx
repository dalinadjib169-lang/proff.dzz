import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, serverTimestamp, where, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import { Send, GraduationCap, X, Globe, Users, Lock, ChevronDown, Image as ImageIcon, Loader2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { playSound } from '../lib/sounds';
import { useUpload } from '../hooks/useUpload';
import { PrayerWaterBar } from '../components/PrayerWaterBar';

export default function Home() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { startUpload } = useUpload();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'posts'),
      where('privacy', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    return onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt || Timestamp.now()
      })) as any as Post[];
      
      postsData.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });
  }, [profile]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !selectedImage) return;
    if (!profile) return;

    setLoading(true);
    try {
      if (selectedImage) {
        await startUpload(selectedImage, 'post', {
          authorId: profile.uid,
          authorName: profile.displayName || 'Teacher',
          authorPhoto: profile.photoURL || '',
          content: content.trim() || 'Shared an image ✨',
          privacy: privacy,
          likes: [],
          commentCount: 0,
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          authorId: profile.uid,
          authorName: profile.displayName || 'Teacher',
          authorPhoto: profile.photoURL || '',
          content: content.trim(),
          privacy: privacy,
          background: content.length < 150 ? selectedBg : null,
          likes: [],
          commentCount: 0,
          imageUrl: '',
          createdAt: serverTimestamp(),
        });
        playSound('post');
      }
      setSelectedBg(null);
      setSelectedImage(null);
      setImagePreview(null);
      setContent('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PrayerWaterBar />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex gap-3">
          <img src={profile?.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
          <div className="flex-1 space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="بماذا تفكر يا زميلي..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder:text-slate-500 outline-none focus:border-purple-500 resize-none min-h-[80px] font-bold"
            />
            {imagePreview && (
              <div className="relative rounded-xl overflow-hidden border border-slate-800">
                <img src={imagePreview} className="w-full h-auto max-h-60 object-cover" alt="" />
                <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-red-500 p-1 rounded-lg text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-400 font-bold hover:text-purple-400">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                <span className="text-xs uppercase">صورة</span>
              </button>
              <button
                onClick={() => handleCreatePost()}
                disabled={loading || (!content.trim() && !selectedImage)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-black transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="text-sm">نشر الآن</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />

      <div className="space-y-4">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  );
}
