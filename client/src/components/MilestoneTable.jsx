import React from 'react';
import { parseDate, fmt, milestoneVariance } from '../dateMath.js';

// Works out the small status chip for one milestone row — e.g.
// "5d overdue", "12d left", "On time", or "+3d" (reached, but late).
function statusChip(milestone) {
  const variance = milestoneVariance(milestone);
  if (!variance) return <span className="muted">—</span>;

  if (variance.pending && variance.overdue) {
    return <span className="chip late">{variance.value}d overdue</span>;
  }
  if (variance.pending) {
    const text = variance.daysLeft === 0 ? 'Due today' : variance.daysLeft + 'd left';
    return <span className="chip neutral">{text}</span>;
  }

  // Already reached — show how early/late/on-time it landed.
  const chipClass = variance.value > 0 ? 'late' : variance.value < 0 ? 'ok' : 'neutral';
  const text = variance.value === 0 ? 'On time' : (variance.value > 0 ? '+' : '') + variance.value + 'd';
  return <span className={'chip ' + chipClass}>{text}</span>;
}

// `readOnly` is used by the admin's "view as" screen — same table, but
// with no Edit/Remove column.
function MilestoneTable({ milestones, onEdit, onDelete, readOnly }) {
  if (milestones.length === 0) {
    return <p className="empty">No milestones yet.</p>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Type</th>
            <th>Description</th>
            <th>Planned</th>
            <th>Actual</th>
            <th>Status</th>
            {!readOnly && <th />}
          </tr>
        </thead>
        <tbody>
          {milestones.map((ms) => (
            <MilestoneRow key={ms.id} milestone={ms} onEdit={onEdit} onDelete={onDelete} readOnly={readOnly} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Memoized for the same reason as EpicTable's row: our update pattern
// only creates a new object for the milestone that actually changed, so
// unaffected rows can skip re-rendering.
const MilestoneRow = React.memo(function MilestoneRow({ milestone, onEdit, onDelete, readOnly }) {
  return (
    <tr>
      <td className="name-cell">{milestone.name}</td>
      <td>{milestone.category === 'customer' ? 'Customer' : 'Project'}</td>
      <td className="desc-cell" title={milestone.description || ''}>{milestone.description || '—'}</td>
      <td>{fmt(parseDate(milestone.plannedDate))}</td>
      <td>{milestone.actualDate ? fmt(parseDate(milestone.actualDate)) : '—'}</td>
      <td>{statusChip(milestone)}</td>
      {!readOnly && (
        <td>
          <div className="row-actions">
            <button onClick={() => onEdit(milestone.id)}>Edit</button>
            <button className="danger" onClick={() => onDelete(milestone.id)}>Remove</button>
          </div>
        </td>
      )}
    </tr>
  );
});

export default React.memo(MilestoneTable);
