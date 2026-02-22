import { collection, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './config';

const CLIENT_ID = import.meta.env.VITE_CRONOFY_CLIENT_ID;

export function isCronofyConfigured() {
  return !!CLIENT_ID;
}

// Build the Cronofy OAuth URL — redirect URI is derived from the current
// origin so it works on both localhost and the production hosting URL.
export function getCronofyAuthUrl() {
  if (!CLIENT_ID) return null;
  const redirectUri = `${window.location.origin}/calendar`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'read_events create_event delete_event read_free_busy',
  });
  return `https://app.cronofy.com/oauth/authorize?${params.toString()}`;
}

function callable(name) {
  return httpsCallable(getFunctions(), name);
}

// Exchange the OAuth code for tokens (handled server-side).
export async function exchangeCronofyCode(code) {
  const redirectUri = `${window.location.origin}/calendar`;
  return callable('cronofyExchangeToken')({ code, redirectUri });
}

// Fetch the calling user's busy blocks and store them in the circle.
export async function fetchBusyBlocks(circleId) {
  return callable('cronofyBusyBlocks')({ circleId });
}

// Remove the user's stored Cronofy tokens.
export async function disconnectCronofy() {
  return callable('cronofyDisconnect')({});
}

// Subscribe to all members' stored busy blocks for a circle.
export function subscribeToBusyBlocks(circleId, callback) {
  return onSnapshot(
    collection(db, 'circles', circleId, 'busyBlocks'),
    (snap) => callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
  );
}
