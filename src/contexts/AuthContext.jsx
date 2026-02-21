import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserDoc } from '../firebase/auth';
import { getCircle } from '../firebase/circles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [currentCircle, setCurrentCircle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const doc = await getUserDoc(user.uid);
          setUserDoc(doc);

          if (doc?.circleId) {
            const circle = await getCircle(doc.circleId);
            setCurrentCircle(circle);
          } else {
            setCurrentCircle(null);
          }
        } catch (err) {
          console.error('Error loading user data:', err);
        }
      } else {
        setUserDoc(null);
        setCurrentCircle(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshUser = async () => {
    if (!firebaseUser) return;
    const doc = await getUserDoc(firebaseUser.uid);
    setUserDoc(doc);
    if (doc?.circleId) {
      const circle = await getCircle(doc.circleId);
      setCurrentCircle(circle);
    }
  };

  const value = {
    firebaseUser,
    userDoc,
    currentCircle,
    loading,
    refreshUser,
    isAdmin: userDoc?.role === 'admin',
    isAuthenticated: !!firebaseUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
