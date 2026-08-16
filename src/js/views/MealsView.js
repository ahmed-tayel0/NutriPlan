//  MEALS VIEW

import TemplateEngine from "../templates/TemplateEngine.js";

export default class MealsView {
  constructor(app) {
    this.app = app;
  }

  showMealsPage() {
    this.app.toggleSections(
      [
        "search-filters-section",
        "meal-categories-section",
        "all-recipes-section",
      ],
      true,
    );
    this.app.toggleSections(["featured-recipes-section"], false);

    this.renderCategories();
    this.renderRecipeGrid(this.app.stateManager.getAppState().meals);
    this.renderAreaFilters();
  }

  renderCategories() {
    const categoriesSection = document.getElementById(
      "meal-categories-section",
    );
    if (!categoriesSection) return;

    const grid = categoriesSection.querySelector(".grid");
    if (!grid) return;

    grid.className = "grid grid-cols-6 gap-3";
    const categories = this.app.stateManager.getAppState().categories || [];
    grid.innerHTML = categories
      .slice(0, 12)
      .map((category) => TemplateEngine.createCategoryCard(category))
      .join("");
  }

  renderRecipeGrid(meals) {
    const grid = document.querySelector("#all-recipes-section .grid");
    if (!grid) return;

    if (!meals || meals.length === 0) {
      grid.innerHTML = TemplateEngine.createEmptyState(
        "No recipes found. Try a different search term.",
      );
      return;
    }

    grid.innerHTML = meals
      .map((meal) => TemplateEngine.createMealCard(meal))
      .join("");

    const resultsLabel = document.querySelector(
      "#all-recipes-section p.text-gray-600",
    );
    if (resultsLabel)
      resultsLabel.textContent = `Showing ${meals.length} recipes`;
  }

  renderAreaFilters() {
    const filterContainer = document.querySelector(
      "#search-filters-section .flex.items-center.gap-3",
    );
    if (!filterContainer) return;

    const areas = this.app.stateManager.getAppState().areas || [];
    const selectedArea = this.app.stateManager.getAppState().selectedArea;
    filterContainer.innerHTML = TemplateEngine.createAreaFilters(
      areas.slice(0, 10),
      selectedArea,
    );
  }
  async filterByCategory(category) {
    this.app.stateManager.updateAppState({
      selectedCategory: category,
      isLoading: true,
    });

    const grid = document.querySelector("#all-recipes-section .grid");
    if (grid) grid.innerHTML = TemplateEngine.createLoadingSpinner();

    try {
      const summaryList =
        await this.app.mealDbService.filterMealsByCategory(category);
      const fullMeals = await Promise.all(
        summaryList
          .slice(0, 20)
          .map((meal) => this.app.mealDbService.getMealById(meal.idMeal)),
      );
      const validMeals = fullMeals.filter((meal) => meal);

      this.app.stateManager.updateAppState({
        meals: validMeals,
        isLoading: false,
      });
      this.renderRecipeGrid(validMeals);

      const resultsLabel = document.querySelector(
        "#all-recipes-section p.text-gray-600",
      );
      if (resultsLabel)
        resultsLabel.textContent = `Showing ${validMeals.length} ${category} recipes`;
    } catch (error) {
      console.error("Filter error:", error);
      this.app.stateManager.updateAppState({ isLoading: false });
    }
  }

  async filterByArea(area) {
    this.app.stateManager.updateAppState({
      selectedArea: area,
      isLoading: true,
    });

    document.querySelectorAll(".area-filter-btn").forEach((button) => {
      if (button.dataset.area === area) {
        button.classList.add("bg-emerald-600", "text-white");
        button.classList.remove("bg-gray-100", "text-gray-700");
      } else {
        button.classList.remove("bg-emerald-600", "text-white");
        button.classList.add("bg-gray-100", "text-gray-700");
      }
    });

    const grid = document.querySelector("#all-recipes-section .grid");
    if (grid) grid.innerHTML = TemplateEngine.createLoadingSpinner();

    try {
      let meals;
      if (area) {
        const summaryList =
          await this.app.mealDbService.filterMealsByArea(area);
        const fullMeals = await Promise.all(
          summaryList
            .slice(0, 20)
            .map((meal) => this.app.mealDbService.getMealById(meal.idMeal)),
        );
        meals = fullMeals.filter((meal) => meal);
      } else {
        meals = await this.app.mealDbService.searchMealsByName("chicken");
      }

      this.app.stateManager.updateAppState({ meals, isLoading: false });
      this.renderRecipeGrid(meals);

      const resultsLabel = document.querySelector(
        "#all-recipes-section p.text-gray-600",
      );
      if (resultsLabel) {
        resultsLabel.textContent = area
          ? `Showing ${meals.length} ${area} recipes`
          : `Showing ${meals.length} recipes`;
      }
    } catch (error) {
      console.error("Filter error:", error);
      this.app.stateManager.updateAppState({ isLoading: false });
    }
  }
}
