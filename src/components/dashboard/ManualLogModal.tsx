import { type DailyMenu, type FoodItem } from '../../data/types';

interface ManualLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  sortedMeals: DailyMenu[];
  currentMealType: number;
  manualLogCounts: { [key: string]: number };
  setManualLogCounts: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  foodDictionary: FoodItem[];
  setConsumed: React.Dispatch<React.SetStateAction<{ calories: number; protein: number }>>;
}

export default function ManualLogModal({
  isOpen,
  onClose,
  sortedMeals,
  currentMealType,
  manualLogCounts,
  setManualLogCounts,
  foodDictionary,
  setConsumed
}: ManualLogModalProps) {
  
  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] border-t border-white/20 dark:border-slate-800 p-6 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
        
        {/* Handle Bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>

        {/* Header */}
        <div className="mb-6 mt-2">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Manual Log</h2>
                <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            {/* Live Macro Counter */}
            <div className="flex gap-3">
                <div className="flex-1 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-500/20 p-3 rounded-2xl flex items-center justify-between">
                     <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Calories</span>
                     <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                        {Object.entries(manualLogCounts).reduce((acc, [name, count]) => {
                            const item = foodDictionary.find(i => i.item_name === name);
                            return acc + (item ? item.calories_per_serving * count : 0);
                        }, 0)}
                     </span>
                </div>
                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-500/20 p-3 rounded-2xl flex items-center justify-between">
                     <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Protein</span>
                     <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                        {Object.entries(manualLogCounts).reduce((acc, [name, count]) => {
                            const item = foodDictionary.find(i => i.item_name === name);
                            return acc + (item ? item.protein_per_serving * count : 0);
                        }, 0).toFixed(1)}g
                     </span>
                </div>
            </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-24 space-y-3">
            {(() => {
                const currentMeal = sortedMeals.find(m => m.meal_type === currentMealType);
                if (!currentMeal) return <p className="text-center text-slate-500 py-10">No items available to log.</p>;
                
                return currentMeal.raw_items.map((itemName, idx) => {
                    const item = foodDictionary.find(i => i.item_name === itemName);
                    const count = manualLogCounts[itemName] || 0;
                    const hasMacros = !!item;

                    return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                            <div className="flex-1 pr-4">
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{itemName}</h4>
                                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                                    {hasMacros ? `${item?.calories_per_serving} kcal • ${item?.protein_per_serving}g pro` : 'No macro data'}
                                </p>
                            </div>
                            
                            <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                <button 
                                    onClick={() => setManualLogCounts(p => ({...p, [itemName]: Math.max(0, (p[itemName] || 0) - 1)}))}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                >
                                    -
                                </button>
                                <span className="w-8 text-center text-sm font-black text-slate-700 dark:text-white">{count}</span>
                                <button 
                                    onClick={() => setManualLogCounts(p => ({...p, [itemName]: (p[itemName] || 0) + 1}))}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    );
                });
            })()}
        </div>

        {/* Sticky Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 pt-10">
            <button 
                disabled={Object.values(manualLogCounts).reduce((a, b) => a + b, 0) === 0}
                onClick={() => {
                    // Calculate totals
                    let totalCals = 0;
                    let totalPro = 0;
                    
                    Object.entries(manualLogCounts).forEach(([name, count]) => {
                        if (count > 0) {
                            const item = foodDictionary.find(i => i.item_name === name);
                            if (item) {
                                totalCals += item.calories_per_serving * count;
                                totalPro += item.protein_per_serving * count;
                            }
                        }
                    });

                    // Update consumed state
                    setConsumed(prev => ({
                        ...prev,
                        calories: prev.calories + totalCals,
                        protein: prev.protein + totalPro 
                    }));

                    // Close modal
                    onClose();
                }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
            >
                Add to Daily Total
            </button>
        </div>
    </div>
    </>
  );
}
