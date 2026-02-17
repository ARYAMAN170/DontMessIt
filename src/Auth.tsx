import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Automatically redirects them back to localhost or your Vercel URL
        redirectTo: window.location.origin, 
        queryParams: {
          // The bouncer: Forces Google to only accept VIT student emails
          hd: 'vitstudent.ac.in',
          prompt: 'select_account' 
        }
      }
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
      setLoading(false);
    }
    // No need to set loading to false on success, as the page will redirect to Google!
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden bg-[#0F172A] p-4 text-white">
      {/* Premium Background Mesh Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="glass-panel p-6 sm:p-8 rounded-3xl max-w-[320px] sm:max-w-sm w-full border border-white/10 relative z-10 backdrop-blur-xl bg-black/40 shadow-2xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter mb-2 bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent transform -skew-x-12 break-words leading-tight">
            DONTMESSIT
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
            Campus Performance Nutrition
          </p>
        </div>

        <div className="space-y-6 animate-fade-in-up">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-lg font-bold text-white tracking-wide">Student Login</h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Use your official VIT workspace account to sync your campus mess menu.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-slate-900 font-black uppercase tracking-wider py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                CONNECTING...
              </div>
            ) : (
              <>
                {/* Official Google "G" Logo */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with VIT Gmail
              </>
            )}
          </button>
        </div>

        {message && (
          <div className="mt-6 p-4 bg-red-900/30 rounded-xl text-center text-sm font-bold text-red-400 border border-red-900/50">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}