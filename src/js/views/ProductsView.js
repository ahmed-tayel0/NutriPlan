//  PRODUCTS VIEW

import ProductService from "../services/ProductService.js";
import TemplateEngine from "../templates/TemplateEngine.js";

export default class ProductsView {
  constructor(app) {
    this.app = app;
  }

  showProductsPage() {
    this.app.toggleSections(
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
        if (productCard)
          this.app.modalController.showProductDetail(
            productCard.dataset.barcode,
          );
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

      const results =
        await this.app.productService.searchProducts(searchOptions);
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

      this.app.stateManager.updateAppState({
        searchedProducts: results.products,
      });
    } catch (error) {
      console.error("Product search error:", error);
      loadingIndicator.classList.add("hidden");
      emptyState.classList.remove("hidden");
      countLabel.textContent = "Error searching products";
      this.app.showNotification(
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
        await this.app.productService.getProductsByCategory(categoryId);
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

      this.app.stateManager.updateAppState({
        searchedProducts: results.products,
      });
    } catch (error) {
      console.error("Category search error:", error);
      loadingIndicator.classList.add("hidden");
      emptyState.classList.remove("hidden");
      this.app.showNotification("Failed to load category products.", "error");
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
      const product =
        await this.app.productService.getProductByBarcode(barcode);
      loadingIndicator.classList.add("hidden");

      if (product) {
        grid.innerHTML = TemplateEngine.createProductCard(product);
        countLabel.textContent = `Found product: ${product.name}`;
        this.app.stateManager.updateAppState({ searchedProducts: [product] });
        this.app.modalController.showProductDetail(barcode);
      } else {
        emptyState.classList.remove("hidden");
        countLabel.textContent = `No product found with barcode: ${barcode}`;
        this.app.showNotification("Product not found in database", "error");
      }
    } catch (error) {
      console.error("Barcode lookup error:", error);
      loadingIndicator.classList.add("hidden");
      emptyState.classList.remove("hidden");
      this.app.showNotification("Failed to lookup barcode.", "error");
    }
  }
}
