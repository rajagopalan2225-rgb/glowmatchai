import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle, LogOut, User } from 'lucide-react';

// Auth
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Components
import StepperAnalysis from './components/StepperAnalysis';

const App = () => {
  const { user, loading, logout, getUserDisplayName } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Show full-screen loader while session is loading
  if (loading) {
    return (
      <div className="auth-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        >
          <Sparkle size={36} style={{ color: 'var(--rose-gold)' }} />
        </motion.div>
      </div>
    );
  }

  // Show auth pages if not logged in
  if (!user) {
    return (
      <AnimatePresence mode="wait">
        {authView === 'login' ? (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginPage onSwitchToSignup={() => setAuthView('signup')} />
          </motion.div>
        ) : (
          <motion.div key="signup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SignupPage onSwitchToLogin={() => setAuthView('login')} />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Main app — authenticated
  return (
    <div className="w-full min-h-screen">
      {/* User badge (Absolute overlay) */}
      <div className="fixed top-6 right-6 z-50">
        <motion.button
          id="user-menu-btn"
          className="user-badge !bg-white/80 backdrop-blur-md !border-rose-gold/20 hover:!bg-white shadow-sm"
          onClick={() => setShowUserMenu(p => !p)}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="user-avatar !bg-rose-gold !text-white">
            <User size={16} />
          </div>
          <span className="user-name !text-dark-luxe font-medium">{getUserDisplayName() || 'Demo User'}</span>
        </motion.button>

        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              className="user-menu !bg-white !border-rose-gold/20 !shadow-2xl absolute right-0 mt-3"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="user-menu-email !text-mauve/60">{user?.email || 'demo@beauty.ai'}</div>
              <button
                id="logout-btn"
                className="user-menu-logout hover:!bg-rose-gold/5"
                onClick={() => { setShowUserMenu(false); logout(); }}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main className="w-full">
        <StepperAnalysis />
      </main>
    </div>
  );
};

export default App;
