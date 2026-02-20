import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Onboarding({ session, onComplete }: { session: any, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // User Data State
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<number>(1.2);
  const [goal, setGoal] = useState<'loss' | 'gain'>('gain');

  const calculateAndSave = async () => {
    setLoading(true);
    const w = parseFloat(weight);
    const h = parseInt(height);
    const a = parseInt(age);

    // Step 1: BMR (Mifflin-St Jeor)
    // Men: (10 × weight) + (6.25 × height) - (5 × age) + 5
    // Women: (10 × weight) + (6.25 × height) - (5 × age) - 161
    const s = gender === 'male' ? 5 : -161;
    const bmr = (10 * w) + (6.25 * h) - (5 * a) + s;

    // Step 2: TDEE
    const tdee = bmr * activityLevel;

    // Step 3: Goal Modifier
    // Fat Loss: -400 (Avg of 300-500)
    // Muscle Gain: +300 (Avg of 200-400)
    const surplusDeficit = goal === 'gain' ? 300 : -400;
    const dailyCalorieGoal = Math.round(tdee + surplusDeficit);

    // Step 4: Macronutrient Division
    // Protein: 1.8g to 2.2g per kg (Using 2.0g as standard)
    // Capped for safety/absorption typically, but prompt implies specific calculation.
    // "For 57 kg, this is strictly capped around 120g to 130g" -> ~2.1-2.2g/kg.
    // Let's use 2.2g/kg as the upper bound for "Builder".
    const dailyProteinGoal = Math.round(w * 2.2); 

    // Save to Supabase
    // Note: We are not asking for target weight or weeks anymore based on the new flow request, 
    // but the DB might expect them. We'll send current weight as target or null if allowed.
    // We'll keep 'diet_preference' as 'non-veg' default since we removed the question.
    const { error } = await supabase
      .from('profiles')
      .update({
        height_cm: h,
        weight_kg: w,
        target_weight_kg: goal === 'gain' ? w + 5 : w - 5, // Dummy target for now
        weeks_to_goal: 12, // Default
        diet_preference: 'non-veg', // Default
        daily_calorie_goal: dailyCalorieGoal,
        daily_protein_goal: dailyProteinGoal,
        is_onboarded: true
      })
      .eq('id', session.user.id);

    if (error) {
      console.error("Error saving profile:", error);
    } else {
      localStorage.setItem('dontmessit_protein', dailyProteinGoal.toString());
      localStorage.setItem('dontmessit_calories', dailyCalorieGoal.toString());
      localStorage.setItem('dontmessit_goal', goal === 'gain' ? 'gain_weight' : 'lose_weight');
      onComplete(); 
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
            <h1 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Physique Stats</h1>
            <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">
              Step 1: Calculating Engine Idle Speed (BMR).
            </p>
            
            <div className="space-y-4">
              {/* Gender */}
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700">
                 <button 
                  onClick={() => setGender('male')}
                  className={`flex-1 py-3 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${gender === 'male' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                 >
                   Male
                 </button>
                 <button 
                  onClick={() => setGender('female')}
                  className={`flex-1 py-3 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${gender === 'female' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                 >
                   Female
                 </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Age</label>
                    <input 
                      type="number" 
                      value={age} 
                      onChange={(e) => setAge(e.target.value)} 
                      placeholder="22" 
                      className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-black text-xl text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all" 
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Height (cm)</label>
                    <input 
                      type="number" 
                      value={height} 
                      onChange={(e) => setHeight(e.target.value)} 
                      placeholder="178" 
                      className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-black text-xl text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all" 
                    />
                 </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-2 block">Current Weight (kg)</label>
                <input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)} 
                  placeholder="57" 
                  className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-xl font-black text-2xl text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all" 
                />
              </div>
            </div>
            
            <button 
              onClick={() => setStep(2)} 
              disabled={!age || !height || !weight}
              className="w-full mt-8 bg-white text-slate-900 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:grayscale"
            >
              Next: Activity
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="glass-panel p-6 rounded-3xl animate-fade-in-up border border-white/5">
            <h1 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Activity Level</h1>
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              Step 2: The Activity Multiplier (TDEE). Be honest.
            </p>
            
            <div className="space-y-3">
               {[
                 { val: 1.2, label: 'Sedentary', sub: 'Desk job, zero exercise' },
                 { val: 1.375, label: 'Lightly Active', sub: 'Light exercise 1-3 days/week' },
                 { val: 1.55, label: 'Moderately Active', sub: 'Hard training 3-5 days/week' },
                 { val: 1.725, label: 'Highly Active', sub: '6-day Split + Interaction' }
               ].map((opt) => (
                 <button
                   key={opt.val}
                   onClick={() => setActivityLevel(opt.val)}
                   className={`w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                     activityLevel === opt.val 
                     ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                     : 'bg-slate-900/40 border-slate-700 hover:bg-slate-800'
                   }`}
                 >
                    <div className="flex justify-between items-center relative z-10">
                       <div>
                          <p className={`text-sm font-black uppercase tracking-wide ${activityLevel === opt.val ? 'text-white' : 'text-slate-400'}`}>{opt.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{opt.sub}</p>
                       </div>
                       {activityLevel === opt.val && <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_10px_currentColor]"></div>}
                    </div>
                 </button>
               ))}
            </div>
            
            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(1)} className="px-6 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl hover:bg-slate-700 transition-all uppercase text-xs tracking-wider">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-white text-slate-900 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all">
                Next: Goal
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="glass-panel p-6 rounded-3xl animate-fade-in-up border border-white/5">
            <h1 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">The Mission</h1>
            <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">
              Step 3: The Goal Modifier. This adjusts your TDEE.
            </p>
            
            <div className="grid grid-cols-1 gap-4">
               <button
                  onClick={() => setGoal('gain')}
                  className={`p-6 rounded-2xl border transition-all text-center relative overflow-hidden group ${
                    goal === 'gain' 
                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.25)]' 
                    : 'bg-slate-900/40 border-slate-700 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                  }`}
               >
                  <h3 className={`text-lg font-black uppercase tracking-tighter mb-1 ${goal === 'gain' ? 'text-blue-400' : 'text-slate-300'}`}>Lean Muscle Gain</h3>
                  <p className="text-[10px] text-slate-400 font-medium">+300 kcal Surplus</p>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
               </button>

               <button
                  onClick={() => setGoal('loss')}
                  className={`p-6 rounded-2xl border transition-all text-center relative overflow-hidden group ${
                    goal === 'loss' 
                    ? 'bg-orange-600/20 border-orange-500 shadow-[0_0_30px_rgba(234,88,12,0.25)]' 
                    : 'bg-slate-900/40 border-slate-700 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                  }`}
               >
                  <h3 className={`text-lg font-black uppercase tracking-tighter mb-1 ${goal === 'loss' ? 'text-orange-400' : 'text-slate-300'}`}>Fat Loss</h3>
                  <p className="text-[10px] text-slate-400 font-medium">-400 kcal Deficit</p>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
               </button>
            </div>
            
            <div className="flex gap-4 mt-10">
              <button onClick={() => setStep(2)} className="px-6 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl hover:bg-slate-700 transition-all uppercase text-xs tracking-wider">Back</button>
              <button 
                onClick={calculateAndSave} 
                disabled={loading} 
                className="flex-1 bg-white text-slate-900 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'CALCULATING...' : 'INITIATE PROTOCOL'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}