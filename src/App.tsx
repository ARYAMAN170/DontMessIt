import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { ErrorBoundary } from 'react-error-boundary';
import Auth from './Auth';
import Onboarding from './Onboarding';
import ScannedPlateReview from './ScannedPlateReview';
import './App.css';

// Components
import MenuSkeleton from './components/common/MenuSkeleton';
import ErrorFallback from './components/common/ErrorFallback';
import Header from './components/dashboard/Header';
import MacroProgress from './components/dashboard/MacroProgress';
import PlateCard from './components/dashboard/PlateCard';
import ManualLogModal from './components/dashboard/ManualLogModal';
import EditFoodModal from './components/dashboard/EditFoodModal';
import { type DailyMenu, type FoodItem, type OptimizedPlateItem } from './data/types';

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
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn("App: Session check timed out, forcing load completion.");
          setLoadingSession(false);
        }
      }, 5000);

      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) console.error("App error fetching session:", error);

        if (isMounted) {
          const currentSession = data?.session ?? null;
          setSession(currentSession);
          
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (isMounted) {
        setSession(session);
        if (session) await checkProfileStatus(session.user.id);
        setLoadingSession(false); 
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkProfileStatus = async (userId: string) => {
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
        if (error.code === 'PGRST116') {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(true);
        }
        return;
      }

      if (data) {
        if (!data.is_onboarded) {
          setNeedsOnboarding(true);
        } else {
          localStorage.setItem('dontmessit_protein', data.daily_protein_goal?.toString() || '140');
          localStorage.setItem('dontmessit_calories', data.daily_calorie_goal?.toString() || '2600');
          
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
      const hasLocalData = localStorage.getItem('dontmessit_protein');
      if (hasLocalData) {
        setNeedsOnboarding(false);
      } else {
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
      <DontMessItDashboard session={session} />
    </ErrorBoundary>
  );
}

// ==========================================
// 2. THE DASHBOARD COMPONENT (THE ACTUAL APP)
// ==========================================
function DontMessItDashboard({ session }: { session: any }) {
  const [currentMealType, setCurrentMealType] = useState<number>(1);

  // --- STATE FOR UI ---
  const [dailyProteinGoal, setDailyProteinGoal] = useState<number>(() => Number(localStorage.getItem('dontmessit_protein')) || 140);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState<number>(() => Number(localStorage.getItem('dontmessit_calories')) || 2800);
  const [selectedMess, setSelectedMess] = useState(() => localStorage.getItem('dontmessit_mess') || 'men-spc');
  const [userGoal] = useState<'gain_weight' | 'lose_weight'>(() => {
    return (localStorage.getItem('dontmessit_goal') as 'gain_weight' | 'lose_weight') || 'gain_weight';
  });

  // --- TRACKING CONSUMED MACROS ---
  const [consumed, setConsumed] = useState({ calories: 0, protein: 0 });

  useEffect(() => {
    const today = new Date().toDateString();
    const savedData = localStorage.getItem('dontmessit_daily_macros');
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.date === today) {
        setConsumed({ calories: parsed.calories, protein: parsed.protein });
      } else {
        localStorage.removeItem('dontmessit_daily_macros');
      }
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [foodDictionary, setFoodDictionary] = useState<FoodItem[]>([]);
  const [mealsOfDay, setMealsOfDay] = useState<DailyMenu[]>([]);

  // --- DATE NAVIGATION STATE ---
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateForDB = (date: Date) => {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  // --- APP MODE STATE ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [appMode, setAppMode] = useState<'blueprint' | 'explorer'>('blueprint');
  
  // --- THEME STATE ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    }
    return 'dark';
  });

  // --- MANUAL LOG MODAL STATE ---
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualLogCounts, setManualLogCounts] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- GOD MODE: ADMIN STATE & LOGIC ---
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProtein, setEditProtein] = useState<string>('');
  const [editCalories, setEditCalories] = useState<string>('');
  const [editIsLimited, setEditIsLimited] = useState<boolean>(false);
  const [editMaxServings, setEditMaxServings] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // --- AI SCANNER STATE ---
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const isAdmin = session?.user?.email === 'aryaman.singh2022@vitstudent.ac.in';

  const formatUI_Date = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
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
    const isWeekend = date.getDay() === 0 || date.getDay() === 6; 
    
    switch(mealType) {
      case 1: return isWeekend ? "7:30 - 9:30 AM" : "7:00 - 9:00 AM";
      case 2: return "12:30 - 2:30 PM";
      case 3: return "4:30 - 6:15 PM";
      case 4: return "7:00 - 9:00 PM";
      default: return "";
    }
  };

  const logMacros = (newCals: number, newPro: number) => {
    const today = new Date().toDateString();
    const updatedCals = consumed.calories + newCals;
    const updatedPro = consumed.protein + newPro;
    
    setConsumed({ calories: updatedCals, protein: updatedPro });
    
    localStorage.setItem('dontmessit_daily_macros', JSON.stringify({
      date: today,
      calories: updatedCals,
      protein: updatedPro
    }));
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      const hour = new Date().getHours();
      const mealType = hour < 10 ? 1 : hour < 15 ? 2 : hour < 18 ? 3 : 4;
      setCurrentMealType(mealType);
      
      const targetDateStr = formatDateForDB(selectedDate);
      const cacheKeyMenus = `dontmessit_menus_${selectedMess}_${targetDateStr}`;
      const cacheKeyDict = `dontmessit_dictionary`;

      const cachedMenus = localStorage.getItem(cacheKeyMenus);
      const cachedDict = localStorage.getItem(cacheKeyDict);

      if (cachedMenus && cachedDict) {
        setMealsOfDay(JSON.parse(cachedMenus));
        setFoodDictionary(JSON.parse(cachedDict));
        setLoading(false);
      }

      try {
        const [menusResponse, dictResponse] = await Promise.all([
          supabase.from('daily_menus').select('*').eq('date', targetDateStr).eq('mess_id', selectedMess),
          supabase.from('food_dictionary').select('*')
        ]);

        if (menusResponse.data) {
          setMealsOfDay(menusResponse.data);
          localStorage.setItem(cacheKeyMenus, JSON.stringify(menusResponse.data)); 
        }
        
        if (dictResponse.data) {
          setFoodDictionary(dictResponse.data);
          localStorage.setItem(cacheKeyDict, JSON.stringify(dictResponse.data));
        }
      } catch (error) {
        console.warn("Offline or network error, relying entirely on cached data.", error);
      }
      setLoading(false);
    }
    
    fetchData();
  }, [selectedMess, selectedDate]);


  const handleOpenEditModal = (item: FoodItem) => {
    if (navigator.vibrate) navigator.vibrate(50);
    setEditingItem(item);
    setEditProtein(item.protein_per_serving.toString());
    setEditCalories(item.calories_per_serving.toString());
    setEditIsLimited(item.is_limited);
    setEditMaxServings(item.max_servings?.toString() || (item.is_limited ? '1' : '2'));
    setIsEditModalOpen(true);
  };

  const handleUpdateFoodMacro = async () => {
    if (!editingItem) return;
    setIsUpdating(true);

    const updatedProtein = parseFloat(editProtein);
    const updatedCalories = parseInt(editCalories);
    const updatedMaxServings = parseInt(editMaxServings);

    try {
      const { error } = await supabase
        .from('food_dictionary')
        .update({
          protein_per_serving: updatedProtein,
          calories_per_serving: updatedCalories,
          is_limited: editIsLimited,
          max_servings: updatedMaxServings
        })
        .eq('item_name', editingItem.item_name);

      if (error) throw error;
      window.location.reload(); 
      
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
      setIsEditModalOpen(false);
    }
  };

  // --- THE THALI ENGINE ---
  const buildPersonalizedPlate = (rawItems: string[], mealType: number) => {
    if (!foodDictionary.length) return { recommendations: [], total_estimated_protein: 0, total_estimated_calories: 0 };
    
    // SMART MACRO DISTRIBUTION
    let targetMealProtein = 0;
    let targetMealCalories = 0;

    if (mealType === 3) { 
      targetMealProtein = 15;
      targetMealCalories = dailyCalorieGoal * 0.15; 
    } else { 
      targetMealProtein = (dailyProteinGoal - 15) / 3;
      targetMealCalories = (dailyCalorieGoal * 0.85) / 3; 
    }
    
    let currentProtein = 0;
    let totalLiquidServings = 0; 
    let totalCalories = 0;
    const MAX_LIQUIDS_PER_MEAL = 2; 

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

    if (totalCalories < targetMealCalories) {
      const sides = matchedItems.filter(i => i.category === 'healthy_extra' || i.category === 'side');
      let remainingItems = [...sides, ...carbs];

      remainingItems.sort((a, b) => {
        if (userGoal === 'gain_weight') {
          return b.calories_per_serving - a.calories_per_serving; 
        } else {
          return a.calories_per_serving - b.calories_per_serving; 
        }
      });

      remainingItems.forEach(item => {
        while (totalCalories < targetMealCalories) {
          const calsBefore = totalCalories;
          addServing(item, 1);
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
      
      <Header 
        selectedMess={selectedMess}
        setSelectedMess={setSelectedMess}
        selectedDate={selectedDate}
        changeDate={changeDate}
        formatUI_Date={formatUI_Date}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        appMode={appMode}
        setAppMode={setAppMode}
        theme={theme}
        setTheme={setTheme}
        dailyCalorieGoal={dailyCalorieGoal}
        setDailyCalorieGoal={setDailyCalorieGoal}
        dailyProteinGoal={dailyProteinGoal}
        setDailyProteinGoal={setDailyProteinGoal}
        onLogout={() => { setIsMenuOpen(false); supabase.auth.signOut(); }}
      />

      <MacroProgress
        dailyCalorieGoal={dailyCalorieGoal}
        dailyProteinGoal={dailyProteinGoal}
        consumed={consumed}
      />

      {/* MAIN CONTENT AREA */}
      <main className="space-y-6">
        {loading || !foodDictionary.length ? (
             <MenuSkeleton />
        ) : (
          sortedMeals.map((meal) => (
            <PlateCard 
              key={meal.meal_type}
              meal={meal}
              isCurrent={meal.meal_type === currentMealType}
              selectedDate={selectedDate}
              foodDictionary={foodDictionary}
              dailyCalorieGoal={dailyCalorieGoal}
              dailyProteinGoal={dailyProteinGoal}
              userGoal={userGoal}
              appMode={appMode}
              isAdmin={isAdmin}
              manualLogCounts={manualLogCounts}
              setManualLogCounts={setManualLogCounts}
              setConsumed={setConsumed}
              onOpenEditModal={handleOpenEditModal}
              onScanSuccess={(loggedItems) => {
                setScannedItems(loggedItems);
                setIsReviewOpen(true);
              }}
              getMealName={getMealName}
              getMessTimeDisplay={getMessTimeDisplay}
              buildPersonalizedPlate={buildPersonalizedPlate}
            />
          ))
        )}
      </main>

      {/* MANUAL LOG MODAL */}
      <ManualLogModal 
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        sortedMeals={sortedMeals}
        currentMealType={currentMealType}
        manualLogCounts={manualLogCounts}
        setManualLogCounts={setManualLogCounts}
        foodDictionary={foodDictionary}
        setConsumed={setConsumed}
      />

      {/* GOD MODE MODAL */}
      <EditFoodModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingItem={editingItem}
        editProtein={editProtein}
        setEditProtein={setEditProtein}
        editCalories={editCalories}
        setEditCalories={setEditCalories}
        editIsLimited={editIsLimited}
        setEditIsLimited={setEditIsLimited}
        editMaxServings={editMaxServings}
        setEditMaxServings={setEditMaxServings}
        isUpdating={isUpdating}
        onUpdate={handleUpdateFoodMacro}
      />

      {/* AI REVIEW MODAL */}
      {isReviewOpen && (
        <ScannedPlateReview 
          scannedItems={scannedItems}
          foodDictionary={foodDictionary}
          onCancel={() => setIsReviewOpen(false)}
          onConfirm={(finalItems) => {
            console.log("Saving scanned meal:", finalItems);
            
            let totalCals = 0;
            let totalPro = 0;
            finalItems.forEach(item => {
               const dbItem = foodDictionary.find(f => f.item_name === item.item);
               if (dbItem) {
                 totalCals += (dbItem.calories_per_serving * item.servings);
                 totalPro += (dbItem.protein_per_serving * item.servings);
               }
            });

            logMacros(totalCals, totalPro);
            setIsReviewOpen(false);
          }}
        />
      )}
    </div>
  );
}