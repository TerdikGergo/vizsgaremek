"use client";

import React, { useState } from "react";

const AUTH_SESSION_KEY = "auth-session-email";
const AUTH_USERS_KEY = "auth-users-v1";
const DISPLAY_NAME_KEY = "profile-display-name";

type StoredUser = {
  email: string;
  password: string;
};

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function isStrongPassword(password: string) {
  const hasMinLength = password.length >= 12;
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasMinLength && hasSpecial;
}

export default function Registration({ onAuthSuccess }: { onAuthSuccess: (email: string) => void }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const title = mode === "register" ? "Register" : "Login";
  const submitLabel = mode === "register" ? "Registration" : "Login";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();

    if (!nextEmail || !nextEmail.includes("@")) {
      setMessage("Please enter a valid email.");
      return;
    }

    if (!isStrongPassword(password)) {
      setMessage("Password must be at least 12 characters and contain a special symbol.");
      return;
    }

    const users = readUsers();

    if (mode === "register") {
      const exists = users.some((u) => u.email === nextEmail);
      if (exists) {
        setMessage("This email is already registered. Please login.");
        return;
      }

      writeUsers([...users, { email: nextEmail, password }]);
    } else {
      const found = users.find((u) => u.email === nextEmail && u.password === password);
      if (!found) {
        setMessage("Wrong email or password.");
        return;
      }
    }

    localStorage.setItem(AUTH_SESSION_KEY, nextEmail);
    const defaultName = nextEmail.split("@")[0] || "displayname";
    if (!localStorage.getItem(DISPLAY_NAME_KEY)) {
      localStorage.setItem(DISPLAY_NAME_KEY, defaultName);
    }

    setMessage("");
    onAuthSuccess(nextEmail);
  };

  return (
    <div className="registration-root">
      <div className="registration-card">
        <h1 className="registration-title">{title}</h1>

        <form className="registration-form" onSubmit={handleSubmit}>
          <label className="registration-label">
            Email
            <input
              className="registration-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="registration-label">
            Password
            <input
              className="registration-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 12 chars + special symbol"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </label>

          <p className="registration-hint">Minimum 12 characters and at least one special symbol.</p>

          {message && <p className="registration-message">{message}</p>}

          <button className="registration-button" type="submit">
            {submitLabel}
          </button>
        </form>

        <button
          className="registration-switch"
          type="button"
          onClick={() => {
            setMode((prev) => (prev === "register" ? "login" : "register"));
            setMessage("");
          }}
        >
          {mode === "register" ? "Already have account? Login" : "No account yet? Register"}
        </button>
      </div>
    </div>
  );
}
