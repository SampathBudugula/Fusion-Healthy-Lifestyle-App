/* ==========================================================================
   FUSION — PRODUCT API CLIENT
   Talks to the FUSION API over fetch(). No product data lives in the
   frontend anymore — everything below is fetched from the deployed API at
   https://fusion-api-mu.vercel.app/api.

   Override at runtime by setting window.FUSION_API_BASE before this script
   runs (e.g. a one-line <script> in an HTML page) — useful for pointing at
   a local server (see /server) during development.
   ========================================================================== */

(function (window) {
  "use strict";

  var API_BASE = window.FUSION_API_BASE || "https://fusion-api-mu.vercel.app/api";

  var productsCache = null;   // in-memory cache of GET /api/products for this page load
  var categoriesCache = null;

  function request(path) {
    return fetch(API_BASE + path)
      .then(function (res) {
        if (!res.ok) throw new Error("FUSION API " + path + " failed with status " + res.status);
        return res.json();
      })
      .catch(function (err) {
        console.error("[FusionAPI]", err.message);
        throw err;
      });
  }

  var FusionAPI = {
    /** GET /api/products — cached per page load since several sections on
     *  the same page (home specials + bestsellers, categories, etc.) all
     *  need the full list. */
    getProducts: function () {
      if (productsCache) return productsCache;
      productsCache = request("/products");
      return productsCache;
    },

    /** GET /api/products/:id */
    getProductById: function (id) {
      return request("/products/" + encodeURIComponent(id)).catch(function () { return null; });
    },

    /** GET /api/categories — cached per page load */
    getCategories: function () {
      if (categoriesCache) return categoriesCache;
      categoriesCache = request("/categories");
      return categoriesCache;
    },

    /** GET /api/categories/:slug/products — category-scoped product list,
     *  filtered/sorted server-side rather than fetching everything. */
    getProductsByCategory: function (slug, opts) {
      opts = opts || {};
      var qs = "";
      if (opts.query) qs += "&q=" + encodeURIComponent(opts.query);
      if (opts.sort) qs += "&sort=" + encodeURIComponent(opts.sort);
      return request("/categories/" + encodeURIComponent(slug) + "/products" + (qs ? "?" + qs.slice(1) : ""));
    },

    /** GET /api/products/:id/related */
    getRelatedProducts: function (id, limit) {
      return request("/products/" + encodeURIComponent(id) + "/related?limit=" + (limit || 4)).catch(function () { return []; });
    },

    /** GET /api/customizations */
    getDefaultCustomizations: function () {
      return request("/customizations").catch(function () { return []; });
    },

    /** Client-side filter/sort helpers — synchronous, operate on already-fetched data */
    filterProducts: function (products, opts) {
      opts = opts || {};
      var result = products.slice();

      if (opts.category && opts.category !== "all") {
        result = result.filter(function (p) { return p.categorySlug === opts.category; });
      }
      if (opts.query) {
        var q = opts.query.trim().toLowerCase();
        if (q) {
          result = result.filter(function (p) {
            return p.name.toLowerCase().indexOf(q) !== -1 ||
                   p.category.toLowerCase().indexOf(q) !== -1 ||
                   p.description.toLowerCase().indexOf(q) !== -1;
          });
        }
      }
      if (opts.sort) {
        result = FusionAPI.sortProducts(result, opts.sort);
      }
      return result;
    },

    sortProducts: function (products, sortKey) {
      var result = products.slice();
      switch (sortKey) {
        case "price-low": result.sort(function (a, b) { return a.price - b.price; }); break;
        case "price-high": result.sort(function (a, b) { return b.price - a.price; }); break;
        case "rating": result.sort(function (a, b) { return b.rating - a.rating; }); break;
        case "protein": result.sort(function (a, b) { return b.protein - a.protein; }); break;
        case "calories": result.sort(function (a, b) { return a.calories - b.calories; }); break;
        default: result.sort(function (a, b) { return b.ratingCount - a.ratingCount; });
      }
      return result;
    }
  };

  window.FusionAPI = FusionAPI;
})(window);
