import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { updatePatientLocation } from '../firebase/location';

async function fetchPosition() {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

// Polls GPS every intervalMs and writes to Firestore.
// Only mount this hook on the patient's device.
export function useLocationReporter(circleId, { enabled = true, intervalMs = 30000 } = {}) {
  useEffect(() => {
    if (!circleId || !enabled) return;

    let cancelled = false;

    async function report() {
      try {
        const pos = await fetchPosition();
        if (!cancelled) await updatePatientLocation(circleId, pos);
      } catch (err) {
        console.warn('[location] Could not report position:', err.message);
      }
    }

    report();
    const id = setInterval(report, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [circleId, enabled, intervalMs]);
}
