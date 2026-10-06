/* ==========================================================================
   FUSION — MAIN (page wiring)
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------- HELPERS ---------- */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $all = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var qsParam = function (name) { return new URLSearchParams(location.search).get(name); };
  var setText = function (sel, text) { $(sel).textContent = text; };
  var go = function (url, delay) { setTimeout(function () { location.href = url; }, delay || 0); };
  var cards = function (list, fn) { return list.map(fn).join(""); };
  var wish = function (p) { return FusionRender.productCard(p, { wishlisted: FusionCart.isWishlisted(p.id) }); };

  function toast(message) {
    var el = $("#fusion-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "fusion-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(120%);" +
        "background:var(--gradient-primary);color:#fff;padding:0.85rem 1.6rem;border-radius:var(--radius-full);" +
        "box-shadow:var(--shadow-lg);z-index:2000;font-size:0.9rem;font-weight:600;transition:transform 0.4s cubic-bezier(.22,1,.36,1);";
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(function () { el.style.transform = "translateX(-50%) translateY(0)"; });
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.style.transform = "translateX(-50%) translateY(120%)"; }, 2200);
  }

  /* Runs onVisible once per element when it scrolls into view (or immediately without IntersectionObserver). */
  function observeOnce(targets, onVisible, options) {
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) { targets.forEach(onVisible); return; }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { onVisible(entry.target); observer.unobserve(entry.target); }
      });
    }, options);
    targets.forEach(function (el) { observer.observe(el); });
  }

  /* Marks exactly one chip in a group as pressed. */
  function pressChip(chips, active) {
    chips.forEach(function (c) { c.setAttribute("aria-pressed", c === active ? "true" : "false"); });
  }

  /* ---------- SCROLL REVEAL & STAT COUNTERS ---------- */
  function initScrollReveal() {
    observeOnce($all(".reveal, .reveal-stagger"), function (el) { el.classList.add("is-visible"); },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
  }

  function animateCounter(el) {
    var target = parseFloat(el.getAttribute("data-target"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var suffix = el.getAttribute("data-suffix") || "";
    var start = null;
    requestAnimationFrame(function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / 1500, 1);
      el.textContent = (target * (1 - Math.pow(1 - progress, 3))).toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    });
  }

  function initStatCounters() {
    observeOnce($all("[data-counter]"), animateCounter, { threshold: 0.4 });
  }

  /* ---------- PROMO BAR: truck horn, once per load (retries on first interaction if autoplay is blocked) ---------- */
  function initPromoTruckAudio() {
    if (!$(".promo-bar__truck")) return;
    var audio = new Audio("multimedia/truck.wav");
    audio.volume = 0.5;
    var played = false;
    function honk() {
      if (played) return;
      played = true;
      var p = audio.play();
      if (p && p.catch) p.catch(function () { played = false; });
    }
    honk();
    ["click", "keydown", "touchstart"].forEach(function (evt) { document.addEventListener(evt, honk, { once: true }); });
  }

  /* ---------- NAVBAR ---------- */
  function initNavbar() {
    var toggle = $("#nav-toggle");
    if (toggle) {
      $all(".navbar__menu a").forEach(function (link) {
        link.addEventListener("click", function () { toggle.checked = false; });
      });
    }

    var dropdowns = $all(".navbar__dropdown");
    function closeAll() {
      dropdowns.forEach(function (d) {
        d.classList.remove("is-open");
        var t = d.querySelector(":scope > a");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }

    dropdowns.forEach(function (dropdown) {
      var trigger = dropdown.querySelector(":scope > a");
      if (!trigger) return;
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", function (e) {
        // Below 768px the mega-menu is hidden by CSS — let the link navigate normally.
        if (matchMedia("(max-width: 767px)").matches) return;
        var willOpen = !dropdown.classList.contains("is-open");
        e.preventDefault();
        closeAll();
        if (willOpen) {
          dropdown.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
        }
      });
    });

    if (!dropdowns.length) return;
    document.addEventListener("click", function (e) { if (!e.target.closest(".navbar__dropdown")) closeAll(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
  }

  /* ---------- QUICK VIEW MODAL ---------- */
  function ensureQuickViewDialog() {
    var dialog = $("#quick-view-dialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "quick-view-dialog";
    dialog.className = "quick-view-dialog";
    dialog.innerHTML =
      '<form method="dialog" class="quick-view-dialog__close"><button type="submit" class="btn btn--icon btn--ghost" aria-label="Close quick view">' +
      FusionRender.icon("close", "icon--sm") + "</button></form>" +
      '<div id="quick-view-body" class="quick-view-dialog__body"></div>';
    document.body.appendChild(dialog);
    dialog.addEventListener("click", function (e) {
      var r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
    });
    return dialog;
  }

  function openQuickView(p) {
    var dialog = ensureQuickViewDialog();
    $("#quick-view-body", dialog).innerHTML =
      '<div class="icon-banner icon-banner--' + p.gradient + '" style="border-radius:var(--radius-lg);">' + FusionRender.icon(p.icon, "icon--xl") + "</div>" +
      '<div class="mt-md">' +
        '<span class="product-card__category">' + p.category + "</span>" +
        "<h3>" + p.name + "</h3>" +
        "<p class='mt-sm'>" + p.description + "</p>" +
        '<div class="product-card__tags mt-sm"><span class="tag">Protein ' + p.protein + 'g</span><span class="tag">' + p.calories + ' kcal</span><span class="tag">' + p.deliveryTime + "</span></div>" +
        '<div class="flex flex--between mt-md"><span class="product-card__price" style="font-size:var(--fs-xl);">₹' + p.price + "</span>" +
        '<a href="singlepage.html?id=' + p.id + '" class="btn btn--outline btn--sm">Full Details</a></div>' +
        '<button type="button" class="btn btn--primary btn--block mt-sm" data-action="add-to-cart" data-product-id="' + p.id + '">Add To Cart</button>' +
      "</div>";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  /* ---------- DELEGATED ACTIONS & FORMS (work on every page) ---------- */
  var TOAST_ACTIONS = {
    "google-login": "Google sign-in is a UI placeholder in this demo",
    "google-signup": "Google sign-in is a UI placeholder in this demo",
    "load-more": "You're all caught up for now",
    "read-article": "Full article view coming soon"
  };

  var FORM_TOASTS = {
    "newsletter-form": "Subscribed! Check your inbox for healthy recipes.",
    "login-form": "Login successful (demo)",
    "signup-form": "Account created (demo)",
    "account-settings-form": "Profile updated"
  };

  function readQty() {
    var out = $("#qty-input");
    return out ? (parseInt(out.textContent, 10) || 1) : 1;
  }

  function initGlobalActions(state) {
    document.addEventListener("click", function (e) {
      var target = e.target.closest("[data-action]");
      if (!target) return;
      var action = target.getAttribute("data-action");
      var id = target.getAttribute("data-product-id");

      if (TOAST_ACTIONS[action]) { toast(TOAST_ACTIONS[action]); return; }

      switch (action) {
        case "add-to-cart":
          FusionCart.addToCart(id, target.id === "main-add-to-cart-btn" ? readQty() : 1);
          toast("Added to cart");
          if (state.onCartChange) state.onCartChange();
          break;
        case "buy-now":
          FusionCart.addToCart(id, readQty());
          location.href = "cart.html";
          break;
        case "toggle-favorite": {
          var active = FusionCart.toggleWishlist(id);
          target.classList.toggle("is-active", active);
          target.setAttribute("aria-pressed", active ? "true" : "false");
          var svg = target.querySelector("svg");
          if (svg) svg.classList.toggle("icon--filled", active);
          toast(active ? "Added to wishlist" : "Removed from wishlist");
          break;
        }
        case "quick-view":
          FusionAPI.getProductById(id).then(function (p) { if (p) openQuickView(p); });
          break;
        case "increment-qty":
        case "decrement-qty": {
          var inc = action === "increment-qty";
          var stepper = target.closest(".stepper");
          var cartId = stepper.getAttribute("data-product-id");
          if (cartId) {
            inc ? FusionCart.incrementQty(cartId) : FusionCart.decrementQty(cartId);
            if (state.onCartQtyChange) state.onCartQtyChange();
          } else {
            var out = stepper.querySelector("output");
            var cur = parseInt(out.textContent, 10) || 1;
            out.textContent = String(inc ? cur + 1 : Math.max(1, cur - 1));
          }
          break;
        }
        case "remove-item":
          FusionCart.removeFromCart(id);
          toast("Item removed");
          if (state.onCartChange) state.onCartChange();
          break;
        case "apply-coupon":
          if (state.onCartChange) state.onCartChange();
          break;
        case "checkout":
          e.preventDefault();
          if (FusionCart.getCartCount() === 0) { toast("Your cart is empty"); return; }
          toast("Order placed! Redirecting…");
          FusionCart.clearCart();
          go("index.html", 1200);
          break;
        case "choose-plan":
          toast("Plan selected — redirecting to signup");
          go("signup.html", 900);
          break;
        case "logout":
          go("login.html");
          break;
      }
    });

    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!FORM_TOASTS[form.id]) return;
      e.preventDefault();
      if (form.id === "signup-form") {
        var pw = $("#signup-password", form), cpw = $("#signup-confirm-password", form);
        if (pw && cpw && pw.value !== cpw.value) { toast("Passwords do not match"); return; }
      }
      toast(FORM_TOASTS[form.id]);
      if (form.id === "newsletter-form") form.reset();
    });
  }

  /* ---------- TOOLBAR (search + filter chips + sort) ---------- */
  function initToolbar(toolbarSel, onChange) {
    var toolbar = $(toolbarSel);
    if (!toolbar) return null;
    var state = { query: "", category: "all", sort: "popular" };
    var search = toolbar.querySelector('input[type="search"]');
    var sort = toolbar.querySelector("select");
    var chips = $all(".filter-chip", toolbar);

    toolbar.addEventListener("submit", function (e) { e.preventDefault(); });
    if (search) search.addEventListener("input", function () { state.query = search.value; onChange(state); });
    if (sort) sort.addEventListener("change", function () { state.sort = sort.value; onChange(state); });
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        pressChip(chips, chip);
        state.category = chip.getAttribute("data-filter");
        onChange(state);
      });
    });
    return state;
  }

  /* ---------- PAGE: HOME ---------- */
  function initHome(products) {
    var specialGrid = $("#home-special-grid");
    var bestGrid = $("#home-bestsellers-grid");
    if (specialGrid) {
      var specials = products.filter(function (p) { return p.special; }).slice(0, 3);
      var filler = products.filter(function (p) { return !p.special; })[0];
      var html = cards(specials, function (p, i) { return FusionRender.flipProductCard(p, { auto: i === 0 }); });
      if (filler) html += FusionRender.flipProductCard(filler, { auto: false });
      specialGrid.innerHTML = html;
    }
    if (bestGrid) bestGrid.innerHTML = cards(FusionAPI.sortProducts(products, "popular").slice(0, 4), wish);
  }

  /* ---------- PAGE: CATEGORIES ---------- */
  function initCategories(products, categories) {
    var grid = $("#category-grid");
    if (!grid) return;
    grid.innerHTML = cards(categories, function (cat) {
      var count = cat.isPlan
        ? (cat.slug === "weekly-plans" ? "7 Meals" : "30 Meals")
        : products.filter(function (p) { return p.categorySlug === cat.slug; }).length + " Items";
      return FusionRender.categoryCard(cat, count);
    });
  }

  /* ---------- PAGE: PRODUCTS ---------- */
  function initProducts(products) {
    var grid = $("#product-grid");
    if (!grid) return;

    function render(state) {
      var filtered = FusionAPI.filterProducts(products, state);
      grid.innerHTML = filtered.length
        ? cards(filtered, wish)
        : FusionRender.emptyState("No meals match your search or filters.", "products.html", "Reset");
    }

    var state = initToolbar("#product-toolbar", render) || { query: "", category: "all", sort: "popular" };
    var presetCategory = qsParam("category");
    var presetQuery = qsParam("q");

    if (presetCategory) {
      state.category = presetCategory;
      var chip = $('#category-filter [data-filter="' + presetCategory + '"]');
      if (chip) pressChip($all(".filter-chip", $("#category-filter")), chip);
    }
    if (presetQuery) {
      state.query = presetQuery;
      var search = $("#product-search");
      if (search) search.value = presetQuery;
    }
    render(state);
  }

  /* ---------- PAGE: NUTRITION ---------- */
  function initNutrition(products) {
    var grid = $("#nutrition-grid");
    if (!grid) return;

    function render(state) {
      var filtered = FusionAPI.filterProducts(products, state);
      grid.innerHTML = filtered.length
        ? cards(filtered, FusionRender.nutritionCard)
        : FusionRender.emptyState("No meals match your search or filters.", "nutrition.html", "Reset");
    }

    render(initToolbar("#nutrition-toolbar", render) || { query: "", category: "all", sort: "default" });
  }

  /* ---------- PAGE: SINGLE PRODUCT ---------- */
  function macroBar(cls, label, value, pct) {
    return '<div class="macro"><span class="macro__label"><span>' + label + "</span><span>" + value +
      '</span></span><div class="macro__bar ' + cls + '"><span style="width:' + pct + '%"></span></div></div>';
  }

  function initGallery(product) {
    var hasPhoto = !!product.image1;
    var gallery = $("#product-gallery");
    var mainIcon = $("#gallery-icon-main");
    var thumbs = [$("#gallery-thumb-1"), $("#gallery-thumb-2")];

    gallery.classList.toggle("gallery--icon-only", !hasPhoto);
    $("#gallery-main-frame").className = "gallery__frame icon-banner icon-banner--" + product.gradient;
    thumbs.forEach(function (t) { t.hidden = !hasPhoto; });

    if (hasPhoto) {
      // --product-img-1/2 are read by css/components.css; the hover swap itself is pure CSS.
      gallery.style.setProperty("--product-img-1", "url('" + product.image1 + "')");
      gallery.style.setProperty("--product-img-2", "url('" + (product.image2 || product.image1) + "')");
      if (mainIcon) mainIcon.style.display = "none";
      thumbs.forEach(function (thumb, i) {
        thumb.classList.remove("is-active");
        // Click "pins" a thumbnail's photo so touch devices (no hover) get the same interaction.
        thumb.onclick = function () {
          thumbs[0].classList.toggle("is-active", i === 0);
          thumbs[1].classList.toggle("is-active", i === 1);
        };
      });
    } else {
      gallery.style.removeProperty("--product-img-1");
      gallery.style.removeProperty("--product-img-2");
      if (mainIcon) {
        mainIcon.style.display = "";
        var use = mainIcon.querySelector("use");
        if (use) use.setAttribute("href", "/images/icons/sprite.svg#icon-" + product.icon);
      }
    }
  }

  function initSinglePage(products) {
    if (!$("#product-info")) return;

    FusionAPI.getProductById(qsParam("id") || products[0].id).then(function (product) {
      product = product || products[0];
      document.title = product.name + " | FUSION — A Healthy Lifestyle";

      setText("#breadcrumb-current", product.name);
      setText("#product-category-label", product.category);
      setText("#product-title", product.name);
      $("#product-rating").innerHTML = FusionRender.icon("star", "icon--xs icon--filled") + " " + product.rating +
        ' <span class="rating__count">(' + product.ratingCount + " reviews)</span>";
      setText("#product-description", product.description);
      setText("#product-price", "₹" + product.price);
      setText("#product-delivery", "Delivery in " + product.deliveryTime);

      initGallery(product);

      $("#nutrition-summary-macros").innerHTML =
        macroBar("macro__bar--protein", "Protein", product.protein + "g", Math.min(product.protein * 2.8, 100)) +
        macroBar("macro__bar--carbs", "Carbs", product.carbs + "g", Math.min(product.carbs * 1.8, 100)) +
        macroBar("macro__bar--fat", "Fat", product.fat + "g", Math.min(product.fat * 3.2, 100)) +
        macroBar("", "Calories", product.calories + " kcal", Math.min(product.calories / 6, 100));

      setText("#tab-ingredients", product.ingredients);
      setText("#tab-preparation", product.preparation);
      setText("#tab-benefits", product.benefits);
      $("#tab-serving").innerHTML = "<strong>Serving Size:</strong> " + product.servingSize + " &nbsp; <strong>Allergens:</strong> " + product.allergens;
      setText("#tab-delivery", "Delivered in insulated, eco-friendly packaging. Estimated delivery: " + product.deliveryTime + " from order confirmation.");

      var favBtn = $("#product-wishlist-btn");
      if (favBtn) {
        var wished = FusionCart.isWishlisted(product.id);
        favBtn.setAttribute("data-product-id", product.id);
        favBtn.setAttribute("aria-pressed", wished ? "true" : "false");
        favBtn.classList.toggle("is-active", wished);
      }
      $all('[data-action="add-to-cart"], [data-action="buy-now"]').forEach(function (btn) {
        if (!btn.closest("#related-meals-grid")) btn.setAttribute("data-product-id", product.id);
      });

      FusionAPI.getRelatedProducts(product.id, 4).then(function (related) {
        var relGrid = $("#related-meals-grid");
        if (relGrid) relGrid.innerHTML = cards(related, wish);
      });
    });
  }

  /* ---------- PAGE: CART ---------- */
  function initCartPage(products) {
    var itemsWrap = $("#cart-items");
    if (!itemsWrap) return null;

    function render() {
      var coupon = $("#coupon-code");
      var s = FusionCart.getCartSummary(products, coupon ? coupon.value : "");
      var money = FusionCart.formatCurrency;

      itemsWrap.innerHTML = s.lines.length
        ? cards(s.lines, FusionRender.cartItem)
        : FusionRender.emptyState("Your cart is empty.", "products.html", "Browse Meals");

      setText("#cart-subtotal", money(s.subtotal));
      setText("#cart-delivery", s.delivery === 0 ? "Free" : money(s.delivery));
      setText("#cart-discount", "−" + money(s.discount));
      setText("#cart-total", money(s.total));

      var countLabel = $("#cart-item-count");
      if (countLabel) countLabel.textContent = FusionCart.getCartCount();
    }

    render();
    return render;
  }

  /* ---------- PAGE: PROFILE (favorite meals) ---------- */
  function initProfile(products) {
    var wrap = $("#favorite-meals-grid");
    if (!wrap) return;
    var wishlist = FusionCart.getWishlist();
    var favorites = products.filter(function (p) { return wishlist.indexOf(p.id) !== -1; });
    wrap.innerHTML = favorites.length
      ? cards(favorites, function (p) { return FusionRender.productCard(p, { wishlisted: true }); })
      : FusionRender.emptyState("No favorite meals yet — tap the heart on any meal to save it here.", "products.html", "Browse Meals");
  }

  /* ---------- BLOG (static content — DOM-only filter) ---------- */
  function initBlogFilter() {
    var group = $("#blog-category-filter");
    if (!group) return;
    var chips = $all(".filter-chip", group);
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        pressChip(chips, chip);
        var filter = chip.getAttribute("data-filter");
        $all("#blog-grid > article").forEach(function (card) {
          card.style.display = filter === "all" || card.getAttribute("data-category") === filter ? "" : "none";
        });
      });
    });
  }

  /* ---------- THEME TOGGLE (light / dark) ---------- */
  function initThemeToggle() {
    var btn = $("#theme-toggle");
    if (!btn) return;
    var root = document.documentElement;

    function apply(theme) {
      root.setAttribute("data-theme", theme);
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }

    // The inline <script> in <head> already set data-theme before first paint — just sync the button.
    apply(root.getAttribute("data-theme") || "light");
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem("fusion_theme", next); } catch (err) { /* storage unavailable */ }
      apply(next);
    });
  }

  /* ---------- API-DOWN FALLBACK ---------- */
  function showApiUnreachableError(err) {
    console.error("[FUSION] Could not load products from the API:", err && err.message);
    var message = "Couldn't reach the FUSION API. Make sure the server is running " +
      "(cd server && npm start) and reachable at the address configured in js/api.js, then reload this page.";
    ["#product-grid", "#nutrition-grid", "#home-special-grid", "#home-bestsellers-grid",
      "#category-grid", "#cart-items", "#favorite-meals-grid", "#related-meals-grid"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.innerHTML = FusionRender.emptyState(message);
    });
  }

  /* ---------- BOOT ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    initNavbar();
    initBlogFilter();
    initScrollReveal();
    initStatCounters();
    initPromoTruckAudio();
    FusionCart.updateCartBadges();

    var cartRender = null;
    initGlobalActions({
      // Add/remove changes the item count, so the header badge updates too.
      onCartChange: function () {
        if (cartRender) cartRender();
        FusionCart.updateCartBadges();
      },
      // Stepper clicks only refresh the cart page totals, not the header badge.
      onCartQtyChange: function () { if (cartRender) cartRender(); }
    });

    FusionAPI.getProducts().then(function (products) {
      initHome(products);
      initProducts(products);
      initNutrition(products);
      initSinglePage(products);
      initProfile(products);
      cartRender = initCartPage(products);

      if (!$("#category-grid")) return;
      FusionAPI.getCategories()
        .then(function (categories) { initCategories(products, categories); })
        .catch(function () { /* category rendering is optional */ });
    }).catch(showApiUnreachableError);
  });
})();