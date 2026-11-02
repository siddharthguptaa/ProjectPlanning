// All the date math for the app lives in this one file, as plain
// functions. "Plain function" means: you give it some data, it gives you
// an answer back, and it doesn't touch React or the screen at all. That
// makes these easy to test and easy to reuse anywhere.
//
// Dates are stored as plain text like "2026-03-15" (year-month-day).
// Whenever we need to do math on a date, we first turn that text into a
// real JavaScript Date object with parseDate() below.

// Turns "2026-03-15" into a real Date object. Returns null if given
// nothing (so callers can write `if (!epic.planStart) ...` safely).
export function parseDate(dateText) {
  if (!dateText) return null;
  const [year, month, day] = dateText.split('-');
  // Date.UTC's month is 0-based (0 = January), so we subtract 1.
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

// Turns a Date object into something readable, like "Mar 15, 2026".
export function fmt(date) {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// How many days between two dates (can be negative if `later` is actually earlier).
export function daysBetween(earlier, later) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round((later - earlier) / millisecondsPerDay);
}

// Today's date, with the time part zeroed out (so date comparisons work cleanly).
export function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// Counts working days (Monday-Friday) between two dates, counting both the
// start and end day. If `end` comes before `start`, the answer is negative.
export function workdays(start, end) {
  if (!start || !end) return null;

  let from = start;
  let to = end;
  let sign = 1;
  if (to < from) {
    // Swap them so our loop below always counts forward, then remember to
    // flip the final answer negative.
    from = end;
    to = start;
    sign = -1;
  }

  let count = 0;
  const day = new Date(from.getTime());
  while (day <= to) {
    const dayOfWeek = day.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) count++;
    day.setUTCDate(day.getUTCDate() + 1); // move to the next day
  }

  return count * sign;
}

// --- Epic-specific helpers ---
// An epic can have its plan "revised" later (the end date changes). This
// returns whichever end date is currently the real one to measure against.
export function effectiveRevisedEnd(epic) {
  return epic.revisedEnd || epic.planEnd;
}

// Works out where an epic currently stands, actuals-wise:
//   - If it's complete, returns that completion date.
//   - If it has an "actual end" but no completion date, returns that.
//   - If it has started but nothing else, it's still ongoing (no end date yet).
//   - If it hasn't even started, there's nothing to report.
export function effectiveActualFinish(epic) {
  if (epic.actualComplete) return { date: epic.actualComplete, ongoing: false };
  if (epic.actualEnd) return { date: epic.actualEnd, ongoing: false };
  if (epic.actualStart) return { date: null, ongoing: true };
  return { date: null, ongoing: false };
}

// How many working days the epic was PLANNED to take.
export function manDaysFor(epic) {
  const start = parseDate(epic.planStart);
  const end = parseDate(effectiveRevisedEnd(epic));
  return workdays(start, end);
}

// Compares planned duration to actual duration.
// A positive value means it's taking/took longer than planned.
// A negative value means it finished/is running early.
export function varianceFor(epic) {
  const plannedDays = manDaysFor(epic);
  if (plannedDays === null) return null; // no plan dates — nothing to compare against

  const actualStart = parseDate(epic.actualStart);
  if (!actualStart) return null; // hasn't started yet

  const finish = effectiveActualFinish(epic);
  const finishDate = finish.date ? parseDate(finish.date) : (finish.ongoing ? todayUTC() : null);
  if (!finishDate) return null;

  const actualDays = workdays(actualStart, finishDate);
  return { value: actualDays - plannedDays, ongoing: finish.ongoing };
}

// How many working days are left before the (revised) plan end date.
// Negative means that date has already passed.
export function remainingWorkdaysFor(epic) {
  const end = parseDate(effectiveRevisedEnd(epic));
  if (!end) return null;
  return workdays(todayUTC(), end);
}

// --- Milestone-specific helper ---
// A milestone is a single date, not a date range, so its "variance" logic
// is simpler than an epic's. This returns one of three situations:
//   1. Already reached (has an actual date) -> how many days early/late it landed.
//   2. Not reached yet, and its planned date has passed -> it's overdue.
//   3. Not reached yet, and its planned date is still ahead -> days left until then.
export function milestoneVariance(milestone) {
  const planned = parseDate(milestone.plannedDate);
  if (!planned) return null;

  if (milestone.actualDate) {
    const actual = parseDate(milestone.actualDate);
    return { value: daysBetween(planned, actual), pending: false, overdue: false };
  }

  const today = todayUTC();
  const plannedDateHasPassed = today > planned;
  if (plannedDateHasPassed) {
    return { value: daysBetween(planned, today), pending: true, overdue: true };
  }
  return { value: null, pending: true, overdue: false, daysLeft: daysBetween(today, planned) };
}
