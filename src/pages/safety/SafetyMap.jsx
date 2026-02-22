import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet marker icons broken by Vite's asset pipeline
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
});

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToPatientLocation,
  subscribeToSafeZone,
  updateSafeZone,
} from '../../firebase/location';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

// Geographic center of the contiguous US — shown before any real data arrives
const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 13;

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

function formatAge(ts) {
  if (!ts) return 'never';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// Flies the map to `center` whenever it changes from the default
function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== DEFAULT_CENTER[0] || center[1] !== DEFAULT_CENTER[1]) {
      map.flyTo(center, DEFAULT_ZOOM, { animate: true, duration: 1 });
    }
  }, [center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Translates map clicks into lat/lng when editing mode is on
function MapClickHandler({ enabled, onMapClick }) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick(e.latlng);
    },
  });
  return null;
}

export function SafetyMap() {
  const { userDoc, currentCircle, isAdmin } = useAuth();
  const circleId = currentCircle?.id ?? userDoc?.circleId;
  const isPatient = userDoc?.role === 'patient';

  const [patientLoc, setPatientLoc] = useState(null);
  const [safeZone, setSafeZone] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Editor form state — seeded from existing safe zone when available
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editRadius, setEditRadius] = useState(200);
  const [editLabel, setEditLabel] = useState('Home');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!circleId) return;
    const u1 = subscribeToPatientLocation(circleId, setPatientLoc);
    const u2 = subscribeToSafeZone(circleId, (sz) => {
      setSafeZone(sz);
      if (sz) {
        setEditLat(sz.lat.toFixed(6));
        setEditLng(sz.lng.toFixed(6));
        setEditRadius(sz.radiusMeters);
        setEditLabel(sz.label ?? 'Home');
      }
    });
    return () => { u1(); u2(); };
  }, [circleId]);

  const isBreached =
    patientLoc && safeZone
      ? haversineMeters(patientLoc.lat, patientLoc.lng, safeZone.lat, safeZone.lng) >
        safeZone.radiusMeters
      : false;

  // Best available center for the map
  const mapCenter = safeZone
    ? [safeZone.lat, safeZone.lng]
    : patientLoc
      ? [patientLoc.lat, patientLoc.lng]
      : DEFAULT_CENTER;

  function handleMapClick({ lat, lng }) {
    setEditLat(lat.toFixed(6));
    setEditLng(lng.toFixed(6));
  }

  async function handleSave() {
    if (!editLat || !editLng) return;
    setSaving(true);
    try {
      await updateSafeZone(circleId, {
        lat: parseFloat(editLat),
        lng: parseFloat(editLng),
        radiusMeters: editRadius,
        label: editLabel.trim() || 'Home',
        updatedBy: userDoc.displayName,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  // Patients see a reassuring message only — no map, no coordinates
  if (isPatient) {
    return (
      <div className="space-y-4 max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Safety</h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-5xl mb-4">🛡️</p>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Your care circle is watching out for you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const radiusLabel =
    editRadius >= 1000
      ? `${(editRadius / 1000).toFixed(1)} km`
      : `${editRadius} m`;

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Safety Map</h1>

      {/* Status banner */}
      {patientLoc ? (
        <div
          className={[
            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border',
            isBreached
              ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
          ].join(' ')}
        >
          <span className="text-xl shrink-0">{isBreached ? '⚠️' : '✅'}</span>
          <div>
            <p className="font-semibold">
              {isBreached
                ? `${currentCircle?.patientName} is outside the safe zone`
                : `${currentCircle?.patientName} is within the safe zone`}
            </p>
            <p className="text-xs font-normal opacity-75 mt-0.5">
              Updated {formatAge(patientLoc.updatedAt)}
              {patientLoc.accuracy ? ` · ±${Math.round(patientLoc.accuracy)} m accuracy` : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <span className="text-xl shrink-0">📍</span>
          <p>
            Waiting for {currentCircle?.patientName ?? 'the patient'}'s location — they need to
            open the app.
          </p>
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFlyTo center={mapCenter} />
          <MapClickHandler enabled={isEditing} onMapClick={handleMapClick} />

          {/* Patient position marker */}
          {patientLoc && (
            <Marker position={[patientLoc.lat, patientLoc.lng]}>
              <Popup>{currentCircle?.patientName ?? 'Patient'}</Popup>
            </Marker>
          )}

          {/* Saved safe zone circle */}
          {safeZone && (
            <Circle
              center={[safeZone.lat, safeZone.lng]}
              radius={safeZone.radiusMeters}
              pathOptions={{
                color: isBreached ? '#dc2626' : '#2563eb',
                fillColor: isBreached ? '#dc2626' : '#2563eb',
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          )}

          {/* Live preview circle while editing */}
          {isEditing && editLat && editLng && (
            <Circle
              center={[parseFloat(editLat), parseFloat(editLng)]}
              radius={editRadius}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.15,
                dashArray: '6',
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Safe zone card — admin can edit, others see read-only */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isEditing ? 'Edit Safe Zone' : 'Safe Zone'}</CardTitle>
            {isAdmin && !isEditing && (
              <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                {safeZone ? 'Edit' : 'Set up'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 rounded-lg">
                📍 Click anywhere on the map to set the centre point.
              </p>

              <div>
                <label className={labelCls}>Zone label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. Home"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Latitude</label>
                  <input
                    type="text"
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    placeholder="Click the map"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Longitude</label>
                  <input
                    type="text"
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    placeholder="Click the map"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Radius — {radiusLabel}</label>
                <input
                  type="range"
                  min={50}
                  max={5000}
                  step={50}
                  value={editRadius}
                  onChange={(e) => setEditRadius(Number(e.target.value))}
                  className="w-full accent-blue-600 mt-1"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span>50 m</span>
                  <span>5 km</span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                  disabled={!editLat || !editLng}
                  className="flex-1"
                >
                  Save Safe Zone
                </Button>
              </div>
            </div>
          ) : safeZone ? (
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Zone</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{safeZone.label}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Radius</dt>
                <dd className="text-gray-700 dark:text-gray-300">
                  {safeZone.radiusMeters >= 1000
                    ? `${(safeZone.radiusMeters / 1000).toFixed(1)} km`
                    : `${safeZone.radiusMeters} m`}
                </dd>
              </div>
              {safeZone.updatedBy && (
                <div className="flex gap-2">
                  <dt className="text-gray-500 dark:text-gray-400 w-16 shrink-0">Set by</dt>
                  <dd className="text-gray-500 dark:text-gray-400">{safeZone.updatedBy}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isAdmin
                ? 'No safe zone set yet. Click "Set up" to define one.'
                : 'No safe zone has been configured yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Push alerts deferred note */}
      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        🔔 Automatic push alerts when {currentCircle?.patientName ?? 'the patient'} leaves the safe
        zone will be enabled with Cloud Functions.
      </p>
    </div>
  );
}

const labelCls =
  'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const inputCls = [
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700',
  'px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500',
].join(' ');
