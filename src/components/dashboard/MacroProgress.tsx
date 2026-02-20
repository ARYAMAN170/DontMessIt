interface MacroProgressProps {
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  consumed: { calories: number; protein: number };
}

export default function MacroProgress({ dailyCalorieGoal, dailyProteinGoal, consumed }: MacroProgressProps) {
  
  // --- RING CHART CALCULATIONS ---
  const leftCalories = Math.max(0, dailyCalorieGoal - consumed.calories);
  const leftProtein = Math.max(0, dailyProteinGoal - consumed.protein);

  // SVG Math for the rings
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate percentage remaining
  const calPercent = Math.max((leftCalories / dailyCalorieGoal) * 100, 0);
  const proPercent = Math.max((leftProtein / dailyProteinGoal) * 100, 0);
  
  const calOffset = circumference - (calPercent / 100) * circumference;
  const proOffset = circumference - (proPercent / 100) * circumference;

  return (
    <div className="flex items-center justify-around w-full p-5 mb-6 shadow-2xl bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/5">
      
      {/* Calories Left Ring */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex items-center justify-center w-20 h-20">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
            {/* Background Track */}
            <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
            {/* Draining Ring */}
            <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={calOffset} 
              strokeLinecap="round"
              className="text-orange-500 transition-all duration-1000 ease-out" 
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center mt-1">
            <span className="text-xl font-black text-white leading-none tracking-tighter">{Math.round(leftCalories)}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">LEFT</span>
          </div>
        </div>
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Calories</span>
      </div>

      <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

      {/* Protein Left Ring */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex items-center justify-center w-20 h-20">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
            {/* Background Track */}
            <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
            {/* Draining Ring */}
            <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={proOffset} 
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out text-blue-500" 
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center mt-1">
            <span className="text-xl font-black text-white leading-none tracking-tighter">{Math.round(leftProtein)}g</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">LEFT</span>
          </div>
        </div>
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Protein</span>
      </div>

    </div>
  );
}
