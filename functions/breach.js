const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isOutside(loc, sz) {
  return haversineMeters(loc.lat, loc.lng, sz.lat, sz.lng) > sz.radiusMeters;
}

// Fires every time the patient's location document is written.
// Sends push alerts only on the transition from safe → breached,
// so caregivers aren't spammed on every location update while already outside.
exports.geofenceBreachAlert = onDocumentWritten(
  'circles/{circleId}/live/patientLocation',
  async (event) => {
    const { circleId } = event.params;
    const db = getFirestore();

    const newLoc = event.data.after.exists ? event.data.after.data() : null;
    const oldLoc = event.data.before.exists ? event.data.before.data() : null;

    if (!newLoc) return; // Document deleted — nothing to do

    // Get safe zone — if none configured, nothing to check
    const szSnap = await db
      .collection('circles').doc(circleId)
      .collection('live').doc('safeZone')
      .get();
    if (!szSnap.exists) return;
    const sz = szSnap.data();

    const isBreached = isOutside(newLoc, sz);
    const wasBreached = oldLoc ? isOutside(oldLoc, sz) : false;

    // Only alert on safe → breached transition
    if (!isBreached || wasBreached) return;

    // Get circle info for the patient's name
    const circleSnap = await db.collection('circles').doc(circleId).get();
    const patientName = circleSnap.data()?.patientName ?? 'The patient';

    // Get all circle members
    const membersSnap = await db
      .collection('circles').doc(circleId)
      .collection('members').get();

    const sends = [];

    for (const memberDoc of membersSnap.docs) {
      const uid = memberDoc.id;
      const userSnap = await db.collection('users').doc(uid).get();
      if (!userSnap.exists) continue;

      const user = userSnap.data();
      if (user.role === 'patient') continue; // Don't alert the patient about themselves

      const pushEnabled = user.preferences?.digest?.push ?? true;
      if (!pushEnabled || !user.fcmToken) continue;

      sends.push(
        getMessaging()
          .send({
            token: user.fcmToken,
            notification: {
              title: '⚠️ Safe Zone Alert',
              body: `${patientName} has left the safe zone (${sz.label}).`,
            },
            data: { type: 'geofence_breach', circleId },
            apns: {
              payload: { aps: { sound: 'default', badge: 1 } },
            },
            android: {
              priority: 'high',
              notification: { sound: 'default' },
            },
          })
          .catch((err) =>
            console.error(`[breach] FCM failed for ${uid}:`, err.message),
          ),
      );
    }

    await Promise.all(sends);
    console.log(
      `[breach] Breach alert sent for circle ${circleId} — ${sends.length} recipient(s)`,
    );
  },
);
