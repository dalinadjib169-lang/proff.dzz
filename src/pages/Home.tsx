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
      limit(50)
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
    { type: 'gradient', value: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)' },
    { type: 'gradient', value: 'linear-gradient(to right, #f093fb 0%, #f5576c 100%)' },
    { type: 'gradient', value: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)' },
    { type: 'gradient', value: 'linear-gradient(to right, #fa709a 0%, #fee140 100%)' },
    { type: 'image', value: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800)', label: 'Bahiyah (Sea)' },
    { type: 'image', value: 'url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800)', label: 'Jibal (Mountains)' },
    { type: 'image', value: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800)', label: 'Ashjar (Trees)' },
    { type: 'image', value: 'url(https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&q=80&w=800)', label: 'Sama (Sky)' },
    { type: 'image', value: 'url(https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=800)', label: 'قطط كيوت (Cats)' },
    { type: 'image', value: 'url(https://flagpedia.net/data/flags/w580/dz.png)', label: 'علم الجزائر (Algeria)' },
    { type: 'image', value: 'url(https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800)', label: 'رياضة (Sports)' },
    { type: 'image', value: 'url(https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?auto=format&fit=crop&q=80&w=800)', label: 'مضحك (Funny)' },
  ];

  return (
    <div className="space-y-6">
      <PrayerWaterBar />

      <div className="bg-slate-900/20 backdrop-blur-3xl border border-slate-800/50 rounded-2xl p-4 shadow-lg overflow-hidden relative">
        {selectedBg && !selectedImage && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: selectedBg, backgroundSize: 'cover', backgroundPosition: 'center' }}>
             <div className="absolute inset-0 bg-black/40"></div>
          </div>
        )}
        <div className="flex gap-3 relative z-10">
          <img src={profile?.photoURL} className="w-12 h-12 rounded-xl object-cover ring-2 ring-primary/20" alt="" referrerPolicy="no-referrer" />
          <div className="flex-1 space-y-3">
            <div className={`relative rounded-3xl overflow-hidden transition-all shadow-2xl group/preview ${selectedBg && !selectedImage ? 'min-h-[220px] flex items-center justify-center p-8' : ''}`} style={{ background: !selectedImage ? selectedBg || 'transparent' : 'transparent', backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="بماذا تفكر يا زميلي..."
                className={`w-full bg-slate-950/20 border border-slate-800/50 rounded-xl p-3 text-white placeholder:text-slate-400/70 outline-none focus:border-primary resize-none font-black transition-all ${selectedBg && !selectedImage ? 'text-center text-xl sm:text-2xl min-h-[220px] bg-transparent border-none placeholder:text-white/40 drop-shadow-2xl' : 'min-h-[80px]'}`}
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
                      key={bg.value}
                      onClick={() => setSelectedBg(bg.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all relative group ${selectedBg === bg.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                      style={{ background: bg.value, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      title={bg.label}
                    >
                      {bg.type === 'image' && (
                        <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity rounded-md">
                           <span className="text-[6px] text-white font-black uppercase text-center px-1 leading-none">{bg.label}</span>
                        </div>
                      )}
                    </button>
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
