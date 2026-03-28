import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { UserProfile } from '../types';
export type { UserProfile };

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  guestName: string;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateLastActive: () => Promise<void>;
  isUsernameUnique: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_NAMES = [
  "The Wanderer",
  "Lost Star",
  "Ligaw na Liwanag",
  "Banaag",
  "Night Voyager",
  "Tahimik na Siklab",
  "Alipato"
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [guestName, setGuestName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize guest name
    const storedGuestName = sessionStorage.getItem('hiraya_guest_name');
    if (storedGuestName) {
      setGuestName(storedGuestName);
    } else {
      const randomName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
      setGuestName(randomName);
      sessionStorage.setItem('hiraya_guest_name', randomName);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // Migrate legacy data
            let needsUpdate = false;
            const updates: any = { lastActive: serverTimestamp() };

            if (data.lookingFor && !Array.isArray(data.lookingFor)) {
              updates.lookingFor = [data.lookingFor];
              needsUpdate = true;
            }
            
            // Ensure map coordinates exist for legacy users
            if (data.x === undefined || data.y === undefined) {
              updates.x = Math.floor(Math.random() * 4000) + 500;
              updates.y = Math.floor(Math.random() * 4000) + 500;
              needsUpdate = true;
            }

            setProfile({ ...data, ...updates });
            
            // Update lastActive and any migrated fields
            await updateDoc(docRef, updates);
            
            // Ensure private data exists for legacy users
            if (firebaseUser.email) {
              const privateDocRef = doc(db, 'users_private', firebaseUser.uid);
              const privateDocSnap = await getDoc(privateDocRef);
              if (!privateDocSnap.exists()) {
                await setDoc(privateDocRef, {
                  email: firebaseUser.email,
                  createdAt: serverTimestamp(),
                });
              }
            }
          } else {
            // Create new profile
            const colors = ['purple', 'pink', 'blue', 'cyan', 'yellow'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              username: firebaseUser.displayName || 'Anonymous Star',
              nickname: firebaseUser.displayName || 'Anonymous Star',
              color: randomColor,
              tags: [],
              signal: 'Just joined the constellation.',
              x: Math.floor(Math.random() * 4000) + 500, // 500 to 4500
              y: Math.floor(Math.random() * 4000) + 500,
              createdAt: serverTimestamp(),
              lastActive: serverTimestamp(),
              blockedUsers: [],
              onboarded: false,
              favorites: [],
              lookingFor: [],
            };
            await setDoc(docRef, newProfile);
            
            // Save private data
            if (firebaseUser.email) {
              await setDoc(doc(db, 'users_private', firebaseUser.uid), {
                email: firebaseUser.email,
                createdAt: serverTimestamp(),
              });
            }
            
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign in error', error);
      throw error;
    }
  };

  const isUsernameUnique = async (username: string) => {
    const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    try {
      const unique = await isUsernameUnique(username);
      if (!unique) {
        throw new Error('Username is already taken.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update auth profile with username
      await updateAuthProfile(firebaseUser, { displayName: username });

      // Create firestore profile
      const colors = ['purple', 'pink', 'blue', 'cyan', 'yellow'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        username: username,
        nickname: username,
        color: randomColor,
        tags: [],
        signal: 'Just joined the constellation.',
        x: Math.floor(Math.random() * 4000) + 500,
        y: Math.floor(Math.random() * 4000) + 500,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        blockedUsers: [],
        onboarded: false,
        favorites: [],
        lookingFor: [],
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      
      // Save private data
      if (firebaseUser.email) {
        await setDoc(doc(db, 'users_private', firebaseUser.uid), {
          email: firebaseUser.email,
          createdAt: serverTimestamp(),
        });
      }
      
      setProfile(newProfile);
    } catch (error) {
      console.error('Email sign up error', error);
      throw error;
    }
  };

  const signOut = async () => {
    await auth.signOut();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const { uid, createdAt, ...updateData } = data;
      await updateDoc(docRef, updateData);
      setProfile({ ...profile, ...updateData });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateLastActive = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { lastActive: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      guestName,
      loading, 
      signIn, 
      signInWithEmail, 
      signUpWithEmail, 
      signOut, 
      updateProfile, 
      updateLastActive,
      isUsernameUnique
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
