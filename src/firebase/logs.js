import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

export async function addLog(circleId, authorId, authorName, data) {
  const logsRef = collection(db, 'circles', circleId, 'logs');
  await addDoc(logsRef, {
    ...data,
    authorId,
    authorName,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToLogs(circleId, callback, limitCount = 50) {
  const q = query(
    collection(db, 'circles', circleId, 'logs'),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  );
  return onSnapshot(q, (snap) => {
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(logs);
  });
}

export async function deleteLog(circleId, logId) {
  await deleteDoc(doc(db, 'circles', circleId, 'logs', logId));
}
