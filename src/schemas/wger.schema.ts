import { z, type ZodSchema } from 'zod';

const exerciseSearch = z
  .object({
    term: z
      .string()
      .min(1)
      .describe('Exercise name to search (e.g. "bench press", "squat", "deadlift", "bicep curl")'),
  })
  .strip();

const exerciseDetails = z
  .object({
    id: z.number().int().describe('Exercise base ID from search results (e.g. 615 for Squats)'),
  })
  .strip();

const ingredients = z
  .object({
    name: z
      .string()
      .min(1)
      .describe('Food ingredient name (e.g. "chicken breast", "rice", "banana", "oats")'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe('Number of results (1-20, default 10)'),
  })
  .strip();

export const wgerSchemas: Record<string, ZodSchema> = {
  'wger.exercise_search': exerciseSearch,
  'wger.exercise_details': exerciseDetails,
  'wger.ingredients': ingredients,
};
