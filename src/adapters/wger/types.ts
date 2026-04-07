// ---------------------------------------------------------------------------
// Normalized output types
// ---------------------------------------------------------------------------

export interface ExerciseSearchResult {
  id: number;
  name: string;
  category: string;
}

export interface WgerExerciseSearchOutput {
  total: number;
  results: ExerciseSearchResult[];
}

export interface WgerExerciseDetailOutput {
  id: number;
  name: string;
  description: string;
  category: string;
  muscles: string[];
  muscles_secondary: string[];
  equipment: string[];
}

export interface IngredientResult {
  id: number;
  name: string;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_g: number | null;
}

export interface WgerIngredientsOutput {
  total: number;
  results: IngredientResult[];
}
