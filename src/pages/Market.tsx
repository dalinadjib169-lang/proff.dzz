import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Product } from '../types';
import { ShoppingBag, Search, Plus, MapPin, Filter, Trash2, CheckCircle2, MessageCircle, Phone, X, Image as ImageIcon, Truck, Tag, Send, Zap, Dog, Dumbbell, Leaf, Home, Sparkles, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useUpload } from '../hooks/useUpload';
import { playSound } from '../lib/sounds';

const WILAYAS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira",
  "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Algiers", "Djelfa", "Jijel", "Sétif", "Saïda",
  "Skikda", "Sidi Bel Abbès", "Annab", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara",
  "Ouargla", "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt",
  "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa",
  "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam",
  "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
];

const CATEGORIES = [
  { id: 'all', label: 'الكل', icon: Tag },
  { id: 'clothing', label: 'ملابس', icon: ShoppingBag },
  { id: 'cars', label: 'سيارات', icon: Truck },
  { id: 'electronics', label: 'أدوات كهربائية', icon: Zap },
  { id: 'animals', label: 'حيوانات', icon: Dog },
  { id: 'sports', label: 'رياضة', icon: Dumbbell },
  { id: 'plants', label: 'نباتات', icon: Leaf },
  { id: 'home', label: 'أواني منزلية', icon: Home },
  { id: 'decor', label: 'أدوات زينة', icon: Sparkles },
  { id: 'other', label: 'أخرى', icon: MoreHorizontal }
];

export default function Market() {
  const { profile } = useAuth();
  const { startUpload } = useUpload();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWilaya, setSelectedWilaya] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    price: '',
    category: 'clothing',
    wilaya: '',
    hasDelivery: false,
    images: [] as string[]
  });

  useEffect(() => {
    let q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(50));

    if (selectedCategory !== 'all') {
      q = query(q, where('category', '==', selectedCategory));
    }
    
    if (selectedWilaya) {
      q = query(q, where('wilaya', '==', selectedWilaya));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      
      // Client-side search because Firestore doesn't support easy full-text
      if (searchTerm) {
        data = data.filter(p => 
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setProducts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setLoading(false);
    });

    return unsubscribe;
  }, [selectedCategory, selectedWilaya, searchTerm]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || newProduct.images.length === 0) return;

    try {
      setUploading(true);
      await addDoc(collection(db, 'products'), {
        sellerId: profile.uid,
        sellerName: profile.displayName,
        sellerPhoto: profile.photoURL,
        sellerPhone: profile.email === 'dalinadjib1990@gmail.com' ? '' : (profile.phoneNumber || ''),
        title: newProduct.title,
        description: newProduct.description,
        price: Number(newProduct.price),
        category: newProduct.category,
        wilaya: newProduct.wilaya || profile.wilaya || 'Algiers',
        hasDelivery: newProduct.hasDelivery,
        images: newProduct.images,
        status: 'available',
        createdAt: serverTimestamp()
      });
      
      setShowCreateModal(false);
      setNewProduct({
        title: '',
        description: '',
        price: '',
        category: 'clothing',
        wilaya: '',
        hasDelivery: false,
        images: []
      });
      playSound('notification');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setUploading(false);
    }
  };

  const toggleSoldStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'products', id), {
        status: currentStatus === 'available' ? 'sold' : 'available'
      });
      playSound('notification');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      playSound('notification');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleContactSeller = (product: Product) => {
    const isDeveloper = product.sellerId === 'SYSTEM_DEVELOPER_UID' || product.sellerName === 'دالي نجيب' || product.sellerName === 'نجيب دالي'; // Fallback detection
    
    // Internal messenger for everyone now, as requested for "real-time bubbles"
    window.dispatchEvent(new CustomEvent('show-chat', { 
      detail: { 
        uid: product.sellerId, 
        displayName: product.sellerName, 
        photoURL: product.sellerPhoto 
      } 
    }));
    
    // Notify the seller
    addDoc(collection(db, 'notifications'), {
      recipientId: product.sellerId,
      senderId: profile?.uid,
      senderName: profile?.displayName,
      type: 'market_interest',
      read: false,
      createdAt: serverTimestamp(),
      message: `مهتم بمنتجك: ${product.title}`
    });
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* Search & Filter Header */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-500/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">سوق المعلمين (Teac Market)</h1>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">بيع واشترِ مع زملائك</p>
            </div>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black transition-all shadow-lg shadow-orange-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">إضافة إعلان</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="ابحث عن سلعة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-slate-200 focus:border-orange-500 transition-all outline-none"
            />
          </div>
          <select 
            value={selectedWilaya}
            onChange={(e) => setSelectedWilaya(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-slate-200 focus:border-orange-500 outline-none transition-all"
          >
            <option value="">كل الولايات</option>
            {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <div className="flex bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-1 gap-1">
            {CATEGORIES.slice(0, 3).map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-1 flex flex-col items-center justify-center p-1 rounded-xl transition-all ${selectedCategory === cat.id ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <cat.icon className="w-4 h-4" />
                <span className="text-[10px] font-bold">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Toolbar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black whitespace-nowrap transition-all border ${
              selectedCategory === cat.id 
                ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-orange-500/50 hover:text-orange-400'
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <AnimatePresence>
          {products.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-xl group hover:border-orange-500/30 transition-all flex flex-col"
            >
              <div className="relative aspect-square overflow-hidden bg-slate-800">
                <img 
                  src={p.images[0]} 
                  alt={p.title} 
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${p.status === 'sold' && 'grayscale brightness-50'}`}
                />
                
                {p.status === 'sold' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-600 text-white font-black px-3 py-1 sm:px-6 sm:py-2 rounded-lg sm:rounded-xl rotate-12 shadow-2xl text-[10px] sm:text-sm">
                      تم البيع
                    </div>
                  </div>
                )}

                <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-start">
                  <div className="flex flex-col gap-1 sm:gap-2">
                    <span className="bg-orange-600/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl shadow-lg">
                      {p.price.toLocaleString()} دج
                    </span>
                    {p.hasDelivery && (
                      <span className="bg-green-600/90 backdrop-blur-md text-white text-[8px] sm:text-[10px] font-black px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl shadow-lg flex items-center gap-1 w-fit">
                        <Truck className="w-2.5 h-2.5 sm:w-3 h-3" />
                        <span className="hidden xs:inline">توصيل</span>
                      </span>
                    )}
                  </div>
                  
                  {p.sellerId === profile?.uid && (
                    <div className="flex gap-1 sm:gap-2">
                      <button 
                        onClick={() => toggleSoldStatus(p.id, p.status)}
                        className="bg-white/20 hover:bg-white/40 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md transition-all text-white border border-white/20"
                        title="Mark as Sold"
                      >
                        <CheckCircle2 className="w-3 h-3 sm:w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="bg-red-500/80 hover:bg-red-500 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md transition-all text-white border border-red-500/20 shadow-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 sm:p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <img src={p.sellerPhoto} alt="" className="w-4 h-4 sm:w-6 h-6 rounded-md sm:rounded-lg object-cover ring-2 ring-orange-500/20" />
                  <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">{p.sellerName}</span>
                </div>
                
                <h3 className="text-sm sm:text-lg font-black text-white mb-1 sm:mb-2 line-clamp-1">{p.title}</h3>
                <p className="text-slate-400 text-[10px] sm:text-sm font-medium mb-3 sm:mb-4 line-clamp-1 sm:line-clamp-2 leading-relaxed">{p.description}</p>
                
                <div className="mt-auto pt-2 sm:pt-4 border-t border-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-2.5 h-2.5 sm:w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[8px] sm:text-[10px] font-bold">{p.wilaya}</span>
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {p.createdAt ? formatDistanceToNow(p.createdAt.toDate()) : 'Now'}
                  </span>
                </div>

                <div className="mt-3 sm:mt-4 flex gap-1.5 sm:gap-2">
                  <button 
                    onClick={() => handleContactSeller(p)}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-black py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 group"
                  >
                    <MessageCircle className="w-3 h-3 sm:w-4 h-4 text-purple-500" />
                    <span className="text-[10px] sm:text-sm">تواصل</span>
                  </button>
                  {p.sellerPhone && p.sellerId !== 'SYSTEM_DEVELOPER_UID' && p.sellerName !== 'دالي نجيب' && (
                    <button 
                      onClick={() => handleContactSeller(p)}
                      className="bg-orange-600/10 hover:bg-orange-600 text-orange-500 hover:text-white border border-orange-500/20 hover:border-orange-500 p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all active:scale-95"
                    >
                      <Phone className="w-3 h-3 sm:w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {products.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-slate-900 rounded-3xl border border-dashed border-slate-800">
            <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-white font-black text-xl mb-1">لا توجد منتجات حالياً</h3>
            <p className="text-slate-500 font-medium">كن أول من يضيف إعلاناً في هذا القسم</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 p-2 rounded-xl">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-black text-white">إضافة إعلان جديد</h2>
                </div>
                <button onClick={() => !uploading && setShowCreateModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">عنوان الإعلان</label>
                  <input 
                    required
                    type="text"
                    placeholder="مثال: سيارة رونو كليو 4"
                    value={newProduct.title}
                    onChange={e => setNewProduct({...newProduct, title: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:border-orange-500 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">السعر (دج)</label>
                    <input 
                      required
                      type="number"
                      placeholder="0.00"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:border-orange-500 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">التصنيف</label>
                    <select 
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:border-orange-500 outline-none"
                    >
                      {CATEGORIES.filter(c => c.id !== 'all').map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">وصف السلعة</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="اكتب تفاصيل السلعة، المهارات، الحالة..."
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:border-orange-500 transition-all outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">الولاية</label>
                    <select 
                      required
                      value={newProduct.wilaya}
                      onChange={e => setNewProduct({...newProduct, wilaya: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:border-orange-500 outline-none"
                    >
                      <option value="">اختر الولاية</option>
                      {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer hover:border-orange-500/50 transition-all group">
                      <input 
                        type="checkbox"
                        checked={newProduct.hasDelivery}
                        onChange={e => setNewProduct({...newProduct, hasDelivery: e.target.checked})}
                        className="w-4 h-4 accent-orange-500"
                      />
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white">خدمة التوصيل متوفرة</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">صور المنتج (على الأقل صورة واحدة)</label>
                  <div className="flex flex-wrap gap-2">
                    {newProduct.images.map((img, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-800 ring-2 ring-orange-500/20">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setNewProduct({...newProduct, images: newProduct.images.filter((_, i) => i !== idx)})}
                          className="absolute top-1 right-1 bg-red-500 p-1 rounded-lg text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {newProduct.images.length < 5 && (
                      <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-800 hover:border-orange-500/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-950">
                        <ImageIcon className="w-6 h-6 text-slate-500" />
                        <span className="text-[8px] font-black text-slate-500 uppercase mt-2">إضافة صور</span>
                        <input 
                          type="file" 
                          hidden 
                          multiple
                          accept="image/*"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                              const remainingSlots = 5 - newProduct.images.length;
                              const filesToUpload = Array.from(files).slice(0, remainingSlots);
                              
                              const uploadPromises = filesToUpload.map(file => 
                                startUpload(file, 'post', { content: 'marketplace item image', skipFirestore: true })
                              );
                              
                              const urls = await Promise.all(uploadPromises);
                              const successfulUrls = urls.filter((url): url is string => !!url);
                              
                              if (successfulUrls.length > 0) {
                                setNewProduct(prev => ({
                                  ...prev,
                                  images: [...prev.images, ...successfulUrls].slice(0, 5)
                                }));
                              }
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    disabled={uploading || newProduct.images.length === 0}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-600/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        نشر الإعلان الآن
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
