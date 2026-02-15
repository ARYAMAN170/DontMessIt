import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [regNumber, setRegNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Format the email automatically
    const vitEmail = `${regNumber.trim().toLowerCase()}@vitstudent.ac.in`;

    const { error } = await supabase.auth.signInWithOtp({
      email: vitEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage('✅ Magic link sent! Check your VIT Outlook inbox.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border-t-4 border-blue-600">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">UnMess</h1>
          <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">Campus Exclusive</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">VIT Registration Number / Name</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
              <input
                type="text"
                placeholder="firstname.lastname202x"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                className="w-full p-3 bg-transparent text-gray-900 font-medium outline-none"
                required
              />
              <span className="pr-3 text-sm font-bold text-gray-400 select-none">
                @vitstudent.ac.in
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? 'Sending link...' : 'Send Magic Link'}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center text-sm font-semibold text-gray-800 border border-gray-100">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}