//  7. MAIN APPLICATION

import MealDbService from "../services/MealDbService.js";
import NutritionService from "../services/NutritionService.js";
import ProductService from "../services/ProductService.js";
import StateManager from "../state/StateManager.js";

import NavigationController from "./NavigationController.js";
import SearchController from "./SearchController.js";
import ModalController from "./ModalController.js";

import MealsView from "../views/MealsView.js";
import MealDetailView from "../views/MealDetailView.js";
import ProductsView from "../views/ProductsView.js";
import SettingsView from "../views/SettingsView.js";
import FoodLogView from "../views/FoodLogView.js";

export default class NutriPlanApp {
  #mealDbService;
  #nutritionService;
  #productService;
  #stateManager;
  #currentPage;
  #debounceTimer;
  #loadStartTime;
  #minLoadDuration;

  constructor() {
    this.#mealDbService = new MealDbService();
    this.#nutritionService = new NutritionService();
    this.#productService = new ProductService();
    this.#stateManager = new StateManager();
    this.#currentPage = "meals";
    this.#debounceTimer = null;
    this.#loadStartTime = Date.now();
    this.#minLoadDuration = 1000;

    this.routes = {
      "": "home",
      home: "meals",
      meals: "meals",
      settings: "settings",
      products: "products",
      foodlog: "foodlog",
    };

    // Controllers 
    this.navigationController = new NavigationController(this);
    this.searchController = new SearchController(this);
    this.modalController = new ModalController(this);

    // Views 
    this.mealsView = new MealsView(this);
    this.mealDetailView = new MealDetailView(this);
    this.productsView = new ProductsView(this);
    this.settingsView = new SettingsView(this);
    this.foodLogView = new FoodLogView(this);

    this.init();
  }

  // Public accessors for shared services & state 
  

  get mealDbService() {
    return this.#mealDbService;
  }

  get nutritionService() {
    return this.#nutritionService;
  }

  get productService() {
    return this.#productService;
  }

  get stateManager() {
    return this.#stateManager;
  }

  get currentPage() {
    return this.#currentPage;
  }

  set currentPage(page) {
    this.#currentPage = page;
  }

  get debounceTimer() {
    return this.#debounceTimer;
  }

  set debounceTimer(timer) {
    this.#debounceTimer = timer;
  }

  async init() {
    const overlay = document.getElementById("app-loading-overlay");
    if (overlay) {
      overlay.style.display = "flex";
      overlay.style.opacity = "1";
      overlay.classList.remove("hidden", "opacity-0");
    }

    this.setupEventListeners();
    this.navigationController.setupRouting();

    if (window.location.pathname === "/" || window.location.pathname === "") {
      window.history.replaceState({ page: "meals" }, "", "/home");
    }

    try {
      await this.loadInitialData();

      const currentRoute = this.navigationController.getPageFromURL();
      if (currentRoute.type === "meal-detail" && currentRoute.slug) {
        await this.navigationController.loadMealFromSlug(currentRoute.slug);
      } else {
        this.navigationController.renderPage(currentRoute.type);
        this.navigationController.updateActiveNavLink(currentRoute.type);
      }
    } catch (error) {
      console.error("App initialization error:", error);
    } finally {
      this.hideLoadingOverlay();
    }
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById("app-loading-overlay");
    if (!overlay) return;

    const elapsed = Date.now() - this.#loadStartTime;
    const remaining = Math.max(0, this.#minLoadDuration - elapsed);

    setTimeout(() => {
      overlay.classList.add("transition-opacity", "duration-500", "ease-out");
      overlay.style.opacity = "0";

      setTimeout(() => {
        overlay.style.display = "none";
      }, 500);
    }, remaining);
  }

  setupEventListeners() {
    document.querySelectorAll("#sidebar nav a").forEach((link) => {
      link.addEventListener("click", (event) =>
        this.navigationController.handleNavigation(event),
      );
    });

    const searchInput = document.querySelector(
      '#search-filters-section input[type="text"]',
    );
    if (searchInput) {
      searchInput.addEventListener("input", (event) =>
        this.searchController.handleSearch(event),
      );
      searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          this.searchController.performSearch(event.target.value);
        }
      });
    }

    this.searchController.setupViewToggle();

    document.addEventListener("click", (event) =>
      this.handleGlobalClick(event),
    );

    document.addEventListener("click", (e) => {
      const targetLink = e.target.closest("a");

      if (targetLink) {
        const href = targetLink.getAttribute("href");

        if (href) {
          if (href.includes("#")) {
            e.preventDefault();
            const targetPage = href.split("#")[1];

            if (targetPage && this.routes[targetPage]) {
              window.history.pushState({ page: targetPage }, "", href);
              this.navigationController.renderPage(targetPage);
              this.navigationController.updateActiveNavLink(targetPage);
              window.scrollTo(0, 0);
            }
          } else if (href.startsWith("/")) {
            e.preventDefault();
            const targetPage = href.replace("/", "");

            if (targetPage && this.routes[targetPage]) {
              const formattedUrl = `/foodlog#${targetPage}`;

              window.history.pushState({ page: targetPage }, "", formattedUrl);
              this.navigationController.renderPage(targetPage);
              this.navigationController.updateActiveNavLink(targetPage);
              window.scrollTo(0, 0);
            }
          }
        }
      }
    });
  }

  handleGlobalClick(event) {
    const recipeCard = event.target.closest(".recipe-card");
    if (recipeCard) {
      this.mealDetailView.showMealDetail(recipeCard.dataset.mealId);
    }

    const categoryCard = event.target.closest(".category-card");
    if (categoryCard) {
      this.mealsView.filterByCategory(categoryCard.dataset.category);
    }

    const areaFilterButton = event.target.closest(".area-filter-btn");
    if (areaFilterButton) {
      this.mealsView.filterByArea(areaFilterButton.dataset.area);
    }

    if (event.target.closest(".close-detail-btn")) {
      this.mealDetailView.closeMealDetail();
    }
  }

  async loadInitialData() {
    try {
      const categories = await this.#mealDbService.getAllCategories();
      this.#stateManager.updateAppState({ categories });

      const areas = await this.#mealDbService.getAreaList();
      this.#stateManager.updateAppState({ areas });

      const defaultMeals =
        await this.#mealDbService.searchMealsByName("chicken");
      this.#stateManager.updateAppState({ meals: defaultMeals });
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  }

  async loadAllRecipes() {
    const results = await this.#mealDbService.searchMealsByName("");
    if (results.length === 0) {
      const defaultMeals =
        await this.#mealDbService.searchMealsByName("chicken");
      this.#stateManager.updateAppState({ meals: defaultMeals });
      this.mealsView.renderRecipeGrid(defaultMeals);
    } else {
      this.#stateManager.updateAppState({ meals: results });
      this.mealsView.renderRecipeGrid(results);
    }
  }

  toggleSections(sectionIds, shouldShow) {
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.style.display = shouldShow ? "" : "none";
    });
  }

  showNotification(message, type = "info") {
    const colorByType = {
      success: "bg-emerald-500",
      error: "bg-red-500",
      info: "bg-blue-500",
      warning: "bg-amber-500",
    };

    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 ${colorByType[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 toast-notification`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}
