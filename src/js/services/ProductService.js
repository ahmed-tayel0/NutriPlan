//  4. PRODUCT SERVICE

import BaseApiService from "./BaseApiService.js";

export default class ProductService extends BaseApiService {
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

  static getPopularCategories() {
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
