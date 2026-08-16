//  1. BASE API SERVICE (Base Class for all HTTP APIs)

class BaseApiService {
  #baseUrl;
  #cache;

  constructor(baseUrl) {
    this.#baseUrl = baseUrl;
    this.#cache = new Map();
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.#baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error(`[${this.constructor.name}] Error:`, error);
      throw error;
    }
  }

  async fetchJson(endpoint, options = {}) {
    const response = await this.fetch(endpoint, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }

  _getCacheKey(key) {
    return `${this.constructor.name}_${key}`;
  }

  _getCached(key) {
    return this.#cache.get(this._getCacheKey(key));
  }

  _setCached(key, value) {
    this.#cache.set(this._getCacheKey(key), value);
  }

  _clearCache() {
    this.#cache.clear();
  }
}

//  2. MEALDB SERVICE (TheMealDB Recipe API)

class MealDbService extends BaseApiService {
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

//  3. NUTRITION ANALYSIS SERVICE

class NutritionService extends BaseApiService {
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

//  4. PRODUCT SERVICE (Open Food Facts Product API)

class ProductService extends BaseApiService {
  constructor() {
    super("https://world.openfoodfacts.org");
  }

  async searchProducts(searchOptions = {}) {
    try {
      const params = new URLSearchParams({
        page: searchOptions.page || 1,
        page_size: searchOptions.pageSize || 24,
        json: 1,
        ...(searchOptions.searchTerms && {
          search_terms: searchOptions.searchTerms,
        }),
        ...(searchOptions.categories && {
          categories_tags_en: searchOptions.categories,
        }),
        ...(searchOptions.nutritionGrade && {
          nutrition_grades_tags: searchOptions.nutritionGrade,
        }),
      });

      const response = await this.fetch(`/cgi/search.pl?${params}`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      return {
        count: data.count || 0,
        page: data.page || 1,
        pageSize: data.page_size || 24,
        products: (data.products || []).map(ProductService.formatProductData),
      };
    } catch (error) {
      console.error("Error searching products:", error);
      return ProductService.getFallbackProductData(searchOptions);
    }
  }

  async getProductByBarcode(barcode) {
    try {
      const response = await this.fetch(`/api/v0/product/${barcode}.json`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      return data.status === 0
        ? null
        : ProductService.formatProductData(data.product);
    } catch (error) {
      console.error("Error fetching product by barcode:", error);
      return null;
    }
  }

  async getProductsByCategory(categoryId, page = 1, pageSize = 24) {
    try {
      const response = await this.fetch(
        `/category/${encodeURIComponent(categoryId)}.json?page=${page}&page_size=${pageSize}`,
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      return {
        count: data.count || 0,
        page: data.page || 1,
        products: (data.products || []).map(ProductService.formatProductData),
      };
    } catch (error) {
      console.error("Error fetching products by category:", error);
      return { count: 0, page: 1, products: [] };
    }
  }

  static async getPopularCategories() {
    return [
      {
        id: "breakfast_cereals",
        name: "Breakfast Cereals",
        icon: "fa-wheat-awn",
      },
      { id: "beverages", name: "Beverages", icon: "fa-bottle-water" },
      { id: "snacks", name: "Snacks", icon: "fa-cookie" },
      { id: "dairy", name: "Dairy Products", icon: "fa-cheese" },
      { id: "fruits", name: "Fruits", icon: "fa-apple-whole" },
      { id: "vegetables", name: "Vegetables", icon: "fa-carrot" },
      { id: "breads", name: "Breads", icon: "fa-bread-slice" },
      { id: "meats", name: "Meats", icon: "fa-drumstick-bite" },
      { id: "frozen_foods", name: "Frozen Foods", icon: "fa-snowflake" },
      { id: "sauces", name: "Sauces & Condiments", icon: "fa-jar" },
    ];
  }

  static formatProductData(rawProduct) {
    return {
      barcode: rawProduct.code || rawProduct._id,
      name:
        rawProduct.product_name ||
        rawProduct.product_name_en ||
        "Unknown Product",
      brand: rawProduct.brands || "",
      categories: rawProduct.categories || "",
      image: rawProduct.image_front_url || rawProduct.image_url || null,
      thumbnailImage:
        rawProduct.image_front_small_url || rawProduct.image_small_url || null,
      nutritionGrade:
        rawProduct.nutrition_grades || rawProduct.nutrition_grade_fr || null,
      novaGroup: rawProduct.nova_group || null,
      ecoscore: rawProduct.ecoscore_grade || null,
      ingredients:
        rawProduct.ingredients_text || rawProduct.ingredients_text_en || "",
      allergens: rawProduct.allergens || "",
      quantity: rawProduct.quantity || "",
      servingSize: rawProduct.serving_size || "",
      nutrition: {
        calories:
          rawProduct.nutriments?.["energy-kcal_100g"] ||
          rawProduct.nutriments?.energy_100g ||
          0,
        fat: rawProduct.nutriments?.fat_100g || 0,
        saturatedFat: rawProduct.nutriments?.["saturated-fat_100g"] || 0,
        carbs: rawProduct.nutriments?.carbohydrates_100g || 0,
        sugar: rawProduct.nutriments?.sugars_100g || 0,
        fiber: rawProduct.nutriments?.fiber_100g || 0,
        protein: rawProduct.nutriments?.proteins_100g || 0,
        salt: rawProduct.nutriments?.salt_100g || 0,
        sodium: rawProduct.nutriments?.sodium_100g || 0,
      },
      labels: rawProduct.labels || "",
      origins: rawProduct.origins || "",
      stores: rawProduct.stores || "",
    };
  }

  static getNutriScoreInfo(grade) {
    const scoreMap = {
      a: {
        label: "Excellent",
        color: "#038141",
        description: "Very good nutritional quality",
      },
      b: {
        label: "Good",
        color: "#85bb2f",
        description: "Good nutritional quality",
      },
      c: {
        label: "Average",
        color: "#fecb02",
        description: "Average nutritional quality",
      },
      d: {
        label: "Poor",
        color: "#ee8100",
        description: "Poor nutritional quality",
      },
      e: {
        label: "Bad",
        color: "#e63e11",
        description: "Bad nutritional quality",
      },
    };
    return (
      scoreMap[grade?.toLowerCase()] || {
        label: "Unknown",
        color: "#999",
        description: "No score available",
      }
    );
  }

  static getNovaGroupInfo(novaGroup) {
    const novaMap = {
      1: {
        label: "Unprocessed",
        color: "#038141",
        description: "Unprocessed or minimally processed foods",
      },
      2: {
        label: "Processed Ingredients",
        color: "#85bb2f",
        description: "Processed culinary ingredients",
      },
      3: {
        label: "Processed",
        color: "#ee8100",
        description: "Processed foods",
      },
      4: {
        label: "Ultra-processed",
        color: "#e63e11",
        description: "Ultra-processed food and drink products",
      },
    };
    return (
      novaMap[novaGroup] || {
        label: "Unknown",
        color: "#999",
        description: "No classification available",
      }
    );
  }

  static getFallbackProductData(searchOptions = {}) {
    let sampleProducts = [
      {
        code: "7613034626844",
        product_name: "Cheerios Original",
        brands: "Nestlé",
        categories: "Breakfast cereals",
        image_front_url:
          "https://images.openfoodfacts.org/images/products/761/303/462/6844/front_en.jpg",
        nutrition_grades: "a",
        nova_group: 4,
        nutriments: {
          "energy-kcal_100g": 372,
          fat_100g: 4.2,
          "saturated-fat_100g": 0.8,
          carbohydrates_100g: 74,
          sugars_100g: 4.8,
          fiber_100g: 8.6,
          proteins_100g: 8.4,
          salt_100g: 1.1,
        },
      },
      {
        code: "5000159484695",
        product_name: "Nutella",
        brands: "Ferrero",
        categories: "Spreads, Chocolate spreads",
        image_front_url:
          "https://images.openfoodfacts.org/images/products/500/015/948/4695/front_en.jpg",
        nutrition_grades: "e",
        nova_group: 4,
        nutriments: {
          "energy-kcal_100g": 539,
          fat_100g: 30.9,
          "saturated-fat_100g": 10.6,
          carbohydrates_100g: 57.5,
          sugars_100g: 56.3,
          fiber_100g: 0,
          proteins_100g: 6.3,
          salt_100g: 0.107,
        },
      },
      {
        code: "3017620422003",
        product_name: "Nutella",
        brands: "Ferrero",
        categories: "Chocolate spreads",
        nutrition_grades: "e",
        nova_group: 4,
        nutriments: {
          "energy-kcal_100g": 539,
          fat_100g: 31,
          carbohydrates_100g: 57,
          sugars_100g: 56,
          proteins_100g: 6,
        },
      },
      {
        code: "8410076472458",
        product_name: "Greek Yogurt",
        brands: "Danone",
        categories: "Dairy, Yogurts",
        nutrition_grades: "a",
        nova_group: 1,
        nutriments: {
          "energy-kcal_100g": 97,
          fat_100g: 5,
          "saturated-fat_100g": 3.3,
          carbohydrates_100g: 3.6,
          sugars_100g: 3.6,
          proteins_100g: 9,
          salt_100g: 0.1,
        },
      },
      {
        code: "5449000000996",
        product_name: "Coca-Cola Original",
        brands: "Coca-Cola",
        categories: "Beverages, Sodas",
        nutrition_grades: "e",
        nova_group: 4,
        nutriments: {
          "energy-kcal_100g": 42,
          fat_100g: 0,
          carbohydrates_100g: 10.6,
          sugars_100g: 10.6,
          proteins_100g: 0,
          salt_100g: 0,
        },
      },
    ];

    if (searchOptions.searchTerms) {
      const searchText = searchOptions.searchTerms.toLowerCase();
      sampleProducts = sampleProducts.filter(
        (product) =>
          product.product_name.toLowerCase().includes(searchText) ||
          product.brands.toLowerCase().includes(searchText),
      );
    }

    if (searchOptions.nutritionGrade) {
      sampleProducts = sampleProducts.filter(
        (product) =>
          product.nutrition_grades ===
          searchOptions.nutritionGrade.toLowerCase(),
      );
    }

    return {
      count: sampleProducts.length,
      page: searchOptions.page || 1,
      pageSize: searchOptions.pageSize || 24,
      products: sampleProducts.map(ProductService.formatProductData),
    };
  }
}

//  5. STATE MANAGER (App State with Observer Pattern & localStorage persistence)

class StateManager {
  #storageKeys;
  #defaultUserSettings;
  #appData;
  #listeners;

  static STORAGE_KEYS = {
    DAILY_LOG: "nutriplan_daily_log",
    USER_SETTINGS: "nutriplan_user_settings",
  };

  static DEFAULT_USER_SETTINGS = {
    calorieGoal: 2000,
    proteinGoal: 50,
    carbsGoal: 250,
    fatGoal: 65,
    waterGoal: 2000,
    waterGlassSize: 250,
    weight: 70,
    height: 170,
    age: 30,
    gender: "male",
    activityLevel: "moderate",
  };

  constructor() {
    this.#storageKeys = StateManager.STORAGE_KEYS;
    this.#defaultUserSettings = StateManager.DEFAULT_USER_SETTINGS;
    this.#listeners = new Set();

    const savedSettings = localStorage.getItem(this.#storageKeys.USER_SETTINGS);
    const savedDailyLog = localStorage.getItem(this.#storageKeys.DAILY_LOG);

    this.#appData = {
      currentPage: "meals",
      searchQuery: "",
      selectedCategory: null,
      selectedArea: null,
      categories: [],
      areas: [],
      meals: [],
      isLoading: false,
      error: null,
      userSettings: savedSettings
        ? JSON.parse(savedSettings)
        : { ...this.#defaultUserSettings },
      dailyLog: savedDailyLog ? JSON.parse(savedDailyLog) : {},
    };
  }

  subscribe(callback) {
    this.#listeners.add(callback);
    return () => this.#listeners.delete(callback);
  }

  #notify(changes) {
    this.#listeners.forEach((cb) => cb(changes, this.getAppState()));
    window.dispatchEvent(new CustomEvent("stateChange", { detail: changes }));
  }

  initializeAppState() {
    return this.#appData;
  }

  getAppState() {
    return this.#appData;
  }

  updateAppState(changes, shouldPersist = false) {
    Object.assign(this.#appData, changes);

    if (shouldPersist) {
      if (changes.dailyLog !== undefined) {
        localStorage.setItem(
          this.#storageKeys.DAILY_LOG,
          JSON.stringify(this.#appData.dailyLog),
        );
      }
      if (changes.userSettings !== undefined) {
        localStorage.setItem(
          this.#storageKeys.USER_SETTINGS,
          JSON.stringify(this.#appData.userSettings),
        );
      }
    }
    this.#notify(changes);
  }

  updateUserSettings(newSettings) {
    this.#appData.userSettings = {
      ...this.#appData.userSettings,
      ...newSettings,
    };
    this.updateAppState({ userSettings: this.#appData.userSettings }, true);
  }

  getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }
}

//  6. TEMPLATE ENGINE (UI Template Functions as Static Methods)

class TemplateEngine {
  static createMealCard(meal) {
    return `
        <div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-meal-id="${meal.idMeal}">
            <div class="relative h-48 overflow-hidden">
                <img
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    src="${meal.strMealThumb}"
                    alt="${meal.strMeal}"
                    loading="lazy"
                />
                <div class="absolute bottom-3 left-3 flex gap-2">
                    ${
                      meal.strCategory
                        ? `
                        <span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-lg">
                            <i class="fa-solid fa-tag text-emerald-600 mr-1"></i>${meal.strCategory}
                        </span>
                    `
                        : ""
                    }
                    ${
                      meal.strArea
                        ? `
                        <span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-lg">
                            <i class="fa-solid fa-globe text-blue-600 mr-1"></i>${meal.strArea}
                        </span>
                    `
                        : ""
                    }
                </div>
            </div>
            <div class="p-4">
                <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
                    ${meal.strMeal}
                </h3>
                <p class="text-xs text-gray-600 mb-3 line-clamp-2">
                    ${meal.strInstructions ? meal.strInstructions.substring(0, 100) + "..." : "Delicious recipe to try!"}
                </p>
                <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-gray-900">
                        <i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>
                        ${meal.strCategory || "Various"}
                    </span>
                    <span class="font-semibold text-gray-500">
                        <i class="fa-solid fa-globe text-blue-500 mr-1"></i>
                        ${meal.strArea || "International"}
                    </span>
                </div>
            </div>
        </div>
    `;
  }

  static getCategoryStyle(categoryName) {
    const colorThemes = {
      Beef: {
        bg: "from-red-50 to-rose-50",
        border: "border-red-200 hover:border-red-400",
        iconFrom: "from-red-400",
        iconTo: "to-rose-500",
        text: "text-red-600",
      },
      Chicken: {
        bg: "from-amber-50 to-orange-50",
        border: "border-amber-200 hover:border-amber-400",
        iconFrom: "from-amber-400",
        iconTo: "to-orange-500",
        text: "text-amber-600",
      },
      Dessert: {
        bg: "from-pink-50 to-rose-50",
        border: "border-pink-200 hover:border-pink-400",
        iconFrom: "from-pink-400",
        iconTo: "to-rose-500",
        text: "text-pink-600",
      },
      Lamb: {
        bg: "from-orange-50 to-amber-50",
        border: "border-orange-200 hover:border-orange-400",
        iconFrom: "from-orange-400",
        iconTo: "to-amber-500",
        text: "text-orange-600",
      },
      Miscellaneous: {
        bg: "from-slate-50 to-gray-50",
        border: "border-slate-200 hover:border-slate-400",
        iconFrom: "from-slate-400",
        iconTo: "to-gray-500",
        text: "text-slate-600",
      },
      Pasta: {
        bg: "from-yellow-50 to-amber-50",
        border: "border-yellow-200 hover:border-yellow-400",
        iconFrom: "from-yellow-400",
        iconTo: "to-amber-500",
        text: "text-yellow-600",
      },
      Pork: {
        bg: "from-rose-50 to-red-50",
        border: "border-rose-200 hover:border-rose-400",
        iconFrom: "from-rose-400",
        iconTo: "to-red-500",
        text: "text-rose-600",
      },
      Seafood: {
        bg: "from-cyan-50 to-blue-50",
        border: "border-cyan-200 hover:border-cyan-400",
        iconFrom: "from-cyan-400",
        iconTo: "to-blue-500",
        text: "text-cyan-600",
      },
      Side: {
        bg: "from-green-50 to-emerald-50",
        border: "border-green-200 hover:border-green-400",
        iconFrom: "from-green-400",
        iconTo: "to-emerald-500",
        text: "text-green-600",
      },
      Starter: {
        bg: "from-teal-50 to-cyan-50",
        border: "border-teal-200 hover:border-teal-400",
        iconFrom: "from-teal-400",
        iconTo: "to-cyan-500",
        text: "text-teal-600",
      },
      Vegan: {
        bg: "from-emerald-50 to-green-50",
        border: "border-emerald-200 hover:border-emerald-400",
        iconFrom: "from-emerald-400",
        iconTo: "to-green-500",
        text: "text-emerald-600",
      },
      Vegetarian: {
        bg: "from-lime-50 to-green-50",
        border: "border-lime-200 hover:border-lime-400",
        iconFrom: "from-lime-400",
        iconTo: "to-green-500",
        text: "text-lime-600",
      },
      Breakfast: {
        bg: "from-amber-50 to-orange-50",
        border: "border-amber-200 hover:border-amber-400",
        iconFrom: "from-amber-400",
        iconTo: "to-orange-500",
        text: "text-amber-600",
      },
      Goat: {
        bg: "from-stone-50 to-amber-50",
        border: "border-stone-200 hover:border-stone-400",
        iconFrom: "from-stone-400",
        iconTo: "to-amber-500",
        text: "text-stone-600",
      },
    };

    const categoryIcons = {
      Beef: "fa-drumstick-bite",
      Chicken: "fa-drumstick-bite",
      Dessert: "fa-cake-candles",
      Lamb: "fa-drumstick-bite",
      Pasta: "fa-bowl-food",
      Pork: "fa-bacon",
      Seafood: "fa-fish",
      Side: "fa-plate-wheat",
      Starter: "fa-utensils",
      Vegan: "fa-leaf",
      Vegetarian: "fa-seedling",
      Breakfast: "fa-mug-hot",
      Miscellaneous: "fa-bowl-rice",
      Goat: "fa-drumstick-bite",
    };

    return {
      colors: colorThemes[categoryName] || colorThemes.Miscellaneous,
      icon: categoryIcons[categoryName] || "fa-utensils",
    };
  }

  static createCategoryCard(category) {
    const style = TemplateEngine.getCategoryStyle(category.strCategory);
    const colors = style.colors;

    return `
        <div class="category-card bg-gradient-to-br ${colors.bg} rounded-xl p-3 border ${colors.border} hover:shadow-md cursor-pointer transition-all group" data-category="${category.strCategory}">
            <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 bg-gradient-to-br ${colors.iconFrom} ${colors.iconTo} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    <i class="fa-solid ${style.icon} text-white text-sm"></i>
                </div>
                <div>
                    <h3 class="text-sm font-bold text-gray-900">${category.strCategory}</h3>
                </div>
            </div>
        </div>
    `;
  }

  static createLoadingSpinner() {
    return `
        <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
    `;
  }

  static createEmptyState(message, iconClass = "fa-search") {
    return `
        <div class="flex flex-col items-center justify-center py-12 text-center">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <i class="fa-solid ${iconClass} text-gray-400 text-2xl"></i>
            </div>
            <p class="text-gray-500 text-lg">${message}</p>
        </div>
    `;
  }

  static createAreaFilters(areasList, selectedArea = null) {
    const allCuisinesButton = `
        <button class="area-filter-btn px-4 py-2 ${selectedArea ? "bg-gray-100 text-gray-700" : "bg-emerald-600 text-white"} rounded-full font-medium text-sm whitespace-nowrap hover:bg-emerald-700 hover:text-white transition-all" data-area="">
            All Cuisines
        </button>
    `;

    const areaButtons = areasList
      .map(
        (area) => `
            <button class="area-filter-btn px-4 py-2 ${selectedArea === area.strArea ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"} rounded-full font-medium text-sm whitespace-nowrap hover:bg-gray-200 transition-all" data-area="${area.strArea}">
                ${area.strArea}
            </button>
        `,
      )
      .join("");

    return allCuisinesButton + areaButtons;
  }

  static createProductCard(product) {
    const gradeColors = {
      a: "bg-green-500",
      b: "bg-lime-500",
      c: "bg-yellow-500",
      d: "bg-orange-500",
      e: "bg-red-500",
    };
    const novaColors = {
      1: "bg-green-500",
      2: "bg-lime-500",
      3: "bg-orange-500",
      4: "bg-red-500",
    };

    const gradeColor =
      gradeColors[product.nutritionGrade?.toLowerCase()] || "bg-gray-400";
    const novaColor = novaColors[product.novaGroup] || "bg-gray-400";

    return `
        <div class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-barcode="${product.barcode}">
            <div class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                ${
                  product.image
                    ? `
                    <img
                        class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        src="${product.image}"
                        alt="${product.name}"
                        loading="lazy"
                        onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center\\'><i class=\\'fa-solid fa-box text-gray-400 text-2xl\\'></i></div>'"
                    />
                `
                    : `
                    <div class="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center">
                        <i class="fa-solid fa-box text-gray-400 text-2xl"></i>
                    </div>
                `
                }

                ${
                  product.nutritionGrade
                    ? `
                    <div class="absolute top-2 left-2 ${gradeColor} text-white text-xs font-bold px-2 py-1 rounded uppercase">
                        Nutri-Score ${product.nutritionGrade.toUpperCase()}
                    </div>
                `
                    : ""
                }

                ${
                  product.novaGroup
                    ? `
                    <div class="absolute top-2 right-2 ${novaColor} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" title="NOVA ${product.novaGroup}">
                        ${product.novaGroup}
                    </div>
                `
                    : ""
                }
            </div>

            <div class="p-4">
                <p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${product.brand || "Unknown Brand"}</p>
                <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                    ${product.name}
                </h3>

                <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    ${product.quantity ? `<span><i class="fa-solid fa-weight-scale mr-1"></i>${product.quantity}</span>` : ""}
                    ${product.nutrition?.calories ? `<span><i class="fa-solid fa-fire mr-1"></i>${Math.round(product.nutrition.calories)} kcal/100g</span>` : ""}
                </div>

                <div class="grid grid-cols-4 gap-1 text-center">
                    <div class="bg-emerald-50 rounded p-1.5">
                        <p class="text-xs font-bold text-emerald-700">${product.nutrition?.protein?.toFixed(1) || 0}g</p>
                        <p class="text-[10px] text-gray-500">Protein</p>
                    </div>
                    <div class="bg-blue-50 rounded p-1.5">
                        <p class="text-xs font-bold text-blue-700">${product.nutrition?.carbs?.toFixed(1) || 0}g</p>
                        <p class="text-[10px] text-gray-500">Carbs</p>
                    </div>
                    <div class="bg-purple-50 rounded p-1.5">
                        <p class="text-xs font-bold text-purple-700">${product.nutrition?.fat?.toFixed(1) || 0}g</p>
                        <p class="text-[10px] text-gray-500">Fat</p>
                    </div>
                    <div class="bg-orange-50 rounded p-1.5">
                        <p class="text-xs font-bold text-orange-700">${product.nutrition?.sugar?.toFixed(1) || 0}g</p>
                        <p class="text-[10px] text-gray-500">Sugar</p>
                    </div>
                </div>
            </div>
        </div>
    `;
  }

  static createProductDetailContent(product, nutriScoreInfo, novaGroupInfo) {
    return `
        <div class="p-6">
            <div class="flex items-start gap-6 mb-6">
                <div class="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    ${
                      product.image
                        ? `
                        <img src="${product.image}" alt="${product.name}" class="w-full h-full object-contain"/>
                    `
                        : `
                        <i class="fa-solid fa-box text-gray-400 text-4xl"></i>
                    `
                    }
                </div>
                <div class="flex-1">
                    <p class="text-sm text-emerald-600 font-semibold mb-1">${product.brand || "Unknown Brand"}</p>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">${product.name}</h2>
                    <p class="text-sm text-gray-500 mb-3">${product.quantity || ""}</p>

                    <div class="flex items-center gap-3">
                        ${
                          product.nutritionGrade
                            ? `
                            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg" style="background-color: ${nutriScoreInfo.color}20">
                                <span class="w-8 h-8 rounded flex items-center justify-center text-white font-bold" style="background-color: ${nutriScoreInfo.color}">
                                    ${product.nutritionGrade.toUpperCase()}
                                </span>
                                <div>
                                    <p class="text-xs font-bold" style="color: ${nutriScoreInfo.color}">Nutri-Score</p>
                                    <p class="text-[10px] text-gray-600">${nutriScoreInfo.label}</p>
                                </div>
                            </div>
                        `
                            : ""
                        }

                        ${
                          product.novaGroup
                            ? `
                            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg" style="background-color: ${novaGroupInfo.color}20">
                                <span class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style="background-color: ${novaGroupInfo.color}">
                                    ${product.novaGroup}
                                </span>
                                <div>
                                    <p class="text-xs font-bold" style="color: ${novaGroupInfo.color}">NOVA</p>
                                    <p class="text-[10px] text-gray-600">${novaGroupInfo.label}</p>
                                </div>
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
                <button class="close-product-modal text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-times text-2xl"></i>
                </button>
            </div>

            <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 mb-6 border border-emerald-200">
                <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-chart-pie text-emerald-600"></i>
                    Nutrition Facts <span class="text-sm font-normal text-gray-500">(per 100g)</span>
                </h3>

                <div class="text-center mb-4 pb-4 border-b border-emerald-200">
                    <p class="text-4xl font-bold text-gray-900">${Math.round(product.nutrition?.calories || 0)}</p>
                    <p class="text-sm text-gray-500">Calories</p>
                </div>

                <div class="grid grid-cols-4 gap-4">
                    <div class="text-center">
                        <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div class="bg-emerald-500 h-2 rounded-full" style="width: ${Math.min(((product.nutrition?.protein || 0) / 50) * 100, 100)}%"></div>
                        </div>
                        <p class="text-lg font-bold text-emerald-600">${product.nutrition?.protein?.toFixed(1) || 0}g</p>
                        <p class="text-xs text-gray-500">Protein</p>
                    </div>
                    <div class="text-center">
                        <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: ${Math.min(((product.nutrition?.carbs || 0) / 100) * 100, 100)}%"></div>
                        </div>
                        <p class="text-lg font-bold text-blue-600">${product.nutrition?.carbs?.toFixed(1) || 0}g</p>
                        <p class="text-xs text-gray-500">Carbs</p>
                    </div>
                    <div class="text-center">
                        <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div class="bg-purple-500 h-2 rounded-full" style="width: ${Math.min(((product.nutrition?.fat || 0) / 65) * 100, 100)}%"></div>
                        </div>
                        <p class="text-lg font-bold text-purple-600">${product.nutrition?.fat?.toFixed(1) || 0}g</p>
                        <p class="text-xs text-gray-500">Fat</p>
                    </div>
                    <div class="text-center">
                        <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div class="bg-orange-500 h-2 rounded-full" style="width: ${Math.min(((product.nutrition?.sugar || 0) / 50) * 100, 100)}%"></div>
                        </div>
                        <p class="text-lg font-bold text-orange-600">${product.nutrition?.sugar?.toFixed(1) || 0}g</p>
                        <p class="text-xs text-gray-500">Sugar</p>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-emerald-200">
                    <div class="text-center">
                        <p class="text-sm font-semibold text-gray-900">${product.nutrition?.saturatedFat?.toFixed(1) || 0}g</p>
                        <p class="text-xs text-gray-500">Saturated Fat</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-semibold text-gray-900">${product.nutrition?.fiber?.toFixed(1) || 0}g</p>
                        <p class="text-xs text-gray-500">Fiber</p>
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-semibold text-gray-900">${product.nutrition?.salt?.toFixed(2) || 0}g</p>
                        <p class="text-xs text-gray-500">Salt</p>
                    </div>
                </div>
            </div>

            ${
              product.ingredients
                ? `
                <div class="bg-gray-50 rounded-xl p-5 mb-6">
                    <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <i class="fa-solid fa-list text-gray-600"></i>
                        Ingredients
                    </h3>
                    <p class="text-sm text-gray-600 leading-relaxed">${product.ingredients}</p>
                </div>
            `
                : ""
            }

            ${
              product.allergens
                ? `
                <div class="bg-red-50 rounded-xl p-5 mb-6 border border-red-200">
                    <h3 class="font-bold text-red-700 mb-2 flex items-center gap-2">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        Allergens
                    </h3>
                    <p class="text-sm text-red-600">${product.allergens}</p>
                </div>
            `
                : ""
            }

            <div class="flex gap-3">
                <button class="add-product-to-log flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all" data-barcode="${product.barcode}">
                    <i class="fa-solid fa-plus mr-2"></i>Log This Food
                </button>
                <button class="close-product-modal flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all">
                    Close
                </button>
            </div>
        </div>
    `;
  }

  static createProductCategoryButton(category) {
    const gradientColors = {
      breakfast_cereals: "from-amber-500 to-orange-500",
      beverages: "from-blue-500 to-cyan-500",
      snacks: "from-purple-500 to-pink-500",
      dairy: "from-sky-400 to-blue-500",
      fruits: "from-red-500 to-rose-500",
      vegetables: "from-green-500 to-emerald-500",
      breads: "from-amber-600 to-yellow-500",
      meats: "from-red-600 to-rose-600",
      frozen_foods: "from-cyan-500 to-blue-600",
      sauces: "from-orange-500 to-red-500",
    };
    const gradient = gradientColors[category.id] || "from-gray-500 to-gray-600";

    return `
        <button class="product-category-btn flex-shrink-0 px-5 py-3 bg-gradient-to-r ${gradient} text-white rounded-xl font-semibold hover:shadow-lg transition-all" data-category="${category.id}">
            <i class="fa-solid ${category.icon} mr-2"></i>${category.name}
        </button>
    `;
  }
}

//  7. MAIN APPLICATION CLASS (NutriPlanApp - OOP Controller)

class NutriPlanApp {
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

    this.init();
  }

  async init() {
    const overlay = document.getElementById("app-loading-overlay");
    if (overlay) {
      overlay.style.display = "flex";
      overlay.style.opacity = "1";
      overlay.classList.remove("hidden", "opacity-0");
    }

    this.setupEventListeners();
    this.setupRouting();

    if (window.location.pathname === "/" || window.location.pathname === "") {
      window.history.replaceState({ page: "meals" }, "", "/home");
    }

    try {
      await this.loadInitialData();

      const currentRoute = this.getPageFromURL();
      if (currentRoute.type === "meal-detail" && currentRoute.slug) {
        await this.loadMealFromSlug(currentRoute.slug);
      } else {
        this.renderPage(currentRoute.type);
        this.updateActiveNavLink(currentRoute.type);
      }
    } catch (error) {
      console.error("App initialization error:", error);
    } finally {
      this.hideLoadingOverlay();
    }
  }

  setupRouting() {
    window.addEventListener("popstate", () => {
      const route = this.getPageFromURL();
      if (route.type === "meal-detail") {
        this.loadMealFromSlug(route.slug);
      } else {
        this.renderPage(route.type);
        this.updateActiveNavLink(route.type);
      }
    });
  }

  getPageFromURL() {
    const path = window.location.pathname.replace(/^\//, "").replace(/\/$/, "");

    if (path.startsWith("meal/")) {
      return { type: "meal-detail", slug: path.replace("meal/", "") };
    }
    return { type: this.routes[path] || "meals", slug: null };
  }

  async loadMealFromSlug(slug) {
    try {
      const searchText = slug.replace(/-/g, " ");
      const matchingMeals =
        await this.#mealDbService.searchMealsByName(searchText);

      if (matchingMeals && matchingMeals.length > 0) {
        const exactMatch = matchingMeals.find(
          (meal) => this.slugify(meal.strMeal) === slug,
        );
        const meal = exactMatch || matchingMeals[0];

        this.#stateManager.updateAppState({ selectedMealId: meal.idMeal });
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

  slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  navigateTo(page) {
    let path;
    if (page === "meals") {
      path = "/home";
    } else {
      path = `/${page}`;
    }

    if (window.location.pathname !== path) {
      window.history.pushState({ page }, "", path);
    }
    this.renderPage(page);
    this.updateActiveNavLink(page);
  }

  navigateToMeal(meal) {
    const path = `/meal/${this.slugify(meal.strMeal)}`;
    this.#stateManager.updateAppState({ selectedMealId: meal.idMeal });
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
      link.addEventListener("click", (event) => this.handleNavigation(event));
    });

    const searchInput = document.querySelector(
      '#search-filters-section input[type="text"]',
    );
    if (searchInput) {
      searchInput.addEventListener("input", (event) =>
        this.handleSearch(event),
      );
      searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          this.performSearch(event.target.value);
        }
      });
    }

    this.setupViewToggle();

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
              this.renderPage(targetPage);
              this.updateActiveNavLink(targetPage);
              window.scrollTo(0, 0);
            }
          } else if (href.startsWith("/")) {
            e.preventDefault();
            const targetPage = href.replace("/", "");

            if (targetPage && this.routes[targetPage]) {
              const formattedUrl = `/foodlog#${targetPage}`;

              window.history.pushState({ page: targetPage }, "", formattedUrl);
              this.renderPage(targetPage);
              this.updateActiveNavLink(targetPage);
              window.scrollTo(0, 0);
            }
          }
        }
      }
    });
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

    this.#stateManager.updateAppState({ viewMode: mode });
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

  handleGlobalClick(event) {
    const recipeCard = event.target.closest(".recipe-card");
    if (recipeCard) {
      this.showMealDetail(recipeCard.dataset.mealId);
    }

    const categoryCard = event.target.closest(".category-card");
    if (categoryCard) {
      this.filterByCategory(categoryCard.dataset.category);
    }

    const areaFilterButton = event.target.closest(".area-filter-btn");
    if (areaFilterButton) {
      this.filterByArea(areaFilterButton.dataset.area);
    }

    if (event.target.closest(".close-detail-btn")) {
      this.closeMealDetail();
    }
  }

  handleSearch(event) {
    const query = event.target.value.trim();
    clearTimeout(this.#debounceTimer);

    this.#debounceTimer = setTimeout(() => {
      if (query.length >= 2) {
        this.performSearch(query);
      } else if (query.length === 0) {
        this.loadAllRecipes();
      }
    }, 300);
  }

  async performSearch(query) {
    this.#stateManager.updateAppState({ isLoading: true, searchQuery: query });

    const recipeGrid = document.querySelector("#all-recipes-section .grid");
    if (recipeGrid)
      recipeGrid.innerHTML = TemplateEngine.createLoadingSpinner();

    try {
      const results = await this.#mealDbService.searchMealsByName(query);
      this.#stateManager.updateAppState({ meals: results, isLoading: false });
      this.renderRecipeGrid(results);

      const resultsLabel = document.querySelector(
        "#all-recipes-section p.text-gray-600",
      );
      if (resultsLabel)
        resultsLabel.textContent = `Showing ${results.length} recipes for "${query}"`;
    } catch (error) {
      console.error("Search error:", error);
      this.#stateManager.updateAppState({
        isLoading: false,
        error: error.message,
      });
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
      this.renderRecipeGrid(defaultMeals);
    } else {
      this.#stateManager.updateAppState({ meals: results });
      this.renderRecipeGrid(results);
    }
  }

  renderPage(page) {
    this.#currentPage = page;

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
        this.showMealsPage();
        break;
      case "settings":
        this.showSettingsPage();
        break;
      case "products":
        this.showProductsPage();
        break;
      case "foodlog":
        this.showFoodLogPage();
        break;
      case "meal-detail":
        this.showMealDetailPage();
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

  showMealsPage() {
    this.toggleSections(
      [
        "search-filters-section",
        "meal-categories-section",
        "all-recipes-section",
      ],
      true,
    );
    this.toggleSections(["featured-recipes-section"], false);

    this.renderCategories();
    this.renderRecipeGrid(this.#stateManager.getAppState().meals);
    this.renderAreaFilters();
  }

  toggleSections(sectionIds, shouldShow) {
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.style.display = shouldShow ? "" : "none";
    });
  }

  renderCategories() {
    const categoriesSection = document.getElementById(
      "meal-categories-section",
    );
    if (!categoriesSection) return;

    const grid = categoriesSection.querySelector(".grid");
    if (!grid) return;

    grid.className = "grid grid-cols-6 gap-3";
    const categories = this.#stateManager.getAppState().categories || [];
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

    const areas = this.#stateManager.getAppState().areas || [];
    const selectedArea = this.#stateManager.getAppState().selectedArea;
    filterContainer.innerHTML = TemplateEngine.createAreaFilters(
      areas.slice(0, 10),
      selectedArea,
    );
  }
  async filterByCategory(category) {
    this.#stateManager.updateAppState({
      selectedCategory: category,
      isLoading: true,
    });

    const grid = document.querySelector("#all-recipes-section .grid");
    if (grid) grid.innerHTML = TemplateEngine.createLoadingSpinner();

    try {
      const summaryList =
        await this.#mealDbService.filterMealsByCategory(category);
      const fullMeals = await Promise.all(
        summaryList
          .slice(0, 20)
          .map((meal) => this.#mealDbService.getMealById(meal.idMeal)),
      );
      const validMeals = fullMeals.filter((meal) => meal);

      this.#stateManager.updateAppState({
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
      this.#stateManager.updateAppState({ isLoading: false });
    }
  }

  async filterByArea(area) {
    this.#stateManager.updateAppState({ selectedArea: area, isLoading: true });

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
        const summaryList = await this.#mealDbService.filterMealsByArea(area);
        const fullMeals = await Promise.all(
          summaryList
            .slice(0, 20)
            .map((meal) => this.#mealDbService.getMealById(meal.idMeal)),
        );
        meals = fullMeals.filter((meal) => meal);
      } else {
        meals = await this.#mealDbService.searchMealsByName("chicken");
      }

      this.#stateManager.updateAppState({ meals, isLoading: false });
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
      this.#stateManager.updateAppState({ isLoading: false });
    }
  }

  async showMealDetail(mealId) {
    this.#stateManager.updateAppState({
      selectedMealId: mealId,
      isLoading: true,
    });

    try {
      const meal = await this.#mealDbService.getMealById(mealId);
      if (meal) {
        const path = `/meal/${this.slugify(meal.strMeal)}`;
        if (window.location.pathname !== path) {
          window.history.pushState({ page: "meal-detail", mealId }, "", path);
        }
      }
    } catch (error) {
      console.error("Error fetching meal for URL:", error);
    }

    this.renderPage("meal-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async showMealDetailPage() {
    this.toggleSections(
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

    const mealId = this.#stateManager.getAppState().selectedMealId;
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
        ?.addEventListener("click", () => this.navigateTo("meals"));
      return;
    }

    try {
      const meal = await this.#mealDbService.getMealById(mealId);
      if (!meal) throw new Error("Meal not found");

      const ingredients = MealDbService.extractIngredientsList(meal);
      const instructions = MealDbService.parseInstructionSteps(
        meal.strInstructions,
      );

      this.#stateManager.updateAppState({
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
      this.#stateManager.updateAppState({ isLoading: false });
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
        ?.addEventListener("click", () => this.navigateTo("meals"));
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
        await this.#nutritionService.analyzeRecipeNutrition(
          meal.strMeal,
          ingredientLines,
        );
      const formattedNutrition =
        this.#nutritionService.formatNutritionForDisplay(rawNutritionData);

      const nutritionCache =
        this.#stateManager.getAppState().mealNutritionCache || {};
      nutritionCache[meal.idMeal] = formattedNutrition;
      this.#stateManager.updateAppState({ mealNutritionCache: nutritionCache });

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
      ?.addEventListener("click", () => this.navigateTo("meals"));
    document
      .getElementById("log-meal-btn")
      ?.addEventListener("click", () => this.showLogMealModal(meal));
  }

  closeMealDetail() {
    this.navigateTo("meals");
    this.#stateManager.updateAppState({
      selectedMeal: null,
      selectedMealId: null,
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

  showSettingsPage() {
    this.toggleSections(
      [
        "search-filters-section",
        "featured-recipes-section",
        "meal-categories-section",
        "all-recipes-section",
      ],
      false,
    );
    this.renderSettingsSection();
  }

  renderSettingsSection() {
    let settingsSection = document.getElementById("settings-section");
    if (!settingsSection) {
      settingsSection = document.createElement("section");
      settingsSection.id = "settings-section";
      settingsSection.className = "px-8 py-8 bg-gray-50 min-h-screen";

      const mainContent = document.getElementById("main-content");
      const footer = document.getElementById("footer");
      if (footer) {
        mainContent.insertBefore(settingsSection, footer);
      } else {
        mainContent.appendChild(settingsSection);
      }
    }
    settingsSection.style.display = "";

    const settings = this.#stateManager.getAppState().userSettings;

    settingsSection.innerHTML = `
            <div class="max-w-3xl mx-auto">
                <div class="space-y-6">
                    <!-- Profile -->
                    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 class="text-lg font-bold text-gray-900 mb-1">Profile</h3>
                        <p class="text-sm text-gray-500 mb-4">Your personal information</p>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Age</label>
                                <input type="number" id="setting-age" value="${settings.age || 30}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                <select id="setting-gender" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                    <option value="male" ${settings.gender === "male" ? "selected" : ""}>Male</option>
                                    <option value="female" ${settings.gender === "female" ? "selected" : ""}>Female</option>
                                    <option value="other" ${settings.gender === "other" ? "selected" : ""}>Other</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                <input type="number" id="setting-weight" value="${settings.weight}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                                <input type="number" id="setting-height" value="${settings.height}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                        </div>
                    </div>

                    <!-- Nutrition Goals -->
                    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 class="text-lg font-bold text-gray-900 mb-1">Nutrition Goals</h3>
                        <p class="text-sm text-gray-500 mb-4">Set your daily nutrition targets</p>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Daily Calories</label>
                                <input type="number" id="setting-calories" value="${settings.calorieGoal}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Protein (g)</label>
                                <input type="number" id="setting-protein" value="${settings.proteinGoal}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Carbs (g)</label>
                                <input type="number" id="setting-carbs" value="${settings.carbsGoal}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Fat (g)</label>
                                <input type="number" id="setting-fat" value="${settings.fatGoal}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                        </div>
                    </div>

                    <!-- Hydration -->
                    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 class="text-lg font-bold text-gray-900 mb-1">Hydration</h3>
                        <p class="text-sm text-gray-500 mb-4">Set your water intake goals</p>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Daily Water Goal (ml)</label>
                                <input type="number" id="setting-water" value="${settings.waterGoal}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Glass Size (ml)</label>
                                <input type="number" id="setting-glass" value="${settings.waterGlassSize}"
                                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"/>
                            </div>
                        </div>
                    </div>

                    <!-- Activity Level -->
                    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h3 class="text-lg font-bold text-gray-900 mb-1">Activity Level</h3>
                        <p class="text-sm text-gray-500 mb-4">How active are you on a typical day?</p>

                        <div class="grid grid-cols-5 gap-3" id="activity-level-selector">
                            ${[
                              "sedentary",
                              "light",
                              "moderate",
                              "active",
                              "very_active",
                            ]
                              .map(
                                (level) => `
                                <button class="activity-level-btn px-4 py-3 rounded-xl text-center transition-all ${settings.activityLevel === level ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}" data-level="${level}">
                                    <i class="fa-solid ${this.getActivityIcon(level)} text-lg mb-1"></i>
                                    <p class="text-xs font-medium capitalize">${level.replace("_", " ")}</p>
                                </button>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>

                    <button id="save-settings-btn" class="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-check"></i>
                        Save Settings
                    </button>

                    <div class="bg-red-50 rounded-2xl p-6 border border-red-200">
                        <h3 class="text-lg font-bold text-red-700 mb-1">Danger Zone</h3>
                        <p class="text-sm text-red-600 mb-4">These actions cannot be undone</p>
                        <button id="reset-data-btn" class="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all">
                            Reset All Data
                        </button>
                    </div>
                </div>
            </div>
        `;

    this.setupSettingsListeners();
  }

  getActivityIcon(level) {
    const icons = {
      sedentary: "fa-couch",
      light: "fa-person-walking",
      moderate: "fa-person-running",
      active: "fa-person-biking",
      very_active: "fa-person-swimming",
    };
    return icons[level] || "fa-person";
  }

  setupSettingsListeners() {
    document.querySelectorAll(".activity-level-btn").forEach((button) => {
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".activity-level-btn")
          .forEach((otherButton) => {
            otherButton.classList.remove("bg-emerald-600", "text-white");
            otherButton.classList.add("bg-gray-100", "text-gray-700");
          });
        button.classList.add("bg-emerald-600", "text-white");
        button.classList.remove("bg-gray-100", "text-gray-700");
      });
    });

    document
      .getElementById("save-settings-btn")
      ?.addEventListener("click", () => {
        const newSettings = {
          age: parseInt(document.getElementById("setting-age")?.value) || 30,
          gender: document.getElementById("setting-gender")?.value || "male",
          weight:
            parseInt(document.getElementById("setting-weight")?.value) || 70,
          height:
            parseInt(document.getElementById("setting-height")?.value) || 170,
          calorieGoal:
            parseInt(document.getElementById("setting-calories")?.value) ||
            2000,
          proteinGoal:
            parseInt(document.getElementById("setting-protein")?.value) || 50,
          carbsGoal:
            parseInt(document.getElementById("setting-carbs")?.value) || 250,
          fatGoal:
            parseInt(document.getElementById("setting-fat")?.value) || 65,
          waterGoal:
            parseInt(document.getElementById("setting-water")?.value) || 2000,
          waterGlassSize:
            parseInt(document.getElementById("setting-glass")?.value) || 250,
          activityLevel:
            document.querySelector(".activity-level-btn.bg-emerald-600")
              ?.dataset.level || "moderate",
        };

        this.#stateManager.updateUserSettings(newSettings);
        this.showNotification("Settings saved successfully!", "success");
      });

    document.getElementById("reset-data-btn")?.addEventListener("click", () => {
      if (
        confirm(
          "Are you sure you want to reset all data? This cannot be undone.",
        )
      ) {
        localStorage.clear();
        window.location.reload();
      }
    });
  }

  showProductsPage() {
    this.toggleSections(
      [
        "search-filters-section",
        "featured-recipes-section",
        "meal-categories-section",
        "all-recipes-section",
      ],
      false,
    );
    this.renderProductsSection();
  }

  async renderProductsSection() {
    let productsSection = document.getElementById("products-section");
    if (!productsSection) {
      productsSection = document.createElement("section");
      productsSection.id = "products-section";
      productsSection.className = "px-8 py-8 bg-gray-50 min-h-screen";

      const mainContent = document.getElementById("main-content");
      const footer = document.getElementById("footer");
      mainContent.insertBefore(productsSection, footer);
    }
    productsSection.style.display = "";

    const popularCategories = await ProductService.getPopularCategories();

    productsSection.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 mb-6 text-white">
                    <h2 class="text-2xl font-bold mb-2">
                        <i class="fa-solid fa-barcode mr-2"></i>
                        Product Search & Barcode Scanner
                    </h2>
                    <p class="opacity-90 mb-4">Search for packaged food products to view nutrition information</p>

                    <div class="flex gap-3">
                        <div class="flex-1 relative">
                            <input type="text" id="product-search-input"
                                placeholder="Search by product name (e.g., Cheerios, Nutella, Coca-Cola...)"
                                class="w-full px-5 py-3.5 pr-12 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50"/>
                            <i class="fa-solid fa-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        </div>
                        <button id="search-product-btn" class="px-6 py-3.5 bg-white text-emerald-700 rounded-xl font-semibold hover:bg-gray-100 transition-all">
                            Search
                        </button>
                    </div>

                    <div class="flex items-center gap-4 mt-4">
                        <div class="flex-1 h-px bg-white/30"></div>
                        <span class="text-sm opacity-80">or</span>
                        <div class="flex-1 h-px bg-white/30"></div>
                    </div>

                    <div class="mt-4 flex gap-3">
                        <div class="flex-1 relative">
                            <input type="text" id="barcode-input"
                                placeholder="Enter barcode number (e.g., 7613034626844)"
                                class="w-full px-5 py-3.5 pr-12 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50"/>
                            <i class="fa-solid fa-barcode absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        </div>
                        <button id="lookup-barcode-btn" class="px-6 py-3.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all">
                            <i class="fa-solid fa-search mr-2"></i>Lookup
                        </button>
                    </div>
                </div>

                <div class="flex items-center gap-4 mb-6">
                    <span class="text-sm font-medium text-gray-700">Filter by Nutri-Score:</span>
                    <div class="flex gap-2">
                        <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-gray-100 text-gray-700 hover:bg-gray-200" data-grade="">All</button>
                        <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-green-100 text-green-700 hover:bg-green-200" data-grade="a">A</button>
                        <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-lime-100 text-lime-700 hover:bg-lime-200" data-grade="b">B</button>
                        <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-yellow-100 text-yellow-700 hover:bg-yellow-200" data-grade="c">C</button>
                        <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-orange-100 text-orange-700 hover:bg-orange-200" data-grade="d">D</button>
                        <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-100 text-red-700 hover:bg-red-200" data-grade="e">E</button>
                    </div>
                </div>

                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-3">Browse by Category</h3>
                    <div class="flex gap-3 overflow-x-auto pb-2">
                        ${popularCategories.map((category) => TemplateEngine.createProductCategoryButton(category)).join("")}
                    </div>
                </div>

                <div class="flex items-center justify-between mb-4">
                    <p id="products-count" class="text-sm text-gray-600">Search for products to see results</p>
                </div>

                <div class="grid grid-cols-4 gap-5" id="products-grid"></div>

                <div id="products-loading" class="hidden py-12">
                    ${TemplateEngine.createLoadingSpinner()}
                </div>

                <div id="products-empty" class="py-12">
                    <div class="text-center">
                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fa-solid fa-box-open text-gray-400 text-3xl"></i>
                        </div>
                        <p class="text-gray-500 text-lg mb-2">No products to display</p>
                        <p class="text-gray-400 text-sm">Search for a product or browse by category</p>
                    </div>
                </div>
            </div>
        `;

    this.setupProductsListeners();
  }

  setupProductsListeners() {
    document
      .getElementById("search-product-btn")
      ?.addEventListener("click", () => {
        const query = document
          .getElementById("product-search-input")
          ?.value.trim();
        if (query) this.searchProducts(query);
      });

    document
      .getElementById("product-search-input")
      ?.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          const query = event.target.value.trim();
          if (query) this.searchProducts(query);
        }
      });

    document
      .getElementById("lookup-barcode-btn")
      ?.addEventListener("click", () => {
        const barcode = document.getElementById("barcode-input")?.value.trim();
        if (barcode) this.lookupBarcode(barcode);
      });

    document
      .getElementById("barcode-input")
      ?.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          const barcode = event.target.value.trim();
          if (barcode) this.lookupBarcode(barcode);
        }
      });

    document.querySelectorAll(".nutri-score-filter").forEach((button) => {
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".nutri-score-filter")
          .forEach((otherButton) => {
            otherButton.classList.remove("ring-2", "ring-gray-900");
          });
        button.classList.add("ring-2", "ring-gray-900");

        const grade = button.dataset.grade;
        const query =
          document.getElementById("product-search-input")?.value.trim() || "";
        if (query) this.searchProducts(query, grade);
      });
    });

    document.querySelectorAll(".product-category-btn").forEach((button) => {
      button.addEventListener("click", () =>
        this.searchProductsByCategory(button.dataset.category),
      );
    });

    document
      .getElementById("products-grid")
      ?.addEventListener("click", (event) => {
        const productCard = event.target.closest(".product-card");
        if (productCard) this.showProductDetail(productCard.dataset.barcode);
      });
  }

  async searchProducts(query, nutritionGrade = "") {
    const grid = document.getElementById("products-grid");
    const loadingIndicator = document.getElementById("products-loading");
    const emptyState = document.getElementById("products-empty");
    const countLabel = document.getElementById("products-count");
    if (!grid) return;

    loadingIndicator.classList.remove("hidden");
    emptyState.classList.add("hidden");
    grid.innerHTML = "";

    try {
      const searchOptions = { searchTerms: query, pageSize: 24 };
      if (nutritionGrade) searchOptions.nutritionGrade = nutritionGrade;

      const results = await this.#productService.searchProducts(searchOptions);
      loadingIndicator.classList.add("hidden");

      if (results.products.length > 0) {
        grid.innerHTML = results.products
          .map((product) => TemplateEngine.createProductCard(product))
          .join("");
        countLabel.textContent = `Found ${results.count} products for "${query}"`;
      } else {
        emptyState.classList.remove("hidden");
        countLabel.textContent = `No products found for "${query}"`;
      }

      this.#stateManager.updateAppState({ searchedProducts: results.products });
    } catch (error) {
      console.error("Product search error:", error);
      loadingIndicator.classList.add("hidden");
      emptyState.classList.remove("hidden");
      countLabel.textContent = "Error searching products";
      this.showNotification(
        "Failed to search products. Please try again.",
        "error",
      );
    }
  }

  async searchProductsByCategory(categoryId) {
    const grid = document.getElementById("products-grid");
    const loadingIndicator = document.getElementById("products-loading");
    const emptyState = document.getElementById("products-empty");
    const countLabel = document.getElementById("products-count");
    if (!grid) return;

    loadingIndicator.classList.remove("hidden");
    emptyState.classList.add("hidden");
    grid.innerHTML = "";

    try {
      const results =
        await this.#productService.getProductsByCategory(categoryId);
      loadingIndicator.classList.add("hidden");

      const categoryLabel = categoryId.replace(/_/g, " ");
      if (results.products.length > 0) {
        grid.innerHTML = results.products
          .map((product) => TemplateEngine.createProductCard(product))
          .join("");
        countLabel.textContent = `Found ${results.count} products in ${categoryLabel}`;
      } else {
        emptyState.classList.remove("hidden");
        countLabel.textContent = `No products found in ${categoryLabel}`;
      }

      this.#stateManager.updateAppState({ searchedProducts: results.products });
    } catch (error) {
      console.error("Category search error:", error);
      loadingIndicator.classList.add("hidden");
      emptyState.classList.remove("hidden");
      this.showNotification("Failed to load category products.", "error");
    }
  }

  async lookupBarcode(barcode) {
    const loadingIndicator = document.getElementById("products-loading");
    const grid = document.getElementById("products-grid");
    const emptyState = document.getElementById("products-empty");
    const countLabel = document.getElementById("products-count");

    loadingIndicator.classList.remove("hidden");
    grid.innerHTML = "";
    emptyState.classList.add("hidden");

    try {
      const product = await this.#productService.getProductByBarcode(barcode);
      loadingIndicator.classList.add("hidden");

      if (product) {
        grid.innerHTML = TemplateEngine.createProductCard(product);
        countLabel.textContent = `Found product: ${product.name}`;
        this.#stateManager.updateAppState({ searchedProducts: [product] });
        this.showProductDetail(barcode);
      } else {
        emptyState.classList.remove("hidden");
        countLabel.textContent = `No product found with barcode: ${barcode}`;
        this.showNotification("Product not found in database", "error");
      }
    } catch (error) {
      console.error("Barcode lookup error:", error);
      loadingIndicator.classList.add("hidden");
      emptyState.classList.remove("hidden");
      this.showNotification("Failed to lookup barcode.", "error");
    }
  }

  async showProductDetail(barcode) {
    let product = this.#stateManager
      .getAppState()
      .searchedProducts?.find((item) => item.barcode === barcode);
    if (!product) {
      product = await this.#productService.getProductByBarcode(barcode);
    }
    if (!product) {
      this.showNotification("Product not found", "error");
      return;
    }

    const nutriScoreInfo = ProductService.getNutriScoreInfo(
      product.nutritionGrade,
    );
    const novaGroupInfo = ProductService.getNovaGroupInfo(product.novaGroup);

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
    modal.id = "product-detail-modal";
    modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                ${TemplateEngine.createProductDetailContent(product, nutriScoreInfo, novaGroupInfo)}
            </div>
        `;
    document.body.appendChild(modal);

    modal.querySelectorAll(".close-product-modal").forEach((button) => {
      button.addEventListener("click", () => modal.remove());
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.remove();
    });

    modal
      .querySelector(".add-product-to-log")
      ?.addEventListener("click", () => {
        this.logFoodToDaily(product);
        modal.remove();
      });
  }

  logFoodToDaily(product) {
    const today = this.#stateManager.getTodayDateString();
    const dailyLog = this.#stateManager.getAppState().dailyLog || {};

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

    this.#stateManager.updateAppState({ dailyLog }, true);
    this.showNotification(
      `${product.name} logged to your daily intake! 📝`,
      "success",
    );
    this.updateFoodLogPage();
  }

  showLogMealModal(meal) {
    const nutrition =
      this.#stateManager.getAppState().mealNutritionCache?.[meal.idMeal];

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
    modal.id = "log-meal-modal";
    modal.innerHTML = `
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                <div class="flex items-center gap-4 mb-6">
                    <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="w-16 h-16 rounded-xl object-cover"/>
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Log This Meal</h3>
                        <p class="text-gray-500 text-sm">${meal.strMeal}</p>
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Servings</label>
                    <div class="flex items-center gap-3">
                        <button id="decrease-servings" class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                            <i class="fa-solid fa-minus text-gray-600"></i>
                        </button>
                        <input type="number" id="meal-servings" value="1" min="0.5" max="10" step="0.5"
                            class="w-20 text-center text-xl font-bold border-2 border-gray-200 rounded-lg py-2"/>
                        <button id="increase-servings" class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                            <i class="fa-solid fa-plus text-gray-600"></i>
                        </button>
                    </div>
                </div>

                ${
                  nutrition
                    ? `
                <div class="bg-emerald-50 rounded-xl p-4 mb-6">
                    <p class="text-sm text-gray-600 mb-2">Estimated nutrition per serving:</p>
                    <div class="grid grid-cols-4 gap-2 text-center">
                        <div>
                            <p class="text-lg font-bold text-emerald-600" id="modal-calories">${nutrition.caloriesPerServing}</p>
                            <p class="text-xs text-gray-500">Calories</p>
                        </div>
                        <div>
                            <p class="text-lg font-bold text-blue-600" id="modal-protein">${nutrition.macros?.protein?.amount || 0}g</p>
                            <p class="text-xs text-gray-500">Protein</p>
                        </div>
                        <div>
                            <p class="text-lg font-bold text-amber-600" id="modal-carbs">${nutrition.macros?.carbs?.amount || 0}g</p>
                            <p class="text-xs text-gray-500">Carbs</p>
                        </div>
                        <div>
                            <p class="text-lg font-bold text-purple-600" id="modal-fat">${nutrition.macros?.fat?.amount || 0}g</p>
                            <p class="text-xs text-gray-500">Fat</p>
                        </div>
                    </div>
                </div>
                `
                    : `
                <div class="bg-gray-50 rounded-xl p-4 mb-6">
                    <p class="text-sm text-gray-500 text-center">Nutrition information not available for this meal</p>
                </div>
                `
                }

                <div class="flex gap-3">
                    <button id="cancel-log-meal" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all">
                        Cancel
                    </button>
                    <button id="confirm-log-meal" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all">
                        <i class="fa-solid fa-clipboard-list mr-2"></i>
                        Log Meal
                    </button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    const servingsInput = modal.querySelector("#meal-servings");

    modal.querySelector("#decrease-servings")?.addEventListener("click", () => {
      const currentValue = parseFloat(servingsInput.value);
      if (currentValue > 0.5)
        servingsInput.value = (currentValue - 0.5).toFixed(1);
    });

    modal.querySelector("#increase-servings")?.addEventListener("click", () => {
      const currentValue = parseFloat(servingsInput.value);
      if (currentValue < 10)
        servingsInput.value = (currentValue + 0.5).toFixed(1);
    });

    modal
      .querySelector("#cancel-log-meal")
      ?.addEventListener("click", () => modal.remove());

    modal.querySelector("#confirm-log-meal")?.addEventListener("click", () => {
      const servings = parseFloat(servingsInput.value) || 1;
      const nutritionForLog =
        this.#stateManager.getAppState().mealNutritionCache?.[meal.idMeal] ||
        nutrition;
      this.logMealToDaily(meal, servings, nutritionForLog);
      modal.remove();
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.remove();
    });
  }

  logMealToDaily(meal, servings, nutrition) {
    const today = this.#stateManager.getTodayDateString();
    const dailyLog = this.#stateManager.getAppState().dailyLog || {};

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

    this.#stateManager.updateAppState({ dailyLog }, true);

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

  showFoodLogPage() {
    this.toggleSections(
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
      this.#stateManager.getAppState().userSettings ||
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
    const dailyLog = this.#stateManager.getAppState().dailyLog || {};
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
    const today = this.#stateManager.getTodayDateString();
    return (
      (this.#stateManager.getAppState().dailyLog || {})[today] || {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        meals: [],
      }
    );
  }

  removeLoggedItem(index) {
    const today = this.#stateManager.getTodayDateString();
    const dailyLog = this.#stateManager.getAppState().dailyLog || {};
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

    this.#stateManager.updateAppState({ dailyLog }, true);
    this.showNotification("Item removed from log", "info");
    this.updateFoodLogPage();
  }

  clearTodayLog() {
    const today = this.#stateManager.getTodayDateString();
    const dailyLog = this.#stateManager.getAppState().dailyLog || {};
    dailyLog[today] = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: [],
    };

    this.#stateManager.updateAppState({ dailyLog }, true);
    this.showNotification("Today's log cleared", "info");
    this.updateFoodLogPage();
  }
}

// 8. START THE APP

document.addEventListener("DOMContentLoaded", () => {
  window.nutriPlanApp = new NutriPlanApp();
});
