import { useRef } from 'react';
import { type DailyMenu, type FoodItem, type OptimizedPlateItem } from '../../data/types';
import PlateScanner from '../../PlateScanner';

interface PlateCardProps {
  meal: DailyMenu;
  isCurrent: boolean;
  selectedDate: Date;
  foodDictionary: FoodItem[];
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  userGoal: string;
  appMode: 'blueprint' | 'explorer';
  isAdmin: boolean;
  manualLogCounts: {[key: string]: number};
  setManualLogCounts: React.Dispatch<React.SetStateAction<{[key: string]: number}>>;
  setConsumed: React.Dispatch<React.SetStateAction<{ calories: number; protein: number }>>;
  onOpenEditModal: (item: FoodItem) => void;
  onScanSuccess: (items: any[]) => void;
  getMealName: (type: number) => string;
  getMessTimeDisplay: (type: number, date: Date) => string;
  buildPersonalizedPlate: (items: string[], type: number) => { recommendations: OptimizedPlateItem[], total_estimated_protein: number, total_estimated_calories: number };
}

export default function PlateCard({
  meal,
  isCurrent,
  selectedDate,
  foodDictionary,
  // dailyCalorieGoal, // Removed unused
  // dailyProteinGoal, // Removed unused
  userGoal,
  appMode,
  isAdmin,
  manualLogCounts,
  setManualLogCounts,
  setConsumed,
  onOpenEditModal,
  onScanSuccess,
  getMealName,
  getMessTimeDisplay,
  buildPersonalizedPlate,
}: PlateCardProps) {
  
  const longPressTimerRef = useRef<any>(null);

  // ANALYTICS LOGIC
  const matchedItems = meal.raw_items
    .map(rawItem => foodDictionary.find(dict => dict.item_name.toLowerCase() === rawItem.toLowerCase()))
    .filter((item): item is FoodItem => item !== undefined);

  const availableProteins = matchedItems
    .filter(i => i.category === 'protein_main')
    .sort((a,b) => b.protein_per_serving - a.protein_per_serving);

  const customPlate = buildPersonalizedPlate(meal.raw_items, meal.meal_type);

  const grouped = {
    carb: customPlate.recommendations.filter(i => i.category === 'carb_main'),
    protein: customPlate.recommendations.filter(i => i.category === 'protein_main'),
    filler: customPlate.recommendations.filter(i => i.category === 'liquid_side'),
    extra: customPlate.recommendations.filter(i => i.category === 'side' || i.category === 'healthy_extra')
  };

  const primaryColor = userGoal === 'gain_weight' ? 'blue' : 'orange';

  return (
    <div className={`relative glass-card rounded-3xl overflow-hidden transition-all duration-300 border border-white/5 shadow-xl ${isCurrent ? `ring-1 ring-${primaryColor}-500/50 opacity-100` : 'opacity-80 grayscale-[0.2]'}`}>
      
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

      {/* CARD HEADER */}
      <div className="p-4 flex justify-between items-center relative z-10 border-b border-white/5 bg-black/20">
        <div>
          <h2 className="text-xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">{getMealName(meal.meal_type)}</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{getMessTimeDisplay(meal.meal_type, selectedDate)}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1">
            <span className={`text-base font-black text-${primaryColor}-400`}>{customPlate.total_estimated_calories}</span>
            <span className={`text-[8px] font-bold text-${primaryColor}-300 uppercase`}>KCAL</span>
          </div>
          <div className="w-px h-4 bg-white/10"></div>
          <div className="flex items-center gap-1">
            <span className={`text-base font-black text-${primaryColor}-400`}>+{customPlate.total_estimated_protein}</span>
            <span className={`text-[8px] font-bold text-${primaryColor}-300`}>PRO</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: PROTEIN HITTERS (SCROLLABLE ROW) */}
      {availableProteins.length > 0 && (
        <div className="px-4 py-3 overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-white/5 bg-white/[0.02] overscroll-x-contain touch-pan-x hover:scrollbar-default transition-all">
          <div className="flex gap-2">
            {availableProteins.map((p, idx) => (
              <div key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-${primaryColor}-500/30 bg-${primaryColor}-500/5 backdrop-blur-sm`}>
                <span className="text-[10px]">🔥</span>
                <span className={`text-[10px] font-bold text-${primaryColor}-100 uppercase tracking-wide`}>{p.item_name}</span>
                <span className={`text-[10px] font-black text-${primaryColor}-400`}>{p.protein_per_serving}g</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-4 space-y-4 relative z-10">

        {appMode === 'blueprint' ? (
        <>
        
        {/* STRATEGY BOX (Context Aware) with Premium Gradient */}
        {isCurrent && (
          <>
          <div className={`p-3 rounded-xl border relative overflow-hidden group ${userGoal === 'gain_weight' ? 'bg-gradient-to-br from-blue-900/40 to-slate-900/40 border-blue-500/20' : 'bg-gradient-to-br from-orange-900/40 to-slate-900/40 border-orange-500/20'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${userGoal === 'gain_weight' ? 'from-blue-500 to-transparent' : 'from-orange-500 to-transparent'}`}></div>
            <div className="relative z-10 flex items-start gap-2">
              <div className="flex-1">
                <h3 className={`text-[9px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${userGoal === 'gain_weight' ? 'text-blue-400' : 'text-orange-400'}`}>
                  {userGoal === 'gain_weight' ? '⚡ BULK STRATEGY' : '🔥 CUT STRATEGY'}
                </h3>
                <p className="text-xs font-medium leading-relaxed text-slate-300">
                {(() => {
                  const availableFillers = matchedItems.filter(i => i.category === 'healthy_extra' || i.category === 'side').map(i => i.item_name);
                  const availableDense = matchedItems.filter(i => i.category === 'carb_main' && i.calories_per_serving > 150).map(i => i.item_name);
                  const primaryProtein = availableProteins[0]?.item_name || 'the main protein';

                  if (userGoal === 'gain_weight') {
                    let text = `Prioritize ${primaryProtein}. `;
                    if (availableDense.length > 0) text += `Double ${availableDense[0]}. `;
                    else text += `Add Milk/Curd. `;
                    return text;
                  } else {
                    let text = `Focus on ${primaryProtein}. `;
                    if (availableFillers.length > 0) text += `Add ${availableFillers[0]}. `;
                    if (availableDense.length > 0) text += `Skip ${availableDense[0]}.`;
                    else text += `Drink water first.`;
                    return text;
                  }
                })()}
                </p>
              </div>
            </div>
          </div>
          </>
        )}

        {/* AI PLATE */}
        <div>
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-4">
             PLATE BLUEPRINT
             <div className="h-px bg-gradient-to-r from-slate-800 to-transparent flex-1"></div>
          </h3>
          
          <div className="space-y-2">
            {[
               ...grouped.protein.map(i => ({...i, type: 'prot'})),
               ...grouped.carb.map(i => ({...i, type: 'carb'})),
               ...grouped.filler.map(i => ({...i, type: 'fill'})),
               ...grouped.extra.map(i => ({...i, type: 'extra'}))
            ].map((item, idx) => {
                // Find original food item to edit
                const originalItem = foodDictionary.find(d => d.item_name === item.item);
                
                return (
              <div 
                key={idx} 
                className="flex justify-between items-center group py-1 relative select-none active:scale-[0.98] transition-transform"
                onContextMenu={(e) => { if(isAdmin) e.preventDefault(); }}
                
                // Mobile Events
                onTouchStart={() => originalItem && isAdmin && (longPressTimerRef.current = setTimeout(() => {
                  onOpenEditModal(originalItem);
                }, 500))}
                onTouchMove={() => { if(longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
                onTouchEnd={() => { if(longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
                
                // Desktop Events
                onMouseDown={() => originalItem && isAdmin && (longPressTimerRef.current = setTimeout(() => {
                   onOpenEditModal(originalItem);
                }, 500))}
                onMouseUp={() => { if(longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
                onMouseLeave={() => { if(longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
              >
                <div className="flex items-center gap-3 pointer-events-none">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-md ${
                    item.type === 'prot' ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-green-900/10' :
                    item.type === 'carb' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-orange-900/10' :
                    'bg-slate-800/50 text-slate-400 border border-slate-700/50'
                  }`}>
                    {item.servings}x
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200 leading-tight">{item.item}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                      {item.type === 'prot' ? 'Protein' : item.type === 'carb' ? 'Carb' : 'Side'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-500 bg-white/5 py-0.5 px-1.5 rounded border border-white/5">{Math.round(item.calories)}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white/5 py-0.5 px-1.5 rounded border border-white/5">{item.protein}g</span>
                </div>
                
                {/* Admin Hint */}
                {isAdmin && <div className="absolute inset-0 border border-dashed border-white/5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none"></div>}
              </div>
            )})}
          </div>
        </div>
        
        </>
        ) : (
          /* =========================================
             MODE 2: THE MENU EXPLORER (with Inline Log)
             ========================================= */
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
               <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Full Menu Explorer</h4>
               
               {/* Batch Commit Button (Only if counts > 0) */}
               {Object.values(manualLogCounts).reduce((a,b) => a+b, 0) > 0 && (
                  <button 
                    onClick={() => {
                       const totalCals = Object.entries(manualLogCounts).reduce((acc, [name, count]) => {
                          const item = foodDictionary.find(i => i.item_name === name);
                          return acc + (item ? item.calories_per_serving * count : 0);
                       }, 0);
                       const totalPro = Object.entries(manualLogCounts).reduce((acc, [name, count]) => {
                          const item = foodDictionary.find(i => i.item_name === name);
                          return acc + (item ? item.protein_per_serving * count : 0);
                       }, 0);
                       
                       setConsumed(prev => ({ 
                           calories: prev.calories + totalCals, 
                           protein: prev.protein + totalPro 
                       }));
                       setManualLogCounts({}); // Reset after commit
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-all animate-bounce-short"
                  >
                      Add +{Object.values(manualLogCounts).reduce((a,b) => a+b, 0)} Items
                  </button>
               )}
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {meal.raw_items.map((itemName: string, idx: number) => {
                const dbItem = foodDictionary.find(f => f.item_name.toLowerCase() === itemName.toLowerCase());
                const count = manualLogCounts[itemName] || 0;
                
                return (
                  <div key={idx} className={`flex items-center justify-between p-3 border transition-colors duration-300 rounded-xl ${count > 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-900/50 border-white/5'}`}>
                    <div className="flex flex-col flex-1">
                      <span className={`text-sm font-bold ${count > 0 ? 'text-blue-200' : 'text-white'}`}>{itemName}</span>
                      {dbItem && (
                          <span className="text-[10px] font-medium text-slate-500 mt-1">
                              {dbItem.calories_per_serving} kcal • {dbItem.protein_per_serving}g pro
                          </span>
                      )}
                    </div>
                    
                    {/* INLINE CONTROLS */}
                    <div className="flex items-center gap-2 bg-slate-950/50 rounded-lg p-1 border border-white/5">
                       <button 
                         onClick={() => setManualLogCounts(p => ({...p, [itemName]: Math.max(0, (p[itemName] || 0) - 1)}))}
                         className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all rounded-md hover:bg-white/10"
                       >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                       </button>
                       
                       <span className={`w-6 text-center text-sm font-black ${count > 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                          {count}
                       </span>
                       
                       <button 
                         onClick={() => setManualLogCounts(p => ({...p, [itemName]: (p[itemName] || 0) + 1}))}
                         className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all rounded-md hover:bg-white/10"
                       >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCurrent && (
          <div className="mt-6">
            <PlateScanner 
              currentMenu={meal.raw_items} 
              onScanSuccess={onScanSuccess} 
            />
          </div>
        )}
        
        {/* Minimal Full Menu List (Hide in Explorer mode since it's redundant) */}
        {appMode === 'blueprint' && (
          <div className="pt-3 border-t border-white/5">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">FULL MENU</p>
             <div className="text-xs text-slate-400 font-medium leading-relaxed">
                {meal.raw_items.map((item, i) => (
                  <span key={i}>
                    {item}{i < meal.raw_items.length - 1 ? " • " : ""}
                  </span>
                ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
