import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Download, FileText, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function Curriculum() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'curriculum_resources'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(fetched);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const filteredResources = resources.filter(r => 
    (r.title || '').includes(search) && (activeTab === 'all' || r.category === activeTab)
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-hidden relative min-h-[600px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-500/20">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">المنهاج والموارد</h2>
                <p className="text-sm text-slate-500 font-medium">الوثائق الرسمية والموارد التعليمية ({resources.length} مورد)</p>
              </div>
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
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="py-20 text-center">
              <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-bold">لا توجد موارد حالياً (0).</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResources.map((res, idx) => (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 hover:bg-slate-900 border hover:border-purple-500/30 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-slate-900 border border-slate-800 text-purple-500`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h4 className="text-sm font-black text-slate-100 group-hover:text-purple-400 transition-colors" dir="rtl">{res.title}</h4>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        <span>{res.category || 'عام'}</span>
                      </div>
                    </div>
                  </div>
                  {res.url && (
                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-purple-400 hover:border-purple-500/50 transition-all">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
