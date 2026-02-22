import { doc, updateDoc } from 'firebase/firestore';
import { db } from './config';

export async function updateDigestPrefs(uid, { push, email }) {
  await updateDoc(doc(db, 'users', uid), {
    'preferences.digest.push': push,
    'preferences.digest.email': email,
  });
}
