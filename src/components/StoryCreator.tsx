import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Image as ImageIcon, Video, Type, Heart, Sparkles, BookOpen, Music, Loader2, Volume2, Mic } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUpload } from '../hooks/useUpload';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { playSound } from '../lib/sounds';

interface StoryCreatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORY_BACKGROUNDS = [
  { id: 'fighter', value: 'url(https://images.unsplash.com/photo-1517409393166-4e0d9b4b0a70?auto=format&fit=crop&q=80&w=800)', label: 'Fighter Jet' },
  { id: 'cockpit', value: 'url(https://images.unsplash.com/photo-1518175510613-2e06a37eb5f0?auto=format&fit=crop&q=80&w=800)', label: 'Cockpit' },
  { id: 'emerald', value: 'linear-gradient(to bottom, #065f46, #064e3b)', label: 'Emerald' },
  { id: 'indigo', value: 'linear-gradient(to bottom, #312e81, #1e1b4b)', label: 'Night' },
  { id: 'gold', value: 'linear-gradient(to bottom, #92400e, #78350f)', label: 'Sunset' },
  { id: 'floral', value: 'url(https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=800)', label: 'Floral' },
  { id: 'masjid', value: 'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800)', label: 'Peace' },
  { id: 'kaaba', value: 'url(https://images.unsplash.com/photo-1564769625905-50e938383c59?auto=format&fit=crop&q=80&w=800)', label: 'Haram' },
  { id: 'books', value: 'url(https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=800)', label: 'Knowledge' },
  { id: 'blue-mosque', value: 'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800)', label: 'Symmetry' },
  { id: 'desert', value: 'url(https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&q=80&w=800)', label: 'Sabr' },
  { id: 'stars', value: 'url(https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&q=80&w=800)', label: 'Dua' },
  { id: 'white', value: 'linear-gradient(to bottom, #f8fafc, #e2e8f0)', label: 'Pure' }
];

const PRESET_DUAS = [
  "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
  "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
  "لا إِلَهَ إِلا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
  "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
  "يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ"
];

const PRESET_AUDIOS = [
  { id: 'fatiha', name: 'سورة الفاتحة', url: 'https://server11.mp3quran.net/hawashi/001.mp3' },
  { id: 'ikhlas', name: 'سورة الإخلاص', url: 'https://server11.mp3quran.net/hawashi/112.mp3' },
  { id: 'falaq', name: 'سورة الفلق', url: 'https://server11.mp3quran.net/hawashi/113.mp3' },
  { id: 'nas-1', name: 'سورة الناس', url: 'https://server11.mp3quran.net/hawashi/114.mp3' },
  { id: 'kahf', name: 'سورة الكهف', url: 'https://server11.mp3quran.net/hawashi/018.mp3' },
  { id: 'rahman', name: 'سورة الرحمن', url: 'https://server11.mp3quran.net/hawashi/055.mp3' },
  { id: 'waqiah', name: 'سورة الواقعة', url: 'https://server11.mp3quran.net/hawashi/056.mp3' },
  { id: 'mulk', name: 'سورة الملك', url: 'https://server11.mp3quran.net/hawashi/067.mp3' }
];

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const StoryCreator: React.FC<StoryCreatorProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const { startUpload } = useUpload();
  const [type, setType] = useState<'text' | 'image' | 'video'>('text');
  const [content, setContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(STORY_BACKGROUNDS[0].value);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [selectedPresetAudio, setSelectedPresetAudio] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [attachedDua, setAttachedDua] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setType(file.type.startsWith('video/') ? 'video' : 'image');
    
    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAudio(file);
      setSelectedPresetAudio(null);
    }
  };

  const handleCreate = async () => {
    if (!profile) return;
    if (type === 'text' && !content.trim()) return;
    if (type !== 'text' && !selectedFile) return;

    setLoading(true);
    try {
      let contentUrl = '';
      if (selectedFile) {
        const url = await startUpload(selectedFile, 'post', { skipFirestore: true });
        if (!url) throw new Error("Upload failed");
        contentUrl = url;
      }

      let audioUrl = selectedPresetAudio || '';
      if (selectedAudio) {
        const url = await startUpload(selectedAudio, 'post', { skipFirestore: true });
        if (url) audioUrl = url;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const storyData: any = {
        userId: profile.uid,
        userDisplayName: profile.displayName || 'Anonymous User',
        userPhotoURL: profile.photoURL || '',
        type,
        seenBy: [],
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      };

      if (contentUrl) storyData.contentUrl = contentUrl;
      if (audioUrl) storyData.audioUrl = audioUrl;
      if (content.trim()) storyData.text = content.trim();
      if (type === 'text' && selectedBg) storyData.background = selectedBg;
      if (attachedDua) storyData.duaAttached = attachedDua;

      await addDoc(collection(db, 'stories'), storyData);

      playSound('post');
      onClose();
      // Reset state
      setContent('');
      setSelectedFile(null);
      setSelectedAudio(null);
      setSelectedPresetAudio(null);
      setFilePreview(null);
      setType('text');
      setAttachedDua('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'stories');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-emerald-500/10 flex flex-col h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-amiri tracking-wider">إضافة دواء الروح</h2>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">شارك نورا وطمأنينة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* Preview Area */}
          <div className="aspect-[9/16] max-h-[400px] mx-auto rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl group shadow-black/50">
            {type === 'text' ? (
              <div 
                className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                style={{ 
                  backgroundImage: selectedBg, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="absolute inset-0 bg-black/30" />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب رسالة إيمانية..."
                  className="w-full bg-transparent text-white text-2xl font-black font-amiri outline-none text-center placeholder:text-white/40 resize-none min-h-[100px] relative z-10"
                />
              </div>
            ) : type === 'image' ? (
              <div className="w-full h-full relative">
                {filePreview ? (
                  <img src={filePreview} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-slate-700" />
                  </div>
                )}
                {content && (
                   <div className="absolute inset-x-4 bottom-24 p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
                      <p className="text-white text-lg font-black font-amiri text-center">{content}</p>
                   </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800">
                <Video className="w-12 h-12 text-slate-500" />
                <p className="text-slate-400 font-bold ml-2">Video Selected</p>
              </div>
            )}

            {attachedDua && (
              <div className="absolute top-8 inset-x-4 flex justify-center z-20">
                <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-6 py-2 rounded-full flex items-center gap-2">
                  <Heart className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  <span className="text-xs font-black text-emerald-50 font-amiri">{attachedDua}</span>
                  <button onClick={() => setAttachedDua('')} className="p-0.5 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-950/50 rounded-2xl border border-white/5">
              {[
                { id: 'text', icon: Type, label: 'نص' },
                { id: 'image', icon: ImageIcon, label: 'صورة' },
                { id: 'video', icon: Video, label: 'فيديو' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id === 'text') {
                      setType('text');
                      setSelectedFile(null);
                      setFilePreview(null);
                    } else {
                      fileInputRef.current?.setAttribute('accept', t.id === 'image' ? 'image/*' : 'video/*');
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                    type === t.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {type === 'text' && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الخلفية (Story Vibe)</p>
                <div className="flex flex-wrap gap-3">
                  {STORY_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBg(bg.value)}
                    className={`w-10 h-10 rounded-xl border-2 transition-all overflow-hidden ${
                        selectedBg === bg.value ? 'border-emerald-500 scale-110 shadow-lg' : 'border-transparent'
                      }`}
                    >
                      {bg.value.startsWith('url') ? (
                        <div 
                          className="w-full h-full"
                          style={{ 
                            backgroundImage: bg.value, 
                            backgroundSize: 'cover', 
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full"
                          style={{ background: bg.value }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {type !== 'text' && (
               <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">تعليق (Caption)</p>
                 <input 
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="أضف وصفاً للسطوري..."
                  className="w-full bg-slate-950/50 border border-white/5 rounded-xl p-4 text-white font-bold outline-none focus:border-emerald-500/50"
                 />
               </div>
            )}

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ارفق دعاء مأثور (Gift of Dua)</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_DUAS.map((dua) => (
                  <button
                    key={dua}
                    onClick={() => setAttachedDua(dua)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black font-amiri transition-all border ${
                      attachedDua === dua 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {dua}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">أضف انشودة أو دعاء صوتي (Audio)</p>
                
                {/* Presets */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_AUDIOS.map((aud) => (
                    <button
                      key={aud.id}
                      onClick={() => {
                        setSelectedPresetAudio(aud.url);
                        setSelectedAudio(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border flex items-center gap-2 ${
                        selectedPresetAudio === aud.url 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      {aud.name}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => audioInputRef.current?.click()}
                  className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${
                    selectedAudio 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  {selectedAudio ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span className="text-xs font-black">
                    {selectedAudio ? selectedAudio.name : 'أو تحميل مقطع صوتي خاص بك'}
                  </span>
                  {(selectedAudio || selectedPresetAudio) && (
                    <X 
                      className="w-4 h-4 ml-auto hover:text-red-500" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedAudio(null); 
                        setSelectedPresetAudio(null); 
                      }}
                    />
                  )}
                </button>
                <input type="file" ref={audioInputRef} onChange={handleAudioSelect} accept="audio/*" className="hidden" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 shrink-0">
          <button
            disabled={loading || (type === 'text' && !content.trim()) || (type !== 'text' && !selectedFile)}
            onClick={handleCreate}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-4 rounded-[1.5rem] font-black tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 rotate-180" />}
            <span>نشر في دواء الروح</span>
          </button>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
      </motion.div>
    </div>
  );
};
