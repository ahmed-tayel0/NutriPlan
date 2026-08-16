//  3. NUTRITION ANALYSIS SERVICE

import BaseApiService from "./BaseApiService.js";

export default class NutritionService extends BaseApiService {
  #apiKey;
  #recipeNutritionCache;

  constructor() {
    super("https://nutriplan-api.vercel.app/api");
    this.#apiKey = "qVdChEauj6UJ5NThudlFky059WQfTYp2EWT5BOHJ";
    this.#recipeNutritionCache = new Map();
  }

  async analyzeRecipeNutrition(recipeName, ingredientsList) {
    const cacheKey = `recipe_${recipeName}_${ingredientsList.join("|")}`;
    if (this.#recipeNutritionCache.has(cacheKey)) {
      return this.#recipeNutritionCache.get(cacheKey);
    }

    try {
      const response = await this.fetch(`/nutrition/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.#apiKey,
        },
        body: JSON.stringify({ recipeName, ingredients: ingredientsList }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Nutrition API error:", errorBody);
        throw new Error(
          errorBody.error?.message || `API error: ${response.status}`,
        );
      }

      const result = await response.json();
      if (!result.success) {
        console.error("API returned failure:", result);
        throw new Error(
          result.error?.message || result.error || "Analysis failed",
        );
      }

      const nutritionData = result.data;

      const formattedResult = {
        uri: `nutriplan://nutrition/${Date.now()}`,
        yield: nutritionData.servings,
        calories: nutritionData.totals.calories,
        totalWeight: nutritionData.totalWeight,
        dietLabels: [],
        healthLabels: [],
        cautions: [],
        totals: nutritionData.totals,
        perServing: nutritionData.perServing,
        totalNutrients: {
          ENERC_KCAL: {
            label: "Energy",
            quantity: nutritionData.totals.calories,
            unit: "kcal",
          },
          FAT: { label: "Fat", quantity: nutritionData.totals.fat, unit: "g" },
          FASAT: {
            label: "Saturated Fat",
            quantity: nutritionData.totals.saturatedFat,
            unit: "g",
          },
          CHOCDF: {
            label: "Carbohydrates",
            quantity: nutritionData.totals.carbs,
            unit: "g",
          },
          FIBTG: {
            label: "Fiber",
            quantity: nutritionData.totals.fiber,
            unit: "g",
          },
          SUGAR: {
            label: "Sugars",
            quantity: nutritionData.totals.sugar,
            unit: "g",
          },
          PROCNT: {
            label: "Protein",
            quantity: nutritionData.totals.protein,
            unit: "g",
          },
          CHOLE: {
            label: "Cholesterol",
            quantity: nutritionData.totals.cholesterol,
            unit: "mg",
          },
          NA: {
            label: "Sodium",
            quantity: nutritionData.totals.sodium,
            unit: "mg",
          },
        },
        totalDaily: this.calculateDailyValuePercentages(nutritionData.totals),
        ingredients: nutritionData.ingredients.map((item) => ({
          text: item.original,
          food: item.matched?.description || item.parsed?.foodName,
          grams: item.grams,
          calories: item.nutrition?.calories || 0,
          protein: item.nutrition?.protein || 0,
          fat: item.nutrition?.fat || 0,
          carbs: item.nutrition?.carbs || 0,
        })),
      };

      this.#recipeNutritionCache.set(cacheKey, formattedResult);
      return formattedResult;
    } catch (error) {
      console.error("Error analyzing recipe:", error);
      return this.getFallbackNutritionData(recipeName, ingredientsList);
    }
  }

  calculateDailyValuePercentages(totals) {
    const recommendedDailyValues = {
      calories: 2000,
      fat: 65,
      saturatedFat: 20,
      carbs: 300,
      fiber: 25,
      protein: 50,
      cholesterol: 300,
      sodium: 2400,
    };

    return {
      ENERC_KCAL: {
        label: "Energy",
        quantity: Math.round(
          (totals.calories / recommendedDailyValues.calories) * 100,
        ),
        unit: "%",
      },
      FAT: {
        label: "Fat",
        quantity: Math.round((totals.fat / recommendedDailyValues.fat) * 100),
        unit: "%",
      },
      FASAT: {
        label: "Saturated Fat",
        quantity: Math.round(
          (totals.saturatedFat / recommendedDailyValues.saturatedFat) * 100,
        ),
        unit: "%",
      },
      CHOCDF: {
        label: "Carbohydrates",
        quantity: Math.round(
          (totals.carbs / recommendedDailyValues.carbs) * 100,
        ),
        unit: "%",
      },
      FIBTG: {
        label: "Fiber",
        quantity: Math.round(
          (totals.fiber / recommendedDailyValues.fiber) * 100,
        ),
        unit: "%",
      },
      PROCNT: {
        label: "Protein",
        quantity: Math.round(
          (totals.protein / recommendedDailyValues.protein) * 100,
        ),
        unit: "%",
      },
      CHOLE: {
        label: "Cholesterol",
        quantity: Math.round(
          (totals.cholesterol / recommendedDailyValues.cholesterol) * 100,
        ),
        unit: "%",
      },
      NA: {
        label: "Sodium",
        quantity: Math.round(
          (totals.sodium / recommendedDailyValues.sodium) * 100,
        ),
        unit: "%",
      },
    };
  }

  getFallbackNutritionData(recipeName, ingredientsList) {
    console.warn("Using fallback nutrition data");
    const roughCalorieGuess = ingredientsList.length * 100;

    return {
      uri: `fallback://nutrition/${Date.now()}`,
      yield: 4,
      calories: roughCalorieGuess,
      totalWeight: ingredientsList.length * 100,
      dietLabels: [],
      healthLabels: [],
      cautions: [],
      totalNutrients: {
        ENERC_KCAL: {
          label: "Energy",
          quantity: roughCalorieGuess,
          unit: "kcal",
        },
        FAT: { label: "Fat", quantity: 0, unit: "g" },
        FASAT: { label: "Saturated Fat", quantity: 0, unit: "g" },
        CHOCDF: { label: "Carbohydrates", quantity: 0, unit: "g" },
        FIBTG: { label: "Fiber", quantity: 0, unit: "g" },
        SUGAR: { label: "Sugars", quantity: 0, unit: "g" },
        PROCNT: { label: "Protein", quantity: 0, unit: "g" },
        CHOLE: { label: "Cholesterol", quantity: 0, unit: "mg" },
        NA: { label: "Sodium", quantity: 0, unit: "mg" },
      },
      totalDaily: {},
      ingredients: ingredientsList.map((text) => ({
        text,
        food: "Unknown",
        grams: 100,
        calories: 100,
        protein: 0,
        fat: 0,
        carbs: 0,
        notFound: true,
      })),
    };
  }

  formatNutritionForDisplay(nutritionData) {
    if (!nutritionData) return null;

    const servings = nutritionData.yield || 4;
    const perServing = nutritionData.perServing;
    const totals = nutritionData.totals;

    if (perServing && totals) {
      return {
        servings,
        caloriesPerServing: perServing.calories,
        totalCalories: totals.calories,
        macros: {
          protein: {
            amount: perServing.protein,
            dailyValue: Math.round((perServing.protein / 50) * 100),
          },
          carbs: {
            amount: perServing.carbs,
            dailyValue: Math.round((perServing.carbs / 300) * 100),
          },
          fat: {
            amount: perServing.fat,
            dailyValue: Math.round((perServing.fat / 65) * 100),
          },
          fiber: {
            amount: perServing.fiber,
            dailyValue: Math.round((perServing.fiber / 25) * 100),
          },
          sugar: { amount: perServing.sugar, dailyValue: 0 },
          saturatedFat: {
            amount: perServing.saturatedFat,
            dailyValue: Math.round((perServing.saturatedFat / 20) * 100),
          },
        },
        other: {
          cholesterol: perServing.cholesterol,
          sodium: perServing.sodium,
        },
        dietLabels: nutritionData.dietLabels || [],
        healthLabels: nutritionData.healthLabels || [],
      };
    }

    const nutrients = nutritionData.totalNutrients || {};
    const dailyValues = nutritionData.totalDaily || {};

    return {
      servings,
      caloriesPerServing: Math.round((nutritionData.calories || 0) / servings),
      totalCalories: Math.round(nutritionData.calories || 0),
      macros: {
        protein: {
          amount: Math.round((nutrients.PROCNT?.quantity || 0) / servings),
          dailyValue: Math.round(
            (dailyValues.PROCNT?.quantity || 0) / servings,
          ),
        },
        carbs: {
          amount: Math.round((nutrients.CHOCDF?.quantity || 0) / servings),
          dailyValue: Math.round(
            (dailyValues.CHOCDF?.quantity || 0) / servings,
          ),
        },
        fat: {
          amount: Math.round((nutrients.FAT?.quantity || 0) / servings),
          dailyValue: Math.round((dailyValues.FAT?.quantity || 0) / servings),
        },
        fiber: {
          amount: Math.round((nutrients.FIBTG?.quantity || 0) / servings),
          dailyValue: Math.round((dailyValues.FIBTG?.quantity || 0) / servings),
        },
        sugar: {
          amount: Math.round((nutrients.SUGAR?.quantity || 0) / servings),
          dailyValue: 0,
        },
        saturatedFat: {
          amount: Math.round((nutrients.FASAT?.quantity || 0) / servings),
          dailyValue: Math.round((dailyValues.FASAT?.quantity || 0) / servings),
        },
      },
      other: {
        cholesterol: Math.round((nutrients.CHOLE?.quantity || 0) / servings),
        sodium: Math.round((nutrients.NA?.quantity || 0) / servings),
      },
      dietLabels: nutritionData.dietLabels || [],
      healthLabels: nutritionData.healthLabels || [],
    };
  }
}
