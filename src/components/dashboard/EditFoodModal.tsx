import { type FoodItem } from '../../data/types';

interface EditFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: FoodItem | null;
  editProtein: string;
  setEditProtein: (val: string) => void;
  editCalories: string;
  setEditCalories: (val: string) => void;
  editIsLimited: boolean;
  setEditIsLimited: (val: boolean) => void;
  editMaxServings: string;
  setEditMaxServings: (val: string) => void;
  isUpdating: boolean;
  onUpdate: () => void;
}

export default function EditFoodModal({
  isOpen,
  onClose,
  editingItem,
  editProtein,
  setEditProtein,
  editCalories,
  setEditCalories,
  editIsLimited,
  setEditIsLimited,
  editMaxServings,
  setEditMaxServings,
  isUpdating,
  onUpdate
}: EditFoodModalProps) {

  if (!isOpen || !editingItem) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/5">
        {/* Inner Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70 blur-md"></div>

        <div className="space-y-6 relative z-10">
          {/* Header */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">ADMIN GOD MODE</p>
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 italic tracking-tight truncate">
              {editingItem.item_name}
            </h2>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Protein (g)</label>
              <input 
                type="number" 
                value={editProtein} 
                onChange={(e) => setEditProtein(e.target.value)} 
                className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white font-bold p-3 rounded-xl outline-none transition-all focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Calories</label>
              <input 
                type="number" 
                value={editCalories} 
                onChange={(e) => setEditCalories(e.target.value)} 
                className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white font-bold p-3 rounded-xl outline-none transition-all focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-slate-800/50 rounded-xl p-3 border border-white/5 space-y-4">
             {/* Limited Toggle */}
             <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Is Limited Item?</span>
                <button 
                  onClick={() => setEditIsLimited(!editIsLimited)}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${editIsLimited ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${editIsLimited ? 'left-7' : 'left-1'}`}></div>
                </button>
             </div>

             {/* Max Servings Input (Only if limited) */}
             <div className={`transition-all duration-300 overflow-hidden ${editIsLimited ? 'max-h-20 opacity-100' : 'max-h-0 opacity-50'}`}>
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                  <span className="text-xs font-bold text-slate-400">Max Servings allowed</span>
                  <input 
                    type="number" 
                    value={editMaxServings} 
                    onChange={(e) => setEditMaxServings(e.target.value)} 
                    className="w-16 bg-slate-900 border border-slate-700 text-white font-bold py-1 px-2 rounded-lg text-center text-sm outline-none focus:border-blue-500"
                  />
                </div>
             </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-colors"
            >
              CANCEL
            </button>
            <button 
              onClick={onUpdate}
              disabled={isUpdating}
              className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  UPDATING...
                </>
              ) : (
                'UPDATE DATABASE'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
