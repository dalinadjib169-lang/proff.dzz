import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let loadingTimeout: any = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // Set a timeout to prevent infinite loading if Firestore hangs
        loadingTimeout = setTimeout(() => {
          if (loading) {
            console.warn("Profile fetch timed out after 30s for UID:", u.uid);
            setError("Profile loading is taking longer than expected. This might be due to a slow connection. Please refresh the page.");
            setLoading(false);
          }
        }, 30000);

        // Listen for real-time profile updates
        const docRef = doc(db, 'users', u.uid);
        const privateRef = doc(db, 'users_private', u.uid);
        console.log("Subscribing to profile for UID:", u.uid);
        
        // Listen to public data
        const unsubPublic = onSnapshot(docRef, (docSnap) => {
          if (loadingTimeout) clearTimeout(loadingTimeout);
          
          if (docSnap.exists()) {
            const publicData = docSnap.data() as UserProfile;
            setProfile(prev => {
              const base = (prev || {}) as Partial<UserProfile>;
              // Deep merge defaults for reminders and settings for existing users
              const merged = {
                ...base,
                ...publicData,
                settings: {
                  language: 'ar',
                  theme: 'dark',
                  fontSize: 'medium',
                  fontType: 'sans',
                  defaultPostPrivacy: 'public',
                  ...(base.settings || {}),
                  ...(publicData.settings || {})
                },
                reminders: {
                  prayer: false,
                  water: false,
                  exercise: false,
                  waterGoal: 8,
                  waterCurrent: 0,
                  waterGlassCount: 0,
                  ...(base.reminders || {}),
                  ...(publicData.reminders || {})
                }
              } as UserProfile;
              return merged;
            });
            
            // Check if profile is complete
            const isComplete = !!(
              publicData.displayName && 
              publicData.wilaya && 
              publicData.subject && 
              publicData.level && 
              publicData.yearsOfExperience !== undefined
            );
            
            const updates: any = {};
            if (publicData.isProfileComplete !== isComplete) {
              updates.isProfileComplete = isComplete;
            }
            
            // Update lastSeen if not updated recently (more than 5 minutes)
            // Be careful with serverTimestamp() comparison
            const now = new Date();
            const lastSeen = publicData.lastSeen?.toDate();
            // Only update if we have a real date and it's old enough
            // and we are NOT currently in a pending write state (approximated)
            if (lastSeen && (now.getTime() - lastSeen.getTime() > 300000)) {
              updates.lastSeen = serverTimestamp();
            } else if (!lastSeen) {
              // If it's null, it might be a pending write, so we wait
              // Only update if it's truly missing (new profile)
              if (!publicData.createdAt) {
                 updates.lastSeen = serverTimestamp();
              }
            }

            if (Object.keys(updates).length > 0) {
              updateDoc(docRef, updates).catch(e => {
                console.error("Error auto-updating profile:", e);
              });
            }
            setLoading(false);
          } else {
            // Create profile if it doesn't exist
            console.log("No profile found, creating one...");
            
            let firstName = '';
            let lastName = '';
            const pendingData = localStorage.getItem('pendingRegistrationData');
            if (pendingData) {
              try {
                const parsed = JSON.parse(pendingData);
                firstName = parsed.firstName || '';
                lastName = parsed.lastName || '';
                localStorage.removeItem('pendingRegistrationData');
              } catch (e) {
                console.error("Error parsing pending registration data:", e);
              }
            }

            const newProfile: Partial<UserProfile> = {
              uid: u.uid,
              displayName: firstName && lastName ? `${firstName} ${lastName}` : (u.displayName || 'Teacher'),
              photoURL: u.photoURL || `https://ui-avatars.com/api/?name=${firstName || u.displayName || 'T'}`,
              createdAt: serverTimestamp(),
              lastSeen: serverTimestamp(),
              isProfileComplete: false,
              followers: [],
              following: [],
              friends: [],
              blockedUsers: [],
              bioBackground: 'linear-gradient(to bottom right, #4f46e5, #7c3aed)',
              bioTextColor: '#ffffff',
              savedPreferences: {
                teacherFirstName: firstName,
                teacherLastName: lastName
              },
              usage: {
                generate: 0,
                correct: 0,
                image: 0,
                translate: 0,
                lastUsed: new Date().toISOString().split('T')[0]
              },
              settings: {
                language: 'ar',
                theme: 'dark',
                fontSize: 'medium',
                fontType: 'sans',
                defaultPostPrivacy: 'public'
              },
              reminders: {
                prayer: false,
                water: false,
                exercise: false,
                waterGoal: 8,
                waterCurrent: 0,
                waterGlassCount: 0
              }
            };
            
            const privateData = {
              email: u.email || '',
              phoneNumber: '',
              settings: {
                language: 'ar',
                theme: 'dark',
                fontSize: 'medium',
                fontType: 'sans',
                defaultPostPrivacy: 'public'
              },
              reminders: {
                prayer: false,
                water: false,
                exercise: false,
                waterGoal: 8,
                waterCurrent: 0,
                waterGlassCount: 0,
                lastWaterReset: serverTimestamp()
              }
            };
            
            setDoc(docRef, newProfile as any).catch(e => console.error("Error creating public profile:", e));
            setDoc(privateRef, privateData).catch(e => console.error("Error creating private profile:", e));
            setProfile({ ...newProfile, ...privateData } as any);
            setLoading(false);
          }
        }, (err: any) => {
          if (loadingTimeout) clearTimeout(loadingTimeout);
          console.error("Public profile onSnapshot error:", err);
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
          setLoading(false);
        });

        // Listen to private data
        const unsubPrivate = onSnapshot(privateRef, (docSnap) => {
          if (docSnap.exists()) {
            const privateData = docSnap.data();
            setProfile(prev => {
              const newProfile = { ...(prev || {}), ...privateData } as UserProfile;
              return newProfile;
            });
          }
        }, (err: any) => {
          console.error("Private profile onSnapshot error:", err);
          handleFirestoreError(err, OperationType.GET, `users_private/${u.uid}`);
        });

        unsubscribeProfile = () => {
          unsubPublic();
          unsubPrivate();
        };
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        if (loadingTimeout) clearTimeout(loadingTimeout);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, []);

  const completeProfile = async (data: Partial<UserProfile>) => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const privateRef = doc(db, 'users_private', auth.currentUser.uid);
    try {
      const { email, phoneNumber, reminders, ...publicData } = data as any;
      
      const updatePublic = {
        ...publicData,
        isProfileComplete: true,
        showEmail: data.showEmail ?? true,
        showPhone: data.showPhone ?? true,
      };

      const updatePrivate: any = {};
      if (email !== undefined) updatePrivate.email = email;
      if (phoneNumber !== undefined) updatePrivate.phoneNumber = phoneNumber;
      if (reminders !== undefined) updatePrivate.reminders = reminders;

      await updateDoc(userRef, updatePublic);
      if (Object.keys(updatePrivate).length > 0) {
        await updateDoc(privateRef, updatePrivate);
      }
      // Profile will be updated automatically by onSnapshot
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const retry = () => {
    // With onSnapshot, retry is less critical, but we can re-trigger if needed
    setLoading(true);
    if (auth.currentUser) {
      // The onSnapshot will already be active, but we can force a refresh if we want
    }
    setLoading(false);
  };

  const statusInterval = null;

  return { user, profile, loading, error, retry, completeProfile, statusInterval };
}
