import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-hot-toast';
import {
  FileText,
  Sparkles,
  Copy,
  FileDown,
  Printer,
  Share2,
  Loader2,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { copyToClipboard } from '../lib/utils';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { playSound } from '../lib/sounds';

const STAGES = ['التعليم الابتدائي', 'التعليم المتوسط', 'التعليم الثانوي'];
const SUBJECTS = [
  'اللغة العربية',
  'الرياضيات',
  'اللغة الفرنسية',
  'اللغة الإنجليزية',
  'العلوم الفيزيائية',
  'علوم الطبيعة والحياة',
  'التاريخ والجغرافيا',
  'التربية الإسلامية',
  'التربية المدنية',
  'الإعلام الآلي',
  'الفلسفة',
];

function stripHtmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.innerText || div.textContent || '').trim();
}

export default function MemoGenerator1() {
  const { profile } = useAuth();
  const [stage, setStage] = useState(profile?.level || STAGES[0]);
  const [grade, setGrade] = useState('السنة الرابعة متوسط');
  const [subject, setSubject] = useState(profile?.subject || SUBJECTS[0]);
  const [unit, setUnit] = useState('');
  const [field, setField] = useState('');
  const [title, setTitle] = useState('');
  const [competency, setCompetency] = useState('');
  const [duration, setDuration] = useState('60 دقيقة');
  const [objectives, setObjectives] = useState('');
  const [teacherName, setTeacherName] = useState(profile?.displayName || 'الأستاذ(ة)');
  const [schoolName, setSchoolName] = useState(profile?.school || 'المؤسسة التربوية');
  const [memoType, setMemoType] = useState<'بناء تعلمات' | 'وضعية انطلاقية' | 'استثمار وإدماج'>('بناء تعلمات');
  const [contentHtml, setContentHtml] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const buildFallbackMemo = () => {
    return `
      <h2 style="text-align:center;">المذكرة البيداغوجية التربوية (رقم 01)</h2>
      <p><strong>الأستاذ(ة):</strong> ${teacherName} &nbsp;|&nbsp; <strong>المؤسسة:</strong> ${schoolName}</p>
      <p><strong>الطور:</strong> ${stage} &nbsp;|&nbsp; <strong>المستوى:</strong> ${grade} &nbsp;|&nbsp; <strong>المادة:</strong> ${subject}</p>
      <p><strong>المقطع التعلمي:</strong> ${unit || 'المقطع الأول'} &nbsp;|&nbsp; <strong>الميدان:</strong> ${field || 'الأنشطة البيداغوجية'} &nbsp;|&nbsp; <strong>المدة:</strong> ${duration}</p>
      <p><strong>الموضوع / النشاط:</strong> ${title || 'عنوان الدرس'}</p>
      <p><strong>نمط الحصة:</strong> ${memoType}</p>
      <p><strong>مركبة الكفاءة المستهدفة:</strong> ${competency || 'أن يوظف المتعلم مكتسباته القبلية في حل وضعيات تعلمية هادفة.'}</p>
      <p><strong>مؤشرات الكفاءة والأهداف التعلمية:</strong> ${objectives || 'فهم المفاهيم الأساسية، التحليل والاستنتاج السليم، والمشاركة الفعالة.'}</p>
      <table>
        <thead>
          <tr>
            <th>المراحل</th>
            <th>الوضعية التعليمية التعلمية (سيرورة الحصة)</th>
            <th>مؤشرات التقويم</th>
            <th>المدة</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. مرحلة الانطلاق (الوضعية المشكلة)</strong></td>
            <td>تهيئة الأذهان وطرح وضعية انطلاقية مرتبطة بواقع المتعلم لاستحضار المكتسبات القبلية وإثارة الفضول المعرفي حول موضوع "${title || 'الدرس'}".</td>
            <td>يسترجع مكتسباته القبلية ويتفاعل مع الوضعية.</td>
            <td>10 د</td>
          </tr>
          <tr>
            <td><strong>2. مرحلة بناء التعلمات</strong></td>
            <td>توزيع السندات والأنشطة على الأفواج، مرافقة المتعلمين في الملاحظة والتحليل، استخلاص القواعد والمفاهيم الأساسية وتدوين الخلاصة على السبورة.</td>
            <td>يحلل السندات، يكتشف المفهوم ويبني المعرفة جماعياً.</td>
            <td>35 د</td>
          </tr>
          <tr>
            <td><strong>3. مرحلة الاستثمار والتقويم</strong></td>
            <td>تطبيقات فردية وثنائية لترسيخ التعلمات، معالجة الصعوبات المرصودة آنياً، وتكليف المتعلمين بنشاط منزلي داعم.</td>
            <td>ينجز التطبيقات بدقة ويصحح أخطاءه.</td>
            <td>15 د</td>
          </tr>
        </tbody>
      </table>
      <blockquote><strong>ملاحظات الأستاذ التقييمية:</strong> ........................................................................</blockquote>
    `;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى كتابة عنوان الدرس أو النشاط أولاً');
      return;
    }
    setGenerating(true);
    try {
      const prompt = `
أنشئ مذكرة بيداغوجية رسمية متكاملة وفق المنهاج الجزائري للجيل الثاني باللغة العربية.
المعطيات:
- الطور التعليمي: ${stage}
- المستوى: ${grade}
- المادة: ${subject}
- المقطع التعلمي: ${unit || 'غير محدد'}
- الميدان: ${field || 'غير محدد'}
- الموضوع / النشاط: ${title}
- نمط الحصة: ${memoType}
- المدة الزمنية: ${duration}
- الكفاءة الختامية / المركبة المستهدفة: ${competency || 'تستنتج بيداغوجياً حسب المستوى والمادة'}
- الأهداف التعلمية / السندات: ${objectives || 'تستنتج بيداغوجياً'}
- الأستاذ(ة): ${teacherName}
- المؤسسة: ${schoolName}

شروط التنسيق الصارمة:
- أخرج محتوى HTML فقط صالحاً للعرض داخل محرر نصوص (بدون وسوم html أو body أو markdown \`\`\`).
- ابدأ بعنوان رسمي للمذكرة ثم جدول معلومات الترويسة، ثم جدول سيرورة الحصة بأربعة أعمدة: (المراحل | الوضعيات والأنشطة التعليمية التعلمية | مؤشرات التقويم | المدة).
- قسّم الحصة إلى: مرحلة الانطلاق، مرحلة بناء التعلمات (مع أنشطة دقيقة وأمثلة عملية)، ومرحلة الاستثمار والتقويم.
- اختم بفقرة ملخص سبوري / أثر كتابي وملاحظات الأستاذ.
`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemInstruction: 'أنت مفتش ومكوّن بيداغوجي جزائري خبير في إعداد المذكرات التربوية وفق مناهج وزارة التربية الوطنية الجزائرية. اكتب لغة عربية تربوية سليمة وخالية من الأخطاء، وأخرج HTML نظيفاً فقط.',
        }),
      });

      if (!res.ok) {
        throw new Error('تعذر الاتصال بالخادم');
      }
      const data = await res.json();
      let html = (data.text || '').replace(/```html|```/g, '').trim();
      if (!html) {
        html = buildFallbackMemo();
      }
      setContentHtml(html);
      playSound('success');
      toast.success('تم توليد المذكرة البيداغوجية بنجاح!');
    } catch (err) {
      console.warn('Gemini generation fallback used:', err);
      setContentHtml(buildFallbackMemo());
      toast('تم إنشاء قالب المذكرة البيداغوجي الرسمي (جاهز للتعديل والطباعة)', { icon: '📄' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyMemo = async () => {
    const plain = stripHtmlToText(contentHtml);
    if (!plain) {
      toast.error('لا يوجد نص لنسخه');
      return;
    }
    const ok = await copyToClipboard(plain);
    if (ok) toast.success('تم نسخ نص المذكرة إلى الحافظة');
    else toast.error('تعذر النسخ');
  };

  const handleExportPdf = async () => {
    if (!previewRef.current || !contentHtml) {
      toast.error('قم بتوليد المذكرة أولاً');
      return;
    }
    setExporting(true);
    try {
      const editorEl = previewRef.current.querySelector('.ql-editor') as HTMLElement || previewRef.current;
      await html2pdf()
        .set({
          margin: 12,
          filename: `مذكرة_${title || 'درس'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(editorEl)
        .save();
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تصدير PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportWord = async () => {
    const plain = stripHtmlToText(contentHtml);
    if (!plain) {
      toast.error('قم بتوليد المذكرة أولاً');
      return;
    }
    setExporting(true);
    try {
      const lines = plain.split('\n').filter((l) => l.trim().length > 0);
      const docFile = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                children: [new TextRun({ text: `مذكرة بيداغوجية: ${title || subject}`, bold: true, size: 32 })],
              }),
              ...lines.map(
                (line) =>
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true,
                    spacing: { after: 140 },
                    children: [new TextRun({ text: line, size: 24 })],
                  })
              ),
            ],
          },
        ],
      });
      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `مذكرة_${title || 'بيداغوجية'}.docx`);
      toast.success('تم تصدير ملف Word بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('فشل تصدير ملف Word');
    } finally {
      setExporting(false);
    }
  };

  const handlePublishToFeed = async () => {
    const plain = stripHtmlToText(contentHtml);
    if (!profile || !plain) return;
    setPublishing(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: `📘 مذكرة بيداغوجية مقترحة (${subject} - ${grade})\nالعنوان: ${title}\n\n${plain.slice(0, 1800)}`,
        likes: [],
        commentCount: 0,
        privacy: 'public',
        createdAt: serverTimestamp(),
      });
      playSound('post');
      toast.success('تم نشر المذكرة للزملاء على الحائط!');
    } catch (err) {
      toast.error('تعذر النشر على الحائط');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-indigo-600/20 via-purple-600/15 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                مولد المذكرات البيداغوجية 1
                <span className="text-[11px] bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-2.5 py-0.5 rounded-lg">
                  الجيل الثاني 🇩🇿
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">
                إعداد مذكرات الدروس اليومية منظمة بالجدول الرسمي مع تصدير PDF و Word جاهز للطباعة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleGenerate} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-wrap gap-2">
          {(['بناء تعلمات', 'وضعية انطلاقية', 'استثمار وإدماج'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMemoType(type)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                memoType === type
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">الطور التعليمي</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">المستوى الدراسي</label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="مثال: السنة الرابعة متوسط"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">المادة</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            >
              {SUBJECTS.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">المقطع التعلمي</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="مثال: المقطع 02 - التضامن الإنساني"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">الميدان</label>
            <input
              type="text"
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="مثال: فهم المكتوب / الهندسة والفضاء"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">المدة الزمنية</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            >
              <option value="45 دقيقة">45 دقيقة</option>
              <option value="60 دقيقة">60 دقيقة (ساعة واحدة)</option>
              <option value="90 دقيقة">90 دقيقة</option>
              <option value="120 دقيقة">120 دقيقة (ساعتان)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">عنوان الدرس / النشاط *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنوان الدرس بالتفصيل..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">مركبة الكفاءة المستهدفة</label>
            <input
              type="text"
              value={competency}
              onChange={(e) => setCompetency(e.target.value)}
              placeholder="اختياري: تترك فارغة للاقتراح الآلي"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-xs font-black text-slate-400">اسم الأستاذ(ة)</label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-xs font-black text-slate-400">المؤسسة التربوية</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-xs font-black text-slate-400">الوسائل والسندات</label>
            <input
              type="text"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="الكتاب المدرسي، السبورة، بطاقات..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={generating}
            className="flex-1 sm:flex-initial min-h-[48px] px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>{generating ? 'جاري بناء المذكرة...' : 'توليد المذكرة الآن'}</span>
          </button>

          <button
            type="button"
            onClick={() => setContentHtml(buildFallbackMemo())}
            className="min-h-[48px] px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>إدراج قالب فارغ فوري</span>
          </button>
        </div>
      </form>

      {/* Rich Editor & Export Bar */}
      {contentHtml && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyMemo}
                className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all"
              >
                <Copy className="w-4 h-4 text-sky-400" />
                <span>نسخ النص</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className="min-h-[44px] px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all"
              >
                <FileDown className="w-4 h-4" />
                <span>تصدير PDF</span>
              </button>

              <button
                onClick={handleExportWord}
                disabled={exporting}
                className="min-h-[44px] px-4 py-2 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>تصدير Word</span>
              </button>

              <button
                onClick={handlePublishToFeed}
                disabled={publishing}
                className="min-h-[44px] px-4 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span>مشاركة للزملاء</span>
              </button>
            </div>

            <button
              onClick={() => setContentHtml('')}
              className="min-h-[44px] px-3 py-2 text-slate-400 hover:text-red-400 text-xs font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              <span>مسح</span>
            </button>
          </div>

          <div ref={previewRef} className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
            <ReactQuill
              theme="snow"
              value={contentHtml}
              onChange={setContentHtml}
              className="pedagogical-editor"
            />
          </div>
        </div>
      )}
    </div>
  );
}
