import React, { useState } from 'react';

// What a blank form looks like. Also doubles as the shape every epic has.
const EMPTY_EPIC = {
  name: '', description: '', planStart: '', planEnd: '', revisedEnd: '',
  actualStart: '', actualEnd: '', actualComplete: ''
};

// A form for adding a new epic, or editing an existing one.
//
// Props:
//   initial  - an existing epic to edit, or null/undefined to add a new one
//   onSave   - called with the finished epic data when the form is submitted
//   onCancel - called if the user clicks "Cancel" while editing
export default function EpicForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => (initial ? { ...EMPTY_EPIC, ...initial } : EMPTY_EPIC));

  // "Revised end" starts out copying whatever you type into "Plan end" —
  // that's the normal case (no replanning has happened yet). The moment
  // you type into "Revised end" yourself, we stop auto-copying, because
  // now it's intentionally different from the plan. This flag remembers
  // whether that's happened yet.
  const [userHasEditedRevisedEnd, setUserHasEditedRevisedEnd] = useState(Boolean(initial));

  const [errorMessage, setErrorMessage] = useState('');

  function updateField(fieldName, value) {
    setForm((currentForm) => {
      const updatedForm = { ...currentForm, [fieldName]: value };
      if (fieldName === 'planEnd' && !userHasEditedRevisedEnd) {
        updatedForm.revisedEnd = value; // keep revised end in sync until the user overrides it
      }
      return updatedForm;
    });
  }

  function handleRevisedEndChange(value) {
    setUserHasEditedRevisedEnd(true);
    updateField('revisedEnd', value);
  }

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page

    if (!form.name.trim()) {
      setErrorMessage('Fill in at least the epic name.');
      return;
    }

    const hasOnlyOnePlanDate = (form.planStart || form.planEnd) && !(form.planStart && form.planEnd);
    if (hasOnlyOnePlanDate) {
      setErrorMessage('Fill in both plan start and plan end, or leave both blank for unplanned work.');
      return;
    }

    const hasNoDatesAtAll = !form.planStart && !form.actualStart;
    if (hasNoDatesAtAll) {
      setErrorMessage('Enter plan start/end, or at least an actual start, for unplanned work.');
      return;
    }

    setErrorMessage('');
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      planStart: form.planStart || null,
      planEnd: form.planEnd || null,
      // Unplanned work (no plan dates) has no "revised end" either.
      revisedEnd: form.planStart ? (form.revisedEnd || form.planEnd) : null,
      actualStart: form.actualStart || null,
      actualEnd: form.actualEnd || null,
      actualComplete: form.actualComplete || null
    });

    if (!initial) {
      // We just added something new (not editing) — clear the form for the next entry.
      setForm(EMPTY_EPIC);
      setUserHasEditedRevisedEnd(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <p className="tip">Revised end defaults to the plan end date. Leave both plan dates blank for unplanned/ad-hoc work.</p>

      <div className="form-grid">
        <div className="field">
          <label>Epic / milestone</label>
          <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Payments v2" />
        </div>
        <div className="field">
          <label>Plan start</label>
          <input type="date" value={form.planStart} onChange={(e) => updateField('planStart', e.target.value)} />
        </div>
        <div className="field">
          <label>Plan end</label>
          <input type="date" value={form.planEnd} onChange={(e) => updateField('planEnd', e.target.value)} />
        </div>
        <div className="field">
          <label>Revised end</label>
          <input type="date" value={form.revisedEnd} onChange={(e) => handleRevisedEndChange(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Description</label>
        <textarea rows={2} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Scope notes, links to tickets…" />
      </div>

      <div className="form-grid three">
        <div className="field">
          <label>Actual start</label>
          <input type="date" value={form.actualStart} onChange={(e) => updateField('actualStart', e.target.value)} />
        </div>
        <div className="field">
          <label>Actual end</label>
          <input type="date" value={form.actualEnd} onChange={(e) => updateField('actualEnd', e.target.value)} />
        </div>
        <div className="field">
          <label>Actual complete</label>
          <input type="date" value={form.actualComplete} onChange={(e) => updateField('actualComplete', e.target.value)} />
        </div>
      </div>

      {errorMessage && <p className="form-error">{errorMessage}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary">{initial ? 'Save changes' : 'Add to roadmap'}</button>
        {initial && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
