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
    <div className="flex flex-col min-h-screen bg-gray-50 p-6 font-sans">
      <div className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center">
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        {step === 1 && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">How do you eat?</h1>
            <p className="text-gray-500 mb-8">We'll filter the mess menu based on this.</p>
            
            <div className="space-y-3">
              {['veg', 'egg', 'non-veg'].map((type) => (
                <button
                  key={type}
                  onClick={() => setDiet(type)}
                  className={`w-full p-4 rounded-2xl border-2 font-bold text-left capitalize transition-all ${
                    diet === type ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {type === 'veg' ? '🥦 Pure Vegetarian' : type === 'egg' ? '🍳 Eggetarian' : '🍗 Non-Vegetarian'}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full mt-10 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black active:scale-95 transition-all">Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Your Current Stats</h1>
            <p className="text-gray-500 mb-8">Used to calculate your basal metabolic rate.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Height (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Current Weight (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 65" className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            
            <div className="flex gap-3 mt-10">
              <button onClick={() => setStep(1)} className="px-6 bg-gray-200 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-300 transition-all">Back</button>
              <button onClick={() => setStep(3)} disabled={!height || !weight} className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black active:scale-95 transition-all disabled:opacity-50">Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">The Goal</h1>
            <p className="text-gray-500 mb-8">How much are we trying to change?</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Target Weight (kg)</label>
                <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="e.g. 75" className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Timeline (Weeks)</label>
                <input type="number" value={weeks} onChange={(e) => setWeeks(e.target.value)} placeholder="e.g. 12" className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-xs text-gray-400 mt-2">Safe weight change is ~0.5kg per week.</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-10">
              <button onClick={() => setStep(2)} className="px-6 bg-gray-200 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-300 transition-all">Back</button>
              <button onClick={calculateAndSave} disabled={loading || !targetWeight || !weeks} className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
                {loading ? 'Crunching Macros...' : 'Generate Meal Plan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}