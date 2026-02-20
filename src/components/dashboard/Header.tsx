import { MESS_OPTIONS } from '../../data/types';

interface HeaderProps {
  selectedMess: string;
  setSelectedMess: (mess: string) => void;
  selectedDate: Date;
  changeDate: (days: number) => void;
  formatUI_Date: (date: Date) => string;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  appMode: 'blueprint' | 'explorer';
  setAppMode: (mode: 'blueprint' | 'explorer') => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  dailyCalorieGoal: number;
  setDailyCalorieGoal: (goal: number) => void;
  dailyProteinGoal: number;
  setDailyProteinGoal: (goal: number) => void;
  onLogout: () => void;
}

export default function Header({
  selectedMess,
  setSelectedMess,
  selectedDate,
  changeDate,
  formatUI_Date,
  isMenuOpen,
  setIsMenuOpen,
  appMode,
  setAppMode,
  theme,
  setTheme,
  dailyCalorieGoal,
  setDailyCalorieGoal,
  dailyProteinGoal,
  setDailyProteinGoal,
  onLogout
}: HeaderProps) {

  return (
    <div className="flex items-center justify-between w-full mb-6 relative z-50">
      <div>
        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Mess Menu</h1>
        {/* MESS SELECTOR (Now a badge) */}
        <div className="relative inline-block mt-1">
           <select 
            value={selectedMess} 
            onChange={(e) => { setSelectedMess(e.target.value); localStorage.setItem('dontmessit_mess', e.target.value); }} 
            className="appearance-none bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs font-bold tracking-widest text-slate-400 uppercase outline-none focus:bg-white/10"
          >
            {MESS_OPTIONS.map((o) => <option key={o.id} value={o.id} className="text-black">{o.label}</option>)}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {/* DATE & MENU CONTROLS */}
      <div className="flex items-center gap-2">
          
          {/* Date Nav */}
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
              <button onClick={() => changeDate(-1)} className="p-2 text-slate-400 hover:text-white active:scale-95 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <span className="text-[10px] font-bold text-slate-300 min-w-[60px] text-center uppercase">{formatUI_Date(selectedDate)}</span>
              <button onClick={() => changeDate(1)} className="p-2 text-slate-400 hover:text-white active:scale-95 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
          </div>

          {/* Hamburger Button */}
          <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-3 border rounded-xl border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen 
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              }
              </svg>
          </button>
      </div>

      {/* Settings Dropdown Menu */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="absolute top-full right-0 mt-2 w-72 p-5 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 ring-1 ring-white/5">
            
            <div className="space-y-6">
              
              {/* Header */}
              <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Display Settings</h3>

              {/* View Mode Toggle (Blueprint vs Explorer) */}
              <div className="bg-white/5 p-1 rounded-xl border border-white/5 flex relative">
                  <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20 transition-all duration-300 ${appMode === 'explorer' ? 'translate-x-[calc(100%+8px)] bg-orange-500 shadow-orange-900/20' : 'left-1'}`}></div>
                  <button 
                    onClick={() => setAppMode('blueprint')}
                    className={`flex-1 relative z-10 py-2 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${appMode === 'blueprint' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Blueprint
                  </button>
                  <button 
                    onClick={() => setAppMode('explorer')}
                    className={`flex-1 relative z-10 py-2 text-[10px] font-black uppercase tracking-wider text-center transition-colors ${appMode === 'explorer' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Explorer
                  </button>
              </div>
              
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                 {appMode === 'blueprint' 
                   ? "AI recommends the exact portions to hit your macro goals." 
                   : "Browse the full menu and log exactly what you eat manually."}
              </p>

              <div className="h-px bg-white/5"></div>

              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </span>
                <button 
                  onClick={() => document.documentElement.classList.toggle('dark') || setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="h-px bg-white/5"></div>
              
              {/* GOALS SETTINGS */}
              <div>
                 <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">My Goals</h4>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800 p-2 rounded-xl border border-white/5">
                       <label className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Calories</label>
                       <input 
                         type="number" 
                         value={dailyCalorieGoal} 
                         onChange={(e) => { setDailyCalorieGoal(Number(e.target.value)); localStorage.setItem('dontmessit_calories', e.target.value); }} 
                         className="w-full bg-transparent text-white font-black text-xs outline-none"
                       />
                    </div>
                    <div className="bg-slate-800 p-2 rounded-xl border border-white/5">
                       <label className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Protein</label>
                       <input 
                         type="number" 
                         value={dailyProteinGoal} 
                         onChange={(e) => { setDailyProteinGoal(Number(e.target.value)); localStorage.setItem('dontmessit_protein', e.target.value); }} 
                         className="w-full bg-transparent text-white font-black text-xs outline-none"
                       />
                    </div>
                 </div>
              </div>

              <div className="h-px bg-white/5"></div>

              {/* LOGOUT */}
              <button 
                onClick={onLogout}
                className="w-full py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-wider"
              >
                Log Out
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
