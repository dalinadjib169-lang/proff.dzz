import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { GraduationCap, MapPin, BookOpen, Clock, User, CheckCircle2 } from 'lucide-react';

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
  const { profile, completeProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const finalData = {
        ...formData,
        displayName: `${formData.firstName} ${formData.lastName}`.trim() || formData.displayName
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
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 w-full max-w-md rounded-3xl p-8 border border-slate-800 shadow-2xl my-auto"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-purple-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Complete Your Profile</h2>
          <p className="text-slate-400 text-sm">Help other teachers find and connect with you.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-purple-500' : 'bg-slate-800'}`}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">First Name</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Last Name</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Wilaya (State)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    required
                    value={formData.wilaya}
                    onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                  >
                    <option value="">Select your wilaya</option>
                    {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Subject</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                  >
                    <option value="">Select your subject</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Gender (الجنس)</label>
                <div className="flex gap-4">
                  {['ذكر (Male)', 'أنثى (Female)'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold text-sm ${formData.gender === g ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-slate-800 bg-slate-950 text-slate-500'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Role (الصفة)</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Rank (الرتبة)</label>
                <select
                  required
                  value={formData.rank}
                  onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                >
                  {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Teaching Level</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    required
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
                  >
                    <option value="">Select level</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Years of Experience</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    required
                    type="number"
                    min="0"
                    max="50"
                    value={isNaN(formData.yearsOfExperience) ? '' : formData.yearsOfExperience}
                    onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
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
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Phone Number</label>
                <input
                  required
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="0X XX XX XX XX"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 block">Birth Date</label>
                <input
                  required
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
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
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-purple-600 hover:bg-purple-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {step < 3 ? 'Next Step' : 'Finish Setup'}
                  <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
