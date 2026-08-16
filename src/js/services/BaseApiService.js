//  1. BASE API SERVICE 

export default class BaseApiService {
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
