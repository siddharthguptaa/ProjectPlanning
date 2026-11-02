import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchCurrentUser, fetchState, saveState, logout as logoutRequest } from './api.js';
import Login from './components/Login.jsx';
import AdminOverview from './components/AdminOverview.jsx';
import ChangePasswordForm from './components/ChangePasswordForm.jsx';
import ProjectTabs from './components/ProjectTabs.jsx';
import EpicForm from './components/EpicForm.jsx';
import EpicTable from './components/EpicTable.jsx';
import MilestoneForm from './components/MilestoneForm.jsx';
import MilestoneTable from './components/MilestoneTable.jsx';
import Timeline from './components/Timeline.jsx';
import Overview from './components/Overview.jsx';
import { exportProjectToExcel } from './excelExport.js';
import { parseExcelFile } from './excelImport.js';
import { exportProjectToPptx } from './pptxExport.js';

// ---------------------------------------------------------------------
// DATA SHAPE (the logged-in user's own roadmap)
//   data = {
//     projects: [ { id, name, epics: [...], milestones: [...] }, ... ],
//     activeId, nextProjectId, nextEpicId, nextMilestoneId
//   }
//
// UPDATE PATTERN
// Every change goes through saveAndSetData(updater), where `updater` is a
// function (prevData) => nextData — the same "functional update" form
// React's own setState supports. Using the function form (instead of
// closing over the `data` variable directly) means the action callbacks
// below don't need `data` in their own dependency list, which is what
// lets useCallback keep their references stable across renders.
//
// WHO CAN SEE WHAT
// Every request to the server includes a session cookie identifying who's
// logged in. GET/PUT /api/state always means "MY OWN data" — there's no
// way to ask for someone else's through that route. The admin-only
// overview (AdminOverview.jsx) uses separate /api/admin/* routes that the
// server only allows for accounts with isAdmin set.
// ---------------------------------------------------------------------

function withUpsertedItem(items, itemData, editingId, nextId) {
  if (editingId !== null) {
    return items.map((item) => (item.id === editingId ? { ...itemData, id: editingId } : item));
  }
  return [...items, { ...itemData, id: nextId }];
}

function withUpdatedProject(projects, projectId, updateProject) {
  return projects.map((project) => (project.id === projectId ? updateProject(project) : project));
}

export default function App() {
  // undefined = still checking whether anyone's logged in; null = nobody is;
  // an object = that's who's logged in.
  const [currentUser, setCurrentUser] = useState(undefined);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const importFileInputRef = useRef(null);
  const [viewMode, setViewMode] = useState('project'); // 'project' | 'overview' | 'admin'
  const [editingEpicId, setEditingEpicId] = useState(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);

  // On first load, ask the server if we're already logged in (a valid
  // session cookie from a previous visit). If so, also load that user's
  // roadmap data right away.
  useEffect(() => {
    fetchCurrentUser()
      .then(({ user }) => {
        setCurrentUser(user);
        if (user) return fetchState().then((loadedData) => setData(loadedData));
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  function handleLoggedIn(user) {
    setCurrentUser(user);
    fetchState()
      .then((loadedData) => setData(loadedData))
      .catch((err) => setLoadError(err.message));
  }

  function handleLogout() {
    logoutRequest()
      .then(() => {
        setCurrentUser(null);
        setData(null);
        setViewMode('project');
      })
      .catch((err) => setStatusMessage('Could not log out: ' + err.message));
  }

  // See the DRY note in the comment block above: this lets handlers below
  // read the latest data synchronously (e.g. for a prompt() dialog)
  // without needing `data` in their own dependency array.
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const saveAndSetData = useCallback((updater) => {
    setData((prevData) => {
      const nextData = typeof updater === 'function' ? updater(prevData) : updater;
      saveState(nextData)
        .then(() => setStatusMessage('Saved.'))
        .catch((err) => setStatusMessage('Could not save: ' + err.message));
      return nextData;
    });
  }, []);

  const selectProject = useCallback((projectId) => {
    setViewMode('project');
    saveAndSetData((prev) => ({ ...prev, activeId: projectId }));
  }, [saveAndSetData]);

  const addProject = useCallback(() => {
    const name = prompt('Name this project', 'New project');
    if (!name || !name.trim()) return;

    setViewMode('project');
    saveAndSetData((prev) => {
      const newProject = { id: prev.nextProjectId, name: name.trim(), epics: [], milestones: [] };
      return {
        ...prev,
        projects: [...prev.projects, newProject],
        activeId: newProject.id,
        nextProjectId: prev.nextProjectId + 1
      };
    });
  }, [saveAndSetData]);

  const renameProject = useCallback((projectId) => {
    const project = dataRef.current.projects.find((p) => p.id === projectId);
    const newName = prompt('Rename project', project.name);
    if (!newName || !newName.trim()) return;

    saveAndSetData((prev) => ({
      ...prev,
      projects: withUpdatedProject(prev.projects, projectId, (p) => ({ ...p, name: newName.trim() }))
    }));
  }, [saveAndSetData]);

  const deleteProject = useCallback((projectId) => {
    const current = dataRef.current;
    if (current.projects.length <= 1) return;

    const project = current.projects.find((p) => p.id === projectId);
    if (!confirm(`Delete "${project.name}" and everything in it? This can't be undone.`)) return;

    saveAndSetData((prev) => {
      const remainingProjects = prev.projects.filter((p) => p.id !== projectId);
      const wasActive = prev.activeId === projectId;
      return { ...prev, projects: remainingProjects, activeId: wasActive ? remainingProjects[0].id : prev.activeId };
    });
  }, [saveAndSetData]);

  const saveEpic = useCallback((epicFormData) => {
    saveAndSetData((prev) => {
      const isEditing = editingEpicId !== null;
      const projects = withUpdatedProject(prev.projects, prev.activeId, (project) => ({
        ...project,
        epics: withUpsertedItem(project.epics, epicFormData, editingEpicId, prev.nextEpicId)
      }));
      return { ...prev, projects, nextEpicId: isEditing ? prev.nextEpicId : prev.nextEpicId + 1 };
    });
    setEditingEpicId(null);
  }, [editingEpicId, saveAndSetData]);

  const deleteEpic = useCallback((epicId) => {
    saveAndSetData((prev) => ({
      ...prev,
      projects: withUpdatedProject(prev.projects, prev.activeId, (project) => ({
        ...project,
        epics: project.epics.filter((e) => e.id !== epicId)
      }))
    }));
    setEditingEpicId((current) => (current === epicId ? null : current));
  }, [saveAndSetData]);

  const saveMilestone = useCallback((milestoneFormData) => {
    saveAndSetData((prev) => {
      const isEditing = editingMilestoneId !== null;
      const projects = withUpdatedProject(prev.projects, prev.activeId, (project) => ({
        ...project,
        milestones: withUpsertedItem(project.milestones, milestoneFormData, editingMilestoneId, prev.nextMilestoneId)
      }));
      return { ...prev, projects, nextMilestoneId: isEditing ? prev.nextMilestoneId : prev.nextMilestoneId + 1 };
    });
    setEditingMilestoneId(null);
  }, [editingMilestoneId, saveAndSetData]);

  const deleteMilestone = useCallback((milestoneId) => {
    saveAndSetData((prev) => ({
      ...prev,
      projects: withUpdatedProject(prev.projects, prev.activeId, (project) => ({
        ...project,
        milestones: project.milestones.filter((m) => m.id !== milestoneId)
      }))
    }));
    setEditingMilestoneId((current) => (current === milestoneId ? null : current));
  }, [saveAndSetData]);

  const cancelEditEpic = useCallback(() => setEditingEpicId(null), []);
  const cancelEditMilestone = useCallback(() => setEditingMilestoneId(null), []);

  // Reads the chosen .xlsx file, then appends everything it finds into
  // the currently active project (new ids assigned from the counters —
  // same pattern as adding a single epic/milestone by hand, just many at once).
  const importFromExcel = useCallback((file) => {
    parseExcelFile(file)
      .then(({ epics, milestones }) => {
        saveAndSetData((prev) => {
          let nextEpicId = prev.nextEpicId;
          let nextMilestoneId = prev.nextMilestoneId;

          const projects = withUpdatedProject(prev.projects, prev.activeId, (project) => {
            const newEpics = epics.added.map((epicData) => ({ ...epicData, id: nextEpicId++ }));
            const newMilestones = milestones.added.map((msData) => ({ ...msData, id: nextMilestoneId++ }));
            return {
              ...project,
              epics: [...project.epics, ...newEpics],
              milestones: [...project.milestones, ...newMilestones]
            };
          });

          return { ...prev, projects, nextEpicId, nextMilestoneId };
        });

        const skippedTotal = epics.skipped + milestones.skipped;
        let message = `Imported ${epics.added.length} epic(s) and ${milestones.added.length} milestone(s).`;
        if (skippedTotal > 0) message += ` (${skippedTotal} row(s) skipped — missing required fields.)`;
        setStatusMessage(message);
      })
      .catch((err) => setStatusMessage('Could not import: ' + err.message));
  }, [saveAndSetData]);

  function handleImportFileChosen(event) {
    const file = event.target.files && event.target.files[0];
    if (file) importFromExcel(file);
    event.target.value = ''; // so choosing the same file again still fires onChange
  }

  function handleExportPptx() {
    setIsExportingPptx(true);
    exportProjectToPptx(activeProject)
      .then(() => setStatusMessage(`Exported "${activeProject.name}" to PowerPoint.`))
      .catch((err) => setStatusMessage('Could not build the PowerPoint: ' + err.message))
      .finally(() => setIsExportingPptx(false));
  }

  // --- Screens that replace the whole app ---
  if (loadError) {
    return (
      <div className="centered error">
        Could not reach the server: {loadError}
        <br />
        Is the backend running? (see README — it should be on port 4000)
      </div>
    );
  }
  if (currentUser === undefined) {
    return <div className="centered">Loading…</div>;
  }
  if (currentUser === null) {
    return <Login onLoggedIn={handleLoggedIn} />;
  }
  if (!data) {
    return <div className="centered">Loading your roadmap…</div>;
  }

  const activeProject = data.projects.find((p) => p.id === data.activeId);
  const epicBeingEdited = activeProject.epics.find((e) => e.id === editingEpicId) || null;
  const milestoneBeingEdited = activeProject.milestones.find((m) => m.id === editingMilestoneId) || null;

  return (
    <div className="wrap">
      <header>
        <p className="eyebrow">Roadmap review</p>
        <h1>Plan vs. actual</h1>
        <p className="sub">Logged in as <b>{currentUser.username}</b>{currentUser.isAdmin ? ' (admin)' : ''} — this data is private to your account.</p>
      </header>

      <div className="tabs-row">
        {viewMode !== 'project' && (
          <button className="overview-toggle" onClick={() => setViewMode('project')}>← Back to project</button>
        )}
        {viewMode === 'project' && (
          <button className="overview-toggle" onClick={() => setViewMode('overview')}>📊 All my projects</button>
        )}
        {currentUser.isAdmin && viewMode !== 'admin' && (
          <button className="overview-toggle" onClick={() => setViewMode('admin')}>👑 Admin: everyone's projects</button>
        )}
        {viewMode === 'project' && (
          <ProjectTabs
            projects={data.projects}
            activeId={data.activeId}
            onSelect={selectProject}
            onRename={renameProject}
            onDelete={deleteProject}
            onAdd={addProject}
          />
        )}
        <button className="overview-toggle" style={{ marginLeft: 'auto' }} onClick={() => setShowChangePassword(true)}>Change password</button>
        <button className="overview-toggle" onClick={handleLogout}>Log out</button>
      </div>

      {showChangePassword && <ChangePasswordForm onClose={() => setShowChangePassword(false)} />}

      {viewMode === 'admin' && <AdminOverview />}

      {viewMode === 'overview' && <Overview projects={data.projects} onOpenProject={selectProject} />}

      {viewMode === 'project' && (
        <>
          <div className="card">
            <h2>{epicBeingEdited ? 'Edit epic' : 'Add an epic'}</h2>
            <EpicForm key={editingEpicId} initial={epicBeingEdited} onSave={saveEpic} onCancel={cancelEditEpic} />
          </div>

          <div className="card">
            <h2>Saved epics</h2>
            <EpicTable epics={activeProject.epics} onEdit={setEditingEpicId} onDelete={deleteEpic} />
          </div>

          <div className="card">
            <h2>{milestoneBeingEdited ? 'Edit milestone' : 'Milestones'}</h2>
            <MilestoneForm key={editingMilestoneId} initial={milestoneBeingEdited} onSave={saveMilestone} onCancel={cancelEditMilestone} />
            <MilestoneTable milestones={activeProject.milestones} onEdit={setEditingMilestoneId} onDelete={deleteMilestone} />
          </div>

          <div className="card">
            <h2>Timeline</h2>
            <Timeline epics={activeProject.epics} milestones={activeProject.milestones} />
          </div>

          <footer>
            <span>{statusMessage}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => exportProjectToExcel(activeProject)}>Export to Excel</button>
              <input
                type="file"
                accept=".xlsx"
                ref={importFileInputRef}
                style={{ display: 'none' }}
                onChange={handleImportFileChosen}
              />
              <button onClick={() => importFileInputRef.current.click()}>Import from Excel</button>
              <button onClick={handleExportPptx} disabled={isExportingPptx}>
                {isExportingPptx ? 'Building PowerPoint…' : 'Export to PowerPoint'}
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
