import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Users, Search, MapPin, GraduationCap, MessageSquare, UserPlus, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Colleagues() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [wilayaFilter, setWilayaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('lastSeen', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[]);
      setLoading(false);
    });
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
                         u.subject?.toLowerCase().includes(search.toLowerCase());
    const matchesWilaya = !wilayaFilter || u.wilaya === wilayaFilter;
    return matchesSearch && matchesWilaya;
  });

  const WILAYAS = [
    'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
    'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Algiers',
    'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annabba', 'Guelma',
    'Constantine', 'Médéa', 'Mostaganem', 'M\'Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh',
    'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued',
    'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent', 'Ghardaïa', 'Relizane'
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/10 p-3 rounded-2xl">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">الزملاء - Colleagues</h2>
              <p className="text-sm text-slate-500 font-medium">Connect with teachers across Algeria</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search name or subject..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold"
              value={wilayaFilter}
              onChange={(e) => setWilayaFilter(e.target.value)}
            >
              <option value="">All Wilayas</option>
              {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredUsers.map((user, idx) => (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex gap-4">
                    <img 
                      src={user.photoURL} 
                      className="w-16 h-16 rounded-xl object-cover ring-2 ring-purple-500/10 group-hover:ring-purple-500/30 transition-all"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${user.uid}`} className="text-lg font-black text-white hover:text-purple-400 truncate block">
                        {user.displayName}
                      </Link>
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-1">
                        <GraduationCap className="w-3 h-3" />
                        <span>{user.subject || 'Education'} • {user.level || 'General'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{user.wilaya || 'Algeria'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link 
                      to={`/profile/${user.uid}`}
                      className="flex-1 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-center"
                    >
                      View Profile
                    </Link>
                    <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('show-chat', { detail: user }))}
                      className="p-2 bg-purple-600/10 text-purple-400 rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-lg shadow-purple-500/10"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="bg-slate-950 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-slate-800">
              <Users className="w-8 h-8 text-slate-700" />
            </div>
            <p className="text-slate-500 font-bold">No colleagues found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
