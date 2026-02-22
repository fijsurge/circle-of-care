const { initializeApp } = require('firebase-admin/app');
initializeApp();

const { onRequest } = require('firebase-functions/v2/https');
const { morningDigest }      = require('./digest');
const { geofenceBreachAlert } = require('./breach');
const {
  cronofyExchangeToken,
  cronofyBusyBlocks,
  cronofyDisconnect,
} = require('./cronofy');

// ── Morning Digest (scheduled 8 AM ET) ────────────────────────────────────
exports.morningDigest = morningDigest;

// ── Geofence breach push alerts ────────────────────────────────────────────
exports.geofenceBreachAlert = geofenceBreachAlert;

// ── Cronofy calendar integration ───────────────────────────────────────────
exports.cronofyExchangeToken = cronofyExchangeToken;
exports.cronofyBusyBlocks    = cronofyBusyBlocks;
exports.cronofyDisconnect    = cronofyDisconnect;
