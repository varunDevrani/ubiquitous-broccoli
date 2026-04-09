import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/client";
import ConfirmModal from "../components/ConfirmModal";

const KNOWN_CLIENTS = [
  [/PostmanRuntime/i, "Postman"],
  [/insomnia/i, "Insomnia"],
  [/HTTPie/i, "HTTPie"],
  [/curl/i, "curl"],
  [/python-requests/i, "Python Requests"],
  [/axios/i, "Axios"],
  [/node-fetch/i, "Node Fetch"],
  [/Go-http-client/i, "Go HTTP"],
  [/Thunder Client/i, "Thunder Client"],
];

function parseUserAgent(ua) {
  if (!ua) return "Unknown device";

  for (const [pattern, label] of KNOWN_CLIENTS) {
    if (pattern.test(ua)) return label;
  }

  let browser = "Unknown";
  let os = "Unknown";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("CrOS")) os = "ChromeOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  if (browser === "Unknown" && os === "Unknown") {
    return ua.split("/")[0].slice(0, 30) || "Unknown device";
  }

  return `${browser} (${os})`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Account() {
  const { handleLogout, handleLogoutAll, clearTokens } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState("");

  // Change password
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");
  const [cpLoading, setCpLoading] = useState(false);

  // Deactivate
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateError, setDeactivateError] = useState("");
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Confirm modal state
  const [confirm, setConfirm] = useState(null);
  // { title, message, confirmLabel, danger, onConfirm }

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const data = await api.getSessions();
      setSessions(data.data.sessions);
    } catch (err) {
      setSessionsError(err.message);
    } finally {
      setSessionsLoading(false);
    }
  }

  function confirmAction({ title, message, confirmLabel, danger = false, onConfirm }) {
    setConfirm({ title, message, confirmLabel, danger, onConfirm });
  }

  function askLogout() {
    confirmAction({
      title: "Log out",
      message: "Are you sure you want to log out of this device?",
      confirmLabel: "Log out",
      onConfirm: async () => {
        setConfirm(null);
        await handleLogout();
      },
    });
  }

  function askLogoutAll() {
    confirmAction({
      title: "Log out of all devices",
      message: "This will end all your active sessions, including this one. You will need to sign in again on every device.",
      confirmLabel: "Log out all",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        await handleLogoutAll();
      },
    });
  }

  function askRevokeSession(session) {
    if (session.current) {
      // Terminating current session = logging out
      confirmAction({
        title: "End current session",
        message: "This is your current session. Ending it will log you out immediately.",
        confirmLabel: "Log out",
        danger: true,
        onConfirm: async () => {
          setConfirm(null);
          try {
            await api.revokeSession(session.family_id);
          } catch {
            // still clear locally
          }
          clearTokens();
        },
      });
    } else {
      confirmAction({
        title: "End session",
        message: `End the session on ${parseUserAgent(session.user_agent)}${session.location ? ` in ${session.location}` : ""}?`,
        confirmLabel: "End session",
        danger: true,
        onConfirm: async () => {
          setConfirm(null);
          try {
            await api.revokeSession(session.family_id);
            setSessions((prev) => prev.filter((s) => s.family_id !== session.family_id));
          } catch (err) {
            setSessionsError(err.message);
          }
        },
      });
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setCpError("");
    setCpSuccess("");
    if (newPassword !== confirmNewPassword) {
      setCpError("Passwords do not match.");
      return;
    }
    setCpLoading(true);
    try {
      const data = await api.changePassword(oldPassword, newPassword, confirmNewPassword);
      setCpSuccess(data.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setCpError(err.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } finally {
      setCpLoading(false);
    }
  }

  function askDeactivate(e) {
    e.preventDefault();
    setDeactivateError("");
    if (!deactivatePassword) {
      setDeactivateError("Password is required.");
      return;
    }
    confirmAction({
      title: "Deactivate account",
      message: "Are you sure? Your account will be deactivated and all sessions will be revoked. You can reactivate by signing in again.",
      confirmLabel: "Deactivate",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        setDeactivateLoading(true);
        try {
          await api.deactivateAccount(deactivatePassword);
          clearTokens();
        } catch (err) {
          setDeactivateError(err.message);
          setDeactivatePassword("");
        } finally {
          setDeactivateLoading(false);
        }
      },
    });
  }

  return (
    <div className="account-layout">
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <header className="account-header">
        <h1>Account</h1>
        <button className="btn-secondary" onClick={askLogout}>
          Log out
        </button>
      </header>

      <div className="account-content">
        {/* Log out all devices */}
        <section className="account-section">
          <div className="section-row">
            <div>
              <h3>Log out of all devices</h3>
              <p className="section-desc">
                This will revoke all active sessions and sign you out everywhere.
              </p>
            </div>
            <button className="btn-outlined" onClick={askLogoutAll}>
              Log out all
            </button>
          </div>
        </section>

        {/* Change password */}
        <section className="account-section">
          <div className="section-row">
            <div>
              <h3>Change password</h3>
              <p className="section-desc">Update your account password.</p>
            </div>
            {!showChangePassword && (
              <button className="btn-outlined" onClick={() => setShowChangePassword(true)}>
                Change
              </button>
            )}
          </div>
          {showChangePassword && (
            <form className="inline-form" onSubmit={handleChangePassword}>
              <label>Current password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                minLength={8}
                maxLength={13}
              />
              <label>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                maxLength={13}
              />
              <label>Confirm new password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={8}
                maxLength={13}
              />
              {cpError && <p className="error-msg">{cpError}</p>}
              {cpSuccess && <p className="info-msg">{cpSuccess}</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowChangePassword(false); setCpError(""); setCpSuccess(""); setOldPassword(""); setNewPassword(""); setConfirmNewPassword(""); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={cpLoading}>
                  {cpLoading ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Deactivate account */}
        <section className="account-section danger-section">
          <div className="section-row">
            <div>
              <h3>Deactivate account</h3>
              <p className="section-desc">
                Your account will be deactivated. You can reactivate it by signing in again.
              </p>
            </div>
            {!showDeactivate && (
              <button className="btn-danger" onClick={() => setShowDeactivate(true)}>
                Deactivate
              </button>
            )}
          </div>
          {showDeactivate && (
            <form className="inline-form" onSubmit={askDeactivate}>
              <label>Confirm your password</label>
              <input
                type="password"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                required
                minLength={8}
                maxLength={13}
              />
              {deactivateError && <p className="error-msg">{deactivateError}</p>}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowDeactivate(false); setDeactivateError(""); setDeactivatePassword(""); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-danger" disabled={deactivateLoading}>
                  {deactivateLoading ? "Deactivating..." : "Deactivate account"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Active sessions */}
        <section className="account-section">
          <h3>Active sessions</h3>
          {sessionsLoading && <p className="section-desc">Loading sessions...</p>}
          {sessionsError && <p className="error-msg">{sessionsError}</p>}
          {!sessionsLoading && sessions.length === 0 && !sessionsError && (
            <p className="section-desc">No active sessions found.</p>
          )}
          {sessions.length > 0 && (
            <div className="sessions-list">
              {sessions.map((session) => (
                <div className={`session-card${session.current ? " session-current" : ""}`} key={session.family_id}>
                  <div className="session-info">
                    <div className="session-primary">
                      <span className="session-device">{parseUserAgent(session.user_agent)}</span>
                      {session.current && <span className="badge-current">This device</span>}
                    </div>
                    <div className="session-secondary">
                      {session.location && <span>{session.location}</span>}
                      {session.location && <span className="dot" />}
                      <span>{formatDate(session.created_at)}</span>
                    </div>
                  </div>
                  <button
                    className="btn-icon"
                    title={session.current ? "Log out (current session)" : "End session"}
                    onClick={() => askRevokeSession(session)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
