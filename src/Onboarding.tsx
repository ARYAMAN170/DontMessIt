import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Onboarding({ session, onComplete }: { session: any, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // User Data State
  const [diet, setDiet] = useState('non-veg');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [weeks, setWeeks] = useState('12');

  const calculateAndSave = async () => {
    setLoading(true);
    const w = parseFloat(weight);
    const tw = parseFloat(targetWeight);
    const h = parseInt(height);
    const wk = parseInt(weeks);

    // Basic BMR calculation (Mifflin-St Jeor simplified for students)
    const bmr = (10 * w) + (6.25 * h) - (5 * 20) + 5; // Assuming avg age 20
    const tdee = bmr * 1.55; // Moderate activity (walking around campus + dumbbells)

    // Calculate Calorie Deficit/Surplus (1kg body weight = ~7700 kcal)
    const weightDifference = tw - w; 
    const totalCalsNeeded = weightDifference * 7700;
    const dailyCalorieOffset = totalCalsNeeded / (wk * 7);

    const dailyCalorieGoal = Math.round(tdee + dailyCalorieOffset);
    
    // Protein Logic: High protein for bulking/cutting
    const dailyProteinGoal = Math.round(w * 2.2); // 2.2g per kg of bodyweight

    // Save to Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        height_cm: h,
        weight_kg: w,
        target_weight_kg: tw,
        weeks_to_goal: wk,
        diet_preference: diet,
        daily_calorie_goal: dailyCalorieGoal,
        daily_protein_goal: dailyProteinGoal,
        is_onboarded: true
      })
      .eq('id', session.user.id);

    if (error) {
      console.error("Error saving profile:", error);
    } else {
      // Save locally for instant UI updates
      localStorage.setItem('dontmessit_protein', dailyProteinGoal.toString());
      localStorage.setItem('dontmessit_calories', dailyCalorieGoal.toString());
      onComplete(); // Trigger the dashboard to load
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0F172A] p-6 text-white overflow-hidden relative">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-900/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-900/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center relative z-10">
        
        {/* Progress System */}
        <div className="flex justify-between mb-8 items-end px-2">
           <h2 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
             STEP 0{step}
           </h2>
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
             Setup Phase
           </span>
        </div>

        {step === 1 && (
          <div className="glass-panel p-6 rounded-3xl animate-fade-in-up border border-white/5">
            <h1 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Nutrition Source</h1>
            <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">
              We'll auto-filter the mess menu to show only what you can eat.
            </p>
            
            <div className="space-y-3">
              {['veg', 'egg', 'non-veg'].map((type) => (
                <button
                  key={type}
                  onClick={() => setDiet(type)}
                  className={`w-full p-5 rounded-2xl border font-black text-left uppercase tracking-wider transition-all duration-300 relative overflow-hidden group ${
                    diet === type 
                    ? 'border-blue-500 bg-blue-600/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                    : 'border-slate-700 bg-slate-800/30 text-slate-500 hover:border-slate-500 hover:bg-slate-700/50'
                  }`}
                >
                  <span className="relative z-10 flex justify-between items-center">
                    {type === 'veg' ? '🥦 Pure Vegetarian' : type === 'egg' ? '🍳 Eggetarian' : '🍗 Non-Vegetarian'}
                    {diet === type && <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_currentColor]"></div>}
                  </span>
                </button>
              ))}
            </div>
            
            <button onClick={() => setStep(2)} className="w-full mt-10 bg-white text-slate-900 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all shadow-lg">
              Confirm & Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="glass-panel p-6 rounded-3xl animate-fade-in-up border border-white/5">
            <h1 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Physique Stats</h1>
            <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">
              Required to calculate your Basal Metabolic Rate (BMR).
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Height (cm)</label>
                <input 
                  type="number" 
                  value={height} 
                  onChange={(e) => setHeight(e.target.value)} 
                  placeholder="175" 
                  className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-black text-2xl text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Current Weight (kg)</label>
                <input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                  placeholder="65" 
                  className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-black text-2xl text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all" 
                />
              </div>
            </div>
            
            <div className="flex gap-4 mt-10">
              <button onClick={() => setStep(1)} className="px-6 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl hover:bg-slate-700 transition-all uppercase text-xs tracking-wider">Back</button>
              <button onClick={() => setStep(3)} disabled={!height || !weight} className="flex-1 bg-white text-slate-900 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="glass-panel p-6 rounded-3xl animate-fade-in-up border border-white/5">
            <h1 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">The Mission</h1>
            <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">
              Define your target. Be realistic.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Target Weight (kg)</label>
                <input 
                  type="number" 
                  value={targetWeight} 
                  onChange={(e) => setTargetWeight(e.target.value)} 
                  placeholder="75" 
                  className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-black text-2xl text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Timeframe (Weeks)</label>
                <input 
                  type="number" 
                  value={weeks} 
                  onChange={(e) => setWeeks(e.target.value)} 
                  placeholder="12" 
                  className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-black text-2xl text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all" 
                />
                <p className="text-[10px] font-bold text-slate-600 mt-2 ml-1">
                  RECOMMENDED: ~0.5kg change per week
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 mt-10">
              <button onClick={() => setStep(2)} className="px-6 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl hover:bg-slate-700 transition-all uppercase text-xs tracking-wider">Back</button>
              <button 
                onClick={calculateAndSave} 
                disabled={loading || !targetWeight || !weeks} 
                className="flex-1 bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(37,99,235,0.4)]"
              >
                {loading ? 'CALCULATING...' : 'INITIATE PLAN'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}