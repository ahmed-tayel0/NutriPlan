//  2. MEALDB SERVICE 

import BaseApiService from './BaseApiService.js';

export default class MealDbService extends BaseApiService {
  constructor() {
    super("https://www.themealdb.com/api/json/v1/1");
  }

  async searchMealsByName(query) {
    try {
      const response = await this.fetch(
        `/search.php?s=${encodeURIComponent(query)}`,
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error searching meals by name:", error);
      return [];
    }
  }

  async filterMealsByCategory(category) {
    try {
      const response = await this.fetch(
        `/filter.php?c=${encodeURIComponent(category)}`,
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error filtering meals by category:", error);
      return [];
    }
  }

  async filterMealsByArea(area) {
    try {
      const response = await this.fetch(
        `/filter.php?a=${encodeURIComponent(area)}`,
      );
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error filtering meals by area:", error);
      return [];
    }
  }

  async getAllCategories() {
    const cached = this._getCached("categories");
    if (cached) return cached;

    try {
      const response = await this.fetch(`/categories.php`);
      const data = await response.json();
      const categories = data.categories || [];
      this._setCached("categories", categories);
      return categories;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }

  async getAreaList() {
    const cached = this._getCached("areas");
    if (cached) return cached;

    try {
      const response = await this.fetch(`/list.php?a=list`);
      const data = await response.json();
      const areas = data.meals || [];
      this._setCached("areas", areas);
      return areas;
    } catch (error) {
      console.error("Error fetching area list:", error);
      return [];
    }
  }

  async getMealById(mealId) {
    try {
      const response = await this.fetch(`/lookup.php?i=${mealId}`);
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.error("Error fetching meal by ID:", error);
      return null;
    }
  }

  static extractIngredientsList(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredientName = meal[`strIngredient${i}`];
      const measureAmount = meal[`strMeasure${i}`];
      if (ingredientName && ingredientName.trim()) {
        ingredients.push({
          ingredient: ingredientName.trim(),
          measure: measureAmount ? measureAmount.trim() : "",
        });
      }
    }
    return ingredients;
  }

  static parseInstructionSteps(instructionsText) {
    if (!instructionsText) return [];

    const rawLines = instructionsText.split(/(?:\r\n|\r|\n)+/);

    const cleanSteps = [];
    for (const line of rawLines) {
      let step = line.trim();
      if (step.length === 0) continue;

      step = step.replace(/^\d+[.)]\s*/, "");

      const isJustAStepLabel =
        /^step\s*\d+\.?$/i.test(step) || /^\d+\.?$/.test(step);
      if (isJustAStepLabel) continue;

      if (step.length > 5) {
        cleanSteps.push(step);
      }
    }
    return cleanSteps;
  }
}
