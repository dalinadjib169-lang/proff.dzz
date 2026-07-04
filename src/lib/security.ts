import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';

/**
 * Checks content for suspicious hacking signatures (XSS, SQLi, spam scripts, etc.)
 * If detected, calls the backend AI Threat Analyzer.
 * If AI confirms threat, logs to security_logs, locks user account, signs out, and alerts.
 * 
 * @param content String content to analyze
 * @param profile Current user profile
 * @returns true if threat was detected and blocked, false if safe.
 */
export async function checkAndBlockThreat(content: string, profile: any): Promise<boolean> {
  if (!content || !content.trim()) return false;
  
  const text = content.toLowerCase();
  
  // Fast client-side regex check for potential SQLi, XSS, or malware signatures
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /union\s+select/i,
    /select\s+.*\s+from/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /--/i, // SQL comment
    /xp_cmdshell/i,
    /src=.*alert/i,
    /<iframe/i,
  ];

  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(text));

  if (!hasSuspiciousPattern) {
    return false;
  }

  console.warn("Suspicious activity pattern intercepted. Scanning payload with Server AI...", content);
  
  try {
    const response = await fetch('/api/admin/analyze-threat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: '127.0.0.1 (Client-Side Intercepted)',
        path: window.location.pathname,
        payload: content,
        userAgent: navigator.userAgent,
        userEmail: profile?.email || auth.currentUser?.email || 'unknown@teac.dz'
      })
    });

    if (!response.ok) {
      console.warn("AI Threat Analyzer returned an error. Using local fallback blocking rules.");
      await blockAndLockUser(content, profile, "Client-Side Rule Intercepted", "XSS_Injection", "critical");
      return true;
    }

    const data = await response.json();
    const analysis = data.analysis;

    if (analysis && analysis.isThreat) {
      console.error("AI Threat Detector confirmed Security Threat:", analysis);
      await blockAndLockUser(
        content,
        profile,
        analysis.threatExplanationAr || "تم اكتشاف محاولة حقن أكواد برمجية ضارة.",
        analysis.threatType || "XSS_Injection",
        analysis.severity || "high"
      );
      return true;
    }

  } catch (err) {
    console.error("Error analyzing threat with server:", err);
    // Fallback: block anyway if it matched client-side regex for safety
    await blockAndLockUser(content, profile, "تم حظر المحاولة محلياً لحماية خوادم المنصة", "SQL_Injection", "high");
    return true;
  }

  return false;
}

async function blockAndLockUser(
  payload: string,
  profile: any,
  explanation: string,
  threatType: string,
  severity: string
) {
  const uid = profile?.uid || auth.currentUser?.uid;
  const email = profile?.email || auth.currentUser?.email || 'unknown@teac.dz';
  const displayName = profile?.displayName || 'مستخدم غير معروف';

  // 1. Log to security_logs
  try {
    await addDoc(collection(db, 'security_logs'), {
      ip: 'Client Security Engine',
      path: window.location.pathname,
      payload: payload.slice(0, 500),
      userAgent: navigator.userAgent,
      userEmail: email,
      severity: severity,
      threatType: threatType,
      threatExplanationAr: `[نظام الدفاع الآلي]: تم رصد وتجميد حساب بسبب: ${explanation}. المحتوى المحظور: "${payload.slice(0, 100)}..."`,
      actionTaken: 'lock_user_account',
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Failed to write to security_logs", e);
  }

  // 2. Lock User Account in Firestore
  if (uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const privateRef = doc(db, 'users_private', uid);
      
      const updateData = {
        isLocked: true,
        status: 'locked_by_user_security',
        lockReason: explanation,
        lockedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);
      await updateDoc(privateRef, updateData);
    } catch (e) {
      console.error("Failed to update user lock status", e);
    }
  }

  // 3. Alert user and sign out
  toast.error(
    `🚨 تهديد أمني! تم قفل حسابك لأسباب أمنية.
     السبب: ${explanation}.
     يمكنك استرجاع حسابك عبر البريد الإلكتروني أو التواصل مع الدعم.`,
    { duration: 10000 }
  );

  setTimeout(async () => {
    try {
      await signOut(auth);
      window.location.href = '/login?security_locked=true';
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.reload();
    }
  }, 3000);
}
