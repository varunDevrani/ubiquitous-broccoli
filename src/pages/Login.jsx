import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as api from "../api/client";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const { handleLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // For unverified / deactivated flows
  const [needsVerification, setNeedsVerification] = useState(false);
  const [deactivatedPrompt, setDeactivatedPrompt] = useState(false);
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setNeedsVerification(false);
    setDeactivatedPrompt(false);
    setLoading(true);
    try {
      await handleLogin(email, password);
      navigate("/account");
    } catch (err) {
      setPassword("");
      if (err.errorCode === "FORBIDDEN") {
        setNeedsVerification(true);
        setError(err.message);
      } else if (err.errorCode === "LOCKED" && err.recoverable) {
        setDeactivatedPrompt(true);
        setError(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setError("");
    setInfo("");
    try {
      const data = await api.resendVerification(email);
      setInfo(data.message);
      setNeedsVerification(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReactivate() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const data = await api.reactivate(email, password);
      setInfo(data.message + " You can now log in.");
      setDeactivatedPrompt(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back">
      <form onSubmit={handleSubmit}>
        <label>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={13}
        />

        {error && <p className="error-msg">{error}</p>}
        {info && <p className="info-msg">{info}</p>}

        {needsVerification && (
          <button type="button" className="btn-link" onClick={handleResendVerification}>
            Resend verification email
          </button>
        )}

        {deactivatedPrompt && (
          <>
            <label>Re-enter your password to reactivate</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={13}
            />
            <button type="button" className="btn-secondary" onClick={handleReactivate} disabled={loading || !password}>
              Reactivate my account
            </button>
          </>
        )}

        {!deactivatedPrompt && (
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        )}
      </form>

      <div className="auth-footer">
        <Link to="/forgot-password">Forgot password?</Link>
        <span className="separator" />
        <Link to="/signup">Create an account</Link>
      </div>
    </AuthLayout>
  );
}
