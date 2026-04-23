import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Wand2, CheckSquare, Lock, Key, Mail, Phone, Sparkles, Send, Loader2, FileText, ClipboardCheck, AlertCircle, CheckCircle2, Zap, ExternalLink, BookOpen, Plus, Save, Download, Printer, Maximize2, Minimize2, ZoomIn, ZoomOut, Type, Bold, Italic, List, AlignLeft, AlignCenter, AlignRight, Underline, Layout, Grid, Target, GraduationCap, User, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { doc, updateDoc, Timestamp, collection, getDocs, query, where, deleteDoc, serverTimestamp, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

import { UserProfile, SavedPreferences } from '../types';

const getAi = () => {
  // Use a safer way to check for global process variable in browser
  const env = typeof process !== 'undefined' ? process.env : (import.meta as any).env;
  const key = env?.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!key) {
    console.warn("GEMINI_API_KEY is missing. AI features may not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function PremiumTools() {
  const { profile, user } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [guestAttempts, setGuestAttempts] = useState(0);

  const [activeTool, setActiveTool] = useState<'generator' | 'corrector' | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  useEffect(() => {
    const isGuestMode = window.location.search.includes('mode=guest');
    setIsGuest(isGuestMode && !user);
    
    if (isGuestMode) {
      const savedAttempts = parseInt(localStorage.getItem('guestGenCount') || '0');
      setGuestAttempts(savedAttempts);
    }
  }, [user]);
  
  // Persistence State
  const [isEasyMode, setIsEasyMode] = useState(false);

  // Teacher Info
  const [teacherFirstName, setTeacherFirstName] = useState('');
  const [teacherLastName, setTeacherLastName] = useState('');
  const [phase, setPhase] = useState('');
  const [subject, setSubject] = useState('');
  const [school, setSchool] = useState('');
  const [level, setLevel] = useState('');

  // Generator State
  const [genScope, setGenScope] = useState<'lesson_plan' | 'assignment' | 'exam'>('lesson_plan');
  const [sectionNum, setSectionNum] = useState(''); // المقطع
  const [field, setField] = useState(''); // الميدان
  const [topic, setTopic] = useState(''); // المورد
  const [projectNum, setProjectNum] = useState(''); // Projet
  const [sequenceNum, setSequenceNum] = useState(''); // Séquence
  const [tache, setTache] = useState(''); // Tâche
  const [activity, setActivity] = useState(''); // Activité / النشاط
  const [learningObjective, setLearningObjective] = useState(''); // الهدف التعلمي
  const [materials, setMaterials] = useState(''); // السندات
  const [genLanguage, setGenLanguage] = useState('ar'); // ar, fr, en
  
  const [style, setStyle] = useState('احترافي'); // كلاسيكي، مميز، احترافي...
  const [template, setTemplate] = useState('عملي'); // عملي، بسيط، هادف...
  const [competency, setCompetency] = useState(''); // الكفاءة المستهدفة
  const [detailedRequest, setDetailedRequest] = useState(''); // ما يريده الأستاذ بالضبط
  const [aiPrompt, setAiPrompt] = useState(''); // حقل عام للذكاء الاصطناعي
  
  // Assignment Specifics
  const [testNumber, setTestNumber] = useState('1');
  const [exerciseCount, setExerciseCount] = useState('3');
  const [includeIntegralSituation, setIncludeIntegralSituation] = useState(false);
  const [integralTopic, setIntegralTopic] = useState('');
  
  // Dynamic fields based on subject
  const getFieldsForSubject = (subj: string) => {
    switch(subj) {
      case 'الرياضيات': return ['أنشطة عددية', 'أنشطة هندسية', 'تنظيم معطيات'];
      case 'التاريخ والجغرافيا': return ['التاريخ الوطني', 'التاريخ العام', 'المجال الجغرافي', 'السكان والتنمية'];
      case 'اللغة العربية': return ['فهم المنطوق', 'تعبير شفوي', 'قراءة', 'ظواهر لغوية', 'تعبير كتابي'];
      case 'التربية الإسلامية': return ['القرآن الكريم والحديث', 'العقيدة الإسلامية', 'العبادات', 'السيرة النبوية', 'الآداب والأخلاق'];
      default: return ['عام', 'نظري', 'تطبيقي'];
    }
  };

  const [exercisesDetails, setExercisesDetails] = useState<{section: string, competency: string}[]>([
    { section: '', competency: '' },
    { section: '', competency: '' },
    { section: '', competency: '' },
  ]);

  const [genResult, setGenResult] = useState('');
  const [genError, setGenError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(80);

  // Corrector State
  const [correctText, setCorrectText] = useState('');
  const [correctResult, setCorrectResult] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  // Sync preferences when profile loads
  useEffect(() => {
    if (profile?.savedPreferences) {
      const prefs = profile.savedPreferences;
      if (prefs.isEasyMode !== undefined) setIsEasyMode(prefs.isEasyMode);
      if (prefs.teacherFirstName) setTeacherFirstName(prefs.teacherFirstName);
      if (prefs.teacherLastName) setTeacherLastName(prefs.teacherLastName);
      if (prefs.phase) setPhase(prefs.phase);
      if (prefs.subject) setSubject(prefs.subject);
      if (prefs.school) setSchool(prefs.school);
      if (prefs.level) setLevel(prefs.level);
      if (prefs.sectionNum) setSectionNum(prefs.sectionNum);
      if (prefs.field) setField(prefs.field);
      if (prefs.topic) setTopic(prefs.topic);
      if (prefs.projectNum) setProjectNum(prefs.projectNum);
      if (prefs.sequenceNum) setSequenceNum(prefs.sequenceNum);
      if (prefs.tache) setTache(prefs.tache);
      if (prefs.activity) setActivity(prefs.activity);
      if (prefs.learningObjective) setLearningObjective(prefs.learningObjective);
      if (prefs.competency) setCompetency(prefs.competency);
      if (prefs.materials) setMaterials(prefs.materials);
      if (prefs.genLanguage) setGenLanguage(prefs.genLanguage);

      // Auto set language based on subject
      if (prefs.subject === 'اللغة الفرنسية') setGenLanguage('fr');
      else if (prefs.subject === 'اللغة الإنجليزية') setGenLanguage('en');
    }
  }, [profile]);

  useEffect(() => {
    if (subject === 'اللغة الفرنسية') setGenLanguage('fr');
    else if (subject === 'اللغة الإنجليزية') setGenLanguage('en');
    else setGenLanguage('ar');
  }, [subject]);

  const isAdmin = profile?.email === 'dalinadjib1990@gmail.com';
  const isPremium = isAdmin || (profile?.premiumUntil ? profile.premiumUntil.toDate() > new Date() : false) || isGuest;

  const getRemainingAttempts = (type: 'gen' | 'correct') => {
    if (isAdmin) return Infinity;
    if (isGuest) {
      if (type === 'gen') return Math.max(0, 3 - guestAttempts);
      return 0; // Guest can't correct
    }
    
    const lastUse = profile?.lastUsageResetDate?.toDate();
    const today = new Date();
    const isNewDay = !lastUse || 
      lastUse.getDate() !== today.getDate() || 
      lastUse.getMonth() !== today.getMonth() || 
      lastUse.getFullYear() !== today.getFullYear();

    if (isNewDay) return type === 'gen' ? 1 : 10;
    
    if (type === 'gen') {
      return Math.max(0, 1 - (profile?.dailyGenCount || 0));
    } else {
      return Math.max(0, 10 - (profile?.dailyCorrectCount || 0));
    }
  };

  const updateUsage = async (type: 'gen' | 'correct') => {
    if (isAdmin) return;
    
    if (isGuest) {
      if (type === 'gen') {
        const newCount = guestAttempts + 1;
        setGuestAttempts(newCount);
        localStorage.setItem('guestGenCount', newCount.toString());
      }
      return;
    }

    if (!profile) return;

    const lastUse = profile.lastUsageResetDate?.toDate();
    const today = new Date();
    const isNewDay = !lastUse || 
      lastUse.getDate() !== today.getDate() || 
      lastUse.getMonth() !== today.getMonth() || 
      lastUse.getFullYear() !== today.getFullYear();

    const updates: any = {
      lastUsageResetDate: serverTimestamp(),
    };

    if (isNewDay) {
      updates.dailyGenCount = type === 'gen' ? 1 : 0;
      updates.dailyCorrectCount = type === 'correct' ? 1 : 0;
    } else {
      if (type === 'gen') {
        updates.dailyGenCount = (profile.dailyGenCount || 0) + 1;
      } else {
        updates.dailyCorrectCount = (profile.dailyCorrectCount || 0) + 1;
      }
    }

    await updateDoc(doc(db, 'users', profile.uid), updates);
  };

  const canGenerate = (type: 'gen' | 'correct') => {
    return getRemainingAttempts(type) > 0;
  };

  const [adminCodes, setAdminCodes] = useState<any[]>([]);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'activation_codes'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setAdminCodes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const generateNewCode = async () => {
    if (!isAdmin) return;
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    try {
      await addDoc(collection(db, 'activation_codes'), {
        code: newCode,
        createdAt: serverTimestamp(),
        createdBy: profile?.email
      });
      alert(`تم توليد كود جديد: ${newCode}`);
    } catch (err) {
      console.error(err);
      alert('فشل توليد الكود.');
    }
  };

  const handleActivate = async () => {
    if (!profile) return;
    setIsActivating(true);
    setActivationError(null);
    try {
      const codesRef = collection(db, 'activation_codes');
      const q = query(codesRef, where('code', '==', activationCode.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        if (activationCode.trim() === 'DALI-2026') {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          await updateDoc(doc(db, 'users', profile.uid), {
            premiumUntil: Timestamp.fromDate(expiryDate),
            isActivated: true
          });
          setActivationCode('');
          setIsActivating(false);
          alert('تم قبول كود التفعيل التجريبي! اشتراكك السنوي نشط الآن.');
          return;
        }
        setActivationError('كود التفعيل غير صحيح. يرجى الاتصال بالمسؤول.');
        setIsActivating(false);
        return;
      }

      const codeDoc = snap.docs[0];
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      await updateDoc(doc(db, 'users', profile.uid), {
        premiumUntil: Timestamp.fromDate(expiryDate),
        isActivated: true
      });

      await deleteDoc(codeDoc.ref);
      
      setActivationCode('');
      setIsActivating(false);
      alert('مبروك! اشتراكك السنوي المميز نشط الآن.');
    } catch (err: any) {
      setActivationError(err.message || 'فشلت عملية التفعيل.');
      setIsActivating(false);
    }
  };

  const exportToPDF = () => {
    const element = document.querySelector('.ql-editor') as HTMLElement;
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `${genScope}_${topic || 'document'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    html2pdf().from(element).set(opt).save();
  };

  const exportToWord = () => {
    const element = document.querySelector('.ql-editor') as HTMLElement;
    const text = element?.innerText || '';
    const doc = new Document({
      sections: [{
        properties: {},
        children: text.split('\n').map(line => new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun(line)],
        })),
      }],
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${genScope}_${topic || 'document'}.docx`);
    });
  };

  const generateContent = async () => {
    if (!profile && !isGuest) return;
    if (!canGenerate('gen')) {
      if (isGuest) {
        alert('لقد استنفدت المحاولات المجانية (3 مرات). يرجى إنشاء حساب للمتابعة.');
      } else {
        alert('لقد استنفدت حد التوليد اليومي (وثيقة واحدة في اليوم). يمكنك المحاولة مرة أخرى غداً.');
      }
      return;
    }

    setGenError(null);
    setIsGenerating(true);
    try {
      await updateUsage('gen');
      
      const teacherName = isGuest ? "أستاذ زائر" : `${teacherFirstName} ${teacherLastName}`;
      const schoolName = isGuest ? "مؤسسة زائرة" : school;

      let prompt = `أنت "المفتش التربوي الرقمي"، خبير أول في المنهاج الوطني الجزائري (الجيل الثاني G2).
      مهمتك هي صياغة "مذكرة بيداغوجية" (Fiche Pédagogique) احترافية وعميقة، تتخطى كونها مجرد نص إلى كونها خطة عمل ميدانية دقيقة.

      [المعطيات الإدارية]:
      الأستاذ: ${teacherName} | المؤسسة: ${schoolName}
      الطور: ${phase} | المستوى: ${level} | المادة: ${subject}
      رقم المقطع: ${sequenceNum || sectionNum} | رقم الحصة/المذكرة: (يتم استنتاجه)
      اللغة الأصلية للمذكرة: ${genLanguage}

      [البيانات البيداغوجية]:
      الميدان/Domain: ${field}
      المورد (عنوان الدرس): ${topic}
      النشاط/الأهداف: ${learningObjective || competency}
      السندات المقترحة: ${materials}

      [المطلوب تنفيذه بدقة]:
      1. هيكلية الترويسة (En-tête):
         استخدم جدول HTML منظماً يضم (المستوى، المادة، المقطع، الميدان، المورد المعرفي، الكفاءة الختامية، الهدف التعلمي، السندات، المدة).

      2. البطاقة الفنية للدرس:
         يجب أن تحتوي على:
         - الكفاءة الختامية (Compétence Terminale).
         - مركبات الكفاءة (Composantes de la compétence).
         - القيم والمواقف (Valeurs et attitudes) - وطنية، سلوكية، إلخ.

      3. سيرورة التعلمات (Le déroulement):
         هذا هو الجزء الأهم. يجب أن يكون في جدول HTML عريض جداً (Full Width) بالأعمدة:
         - المحطات/المراحل (Phases): [وضعية الانطلاق، وضعية مشكلة (بناء التعلمات)، وضعية التدريب/الاستثمار].
         - الأفعال البيداغوجية (Objectifs intermédiaires): ماذا نريد أن نحقق في كل مرحلة.
         - الأنشطة التعليمية (Activités d'apprentissage): سيناريو تفصيلي (الأستاذ يطرح، التلاميذ يبحثون، تدوين النتيجة).
         - التقويم (Évaluation): مؤشرات النجاح.

      [تعليمات التصميم البصري]:
      - استخدم جداول HTML بحدود (border="1" cellspacing="0" cellpadding="10").
      - اجعل الخلفية للعناوين (Header cells) ملونة بالرمادي الفاتح (#f3f4f6).
      - النص يجب أن يكون ثرياً بالمصطلحات البيداغوجية (مثلاً: التحسيس، المجابهة، التجريد، الإرساء).
      - إذا كانت المادة علمية، ركز على التجارب والنتائج. إذا كانت أدبية، ركز على النصوص والتحليل.

      ملاحظة: ${isEasyMode ? 'بما أن الأستاذ في الوضع السهل، قم بصفتك خبيراً بملء كل الثغرات البيداغوجية (الميدان، المقطع، إلخ) بناءً على عنوان الدرس فقط.' : ''}
      توجيه خاص من الأستاذ: ${detailedRequest} ${aiPrompt}`;

      const ai = getAi();
      if (!ai) throw new Error('AI service initialization failed. Missing API key.');

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      setGenResult(response.text || 'لم يتم توليد أي محتوى.');
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || 'فشل توليد المحتوى. يرجى المحاولة لاحقاً.');
    } finally {
      setIsGenerating(false);
    }
  };

  const correctContent = async () => {
    if (!profile) return;
    if (!canGenerate('correct')) {
      alert('لقد استنفدت حد التصحيح اليومي (10 تصحيحات في اليوم).');
      return;
    }

    setIsCorrecting(true);
    try {
      await updateUsage('correct');

      const prompt = `You are an expert educational corrector. Analyze the following student response or teacher content for subject "${profile?.subject}". 
      Content: ${correctText}
      Task: Provide a detailed correction, grade (out of 20), and constructive feedback.
      Language: Arabic`;

      const ai = getAi();
      if (!ai) throw new Error('AI service initialization failed. Missing API key.');

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      setCorrectResult(response.text || 'No correction result.');
    } catch (err) {
      console.error(err);
      alert('فشلت عملية التصحيح.');
    } finally {
      setIsCorrecting(false);
    }
  };

  const savePrefs = async (key: keyof SavedPreferences, value: any) => {
    if (!profile) return;
    const currentPrefs = profile.savedPreferences || {};
    await updateDoc(doc(db, 'users', profile.uid), {
      savedPreferences: {
        ...currentPrefs,
        [key]: value
      }
    });
  };

  const saveAllPrefs = async () => {
    if (!profile) return;
    await updateDoc(doc(db, 'users', profile.uid), {
      savedPreferences: {
        teacherFirstName,
        teacherLastName,
        phase,
        subject,
        school,
        level,
        isEasyMode,
        sectionNum,
        field,
        topic,
        projectNum,
        sequenceNum,
        tache,
        activity,
        learningObjective,
        competency,
        materials,
        genLanguage
      }
    });
    alert('تم حفظ جميع الإعدادات كمفضلة!');
  };

  if (!isPremium) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center bg-slate-950 rounded-[40px] border border-slate-900 border-dashed relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 pointer-events-none"></div>
        <div className="bg-purple-600/20 p-6 rounded-[32px] mb-8 relative">
          <Lock className="w-16 h-16 text-purple-500 relative z-10" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4">Premium AI Tools</h1>
        <p className="text-slate-400 max-w-lg mb-8 text-lg font-medium">
          Access our powerful AI generators for lesson plans, tests, and automated grading. 
          A yearly subscription is required to unlock these professional features.
        </p>
        <div className="w-full max-w-md bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl relative z-10">
          <h2 className="text-xl font-black text-white mb-6 flex items-center justify-center gap-2">
            <Key className="w-5 h-5 text-purple-500" />
            أدخل كود التفعيل
          </h2>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="كود التفعيل (12 رقم)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-mono focus:ring-2 focus:ring-purple-500 outline-none transition-all text-center"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
            />
            {activationError && (
              <div className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                <AlertCircle className="w-4 h-4" />
                {activationError}
              </div>
            )}
            <button 
              onClick={handleActivate}
              disabled={isActivating || !activationCode}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {isActivating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              تفعيل الاشتراك السنوي
            </button>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 space-y-4 text-center">
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">للحصول على كود التفعيل، اتصل بالمسؤول</p>
            <div className="flex flex-col gap-3">
              <a href="tel:0673831994" className="flex items-center gap-3 text-slate-300 hover:text-purple-400 transition-colors bg-slate-950 p-4 rounded-xl border border-slate-800 group">
                <Phone className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-sm">0673831994</span>
              </a>
              <a href="mailto:dalinadjib1990@gmail.com" className="flex items-center gap-3 text-slate-300 hover:text-purple-400 transition-colors bg-slate-950 p-4 rounded-xl border border-slate-800 group">
                <Mail className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-sm">dalinadjib1990@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20" dir="rtl">
      {isAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border-2 border-amber-500/30 p-8 rounded-[40px] relative shadow-[0_0_80px_-20px_rgba(245,158,11,0.2)] backdrop-blur-3xl overflow-hidden group"
        >
          {/* Decorative Background Glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700"></div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6">
              <div className="bg-amber-500 p-4 rounded-[1.5rem] shadow-xl shadow-amber-500/20 transform group-hover:rotate-6 transition-transform">
                <Lock className="w-10 h-10 text-slate-900" />
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
                  لوحة تحكم المسؤول
                </h3>
                <p className="text-amber-500 text-xs font-black uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                  Admin Command Center
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button 
                onClick={generateNewCode} 
                className="flex items-center gap-3 text-base font-black bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-900 px-8 py-4 rounded-2xl shadow-2xl shadow-amber-500/20 transition-all active:scale-95 border-b-4 border-orange-700"
              >
                <Plus className="w-6 h-6" />
                توليد كود تفعيل
              </button>
              <button 
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)} 
                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base border-2 transition-all ${isAdminPanelOpen ? 'bg-white text-slate-900 border-white' : 'bg-slate-800/50 text-white border-slate-700 hover:border-slate-500'}`}
              >
                {isAdminPanelOpen ? 'إغلاق اللوحة' : `سجل الأكواد (${adminCodes.length})`}
                <ChevronRight className={`w-5 h-5 transition-transform ${isAdminPanelOpen ? 'rotate-90' : 'rotate-0'}`} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isAdminPanelOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="mt-10 pt-10 border-t border-slate-800/50 overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                  {adminCodes.map((c) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={c.id} 
                      className="bg-slate-900/80 backdrop-blur-md border-2 border-slate-800 p-6 rounded-3xl flex flex-col gap-4 group/card hover:border-amber-500/50 transition-all hover:bg-slate-800 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active License</span>
                        <div className="px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-2xl font-mono font-black text-amber-400 selection:bg-amber-500/30 tracking-wider">
                          {c.code}
                        </span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(c.code);
                            alert('تم نسخ الكود بنجاح!');
                          }}
                          className="p-3 bg-slate-800 hover:bg-amber-500 hover:text-slate-900 text-amber-500 rounded-xl transition-all shadow-inner"
                        >
                          <ClipboardCheck className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-800">
                         <span className="text-[8px] font-bold text-slate-600 uppercase">Created: {new Date(c.createdAt?.toDate()).toLocaleDateString()}</span>
                         <button className="text-[8px] font-black text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-widest">Revoke</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {adminCodes.length === 0 && (
                  <div className="py-20 text-center bg-slate-950/30 rounded-[32px] border border-slate-800/50 border-dashed">
                    <Sparkles className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 font-black text-lg">لا توجد أكواد نشطة حالياً</p>
                    <p className="text-slate-700 text-xs mt-2 uppercase tracking-widest font-bold">Press generate to create a new one</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative border border-slate-800">
        <div className="text-right">
          <p className="text-purple-400 text-xs font-black uppercase tracking-widest mb-1">الأدوات المميزة - Premium Tools</p>
          <h1 className="text-3xl font-black mb-1 text-white">المؤطر التربوي الذكي</h1>
          <p className="text-slate-400 text-sm font-medium tracking-tight">أدوات بيداغوجية احترافية مدعومة بالذكاء الاصطناعي.</p>
        </div>
        <div className="flex items-center gap-3 bg-purple-500/10 px-4 py-2 rounded-2xl border border-purple-500/20">
          <CheckCircle2 className="w-6 h-6 text-purple-500" />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-tighter text-purple-500/60 leading-none mb-1">اشتراك نشط</p>
            <p className="text-sm font-black text-white">حتى {profile?.premiumUntil?.toDate().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl flex items-center justify-between border ${getRemainingAttempts('gen') === 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5" />
              <p className="text-xs font-black">توليد مذكرات: {getRemainingAttempts('gen')} متبقية</p>
            </div>
          </div>
          <div className={`p-4 rounded-2xl flex items-center justify-between border ${getRemainingAttempts('correct') === 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5" />
              <p className="text-xs font-black">تصحيح أوراق: {getRemainingAttempts('correct')} متبقية</p>
            </div>
          </div>
        </div>
      )}

      {/* Pro External Tool Promotion */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-amber-600/20 via-slate-900 to-amber-900/20 border-2 border-amber-500/40 p-6 rounded-[32px] relative overflow-hidden group mb-8"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-all"></div>
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="bg-amber-500 p-4 rounded-2xl shadow-lg shadow-amber-500/20">
            <ExternalLink className="w-8 h-8 text-slate-950" />
          </div>
          <div className="text-right flex-1">
            <h3 className="text-2xl font-black text-white mb-1">Mothakira PRO - المولد الاحترافي</h3>
            <p className="text-amber-400/80 text-sm font-medium">استخدم المولد الخارجي المخصص للمحترفين للحصول على خيارات بيداغوجية أوسع.</p>
          </div>
          <a 
            href="https://pro-mat-jg9v-5w72r04zr-dalinadjib169-5953s-projects.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/10 transition-all flex items-center gap-2 group/btn active:scale-95"
          >
            فتح المولد الخارجي
            <ChevronRight className="w-5 h-5 group-hover:translate-x-[-4px] transition-transform" />
          </a>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }} 
          whileTap={{ scale: 0.98 }}
          className={cn(
            "p-6 rounded-3xl border-2 transition-all cursor-pointer group flex flex-col items-center text-center", 
            activeTool === 'generator' 
              ? "bg-slate-900 border-purple-500 shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]" 
              : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
          )} 
          onClick={() => setActiveTool('generator')}
        >
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
            activeTool === 'generator' ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-400 group-hover:text-purple-400"
          )}>
            <Wand2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">منصة المؤطر التربوي الشاملة</h2>
          <p className="text-slate-500 font-medium text-xs">توليد مذكرات وفروض احترافية حسب المنهاج الجزائري.</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.01 }} 
          whileTap={{ scale: 0.98 }}
          className={cn(
            "p-6 rounded-3xl border-2 transition-all cursor-pointer group flex flex-col items-center text-center", 
            activeTool === 'corrector' 
              ? "bg-slate-900 border-blue-500 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]" 
              : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
          )} 
          onClick={() => setActiveTool('corrector')}
        >
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors",
            activeTool === 'corrector' ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400 group-hover:text-blue-400"
          )}>
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">المصحح الذكي</h2>
          <p className="text-slate-500 font-medium text-xs">تصحيح الأوراق والوضعيات الإدماجية بدقة عالية.</p>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {activeTool === 'generator' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
            <div className="flex items-center justify-between bg-slate-900 p-6 rounded-[32px] border border-slate-800">
               <div className="flex items-center gap-4">
                 <button onClick={saveAllPrefs} className="flex items-center gap-2 bg-purple-600/20 text-purple-400 px-6 py-2 rounded-xl text-xs font-black border border-purple-500/30">
                   <Save className="w-4 h-4" />
                   تذكر الكل
                 </button>
                 <button onClick={() => setIsEasyMode(!isEasyMode)} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black border transition-all ${isEasyMode ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-slate-950 text-slate-500 border-slate-800'}`}>
                   <Zap className="w-4 h-4" />
                   {isEasyMode ? 'الوضع الذكي: مفعل' : 'تفعيل الوضع السهل'}
                 </button>
                 <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                   <button onClick={() => setGenLanguage('ar')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${genLanguage === 'ar' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>AR</button>
                   <button onClick={() => setGenLanguage('fr')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${genLanguage === 'fr' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>FR</button>
                   <button onClick={() => setGenLanguage('en')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${genLanguage === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>EN</button>
                 </div>
               </div>
               <h2 className="text-xl font-black text-white">إعدادات الوثيقة</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {!isEasyMode ? (
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="الاسم" value={teacherFirstName} onChange={setTeacherFirstName} onSave={() => savePrefs('teacherFirstName', teacherFirstName)} />
                      <InputField label="اللقب" value={teacherLastName} onChange={setTeacherLastName} onSave={() => savePrefs('teacherLastName', teacherLastName)} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField label="الطور" value={phase} onChange={setPhase} options={['ابتدائي', 'متوسط', 'ثانوي']} onSave={() => savePrefs('phase', phase)} />
                      <SelectField label="المادة" value={subject} onChange={setSubject} options={['اللغة العربية', 'الرياضيات', 'العلوم الطبيعية', 'الفيزياء', 'التاريخ والجغرافيا', 'التربية الإسلامية', 'اللغة الفرنسية', 'اللغة الإنجليزية']} onSave={() => savePrefs('subject', subject)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="المؤسسة" value={school} onChange={setSchool} onSave={() => savePrefs('school', school)} />
                      <SelectField label="المستوى" value={level} onChange={setLevel} options={
                        phase === 'ابتدائي' ? ['تحضيري', 'سنة 1', 'سنة 2', 'سنة 3', 'سنة 4', 'سنة 5'] :
                        phase === 'ثانوي' ? ['1 ثانوي', '2 ثانوي', '3 ثانوي'] :
                        ['1 متوسط', '2 متوسط', '3 متوسط', '4 متوسط']
                      } onSave={() => savePrefs('level', level)} />
                    </div>

                    <div className="border-t border-slate-800 pt-6 space-y-6">
                      <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">البيانات البيداغوجية</h3>
                      
                      {(subject === 'اللغة الفرنسية' || subject === 'اللغة الإنجليزية') ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <InputField label="Projet" value={projectNum} onChange={setProjectNum} onSave={() => savePrefs('projectNum', projectNum)} />
                            <InputField label="Séquence" value={sequenceNum} onChange={setSequenceNum} onSave={() => savePrefs('sequenceNum', sequenceNum)} />
                          </div>
                          <InputField label="Séance / Activité" value={activity} onChange={setActivity} onSave={() => savePrefs('activity', activity)} />
                          <InputField label="Tâche" value={tache} onChange={setTache} onSave={() => savePrefs('tache', tache)} />
                          <TextAreaField label="Objéctifs d'apprentissage" value={learningObjective} onChange={setLearningObjective} />
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <InputField label="رقم المقطع" value={sectionNum} onChange={setSectionNum} onSave={() => savePrefs('sectionNum', sectionNum)} />
                            <SelectField label="الميدان" value={field} onChange={setField} options={getFieldsForSubject(subject)} onSave={() => savePrefs('field', field)} />
                          </div>
                          <InputField label="المورد (عنوان الدرس)" value={topic} onChange={setTopic} onSave={() => savePrefs('topic', topic)} />
                          {subject === 'التاريخ والجغرافيا' && (
                            <InputField label="التعليمة (Instruction)" value={detailedRequest} onChange={setDetailedRequest} placeholder="مثال: اعتمادا على السندات..." />
                          )}
                          <TextAreaField label="الكفاءة/الهدف" value={competency} onChange={setCompetency} />
                          <InputField label="السندات" value={materials} onChange={setMaterials} onSave={() => savePrefs('materials', materials)} />
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-6">
                    <SelectField label="المادة" value={subject} onChange={setSubject} options={['اللغة العربية', 'الرياضيات', 'العلوم الطبيعية', 'الفيزياء', 'التاريخ والجغرافيا', 'التربية الإسلامية', 'اللغة الفرنسية', 'اللغة الإنجليزية']} />
                    <SelectField label="المستوى" value={level} onChange={setLevel} options={['1 متوسط', '2 متوسط', '3 متوسط', '4 متوسط', '1 ثانوي', '2 ثانوي', '3 ثانوي']} />
                    <InputField label="المقطع / الدرس" value={topic} onChange={setTopic} placeholder="مثال: القصور الذاتي أو Projet 1 Sec 1..." />
                  </div>
                )}
                
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-6">
              <TextAreaField label="توجيهات إضافية" value={aiPrompt} onChange={setAiPrompt} placeholder="مثلاً: استخدم لغة بسيطة..." />
              <button 
                onClick={generateContent} 
                disabled={isGenerating} 
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                {isGenerating ? 'جاري التوليد...' : 'توليد الوثيقة'}
              </button>
            </div>
              </div>

              <div className="lg:sticky lg:top-8 space-y-6">
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between px-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <button onClick={exportToPDF} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white" title="PDF">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={exportToWord} className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white" title="Word">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-white font-black">المعاينة</span>
                  </div>
                  <div className="overflow-x-auto p-4 flex justify-center bg-slate-950/20 rounded-3xl min-h-[600px]">
                    <div className="bg-white text-slate-900 shadow-2xl min-h-[1123px] w-[794px] shrink-0 transform origin-top scale-[0.6] -mb-[450px]">
                      <ReactQuill theme="snow" value={genResult} onChange={setGenResult} className="h-full pedagogical-editor" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTool === 'corrector' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-6">
              <TextAreaField label="النص المراد تصحيحه" value={correctText} onChange={setCorrectText} />
              <button onClick={correctContent} disabled={isCorrecting || !correctText} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl flex items-center justify-center gap-3 active:scale-[0.98]">
                {isCorrecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                بدء التصحيح
              </button>
            </div>
            {correctResult && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6">
                <ReactQuill theme="bubble" readOnly value={correctResult} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', onSave }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-xs font-black text-slate-500">{label}</label>
        {onSave && <button onClick={onSave} className="text-[10px] text-purple-400 hover:underline">تذكرني</button>}
      </div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded-xl text-sm" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, onSave }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-xs font-black text-slate-500">{label}</label>
        {onSave && <button onClick={onSave} className="text-[10px] text-purple-400 hover:underline">تذكرني</button>}
      </div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded-xl text-sm">
        <option value="">اختر {label}</option>
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-slate-500 px-1">{label}</label>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl text-sm resize-none" />
    </div>
  );
}
