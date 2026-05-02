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
      
      postsData.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
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

  const POST_BACKGROUNDS = [
    'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(to right, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(to right, #fa709a 0%, #fee140 100%)',
    'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
    'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
    '#4f46e5',
    '#0ea5e9'
  ];

  return (
    <div className="space-y-6">
      <PrayerWaterBar />

      <div className="bg-slate-900/20 backdrop-blur-3xl border border-slate-800/50 rounded-2xl p-4 shadow-lg overflow-hidden relative">
        {selectedBg && !selectedImage && (
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: selectedBg }}></div>
        )}
        <div className="flex gap-3 relative z-10">
          <img src={profile?.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
          <div className="flex-1 space-y-3">
            <div className={`relative rounded-xl overflow-hidden transition-all ${selectedBg && !selectedImage ? 'min-h-[120px] flex items-center justify-center p-4' : ''}`} style={{ background: !selectedImage ? selectedBg || 'transparent' : 'transparent' }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="بماذا تفكر يا زميلي..."
                className={`w-full bg-slate-950/20 border border-slate-800/50 rounded-xl p-3 text-white placeholder:text-slate-500 outline-none focus:border-primary resize-none font-bold transition-all ${selectedBg && !selectedImage ? 'text-center text-lg min-h-[120px] bg-transparent border-none' : 'min-h-[80px]'}`}
              />
              {selectedBg && !selectedImage && (
                <button 
                  onClick={() => setSelectedBg(null)}
                  className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {imagePreview && (
              <div className="relative rounded-xl overflow-hidden border border-slate-800">
                <img src={imagePreview} className="w-full h-auto max-h-60 object-cover" alt="" />
                <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="absolute top-2 right-2 bg-red-500 p-1 rounded-lg text-white shadow-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!selectedImage && content.length < 150 && (
              <div className="space-y-2 pt-1">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">اختر خلفية (Post Color)</p>
                <div className="flex flex-wrap gap-2">
                  {POST_BACKGROUNDS.map(bg => (
                    <button
                      key={bg}
                      onClick={() => setSelectedBg(bg)}
                      className={`w-6 h-6 rounded-lg border-2 transition-all ${selectedBg === bg ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                      style={{ background: bg }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCreatePost()}
                  disabled={loading || (!content.trim() && !selectedImage)}
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl font-black transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
                  <span className="text-sm">نشر الآن</span>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-xl border border-white/5">
                  {privacy === 'public' ? <Globe className="w-3.5 h-3.5 text-blue-400" /> : privacy === 'friends' ? <Users className="w-3.5 h-3.5 text-green-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                  <select 
                    value={privacy} 
                    onChange={(e: any) => setPrivacy(e.target.value)}
                    className="bg-transparent text-[10px] font-black text-slate-300 uppercase outline-none cursor-pointer"
                  >
                    <option value="public">عام</option>
                    <option value="friends">زملاء</option>
                    <option value="private">خاص</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-400 font-bold hover:text-primary transition-colors">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <span className="text-xs uppercase tracking-tight">صورة</span>
                </button>
              </div>
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
