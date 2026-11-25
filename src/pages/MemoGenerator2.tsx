import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-hot-toast';
import {
  ClipboardCheck,
  Sparkles,
  Copy,
  FileDown,
  FileText,
  Loader2,
  CheckSquare,
  RotateCcw,
  Share2,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { copyToClipboard } from '../lib/utils';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { playSound } from '../lib/sounds';

type AssessmentType = 'فرض محروس' | 'اختبار فصلي' | 'وضعية إدماجية' | 'بطاقة معالجة';

function stripHtmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.innerText || div.textContent || '').trim();
}

export default function MemoGenerator2() {
  const { profile } = useAuth();
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('فرض محروس');
  const [stage, setStage] = useState(profile?.level || 'التعليم المتوسط');
  const [grade, setGrade] = useState('السنة الثالثة متوسط');
  const [subject, setSubject] = useState(profile?.subject || 'الرياضيات');
  const [topics, setTopics] = useState('');
  const [maxScore, setMaxScore] = useState('20');
  const [difficulty, setDifficulty] = useState<'سهل' | 'متوازن' | 'تحدي'>('متوازن');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [schoolName, setSchoolName] = useState(profile?.school || 'المتوسطة / الثانوية');
  const [contentHtml, setContentHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const buildFallbackAssessment = () => {
    return `
      <h2 style="text-align:center;">الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</h2>
      <p style="text-align:center;"><strong>المؤسسة:</strong> ${schoolName} &nbsp;|&nbsp; <strong>المستوى:</strong> ${grade} (${stage})</p>
      <h3 style="text-align:center;">${assessmentType} في مادة ${subject} — العلامة: /${maxScore}</h3>
      <p><strong>الدروس المعنية:</strong> ${topics || 'المقطع الأول والثاني'}</p>
      <hr />
      <p><strong>التمرين الأول (06 نقاط):</strong></p>
      <p>أجب بصحيح أو خطأ مع تصحيح الخطأ إن وجد حول المفاهيم الأساسية لموضوع (${topics || subject}).</p>
      <p><strong>التمرين الثاني (06 نقاط):</strong></p>
      <p>وضعية تطبيقية مباشرة تقيس قدرة المتعلم على توظيف الموارد المعرفية المكتسبة.</p>
      <p><strong>الوضعية الإدماجية (08 نقاط):</strong></p>
      <p>السياق: صادف تلميذ مشكلة تتطلب توظيف ما درسه في (${topics || 'المحور'}).<br />التعليمة: حلل السندات ثم اقترح الحل المنهجي مع التبرير.</p>
      ${
        includeAnswerKey
          ? `
        <hr />
        <h3 style="text-align:center;">الإجابة النموذجية وسلم التنقيط</h3>
        <table>
          <thead>
            <tr>
              <th>المحور / التمرين</th>
              <th>عناصر الإجابة النموذجية</th>
              <th>سلم التنقيط</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>التمرين الأول</td>
              <td>تقييم المعارف القبلية وتصويب العبارات بدقة علمية.</td>
              <td>06 ن</td>
            </tr>
            <tr>
              <td>التمرين الثاني</td>
              <td>الخطوات المنهجية والنتيجة النهائية.</td>
              <td>06 ن</td>
            </tr>
            <tr>
              <td>الوضعية الإدماجية</td>
              <td>الوجاهة (02 ن) + الاستعمال السليم لأدوات المادة (04 ن) + الانسجام والإتقان (02 ن).</td>
              <td>08 ن</td>
            </tr>
          </tbody>
        </table>
      `
          : ''
      }
    `;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topics.trim()) {
      toast.error('يرجى إدخال الدروس أو المحاور المعنية');
      return;
    }
    setGenerating(true);
    try {
      const prompt = `
أعد ${assessmentType} رسمياً متكاملاً باللغة العربية وفق التوجيهات البيداغوجية في الجزائر.
المواصفات:
- الطور: ${stage}
- المستوى: ${grade}
- المادة: ${subject}
- المؤسسة: ${schoolName}
- المحاور والدروس المشمولة: ${topics}
- العلامة الإجمالية: /${maxScore}
- مستوى الصعوبة: ${difficulty}
- تضمين التصحيح النموذجي وشبكة/سلم التنقيط: ${includeAnswerKey ? 'نعم بالتفصيل في جدول منظم' : 'لا'}

شروط الإخراج:
- أخرج HTML نظيفاً فقط (بدون وسوم html/body وبدون علامات markdown).
- ضع ترويسة الجمهورية الجزائرية الديمقراطية الشعبية + اسم المادة والمستوى والمدة.
- وزّع الأسئلة بوضوح مع تنقيط كل جزء بما يساوي /${maxScore}.
- اجعل الوضعية الإدماجية واقعية ومحفزة للتفكير.
`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemInstruction: 'أنت أستاذ مكون ومفتش تربية جزائري مختص في إعداد الفروض والاختبارات وشبكات التقويم. اكتب أسئلة دقيقة تربوياً وتنقيطاً متوازناً وأخرج HTML نظيفاً فقط.',
        }),
      });

      if (!res.ok) throw new Error('فشل الاتصال');
      const data = await res.json();
      let html = (data.text || '').replace(/```html|```/g, '').trim();
      if (!html) html = buildFallbackAssessment();
      setContentHtml(html);
      playSound('success');
      toast.success(`تم إعداد ${assessmentType} بنجاح!`);
    } catch (err) {
      console.warn('MemoGenerator2 fallback used:', err);
      setContentHtml(buildFallbackAssessment());
      toast('تم إنشاء نموذج التقييم جاهزاً للتعديل والطباعة', { icon: '📝' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    const plain = stripHtmlToText(contentHtml);
    if (!plain) return;
    const ok = await copyToClipboard(plain);
    if (ok) toast.success('تم نسخ الموضوع بالكامل');
    else toast.error('تعذر النسخ');
  };

  const handleExportPdf = async () => {
    if (!previewRef.current || !contentHtml) return;
    setExporting(true);
    try {
      const editorEl = previewRef.current.querySelector('.ql-editor') as HTMLElement || previewRef.current;
      await html2pdf()
        .set({
          margin: 12,
          filename: `${assessmentType}_${subject}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(editorEl)
        .save();
      toast.success('تم تصدير ملف PDF بنجاح');
    } catch {
      toast.error('تعذر تصدير PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportWord = async () => {
    const plain = stripHtmlToText(contentHtml);
    if (!plain) return;
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
                children: [new TextRun({ text: `${assessmentType} - ${subject} (${grade})`, bold: true, size: 32 })],
              }),
              ...lines.map(
                (line) =>
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true,
                    spacing: { after: 120 },
                    children: [new TextRun({ text: line, size: 24 })],
                  })
              ),
            ],
          },
        ],
      });
      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `${assessmentType}_${subject}.docx`);
      toast.success('تم تصدير ملف Word بنجاح');
    } catch {
      toast.error('فشل تصدير ملف Word');
    } finally {
      setExporting(false);
    }
  };

  const handlePublish = async () => {
    const plain = stripHtmlToText(contentHtml);
    if (!profile || !plain) return;
    setPublishing(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: `📝 ${assessmentType} مقترح في مادة ${subject} (${grade})\n\n${plain.slice(0, 1800)}`,
        likes: [],
        commentCount: 0,
        privacy: 'public',
        createdAt: serverTimestamp(),
      });
      playSound('post');
      toast.success('تم نشر النموذج على الحائط!');
    } catch {
      toast.error('تعذر النشر');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <div className="bg-gradient-to-l from-amber-500/20 via-orange-600/15 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
            <ClipboardCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              مولد المذكرات 2 — الفروض والاختبارات
              <span className="text-[11px] bg-amber-500/20 border border-amber-400/30 text-amber-300 px-2.5 py-0.5 rounded-lg">
                سلم التنقيط والتصحيح
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-bold mt-1">
              تصميم الفروض المحروسة، الاختبارات الفصلية، الوضعيات الإدماجية وبطاقات المعالجة مع التصحيح النموذجي
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-wrap gap-2">
          {(['فرض محروس', 'اختبار فصلي', 'وضعية إدماجية', 'بطاقة معالجة'] as AssessmentType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAssessmentType(type)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                assessmentType === type
                  ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/25'
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
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-amber-500"
            >
              <option value="التعليم الابتدائي">التعليم الابتدائي</option>
              <option value="التعليم المتوسط">التعليم المتوسط</option>
              <option value="التعليم الثانوي">التعليم الثانوي</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">القسم / السنة</label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">المادة</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">سلم التنقيط</label>
            <select
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-amber-500"
            >
              <option value="10">من 10 نقاط (/10)</option>
              <option value="20">من 20 نقطة (/20)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">مستوى الأسئلة</label>
            <div className="grid grid-cols-3 gap-2">
              {(['سهل', 'متوازن', 'تحدي'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl)}
                  className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                    difficulty === lvl
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-400">اسم المؤسسة</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-400">الدروس والمحاور المشمولة في الموضوع *</label>
          <textarea
            rows={2}
            required
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="مثال: القاسم المشترك الأكبر، نظرية طاليس، الجذور التربيعية..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-amber-500 resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 w-fit">
          <input
            type="checkbox"
            checked={includeAnswerKey}
            onChange={(e) => setIncludeAnswerKey(e.target.checked)}
            className="w-4 h-4 accent-amber-500"
          />
          <span className="text-xs font-black text-slate-200 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            تضمين التصحيح النموذجي وشبكة التنقيط المفصلة
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={generating}
            className="min-h-[48px] px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-amber-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>{generating ? 'جاري إعداد الموضوع...' : `توليد ${assessmentType}`}</span>
          </button>

          <button
            type="button"
            onClick={() => setContentHtml(buildFallbackAssessment())}
            className="min-h-[48px] px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>إدراج هيكل تقويم جاهز</span>
          </button>
        </div>
      </form>

      {contentHtml && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopy}
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
                <FileText className="w-4 h-4" />
                <span>تصدير Word</span>
              </button>
              <button
                onClick={handlePublish}
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
