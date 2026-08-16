//  5. STATE MANAGER

import { STORAGE_KEYS, DEFAULT_USER_SETTINGS } from "../utils/Constants.js";

export default class StateManager {
  #storageKeys;
  #defaultUserSettings;
  #appData;
  #listeners;

  static STORAGE_KEYS = STORAGE_KEYS;

  static DEFAULT_USER_SETTINGS = DEFAULT_USER_SETTINGS;

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
