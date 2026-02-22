const { onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const CRONOFY_CLIENT_ID     = defineSecret('CRONOFY_CLIENT_ID');
const CRONOFY_CLIENT_SECRET = defineSecret('CRONOFY_CLIENT_SECRET');

const TOKEN_URL    = 'https://app.cronofy.com/oauth/token';
const FREE_BUSY_URL = 'https://api.cronofy.com/v1/free_busy';

// ── Internal helpers ────────────────────────────────────────────────────────

async function fetchTokens(body) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cronofy token request failed ${res.status}: ${text}`);
  }
  return res.json();
}

// Returns valid tokens for uid, refreshing if they expire within 5 minutes.
async function getValidTokens(db, uid, clientId, clientSecret) {
  const snap = await db
    .collection('users').doc(uid)
    .collection('private').doc('cronofy')
    .get();

  if (!snap.exists) throw new Error('Cronofy not connected for this user');

  const stored = snap.data();
  const expiresAt = stored.expiresAt?.toMillis() ?? 0;

  if (expiresAt - Date.now() < 5 * 60 * 1000) {
    // Refresh
    const data = await fetchTokens({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
    });

    const updated = {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? stored.refreshToken,
      expiresAt:    Timestamp.fromMillis(Date.now() + data.expires_in * 1000),
      sub:          stored.sub,
    };

    await snap.ref.update(updated);
    return updated;
  }

  return stored;
}

// ── Exported Cloud Functions ────────────────────────────────────────────────

// Exchange OAuth code for tokens and store them server-side.
exports.cronofyExchangeToken = onCall(
  { secrets: [CRONOFY_CLIENT_ID, CRONOFY_CLIENT_SECRET] },
  async (request) => {
    if (!request.auth) throw new Error('Unauthenticated');

    const { code, redirectUri } = request.data;
    const uid = request.auth.uid;
    const db  = getFirestore();

    const data = await fetchTokens({
      client_id:     CRONOFY_CLIENT_ID.value(),
      client_secret: CRONOFY_CLIENT_SECRET.value(),
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
    });

    await db.collection('users').doc(uid)
      .collection('private').doc('cronofy')
      .set({
        accessToken:  data.access_token,
        refreshToken: data.refresh_token,
        expiresAt:    Timestamp.fromMillis(Date.now() + data.expires_in * 1000),
        sub:          data.sub ?? null,
        connectedAt:  Timestamp.now(),
      });

    // Flag on the main user doc so the frontend can read it cheaply
    await db.collection('users').doc(uid).update({ cronofyConnected: true });

    return { success: true };
  },
);

// Fetch the calling user's free/busy blocks and store them in the circle
// so all members can see who is available.
exports.cronofyBusyBlocks = onCall(
  { secrets: [CRONOFY_CLIENT_ID, CRONOFY_CLIENT_SECRET] },
  async (request) => {
    if (!request.auth) return { blocks: [] };

    const uid      = request.auth.uid;
    const circleId = request.data?.circleId;
    const db       = getFirestore();

    let tokens;
    try {
      tokens = await getValidTokens(
        db, uid,
        CRONOFY_CLIENT_ID.value(),
        CRONOFY_CLIENT_SECRET.value(),
      );
    } catch {
      return { blocks: [] }; // Not connected — return empty silently
    }

    // Fetch the next 7 days of free/busy
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);

    const url = `${FREE_BUSY_URL}?from=${from.toISOString()}&to=${to.toISOString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!res.ok) {
      console.error(`[cronofy] free_busy ${res.status}`);
      return { blocks: [] };
    }

    const json   = await res.json();
    const blocks = (json.free_busy ?? [])
      .filter(b => b.free_busy_status === 'busy')
      .map(b => ({ start: b.start, end: b.end }));

    // Store in the circle so all members can subscribe to it
    if (circleId) {
      const userSnap    = await db.collection('users').doc(uid).get();
      const displayName = userSnap.data()?.displayName ?? 'A member';

      await db.collection('circles').doc(circleId)
        .collection('busyBlocks').doc(uid)
        .set({ uid, displayName, blocks, updatedAt: Timestamp.now() });
    }

    return { blocks };
  },
);

// Remove stored tokens and clear the connected flag.
exports.cronofyDisconnect = onCall(async (request) => {
  if (!request.auth) throw new Error('Unauthenticated');

  const uid = request.auth.uid;
  const db  = getFirestore();

  await db.collection('users').doc(uid)
    .collection('private').doc('cronofy')
    .delete();

  await db.collection('users').doc(uid).update({ cronofyConnected: false });

  return { success: true };
});
