import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import {
  parseDate, fmt, daysBetween, todayUTC,
  effectiveRevisedEnd, effectiveActualFinish, manDaysFor, varianceFor, remainingWorkdaysFor,
  milestoneVariance
} from '../dateMath.js';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A label normally grows rightward from wherever it's anchored. Once that
// anchor point is close enough to the right edge of the chart that the
// label would run past it (and get clipped instead of staying visible),
// this flips it to anchor its RIGHT edge at that point instead, so it
// grows leftward. `gapPercent` is extra breathing room between the
// anchor and the label, applied on whichever side it's growing toward.
function edgeAwareStyle(anchorPercent, gapPercent = 0) {
  if (anchorPercent > 78) {
    return { left: (anchorPercent - gapPercent) + '%', transform: 'translateX(-100%)' };
  }
  return { left: (anchorPercent + gapPercent) + '%' };
}

// -----------------------------------------------------------------------
// HOW THE TIMELINE IS DRAWN
//
// We don't use a charting library — it's just a row per epic, and inside
// each row, two little colored boxes ("bars") positioned using CSS
// percentages. To place a bar, we need to answer: "given the earliest and
// latest dates across ALL epics, what percentage across the chart does
// THIS particular date fall at?"
//
// That's what `buildDateRange()` below works out once, and then every
// bar just calls `range.percentFor(someDate)` to find its left position.
// -----------------------------------------------------------------------

// Looks at every epic AND milestone and works out the earliest and latest
// dates we need to show, with a little padding on each side so bars don't
// touch the very edge of the chart.
function buildDateRange(epics, milestones) {
  const today = todayUTC();
  const allRelevantDates = [today];

  epics.forEach((epic) => {
    allRelevantDates.push(
      parseDate(epic.planStart),
      parseDate(epic.planEnd),
      parseDate(effectiveRevisedEnd(epic)),
      parseDate(epic.actualStart)
    );
    const finish = effectiveActualFinish(epic);
    if (finish.date) allRelevantDates.push(parseDate(finish.date));
    else if (finish.ongoing) allRelevantDates.push(today);
  });

  milestones.forEach((ms) => {
    allRelevantDates.push(parseDate(ms.plannedDate));
    if (ms.actualDate) allRelevantDates.push(parseDate(ms.actualDate));
  });

  const realDates = allRelevantDates.filter(Boolean); // drop any nulls
  if (realDates.length === 0) return null;

  let earliest = new Date(Math.min(...realDates));
  let latest = new Date(Math.max(...realDates));

  // Add a bit of breathing room on both ends (about 4% of the total span,
  // but never less than 3 days), so the first/last bar isn't flush against
  // the chart's edge.
  const totalSpanInDays = Math.max(daysBetween(earliest, latest), 14);
  const paddingInDays = Math.max(Math.round(totalSpanInDays * 0.04), 3);
  earliest = new Date(earliest.getTime() - paddingInDays * 86400000);
  latest = new Date(latest.getTime() + paddingInDays * 86400000);

  const totalDaysInRange = daysBetween(earliest, latest);

  return {
    earliest,
    latest,
    today,
    // Given any date, returns how far across the chart it falls, as a
    // percentage from 0 (the very left) to 100 (the very right).
    percentFor(date) {
      return (daysBetween(earliest, date) / totalDaysInRange) * 100;
    }
  };
}

// Works out the month labels ("Jan 2026", "Feb 2026", ...) to show across
// the top of the chart, one per calendar month inside the date range.
function buildMonthTicks(range) {
  const ticks = [];
  let month = new Date(Date.UTC(range.earliest.getUTCFullYear(), range.earliest.getUTCMonth(), 1));
  if (month < range.earliest) month.setUTCMonth(month.getUTCMonth() + 1);

  while (month <= range.latest) {
    ticks.push({
      leftPercent: range.percentFor(month),
      label: MONTH_NAMES[month.getUTCMonth()] + ' ' + month.getUTCFullYear()
    });
    month = new Date(month);
    month.setUTCMonth(month.getUTCMonth() + 1);
  }
  return ticks;
}

function Timeline({ epics, milestones }) {
  // Both recalculations only re-run when the inputs actually change —
  // every other re-render (e.g. typing in a form elsewhere on the page)
  // reuses the same range/ticks objects instead of redoing the date math.
  const range = useMemo(() => buildDateRange(epics, milestones), [epics, milestones]);
  const monthTicks = useMemo(() => (range ? buildMonthTicks(range) : []), [range]);

  const customerMilestones = useMemo(() => milestones.filter((ms) => ms.category === 'customer'), [milestones]);
  const projectMilestones = useMemo(() => milestones.filter((ms) => ms.category !== 'customer'), [milestones]);

  // Hooks above must run on every render regardless of epics.length, so
  // this early-return check comes after them, not before.
  if ((epics.length === 0 && milestones.length === 0) || !range) {
    return <p className="empty">Nothing here yet — add an epic or milestone above to see the timeline.</p>;
  }

  const todayIsVisible = range.today >= range.earliest && range.today <= range.latest;

  return (
    <div className="chart-scroll">
      <div className="chart-inner" style={{ width: Math.max(760, monthTicks.length * 65 + 190) }}>
        <div className="axis">
          {monthTicks.map((tick, index) => (
            <div key={index} className="tick" style={{ left: tick.leftPercent + '%' }}>
              {tick.label}
            </div>
          ))}
        </div>

        <div className="plot">
          {todayIsVisible && (
            <div className="today-line" style={{ left: range.percentFor(range.today) + '%' }}>
              <span className="today-label">Today</span>
            </div>
          )}
          {customerMilestones.length > 0 && (
            <MilestoneGroupRow label="Customer milestones" milestones={customerMilestones} range={range} />
          )}
          {projectMilestones.length > 0 && (
            <MilestoneGroupRow label="Project milestones" milestones={projectMilestones} range={range} />
          )}
          {epics.map((epic) => (
            <EpicRow key={epic.id} epic={epic} range={range} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Builds the full label for one milestone — its name plus its current
// state (overdue / days left / how it landed), all in one string. This
// matches the PowerPoint export's milestone labels exactly, so what you
// see here and what ends up in the exported deck are consistent.
function milestoneLabelText(ms, variance) {
  if (!variance) return ms.name;
  if (variance.pending && variance.overdue) return `${ms.name} (${variance.value}d overdue)`;
  if (variance.pending) return ms.name + (variance.daysLeft === 0 ? ' (due today)' : ` (${variance.daysLeft}d left)`);
  if (variance.value === 0) return `${ms.name} (on time)`;
  return `${ms.name} (${variance.value > 0 ? `+${variance.value}d late` : `${Math.abs(variance.value)}d early`})`;
}

// Milestones are a single point in time, not a span, so they're drawn as
// small diamonds rather than bars — one row per category (Customer/
// Project). Two milestones close together in time could end up with
// overlapping name labels, so this measures each label's ACTUAL rendered
// width after it's on screen (useLayoutEffect runs after the browser has
// laid everything out, but before it paints) and packs any that overlap
// into separate vertical "lanes" within the row. The row's height then
// grows to however many lanes that actually took — one lane for a quiet
// month, more only where milestones genuinely cluster together.
const MilestoneGroupRow = React.memo(function MilestoneGroupRow({ label, milestones, range }) {
  const items = useMemo(() => milestones.map((ms) => {
    const planned = parseDate(ms.plannedDate);
    const actual = ms.actualDate ? parseDate(ms.actualDate) : null;
    const variance = milestoneVariance(ms);
    // The label anchors to whichever marker is further left, so it never
    // starts to the right of either diamond it's describing.
    const anchorDate = (actual && planned && actual < planned) ? actual : (planned || actual);
    return { ms, planned, actual, variance, anchorDate, labelText: milestoneLabelText(ms, variance) };
  }), [milestones]);

  const labelElementsRef = useRef({}); // milestone id -> the label's DOM node
  const [lanes, setLanes] = useState({}); // milestone id -> lane index
  const [rowHeight, setRowHeight] = useState(60); // recalculated below once real widths are known

  useLayoutEffect(() => {
    const GAP_PX = 10, LANE_STEP_PX = 50;

    const measured = items
      .map((it) => {
        const el = labelElementsRef.current[it.ms.id];
        return el ? { id: it.ms.id, left: el.offsetLeft, right: el.offsetLeft + el.offsetWidth } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.left - b.left);

    const laneRightEdge = []; // rightmost occupied x per lane so far
    const nextLanes = {};
    measured.forEach((m) => {
      let lane = laneRightEdge.findIndex((edge) => edge + GAP_PX <= m.left);
      if (lane === -1) { lane = laneRightEdge.length; laneRightEdge.push(m.right); }
      else laneRightEdge[lane] = m.right;
      nextLanes[m.id] = lane;
    });

    setLanes(nextLanes);
    setRowHeight(Math.max(laneRightEdge.length, 1) * LANE_STEP_PX + 24);
  }, [items]);

  return (
    <div className="track milestone-track" style={{ height: rowHeight }}>
      <div className="rowlabel">{label}</div>
      {items.map((it) => {
        const lane = lanes[it.ms.id] || 0;
        const nameTop = lane * 50 + 2;
        const diamondTop = lane * 50 + 34;
        const isOverdue = Boolean(it.variance && it.variance.overdue);
        const isLate = Boolean(it.planned && it.actual && it.actual > it.planned);

        return (
          <React.Fragment key={it.ms.id}>
            {it.planned && it.actual && (
              <div
                className="milestone-connector"
                style={{
                  top: diamondTop,
                  left: Math.min(range.percentFor(it.planned), range.percentFor(it.actual)) + '%',
                  width: Math.abs(range.percentFor(it.actual) - range.percentFor(it.planned)) + '%'
                }}
              />
            )}
            {it.planned && (
              <div
                className="milestone-diamond plan"
                style={{ top: diamondTop, left: range.percentFor(it.planned) + '%' }}
                title={`${it.ms.name} — planned ${fmt(it.planned)}`}
              />
            )}
            {it.actual && (
              <div
                className={'milestone-diamond actual' + (isLate ? ' late' : '')}
                style={{ top: diamondTop, left: range.percentFor(it.actual) + '%' }}
                title={`${it.ms.name} — actual ${fmt(it.actual)}`}
              />
            )}
            {!it.actual && isOverdue && (
              <div
                className="milestone-diamond actual overdue"
                style={{ top: diamondTop, left: range.percentFor(range.today) + '%' }}
                title={`${it.ms.name} — not yet reached, ${it.variance.value} day(s) overdue`}
              />
            )}
            <div
              className="milestone-name-label"
              ref={(el) => { labelElementsRef.current[it.ms.id] = el; }}
              style={{ top: nameTop, left: range.percentFor(it.anchorDate) + '%', color: isOverdue ? 'var(--late)' : undefined }}
            >
              {it.labelText}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
});

// One row of the timeline: the epic's name, its planned bar (dashed), and
// its actual bar (solid, colored by how it's going) with a status tag.
// Wrapped in memo: our update pattern (App.jsx) only creates a new object
// for the epic that actually changed, so every other row's `epic` prop
// keeps the same reference and can skip re-rendering entirely.
const EpicRow = React.memo(function EpicRow({ epic, range }) {
  const planStart = parseDate(epic.planStart);
  const planEnd = parseDate(effectiveRevisedEnd(epic));
  const actualStart = parseDate(epic.actualStart);
  const finish = effectiveActualFinish(epic);
  const actualEndForDrawing = finish.date ? parseDate(finish.date) : (finish.ongoing ? range.today : null);

  const isUnplanned = !planStart;
  const plannedManDays = manDaysFor(epic);

  const hasPlanBar = Boolean(planStart && planEnd);
  const hasActualBar = Boolean(actualStart && actualEndForDrawing);

  // Work out the actual bar's color and its little status tag.
  let actualBarColorClass = '';
  let statusTagText = null;
  if (hasActualBar) {
    if (isUnplanned) {
      actualBarColorClass = 'unplanned';
      statusTagText = 'Unplanned';
    } else {
      const isRunningLate = planEnd ? actualEndForDrawing > planEnd : false;
      actualBarColorClass = isRunningLate ? 'late' : 'ok';

      const variance = varianceFor(epic);
      if (variance) {
        statusTagText = variance.value === 0
          ? 'On plan'
          : (variance.value > 0 ? '+' + variance.value : variance.value) + ' md';
        if (variance.ongoing) {
          statusTagText += ' so far';
          const daysLeft = remainingWorkdaysFor(epic);
          if (daysLeft !== null) {
            if (daysLeft > 0) statusTagText += ` · ${daysLeft}d left`;
            else if (daysLeft === 0) statusTagText += ' · due today';
            else statusTagText += ` · ${Math.abs(daysLeft)}d overdue`;
          }
        }
      }
    }
  }

  return (
    <div className="track">
      <div className="rowlabel">
        {epic.name}
        {isUnplanned && <span className="unplanned-tag"> (unplanned)</span>}
      </div>

      {hasPlanBar && (
        <>
          {plannedManDays !== null && (
            <div className="plan-days-tag" style={edgeAwareStyle(range.percentFor(planStart))}>
              {plannedManDays} md planned
            </div>
          )}
          <div
            className="bar plan"
            style={{
              left: range.percentFor(planStart) + '%',
              width: Math.max(range.percentFor(planEnd) - range.percentFor(planStart), 0.6) + '%'
            }}
          />
          {epic.planEnd && epic.revisedEnd && epic.revisedEnd !== epic.planEnd && (
            <div
              className="revised-mark"
              style={{ left: range.percentFor(parseDate(epic.planEnd)) + '%' }}
              title={`Original plan end: ${fmt(parseDate(epic.planEnd))}`}
            >
              <span className="revised-mark-label">orig. end</span>
            </div>
          )}
        </>
      )}

      {hasActualBar && (
        <>
          <div
            className={'bar actual ' + actualBarColorClass}
            style={{
              left: range.percentFor(actualStart) + '%',
              width: Math.max(range.percentFor(actualEndForDrawing) - range.percentFor(actualStart), 0.6) + '%'
            }}
          />
          {statusTagText && (
            <div
              className={'drift-tag ' + actualBarColorClass}
              style={edgeAwareStyle(range.percentFor(actualEndForDrawing), 1.2)}
            >
              {statusTagText}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default React.memo(Timeline);
