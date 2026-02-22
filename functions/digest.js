const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

// @sendgrid/mail loaded lazily so missing key doesn't crash cold start
let sgMail = null;
function getSgMail() {
  if (!sgMail) sgMail = require('@sendgrid/mail');
  return sgMail;
}

// Runs at 8:00 AM Eastern every day.
// TODO: for multi-timezone support, store a timezone on each circle doc and
//       run this function hourly, filtering circles where local time is 08:xx.
exports.morningDigest = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'America/New_York' },
  async () => {
    const db = getFirestore();
    const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.DIGEST_FROM_EMAIL || 'digest@circleofcare.app';

    if (SENDGRID_KEY) {
      getSgMail().setApiKey(SENDGRID_KEY);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const circlesSnap = await db.collection('circles').get();

    for (const circleDoc of circlesSnap.docs) {
      const circle = { id: circleDoc.id, ...circleDoc.data() };

      // Get today's events for this circle
      const eventsSnap = await db
        .collection('circles').doc(circle.id).collection('events')
        .where('eventDate', '>=', Timestamp.fromDate(startOfDay))
        .where('eventDate', '<',  Timestamp.fromDate(endOfDay))
        .orderBy('eventDate', 'asc')
        .get();

      const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Skip circles with no events today — nothing to report
      if (events.length === 0) continue;

      const claimed   = events.filter(e => e.claimedBy);
      const unclaimed = events.filter(e => !e.claimedBy);

      // Get all members of this circle
      const membersSnap = await db
        .collection('circles').doc(circle.id).collection('members').get();

      for (const memberDoc of membersSnap.docs) {
        const uid = memberDoc.id;
        const userSnap = await db.collection('users').doc(uid).get();
        if (!userSnap.exists) continue;

        const user = userSnap.data();
        const prefs = user.preferences?.digest ?? { push: true, email: true };

        // ── Push notification ──────────────────────────────────────────────
        if (prefs.push && user.fcmToken) {
          try {
            await getMessaging().send({
              token: user.fcmToken,
              notification: {
                title: `${circle.name} — Morning Digest`,
                body: buildPushBody(events, unclaimed),
              },
              data: { type: 'morning_digest', circleId: circle.id },
            });
          } catch (err) {
            console.error(`[digest] FCM failed for ${uid}:`, err.message);
          }
        }

        // ── Email ──────────────────────────────────────────────────────────
        if (prefs.email && user.email && SENDGRID_KEY) {
          try {
            await getSgMail().send({
              to:      user.email,
              from:    FROM_EMAIL,
              subject: `${circle.name} — Today's Care Digest`,
              html:    buildEmailHtml(circle, user, events, claimed, unclaimed),
            });
          } catch (err) {
            console.error(`[digest] SendGrid failed for ${uid}:`, err.message);
          }
        }
      }
    }
  },
);

// ── Helpers ────────────────────────────────────────────────────────────────

function buildPushBody(events, unclaimed) {
  const total = events.length;
  const parts = [`${total} event${total !== 1 ? 's' : ''} today`];
  if (unclaimed.length > 0) {
    parts.push(`${unclaimed.length} unclaimed`);
  }
  return parts.join(' · ');
}

function formatTime(eventDate) {
  try {
    const d = eventDate.toDate ? eventDate.toDate() : new Date(eventDate);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function eventRow(event) {
  const time  = event.allDay ? 'All day' : formatTime(event.eventDate);
  const claim = event.claimedBy
    ? `<span style="color:#16a34a">✓ ${event.claimedByName}</span>`
    : `<span style="color:#dc2626">⚠ Unclaimed</span>`;

  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#374151;font-size:14px;">
        <strong>${escHtml(event.title)}</strong>
        <span style="color:#9ca3af;margin-left:8px;font-size:12px;">${time}</span>
      </td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;white-space:nowrap;">
        ${claim}
      </td>
    </tr>`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(circle, user, events, claimed, unclaimed) {
  const firstName = (user.displayName || 'there').split(' ')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">

    <!-- Header -->
    <div style="background:#2563eb;border-radius:12px 12px 0 0;padding:24px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">Circle of Care</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px;">${escHtml(circle.name)}</p>
    </div>

    <!-- Body -->
    <div style="background:white;padding:24px;">
      <p style="color:#374151;margin:0 0 6px;font-size:16px;">Good morning, ${escHtml(firstName)}!</p>
      <p style="color:#6b7280;margin:0 0 20px;font-size:14px;">
        Here's what's happening today for ${escHtml(circle.patientName || 'your loved one')}.
      </p>

      ${unclaimed.length > 0 ? `
      <!-- Alert banner -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <p style="color:#991b1b;margin:0;font-size:13px;font-weight:600;">
          ⚠ ${unclaimed.length} task${unclaimed.length !== 1 ? 's' : ''} still need${unclaimed.length === 1 ? 's' : ''} someone to claim ${unclaimed.length === 1 ? 'it' : 'them'}.
        </p>
      </div>` : `
      <!-- All claimed -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
        <p style="color:#166534;margin:0;font-size:13px;font-weight:600;">
          ✓ All tasks for today are covered.
        </p>
      </div>`}

      <!-- Events table -->
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">Event</th>
            <th style="text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;padding-bottom:8px;padding-left:16px;border-bottom:2px solid #e5e7eb;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${events.map(eventRow).join('')}
        </tbody>
      </table>

      <div style="margin-top:24px;text-align:center;">
        <a href="https://circleofcare.app/calendar"
           style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          Open Calendar →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;padding:16px 24px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        You're receiving this because you're part of the ${escHtml(circle.name)} care circle.
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">
        Open the app and go to <strong>Settings → Notifications</strong> to update your preferences.
      </p>
    </div>

  </div>
</body>
</html>`;
}
