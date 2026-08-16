//  MEAL DETAIL VIEW

import MealDbService from "../services/MealDbService.js";
import TemplateEngine from "../templates/TemplateEngine.js";
import { slugify } from "../utils/Helpers.js";

export default class MealDetailView {
  constructor(app) {
    this.app = app;
  }

  async showMealDetail(mealId) {
    this.app.stateManager.updateAppState({
      selectedMealId: mealId,
      isLoading: true,
    });

    try {
      const meal = await this.app.mealDbService.getMealById(mealId);
      if (meal) {
        const path = `/meal/${slugify(meal.strMeal)}`;
        if (window.location.pathname !== path) {
          window.history.pushState({ page: "meal-detail", mealId }, "", path);
        }
      }
    } catch (error) {
      console.error("Error fetching meal for URL:", error);
    }

    this.app.navigationController.renderPage("meal-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async showMealDetailPage() {
    this.app.toggleSections(
      [
        "search-filters-section",
        "featured-recipes-section",
        "meal-categories-section",
        "all-recipes-section",
      ],
      false,
    );

    let detailSection = document.getElementById("meal-detail-section");
    if (!detailSection) {
      detailSection = document.createElement("section");
      detailSection.id = "meal-detail-section";
      detailSection.className = "px-8 py-6 bg-gray-50 min-h-screen";

      const mainContent = document.getElementById("main-content");
      const footer = document.getElementById("footer");
      mainContent.insertBefore(detailSection, footer);
    }
    detailSection.style.display = "";

    const mealId = this.app.stateManager.getAppState().selectedMealId;
    if (!mealId) {
      detailSection.innerHTML = `
                <div class="max-w-6xl mx-auto">
                    <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors">
                        <i class="fa-solid fa-arrow-left"></i>
                        <span>Back to Recipes</span>
                    </button>
                    ${TemplateEngine.createEmptyState("No recipe selected. Please select a recipe to view details.", "fa-utensils")}
                </div>
            `;
      document
        .getElementById("back-to-meals-btn")
        ?.addEventListener("click", () =>
          this.app.navigationController.navigateTo("meals"),
        );
      return;
    }

    try {
      const meal = await this.app.mealDbService.getMealById(mealId);
      if (!meal) throw new Error("Meal not found");

      const ingredients = MealDbService.extractIngredientsList(meal);
      const instructions = MealDbService.parseInstructionSteps(
        meal.strInstructions,
      );

      this.app.stateManager.updateAppState({
        selectedMeal: meal,
        isLoading: false,
      });
      detailSection.innerHTML = this.createMealDetailPageContent(
        meal,
        null,
        ingredients,
        instructions,
      );
      this.setupMealDetailPageListeners(meal, ingredients);
      this.loadNutritionData(meal, ingredients);
    } catch (error) {
      console.error("Error loading meal detail:", error);
      this.app.stateManager.updateAppState({ isLoading: false });
      detailSection.innerHTML = `
                <div class="max-w-6xl mx-auto">
                    <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors">
                        <i class="fa-solid fa-arrow-left"></i>
                        <span>Back to Recipes</span>
                    </button>
                    ${TemplateEngine.createEmptyState("Failed to load recipe details. Please try again.", "fa-exclamation-circle")}
                </div>
            `;
      document
        .getElementById("back-to-meals-btn")
        ?.addEventListener("click", () =>
          this.app.navigationController.navigateTo("meals"),
        );
    }
  }

  async loadNutritionData(meal, ingredients) {
    const nutritionContainer = document.getElementById(
      "nutrition-facts-container",
    );
    if (!nutritionContainer) return;

    try {
      const ingredientLines = ingredients.map(
        (item) => `${item.measure} ${item.ingredient}`,
      );
      const rawNutritionData =
        await this.app.nutritionService.analyzeRecipeNutrition(
          meal.strMeal,
          ingredientLines,
        );
      const formattedNutrition =
        this.app.nutritionService.formatNutritionForDisplay(rawNutritionData);

      const nutritionCache =
        this.app.stateManager.getAppState().mealNutritionCache || {};
      nutritionCache[meal.idMeal] = formattedNutrition;
      this.app.stateManager.updateAppState({
        mealNutritionCache: nutritionCache,
      });

      nutritionContainer.innerHTML =
        this.createNutritionContent(formattedNutrition);

      const heroCalories = document.getElementById("hero-calories");
      const heroServings = document.getElementById("hero-servings");
      if (heroCalories)
        heroCalories.textContent = `${formattedNutrition.caloriesPerServing} cal/serving`;
      if (heroServings)
        heroServings.textContent = `${formattedNutrition.servings} servings`;

      const logMealButton = document.getElementById("log-meal-btn");
      if (logMealButton) {
        logMealButton.disabled = false;
        logMealButton.className =
          "flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all cursor-pointer";
        logMealButton.title = "";
        logMealButton.innerHTML = `
                    <i class="fa-solid fa-clipboard-list"></i>
                    <span>Log This Meal</span>
                `;
      }
    } catch (error) {
      console.error("Error loading nutrition data:", error);

      nutritionContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fa-solid fa-exclamation-circle text-3xl text-red-400 mb-3"></i>
                    <p class="text-gray-600">Unable to load nutrition data</p>
                    <button id="retry-nutrition-btn" class="mt-3 text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                        <i class="fa-solid fa-refresh mr-1"></i> Try Again
                    </button>
                </div>
            `;

      const heroCalories = document.getElementById("hero-calories");
      if (heroCalories) heroCalories.textContent = "N/A";

      const logMealButton = document.getElementById("log-meal-btn");
      if (logMealButton) {
        logMealButton.className =
          "flex items-center gap-2 px-6 py-3 bg-red-100 text-red-500 rounded-xl font-semibold cursor-not-allowed transition-all";
        logMealButton.title =
          'Nutrition data failed to load. Click "Try Again" in the nutrition section.';
        logMealButton.innerHTML = `
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <span>Unavailable</span>
                `;
      }

      document
        .getElementById("retry-nutrition-btn")
        ?.addEventListener("click", () => {
          nutritionContainer.innerHTML = this.createNutritionLoadingState();

          const heroCaloriesRetry = document.getElementById("hero-calories");
          if (heroCaloriesRetry)
            heroCaloriesRetry.textContent = "Calculating...";

          const logMealButtonRetry = document.getElementById("log-meal-btn");
          if (logMealButtonRetry) {
            logMealButtonRetry.disabled = true;
            logMealButtonRetry.className =
              "flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-xl font-semibold cursor-not-allowed transition-all";
            logMealButtonRetry.title = "Waiting for nutrition data...";
            logMealButtonRetry.innerHTML = `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <span>Calculating...</span>
                    `;
          }

          this.loadNutritionData(meal, ingredients);
        });
    }
  }

  createNutritionLoadingState() {
    return `
            <div class="text-center py-8">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
                    <i class="fa-solid fa-calculator text-emerald-600 text-xl animate-pulse"></i>
                </div>
                <p class="text-gray-700 font-medium mb-1">Calculating Nutrition</p>
                <p class="text-sm text-gray-500">Analyzing ingredients...</p>
                <div class="mt-4 flex justify-center">
                    <div class="flex space-x-1">
                        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                        <div class="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                    </div>
                </div>
            </div>
        `;
  }

  createNutritionContent(nutrition) {
    return `
            <p class="text-sm text-gray-500 mb-4">Per serving</p>

            <div class="text-center py-4 mb-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                <p class="text-sm text-gray-600">Calories per serving</p>
                <p class="text-4xl font-bold text-emerald-600">${nutrition.caloriesPerServing}</p>
                <p class="text-xs text-gray-500 mt-1">Total: ${nutrition.totalCalories} cal</p>
            </div>

            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span class="text-gray-700">Protein</span>
                    </div>
                    <span class="font-bold text-gray-900">${nutrition.macros.protein.amount}g</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-emerald-500 h-2 rounded-full" style="width: ${Math.min(nutrition.macros.protein.dailyValue, 100)}%"></div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span class="text-gray-700">Carbs</span>
                    </div>
                    <span class="font-bold text-gray-900">${nutrition.macros.carbs.amount}g</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${Math.min(nutrition.macros.carbs.dailyValue, 100)}%"></div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span class="text-gray-700">Fat</span>
                    </div>
                    <span class="font-bold text-gray-900">${nutrition.macros.fat.amount}g</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-purple-500 h-2 rounded-full" style="width: ${Math.min(nutrition.macros.fat.dailyValue, 100)}%"></div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span class="text-gray-700">Fiber</span>
                    </div>
                    <span class="font-bold text-gray-900">${nutrition.macros.fiber.amount}g</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-orange-500 h-2 rounded-full" style="width: ${Math.min(nutrition.macros.fiber.dailyValue, 100)}%"></div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-pink-500"></div>
                        <span class="text-gray-700">Sugar</span>
                    </div>
                    <span class="font-bold text-gray-900">${nutrition.macros.sugar.amount}g</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-pink-500 h-2 rounded-full" style="width: ${Math.min(Math.round((nutrition.macros.sugar.amount / 50) * 100), 100)}%"></div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-red-500"></div>
                        <span class="text-gray-700">Saturated Fat</span>
                    </div>
                    <span class="font-bold text-gray-900">${nutrition.macros.saturatedFat.amount}g</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="bg-red-500 h-2 rounded-full" style="width: ${Math.min(nutrition.macros.saturatedFat.dailyValue, 100)}%"></div>
                </div>
            </div>

            <div class="mt-6 pt-6 border-t border-gray-100">
                <h3 class="text-sm font-semibold text-gray-900 mb-3">Other</h3>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Cholesterol</span>
                        <span class="font-medium">${nutrition.other.cholesterol}mg</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Sodium</span>
                        <span class="font-medium">${nutrition.other.sodium}mg</span>
                    </div>
                </div>
            </div>
        `;
  }

  createMealDetailPageContent(meal, nutrition, ingredients, instructions) {
    return `
            <div class="max-w-6xl mx-auto">
                <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>Back to Recipes</span>
                </button>

                <div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
                    <div class="relative h-80 md:h-96">
                        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="w-full h-full object-cover"/>
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                        <div class="absolute bottom-0 left-0 right-0 p-8">
                            <div class="flex items-center gap-3 mb-3">
                                ${meal.strCategory ? `<span class="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">${meal.strCategory}</span>` : ""}
                                ${meal.strArea ? `<span class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">${meal.strArea}</span>` : ""}
                                ${
                                  meal.strTags
                                    ? meal.strTags
                                        .split(",")
                                        .slice(0, 2)
                                        .map(
                                          (tag) =>
                                            `<span class="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded-full">${tag.trim()}</span>`,
                                        )
                                        .join("")
                                    : ""
                                }
                            </div>
                            <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">${meal.strMeal}</h1>
                            <div class="flex items-center gap-6 text-white/90">
                                <span class="flex items-center gap-2">
                                    <i class="fa-solid fa-clock"></i>
                                    <span>30 min</span>
                                </span>
                                <span class="flex items-center gap-2">
                                    <i class="fa-solid fa-utensils"></i>
                                    <span id="hero-servings">${nutrition?.servings || 4} servings</span>
                                </span>
                                <span class="flex items-center gap-2">
                                    <i class="fa-solid fa-fire"></i>
                                    <span id="hero-calories">${nutrition ? nutrition.caloriesPerServing + " cal/serving" : "Calculating..."}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap gap-3 mb-8">
                    <button id="log-meal-btn" class="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-xl font-semibold cursor-not-allowed transition-all" data-meal-id="${meal.idMeal}" disabled title="Waiting for nutrition data...">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <span>Calculating...</span>
                    </button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div class="lg:col-span-2 space-y-8">
                        <div class="bg-white rounded-2xl shadow-lg p-6">
                            <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <i class="fa-solid fa-list-check text-emerald-600"></i>
                                Ingredients
                                <span class="text-sm font-normal text-gray-500 ml-auto">${ingredients.length} items</span>
                            </h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                ${ingredients
                                  .map(
                                    (item) => `
                                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
                                        <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300"/>
                                        <span class="text-gray-700">
                                            <span class="font-medium text-gray-900">${item.measure}</span> ${item.ingredient}
                                        </span>
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>

                        <div class="bg-white rounded-2xl shadow-lg p-6">
                            <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <i class="fa-solid fa-shoe-prints text-emerald-600"></i>
                                Instructions
                            </h2>
                            <div class="space-y-4">
                                ${instructions
                                  .map(
                                    (step, index) => `
                                    <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                        <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                                            ${index + 1}
                                        </div>
                                        <p class="text-gray-700 leading-relaxed pt-2">${step}</p>
                                    </div>
                                `,
                                  )
                                  .join("")}
                            </div>
                        </div>

                        ${
                          meal.strYoutube
                            ? `
                        <div class="bg-white rounded-2xl shadow-lg p-6">
                            <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <i class="fa-solid fa-video text-red-500"></i>
                                Video Tutorial
                            </h2>
                            <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                                <iframe
                                    src="https://www.youtube.com/embed/${meal.strYoutube.split("v=")[1]}"
                                    class="absolute inset-0 w-full h-full"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen>
                                </iframe>
                            </div>
                        </div>
                        `
                            : ""
                        }
                    </div>

                    <div class="space-y-6">
                        <div class="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                            <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <i class="fa-solid fa-chart-pie text-emerald-600"></i>
                                Nutrition Facts
                            </h2>
                            <div id="nutrition-facts-container">
                                ${nutrition ? this.createNutritionContent(nutrition) : this.createNutritionLoadingState()}
                            </div>
                        </div>

                        ${
                          meal.strSource
                            ? `
                        <div class="bg-white rounded-2xl shadow-lg p-6">
                            <h3 class="text-sm font-semibold text-gray-900 mb-2">Recipe Source</h3>
                            <a href="${meal.strSource}" target="_blank" class="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-2">
                                <i class="fa-solid fa-external-link"></i>
                                View Original Recipe
                            </a>
                        </div>
                        `
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
  }

  setupMealDetailPageListeners(meal, ingredients) {
    document
      .getElementById("back-to-meals-btn")
      ?.addEventListener("click", () =>
        this.app.navigationController.navigateTo("meals"),
      );
    document
      .getElementById("log-meal-btn")
      ?.addEventListener("click", () =>
        this.app.modalController.showLogMealModal(meal),
      );
  }

  closeMealDetail() {
    this.app.navigationController.navigateTo("meals");
    this.app.stateManager.updateAppState({
      selectedMeal: null,
      selectedMealId: null,
    });
  }
}
