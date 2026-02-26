// Each step: role to switch to, route to navigate to, persona chip label,
// headline (what the slide is showing), bullets (your talking points),
// and durationSecs used only when auto-advance is enabled.

export const DEMO_STEPS = [

  // ── Introduction ───────────────────────────────────────────────────────────
  {
    role: 'admin',
    route: '/dashboard',
    persona: null,
    headline: 'A day in the life — Wednesday, today',
    bullets: [
      '3 months of real care history already in this app',
      "We'll walk through the day as 5 different people in the circle",
      'Watch the UI change completely as we switch perspectives',
    ],
    durationSecs: 10,
  },

  // ── Mary Wilson — Caregiver ────────────────────────────────────────────────
  {
    role: 'caregiver',
    route: '/dashboard',
    persona: '🩺 Mary Wilson · Caregiver · 9 AM',
    headline: 'Mary opens the app after the morning nurse visit',
    bullets: [
      "Clean, task-focused dashboard — nothing she doesn't need",
      "Today's full schedule is visible the moment she opens it",
      'She manages three patients today — this keeps her organised',
    ],
    durationSecs: 8,
  },
  {
    role: 'caregiver',
    route: '/logs',
    persona: '🩺 Mary Wilson · Caregiver',
    headline: 'She already logged the morning medication at 8:30 AM',
    bullets: [
      'Metformin 500 mg — Given ✓  ·  Lisinopril 10 mg — Given ✓',
      'Every family member can see this. No group text needed.',
      '3 months of structured history — filterable by medication, appointment, mood',
    ],
    durationSecs: 10,
  },
  {
    role: 'caregiver',
    route: '/calendar',
    persona: '🩺 Mary Wilson · Caregiver',
    headline: "Today's appointments are on the shared calendar",
    bullets: [
      'Nurse Visit done · Speech Therapy at 11 AM · OT at 2 PM',
      'Mary claims the events she is handling — family sees it instantly',
      'Checklist items get ticked off as each task completes',
    ],
    durationSecs: 10,
  },

  // ── Admin / Presenter ──────────────────────────────────────────────────────
  {
    role: 'admin',
    route: '/dashboard',
    persona: '📱 Admin · Between meetings · 10:30 AM',
    headline: 'Got the morning digest at 8 AM — already knew all of this',
    bullets: [
      'One notification. Everything needed. Zero phone calls made.',
      "When something is unclaimed, it shows here — that's the signal to act",
    ],
    durationSecs: 8,
  },
  {
    role: 'admin',
    route: '/calendar',
    persona: '📱 Admin',
    headline: "Emma's 7 PM video call is claimed — it's happening",
    bullets: [
      'Any family member can claim any unclaimed event from anywhere',
      'Arrange a ride, order a delivery, schedule a call — all trackable here',
    ],
    durationSecs: 8,
  },
  {
    role: 'admin',
    route: '/circle',
    persona: '📱 Admin',
    headline: 'Everyone in the circle — their role and when they joined',
    bullets: [
      'Clear who is the professional caregiver vs. family members',
      'Add a new member in 30 seconds with a shareable invite link',
    ],
    durationSecs: 7,
  },

  // ── Emma Davis — Remote Family ─────────────────────────────────────────────
  {
    role: 'family',
    route: '/dashboard',
    persona: '🏠 Emma Davis · Lives 3 states away',
    headline: "Emma knows what happened today — without asking anyone",
    bullets: [
      "Today's events, what completed, what's still coming up",
      "She knows the nurse visit happened before it hits the group chat",
    ],
    durationSecs: 8,
  },
  {
    role: 'family',
    route: '/logs',
    persona: '🏠 Emma Davis · Lives 3 states away',
    headline: 'Honest, structured history — not a group chat',
    bullets: [
      "Mood: 🙂 4/5 yesterday — she doesn't have to ask 'how is she doing?'",
      'Medication records, appointment notes, caregiver observations going back 3 months',
      '"I used to find out about problems two days after they happened"',
    ],
    durationSecs: 10,
  },
  {
    role: 'family',
    route: '/safety',
    persona: '🏠 Emma Davis · Lives 3 states away',
    headline: "The afternoon walk with Mary — she can see it happened",
    bullets: [
      'Real-time location within the safe zone',
      'If she left the zone, Emma would get an alert immediately',
      'Optional — can be disabled entirely if the family prefers',
    ],
    durationSecs: 9,
  },

  // ── Patient — Mom ──────────────────────────────────────────────────────────
  {
    role: 'patient',
    route: '/patient',
    persona: '👵 Mom · Her view · 3 PM',
    headline: "Designed for her — nothing she doesn't need",
    bullets: [
      'Large text, high contrast, her schedule in plain language',
      "Tonight's video call with Emma is right there — big and clear",
      'No menus to get lost in. No family notifications.',
    ],
    durationSecs: 11,
  },
  {
    role: 'patient',
    route: '/patient',
    persona: '👵 Mom · Her view',
    headline: 'She marks things done herself',
    bullets: [
      'After Speech Therapy she tapped this checkbox. That was it.',
      "When she checks something off, the family sees it — her voice, her terms",
      '"This is not us watching her. This is her calendar."',
    ],
    durationSecs: 12,
  },

  // ── Sarah Johnson — Local Family ───────────────────────────────────────────
  {
    role: 'family',
    route: '/calendar',
    persona: '🍽️ Sarah Johnson · Visiting Saturday',
    headline: 'Her Saturday visit is claimed — the family already knows',
    bullets: [
      "No group text needed to confirm. It's in everyone's calendar.",
      "Mary's 4 PM walk is also claimed — no overlap, no missed slots",
    ],
    durationSecs: 8,
  },
  {
    role: 'family',
    route: '/logs',
    persona: '🍽️ Sarah Johnson · Visiting Saturday',
    headline: "She reads the week's log before she arrives Saturday",
    bullets: [
      'Shows up informed — not catching up at the door',
      '"She stopped being the family coordinator. She could just be a daughter."',
    ],
    durationSecs: 9,
  },

  // ── Closing ────────────────────────────────────────────────────────────────
  {
    role: 'admin',
    route: '/dashboard',
    persona: null,
    headline: 'Already running. 3 months of history. Ready for your family.',
    bullets: [
      '→  Add anyone to the circle right now — 30 seconds',
      '→  Try it for 2 weeks — you just look, I manage it',
      '→  Give it one month of real coordination, then decide',
    ],
    durationSecs: 15,
  },
];
