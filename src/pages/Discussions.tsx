import React from 'react';
import { MessageSquare, TrendingUp, Filter, Plus, ChevronRight, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function Discussions() {
  const topics = [
    { id: 1, title: 'كيفية التعامل مع الأقسام كثيرة العدد؟', category: 'Pedagogy', author: 'أحمد بن علي', replies: 45, views: 1200, time: '2h ago' },
    { id: 2, title: 'جديد مسابقة الأساتذة لعام 2026 - التفاصيل الكاملة', category: 'News', author: 'إيمان نور', replies: 128, views: 5600, time: '5h ago' },
    { id: 3, title: 'استخدام الذكاء الاصطناعي في تحضير المذكرات', category: 'Technology', author: 'دالي نجيب', replies: 89, views: 3400, time: '1d ago' },
    { id: 4, title: 'مشكل تأخر وصول الكتب المدرسية لبعض الولايات', category: 'Admin', author: 'ياسين محمد', replies: 23, views: 800, time: '3h ago' },
    { id: 5, title: 'تبادل خبرات: أفضل الكتب الخارجية للسنة الرابعة متوسط', category: 'Resources', author: 'سمية س.', replies: 56, views: 2100, time: '8h ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-hidden relative">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 p-3 rounded-2xl">
              <MessageSquare className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">النقاشات - Discussions</h2>
              <p className="text-sm text-slate-500 font-medium">Professional exchange and forum</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">
            <Plus className="w-4 h-4" />
            <span>New Discussion</span>
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {['الكل', 'بيداغوجيا', 'أخبار', 'تكنولوجيا', 'إدارة', 'موارد'].map((filter, i) => (
            <button
              key={filter}
              className={`px-6 py-2.5 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${i === 0 ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-indigo-400'}`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {topics.map((topic, idx) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800/50 hover:bg-slate-900 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[8px] font-black uppercase rounded-lg border border-slate-700">{topic.category}</span>
                    <span className="text-[10px] text-slate-600 font-bold">{topic.time}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight mb-2" dir="rtl">
                    {topic.title}
                  </h3>
                  <div className="flex items-center justify-end gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {topic.replies} Replies</span>
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {topic.views} Views</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-400">
                      <span>{topic.author}</span>
                      <div className="w-6 h-6 bg-slate-800 rounded-lg flex items-center justify-center">
                        <User className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2 text-slate-700 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
