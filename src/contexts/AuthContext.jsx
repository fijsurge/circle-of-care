import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserDoc } from '../firebase/auth';
import { getCircle } from '../firebase/circles';

const AuthContext = createContext(null);

const DEV_UID = import.meta.env.VITE_DEV_UID;

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [currentCircle, setCurrentCircle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [roleOverride, setRoleOverrideState] = useState(
    () => sessionStorage.getItem('devRoleOverride') || null,
  );

  function setRoleOverride(role) {
    if (role) sessionStorage.setItem('devRoleOverride', role);
    else sessionStorage.removeItem('devRoleOverride');
    setRoleOverrideState(role);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
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

  const isDevMode = !!(DEV_UID && firebaseUser?.uid === DEV_UID);

  const effectiveUserDoc = isDevMode && roleOverride
    ? { ...userDoc, role: roleOverride }
    : userDoc;

  const value = {
    firebaseUser,
    userDoc:         effectiveUserDoc,
    currentCircle,
    loading,
    refreshUser,
    isAdmin:         effectiveUserDoc?.role === 'admin',
    isAuthenticated: !!firebaseUser,
    isDevMode,
    roleOverride,
    realRole:        userDoc?.role,
    setRoleOverride,
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
