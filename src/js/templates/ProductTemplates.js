//  PRODUCT TEMPLATES

export function createProductCard(product) {
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

export function createProductDetailContent(
  product,
  nutriScoreInfo,
  novaGroupInfo,
) {
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

export function createProductCategoryButton(category) {
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
