import React from 'react';

// The row of project "pills" at the top of the page. This component
// doesn't hold any data itself — it just displays what it's given
// (`projects`, `activeId`) and calls the function props when you click
// something. All the real logic lives in App.jsx.
//
// Wrapped in React.memo: App.jsx passes these callbacks in via
// useCallback, so they keep the same reference across renders that don't
// actually touch projects — memo lets this component skip re-rendering
// on those (e.g. typing in the epic form re-renders App, but not this).
function ProjectTabs({ projects, activeId, onSelect, onRename, onDelete, onAdd }) {
  return (
    <div className="project-tabs">
      {projects.map((project) => (
        <div key={project.id} className={'tab' + (project.id === activeId ? ' active' : '')}>
          <button className="tab-name" onClick={() => onSelect(project.id)}>
            {project.name}
          </button>
          <button className="tab-icon" title="Rename project" onClick={() => onRename(project.id)}>
            ✎
          </button>
          {/* Don't show a delete button if this is the only project left — there must always be at least one. */}
          {projects.length > 1 && (
            <button className="tab-icon" title="Delete project" onClick={() => onDelete(project.id)}>
              ×
            </button>
          )}
        </div>
      ))}
      <button className="tab-add" onClick={onAdd}>+ New project</button>
    </div>
  );
}

export default React.memo(ProjectTabs);
