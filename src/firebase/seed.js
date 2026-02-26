import {
  doc,
  collection,
  writeBatch,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { addDays, startOfDay } from 'date-fns';
import { db } from './config';

const SEED_MEMBERS = {
  _seed_caregiver_mary: { displayName: 'Mary Wilson',    role: 'caregiver', email: 'mary.wilson@example.com'    },
  _seed_family_sarah:   { displayName: 'Sarah Johnson',  role: 'family',    email: 'sarah.johnson@example.com'  },
  _seed_family_robert:  { displayName: 'Robert Johnson', role: 'family',    email: 'robert.johnson@example.com' },
  _seed_family_emma:    { displayName: 'Emma Davis',     role: 'family',    email: 'emma.davis@example.com'     },
  _seed_family_thomas:  { displayName: 'Thomas Johnson', role: 'family',    email: 'thomas.johnson@example.com' },
};

const LOCATIONS = {
  ptClinic:     'Springfield Physical Therapy, 1156 Wellness Boulevard',
  doctorOffice: "Dr. Sarah Chen's Office, 842 Medical Center Dr, Suite 305",
  neurologist:  'Dr. James Martinez (Neurologist), 678 Specialist Way, Suite 12',
  hospital:     'Springfield General Hospital, 100 Hospital Road',
  pharmacy:     'CVS Pharmacy, 2847 Main Street',
  seniorCenter: 'Sunrise Senior Center, 450 Community Drive',
};

function withTime(date, hours, minutes = 0) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function generateEvents(now, adminUID, adminName) {
  const rangeStart = startOfDay(addDays(now, -91));
  const rangeEnd   = startOfDay(addDays(now, 35));

  const claimers = [
    { uid: '_seed_caregiver_mary',  name: 'Mary Wilson'    },
    { uid: '_seed_family_sarah',    name: 'Sarah Johnson'  },
    { uid: '_seed_family_robert',   name: 'Robert Johnson' },
    { uid: adminUID,                name: adminName        },
  ];

  // Deterministic seeded RNG for reproducible data
  let rngState = 42;
  function rand() {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
    return (rngState >>> 0) / 4294967296;
  }
  function randomClaimer() { return claimers[Math.floor(rand() * claimers.length)]; }

  function maybeClaim(date) {
    if (date >= now) return {};
    if (rand() < 0.15) return {};
    const c = randomClaimer();
    return {
      claimedBy:     c.uid,
      claimedByName: c.name,
      claimedAt:     Timestamp.fromDate(addDays(date, -Math.floor(rand() * 3))),
    };
  }

  function claimedBy(uid, name, daysAhead = -1) {
    return { claimedBy: uid, claimedByName: name, claimedAt: Timestamp.fromDate(addDays(now, daysAhead)) };
  }

  const base = {
    notes: '', location: null,
    claimedBy: null, claimedByName: null, claimedAt: null,
    checklist: [],
    createdBy: adminUID, createdByName: adminName,
    createdAt: Timestamp.fromDate(addDays(rangeStart, -7)),
    _seeded: true, allDay: false,
  };

  const events = [];

  // ── One-off events ──────────────────────────────────────────────────────────

  const neurologyDate = withTime(addDays(now, -42), 14, 0);
  events.push({
    ...base,
    title: 'Neurology Follow-up — Dr. Martinez', type: 'appointment',
    eventDate: Timestamp.fromDate(neurologyDate), location: LOCATIONS.neurologist,
    ...claimedBy('_seed_caregiver_mary', 'Mary Wilson', -47),
  });

  const hospitalDate = withTime(addDays(now, -60), 9, 0);
  events.push({
    ...base,
    title: 'Hospital Visit — Routine Assessment', type: 'appointment',
    eventDate: Timestamp.fromDate(hospitalDate), location: LOCATIONS.hospital,
    checklist: [
      { id: 'h1', text: 'Bring hospital discharge papers', done: true, doneBy: adminUID,               doneAt: Timestamp.fromDate(hospitalDate)              },
      { id: 'h2', text: 'Confirm transport',               done: true, doneBy: '_seed_caregiver_mary', doneAt: Timestamp.fromDate(addDays(hospitalDate, -1)) },
      { id: 'h3', text: 'Pack overnight bag',              done: true, doneBy: adminUID,               doneAt: Timestamp.fromDate(addDays(hospitalDate, -1)) },
    ],
    ...claimedBy('_seed_caregiver_mary', 'Mary Wilson', -67),
  });

  // ── Daily loop ──────────────────────────────────────────────────────────────

  let d = new Date(rangeStart);
  let ptCount = 0;
  let pharmCount = 0;

  while (d <= rangeEnd) {
    const dow       = d.getDay();   // 0 Sun … 6 Sat
    const dom       = d.getDate();
    const isPast    = d < now;
    const weekIndex = Math.floor((d - rangeStart) / (7 * 24 * 60 * 60 * 1000));
    const isWeekday = dow >= 1 && dow <= 5;

    // ── Every day: medications ─────────────────────────────────────────────

    events.push({
      ...base, title: 'Morning Medication', type: 'medication',
      eventDate: Timestamp.fromDate(withTime(d, 8, 0)),
      ...(isPast ? claimedBy('_seed_caregiver_mary', 'Mary Wilson', -1) : {}),
    });
    events.push({
      ...base, title: 'Evening Medication', type: 'medication',
      eventDate: Timestamp.fromDate(withTime(d, 20, 0)),
      ...(isPast ? claimedBy('_seed_caregiver_mary', 'Mary Wilson', -1) : {}),
    });

    // ── Weekday patterns (appointments + therapy only on weekdays) ─────────

    if (isWeekday) {

      // Caregiver morning check-in — every weekday 9 AM
      events.push({
        ...base, title: 'Caregiver Morning Check-in', type: 'task',
        eventDate: Timestamp.fromDate(withTime(d, 9, 0)),
        ...(isPast ? claimedBy('_seed_caregiver_mary', 'Mary Wilson', -1) : {}),
      });

      // Cognitive exercise — every weekday 3 PM (rotating activity names)
      const cogTitles = [
        'Cognitive Exercise — Word Puzzles',
        'Cognitive Exercise — Memory Cards',
        'Cognitive Exercise — Reading Time',
        'Cognitive Exercise — Brain Games',
        'Cognitive Exercise — Story Recall',
      ];
      events.push({
        ...base, title: cogTitles[dow - 1], type: 'task',
        eventDate: Timestamp.fromDate(withTime(d, 15, 0)),
        ...maybeClaim(withTime(d, 15, 0)),
      });

      // Mon / Wed / Fri: nurse visit 9:30 AM + speech therapy 11 AM
      if (dow === 1 || dow === 3 || dow === 5) {
        events.push({
          ...base, title: 'Nurse Visit — Vitals & Assessment', type: 'appointment',
          eventDate: Timestamp.fromDate(withTime(d, 9, 30)),
          ...(isPast ? claimedBy('_seed_caregiver_mary', 'Mary Wilson', -1) : {}),
        });
        events.push({
          ...base, title: 'Speech Therapy Session', type: 'appointment',
          eventDate: Timestamp.fromDate(withTime(d, 11, 0)),
          location: LOCATIONS.ptClinic,
          ...maybeClaim(withTime(d, 11, 0)),
        });
      }

      // Mon / Wed: occupational therapy 2 PM
      if (dow === 1 || dow === 3) {
        events.push({
          ...base, title: 'Occupational Therapy Session', type: 'appointment',
          eventDate: Timestamp.fromDate(withTime(d, 14, 0)),
          location: LOCATIONS.ptClinic,
          ...maybeClaim(withTime(d, 14, 0)),
        });
      }

      // Tue / Thu: physical therapy 10 AM
      if (dow === 2 || dow === 4) {
        ptCount++;
        const hasChecklist = ptCount % 8 === 0;
        events.push({
          ...base, title: 'Physical Therapy Session', type: 'appointment',
          eventDate: Timestamp.fromDate(withTime(d, 10, 0)),
          location: LOCATIONS.ptClinic,
          checklist: hasChecklist ? [
            { id: `pt${ptCount}a`, text: 'Bring therapy band',         done: isPast, doneBy: isPast ? '_seed_caregiver_mary' : null, doneAt: isPast ? Timestamp.fromDate(withTime(d, 10, 0)) : null },
            { id: `pt${ptCount}b`, text: 'Review home exercise sheet', done: isPast, doneBy: isPast ? '_seed_caregiver_mary' : null, doneAt: isPast ? Timestamp.fromDate(withTime(d, 10, 0)) : null },
          ] : [],
          ...maybeClaim(withTime(d, 10, 0)),
        });
      }

      // Wed: Emma video call 7 PM
      if (dow === 3) {
        events.push({
          ...base, title: 'Family Video Call — Emma', type: 'other',
          eventDate: Timestamp.fromDate(withTime(d, 19, 0)),
          ...claimedBy('_seed_family_emma', 'Emma Davis', -1),
        });
      }

      // 1st Monday of each month: doctor checkup 9:30 AM
      if (dow === 1 && dom <= 7) {
        const mo = d.getMonth();
        events.push({
          ...base, title: 'Doctor Checkup — Dr. Sarah Chen', type: 'appointment',
          eventDate: Timestamp.fromDate(withTime(d, 9, 30)),
          location: LOCATIONS.doctorOffice,
          checklist: [
            { id: `dc${mo}a`, text: 'Bring insurance card',     done: isPast, doneBy: isPast ? adminUID               : null, doneAt: isPast ? Timestamp.fromDate(withTime(d, 9, 30)) : null },
            { id: `dc${mo}b`, text: 'List current medications', done: isPast, doneBy: isPast ? adminUID               : null, doneAt: isPast ? Timestamp.fromDate(withTime(d, 9, 30)) : null },
            { id: `dc${mo}c`, text: 'Blood pressure log',       done: isPast, doneBy: isPast ? '_seed_caregiver_mary' : null, doneAt: isPast ? Timestamp.fromDate(withTime(d, 9, 30)) : null },
          ],
          ...maybeClaim(withTime(d, 9, 30)),
        });
      }

      // 1st & 15th of month (weekday only): pharmacy pickup 11 AM
      if (dom === 1 || dom === 15) {
        pharmCount++;
        const skipClaim = !isPast && pharmCount % 2 === 1;
        const mo = d.getMonth();
        events.push({
          ...base, title: 'Pharmacy Pickup', type: 'task',
          eventDate: Timestamp.fromDate(withTime(d, 11, 0)),
          location: LOCATIONS.pharmacy,
          checklist: [
            { id: `ph${mo}${dom}a`, text: 'Metformin refill',              done: isPast, doneBy: isPast ? '_seed_family_sarah' : null, doneAt: isPast ? Timestamp.fromDate(withTime(d, 11, 0)) : null },
            { id: `ph${mo}${dom}b`, text: 'Lisinopril refill',             done: isPast, doneBy: isPast ? '_seed_family_sarah' : null, doneAt: isPast ? Timestamp.fromDate(withTime(d, 11, 0)) : null },
            { id: `ph${mo}${dom}c`, text: 'Pick up compression stockings', done: false,  doneBy: null, doneAt: null },
          ],
          ...(skipClaim ? {} : maybeClaim(withTime(d, 11, 0))),
        });
      }
    }

    // ── Weekend patterns (social interactions tick up) ─────────────────────

    // Saturday
    if (dow === 6) {
      // Community social group at senior center — every Saturday 10 AM
      events.push({
        ...base, title: 'Community Social Group — Senior Center', type: 'other',
        eventDate: Timestamp.fromDate(withTime(d, 10, 0)),
        location: LOCATIONS.seniorCenter,
        ...maybeClaim(withTime(d, 10, 0)),
      });

      // Family visit (Sarah / Robert alternate) — every Saturday 2 PM
      if (weekIndex % 2 === 0) {
        events.push({
          ...base, title: 'Family Visit — Sarah', type: 'other',
          eventDate: Timestamp.fromDate(withTime(d, 14, 0)),
          ...claimedBy('_seed_family_sarah', 'Sarah Johnson', -3),
        });
      } else {
        events.push({
          ...base, title: 'Family Visit — Robert', type: 'other',
          eventDate: Timestamp.fromDate(withTime(d, 14, 0)),
          ...claimedBy('_seed_family_robert', 'Robert Johnson', -3),
        });
      }

      // Afternoon walk with Mary — every Saturday 4 PM
      events.push({
        ...base, title: 'Afternoon Walk with Mary', type: 'other',
        eventDate: Timestamp.fromDate(withTime(d, 16, 0)),
        ...claimedBy('_seed_caregiver_mary', 'Mary Wilson', -1),
      });
    }

    // Sunday
    if (dow === 0) {
      // Sunday morning service — every Sunday 9 AM
      events.push({
        ...base, title: 'Sunday Morning Service', type: 'other',
        eventDate: Timestamp.fromDate(withTime(d, 9, 0)),
        ...maybeClaim(withTime(d, 9, 0)),
      });

      // Family brunch call — Thomas every Sunday 10:30 AM
      events.push({
        ...base, title: 'Family Brunch Call — Thomas', type: 'other',
        eventDate: Timestamp.fromDate(withTime(d, 10, 30)),
        ...claimedBy('_seed_family_thomas', 'Thomas Johnson', -1),
      });

      // Lunch outing — Thomas every 3rd Sunday 12 PM
      if (weekIndex % 3 === 0) {
        const claimed = rand() > 0.4;
        events.push({
          ...base, title: 'Lunch Outing — Thomas', type: 'other',
          eventDate: Timestamp.fromDate(withTime(d, 12, 0)),
          location: LOCATIONS.seniorCenter,
          ...(claimed ? claimedBy('_seed_family_thomas', 'Thomas Johnson', -2) : {}),
        });
      }

      // Family dinner — Sarah every other Sunday 5 PM
      if (weekIndex % 2 === 0) {
        events.push({
          ...base, title: 'Family Dinner — Sarah', type: 'other',
          eventDate: Timestamp.fromDate(withTime(d, 17, 0)),
          ...claimedBy('_seed_family_sarah', 'Sarah Johnson', -2),
        });
      }
    }

    d = addDays(d, 1);
  }

  return events;
}

// ── Log content pools ────────────────────────────────────────────────────────

const NOTE_POOL = [
  { title: 'Daily Observation',   notes: 'Good appetite at lunch. Ate most of the meal without prompting.' },
  { title: 'Sleep Report',        notes: 'Sleep was restless last night — woke up twice. Settled with reassurance.' },
  { title: 'Daily Observation',   notes: 'Patient was chatty and happy during the morning routine.' },
  { title: 'Behavior Note',       notes: 'Showed confusion about the date and time this afternoon. Reoriented calmly.' },
  { title: 'Memory Note',         notes: 'Recognized family photos today — good long-term memory recall.' },
  { title: 'Personal Care',       notes: 'Needed extra prompting with personal hygiene tasks but completed them all.' },
  { title: 'Daily Observation',   notes: 'Watched favorite TV show and seemed very content this evening.' },
  { title: 'Behavior Note',       notes: 'Some sundowning behavior around 4 PM. Settled well after dinner.' },
  { title: 'Activity Note',       notes: 'Great engagement with caregiver during afternoon activities.' },
  { title: 'Personal Care',       notes: 'Refused bath this morning — successfully completed later in the day.' },
  { title: 'Outdoor Activity',    notes: 'Enjoyed the garden walk. Very calm and happy.' },
  { title: 'Family Interaction',  notes: 'Had a good phone call with family. Lifted spirits noticeably.' },
  { title: 'Health Note',         notes: 'Mild lower back discomfort reported. Monitored — no escalation.' },
  { title: 'Cognitive Note',      notes: 'Very sharp and engaged during cognitive exercise today.' },
  { title: 'Appetite Report',     notes: 'Poor appetite at dinner — only ate half the meal. Offered a snack later.' },
  { title: 'Daily Observation',   notes: 'Very cooperative and pleasant throughout the day.' },
  { title: 'Sleep Report',        notes: 'Slept well — full 7 hours. Alert and positive in the morning.' },
  { title: 'Social Note',         notes: 'Enjoyed the community social group. Interacted well with other members.' },
];

const MOOD_NOTES = {
  5: 'Great mood today — very engaged, cheerful, and cooperative.',
  4: 'Good day overall. Enjoyed activities and was generally pleasant.',
  3: 'Normal day. Some periods of confusion but managed well.',
  2: 'Difficult morning. Patient was agitated and resistive to care.',
  1: 'Very distressed today. Multiple prolonged episodes of confusion.',
};

const INCIDENTS = [
  { title: 'Fall — Living Room',         notes: 'Patient fell getting up from chair. No injuries observed. Physician notified per protocol.' },
  { title: 'Prolonged Confusion Episode',notes: 'Did not recognize caregiver for approximately 20 minutes. Resolved gradually with calm redirection.' },
  { title: 'Medication Refusal',         notes: 'Refused morning medication. Eventually accepted with apple juice after 30-minute wait.' },
  { title: 'Nighttime Wandering',        notes: 'Found at front door at 2 AM. Door safety gate secured. No further incidents that night.' },
  { title: 'Agitation Episode',          notes: 'Sustained agitation lasting ~30 minutes. Resolved with music therapy and distraction.' },
];

const PT_NOTES = [
  'Good session. Worked on balance and gait. Patient tolerating exercises well.',
  'Patient was tired but cooperative. Completed all prescribed exercises.',
  'Excellent progress on hip and core strengthening exercises.',
  'Some discomfort reported during stretching — noted for therapist to review.',
  'Strong session today. Walked full length of corridor unaided.',
];

const DOCTOR_NOTES = [
  'BP 128/82. Medications reviewed — no changes. Next visit in one month.',
  'BP 134/86. Slight increase noted; monitoring. All other vitals stable.',
  'Comprehensive review completed. Blood work ordered. Patient cooperative.',
  'BP 122/78. All stable. No medication changes required.',
];

function generateLogs(now, adminUID, adminName) {
  const rangeStart = startOfDay(addDays(now, -91));
  const logs = [];

  // Separate deterministic RNG so event RNG state is unaffected
  let rng = 1337;
  function rand() {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 4294967296;
  }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

  // authorId must always equal adminUID to satisfy the Firestore create rule
  const base = { authorId: adminUID, _seeded: true };

  let noteIdx    = 0;
  let incIdx     = 0;
  let ptNoteIdx  = 0;

  let d = new Date(rangeStart);
  let dayNum = 0;

  while (d < now) {
    const dow       = d.getDay();
    const dom       = d.getDate();
    const isWeekday = dow >= 1 && dow <= 5;

    // ── Daily: medication logs ─────────────────────────────────────────────

    const morningMissed = rand() < 0.05;
    logs.push({
      ...base,
      type: 'medication', title: 'Metformin 500 mg',
      medName: 'Metformin', dose: '500 mg',
      given: !morningMissed,
      notes: morningMissed
        ? 'Patient initially refused. Attempted again 30 min later.'
        : (rand() < 0.3 ? pick(['Administered without issues.', 'Taken willingly with breakfast.', 'Mild hesitation but accepted.']) : ''),
      authorName: 'Mary Wilson',
      createdAt: Timestamp.fromDate(withTime(d, 8, 30)),
    });

    logs.push({
      ...base,
      type: 'medication', title: 'Lisinopril 10 mg',
      medName: 'Lisinopril', dose: '10 mg',
      given: rand() > 0.04,
      notes: '',
      authorName: 'Mary Wilson',
      createdAt: Timestamp.fromDate(withTime(d, 20, 30)),
    });

    // ── Weekday appointment logs ───────────────────────────────────────────

    if (isWeekday) {
      // PT — Tue / Thu
      if (dow === 2 || dow === 4) {
        logs.push({
          ...base,
          type: 'appointment', title: 'Physical Therapy Session',
          provider: 'Springfield Physical Therapy', location: LOCATIONS.ptClinic,
          appointmentDate: withTime(d, 10, 0).toISOString(),
          notes: PT_NOTES[ptNoteIdx++ % PT_NOTES.length],
          authorName: 'Mary Wilson',
          createdAt: Timestamp.fromDate(withTime(d, 11, 15)),
        });
      }

      // Doctor — 1st Monday of month
      if (dow === 1 && dom <= 7) {
        logs.push({
          ...base,
          type: 'appointment', title: 'Doctor Checkup — Dr. Sarah Chen',
          provider: 'Dr. Sarah Chen', location: LOCATIONS.doctorOffice,
          appointmentDate: withTime(d, 9, 30).toISOString(),
          notes: pick(DOCTOR_NOTES),
          authorName: adminName,
          createdAt: Timestamp.fromDate(withTime(d, 11, 0)),
        });
      }
    }

    // ── Mood log — every other day ─────────────────────────────────────────

    if (dayNum % 2 === 0) {
      // Weighted distribution: 1→5%, 2→15%, 3→35%, 4→35%, 5→10%
      const weights = [0.05, 0.15, 0.35, 0.35, 0.10];
      let rating = 3;
      let acc = 0;
      const r = rand();
      for (let i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (r <= acc) { rating = i + 1; break; }
      }
      logs.push({
        ...base,
        type: 'mood', title: `Mood: ${rating}/5`, rating,
        notes: rand() < 0.6 ? MOOD_NOTES[rating] : '',
        authorName: rand() < 0.7 ? 'Mary Wilson' : 'Sarah Johnson',
        createdAt: Timestamp.fromDate(withTime(d, 9 + Math.floor(rand() * 8), 0)),
      });
    }

    // ── Caregiver note — ~twice per week ──────────────────────────────────

    if (rand() < 0.28) {
      const n = NOTE_POOL[noteIdx++ % NOTE_POOL.length];
      logs.push({
        ...base,
        type: 'note', title: n.title, notes: n.notes,
        authorName: rand() < 0.75 ? 'Mary Wilson' : 'Sarah Johnson',
        createdAt: Timestamp.fromDate(withTime(d, 8 + Math.floor(rand() * 11), 0)),
      });
    }

    // ── Incident — rare (~1 per 3 weeks) ──────────────────────────────────

    if (rand() < 0.048 && incIdx < INCIDENTS.length) {
      const inc = INCIDENTS[incIdx++];
      logs.push({
        ...base,
        type: 'incident', title: inc.title, notes: inc.notes,
        authorName: 'Mary Wilson',
        createdAt: Timestamp.fromDate(withTime(d, 8 + Math.floor(rand() * 12), 0)),
      });
    }

    d = addDays(d, 1);
    dayNum++;
  }

  // One-off: neurology + hospital appointment logs
  logs.push({
    ...base,
    type: 'appointment', title: 'Neurology Follow-up — Dr. Martinez',
    provider: 'Dr. James Martinez', location: LOCATIONS.neurologist,
    appointmentDate: withTime(addDays(now, -42), 14, 0).toISOString(),
    notes: 'Cognitive assessment conducted. Slight progression within expected range. Medication regimen maintained. Next follow-up in 3 months.',
    authorName: adminName,
    createdAt: Timestamp.fromDate(withTime(addDays(now, -42), 16, 0)),
  });
  logs.push({
    ...base,
    type: 'appointment', title: 'Hospital Visit — Routine Assessment',
    provider: 'Springfield General Hospital', location: LOCATIONS.hospital,
    appointmentDate: withTime(addDays(now, -60), 9, 0).toISOString(),
    notes: 'Full diagnostic workup completed. No acute findings. Discharge with follow-up instructions. Transport arranged without issues.',
    authorName: adminName,
    createdAt: Timestamp.fromDate(withTime(addDays(now, -60), 14, 0)),
  });

  return logs;
}

// ── Mock availability (busy blocks) ────────────────────────────────────────
// Times are relative to "today" so they always show on the calendar regardless
// of when the seed is run. We store 3 days so there's data across a weekend.

function todayAt(dayOffset, hours, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const MOCK_BUSY = {
  _seed_caregiver_mary: {
    displayName: 'Mary Wilson',
    blocks: [
      { start: todayAt(0, 6, 30),  end: todayAt(0, 8,  0)  }, // early prep
      { start: todayAt(0, 15, 30), end: todayAt(0, 17, 30) }, // afternoon patient
      { start: todayAt(1, 7,  0),  end: todayAt(1, 9,  0)  },
      { start: todayAt(1, 14, 0),  end: todayAt(1, 16, 0)  },
      { start: todayAt(2, 8,  0),  end: todayAt(2, 10, 0)  },
    ],
  },
  _seed_family_emma: {
    displayName: 'Emma Davis',
    blocks: [
      { start: todayAt(0, 9,  0),  end: todayAt(0, 10, 30) }, // team standup
      { start: todayAt(0, 12, 0),  end: todayAt(0, 13, 0)  }, // lunch meeting
      { start: todayAt(0, 16, 0),  end: todayAt(0, 17, 30) }, // end-of-day sync
      { start: todayAt(1, 9,  0),  end: todayAt(1, 12, 0)  }, // packed morning
      { start: todayAt(2, 10, 0),  end: todayAt(2, 11, 0)  },
    ],
  },
  _seed_family_sarah: {
    displayName: 'Sarah Johnson',
    blocks: [
      { start: todayAt(0, 8,  0),  end: todayAt(0, 12, 0)  }, // work morning
      { start: todayAt(0, 13, 30), end: todayAt(0, 15, 30) }, // work afternoon
      { start: todayAt(1, 9,  0),  end: todayAt(1, 17, 0)  }, // full day at office
      { start: todayAt(2, 8,  30), end: todayAt(2, 12, 0)  },
    ],
  },
  _seed_family_robert: {
    displayName: 'Robert Johnson',
    blocks: [
      { start: todayAt(0, 8,  30), end: todayAt(0, 12, 0)  },
      { start: todayAt(0, 13, 0),  end: todayAt(0, 17, 0)  }, // full work day
      { start: todayAt(1, 8,  0),  end: todayAt(1, 16, 30) },
    ],
  },
  _seed_family_thomas: {
    displayName: 'Thomas Johnson',
    blocks: [
      { start: todayAt(0, 10, 0),  end: todayAt(0, 11, 30) }, // doctor appt
      { start: todayAt(0, 15, 0),  end: todayAt(0, 16, 30) }, // physical therapy
      { start: todayAt(2, 9,  0),  end: todayAt(2, 10, 30) },
    ],
  },
};

export async function seedTestData(circleId, adminUID, adminName) {
  const joinedAt = Timestamp.fromDate(addDays(new Date(), -91));

  // 1. Seed circle member records
  const memberBatch = writeBatch(db);
  for (const [uid, data] of Object.entries(SEED_MEMBERS)) {
    memberBatch.set(doc(db, 'circles', circleId, 'members', uid), { ...data, joinedAt, _seeded: true });
  }
  await memberBatch.commit();

  // 2. Events
  const events = generateEvents(new Date(), adminUID, adminName);
  for (let i = 0; i < events.length; i += 400) {
    const batch = writeBatch(db);
    for (const event of events.slice(i, i + 400)) {
      batch.set(doc(collection(db, 'circles', circleId, 'events')), event);
    }
    await batch.commit();
  }

  // 3. Activity log entries
  const logs = generateLogs(new Date(), adminUID, adminName);
  for (let i = 0; i < logs.length; i += 400) {
    const batch = writeBatch(db);
    for (const log of logs.slice(i, i + 400)) {
      batch.set(doc(collection(db, 'circles', circleId, 'logs')), log);
    }
    await batch.commit();
  }

  // 4. Mock member availability (busy blocks for Cronofy demo)
  const busyBatch = writeBatch(db);
  for (const [uid, data] of Object.entries(MOCK_BUSY)) {
    busyBatch.set(
      doc(db, 'circles', circleId, 'busyBlocks', uid),
      { ...data, _seeded: true },
    );
  }
  await busyBatch.commit();

  return { events: events.length, logs: logs.length };
}

export async function clearTestData(circleId) {
  // 1. Seeded events
  const eventsSnap = await getDocs(
    query(collection(db, 'circles', circleId, 'events'), where('_seeded', '==', true)),
  );
  for (let i = 0; i < eventsSnap.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of eventsSnap.docs.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
  }

  // 2. Seeded log entries
  const logsSnap = await getDocs(
    query(collection(db, 'circles', circleId, 'logs'), where('_seeded', '==', true)),
  );
  for (let i = 0; i < logsSnap.docs.length; i += 400) {
    const batch = writeBatch(db);
    for (const d of logsSnap.docs.slice(i, i + 400)) batch.delete(d.ref);
    await batch.commit();
  }

  // 3. Mock busy blocks
  const busyBatch = writeBatch(db);
  for (const uid of Object.keys(MOCK_BUSY)) {
    busyBatch.delete(doc(db, 'circles', circleId, 'busyBlocks', uid));
  }
  await busyBatch.commit();

  // 4. Seed member circle records
  const memberBatch = writeBatch(db);
  for (const uid of Object.keys(SEED_MEMBERS)) {
    memberBatch.delete(doc(db, 'circles', circleId, 'members', uid));
  }
  await memberBatch.commit();

  return { events: eventsSnap.docs.length, logs: logsSnap.docs.length };
}
