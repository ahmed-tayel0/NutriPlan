# NutriPlan — Food, Nutrition & Fitness Planner

NutriPlan is a fully-implemented, vanilla JavaScript (ES6 Modules) web app for
browsing recipes, scanning packaged products, and logging daily nutrition.
The starter's TODO list is complete — this document describes what was
actually built and how the codebase is organized.

## 🎯 Project Overview

NutriPlan pulls recipe data from TheMealDB, packaged-product data from Open
Food Facts, and recipe nutrition estimates from an external nutrition API,
then ties it all together with a class-based, OOP architecture: services →
state → templates → controllers/views → app.

## 📁 Project Structure

```
nutriplan/
├── index.html                       # Main HTML file (bring your own — not included in this refactor)
├── main.js                          # Entry point — instantiates NutriPlanApp on DOMContentLoaded
└── src/
    ├── services/
    │   ├── BaseApiService.js        # Shared fetch/cache logic (extended by every API service)
    │   ├── MealDbService.js         # TheMealDB recipe API
    │   ├── NutritionService.js      # Recipe nutrition analysis + caching
    │   └── ProductService.js        # Open Food Facts product/barcode API
    ├── state/
    │   └── StateManager.js          # Single source of truth + observer pattern + localStorage persistence
    ├── templates/
    │   ├── TemplateEngine.js        # Aggregator exposing TemplateEngine.xxx() static methods
    │   ├── MealTemplates.js         # Recipe card & cuisine/area filter markup
    │   ├── CategoryTemplates.js     # Category color styling & category card markup
    │   └── ProductTemplates.js      # Product card, detail modal, category button markup
    ├── controllers/
    │   ├── NutriPlanApp.js          # Core orchestrator — owns services/state, wires up the app
    │   ├── NavigationController.js  # Routing, browser history, page dispatch
    │   ├── SearchController.js      # Search input, debounce, grid/list view toggle
    │   └── ModalController.js       # Log-meal modal & product-detail modal
    ├── views/
    │   ├── MealsView.js             # Meals/recipes landing page
    │   ├── MealDetailView.js        # Recipe detail page (hero, ingredients, instructions, nutrition)
    │   ├── ProductsView.js          # Product search & barcode scanner page
    │   ├── SettingsView.js          # User goals & preferences page
    │   └── FoodLogView.js           # Daily/weekly nutrition log page
    └── utils/
        ├── Helpers.js               # slugify() and other pure utility functions
        └── Constants.js             # STORAGE_KEYS, DEFAULT_USER_SETTINGS
```

> Load it with `<script type="module" src="main.js"></script>` from your `index.html`.

## 🏗️ Architecture

- **`NutriPlanApp`** is the composition root: it constructs `MealDbService`,
  `NutritionService`, `ProductService`, and `StateManager`, then instantiates
  every controller and view, passing itself in as `app` so they can reach
  shared services, state, and each other.
- **Controllers** own cross-cutting behavior that isn't tied to a single
  page: navigation/routing, search, and modals.
- **Views** own one page or section each and are responsible for rendering
  it and wiring up its own event listeners.
- **Services** extend `BaseApiService`, which centralizes `fetch`, JSON
  parsing, and per-instance response caching.
- **`StateManager`** is the single source of truth for app state (current
  page, search query, categories/areas/meals, user settings, daily log). It
  persists `userSettings` and `dailyLog` to `localStorage` and notifies
  subscribers via `subscribe()` and a `stateChange` custom event.
- **`TemplateEngine`** re-exports the modular template functions as static
  methods, so call sites like `TemplateEngine.createMealCard(meal)` work
  the same way everywhere they're used.

## 🔗 API Reference

### TheMealDB API (Free, No API Key Required)

Base URL: `https://www.themealdb.com/api/json/v1/1/`

| Endpoint                   | Description            | Example                                                                |
| -------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `/categories.php`          | Get all categories     | [Try it](https://www.themealdb.com/api/json/v1/1/categories.php)       |
| `/search.php?s={query}`    | Search meals by name   | [Try it](https://www.themealdb.com/api/json/v1/1/search.php?s=chicken) |
| `/lookup.php?i={id}`       | Get meal by ID         | [Try it](https://www.themealdb.com/api/json/v1/1/lookup.php?i=52772)   |
| `/filter.php?c={category}` | Filter by category     | [Try it](https://www.themealdb.com/api/json/v1/1/filter.php?c=Seafood) |
| `/filter.php?a={area}`     | Filter by area/cuisine | [Try it](https://www.themealdb.com/api/json/v1/1/filter.php?a=Italian) |
| `/list.php?a=list`         | Get area list          | [Try it](https://www.themealdb.com/api/json/v1/1/list.php?a=list)      |

Handled in `MealDbService`, with `extractIngredientsList()` and
`parseInstructionSteps()` as static helpers for normalizing a raw meal
record into a clean ingredient list and step array.

### Open Food Facts (Product & Barcode Lookup)

Handled in `ProductService`: search by name/category, barcode lookup,
Nutri-Score and NOVA-group classification helpers
(`getNutriScoreInfo`, `getNovaGroupInfo`), and a fallback product generator
for offline/error states.

### Nutrition Analysis API

Handled in `NutritionService`: turns a recipe name + ingredient list into
per-serving calories, macros (protein/carbs/fat/fiber/sugar/saturated fat),
daily-value percentages, and diet/health labels, with an in-memory cache
keyed by recipe so repeated views don't re-fetch.

## ✅ Implemented Features

### Meals

- Category grid, cuisine/area filter chips, and a live-searching recipe grid
- Grid/list view toggle
- Full recipe detail page: hero image, ingredients, step-by-step
  instructions, and a nutrition breakdown with daily-value progress bars

### Product Scanner

- Search products by name, filter by Nutri-Score, browse popular categories
- Barcode lookup
- Product detail modal with nutrition facts and a "log to today" action

### Food Log

- Today's calorie/macro progress against goals set in Settings
- Logged-items list with per-item removal and a "clear today" action
- Weekly log summary
- Log a meal (with adjustable servings) or a scanned product directly to
  today's log

### Settings

- Calorie, macro, and water goals; weight/height/age/gender/activity level
- Changes persist to `localStorage` via `StateManager`

### Navigation

- Client-side routing with real URLs (`/home`, `/settings`, `/products`,
  `/foodlog`, `/meal/<slug>`), browser back/forward support via
  `popstate`, and active-link highlighting in the sidebar

## 🎨 Key HTML Elements

### Meals Page

| Element ID                 | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `#app-loading-overlay`     | Loading screen, hidden once initial data loads |
| `#meal-categories-section` | Category cards container                       |
| `#all-recipes-section`     | Recipe grid container                          |
| `#search-filters-section`  | Search input + area filter chips               |

### Product Scanner Page

| Element ID              | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `#products-section`     | Product scanner page container (toggled) |
| `#product-search-input` | Product name search input                |
| `#barcode-input`        | Barcode number input                     |
| `#search-product-btn`   | Product search button                    |
| `#lookup-barcode-btn`   | Barcode lookup button                    |
| `#products-grid`        | Product cards container                  |
| `.nutri-score-filter`   | Nutri-Score filter buttons               |
| `.product-category-btn` | Popular category buttons                 |

### Food Log Page

| Element ID           | Purpose                           |
| -------------------- | --------------------------------- |
| `#foodlog-section`   | Food log page container (toggled) |
| `#logged-items-list` | Logged food items container       |
| `#clear-foodlog`     | Clear all logged items button     |

### Meal Detail Page

| Element ID             | Purpose                              |
| ---------------------- | ------------------------------------ |
| `#meal-detail-section` | Meal detail page container (toggled) |
| `#back-to-meals-btn`   | Returns to the meals page            |
| `.close-detail-btn`    | Closes the meal detail view          |

## 🧩 Extending the App

- **New page/section** → add a `views/YourView.js` class that takes `app`
  in its constructor, instantiate it in `NutriPlanApp`'s constructor, and
  add a case for it in `NavigationController.renderPage()`.
- **New API** → add a `services/YourService.js` extending `BaseApiService`,
  instantiate it in `NutriPlanApp`, and expose it via a getter
  (`get yourService() { return this.#yourService; }`) so views/controllers
  can reach it through `this.app.yourService`.
- **New shared UI fragment** → add it to the relevant `templates/*.js` file
  and re-export it as a static method on `TemplateEngine` if other files
  call it that way.

## 💡 Notes for Contributors

1. **Private fields don't cross files.** `NutriPlanApp` keeps its services
   and state as `#privateFields` and exposes them via getters; every other
   controller/view reaches them through `this.app.*` rather than holding
   private fields of their own for shared data.
2. **`toggleSections()` and `showNotification()`** live on `NutriPlanApp`
   itself since nearly every view uses them — call as `this.app.toggleSections(...)`.
3. **Daily-log mutations** (`logFoodToDaily`, `logMealToDaily`) live in
   `FoodLogView`, even when triggered from the product or meal-detail
   modals, since that's the natural owner of daily-log state.
4. **DOM IDs, Tailwind classes, and method names are stable** across the
   codebase — if you're hooking up new HTML, match the existing naming
   conventions in the tables above.
