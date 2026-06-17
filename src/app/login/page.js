"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckSquare, AlertTriangle, Clock, Mail, Lock, UserPlus, LogIn } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState("signin"); // "signin" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // If user is already logged in, redirect them to home/dashboard
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkUser();
  }, [router, supabase]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (signUpError) throw signUpError;

      // Note: Depending on Supabase configuration, they might need to confirm email.
      if (data?.user && data.session === null) {
        setMessage("Success! Please check your email inbox to verify your account registration.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(err.message || "Failed to register account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
      <div className="brand" style={{ marginBottom: '2rem', fontSize: '2rem' }}>
        <CheckSquare className="brand-icon" size={32} />
        <span>MEGA Task Sync</span>
      </div>

      <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
          <button
            onClick={() => { setActiveTab("signin"); setError(""); setMessage(""); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === "signin" ? "2px solid var(--color-primary)" : "none",
              color: activeTab === "signin" ? "var(--text-primary)" : "var(--text-muted)",
              padding: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'var(--transition-fast)'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab("signup"); setError(""); setMessage(""); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === "signup" ? "2px solid var(--color-primary)" : "none",
              color: activeTab === "signup" ? "var(--text-primary)" : "var(--text-muted)",
              padding: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'var(--transition-fast)'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form rendering */}
        {activeTab === "signin" ? (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email Address</label>
              <div className="url-input-wrapper">
                <input
                  type="email"
                  required
                  className="text-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.75rem' }}
                />
                <Mail className="url-icon" size={16} style={{ left: '1rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Password</label>
              <div className="url-input-wrapper">
                <input
                  type="password"
                  required
                  className="text-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.75rem' }}
                />
                <Lock className="url-icon" size={16} style={{ left: '1rem' }} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? (
                <>
                  <Clock className="spinner" size={16} />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Log In</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Email Address</label>
              <div className="url-input-wrapper">
                <input
                  type="email"
                  required
                  className="text-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.75rem' }}
                />
                <Mail className="url-icon" size={16} style={{ left: '1rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Password</label>
              <div className="url-input-wrapper">
                <input
                  type="password"
                  required
                  className="text-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.75rem' }}
                />
                <Lock className="url-icon" size={16} style={{ left: '1rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Confirm Password</label>
              <div className="url-input-wrapper">
                <input
                  type="password"
                  required
                  className="text-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.75rem' }}
                />
                <Lock className="url-icon" size={16} style={{ left: '1rem' }} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? (
                <>
                  <Clock className="spinner" size={16} />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Register Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Display feedback */}
        {error && (
          <div className="error-message" style={{ marginTop: '1.25rem' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div style={{
            marginTop: '1.25rem',
            color: 'var(--color-success)',
            fontSize: '0.875rem',
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
