//  MEAL TEMPLATES

export function createMealCard(meal) {
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

export function createAreaFilters(areasList, selectedArea = null) {
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
