import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Heart, Sparkles, MessageCircle, MoreVertical, Image as ImageIcon, Video, Volume2, Mic } from 'lucide-react';
import { Story } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex = 0, isOpen, onClose }) => {
  const { profile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const story = stories[currentIndex];
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isOpen && story?.audioUrl) {
      console.log('StoryViewer: Attempting to play audio:', story.audioUrl);
      setAudioError(null);
      
      const audio = audioRef.current;
      if (audio) {
        audio.crossOrigin = "anonymous";
        audio.src = story.audioUrl;
        audio.load();
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name === 'NotAllowedError') {
               console.warn("StoryViewer: Autoplay blocked. User must interact first.");
            } else {
               console.error("StoryViewer: Audio playback error:", error);
               setAudioError(error.message);
            }
          });
        }
      }
    } else {
      audio.pause();
      audio.src = '';
      audio.load();
    }

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [isOpen, currentIndex, story?.audioUrl]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (100 / 50); // 5 seconds per story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, handleNext]);

  // Mark story as seen
  useEffect(() => {
    if (isOpen && story && profile && !story.seenBy?.includes(profile.uid)) {
      const markAsSeen = async () => {
        try {
          await updateDoc(doc(db, 'stories', story.id), {
            seenBy: arrayUnion(profile.uid)
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `stories/${story.id}`);
        }
      };
      markAsSeen();
    }
  }, [isOpen, story?.id, profile?.uid]);

  if (!isOpen || !story) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black flex items-center justify-center">
      <div className="w-full h-full max-w-lg relative overflow-hidden bg-slate-900 shadow-2xl flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-4 inset-x-4 flex gap-1 z-50">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500"
                initial={false}
                animate={{ 
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* User Info */}
        <div className="absolute top-8 inset-x-4 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            {story.userPhotoURL && <img src={story.userPhotoURL} className="w-10 h-10 rounded-full border-2 border-emerald-500" alt="" />}
            <div>
              <p className="text-white font-black text-sm">{story.userDisplayName}</p>
              <p className="text-white/50 text-[10px] font-bold">
                {new Date(story.createdAt?.toDate?.() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div className="flex-1 relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={story.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full h-full"
            >
              {story.type === 'image' ? (
                <div className="w-full h-full relative">
                  {story.contentUrl ? (
                    <img src={story.contentUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                </div>
              ) : story.type === 'video' ? (
                <div className="w-full h-full bg-black relative">
                  {story.contentUrl ? (
                    <video 
                      src={story.contentUrl} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-contain"
                      onEnded={handleNext}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
                </div>
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center p-12 text-center relative overflow-hidden perspective-[1000px]"
                  style={{ 
                    backgroundImage: story.background, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <div className="absolute inset-0 bg-black/40 z-0" />
                  
                  {/* 3D Network Background Effect */}
                  <div className="absolute inset-0 z-0 opacity-40 pointer-events-none flex items-center justify-center">
                    <motion.div 
                      initial={{ rotateX: 60, scale: 2 }}
                      animate={{ 
                        translateY: [0, 20, 0],
                        rotateZ: [0, 5, 0]
                      }}
                      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                      className="w-[200%] h-[200%]"
                      style={{
                        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.15) 2px, transparent 2px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 2px, transparent 2px)`,
                        backgroundSize: '50px 50px',
                        transformStyle: 'preserve-3d',
                      }}
                    />
                    <motion.div
                      animate={{
                         backgroundPosition: ['0px 0px', '0px 50px']
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 w-[200%] h-[200%] opacity-50"
                      style={{
                        backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.2) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px',
                        rotateX: '60deg',
                        scale: 2,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80" />
                  </div>

                  <p className="text-3xl font-black text-white font-amiri leading-relaxed relative z-10 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                    {story.text}
                  </p>
                </div>
              )}

              {/* Caption (for images/videos) */}
              {(story.type !== 'text' && story.text) && (
                <div className="absolute inset-x-8 bottom-32 text-center z-20">
                  <p className="text-xl font-black text-white font-amiri leading-relaxed drop-shadow-lg">
                    {story.text}
                  </p>
                </div>
              )}

              {/* Attached Dua */}
              {story.duaAttached && (
                <div className="absolute top-24 inset-x-8 z-20">
                   <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 p-6 rounded-3xl text-center shadow-2xl"
                   >
                     <div className="flex justify-center mb-3">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                           <Heart className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                        </div>
                     </div>
                     <p className="text-lg font-black text-white font-amiri leading-tight">
                        {story.duaAttached}
                     </p>
                   </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Tap Zones */}
          <div className="absolute inset-0 flex z-30">
            <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
            <div className="w-1/3 h-full" />
            <div className="w-1/3 h-full cursor-pointer" onClick={handleNext} />
          </div>
        </div>

        {/* Footer Interaction */}
        <audio 
          ref={audioRef} 
          className="hidden" 
          onPlay={() => setIsAudioPlaying(true)}
          onPause={() => setIsAudioPlaying(false)}
          onLoadStart={() => {
            console.log('StoryViewer: Audio load start');
            setAudioError(null);
          }}
          onCanPlay={() => console.log('StoryViewer: Audio can play')}
          onError={(e) => {
            const error = (e.target as HTMLAudioElement).error;
            const message = error?.message || "Source not supported or blocked by CORS";
            console.error(`StoryViewer: Audio element error [Code: ${error?.code}]: ${message}`);
            setAudioError(message);
          }}
        />

        {/* Audio Status indicator if exists */}
        {story.audioUrl && (
          <div className="absolute top-20 right-4 z-50 flex items-center gap-2">
            <button 
              onClick={() => {
                if (audioRef.current) {
                  if (isAudioPlaying) audioRef.current.pause();
                  else audioRef.current.play().catch(e => setAudioError(e.message));
                }
              }}
              className={`p-2 rounded-full backdrop-blur-md border ${isAudioPlaying ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/10 border-white/20 text-white'}`}
            >
               {isAudioPlaying ? <Volume2 className="animate-pulse w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            {audioError && <span className="text-[8px] font-bold text-red-400 bg-black/50 px-2 py-1 rounded">Error Loading Audio</span>}
          </div>
        )}
        <div className="p-6 bg-transparent border-t border-white/5 relative z-50 flex gap-4">
          <div className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-white/50" />
            <input 
              type="text" 
              placeholder="اكتب تعليقاً..."
              className="bg-transparent text-white font-bold outline-none flex-1 placeholder:text-white/30 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <button className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-emerald-500/20 transition-all">
            <Heart className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
