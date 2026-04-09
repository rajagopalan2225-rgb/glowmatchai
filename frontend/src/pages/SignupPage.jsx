import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SignupPage = ({ onSwitchToLogin }) => {
  const { signup } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
    return { score, label: labels[score], color: colors[score] };
  };

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    const { data, error: signupError } = await signup({
      email: form.email,
      password: form.password,
      fullName: form.fullName
    });
    setLoading(false);

    if (signupError) {
      const errorMessage = typeof signupError === 'string' ? signupError : signupError.message;
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        setError('This email is already in use. Try logging in.');
      } else {
        setError(errorMessage || 'Registration failed. Please try again.');
      }
      return;
    }

    // Success! The AuthContext will automatically see the 'user' state change
    // and redirect via the main App.jsx logic.
  };

  if (success) {
    return (
      <div className="auth-page-container">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <motion.div
          className="auth-card auth-success-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle size={56} className="auth-success-icon" />
          </motion.div>
          <h2 className="auth-title">Check your email!</h2>
          <p className="auth-subtitle" style={{ textAlign: 'center', maxWidth: '300px' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--rose-gold)' }}>{form.email}</strong>. 
            Click the link to activate your account.
          </p>
          <button className="auth-btn" style={{ marginTop: '1.5rem' }} onClick={onSwitchToLogin}>
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo */}
        <div className="auth-logo">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="auth-logo-icon" />
          </motion.div>
          <span className="auth-logo-text">GlowMatchAI</span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start your personalized beauty journey</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Full Name */}
          <div className="auth-field">
            <label htmlFor="signup-name" className="auth-label">Full Name</label>
            <div className="auth-input-wrapper">
              <User className="auth-input-icon" />
              <input
                id="signup-name"
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Your name"
                className="auth-input"
                autoComplete="name"
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="signup-email" className="auth-label">Email</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" />
              <input
                id="signup-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="auth-input"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="signup-password" className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="auth-input"
                autoComplete="new-password"
                disabled={loading}
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Password strength bar */}
            {form.password && (
              <div className="auth-strength">
                <div className="auth-strength-bar">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="auth-strength-segment"
                      style={{ background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)' }}
                    />
                  ))}
                </div>
                <span className="auth-strength-label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-field">
            <label htmlFor="signup-confirm" className="auth-label">Confirm Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" />
              <input
                id="signup-confirm"
                type={showConfirm ? 'text' : 'password'}
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                placeholder="Repeat your password"
                className="auth-input"
                autoComplete="new-password"
                disabled={loading}
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.confirm && form.password !== form.confirm && (
              <p className="auth-mismatch">Passwords don't match</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            className="auth-btn"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="auth-spinner" />
                <span>Creating account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </motion.button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button
            id="switch-to-login"
            type="button"
            className="auth-switch-link"
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default SignupPage;
