//  FOOD LOG VIEW

import StateManager from "../state/StateManager.js";

export default class FoodLogView {
  constructor(app) {
    this.app = app;
  }

  showFoodLogPage() {
    this.app.toggleSections(
      [
        "search-filters-section",
        "featured-recipes-section",
        "meal-categories-section",
        "all-recipes-section",
      ],
      false,
    );
    this.renderFoodLogSection();
  }

  renderFoodLogSection() {
    let foodLogSection = document.getElementById("foodlog-section");
    if (!foodLogSection) {
      foodLogSection = document.createElement("section");
      foodLogSection.id = "foodlog-section";
      foodLogSection.className = "px-8 py-8 bg-gray-50 min-h-screen";

      const mainContent = document.getElementById("main-content");
      const footer = document.getElementById("footer");
      mainContent.insertBefore(foodLogSection, footer);
    }
    foodLogSection.style.display = "";

    const todaySummary = this.getTodayLogSummary();
    const weeklyData = this.getWeeklyLogData();

    const settings =
      this.app.stateManager.getAppState().userSettings ||
      StateManager.DEFAULT_USER_SETTINGS;
    const goals = {
      dailyCalories: settings.calorieGoal || 2000,
      dailyProtein: settings.proteinGoal || 50,
      dailyCarbs: settings.carbsGoal || 250,
      dailyFat: settings.fatGoal || 65,
    };

    foodLogSection.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold mb-2">
                                <i class="fa-solid fa-clipboard-list mr-2"></i>
                                Daily Food Log
                            </h2>
                            <p class="opacity-90">Track and monitor your daily nutrition intake</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm opacity-80">Today</p>
                            <p class="text-xl font-bold">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
                        </div>
                    </div>
                </div>

                <div id="foodlog-today-section" class="bg-white rounded-2xl p-6 mb-6 border-2 border-gray-200">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">
                        <i class="fa-solid fa-fire text-orange-500 mr-2"></i>
                        Today's Nutrition
                    </h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        ${this.renderNutritionProgress("Calories", todaySummary.totalCalories, goals.dailyCalories, "kcal", "emerald")}
                        ${this.renderNutritionProgress("Protein", todaySummary.totalProtein, goals.dailyProtein, "g", "blue")}
                        ${this.renderNutritionProgress("Carbs", todaySummary.totalCarbs, goals.dailyCarbs, "g", "amber")}
                        ${this.renderNutritionProgress("Fat", todaySummary.totalFat, goals.dailyFat, "g", "purple")}
                    </div>

                    <div class="border-t border-gray-200 pt-4">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="text-sm font-semibold text-gray-700">Logged Items (${todaySummary.meals?.length || 0})</h4>
                            ${
                              todaySummary.meals?.length > 0
                                ? `
                                <button id="clear-foodlog" class="text-red-500 hover:text-red-600 text-sm font-medium">
                                    <i class="fa-solid fa-trash mr-1"></i>Clear All
                                </button>
                            `
                                : ""
                            }
                        </div>

                        ${this.renderLoggedItemsList(todaySummary.meals || [])}
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-6 mb-6 border-2 border-gray-200">
                    <h3 class="text-lg font-bold text-gray-900 mb-4">
                        <i class="fa-solid fa-calendar-week text-indigo-500 mr-2"></i>
                        Weekly Overview
                    </h3>

                    <div class="grid grid-cols-7 gap-2">
                        ${weeklyData
                          .map(
                            (day) => `
                            <div class="text-center ${day.isToday ? "bg-indigo-100 rounded-xl" : ""}">
                                <p class="text-xs text-gray-500 mb-1">${day.dayName}</p>
                                <p class="text-sm font-medium text-gray-900">${day.date}</p>
                                <div class="mt-2 ${day.calories > 0 ? "text-emerald-600" : "text-gray-300"}">
                                    <p class="text-lg font-bold">${day.calories}</p>
                                    <p class="text-xs">kcal</p>
                                </div>
                                ${day.itemCount > 0 ? `<p class="text-xs text-gray-400 mt-1">${day.itemCount} items</p>` : ""}
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-white rounded-xl p-4 border-2 border-gray-200">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-chart-line text-emerald-600 text-xl"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Weekly Average</p>
                                <p class="text-xl font-bold text-gray-900">${weeklyData.reduce((sum, day) => sum + day.calories, 0) > 0 ? Math.round(weeklyData.reduce((sum, day) => sum + day.calories, 0) / 7) : 0} kcal</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl p-4 border-2 border-gray-200">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-utensils text-blue-600 text-xl"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Total Items This Week</p>
                                <p class="text-xl font-bold text-gray-900">${weeklyData.reduce((sum, day) => sum + day.itemCount, 0)} items</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl p-4 border-2 border-gray-200">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <i class="fa-solid fa-bullseye text-purple-600 text-xl"></i>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Days On Goal</p>
                                <p class="text-xl font-bold text-gray-900">${weeklyData.filter((day) => day.calories > 0 && day.calories >= goals.dailyCalories * 0.8 && day.calories <= goals.dailyCalories * 1.2).length} / 7</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    this.setupFoodLogListeners();
  }

  renderNutritionProgress(label, currentAmount, goalAmount, unit, color) {
    const percentage = Math.min(
      Math.round((currentAmount / goalAmount) * 100),
      100,
    );
    const isOverGoal = currentAmount > goalAmount;

    return `
            <div class="bg-gray-50 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">${label}</span>
                    <span class="text-xs ${isOverGoal ? "text-red-500" : `text-${color}-600`}">${percentage}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div class="h-2.5 rounded-full ${isOverGoal ? "bg-red-500" : `bg-${color}-500`}" style="width: ${percentage}%"></div>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold ${isOverGoal ? "text-red-600" : `text-${color}-600`}">${currentAmount} ${unit}</span>
                    <span class="text-gray-400">/ ${goalAmount} ${unit}</span>
                </div>
            </div>
        `;
  }

  renderLoggedItemsList(loggedMeals) {
    if (loggedMeals.length === 0) {
      return `
                <div class="text-center py-12">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fa-solid fa-utensils text-gray-300 text-3xl"></i>
                    </div>
                    <p class="text-gray-500 font-medium mb-2">No food logged today</p>
                    <p class="text-gray-400 text-sm mb-4">Start tracking your nutrition by logging meals or scanning products</p>
                    <div class="flex justify-center gap-3">
                        <a href="#meals" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all">
                            <i class="fa-solid fa-plus"></i>
                            Browse Recipes
                        </a>
                        <a href="/products" class="nav-link inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                            <i class="fa-solid fa-barcode"></i>
                            Scan Product
                        </a>
                    </div>
                </div>
            `;
    }

    return `
            <div class="space-y-3 max-h-96 overflow-y-auto">
                ${loggedMeals
                  .map(
                    (item, index) => `
                    <div class="flex items-center justify-between bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all">
                        <div class="flex items-center gap-4">
                            ${
                              item.type === "meal" && item.thumbnail
                                ? `
                                <img src="${item.thumbnail}" alt="${item.name}" class="w-14 h-14 rounded-xl object-cover"/>
                            `
                                : `
                                <div class="w-14 h-14 ${item.type === "product" ? "bg-blue-100" : "bg-emerald-100"} rounded-xl flex items-center justify-center">
                                    <i class="fa-solid fa-${item.type === "product" ? "box" : "utensils"} ${item.type === "product" ? "text-blue-600" : "text-emerald-600"} text-xl"></i>
                                </div>
                            `
                            }
                            <div>
                                <p class="font-semibold text-gray-900">${item.name}</p>
                                <p class="text-sm text-gray-500">
                                    ${item.type === "meal" ? `${item.servings} serving${item.servings !== 1 ? "s" : ""}` : item.brand || item.serving || "Product"}
                                    <span class="mx-1">•</span>
                                    <span class="${item.type === "product" ? "text-blue-600" : "text-emerald-600"}">${item.type === "product" ? "Product" : "Recipe"}</span>
                                </p>
                                <p class="text-xs text-gray-400 mt-1">${new Date(item.loggedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                                                        <div class="text-right">
                                <p class="text-lg font-bold text-emerald-600">${item.nutrition?.calories || 0}</p>
                                <p class="text-xs text-gray-500">kcal</p>
                            </div>
                            <div class="hidden md:flex gap-2 text-xs text-gray-500">
                                <span class="px-2 py-1 bg-blue-50 rounded">${item.nutrition?.protein || 0}g P</span>
                                <span class="px-2 py-1 bg-amber-50 rounded">${item.nutrition?.carbs || 0}g C</span>
                                <span class="px-2 py-1 bg-purple-50 rounded">${item.nutrition?.fat || 0}g F</span>
                            </div>
                            <button class="remove-foodlog-item text-gray-400 hover:text-red-500 transition-all p-2" data-index="${index}">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `;
  }

  getWeeklyLogData() {
    const dailyLog = this.app.stateManager.getAppState().dailyLog || {};
    const today = new Date();
    const weekData = [];

    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      const dateKey = date.toISOString().split("T")[0];
      const dayLog = dailyLog[dateKey] || { totalCalories: 0, meals: [] };

      weekData.push({
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.getDate(),
        calories: dayLog.totalCalories || 0,
        itemCount: dayLog.meals?.length || 0,
        isToday: daysAgo === 0,
      });
    }

    return weekData;
  }

  setupFoodLogListeners() {
    document.getElementById("clear-foodlog")?.addEventListener("click", () => {
      Swal.fire({
        title: "Clear Today's Log?",
        text: "This will remove all logged food items for today.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, clear it!",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          this.clearTodayLog();
          this.renderFoodLogSection();
          Swal.fire({
            title: "Cleared!",
            text: "Your food log has been cleared.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        }
      });
    });

    document.querySelectorAll(".remove-foodlog-item").forEach((button) => {
      button.addEventListener("click", () => {
        const index = parseInt(button.dataset.index);
        this.removeLoggedItem(index);
        this.renderFoodLogSection();
      });
    });
  }

  updateFoodLogPage() {
    const foodLogSection = document.getElementById("foodlog-section");
    if (foodLogSection && foodLogSection.style.display !== "none") {
      this.renderFoodLogSection();
    }
  }

  getTodayLogSummary() {
    const today = this.app.stateManager.getTodayDateString();
    return (
      (this.app.stateManager.getAppState().dailyLog || {})[today] || {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        meals: [],
      }
    );
  }

  removeLoggedItem(index) {
    const today = this.app.stateManager.getTodayDateString();
    const dailyLog = this.app.stateManager.getAppState().dailyLog || {};
    if (!dailyLog[today] || !dailyLog[today].meals[index]) return;

    const removedItem = dailyLog[today].meals[index];
    dailyLog[today].totalCalories -= Math.round(
      removedItem.nutrition?.calories || 0,
    );
    dailyLog[today].totalProtein -= Math.round(
      removedItem.nutrition?.protein || 0,
    );
    dailyLog[today].totalCarbs -= Math.round(removedItem.nutrition?.carbs || 0);
    dailyLog[today].totalFat -= Math.round(removedItem.nutrition?.fat || 0);

    dailyLog[today].totalCalories = Math.max(0, dailyLog[today].totalCalories);
    dailyLog[today].totalProtein = Math.max(0, dailyLog[today].totalProtein);
    dailyLog[today].totalCarbs = Math.max(0, dailyLog[today].totalCarbs);
    dailyLog[today].totalFat = Math.max(0, dailyLog[today].totalFat);

    dailyLog[today].meals.splice(index, 1);

    this.app.stateManager.updateAppState({ dailyLog }, true);
    this.app.showNotification("Item removed from log", "info");
    this.updateFoodLogPage();
  }

  clearTodayLog() {
    const today = this.app.stateManager.getTodayDateString();
    const dailyLog = this.app.stateManager.getAppState().dailyLog || {};
    dailyLog[today] = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: [],
    };

    this.app.stateManager.updateAppState({ dailyLog }, true);
    this.app.showNotification("Today's log cleared", "info");
    this.updateFoodLogPage();
  }

  logFoodToDaily(product) {
    const today = this.app.stateManager.getTodayDateString();
    const dailyLog = this.app.stateManager.getAppState().dailyLog || {};

    if (!dailyLog[today]) {
      dailyLog[today] = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        meals: [],
      };
    }

    dailyLog[today].totalCalories += Math.round(
      product.nutrition?.calories || 0,
    );
    dailyLog[today].totalProtein += Math.round(product.nutrition?.protein || 0);
    dailyLog[today].totalCarbs += Math.round(product.nutrition?.carbs || 0);
    dailyLog[today].totalFat += Math.round(product.nutrition?.fat || 0);
    dailyLog[today].meals.push({
      type: "product",
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      serving: "100g",
      nutrition: product.nutrition,
      loggedAt: new Date().toISOString(),
    });

    this.app.stateManager.updateAppState({ dailyLog }, true);
    this.app.showNotification(
      `${product.name} logged to your daily intake! 📝`,
      "success",
    );
    this.updateFoodLogPage();
  }

  logMealToDaily(meal, servings, nutrition) {
    const today = this.app.stateManager.getTodayDateString();
    const dailyLog = this.app.stateManager.getAppState().dailyLog || {};

    if (!dailyLog[today]) {
      dailyLog[today] = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        meals: [],
      };
    }

    const loggedNutrition = {
      calories: nutrition
        ? Math.round(nutrition.caloriesPerServing * servings)
        : 0,
      protein: nutrition
        ? Math.round((nutrition.macros?.protein?.amount || 0) * servings)
        : 0,
      carbs: nutrition
        ? Math.round((nutrition.macros?.carbs?.amount || 0) * servings)
        : 0,
      fat: nutrition
        ? Math.round((nutrition.macros?.fat?.amount || 0) * servings)
        : 0,
    };

    dailyLog[today].totalCalories += loggedNutrition.calories;
    dailyLog[today].totalProtein += loggedNutrition.protein;
    dailyLog[today].totalCarbs += loggedNutrition.carbs;
    dailyLog[today].totalFat += loggedNutrition.fat;
    dailyLog[today].meals.push({
      type: "meal",
      name: meal.strMeal,
      mealId: meal.idMeal,
      category: meal.strCategory,
      thumbnail: meal.strMealThumb,
      servings,
      nutrition: loggedNutrition,
      loggedAt: new Date().toISOString(),
    });

    this.app.stateManager.updateAppState({ dailyLog }, true);

    Swal.fire({
      title: "Meal Logged!",
      html: `<p class="text-gray-600">${meal.strMeal} (${servings} serving${servings !== 1 ? "s" : ""}) has been added to your daily log.</p>
                   ${loggedNutrition.calories > 0 ? `<p class="text-emerald-600 font-semibold mt-2">+${loggedNutrition.calories} calories</p>` : ""}`,
      icon: "success",
      confirmButtonColor: "#10b981",
      timer: 2000,
      showConfirmButton: false,
    });

    this.updateFoodLogPage();
  }
}
