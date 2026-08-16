//  6. TEMPLATE ENGINE

import { createMealCard, createAreaFilters } from "./MealTemplates.js";
import { getCategoryStyle, createCategoryCard } from "./CategoryTemplates.js";
import {
  createProductCard,
  createProductDetailContent,
  createProductCategoryButton,
} from "./ProductTemplates.js";

export default class TemplateEngine {
  static createMealCard(meal) {
    return createMealCard(meal);
  }

  static getCategoryStyle(categoryName) {
    return getCategoryStyle(categoryName);
  }

  static createCategoryCard(category) {
    return createCategoryCard(category);
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
    return createAreaFilters(areasList, selectedArea);
  }

  static createProductCard(product) {
    return createProductCard(product);
  }

  static createProductDetailContent(product, nutriScoreInfo, novaGroupInfo) {
    return createProductDetailContent(product, nutriScoreInfo, novaGroupInfo);
  }

  static createProductCategoryButton(category) {
    return createProductCategoryButton(category);
  }
}
