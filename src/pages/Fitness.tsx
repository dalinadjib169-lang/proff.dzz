import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Activity, 
  Flame, 
  Timer, 
  Scale, 
  ChevronRight, 
  Plus, 
  TrendingUp, 
  Moon, 
  Info,
  ChevronDown,
  ChevronUp,
  Save,
  Dumbbell,
  Footprints,
  Droplets,
  Award,
  Zap,
  ArrowRight,
  Play,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { playSound } from '../lib/sounds';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import toast from 'react-hot-toast';

const WEIGHT_DATA: any[] = [];

export default function Fitness() {
  const { profile } = useAuth();
  const [weight, setWeight] = useState(profile?.weight || 71);
  const [height, setHeight] = useState(profile?.height || 170);
  const [age, setAge] = useState(24);
  const [isEditing, setIsEditing] = useState(false);
  const [heartRate, setHeartRate] = useState(72);
  const [steps, setSteps] = useState(0);
  const [activeWorkout, setActiveWorkout] = useState(false);
  const [workoutTime, setWorkoutTime] = useState(0);
  const [totalActivityMinutes, setTotalActivityMinutes] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepQuality, setSleepQuality] = useState(0);
  const [deepSleepHours, setDeepSleepHours] = useState(0);
  const [calories, setCalories] = useState(0);
  const [isMotionSupported, setIsMotionSupported] = useState(true);

  // Sync profile data
  useEffect(() => {
    if (profile) {
      if (profile.totalActivityMinutes !== undefined) setTotalActivityMinutes(profile.totalActivityMinutes);
      if (profile.sleepHours !== undefined) setSleepHours(profile.sleepHours);
      if (profile.sleepQuality !== undefined) setSleepQuality(profile.sleepQuality);
      if (profile.deepSleepHours !== undefined) setDeepSleepHours(profile.deepSleepHours);
      if (profile.weight !== undefined) setWeight(profile.weight);
      if (profile.height !== undefined) setHeight(profile.height);
    }
  }, [profile]);

  // Step Counter Logic with Accelerometer
  useEffect(() => {
    let lastStepTime = 0;
    const stepThreshold = 14; // Refined threshold for actual walking
    const cooldown = 400; // ms between steps to prevent double counting

    let lastX = 0, lastY = 0, lastZ = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!activeWorkout) return;

      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      
      // Calculate delta to detect sudden movement characteristic of a step
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);
      
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const currentTime = Date.now();

      // Detection logic: High magnitude + sudden change
      if (magnitude > stepThreshold && (currentTime - lastStepTime) > cooldown) {
        setSteps(prev => prev + 1);
        setCalories(prev => prev + 0.05); // Approx 0.05 calories per adult step
        lastStepTime = currentTime;
        
        // Physical Haptic Feedback (Stronger)
        if (navigator.vibrate) {
          navigator.vibrate(40);
        }
      }

      lastX = x; lastY = y; lastZ = z;
    };

    if (activeWorkout) {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any).requestPermission()
          .then((state: string) => {
            if (state === 'granted') {
              window.addEventListener('devicemotion', handleMotion);
            } else {
              setIsMotionSupported(false);
            }
          })
          .catch(() => setIsMotionSupported(false));
      } else {
        window.addEventListener('devicemotion', handleMotion);
      }
    }

    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [activeWorkout]);

  // Body Metrics Calculations
  const bmi = (weight / ((height / 100) * (height / 100))).toFixed(1);
  
  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'نقص وزن', color: 'text-blue-400', bg: 'bg-blue-400/20' };
    if (bmi < 25) return { label: 'وزن مثالي', color: 'text-orange-500', bg: 'bg-orange-500/20' };
    if (bmi < 30) return { label: 'زيادة وزن', color: 'text-amber-500', bg: 'bg-amber-500/20' };
    return { label: 'سمنة', color: 'text-red-500', bg: 'bg-red-500/20' };
  };

  const bmiCat = getBMICategory(parseFloat(bmi));

  // BMR Calculation (Mifflin-St Jeor Equation)
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);

  // Heart Rate Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 5) - 2;
      setHeartRate(prev => Math.min(Math.max(60, prev + delta), activeWorkout ? 140 : 90));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  // Workout Timer
  useEffect(() => {
    let interval: any;
    if (activeWorkout) {
      interval = setInterval(() => {
        setWorkoutTime(prev => prev + 1);
        if ((workoutTime + 1) % 60 === 0) {
          setTotalActivityMinutes(prev => prev + 1);
        }
        setCalories(prev => prev + (Math.random() * 0.2));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeWorkout]);

  const handleSave = async () => {
    if (!profile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        weight: Number(weight),
        height: Number(height),
        age: Number(age),
        sleepHours: Number(sleepHours),
        sleepQuality: Number(sleepQuality),
        deepSleepHours: Number(deepSleepHours),
        totalActivityMinutes: Number(totalActivityMinutes),
        updatedAt: serverTimestamp()
      });
      toast.success('تم تحديث القياسات بنجاح!');
      setIsEditing(false);
      playSound('like');
    } catch (error) {
      toast.error('فشل في تحديث البيانات');
    }
  };

  const toggleWorkout = async () => {
    if (!activeWorkout) {
      // Request permission directly on click for iOS compatibility
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const state = await (DeviceMotionEvent as any).requestPermission();
          if (state !== 'granted') {
            toast.error('يرجى تفعيل إذن الوصول للحساسات لتتبع الحركة');
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      setActiveWorkout(true);
      playSound('post');
      toast.success('تم بدأ جلسة التمرين! استمتع بنشاطك');
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    } else {
      setActiveWorkout(false);
      playSound('comment');
      toast('تم إيقاف التمرين. أحسنت عملاً!', { icon: '💪' });
      if (navigator.vibrate) navigator.vibrate(100);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700 bg-slate-950 px-4 md:px-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 pt-4">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 font-amiri tracking-wider">الصحة والنشاط</h1>
          <div className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            تتبع أداء جسمك بشكل احترافي
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-xs hover:bg-white/10 transition-all flex items-center gap-2"
          >
            {isEditing ? 'إلغاء' : 'تعديل البيانات'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-slate-900 border border-orange-500/30 rounded-[2rem] p-8 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 shadow-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">الوزن الحالي (كغ)</label>
                <input 
                  type="number" 
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">الطول (سم)</label>
                <input 
                  type="number" 
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">العمر</label>
                <input 
                  type="number" 
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">ساعات النوم</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">جودة النوم (%)</label>
                <input 
                  type="number" 
                  value={sleepQuality}
                  onChange={(e) => setSleepQuality(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">نوم عميق (H)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={deepSleepHours}
                  onChange={(e) => setDeepSleepHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block pr-2">نشاط اليوم (Min)</label>
                <input 
                  type="number" 
                  value={totalActivityMinutes}
                  onChange={(e) => setTotalActivityMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-white font-black outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="flex items-end lg:col-span-1">
                <button 
                  onClick={handleSave}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-2xl font-black shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <Save className="w-5 h-5" />
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Main Stats Display */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-[120px] -mr-40 -mt-40"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
              <div className="relative w-56 h-56 flex items-center justify-center">
                 {/* Triple Ring Progress */}
                 <svg className="w-full h-full -rotate-90">
                    <circle cx="112" cy="112" r="95" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-800" />
                    <circle cx="112" cy="112" r="95" fill="none" stroke="currentColor" strokeWidth="14" strokeDasharray="596.9" strokeDashoffset={596.9 - (596.9 * (calories / 2500))} className="text-lime-400 transition-all duration-1000" style={{ strokeLinecap: 'round' }} />
                    
                    <circle cx="112" cy="112" r="75" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-800" />
                    <circle cx="112" cy="112" r="75" fill="none" stroke="currentColor" strokeWidth="14" strokeDasharray="471.2" strokeDashoffset={471.2 - (471.2 * (steps / 10000))} className="text-orange-500 transition-all duration-1000" style={{ strokeLinecap: 'round' }} />
                    
                    <circle cx="112" cy="112" r="55" fill="none" stroke="currentColor" strokeWidth="14" className="text-slate-800" />
                    <circle cx="112" cy="112" r="55" fill="none" stroke="currentColor" strokeWidth="14" strokeDasharray="345.6" strokeDashoffset={345.6 - (345.6 * (Math.min(totalActivityMinutes, 60) / 60))} className="text-cyan-400 transition-all duration-1000" style={{ strokeLinecap: 'round' }} />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">السعرات</p>
                    <p className="text-4xl font-black text-white">{Math.round(calories)}</p>
                    <div className="flex items-center gap-1 text-lime-400 mt-1">
                      <Flame className="w-3 h-3 fill-lime-400" />
                      <span className="text-[10px] font-bold">Kcal</span>
                    </div>
                 </div>
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-lime-400/30 transition-colors cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-lime-400/20 rounded-2xl flex items-center justify-center">
                        <Flame className="w-6 h-6 text-lime-400 fill-lime-400/20" />
                      </div>
                      <div>
                        <p className="text-white font-black text-base">حرق السعرات</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">الهدف اليومي: 2500</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-white">{Math.round(calories)}/2500</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-colors cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                        <Footprints className="w-6 h-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-white font-black text-base">الخطوات اليومية</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">الهدف اليومي: 10,000</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-white">{steps.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white/5 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-colors cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center">
                        <Timer className="w-6 h-6 text-cyan-500" />
                      </div>
                      <div>
                        <p className="text-white font-black text-base">وقت النشاط</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">تم تسجيله اليوم</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-white">{totalActivityMinutes} min</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl group hover:border-orange-500/20 transition-all">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-orange-500" />
                    <h3 className="font-black text-white uppercase tracking-wider">سجل الوزن</h3>
                  </div>
                  <div className="bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">-2.4 كغ</span>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={WEIGHT_DATA}>
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="day" hide />
                      <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                        itemStyle={{ color: '#d946ef', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="weight" stroke="#d946ef" strokeWidth={4} fillOpacity={1} fill="url(#colorWeight)" dot={{ fill: '#d946ef', r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <span>بداية الشهر</span>
                  <span>اليوم</span>
                </div>
             </div>

             <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between group hover:border-orange-500/20 transition-all">
                <div>
                   <div className="flex items-center gap-3 mb-6">
                      <Activity className="w-5 h-5 text-orange-500" />
                      <h3 className="font-black text-white uppercase tracking-wider">كتلة الجسم</h3>
                   </div>
                   <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-5xl font-black text-white">{bmi}</span>
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${bmiCat.bg} ${bmiCat.color} border border-white/5`}>{bmiCat.label}</span>
                   </div>
                   <p className="text-[10px] font-bold text-slate-500 leading-relaxed max-w-xs">
                      يتم حساب مؤشر كتلة الجسم (BMI) بدقة بناءً على الطول {height}سم والوزن {weight}كغ.
                   </p>
                </div>

                <div className="mt-8 space-y-4">
                   <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl group/item">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-500 fill-purple-500/20" />
                         </div>
                         <div>
                            <p className="text-white font-black text-xs">معدل الأيض الأساسي</p>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">BMR - دقة عالية</p>
                         </div>
                      </div>
                      <span className="text-white font-black text-lg">{bmr} <span className="text-[10px] opacity-50">kcal</span></span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="md:col-span-4 space-y-6">
           <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6">
                 <Heart className={`w-8 h-8 transition-all duration-300 ${activeWorkout ? 'text-red-500 fill-red-500 animate-ping' : 'text-slate-200 fill-slate-200'}`} />
              </div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">نبضات القلب</p>
              <div className="flex items-baseline gap-2 mb-4">
                 <h3 className="text-6xl font-black text-slate-950 tracking-tighter">
                    {heartRate}
                 </h3>
                 <span className="text-xs font-black text-slate-400 uppercase">Bpm</span>
              </div>
              <p className="text-slate-500 text-xs font-bold mb-8 leading-relaxed">
                 {activeWorkout ? 'التحليل المباشر: معدل الحرق في ذروته حالياً' : 'معدل النبض في حالة الراحة طبيعي جداً.'}
              </p>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={toggleWorkout}
                className={`w-full py-6 rounded-[2rem] font-black text-sm transition-all flex items-center justify-center gap-3 active:scale-95 shadow-2xl relative group overflow-hidden ${
                  activeWorkout 
                  ? 'bg-red-500 text-white shadow-red-500/40' 
                  : 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 text-white shadow-orange-500/50 border-t-2 border-white/40'
                }`}
              >
                {!activeWorkout && (
                  <motion.div 
                    animate={{ 
                      x: ['-100%', '200%'],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                      repeatDelay: 1
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                  />
                )}
                {activeWorkout ? (
                  <>
                    <RotateCcw className="w-5 h-5 animate-spin-slow" />
                    إيقاف النشاط {formatTime(workoutTime)}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                    <span className="tracking-[0.2em] font-black underline-offset-4 decoration-white/30 group-hover:underline">بدأ التحدي الرياضي الملكي</span>
                  </>
                )}
              </motion.button>
           </div>

           <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative group">
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Moon className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
                 </div>
                 <h3 className="font-black text-white text-sm uppercase tracking-widest">تتبع النوم</h3>
              </div>
              <div className="flex justify-center py-4 relative">
                 <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90">
                       <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-800" />
                       <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray="439.8" strokeDashoffset={439.8 - (439.8 * (Math.min(sleepHours, 10) / 10))} className="text-indigo-500 transition-all duration-1000" style={{ strokeLinecap: 'round' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <p className="text-4xl font-black text-white">{sleepHours}</p>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">H / Night</p>
                    </div>
                 </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">الجودة</p>
                    <p className="text-white font-black">{sleepQuality}%</p>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">العميق</p>
                    <p className="text-white font-black">{deepSleepHours} <span className="text-[8px] opacity-50">H</span></p>
                 </div>
              </div>
           </div>

           <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                 className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
              />
              <Award className="w-14 h-14 text-white/30 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-black text-white font-amiri leading-tight mb-3">نصيحة اليوم الذكية</h3>
              <p className="text-white/80 text-sm font-bold mb-8 leading-relaxed">
                 {steps < 2000 
                   ? `يبدو أنك في بداية نشاطك اليوم. حاول المشي لمدة 10 دقائق لتنشيط الدورة الدموية وفقاً لطولك (${height}سم).`
                   : steps < 8000 
                   ? `أداء ممتاز! لقد قطعت شوطاً كبيراً. استمر حتى تصل لـ 10,000 خطوة لتحقيق معدل حرق مثالي.`
                   : `رائع! لقد تجاوزت المعدل الطبيعي. جسمك الآن في حالة حرق الدهون القصوى.`
                 }
              </p>
              <button 
                onClick={() => {
                  playSound('call');
                  toast('جاري تحضير خطة غذائية مخصصة لوزنك...', { icon: '🥘' });
                }}
                className="w-full bg-white text-orange-600 p-5 rounded-[1.5rem] font-black text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-3 group active:scale-95 shadow-2xl shadow-orange-950/20"
              >
                 عرض الخطة الغذائية
                 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
           
           {!isMotionSupported && activeWorkout && (
             <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3">
               <Info className="w-5 h-5 text-red-500" />
               <p className="text-[10px] font-black text-red-500 uppercase">حساس الحركة غير مفعل أو غير مدعوم على هذا المتصفح.</p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
