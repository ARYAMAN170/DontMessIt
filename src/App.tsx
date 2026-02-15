import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import Onboarding from './Onboarding';
import './App.css';

// --- TYPESCRIPT INTERFACES ---
interface OptimizedPlateItem {
  item: string;
  servings: number;
  unit: string;
  protein: number;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    const racePromise = new Promise<{ data: any; error: any }>((resolve, reject) => {
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

  return <DontMessItDashboard session={session} />;
}

// ==========================================
// 2. THE DASHBOARD COMPONENT (THE ACTUAL APP)
// ==========================================
function DontMessItDashboard({ session }: { session: any }) {
  const [mealsOfDay, setMealsOfDay] = useState<DailyMenu[]>([]);
  const [foodDictionary, setFoodDictionary] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMealType, setCurrentMealType] = useState<number>(1);
  const [showSettings, setShowSettings] = useState(false);

  const [dailyProteinGoal, setDailyProteinGoal] = useState<number>(() => Number(localStorage.getItem('dontmessit_protein')) || 140);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(() => Number(localStorage.getItem('dontmessit_calories')) || 2800);

  const [selectedMess, setSelectedMess] = useState(() => localStorage.getItem('dontmessit_mess') || 'men-spc');
  
  // --- DATE NAVIGATION STATE ---
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateForDB = (date: Date) => {
    // Format: YYYY-MM-DD (e.g., 2023-10-27)
    // We use 'en-CA' because it outputs YYYY-MM-DD by default.
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
// Put this near your other state variables at the top of DontMessItDashboard
const [userGoal, setUserGoal] = useState<'bulk' | 'cut'>(() => {
  return (localStorage.getItem('dontmessit_goal') as 'bulk' | 'cut') || 'bulk';
});
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const hour = new Date().getHours();
      const mealType = hour < 10 ? 1 : hour < 15 ? 2 : hour < 18 ? 3 : 4;
      setCurrentMealType(mealType);
      
      const targetDateStr = formatDateForDB(selectedDate);

      try {
        const [menusResponse, dictResponse] = await Promise.all([
          supabase.from('daily_menus').select('*').eq('date', targetDateStr).eq('mess_id', selectedMess),
          supabase.from('food_dictionary').select('*')
        ]);

        // If data is empty for the selected date, we just show empty
        setMealsOfDay(menusResponse.data || []);
        
        if (dictResponse.data) setFoodDictionary(dictResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedMess, selectedDate]);

  // --- THE THALI ENGINE (GROUPS MEALS LOGICALLY) ---
  const buildPersonalizedPlate = (rawItems: string[]) => {
    if (!foodDictionary.length) return { recommendations: [], total_estimated_protein: 0 };

    const targetMealProtein = dailyProteinGoal / 4; 
    let currentProtein = 0;
    
    // THE FIX: Global tracker for all liquids
    let totalLiquidServings = 0; 
    const MAX_LIQUIDS_PER_MEAL = 2; // Hard cap so you don't drown

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

      // --- GLOBAL LIQUID CAP LOGIC ---
      if (item.category === 'liquid_side') {
        const liquidRoomLeft = MAX_LIQUIDS_PER_MEAL - totalLiquidServings;
        if (liquidRoomLeft <= 0) return; // Stomach is full of liquids!
        
        // Restrict this item if it pushes us over the global limit
        maxAllowed = Math.min(maxAllowed, existing + liquidRoomLeft);
      }

      const canAdd = Math.min(count, maxAllowed - existing);
      if (canAdd <= 0) return;

      // Log the liquid addition
      if (item.category === 'liquid_side') {
        totalLiquidServings += canAdd;
      }

      const pYield = item.protein_per_serving * canAdd;
      if (plateMap.has(item.item_name)) {
        const entry = plateMap.get(item.item_name)!;
        entry.servings += canAdd;
        entry.protein = Number((entry.protein + pYield).toFixed(1));
      } else {
        plateMap.set(item.item_name, {
          item: item.item_name, servings: canAdd, unit: item.serving_unit,
          protein: Number(pYield.toFixed(1)), is_limited: item.is_limited, category: item.category
        });
      }
      currentProtein += pYield;
    };

    // --- MEAL ASSEMBLY ---
    
    // 1. CARB BASE: Take 1 serving (Aloo Paratha/Idli)
    if (carbs.length > 0) addServing(carbs[0], 1);

    // 2. PROTEIN MAIN: Take ALL solid proteins first
    proteins.forEach(p => {
      if (currentProtein < targetMealProtein) {
        const needed = targetMealProtein - currentProtein;
        addServing(p, Math.ceil(needed / p.protein_per_serving));
      }
    });

    // 3. LIQUID FILL: Only use liquids to bridge the gap (up to the max of 2!)
    if (currentProtein < targetMealProtein) {
      liquids.forEach(l => {
        if (currentProtein < targetMealProtein) {
          const needed = targetMealProtein - currentProtein;
          addServing(l, Math.ceil(needed / l.protein_per_serving));
        }
      });
    }

    // --- PHASE 4: THE EMERGENCY SWEEP ---
    if (currentProtein < targetMealProtein) {
      // Find extra items (sides, extra carbs etc)
      const sides = matchedItems.filter(i => i.category === 'healthy_extra' || i.category === 'side');
      let remainingItems = [...sides, ...carbs.slice(1)];
      
      // THE NEW BRAIN: Sort based on goal!
      remainingItems.sort((a, b) => {
        if (userGoal === 'bulk') {
          return (b.diet_tag === 'dense_calorie' ? 1 : 0) - (a.diet_tag === 'dense_calorie' ? 1 : 0);
        } else {
          return (b.diet_tag === 'volume_filler' ? 1 : 0) - (a.diet_tag === 'volume_filler' ? 1 : 0);
        }
      });

      remainingItems.forEach(item => {
        if (currentProtein < targetMealProtein) {
          const needed = targetMealProtein - currentProtein;
          // Just add 1 serving if we are still short
          addServing(item, 1);
        }
      });
    }

    return { recommendations: Array.from(plateMap.values()), total_estimated_protein: Number(currentProtein.toFixed(1)) };
  };

  const sortedMeals = [...mealsOfDay].sort((a, b) => {
    if (a.meal_type === currentMealType) return -1;
    if (b.meal_type === currentMealType) return 1;
    return a.meal_type - b.meal_type;
  });

  return (
    <div className="max-w-md mx-auto p-5 font-sans min-h-screen bg-gray-50 text-gray-900 pb-20">
      
      {/* Header */}
      <header className="mb-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">DontMessIt</h1>
            <button onClick={() => setShowSettings(!showSettings)} className="bg-gray-200 p-2 rounded-full text-sm hover:bg-gray-300 transition">⚙️</button>
          </div>
          <p className="text-gray-500 font-medium mt-1">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <select value={selectedMess} onChange={(e) => { setSelectedMess(e.target.value); localStorage.setItem('dontmessit_mess', e.target.value); }} className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg shadow-sm text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
          {MESS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </header>

      {/* --- DATE NAVIGATOR --- */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <button 
          onClick={() => changeDate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-600 rounded-xl active:bg-gray-200 transition-colors"
        >
          {/* Left Arrow Icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        <div className="flex flex-col items-center cursor-pointer" onClick={() => setSelectedDate(new Date())}>
          <span className="text-sm font-black text-gray-800 uppercase tracking-widest">
            {typeof formatUI_Date === 'function' ? formatUI_Date(selectedDate) : selectedDate.toDateString()}
          </span>
          {typeof formatUI_Date === 'function' && formatUI_Date(selectedDate) !== "Today" && (
            <span className="text-[10px] text-blue-500 font-bold mt-0.5">Tap for Today</span>
          )}
        </div>

        <button 
          onClick={() => changeDate(1)}
          className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-600 rounded-xl active:bg-gray-200 transition-colors"
        >
          {/* Right Arrow Icon */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {showSettings && (
        <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-200 mb-6 transition-all">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800">Macro Targets</h3>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Sign Out</button>
          </div>
          <div className="flex gap-4">
            <input type="number" value={dailyProteinGoal} onChange={(e) => { setDailyProteinGoal(Number(e.target.value)); localStorage.setItem('dontmessit_protein', e.target.value); }} className="w-full bg-gray-50 border p-2 rounded-lg font-bold" />
            <input type="number" value={dailyCalorieGoal} onChange={(e) => { setDailyCalorieGoal(Number(e.target.value)); localStorage.setItem('dontmessit_calories', e.target.value); }} className="w-full bg-gray-50 border p-2 rounded-lg font-bold" />
          </div>
        </div>
      )}

      <main>
        {loading ? <div className="animate-pulse flex h-32 items-center justify-center">Loading...</div> : (
          <div className="space-y-6">
            {sortedMeals.map((meal) => {
              const isCurrent = meal.meal_type === currentMealType;

// 1. Find all items on today's menu that exist in our DB
const matchedItems = meal.raw_items
  .map(rawItem => foodDictionary.find(dict => dict.item_name.toLowerCase() === rawItem.toLowerCase()))
  .filter((item): item is FoodItem => item !== undefined);

// 2. Extract the Top Protein Hitters (Anything > 4g of protein)
const availableProteins = matchedItems
  .filter(i => i.protein_per_serving >= 4)
  .sort((a,b) => b.protein_per_serving - a.protein_per_serving);

const customPlate = buildPersonalizedPlate(meal.raw_items);

const grouped = {
  carb: customPlate.recommendations.filter(i => i.category === 'carb_main'),
  protein: customPlate.recommendations.filter(i => i.category === 'protein_main'),
  filler: customPlate.recommendations.filter(i => i.category === 'liquid_side'),
  extra: customPlate.recommendations.filter(i => i.category === 'side' || i.category === 'healthy_extra')
};

return (
  <div key={meal.meal_type} className={`bg-white rounded-3xl shadow-sm border overflow-hidden transition-all ${isCurrent ? 'border-blue-500 shadow-xl scale-[1.02]' : 'opacity-80'}`}>
    
    {/* MEAL HEADER */}
    <div className={`p-4 flex justify-between items-center ${isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
      <h2 className="text-xl font-black italic uppercase">{getMealName(meal.meal_type)}</h2>
      <span className="text-xl font-black">+{customPlate.total_estimated_protein}g</span>
    </div>
    
    <div className="p-5 space-y-6">
      
      {/* --- NEW: THE COACHING DASHBOARD --- */}
      <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        
        {/* Available Protein Hitters */}
        <div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            🎯 Available Protein Hitters
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableProteins.length > 0 ? availableProteins.map(p => (
              <span key={p.id} className="bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                {p.item_name} <span className="text-green-600 ml-1">{p.protein_per_serving}g</span>
              </span>
            )) : (
              <span className="text-xs text-gray-400 italic">No high-protein items listed for this meal.</span>
            )}
          </div>
        </div>

        {/* Dynamic Goal Strategy */}
        <div className={`p-4 rounded-2xl border ${userGoal === 'bulk' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} shadow-sm`}>
          <h3 className={`text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${userGoal === 'bulk' ? 'text-blue-800' : 'text-orange-800'}`}>
            {userGoal === 'bulk' ? '📈 Your Bulking Playbook' : '📉 Your Cutting Playbook'}
          </h3>
          
          <p className={`text-sm font-medium leading-relaxed ${userGoal === 'bulk' ? 'text-blue-900' : 'text-orange-900'}`}>
            {(() => {
              // 1. Scan today's matched items for their specific diet tags
              const availableFillers = matchedItems.filter(i => i.diet_tag === 'volume_filler').map(i => i.item_name);
              const availableDense = matchedItems.filter(i => i.diet_tag === 'dense_calorie').map(i => i.item_name);
              const primaryProtein = availableProteins[0]?.item_name || 'the main protein';

              // 2. Generate Bulking Advice
              if (userGoal === 'bulk') {
                let text = `Secure your gains with ${primaryProtein}. `;
                if (availableDense.length > 0) {
                  text += `To easily hit your calorie surplus today, absolutely prioritize the ${availableDense.slice(0, 2).join(' and ')}. `;
                } else {
                  text += `There aren't many heavy items today, so lean heavily on dairy (like Curd/Milk) or take double servings of rice to hit your surplus. `;
                }
                if (availableFillers.length > 0) {
                  text += `Don't stuff yourself on the ${availableFillers[0]} before you finish your protein!`;
                }
                return text;
              } 
              
              // 3. Generate Cutting Advice
              else {
                let text = `Protect your muscle mass by eating the ${primaryProtein} first. `;
                if (availableFillers.length > 0) {
                  text += `To stay full in your calorie deficit, load up your tray with ${availableFillers.slice(0, 2).join(' and ')}. `;
                } else {
                  text += `Watch out—there are almost no low-calorie volume foods on the menu today. Drink a large glass of water before eating. `;
                }
                if (availableDense.length > 0) {
                  text += `Stay away from the ${availableDense[0]} if you want to stay under your calorie limit!`;
                }
                return text;
              }
            })()}
          </p>
        </div>
      </div>

      {/* --- EXISTING: AI PLATE RECOMMENDATION --- */}
      <div>
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">
          🤖 AI Suggested Plate
        </h3>
        <div className="space-y-2">
          {grouped.carb.map((i, idx) => <div key={`c-${idx}`} className="flex justify-between text-sm p-3 bg-orange-50 rounded-xl border border-orange-100"><div><b>{i.servings}x {i.item}</b><br/><span className="text-[10px] text-orange-500 font-bold uppercase">Carb Base</span></div> <span>{i.protein}g</span></div>)}
          {grouped.protein.map((i, idx) => <div key={`p-${idx}`} className="flex justify-between text-sm p-3 bg-red-50 rounded-xl border border-red-100"><div><b>{i.servings}x {i.item}</b><br/><span className="text-[10px] text-red-500 font-bold uppercase">{i.is_limited ? 'Limited' : 'Solid Protein'}</span></div> <span>{i.protein}g</span></div>)}
          {grouped.filler.map((i, idx) => <div key={`f-${idx}`} className="flex justify-between text-sm p-3 bg-green-50 rounded-xl border border-green-100"><div><b>{i.servings}x {i.item}</b><br/><span className="text-[10px] text-green-600 font-bold uppercase">Liquid Fill</span></div> <span>{i.protein}g</span></div>)}
          {grouped.extra.map((i, idx) => <div key={`e-${idx}`} className="flex justify-between text-sm p-3 bg-purple-50 rounded-xl border border-purple-100"><div><b>{i.servings}x {i.item}</b><br/><span className="text-[10px] text-purple-500 font-bold uppercase">Extra Side</span></div> <span>{i.protein}g</span></div>)}
        </div>
      </div>

      <p className="text-[10px] text-gray-400 font-bold uppercase mt-4 text-center">Full Menu: {meal.raw_items.join(', ')}</p>
    </div>
  </div>
);})}
          </div>
        )}
      </main>
    </div>
  );
}