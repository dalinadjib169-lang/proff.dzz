import { useAuth } from './useAuth';

const translations = {
  ar: {
    home: 'الرئيسية',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    notifications: 'التنبيهات',
    curriculum: 'المنهاج',
    colleagues: 'الزملاء',
    market: 'سوق الموارد',
    discussions: 'نقاشات',
    saved: 'المحفوظات',
    premium_tools: 'أدوات بريميوم',
    search_placeholder: 'البحث عن زملاء أو موارد...',
    post_placeholder: 'بماذا تفكر يا زميلي...',
    publish_now: 'نشر الآن',
    image: 'صورة',
    trending_topics: 'المواضيع الشائعة',
    friend_suggestions: 'اقتراحات الزملاء',
    invite_colleague: 'دعوة زميل',
    colleagues_status: 'حالة الزملاء',
    active_now: 'نشط الآن',
    connecting: 'جاري الاتصال بـ Teac DZ...',
    setting_up_profile: 'جاري إعداد ملفك الشخصي...',
    retry: 'إعادة المحاولة',
    refresh: 'تحديث الصفحة',
    save_settings: 'حفظ جميع الإعدادات',
    language: 'اللغة',
    theme: 'المظهر',
    font: 'الخط',
    font_size: 'حجم الخط',
    privacy: 'الخصوصية'
  },
  en: {
    home: 'Home',
    profile: 'Profile',
    settings: 'Settings',
    notifications: 'Notifications',
    curriculum: 'Curriculum',
    colleagues: 'Colleagues',
    market: 'Marketplace',
    discussions: 'Discussions',
    saved: 'Saved',
    premium_tools: 'Premium Tools',
    search_placeholder: 'Search colleagues or resources...',
    post_placeholder: 'What is on your mind...',
    publish_now: 'Post Now',
    image: 'Image',
    trending_topics: 'Trending Topics',
    friend_suggestions: 'Friend Suggestions',
    invite_colleague: 'Invite Colleague',
    colleagues_status: 'Colleagues Status',
    active_now: 'Active Now',
    connecting: 'Connecting to Teac DZ...',
    setting_up_profile: 'Setting up your profile...',
    retry: 'Retry',
    refresh: 'Refresh',
    save_settings: 'Save All Settings',
    language: 'Language',
    theme: 'Theme',
    font: 'Font',
    font_size: 'Font Size',
    privacy: 'Privacy'
  },
  fr: {
    home: 'Accueil',
    profile: 'Profil',
    settings: 'Paramètres',
    notifications: 'Notifications',
    curriculum: 'Programme',
    colleagues: 'Collègues',
    market: 'Marché',
    discussions: 'Discussions',
    saved: 'Enregistré',
    premium_tools: 'Outils Premium',
    search_placeholder: 'Rechercher des collègues...',
    post_placeholder: 'À quoi pensez-vous...',
    publish_now: 'Publier',
    image: 'Image',
    trending_topics: 'Tendances',
    friend_suggestions: 'Suggestions',
    invite_colleague: 'Inviter un collègue',
    colleagues_status: 'Status des collègues',
    active_now: 'En ligne',
    connecting: 'Connexion à Teac DZ...',
    setting_up_profile: 'Configuration du profil...',
    retry: 'Réessayer',
    refresh: 'Actualiser',
    save_settings: 'Enregistrer tout',
    language: 'Langue',
    theme: 'Thème',
    font: 'Police',
    font_size: 'Taille de police',
    privacy: 'Confidentialité'
  }
};

export function useTranslation() {
  const { profile } = useAuth();
  const lang = profile?.settings?.language || 'ar';
  
  const t = (key: keyof typeof translations['ar']) => {
    return translations[lang as keyof typeof translations]?.[key] || translations['ar'][key] || key;
  };

  return { t, lang };
}
