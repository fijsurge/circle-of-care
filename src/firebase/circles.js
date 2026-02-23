import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// Generate a simple 8-char alphanumeric invite code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createCircle(adminId, adminDisplayName, adminEmail, circleName, patientName) {
  const circleRef = doc(collection(db, 'circles'));
  const circleId = circleRef.id;

  await setDoc(circleRef, {
    name: circleName,
    patientName,
    patientId: null,
    adminId,
    createdAt: serverTimestamp(),
  });

  // Add admin as a member
  await setDoc(doc(db, 'circles', circleId, 'members', adminId), {
    role: 'admin',
    displayName: adminDisplayName,
    email: adminEmail,
    joinedAt: serverTimestamp(),
  });

  // Update user doc with circleId
  await updateDoc(doc(db, 'users', adminId), { circleId });

  return circleId;
}

export async function getCircle(circleId) {
  const snap = await getDoc(doc(db, 'circles', circleId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createInvite(circleId, createdByUid, role) {
  const code = generateCode();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  await setDoc(doc(db, 'circles', circleId, 'invitations', code), {
    role,
    createdBy: createdByUid,
    createdAt: serverTimestamp(),
    expiresAt,
    used: false,
  });

  return code;
}

export async function getInvite(circleId, code) {
  const snap = await getDoc(doc(db, 'circles', circleId, 'invitations', code));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getCircleMembers(circleId) {
  const snap = await getDocs(collection(db, 'circles', circleId, 'members'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export function subscribeToMembers(circleId, callback) {
  return onSnapshot(collection(db, 'circles', circleId, 'members'), (snap) => {
    callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
  });
}

export async function acceptInvite(circleId, code, user) {
  const inviteRef = doc(db, 'circles', circleId, 'invitations', code);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) throw new Error('Invite not found.');

  const invite = inviteSnap.data();
  if (invite.used) throw new Error('This invite has already been used.');
  if (invite.expiresAt.toDate() < new Date()) throw new Error('This invite has expired.');

  // Mark invite as used
  await updateDoc(inviteRef, { used: true });

  // Add user as circle member
  await setDoc(doc(db, 'circles', circleId, 'members', user.uid), {
    role: invite.role,
    displayName: user.displayName,
    email: user.email,
    joinedAt: serverTimestamp(),
  });

  // Update user doc
  await updateDoc(doc(db, 'users', user.uid), {
    circleId,
    role: invite.role,
  });
}
