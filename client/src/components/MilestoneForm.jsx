import React, { useState } from 'react';

const EMPTY_MILESTONE = { name: '', category: 'project', description: '', plannedDate: '', actualDate: '' };

// A form for adding a new milestone, or editing an existing one.
// Same pattern as EpicForm.jsx, just with fewer fields.
export default function MilestoneForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => (initial ? { ...EMPTY_MILESTONE, ...initial } : EMPTY_MILESTONE));
  const [errorMessage, setErrorMessage] = useState('');

  function updateField(fieldName, value) {
    setForm((currentForm) => ({ ...currentForm, [fieldName]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.plannedDate) {
      setErrorMessage('Fill in at least the milestone name and planned date.');
      return;
    }

    setErrorMessage('');
    onSave({
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      plannedDate: form.plannedDate,
      actualDate: form.actualDate || null
    });

    if (!initial) setForm(EMPTY_MILESTONE);
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-grid five">
        <div className="field">
          <label>Milestone</label>
          <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Go-live" />
        </div>
        <div className="field">
          <label>Type</label>
          <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
            <option value="project">Project milestone</option>
            <option value="customer">Customer milestone</option>
          </select>
        </div>
        <div className="field">
          <label>Planned date</label>
          <input type="date" value={form.plannedDate} onChange={(e) => updateField('plannedDate', e.target.value)} />
        </div>
        <div className="field">
          <label>Actual date</label>
          <input type="date" value={form.actualDate} onChange={(e) => updateField('actualDate', e.target.value)} />
        </div>
        <div className="field">
          <label>Description</label>
          <input value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="optional note" />
        </div>
      </div>

      {errorMessage && <p className="form-error">{errorMessage}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary">{initial ? 'Save changes' : 'Add milestone'}</button>
        {initial && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
