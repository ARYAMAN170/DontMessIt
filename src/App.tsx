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
  const [activeView, setActiveView] = useState<'menu' | 'nutrition'>('menu');
  const [showSettings, setShowSettings] = useState(false);

  const [dailyProteinGoal, setDailyProteinGoal] = useState<number>(() => Number(localStorage.getItem('dontmessit_protein')) || 140);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(() => Number(localStorage.getItem('dontmessit_calories')) || 2800);

  const [selectedMess, setSelectedMess] = useState(() => localStorage.getItem('dontmessit_mess') || 'men-spc');

  const getMealName = (type: number) => {
    switch (type) {
      case 1: return "Breakfast";
      case 2: return "Lunch";
      case 3: return "Snacks";
      case 4: return "Dinner";
      default: return "Unknown";
    }
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const hour = new Date().getHours();
      const mealType = hour < 10 ? 1 : hour < 15 ? 2 : hour < 18 ? 3 : 4;
      setCurrentMealType(mealType);
      
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); 

      try {
        const [menusResponse, dictResponse] = await Promise.all([
          supabase.from('daily_menus').select('*').eq('date', todayStr).eq('mess_id', selectedMess),
          supabase.from('food_dictionary').select('*')
        ]);

        if (menusResponse.data) setMealsOfDay(menusResponse.data);
        if (dictResponse.data) setFoodDictionary(dictResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    }
    fetchData();
  }, [selectedMess]);

  // --- THE THALI ENGINE (GROUPS MEALS LOGICALLY) ---
  const buildPersonalizedPlate = (rawItems: string[]) => {
  if (!foodDictionary.length) return { recommendations: [], total_estimated_protein: 0 };

  const targetMealProtein = dailyProteinGoal / 4; 
  let currentProtein = 0;
  const plateMap = new Map<string, OptimizedPlateItem>();

  const matchedItems = rawItems
    .map(rawItem => foodDictionary.find(dict => dict.item_name.toLowerCase() === rawItem.toLowerCase()))
    .filter((item): item is FoodItem => item !== undefined);

  // Helper to add servings safely
  const addServings = (item: FoodItem, count: number) => {
    const max = item.is_limited ? (item.max_servings || 1) : (item.max_servings || 3);
    const existing = plateMap.get(item.item_name)?.servings || 0;
    const canAdd = Math.min(count, max - existing);
    if (canAdd <= 0) return;

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

  // --- NEW ROUND-ROBIN LOGIC ---

  // 1. Mandatory Base (1 Carb + 1 Healthy Extra/Fruit)
  const carbs = matchedItems.filter(i => i.category === 'carb_main');
  const healthy = matchedItems.filter(i => i.category === 'healthy_extra' || i.category === 'side');
  if (carbs.length > 0) addServings(carbs[0], 1);
  if (healthy.length > 0) addServings(healthy[0], 1);

  // 2. Round 1: Take exactly ONE serving of every protein and liquid
  const proteins = matchedItems.filter(i => i.category === 'protein_main').sort((a,b) => b.protein_per_serving - a.protein_per_serving);
  const liquids = matchedItems.filter(i => i.category === 'liquid_side').sort((a,b) => b.protein_per_serving - a.protein_per_serving);

  [...proteins, ...liquids].forEach(item => {
    if (currentProtein < targetMealProtein) addServings(item, 1);
  });

  // --- GOAL SPECIFIC LOGIC (Phase 1.5) ---
  const userGoal = localStorage.getItem('dontmessit_goal') || 'maintain';
  
  // Define categories for goals 
  // (Note: 'carbs' and 'healthy' are defined above)
  const dairyItems = matchedItems.filter(i => /curd|milk|lassi|buttermilk/i.test(i.item_name));
  // If specific named dairy not found, fallback to generic liquids (usually dal/curd)
  const dairyFallback = dairyItems.length ? dairyItems : liquids;

  const denseCarbs = carbs.filter(i => /pulao|paratha|poori|biryani/i.test(i.item_name));
  // Fallback for dense carbs if none found (e.g. use any carb)
  const denseCarbsFallback = denseCarbs.length ? denseCarbs : carbs;

  const volumeVeggies = healthy.filter(i => /salad|cucumber|onion|tomato|green/i.test(i.item_name));
  // Fallback, use any side/healthy dish
  const volumeVeggiesFallback = volumeVeggies.length ? volumeVeggies : healthy;

  const cleanCarbs = carbs.filter(i => /rice|phulka|chapati|roti/i.test(i.item_name));
  // Fallback to any carb
  const cleanCarbsFallback = cleanCarbs.length ? cleanCarbs : carbs;

  if (userGoal === 'gain_weight') {
      // 1. Grab liquid calories first (Curd, Milk) - easy to consume!
      if (dairyFallback.length > 0) addServings(dairyFallback[0], 2); 
      // 2. Grab dense carbs (Pulao, Parathas) to hit the calorie surplus
      if (denseCarbsFallback.length > 0) addServings(denseCarbsFallback[0], 1);
  } else if (userGoal === 'lose_weight') {
      // 1. Grab fibrous volume foods (Salads, Veggies) to fill the stomach
      if (volumeVeggiesFallback.length > 0) addServings(volumeVeggiesFallback[0], 2);
      // 2. Grab a small portion of a clean carb (Plain Rice, Phulka)
      if (cleanCarbsFallback.length > 0) addServings(cleanCarbsFallback[0], 1);
  }

  // 3. Round 2: If still short, take extra servings of the dense proteins
  if (currentProtein < targetMealProtein) {
    proteins.forEach(item => {
      if (currentProtein < targetMealProtein) {
        const needed = targetMealProtein - currentProtein;
        addServings(item, Math.ceil(needed / item.protein_per_serving));
      }
    });
  }

  // 4. Round 3: Final filler (More Liquid/Dal)
  if (currentProtein < targetMealProtein) {
    liquids.forEach(item => {
      if (currentProtein < targetMealProtein) {
        const needed = targetMealProtein - currentProtein;
        addServings(item, Math.ceil(needed / item.protein_per_serving));
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
          <p className="text-gray-500 font-medium mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <select value={selectedMess} onChange={(e) => { setSelectedMess(e.target.value); localStorage.setItem('dontmessit_mess', e.target.value); }} className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg shadow-sm text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
          {MESS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </header>

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

      {/* Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
        <button onClick={() => setActiveView('menu')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${activeView === 'menu' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Plan</button>
        <button onClick={() => setActiveView('nutrition')} className={`flex-1 py-2 text-sm font-bold rounded-lg ${activeView === 'nutrition' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>DB</button>
      </div>

      <main>
        {loading ? <div className="animate-pulse flex h-32 items-center justify-center">Loading...</div> : activeView === 'menu' ? (
          <div className="space-y-6">
            {sortedMeals.map((meal) => {
              const isCurrent = meal.meal_type === currentMealType;
              const customPlate = buildPersonalizedPlate(meal.raw_items);
              const grouped = {
                carb: customPlate.recommendations.filter(i => i.category === 'carb_main'),
                protein: customPlate.recommendations.filter(i => i.category === 'protein_main'),
                filler: customPlate.recommendations.filter(i => i.category === 'liquid_side')
              };

              return (
                <div key={meal.meal_type} className={`bg-white rounded-3xl shadow-sm border overflow-hidden ${isCurrent ? 'border-blue-500 shadow-xl scale-[1.02]' : 'opacity-80'}`}>
                  <div className={`p-4 flex justify-between ${isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                    <h2 className="text-xl font-black italic uppercase">{getMealName(meal.meal_type)}</h2>
                    <span className="text-xl font-black">+{customPlate.total_estimated_protein}g</span>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    {grouped.carb.map((i, idx) => <div key={idx} className="flex justify-between text-sm p-3 bg-orange-50 rounded-xl border border-orange-100"><b>{i.servings}x {i.item}</b> <span>{i.protein}g</span></div>)}
                    {grouped.protein.map((i, idx) => <div key={idx} className="flex justify-between text-sm p-3 bg-red-50 rounded-xl border border-red-100"><div><b>{i.servings}x {i.item}</b><br/><span className="text-[10px] text-red-500 font-bold uppercase">Limited</span></div> <span>{i.protein}g</span></div>)}
                    {grouped.filler.map((i, idx) => <div key={idx} className="flex justify-between text-sm p-3 bg-green-50 rounded-xl border border-green-100"><div><b>{i.servings}x {i.item}</b><br/><span className="text-[10px] text-green-600 font-bold uppercase tracking-tight">Unlimited Fill</span></div> <span>{i.protein}g</span></div>)}
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-4">Full Menu: {meal.raw_items.join(', ')}</p>
                    {isCurrent && <button className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg mt-4 uppercase tracking-widest">Log Meal</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl divide-y overflow-hidden shadow-sm">
            {foodDictionary.map(item => (
              <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div><p className="font-bold text-sm text-gray-800">{item.item_name}</p><p className="text-[10px] text-gray-400 capitalize">{item.category.replace('_', ' ')}</p></div>
                <div className="text-right"><p className="font-black text-green-600 text-sm">{item.protein_per_serving}g</p><p className="text-[10px] text-orange-500">{item.calories_per_serving} kcal</p></div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}