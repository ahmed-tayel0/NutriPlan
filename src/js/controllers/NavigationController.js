//  NAVIGATION CONTROLLER

import { slugify } from "../utils/Helpers.js";

export default class NavigationController {
  constructor(app) {
    this.app = app;
    this.basePath = "/NutriPlan";
  }

  setupRouting() {
    window.addEventListener("popstate", () => {
      const route = this.navigationController.getPageFromURL();
      if (route.type === "meal-detail") {
        this.navigationController.loadMealFromSlug(route.slug);
      } else {
        this.navigationController.navigateTo(
          route.type === "meals" ? "meals" : route.type,
        );
      }
    });
  }

  getPageFromURL() {
    const path = window.location.pathname
      .replace(this.basePath, "")
      .replace(/^\//, "")
      .replace(/\/$/, "");

    if (path.startsWith("meal/")) {
      return { type: "meal-detail", slug: path.replace("meal/", "") };
    }
    return { type: this.app.routes[path] || "meals", slug: null };
  }

  async loadMealFromSlug(slug) {
    try {
      const searchText = slug.replace(/-/g, " ");
      const matchingMeals =
        await this.app.mealDbService.searchMealsByName(searchText);

      if (matchingMeals && matchingMeals.length > 0) {
        const exactMatch = matchingMeals.find(
          (meal) => slugify(meal.strMeal) === slug,
        );
        const meal = exactMatch || matchingMeals[0];

        this.app.stateManager.updateAppState({ selectedMealId: meal.idMeal });
        this.renderPage("meal-detail");
        this.updateActiveNavLink("meals");
      } else {
        this.navigateTo("meals");
      }
    } catch (error) {
      console.error("Error loading meal from URL:", error);
      this.navigateTo("meals");
    }
  }

  navigateTo(page) {
    let path;
    if (page === "meals") {
      path = `${this.basePath}/home`;
    } else {
      path = `${this.basePath}/${page}`;
    }

    if (window.location.pathname !== path) {
      window.history.pushState({ page }, "", path);
    }
    this.renderPage(page);
    this.updateActiveNavLink(page);
  }

  navigateToMeal(meal) {
    const path = `${this.basePath}/meal/${slugify(meal.strMeal)}`;
    this.app.stateManager.updateAppState({ selectedMealId: meal.idMeal });
    window.history.pushState(
      { page: "meal-detail", mealId: meal.idMeal },
      "",
      path,
    );
    this.renderPage("meal-detail");
    this.updateActiveNavLink("meals");
  }

  updateActiveNavLink(activePage) {
    document.querySelectorAll("#sidebar nav a").forEach((link) => {
      const labelText =
        link.querySelector("span")?.textContent?.toLowerCase() || "";

      let linkPage = "meals";
      if (labelText.includes("meals") || labelText.includes("recipes")) {
        linkPage = "meals";
      } else if (labelText.includes("settings")) {
        linkPage = "settings";
      } else if (
        labelText.includes("products") ||
        labelText.includes("barcode") ||
        labelText.includes("scan")
      ) {
        linkPage = "products";
      } else if (labelText.includes("food log") || labelText.includes("log")) {
        linkPage = "foodlog";
      }

      const span = link.querySelector("span");
      if (linkPage === activePage) {
        link.classList.add("bg-emerald-50", "text-emerald-700");
        link.classList.remove("text-gray-600", "hover:bg-gray-50");
        span?.classList.add("font-semibold");
        span?.classList.remove("font-medium");
      } else {
        link.classList.remove("bg-emerald-50", "text-emerald-700");
        link.classList.add("text-gray-600", "hover:bg-gray-50");
        span?.classList.remove("font-semibold");
        span?.classList.add("font-medium");
      }
    });
  }

  handleNavigation(event) {
    event.preventDefault();
    const labelText =
      event.currentTarget.querySelector("span")?.textContent?.toLowerCase() ||
      "";

    let targetPage = "meals";
    if (labelText.includes("meals") || labelText.includes("recipes")) {
      targetPage = "meals";
    } else if (labelText.includes("settings")) {
      targetPage = "settings";
    } else if (
      labelText.includes("products") ||
      labelText.includes("barcode") ||
      labelText.includes("scan")
    ) {
      targetPage = "products";
    } else if (labelText.includes("food log") || labelText.includes("log")) {
      targetPage = "foodlog";
    }

    this.navigateTo(targetPage);
  }

  renderPage(page) {
    this.app.currentPage = page;

    this.updateHeader(page);

    [
      "settings-section",
      "products-section",
      "meal-detail-section",
      "foodlog-section",
    ].forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.style.display = "none";
    });

    switch (page) {
      case "meals":
        this.app.mealsView.showMealsPage();
        break;
      case "settings":
        this.app.settingsView.showSettingsPage();
        break;
      case "products":
        this.app.productsView.showProductsPage();
        break;
      case "foodlog":
        this.app.foodLogView.showFoodLogPage();
        break;
      case "meal-detail":
        this.app.mealDetailView.showMealDetailPage();
        break;
    }
  }

  updateHeader(page) {
    const titleElement = document.querySelector("#header h1");
    const subtitleElement = document.querySelector("#header p");

    const headerText = {
      meals: {
        title: "Meals & Recipes",
        subtitle: "Discover delicious and nutritious recipes tailored for you",
      },
      settings: {
        title: "Settings",
        subtitle: "Customize your goals and preferences",
      },
      products: {
        title: "Product Scanner",
        subtitle: "Search packaged foods by name or barcode",
      },
      foodlog: {
        title: "Food Log",
        subtitle: "Track your daily nutrition and food intake",
      },
      "meal-detail": {
        title: "Recipe Details",
        subtitle: "View full recipe information and nutrition facts",
      },
    };

    if (titleElement && headerText[page])
      titleElement.textContent = headerText[page].title;
    if (subtitleElement && headerText[page])
      subtitleElement.textContent = headerText[page].subtitle;
  }
}
