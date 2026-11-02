import React, { useState } from 'react';
import { login } from '../api.js';

// Shown instead of the whole app when nobody is logged in yet.
// onLoggedIn(user) is called once login succeeds, so App.jsx can switch
// over to showing the real app.
export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    login(username.trim(), password)
      .then(({ user }) => onLoggedIn(user))
      .catch((err) => setError(err.message))
      .finally(() => setIsSubmitting(false));
  }

  return (
    <div className="centered">
      <form onSubmit={handleSubmit} className="form login-form">
        <h1>Plan vs. actual</h1>
        <p className="sub">Log in to see your roadmap.</p>

        <div className="field">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
