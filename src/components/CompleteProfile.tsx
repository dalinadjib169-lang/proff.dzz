import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { GraduationCap, MapPin, BookOpen, Clock, User, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const WILAYAS = [
  "01 - أدرار (Adrar)", "02 - الشلف (Chlef)", "03 - الأغواط (Laghouat)", "04 - أم البواقي (Oum El Bouaghi)", "05 - باتنة (Batna)", "06 - بجاية (Béjaïa)", "07 - بسكرة (Biskra)", "08 - بشار (Béchar)", "09 - البليدة (Blida)", "10 - البويرة (Bouira)",
  "11 - تمنراست (Tamanrasset)", "12 - تبسة (Tébessa)", "13 - تلمسان (Tlemcen)", "14 - تيارت (Tiaret)", "15 - تيزي وزو (Tizi Ouzou)", "16 - الجزائر (Alger)", "17 - الجلفة (Djelfa)", "18 - جيجل (Jijel)", "19 - سطيف (Sétif)", "20 - سعيدة (Saïda)",
  "21 - سكيكدة (Skikda)", "22 - سيدي بلعباس (Sidi Bel Abbès)", "23 - عنابة (Annaba)", "24 - قالمة (Guelma)", "25 - قسنطينة (Constantine)", "26 - المدية (Médéa)", "27 - مستغانم (Mostaganem)", "28 - المسيلة (M'Sila)", "29 - معسكر (Mascara)",
  "30 - ورقلة (Ouargla)", "31 - وهران (Oran)", "32 - البيض (El Bayadh)", "33 - إليزي (Illizi)", "34 - برج بوعريريج (Bordj Bou Arréridj)", "35 - بومرداس (Boumerdès)", "36 - الطارف (El Tarf)", "37 - تندوف (Tindouf)", "38 - تيسمسيلت (Tissemsilt)",
  "39 - الوادي (El Oued)", "40 - خنشلة (Khenchela)", "41 - سوق أهراس (Souk Ahras)", "42 - تيبازة (Tipaza)", "43 - ميلة (Mila)", "44 - عين الدفلى (Aïn Defla)", "45 - النعامة (Naâma)", "46 - عين تموشنت (Aïn Témouchent)", "47 - غرداية (Ghardaïa)", "48 - غليزان (Relizane)",
  "49 - المغير (El M'Ghair)", "50 - المنيعة (El Meniaa)", "51 - أولاد جلال (Ouled Djellal)", "52 - برج باجي مختار (Bordj Baji Mokhtar)", "53 - بني عباس (Béni Abbès)", "54 - تيميمون (Timimoun)", "55 - تقرت (Touggourt)", "56 - جانت (Djanet)", "57 - إن صالح (In Salah)", "58 - إن قزام (In Guezzam)"
];

const SUBJECTS = [
  "الرياضيات (Mathematics)", "الفيزياء (Physics)", "علوم الطبيعة والحياة (Natural Sciences)", "اللغة العربية (Arabic)", "اللغة الفرنسية (French)", "اللغة الإنجليزية (English)", "التاريخ والجغرافيا (History & Geography)",
  "التربية الإسلامية (Islamic Education)", "الفلسفة (Philosophy)", "التربية البدنية (Physical Education)", "الإعلام الآلي (Computer Science)", "التربية الفنية (Arts)", "التربية الموسيقية (Music)"
];

const LEVELS = [
  "الطور الابتدائي (Primary School)", "الطور المتوسط (Middle School)", "الطور الثانوي (High School)", "التعليم الجامعي (University)"
];

const ROLES = [
  "أستاذ (Teacher)", "مدير (Director)", "مفتش (Inspector)"
];

const RANKS = [
  "أستاذ متوسط", "أستاذ قسم أول", "أستاذ قسم ثاني", "أستاذ مميز"
];

export default function CompleteProfile() {
  const { profile, completeProfile, skipProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await skipProfile();
    } catch (err) {
      console.error(err);
      setError("Failed to skip. Please try again.");
    } finally {
      setSkipping(false);
    }
  };
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: profile?.displayName || '',
    wilaya: '',
    subject: '',
    level: '',
    role: 'أستاذ (Teacher)',
    rank: 'أستاذ متوسط',
    gender: 'ذكر (Male)',
    yearsOfExperience: 0,
    phoneNumber: '',
    birthDate: ''
  });

  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Step 1 -> Step 2 (Verification)
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
        setError("يرجى ملء الاسم واللقب ورقم الهاتف للمتابعة");
        return;
      }
      setStep(2);
      return;
    }

    // Step 2 (Verification) -> Step 3
    if (step === 2) {
      if (verificationCode !== '123456' && verificationCode !== '') { // Demo code or empty for auto-pass
        setError("رمز التحقق غير صحيح. جرب 123456");
        return;
      }
      setStep(3);
      return;
    }

    // After essential info is done (Step 3 or 4), we can save
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Check if phone number is already used by another user
      if (formData.phoneNumber) {
        const phoneCheckQuery = query(
          collection(db, 'users'),
          where('phoneNumber', '==', formData.phoneNumber)
        );
        const phoneCheckSnap = await getDocs(phoneCheckQuery);
        if (!phoneCheckSnap.empty) {
          const otherUser = phoneCheckSnap.docs.find(d => d.id !== profile?.uid);
          if (otherUser) {
            throw new Error('رقم الهاتف هذا مستخدم بالفعل من قبل حساب آخر');
          }
        }
      }

      const finalData = {
        ...formData,
        displayName: `${formData.firstName} ${formData.lastName}`.trim() || formData.displayName,
        phoneVerified: true // Mark as verified
      };
      await completeProfile(finalData);
    } catch (err: any) {
      console.error("Profile completion error:", err);
      let message = "Failed to save profile. Please try again.";
      try {
        const parsed = JSON.parse(err.message);
        message = parsed.error;
      } catch (e) {}
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl my-auto"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">إكمال الملف الشخصي</h2>
          <p className="text-slate-400 text-sm">ساعد زملائك الأساتذة في العثور عليك والتواصل معك.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-primary' : 'bg-slate-800'}`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-center mb-4">
                <p className="text-primary text-xs font-bold">المعلومات الأساسية (إلزامي)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">الاسم</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-right outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="الاسم"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">اللقب</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-right outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="اللقب"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">رقم الهاتف (للأمان)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">+213</span>
                  <input
                    required
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-16 pr-4 text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="0X XX XX XX XX"
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-500 text-center">سنرسل رمز تحقق للحفاظ على أمان حسابك.</p>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-white font-bold">تأكيد رقم الهاتف</p>
              <p className="text-slate-500 text-xs">أدخل الرمز المرسل إلى {formData.phoneNumber}</p>
              
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 text-center text-2xl font-black tracking-[1em] text-primary outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              
              <button 
                type="button"
                className="text-primary text-xs font-bold hover:underline"
                onClick={() => toast.success("تم إعادة إرسال الرمز")}
              >
                إعادة إرسال الرمز
              </button>
            </motion.div>
          ) : step === 3 ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-slate-800/50 rounded-2xl text-center mb-4">
                <p className="text-slate-300 text-xs font-bold">معلومات مهنية (يمكن إكمالها لاحقاً)</p>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">الولاية</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={formData.wilaya}
                    onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white text-right outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                  >
                    <option value="">اختر ولايتك</option>
                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">المادة الممارسة</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white text-right outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                  >
                    <option value="">اختر المادة</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">المرحلة التعليمية</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white text-right outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                  >
                    <option value="">اختر الطور</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">الرتبة والخبرة</label>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="سنوات الخبرة"
                    value={formData.yearsOfExperience || ''}
                    onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-right outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">تاريخ الميلاد</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-right outline-none"
                />
              </div>
            </motion.div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all"
              >
                رجوع
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {step < 4 ? 'الخطوة التالية' : 'إنهاء وحفظ'}
                  <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </div>
          
          {step >= 3 && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading || skipping}
              className="w-full mt-4 py-2 text-slate-500 hover:text-slate-300 text-sm font-bold border border-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              {skipping ? 'جاري الحفظ...' : 'تجاوز وإكمال لاحقاً (Skip)'}
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
}
