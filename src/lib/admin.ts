/**
 * Admin detection and verification utility
 */

export function isUserAdmin(profile: any, user: any): boolean {
  if (!user && !profile) return false;
  
  const email = (profile?.email || user?.email || '').toLowerCase().trim();
  const phone = (profile?.phoneNumber || user?.phoneNumber || '').trim();
  const username = (profile?.username || '').toLowerCase().trim();
  const displayName = (profile?.displayName || '').toLowerCase().trim();
  const uid = (profile?.uid || user?.uid || '').trim();

  // Allowed admin configurations
  const allowedEmails = [
    'dalinadjib1990@gmail.com',
    'dalinadjib1990@gmai.com',
    'dalinadjib169@gmail.com'
  ];

  // Check email
  if (allowedEmails.includes(email)) return true;
  
  // Check phone number or other fields containing '077167330'
  if (
    phone.includes('077167330') || 
    phone.includes('77167330') ||
    username.includes('077167330') || 
    displayName.includes('077167330')
  ) {
    return true;
  }
  
  // UID shortcut
  if (uid === 'dalinadjib1990' || uid === 'dalinadjib169') return true;

  return false;
}
