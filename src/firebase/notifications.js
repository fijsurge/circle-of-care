import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

export async function registerPushNotifications(userId) {
  const result = await PushNotifications.requestPermissions();
  if (result.receive === 'granted') {
    await PushNotifications.register();
  }
}

export function addPushListeners(userId) {
  const handles = [];

  const setup = async () => {
    const h1 = await PushNotifications.addListener('registration', async (token) => {
      try {
        await updateDoc(doc(db, 'users', userId), { fcmToken: token.value });
      } catch (e) {
        console.error('Failed to store FCM token:', e);
      }
    });
    handles.push(h1);

    const h2 = await PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
    });
    handles.push(h2);

    const h3 = await PushNotifications.addListener('pushNotificationReceived', (_notification) => {
      // Foreground scaffold — in-app toast future phase
    });
    handles.push(h3);

    const h4 = await PushNotifications.addListener('pushNotificationActionPerformed', (_action) => {
      // Deep-link routing scaffold
    });
    handles.push(h4);
  };

  setup();

  return () => {
    handles.forEach(h => h?.remove());
  };
}
