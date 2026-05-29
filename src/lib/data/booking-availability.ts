/**
 * Pure helpers for computing appointment slots from doctor availability data.
 *
 * Everything here is timezone-aware in the sense that we treat dates as ISO
 * (YYYY-MM-DD) strings in the clinic's local time. The clock-time arithmetic
 * is naive ("HH:mm" math) — sufficient for India where every clinic shares
 * one timezone and overnight slots aren't a thing.
 *
 * Consumers (the server actions in admin/appointments/actions.ts) read the
 * relevant rows from `doctor_availability`, `availability_overrides`,
 * `appointments`, and `clinic_slot_locks`, then assemble slots via these
 * pure functions. Keeping them pure makes the slot logic unit-testable
 * without a DB and reusable across the admin dialog + public booking.
 */

// =============================================================================
// Types — narrow shapes that mirror the DB columns we actually read.
// =============================================================================

export type AvailabilityRow = {
  weekday:        number;     // 0 = Sun … 6 = Sat (Postgres convention)
  start_time:     string;     // "HH:mm" or "HH:mm:ss"
  end_time:       string;
  slot_minutes:   number;
  effective_from: string;     // "YYYY-MM-DD"
  effective_to:   string | null;
};

export type AvailabilityOverrideRow = {
  date:       string;         // "YYYY-MM-DD"
  is_blocked: boolean;
  start_time: string | null;  // partial-day block: range to remove
  end_time:   string | null;
};

export type WorkingWindow = {
  start:        string;       // "HH:mm"
  end:          string;       // "HH:mm"
  slotMinutes:  number;
};

// =============================================================================
// Date helpers
// =============================================================================

/** Returns Postgres-style weekday (0 = Sun … 6 = Sat) for a YYYY-MM-DD date. */
export function weekdayFor(dateIso: string): number {
  // Parse as UTC midnight to avoid the JS Date timezone footgun when only
  // a date is provided. We only care about day-of-week, which is invariant.
  const d = new Date(`${dateIso}T00:00:00Z`);
  return d.getUTCDay();
}

/** Does an availability row apply on this date? (effective_from ≤ d ≤ effective_to). */
export function inEffectiveRange(row: { effective_from: string; effective_to: string | null }, dateIso: string): boolean {
  if (dateIso < row.effective_from) return false;
  if (row.effective_to && dateIso > row.effective_to) return false;
  return true;
}

/** Normalize "HH:mm:ss" or "HH:mm" → "HH:mm". */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** Add `minutes` to "HH:mm". Caps at "24:00" — slots crossing midnight are clipped. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const hh = Math.min(24, Math.floor(total / 60));
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Lexicographic comparison works for "HH:mm" — saves a parse. */
export function timeLt(a: string, b: string): boolean { return a < b; }
export function timeLte(a: string, b: string): boolean { return a <= b; }

// =============================================================================
// Working windows for a doctor on a date
// =============================================================================

/**
 * Given the doctor's availability rows + overrides for the doctor (any date),
 * return the working windows for the requested date. Each window also carries
 * its slot_minutes since different shifts can have different slot lengths.
 *
 * Returns `[]` when the doctor is off for the day (no weekday rows or fully
 * blocked by an override).
 */
export function computeDoctorWorkingWindows(
  availability: AvailabilityRow[],
  overrides:    AvailabilityOverrideRow[],
  dateIso:      string,
): WorkingWindow[] {
  const weekday = weekdayFor(dateIso);

  // Pick the rows that match this weekday and are in their effective range.
  const matchingRows = availability.filter(
    (r) => r.weekday === weekday && inEffectiveRange(r, dateIso),
  );
  if (matchingRows.length === 0) return [];

  // Convert raw rows to windows.
  let windows: WorkingWindow[] = matchingRows.map((r) => ({
    start:       hhmm(r.start_time),
    end:         hhmm(r.end_time),
    slotMinutes: r.slot_minutes > 0 ? r.slot_minutes : 30,
  }));

  // Apply overrides for this date.
  const dayOverrides = overrides.filter((o) => o.date === dateIso);

  for (const ov of dayOverrides) {
    if (!ov.is_blocked) continue; // future: positive overrides
    if (!ov.start_time && !ov.end_time) {
      // Whole-day block.
      return [];
    }
    const bStart = hhmm(ov.start_time ?? "00:00");
    const bEnd   = hhmm(ov.end_time   ?? "24:00");

    // Subtract [bStart, bEnd) from each window. Each window may split into
    // 0, 1, or 2 sub-windows.
    const next: WorkingWindow[] = [];
    for (const w of windows) {
      // No overlap → keep as-is.
      if (bEnd <= w.start || bStart >= w.end) {
        next.push(w);
        continue;
      }
      // Block fully covers the window → drop it.
      if (bStart <= w.start && bEnd >= w.end) {
        continue;
      }
      // Block starts inside the window: emit [w.start, bStart).
      if (bStart > w.start) {
        next.push({ start: w.start, end: bStart, slotMinutes: w.slotMinutes });
      }
      // Block ends inside the window: emit [bEnd, w.end).
      if (bEnd < w.end) {
        next.push({ start: bEnd, end: w.end, slotMinutes: w.slotMinutes });
      }
    }
    windows = next;
  }

  // Drop any zero-length windows that fell out of the subtraction.
  return windows.filter((w) => w.start < w.end);
}

// =============================================================================
// Slots inside a working window
// =============================================================================

/**
 * Enumerate "HH:mm" slot start times within a window using its slot_minutes.
 * The last slot must fit entirely (start + slotMinutes ≤ end).
 */
export function slotsInWindow(window: WorkingWindow): string[] {
  const out: string[] = [];
  let cursor = window.start;
  while (true) {
    const next = addMinutes(cursor, window.slotMinutes);
    if (next > window.end) break;
    out.push(cursor);
    cursor = next;
  }
  return out;
}

/** All slot start times across all working windows on a date. */
export function slotsInWindows(windows: WorkingWindow[]): string[] {
  const all: string[] = [];
  for (const w of windows) all.push(...slotsInWindow(w));
  return all;
}

/** Subtract booked / locked slots from a list of free slots. */
export function subtractBooked(slots: string[], booked: Set<string>): string[] {
  return slots.filter((s) => !booked.has(s));
}

// =============================================================================
// 30-day range helpers
// =============================================================================

/** ISO date `n` days after `dateIso` (negative for backwards). UTC math. */
export function addDays(dateIso: string, n: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Array of N consecutive ISO dates starting at `startIso`. */
export function dateRange(startIso: string, days: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) out.push(addDays(startIso, i));
  return out;
}

/**
 * For each date in `dates`, does the doctor have any working window?
 * Returns a `Set<string>` of dates where the answer is yes — handy for greying
 * out the date row in the booking dialog.
 */
export function workingDatesFor(
  dates:        string[],
  availability: AvailabilityRow[],
  overrides:    AvailabilityOverrideRow[],
): Set<string> {
  const out = new Set<string>();
  for (const d of dates) {
    if (computeDoctorWorkingWindows(availability, overrides, d).length > 0) {
      out.add(d);
    }
  }
  return out;
}
