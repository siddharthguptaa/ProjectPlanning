import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminOverview, fetchUserList, createUserAccount, deleteUserAccount, resetUserPassword } from '../api.js';
import Overview from './Overview.jsx';
import EpicTable from './EpicTable.jsx';
import MilestoneTable from './MilestoneTable.jsx';
import Timeline from './Timeline.jsx';

// The whole admin screen: a "create/remove user" panel at the top, then
// one section per user showing their projects — reusing the exact same
// <Overview> component regular users see for their own projects, just
// fed a different user's data each time.
export default function AdminOverview() {
  const [usersWithProjects, setUsersWithProjects] = useState(null);
  const [userList, setUserList] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  // Which other user's project (if any) the admin is currently looking
  // at in read-only detail. null = showing the normal list of everyone.
  const [viewingProject, setViewingProject] = useState(null); // { username, project } | null

  const reload = useCallback(() => {
    fetchAdminOverview().then((res) => setUsersWithProjects(res.users)).catch((err) => setErrorMessage(err.message));
    fetchUserList().then((res) => setUserList(res.users)).catch((err) => setErrorMessage(err.message));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function handleCreateUser(username, password, isAdmin) {
    createUserAccount(username, password, isAdmin)
      .then(() => { setErrorMessage(''); reload(); })
      .catch((err) => setErrorMessage(err.message));
  }

  function handleResetPassword(userId, username) {
    const newPassword = prompt(`New password for "${username}":`);
    if (!newPassword) return;
    resetUserPassword(userId, newPassword)
      .then(() => { setErrorMessage(''); alert(`Password for "${username}" has been reset.`); })
      .catch((err) => setErrorMessage(err.message));
  }

  function handleDeleteUser(userId, username) {
    const confirmed = confirm(`Remove "${username}"? They won't be able to log in anymore. Their data file stays on disk, in case you want it back.`);
    if (!confirmed) return;
    deleteUserAccount(userId)
      .then(() => { setErrorMessage(''); reload(); })
      .catch((err) => setErrorMessage(err.message));
  }

  // Looking at one specific user's project in read-only detail — same
  // layout as the normal project view, just with no edit/delete controls
  // and no form to add things, since this is someone else's data.
  if (viewingProject) {
    const { username, project } = viewingProject;
    return (
      <div>
        <button className="overview-toggle" onClick={() => setViewingProject(null)} style={{ marginBottom: 16 }}>
          ← Back to admin overview
        </button>

        <div className="card">
          <h2>{project.name}</h2>
          <p className="sub">Viewing as admin — read only. Belongs to <b>{username}</b>.</p>
        </div>

        <div className="card">
          <h2>Epics</h2>
          <EpicTable epics={project.epics} readOnly />
        </div>

        <div className="card">
          <h2>Milestones</h2>
          <MilestoneTable milestones={project.milestones} readOnly />
        </div>

        <div className="card">
          <h2>Timeline</h2>
          <Timeline epics={project.epics} milestones={project.milestones} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>Manage users</h2>
        {errorMessage && <p className="form-error">{errorMessage}</p>}
        <UserList users={userList} onDelete={handleDeleteUser} onResetPassword={handleResetPassword} />
        <AddUserForm onCreate={handleCreateUser} />
      </div>

      {!usersWithProjects && <p className="empty">Loading everyone's projects…</p>}

      {usersWithProjects && usersWithProjects.map((user) => (
        <div className="card" key={user.id}>
          <h2>
            {user.username}
            {user.isAdmin && <span className="unplanned-tag"> (admin)</span>}
            {' — '}{user.projects.length} project{user.projects.length === 1 ? '' : 's'}
          </h2>
          {user.projects.length === 0 ? (
            <p className="empty">This user hasn't created any projects yet.</p>
          ) : (
            <Overview
              projects={user.projects}
              onOpenProject={(projectId) => {
                const project = user.projects.find((p) => p.id === projectId);
                if (project) setViewingProject({ username: user.username, project });
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function UserList({ users, onDelete, onResetPassword }) {
  if (!users) return <p className="empty">Loading users…</p>;

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr><th>Username</th><th>Role</th><th /></tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="name-cell">{user.username}</td>
              <td>{user.isAdmin ? 'Admin' : 'User'}</td>
              <td>
                <div className="row-actions">
                  <button onClick={() => onResetPassword(user.id, user.username)}>Reset password</button>
                  <button className="danger" onClick={() => onDelete(user.id, user.username)}>Remove</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddUserForm({ onCreate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    onCreate(username.trim(), password, isAdmin);
    setUsername('');
    setPassword('');
    setIsAdmin(false);
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: 16 }}>
      <div className="field">
        <label>New username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="field">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="field">
        <label>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} /> Admin
        </label>
      </div>
      <div className="field">
        <label>&nbsp;</label>
        <button type="submit" className="btn-primary">Add user</button>
      </div>
    </form>
  );
}
