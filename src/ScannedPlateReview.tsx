import { useState, useEffect } from 'react';

// Targets optimized for a lean bulk
const DAILY_CALORIES = 2600;
const DAILY_PROTEIN = 130;

interface LoggedItem {
  item: string;
  servings: number;
}

interface ScannedPlateReviewProps {
  scannedItems: LoggedItem[];
  foodDictionary: any[]; // Pass your Supabase dictionary here
  onConfirm: (finalItems: LoggedItem[]) => void;
  onCancel: () => void;
}

export default function ScannedPlateReview({ scannedItems, foodDictionary, onConfirm, onCancel }: ScannedPlateReviewProps) {
  const [items, setItems] = useState<LoggedItem[]>(scannedItems);
  const [currentMacros, setCurrentMacros] = useState({ calories: 0, protein: 0 });

  // Calculate live macros whenever the user edits the list
  useEffect(() => {
    let totalCals = 0;
    let totalPro = 0;
    
    items.forEach(log => {
      const dbItem = foodDictionary.find(f => f.item_name === log.item);
      if (dbItem) {
        totalCals += (dbItem.calories_per_serving * log.servings);
        totalPro += (dbItem.protein_per_serving * log.servings);
      }
    });

    setCurrentMacros({ calories: totalCals, protein: totalPro });
  }, [items, foodDictionary]);

  const updateServing = (index: number, delta: number) => {
    const newItems = [...items];
    const newServing = Math.max(0, newItems[index].servings + delta); // Prevent negative servings
    
    if (newServing === 0) {
      // Auto-remove if serving drops to 0
      newItems.splice(index, 1);
    } else {
      newItems[index].servings = parseFloat(newServing.toFixed(1));
    }
    setItems(newItems);
  };

  // SVG Circle Math
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  
  const calPercent = Math.min((currentMacros.calories / DAILY_CALORIES) * 100, 100);
  const proPercent = Math.min((currentMacros.protein / DAILY_PROTEIN) * 100, 100);
  
  const calOffset = circumference - (calPercent / 100) * circumference;
  const proOffset = circumference - (proPercent / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm p-6 space-y-8 border shadow-2xl bg-slate-900 border-white/10 rounded-3xl animate-fade-in-up">
        
        <div className="text-center">
          <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">Verify Plate</h2>
          <p className="text-xs text-slate-400">Adjust the AI's vision if necessary.</p>
        </div>

        {/* Live Macro Progress Rings */}
        <div className="flex justify-around">
          {/* Calories Ring */}
          <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
              <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={circumference} 
                strokeDashoffset={calOffset} 
                className="text-orange-500 transition-all duration-500 ease-out" 
              />
            </svg>
            <div className="absolute text-center">
              <span className="block text-sm font-bold text-white">{Math.round(currentMacros.calories)}</span>
              <span className="block text-[10px] text-slate-400 uppercase">kcal</span>
            </div>
          </div>

          {/* Protein Ring */}
          <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
              <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={circumference} 
                strokeDashoffset={proOffset} 
                className="transition-all duration-500 ease-out text-blue-500" 
              />
            </svg>
            <div className="absolute text-center">
              <span className="block text-sm font-bold text-white">{Math.round(currentMacros.protein)}g</span>
              <span className="block text-[10px] text-slate-400 uppercase">Pro</span>
            </div>
          </div>
        </div>

        {/* Editable List */}
        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {items.map((log, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded-xl bg-slate-800/50 border-white/5">
              <span className="text-sm font-medium text-white truncate max-w-[140px]">{log.item}</span>
              
              <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-white/10">
                <button onClick={() => updateServing(idx, -0.5)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md active:scale-95 transition-all">-</button>
                <span className="w-6 text-center text-sm font-bold text-white">{log.servings}</span>
                <button onClick={() => updateServing(idx, 0.5)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-md active:scale-95 transition-all">+</button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button onClick={onCancel} className="w-1/3 py-3 text-xs font-bold tracking-widest text-slate-400 uppercase border rounded-xl border-white/10 hover:bg-white/5 active:scale-95 transition-all">
            Retake
          </button>
          <button onClick={() => onConfirm(items)} className="w-2/3 py-3 text-xs font-black tracking-widest text-slate-900 uppercase bg-white rounded-xl hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 transition-all">
            Log Macros
          </button>
        </div>

      </div>
    </div>
  );
}