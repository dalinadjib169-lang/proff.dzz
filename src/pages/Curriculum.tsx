import React, { useState } from 'react';
import { BookOpen, Search, Download, FileText, ChevronRight, Filter, Bookmark, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function Curriculum() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const resources = [
    { id: 1, title: 'وزارة التربية الوطنية - البرنامج السنوي للطور المتوسط', type: 'PDF', size: '2.4 MB', category: 'Official', date: '2024-09-01' },
    { id: 2, title: 'دليل الأستاذ في مادة الرياضيات - السنة الثالثة ثانوي', type: 'DOCX', size: '1.8 MB', category: 'Guide', date: '2023-11-15' },
    { id: 3, title: 'مخطط سير الدروس لمادة العلوم الطبيعية - BAC 2026', type: 'PDF', size: '3.1 MB', category: 'Curriculum', date: '2024-02-10' },
    { id: 4, title: 'نموذج تحضير مذكرات لغة عربية - الطور الابتدائي', type: 'DOCX', size: '0.9 MB', category: 'Template', date: '2024-01-20' },
    { id: 5, title: 'القانون الأساسي للأستاذ - الجريدة الرسمية', type: 'PDF', size: '1.2 MB', category: 'Legal', date: '2024-03-05' },
    { id: 6, title: 'قائمة المصطلحات العلمية - باللغة العربية والفرنسية', type: 'PDF', size: '2.0 MB', category: 'Resource', date: '2023-12-12' },
  ];

  const filteredResources = resources.filter(r => 
    r.title.includes(search) && (activeTab === 'all' || r.category === activeTab)
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Curriculum & Resources</h2>
              <p className="text-sm text-slate-500 font-medium">Official documents and educational materials</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="البحث عن مورد تعليمي..."
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold text-right"
                dir="rtl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'Official', 'Guide', 'Template'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 hover:bg-slate-900'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredResources.map((res, idx) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 hover:bg-slate-900 border hover:border-purple-500/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 ${res.type === 'PDF' ? 'text-red-500' : 'text-blue-500'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <h4 className="text-sm font-black text-slate-100 group-hover:text-purple-400 transition-colors" dir="rtl">{res.title}</h4>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      <span>{res.size}</span>
                      <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                      <span>{res.category}</span>
                      <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                      <span>{res.date}</span>
                    </div>
                  </div>
                </div>
                <button className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-purple-400 hover:border-purple-500/50 transition-all">
                  <Download className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-purple-600/5 border border-purple-500/20 rounded-3xl text-center">
            <h3 className="text-white font-black mb-2">Can't find what you're looking for?</h3>
            <p className="text-slate-400 text-sm mb-4">Request a document from the community or contribute by uploading your own.</p>
            <div className="flex justify-center gap-3">
              <button className="px-6 py-2 bg-purple-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-purple-700 transition-all">Upload Resource</button>
              <button className="px-6 py-2 bg-slate-950 border border-slate-800 text-slate-400 rounded-xl text-xs font-black hover:bg-slate-900 transition-all">Request Document</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
