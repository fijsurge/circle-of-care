import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

// circles/{circleId}/live/patientLocation
export async function updatePatientLocation(circleId, { lat, lng, accuracy }) {
  await setDoc(
    doc(db, 'circles', circleId, 'live', 'patientLocation'),
    { lat, lng, accuracy: accuracy ?? null, updatedAt: serverTimestamp() },
  );
}

export function subscribeToPatientLocation(circleId, callback) {
  return onSnapshot(
    doc(db, 'circles', circleId, 'live', 'patientLocation'),
    (snap) => callback(snap.exists() ? snap.data() : null),
  );
}

// circles/{circleId}/live/safeZone
export async function updateSafeZone(circleId, { lat, lng, radiusMeters, label, updatedBy }) {
  await setDoc(
    doc(db, 'circles', circleId, 'live', 'safeZone'),
    { lat, lng, radiusMeters, label, updatedBy, updatedAt: serverTimestamp() },
  );
}

export function subscribeToSafeZone(circleId, callback) {
  return onSnapshot(
    doc(db, 'circles', circleId, 'live', 'safeZone'),
    (snap) => callback(snap.exists() ? snap.data() : null),
  );
}
