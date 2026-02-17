import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import Auth from './Auth';
import Onboarding from './Onboarding';
import './App.css';

// --- SKELETON LOADER COMPONENT ---
function MenuSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
       {[1, 2, 3, 4].map((i) => (
         <div key={i} className="glass-card rounded-3xl overflow-hidden border border-white/5 bg-slate-800/50">
            <div className="h-16 bg-slate-700/30 border-b border-white/5"></div>
            <div className="p-4 space-y-4">
              <div className="h-20 bg-slate-700/20 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-8 bg-slate-700/20 rounded-lg w-full"></div>
                <div className="h-8 bg-slate-700/20 rounded-lg w-3/4"></div>
              </div>
            </div>
         </div>
       ))}
    </div>
  );
}

// --- ERROR FALLBACK COMPONENT ---
function ErrorFallback({ error, resetErrorBoundary }: { error: any, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="text-4xl">⚠️</div>
      <h3 className="text-xl font-bold text-white">Something went wrong</h3>
      <p className="text-slate-400 text-sm">{error.message}</p>
      <button onClick={resetErrorBoundary} className="px-4 py-2 bg-blue-600 rounded-lg text-white font-bold text-sm">
        Try Again
      </button>
    </div>
  );
}

// --- TYPESCRIPT INTERFACES ---
interface OptimizedPlateItem {
  item: string;
  servings: number;
  unit: string;
  protein: number;
  calories: number;
  is_limited: boolean;
  category: string;
}

interface DailyMenu {
  date: string;
  meal_type: number;
  mess_id: string;
  raw_items: string[];
}

interface FoodItem {
  id: number;
  item_name: string;
  protein_per_serving: number;
  calories_per_serving: number;
  serving_unit: string;
  is_limited: boolean;
  max_servings: number;
  category: string;
  diet_tag?: 'volume_filler' | 'dense_calorie' | 'lean_protein' | 'neutral';
}

const MESS_OPTIONS = [
  { id: 'men-spc', label: 'Men Special' },
  { id: 'men-veg', label: 'Men Veg' },
  { id: 'men-nv', label: 'Men Non-Veg' },
  { id: 'wmn-spc', label: 'Women Special' },
  { id: 'wmn-veg', label: 'Women Veg' },
  { id: 'wmn-nv', label: 'Women Non-Veg' },
];

// ==========================================
// 1. THE MAIN WRAPPER COMPONENT (ROUTER)
// ==========================================
export default function App() {
  
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const initSession = async () => {
      console.log("App: Initializing session check...");
      // Timeout failsafe - if Supabase hangs, stop loading after 5s
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn("App: Session check timed out, forcing load completion.");
          setLoadingSession(false);
        }
      }, 5000);

      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("App error fetching session:", error);
        }

        if (isMounted) {
          const currentSession = data?.session ?? null;
          setSession(currentSession);
          console.log("App: Session retrieved:", currentSession ? "Logged In" : "No Session");
          
          if (currentSession) {
            await checkProfileStatus(currentSession.user.id);
          }
        }
      } catch (err) {
        console.error("App: Unexpected error during init:", err);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setLoadingSession(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log("App: Auth state change:", event);
      if (isMounted) {
        setSession(session);
        if (session) await checkProfileStatus(session.user.id);
        // Ensure we stop loading on auth change events too
        setLoadingSession(false); 
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkProfileStatus = async (userId: string) => {
    console.log("App: Checking profile execution for user", userId);
    
    // Helper to timeout the specific request - Increased to 6s
    const racePromise = new Promise<{ data: any; error: any }>((_, reject) => {
      setTimeout(() => reject(new Error("Profile check request timed out")), 6000);
    });

    try {
      const { data, error } = await Promise.race([
        supabase
          .from('profiles')
          .select('is_onboarded, daily_protein_goal, daily_calorie_goal, weight_kg, target_weight_kg')
          .eq('id', userId)
          .single(),
        racePromise
      ]);

      if (error) {
        // IMPORTANT: PGRST116 means "No rows found," which is totally normal for a new user!
        if (error.code === 'PGRST116') {
          console.log("App: No profile found (new user), Redirecting to Onboarding.");
          setNeedsOnboarding(true);
        } else {
          console.warn("App: Database error:", error.message);
          setNeedsOnboarding(true); // Default to onboarding on error
        }
        return;
      }

      if (data) {
        if (!data.is_onboarded) {
          console.log("App: User needs to finish onboarding");
          setNeedsOnboarding(true);
        } else {
          console.log("App: User fully onboarded");
          localStorage.setItem('dontmessit_protein', data.daily_protein_goal?.toString() || '140');
          localStorage.setItem('dontmessit_calories', data.daily_calorie_goal?.toString() || '2600');
          
          // Determine goal based on weight difference
          const currentWeight = data.weight_kg || 0;
          const targetWeight = data.target_weight_kg || 0;
          let goal = 'maintain';
          if (targetWeight > currentWeight) goal = 'gain_weight';
          else if (targetWeight < currentWeight) goal = 'lose_weight';
          
          localStorage.setItem('dontmessit_goal', goal);
          
          setNeedsOnboarding(false);
        }
      } else {
        setNeedsOnboarding(true);
      }
    } catch (e: any) {
      console.error("App: Profile check exception:", e.message || e);
      
      // FALLBACK: If we have ANY local data, assume user is fine and show dashboard
      // We prioritize showing the dashboard over blocking the user on Onboarding
      const hasLocalData = localStorage.getItem('dontmessit_protein');
      
      if (hasLocalData) {
        console.log("App: Network timed out/failed but local profile found. Showing Dashboard.");
        setNeedsOnboarding(false);
      } else {
        // Even if we don't have local data, we'll default to 140g protein and show the dashboard
        // This is better than trapping the user on the Onboarding screen if the database is just slow.
        console.warn("App: No local profile found and network failed. Using defaults.");
        localStorage.setItem('dontmessit_protein', '140');
        localStorage.setItem('dontmessit_calories', '2600');
        localStorage.setItem('dontmessit_goal', 'maintain');
        setNeedsOnboarding(false);
      }
    }
  };

  if (loadingSession) {
    return <div className="flex h-screen items-center justify-center text-gray-400 font-bold animate-pulse">Loading DontMessIt...</div>;
  }

  if (!session) return <Auth />;
  if (needsOnboarding) return <Onboarding session={session} onComplete={() => setNeedsOnboarding(false)} />;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <DontMessItDashboard />
    </ErrorBoundary>
  );
}

// ==========================================
// 2. THE DASHBOARD COMPONENT (THE ACTUAL APP)
// ==========================================
function DontMessItDashboard() {
  const [currentMealType, setCurrentMealType] = useState<number>(1);
  const [showSettings, setShowSettings] = useState(false);

  // --- STATE FOR UI ---
  const [dailyProteinGoal, setDailyProteinGoal] = useState<number>(() => Number(localStorage.getItem('dontmessit_protein')) || 140);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(() => Number(localStorage.getItem('dontmessit_calories')) || 2800);
  const [selectedMess, setSelectedMess] = useState(() => localStorage.getItem('dontmessit_mess') || 'men-spc');
  const [expandedMenuId, setExpandedMenuId] = useState<number | null>(null);
  const [userGoal] = useState<'gain_weight' | 'lose_weight'>(() => {
    return (localStorage.getItem('dontmessit_goal') as 'gain_weight' | 'lose_weight') || 'gain_weight';
  });

  // --- DATE NAVIGATION STATE ---
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateForDB = (date: Date) => {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  const formatUI_Date = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    
    // Check if tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getMealName = (type: number) => {
    switch (type) {
      case 1: return "Breakfast";
      case 2: return "Lunch";
      case 3: return "Snacks";
      case 4: return "Dinner";
      default: return "Unknown";
    }
  };

  const getMessTimeDisplay = (mealType: number, date: Date) => {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0=Sun, 6=Sat
    
    switch(mealType) {
      case 1: // Breakfast
        return isWeekend ? "7:30 - 9:30 AM" : "7:00 - 9:00 AM";
      case 2: // Lunch
        return "12:30 - 2:30 PM";
      case 3: // Snacks
        return "4:30 - 6:15 PM";
      case 4: // Dinner
        return "7:00 - 9:00 PM";
      default:
        return "";
    }
  };

  // --- REACT QUERY FETCHING ---
  
  // 1. Food Dictionary (Long Cache)
  const { data: foodDictionary = [] } = useQuery({
    queryKey: ['foodDictionary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('food_dictionary').select('*');
      if (error) throw error;
      return data as FoodItem[];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24h
  });

  // 2. Daily Menus (Short Cache)
  const targetDateStr = formatDateForDB(selectedDate);
  
  const { data: mealsOfDay = [], isLoading: loadingMenu } = useQuery({
    queryKey: ['dailyMenus', selectedMess, targetDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_menus')
        .select('*')
        .eq('date', targetDateStr)
        .eq('mess_id', selectedMess);
      
      if (error) throw error;
      return data as DailyMenu[];
    },
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const loading = loadingMenu && mealsOfDay.length === 0;

  // Set current meal type on mount
  useEffect(() => {
    const hour = new Date().getHours();
    const mealType = hour < 10 ? 1 : hour < 15 ? 2 : hour < 18 ? 3 : 4;
    setCurrentMealType(mealType);
  }, []);

  // --- THE THALI ENGINE ---
  // --- THE UPGRADED TWO-STAGE THALI ENGINE ---
  // Notice we added 'mealType: number' as the second parameter!
  const buildPersonalizedPlate = (rawItems: string[], mealType: number) => {
    if (!foodDictionary.length) return { recommendations: [], total_estimated_protein: 0, total_estimated_calories: 0 };
    
    // --- SMART MACRO DISTRIBUTION ---
    let targetMealProtein = 0;
    let targetMealCalories = 0;

    if (mealType === 3) { 
      // SNACKS (Type 3): Hardcapped at 15g protein, and only 15% of daily calories
      targetMealProtein = 15;
      targetMealCalories = dailyCalorieGoal * 0.15; 
    } else { 
      // BREAKFAST, LUNCH, DINNER: Split the REMAINING protein and calories evenly across the 3 main meals
      targetMealProtein = (dailyProteinGoal - 15) / 3;
      targetMealCalories = (dailyCalorieGoal * 0.85) / 3; 
    }
    
    let currentProtein = 0;
    let totalLiquidServings = 0; 
    let totalCalories = 0;
    const MAX_LIQUIDS_PER_MEAL = 2; 

    // ... (The rest of the plateMap, sorting, and addServing logic stays exactly the same) ...

    const plateMap = new Map<string, OptimizedPlateItem>();

    const matchedItems = rawItems
      .map(rawItem => foodDictionary.find(dict => dict.item_name.toLowerCase() === rawItem.toLowerCase()))
      .filter((item): item is FoodItem => item !== undefined);

    const proteins = matchedItems.filter(i => i.category === 'protein_main').sort((a,b) => b.protein_per_serving - a.protein_per_serving);
    const liquids = matchedItems.filter(i => i.category === 'liquid_side').sort((a,b) => b.protein_per_serving - a.protein_per_serving);
    const carbs = matchedItems.filter(i => i.category === 'carb_main');

    const addServing = (item: FoodItem, count: number) => {
      const existing = plateMap.get(item.item_name)?.servings || 0;
      let maxAllowed = item.is_limited ? (item.max_servings || 1) : (item.max_servings || 2);

      if (item.category === 'liquid_side') {
        const liquidRoomLeft = MAX_LIQUIDS_PER_MEAL - totalLiquidServings;
        if (liquidRoomLeft <= 0) return; 
        maxAllowed = Math.min(maxAllowed, existing + liquidRoomLeft);
      }

      const canAdd = Math.min(count, maxAllowed - existing);
      if (canAdd <= 0) return;

      if (item.category === 'liquid_side') totalLiquidServings += canAdd;

      const pYield = item.protein_per_serving * canAdd;
      const cYield = item.calories_per_serving * canAdd;

      if (plateMap.has(item.item_name)) {
        const entry = plateMap.get(item.item_name)!;
        entry.servings += canAdd;
        entry.protein = Number((entry.protein + pYield).toFixed(1));
        entry.calories = Math.round(entry.calories + cYield);
      } else {
        plateMap.set(item.item_name, {
          item: item.item_name, servings: canAdd, unit: item.serving_unit,
          protein: Number(pYield.toFixed(1)), calories: Math.round(cYield), is_limited: item.is_limited, category: item.category
        });
      }
      currentProtein += pYield;
      totalCalories += cYield; 
    };

    // STAGE 1: THE PROTEIN FOUNDATION
    if (carbs.length > 0) addServing(carbs[0], 1); // Secure 1 base carb
    
    proteins.forEach(p => {
      if (currentProtein < targetMealProtein) {
        const needed = targetMealProtein - currentProtein;
        addServing(p, Math.ceil(needed / p.protein_per_serving));
      }
    });

    liquids.forEach(l => {
      if (currentProtein < targetMealProtein) {
        const needed = targetMealProtein - currentProtein;
        addServing(l, Math.ceil(needed / l.protein_per_serving));
      }
    });

    // STAGE 2: THE CALORIE OPTIMIZER
    // If we hit protein but are still short on calories, we fill the plate!
    if (totalCalories < targetMealCalories) {
      const sides = matchedItems.filter(i => i.category === 'healthy_extra' || i.category === 'side');
      let remainingItems = [...sides, ...carbs]; // Bring carbs back in to top up calories!

      remainingItems.sort((a, b) => {
        if (userGoal === 'gain_weight') {
          // Bulking: Sort by highest calories first to hit target easily
          return b.calories_per_serving - a.calories_per_serving; 
        } else {
          // Cutting: Sort by lowest calories first to provide volume without breaking the bank
          return a.calories_per_serving - b.calories_per_serving; 
        }
      });

      remainingItems.forEach(item => {
        // Keep adding 1 serving at a time until we hit the calorie target OR hit the item's max limit
        while (totalCalories < targetMealCalories) {
          const calsBefore = totalCalories;
          addServing(item, 1);
          
          // Failsafe: If addServing didn't change totalCalories (meaning it hit the 'max_servings' limit), break to prevent infinite loop
          if (totalCalories === calsBefore) break; 
        }
      });
    }

    return { 
      recommendations: Array.from(plateMap.values()), 
      total_estimated_protein: Number(currentProtein.toFixed(1)),
      total_estimated_calories: Math.round(totalCalories)
    };
  };

  const sortedMeals = [...mealsOfDay].sort((a, b) => {
    if (a.meal_type === currentMealType) return -1;
    if (b.meal_type === currentMealType) return 1;
    return a.meal_type - b.meal_type;
  });

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20 pt-6 px-4">
      
      {/* UPDATE: Compact Header with Date */}
      <div className="glass-panel rounded-2xl p-2 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 pl-2">
            <select 
              value={selectedMess} 
              onChange={(e) => { setSelectedMess(e.target.value); localStorage.setItem('dontmessit_mess', e.target.value); }} 
              className="appearance-none bg-transparent text-white text-sm font-black uppercase tracking-tight outline-none"
            >
              {MESS_OPTIONS.map((o) => <option key={o.id} value={o.id} className="text-black">{o.label}</option>)}
            </select>
            <div className="h-4 w-px bg-white/20"></div>
            <div className="flex items-center gap-1">
               <button onClick={() => changeDate(-1)} className="p-1 text-slate-400 hover:text-white"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
               <span className="text-xs font-bold text-slate-300 min-w-[80px] text-center">{formatUI_Date(selectedDate) === "Today" ? "Today" : selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
               <button onClick={() => changeDate(1)} className="p-1 text-slate-400 hover:text-white"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
        </div>
        
        <button onClick={() => setShowSettings(!showSettings)} className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/50 active:scale-95 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {showSettings && (
        <div className="glass-panel p-5 rounded-2xl mb-6 animate-fade-in-up flex flex-col gap-4">
          
          {/* Option 1: Update Intake */}
          <details className="group">
            <summary className="flex justify-between items-center cursor-pointer list-none text-white font-bold mb-2">
              <span>Update Intake</span>
              <span className="transition group-open:rotate-180">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </span>
            </summary>
            <div className="grid grid-cols-2 gap-4 mt-2 mb-2 p-2 bg-black/20 rounded-xl">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Protein (g)</label>
                <input type="number" value={dailyProteinGoal} onChange={(e) => { setDailyProteinGoal(Number(e.target.value)); localStorage.setItem('dontmessit_protein', e.target.value); }} className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl font-bold focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Calories</label>
                <input type="number" value={dailyCalorieGoal} onChange={(e) => { setDailyCalorieGoal(Number(e.target.value)); localStorage.setItem('dontmessit_calories', e.target.value); }} className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl font-bold focus:border-blue-500 outline-none" />
              </div>
            </div>
          </details>

          <div className="h-px bg-white/5 w-full"></div>

          {/* Option 2: Logout (At Bottom) */}
          <button onClick={() => supabase.auth.signOut()} className="w-full text-center text-xs font-bold text-red-400 bg-red-900/10 hover:bg-red-900/20 py-3 rounded-xl border border-red-900/30 transition-colors">
            LOGOUT
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="space-y-6">
        {loading || !foodDictionary.length ? (
             <MenuSkeleton />
        ) : (
          sortedMeals.map((meal) => {
            const isCurrent = meal.meal_type === currentMealType;
            
            // ANALYTICS LOGIC (Same as before)
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
              <div key={meal.meal_type} className={`relative glass-card rounded-3xl overflow-hidden transition-all duration-300 border border-white/5 shadow-xl ${isCurrent ? `ring-1 ring-${primaryColor}-500/50 opacity-100` : 'opacity-80 grayscale-[0.2]'}`}>
                
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
                  
                  {/* STRATEGY BOX (Context Aware) with Premium Gradient */}
                  {isCurrent && (
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
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center group py-1">
                          <div className="flex items-center gap-3">
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
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-500 bg-white/5 py-0.5 px-1.5 rounded border border-white/5">{Math.round(item.calories)}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-white/5 py-0.5 px-1.5 rounded border border-white/5">{item.protein}g</span>
                          </div>
                        </div>

                      ))}
                    </div>
                  </div>
                  
                  {/* Minimal Full Menu List */}
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

                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}