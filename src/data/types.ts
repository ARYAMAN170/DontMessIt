export interface OptimizedPlateItem {
  item: string;
  servings: number;
  unit: string;
  protein: number;
  calories: number;
  is_limited: boolean;
  category: string;
  type?: string; 
}

export interface DailyMenu {
  date: string;
  meal_type: number;
  mess_id: string;
  raw_items: string[];
}

export interface FoodItem {
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

export const MESS_OPTIONS = [
  { id: 'men-spc', label: 'Men Special' },
  { id: 'men-veg', label: 'Men Veg' },
  { id: 'men-nv', label: 'Men Non-Veg' },
  { id: 'wmn-spc', label: 'Women Special' },
  { id: 'wmn-veg', label: 'Women Veg' },
  { id: 'wmn-nv', label: 'Women Non-Veg' },
];
