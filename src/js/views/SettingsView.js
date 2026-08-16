//  SETTINGS VIEW (User profile, nutrition goals, hydration, activity level)

export default class SettingsView {
  constructor(app) {
    this.app = app;
  }

  showSettingsPage() {
    this.app.toggleSections(
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

    const settings = this.app.stateManager.getAppState().userSettings;

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

        this.app.stateManager.updateUserSettings(newSettings);
        this.app.showNotification("Settings saved successfully!", "success");
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
}
