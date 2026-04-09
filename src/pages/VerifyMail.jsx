import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as api from "../api/client";
import AuthLayout from "../components/AuthLayout";

export default function VerifyMail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [resendInfo, setResendInfo] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is invalid or malformed.");
      return;
    }

    api.verifyMail(token)
      .then((data) => {
        setStatus("success");
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.message);
      });
  }, [token]);

  async function handleResend(e) {
    e.preventDefault();
    setResendInfo("");
    try {
      const data = await api.resendVerification(email);
      setResendInfo(data.message);
    } catch (err) {
      setResendInfo(err.message);
    }
  }

  if (status === "loading") {
    return (
      <AuthLayout title="Verifying your email">
        <p className="subtitle">Please wait...</p>
      </AuthLayout>
    );
  }

  if (status === "success") {
    return (
      <AuthLayout title="Email verified">
        <p className="info-msg">{message}</p>
        <div className="auth-footer">
          <Link to="/login">Sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verification failed">
      <p className="error-msg">{message}</p>

      <div className="resend-section">
        <p className="subtitle">Need a new verification email?</p>
        <form onSubmit={handleResend}>
          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {resendInfo && <p className="info-msg">{resendInfo}</p>}
          <button type="submit" className="btn-primary">
            Resend verification email
          </button>
        </form>
      </div>

      <div className="auth-footer">
        <Link to="/login">Back to sign in</Link>
      </div>
    </AuthLayout>
  );
}
