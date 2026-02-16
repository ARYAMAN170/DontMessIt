import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const finalEmail = emailInput.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithOtp({
      email: finalEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage('✅ Access Link Sent! Check your Outlook.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden bg-[#0F172A] p-4 text-white">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="glass-panel p-8 rounded-3xl max-w-sm w-full border border-white/10 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black italic tracking-tighter mb-2 bg-gradient-to-r from-blue-400 to-white bg-clip-text text-transparent transform -skew-x-12">
            DONTMESSIT
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            Campus Performance Nutrition
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Student Email Only (VIT)</label>
            <div className="relative group">
              <input
                type="email"
                placeholder="firstname.lastname202x@vitstudent.ac.in"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-bold text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black uppercase tracking-wider py-4 rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? 'Authenticating...' : 'lOGIN'}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl text-center text-sm font-bold text-slate-300 border border-slate-700 animate-fade-in-up">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}