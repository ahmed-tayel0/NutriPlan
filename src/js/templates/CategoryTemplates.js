//  CATEGORY TEMPLATES

export function getCategoryStyle(categoryName) {
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

export function createCategoryCard(category) {
  const style = getCategoryStyle(category.strCategory);
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
