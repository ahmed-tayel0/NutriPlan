//  SEARCH CONTROLLER 

import TemplateEngine from '../templates/TemplateEngine.js';

export default class SearchController {
  constructor(app) {
    this.app = app;
  }

  setupViewToggle() {
    const gridButton = document.getElementById("grid-view-btn");
    const listButton = document.getElementById("list-view-btn");

    if (gridButton && listButton) {
      gridButton.addEventListener("click", () => this.setViewMode("grid"));
      listButton.addEventListener("click", () => this.setViewMode("list"));
    }
  }

  setViewMode(mode) {
    const gridButton = document.getElementById("grid-view-btn");
    const listButton = document.getElementById("list-view-btn");
    const recipeGrid = document.querySelector("#all-recipes-section .grid");
    if (!recipeGrid) return;

    if (mode === "grid") {
      gridButton?.classList.add("bg-white", "shadow-sm");
      gridButton
        ?.querySelector("i")
        ?.classList.replace("text-gray-500", "text-gray-700");
      listButton?.classList.remove("bg-white", "shadow-sm");
      listButton
        ?.querySelector("i")
        ?.classList.replace("text-gray-700", "text-gray-500");

      recipeGrid.className = "grid grid-cols-4 gap-5";
      recipeGrid.querySelectorAll(".recipe-card").forEach((card) => {
        card.classList.remove("flex", "flex-row", "h-40");
        card.querySelector(".relative")?.classList.remove("w-48", "h-full");
        card.querySelector(".relative")?.classList.add("h-48");
        card.querySelector("img")?.classList.remove("h-full");
        card.querySelector("img")?.classList.add("h-full");
        card
          .querySelector(".relative > .absolute.bottom-3")
          ?.classList.remove("hidden");
      });
    } else {
      listButton?.classList.add("bg-white", "shadow-sm");
      listButton
        ?.querySelector("i")
        ?.classList.replace("text-gray-500", "text-gray-700");
      gridButton?.classList.remove("bg-white", "shadow-sm");
      gridButton
        ?.querySelector("i")
        ?.classList.replace("text-gray-700", "text-gray-500");

      recipeGrid.className = "grid grid-cols-2 gap-4";
      recipeGrid.querySelectorAll(".recipe-card").forEach((card) => {
        card.classList.add("flex", "flex-row", "h-40");
        card.querySelector(".relative")?.classList.add("w-48", "h-full");
        card.querySelector(".relative")?.classList.remove("h-48");
        card
          .querySelector(".relative > .absolute.bottom-3")
          ?.classList.add("hidden");
      });
    }

    this.app.stateManager.updateAppState({ viewMode: mode });
  }

  handleSearch(event) {
    const query = event.target.value.trim();
    clearTimeout(this.app.debounceTimer);

    this.app.debounceTimer = setTimeout(() => {
      if (query.length >= 2) {
        this.performSearch(query);
      } else if (query.length === 0) {
        this.app.loadAllRecipes();
      }
    }, 300);
  }

  async performSearch(query) {
    this.app.stateManager.updateAppState({
      isLoading: true,
      searchQuery: query,
    });

    const recipeGrid = document.querySelector("#all-recipes-section .grid");
    if (recipeGrid)
      recipeGrid.innerHTML = TemplateEngine.createLoadingSpinner();

    try {
      const results = await this.app.mealDbService.searchMealsByName(query);
      this.app.stateManager.updateAppState({
        meals: results,
        isLoading: false,
      });
      this.app.mealsView.renderRecipeGrid(results);

      const resultsLabel = document.querySelector(
        "#all-recipes-section p.text-gray-600",
      );
      if (resultsLabel)
        resultsLabel.textContent = `Showing ${results.length} recipes for "${query}"`;
    } catch (error) {
      console.error("Search error:", error);
      this.app.stateManager.updateAppState({
        isLoading: false,
        error: error.message,
      });
    }
  }
}
