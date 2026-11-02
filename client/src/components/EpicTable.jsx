import React from 'react';
import { parseDate, fmt, effectiveRevisedEnd, manDaysFor, varianceFor, remainingWorkdaysFor } from '../dateMath.js';

// Works out what small colored "chip" to show for one epic's status —
// e.g. "+3 md · 5d left", "Unplanned", or "On plan". Kept as its own
// function (instead of inline JSX) so EpicRow below stays easy to read.
function statusChip(epic) {
  const isUnplanned = !epic.planStart;
  if (isUnplanned) {
    return <span className="chip unplanned">Unplanned</span>;
  }

  const variance = varianceFor(epic);
  if (!variance) {
    return <span className="muted">—</span>; // hasn't started yet, nothing to compare
  }

  const isAheadOrOnTime = variance.value <= 0;
  let text = variance.value === 0
    ? 'On plan'
    : (variance.value > 0 ? '+' + variance.value : variance.value) + ' md';
  if (variance.ongoing) text += ' (so far)';

  // If it's still in progress, also show how many working days are left
  // (or how overdue it already is) against the plan.
  if (variance.ongoing) {
    const daysLeft = remainingWorkdaysFor(epic);
    if (daysLeft !== null) {
      if (daysLeft > 0) text += ` · ${daysLeft}d left`;
      else if (daysLeft === 0) text += ' · due today';
      else text += ` · ${Math.abs(daysLeft)}d overdue`;
    }
  }

  const chipClass = isAheadOrOnTime ? 'ok' : 'late';
  return <span className={'chip ' + chipClass}>{text}</span>;
}

// `readOnly` is used by the admin's "view as" screen — same table, but
// with no Edit/Remove column, since admins can see another user's data
// without being able to change it.
function EpicTable({ epics, onEdit, onDelete, readOnly }) {
  if (epics.length === 0) {
    return <p className="empty">No epics yet — add one above.</p>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Epic</th>
            <th>Description</th>
            <th>Plan start</th>
            <th>Plan end</th>
            <th>Revised end</th>
            <th>Actual start</th>
            <th>Actual end</th>
            <th>Actual complete</th>
            <th>Man-days</th>
            <th>Variance</th>
            {!readOnly && <th />}
          </tr>
        </thead>
        <tbody>
          {epics.map((epic) => (
            <EpicRow key={epic.id} epic={epic} onEdit={onEdit} onDelete={onDelete} readOnly={readOnly} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EpicRow = React.memo(function EpicRow({ epic, onEdit, onDelete, readOnly }) {
  const plannedManDays = manDaysFor(epic);
  const isUnplanned = !epic.planStart;

  return (
    <tr>
      <td className="name-cell">
        {epic.name}
        {isUnplanned && <span className="unplanned-tag"> (unplanned)</span>}
      </td>
      <td className="desc-cell" title={epic.description || ''}>{epic.description || '—'}</td>
      <td>{fmt(parseDate(epic.planStart))}</td>
      <td>{fmt(parseDate(epic.planEnd))}</td>
      <td>{fmt(parseDate(effectiveRevisedEnd(epic)))}</td>
      <td>{fmt(parseDate(epic.actualStart))}</td>
      <td>{epic.actualEnd ? fmt(parseDate(epic.actualEnd)) : '—'}</td>
      <td>{epic.actualComplete ? fmt(parseDate(epic.actualComplete)) : (epic.actualStart ? 'In progress' : '—')}</td>
      <td>{plannedManDays === null ? '—' : plannedManDays + ' md'}</td>
      <td>{statusChip(epic)}</td>
      {!readOnly && (
        <td>
          <div className="row-actions">
            <button onClick={() => onEdit(epic.id)}>Edit</button>
            <button className="danger" onClick={() => onDelete(epic.id)}>Remove</button>
          </div>
        </td>
      )}
    </tr>
  );
});

export default React.memo(EpicTable);
