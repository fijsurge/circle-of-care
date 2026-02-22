import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { registerPushNotifications, addPushListeners } from '../firebase/notifications';

export function usePushNotifications() {
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!firebaseUser?.uid) return;

    const uid = firebaseUser.uid;
    registerPushNotifications(uid);
    const cleanup = addPushListeners(uid);

    return cleanup;
  }, [firebaseUser?.uid]);
}
