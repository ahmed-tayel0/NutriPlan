//  MODAL CONTROLLER 

import TemplateEngine from '../templates/TemplateEngine.js';
import ProductService from '../services/ProductService.js';

export default class ModalController {
  constructor(app) {
    this.app = app;
  }

  showLogMealModal(meal) {
    const nutrition =
      this.app.stateManager.getAppState().mealNutritionCache?.[meal.idMeal];

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
        this.app.stateManager.getAppState().mealNutritionCache?.[
          meal.idMeal
        ] || nutrition;
      this.app.foodLogView.logMealToDaily(meal, servings, nutritionForLog);
      modal.remove();
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.remove();
    });
  }

  async showProductDetail(barcode) {
    let product = this.app.stateManager
      .getAppState()
      .searchedProducts?.find((item) => item.barcode === barcode);
    if (!product) {
      product = await this.app.productService.getProductByBarcode(barcode);
    }
    if (!product) {
      this.app.showNotification("Product not found", "error");
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
        this.app.foodLogView.logFoodToDaily(product);
        modal.remove();
      });
  }
}
