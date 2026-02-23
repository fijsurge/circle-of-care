import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { startOfDay } from 'date-fns';

export async function createEvent(circleId, authorId, authorName, data) {
  const eventsRef = collection(db, 'circles', circleId, 'events');
  await addDoc(eventsRef, {
    ...data,
    createdBy: authorId,
    createdByName: authorName,
    createdAt: serverTimestamp(),
    claimedBy: null,
    claimedByName: null,
    claimedAt: null,
    checklist: data.checklist ?? [],
  });
}

export function subscribeToEvents(circleId, callback) {
  const today = startOfDay(new Date());
  const q = query(
    collection(db, 'circles', circleId, 'events'),
    where('eventDate', '>=', Timestamp.fromDate(today)),
    orderBy('eventDate', 'asc'),
    limit(500),
  );
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(events);
  });
}

export async function claimEvent(circleId, eventId, userId, userName) {
  const ref = doc(db, 'circles', circleId, 'events', eventId);
  await updateDoc(ref, {
    claimedBy: userId,
    claimedByName: userName,
    claimedAt: serverTimestamp(),
  });
}

export async function unclaimEvent(circleId, eventId) {
  const ref = doc(db, 'circles', circleId, 'events', eventId);
  await updateDoc(ref, {
    claimedBy: null,
    claimedByName: null,
    claimedAt: null,
  });
}

export async function updateChecklist(circleId, eventId, checklist) {
  const ref = doc(db, 'circles', circleId, 'events', eventId);
  await updateDoc(ref, { checklist });
}

export async function deleteEvent(circleId, eventId) {
  await deleteDoc(doc(db, 'circles', circleId, 'events', eventId));
}
