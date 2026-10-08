window.S3_BASE_URL = 'https://inventorydata-s3-bucket.s3.amazonaws.com/';
window.API_BASE_URL = window.API_BASE_URL;

if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
    console.log = console.debug = console.info = console.warn = function() {};
}
const APP_CONFIG = {
    ENDPOINTS: {
        CATEGORIES: `${API_BASE_URL}/categories`,
        CATEGORY_PRODUCTS: (id) => `${API_BASE_URL}/categories/${id}/products`,
        TOP_SELLING: `${API_BASE_URL}/products/top-selling`,
        BANNERS: `${API_BASE_URL}/banners`,
        APP_SETTINGS: `${API_BASE_URL}/app-settings`,
    },
    FALLBACK_IMAGE: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop',
};
(() => {
    const originalFetch = window.fetch.bind(window);
    const inflight = new Map();
    const CACHE_PREFIX = 'rapid_api_safe_v1:';

    const CACHE_TTL = {
        categories: 5 * 60 * 1000,
        banners: 5 * 60 * 1000,
        topSelling: 2 * 60 * 1000,
        appSettings: 10 * 60 * 1000,
        reels: 2 * 60 * 1000,
        product: 2 * 60 * 1000
    };

    function getCacheType(url) {
        try {
            const parsed = new URL(url, window.location.href);
            const cleanUrl = parsed.origin + parsed.pathname;

            if (cleanUrl === new URL(APP_CONFIG.ENDPOINTS.CATEGORIES, window.location.href).href) {
                return 'categories';
            }
            if (cleanUrl === new URL(APP_CONFIG.ENDPOINTS.BANNERS, window.location.href).href) {
                return 'banners';
            }
            if (cleanUrl === new URL(APP_CONFIG.ENDPOINTS.TOP_SELLING, window.location.href).href) {
                return 'topSelling';
            }
            if (cleanUrl === new URL(APP_CONFIG.ENDPOINTS.APP_SETTINGS, window.location.href).href) {
                return 'appSettings';
            }
            if (/\/instagram\/reels\/?$/.test(parsed.pathname)) {
                return 'reels';
            }
            if (/\/products\/[^/]+\/?$/.test(parsed.pathname)) {
                return 'product';
            }
        } catch (e) {}

        return null;
    }

    function readCache(key, ttl) {
        try {
            const raw = sessionStorage.getItem(CACHE_PREFIX + key);
            if (!raw) return null;

            const cached = JSON.parse(raw);
            if (!cached || !cached.timestamp || !cached.body) return null;

            if (Date.now() - cached.timestamp > ttl) {
                sessionStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }

            return cached;
        } catch (e) {
            return null;
        }
    }

    function writeCache(key, value) {
        try {
            sessionStorage.setItem(
                CACHE_PREFIX + key,
                JSON.stringify({
                    timestamp: Date.now(),
                    status: value.status,
                    statusText: value.statusText,
                    body: value.body
                })
            );
        } catch (e) {}
    }

    function makeResponse(cached) {
        return new Response(cached.body, {
            status: cached.status || 200,
            statusText: cached.statusText || '',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    window.fetch = function(input, init) {
        const method = String(
            (init && init.method) ||
            (input && input.method) ||
            'GET'
        ).toUpperCase();

        if (method !== 'GET') {
            return originalFetch(input, init);
        }

        let url;
        try {
            url = typeof input === 'string' ? input : input.url;
        } catch (e) {
            return originalFetch(input, init);
        }

        const type = getCacheType(url);
        if (!type) {
            return originalFetch(input, init);
        }

        // Never cache user-specific category ordering.
        if (url.includes('/categories/order')) {
            return originalFetch(input, init);
        }

        const ttl = CACHE_TTL[type];
        const cacheKey = url;
        const cached = readCache(cacheKey, ttl);
        if (cached) {
            return Promise.resolve(makeResponse(cached));
        }

        if (inflight.has(cacheKey)) {
            return inflight.get(cacheKey).then(makeResponse);
        }

        const requestPromise = originalFetch(input, init)
            .then(async (response) => {
                const clone = response.clone();
                const body = await clone.text();

                const result = {
                    status: response.status,
                    statusText: response.statusText,
                    body: body
                };

                if (response.ok) {
                    writeCache(cacheKey, result);
                }

                return result;
            })
            .finally(() => {
                inflight.delete(cacheKey);
            });

        inflight.set(cacheKey, requestPromise);

        return requestPromise.then(makeResponse);
    };
})();

class RapidRetailsEngine {
    constructor() {
        this.page = document.body.dataset.page || 'landing';
        this.slideIdx = 0;
        this.slideTimer = null;
        this.allCategories = [];
        this.allBanners = [];
        this.userCategories = [];
        this.isLoggedIn = !!localStorage.getItem('token');
        this.autoScrollTimer = null;
        this.scrollTimeout = null;
        this.styleResizeTimer = null;
        this.apiCache = new Map();
    }

    async init() {
        await this.fetchAppSettings();
        if (this.page === 'landing') await this.initLanding();
        this.renderHeader();
        this.renderBottomNav();
        this.initSearchRedirect();
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (this.page === 'landing') {
                    this.renderPromotionalBanners();  
                    this.renderHeroSlider();
                    this.renderStyleSpotlight();
                }
                this.renderHeader();
            }, 250);
        });
    }
    getProductPrice(product) {
        return (product.product_price && product.product_price != "0.00") 
            ? product.product_price 
            : (product.final_price || product.price || 0);
    }

    getBannerImage(banner, isMobile) {
        return isMobile ? (banner.mobile_image || banner.image) : (banner.image || banner.mobile_image);
    }

    resolveImage(path) {
        if (!path) return APP_CONFIG.FALLBACK_IMAGE;
        if (path.startsWith('http')) return path;
        if (!path.includes('amazonaws.com')) return S3_BASE_URL + path;
        return path;
    }
    applyAppSettings() {
       if (!this.appSettings) return;
        const headerLogo = document.getElementById('site-logo');
        if (headerLogo && this.appSettings.header_logo) {
            headerLogo.src = this.appSettings.header_logo;
            headerLogo.onerror = function () {
                this.src = 'https://placehold.co/120x40?text=LOGO';
            };
        }
        if (this.appSettings.app_name) document.title = this.appSettings.app_name;
    }
    renderHeader() {
        const header = document.getElementById('site-header');
        if (!header) return;

        const isDesktop = window.innerWidth >= 1025;
        if (isDesktop) {
            if (!this.allCategories || this.allCategories.length === 0) {
                fetch(APP_CONFIG.ENDPOINTS.CATEGORIES)
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            this.allCategories = data.data;
                            this.renderHeader();
                        }
                    });
                return;
            }
            const topCategories = this.allCategories.slice(0, 5);
            const categoriesHtml = topCategories.map(cat => {
            let url = `/collection/${cat.slug}`;

            if (cat.slug === "trending") {
                url = "/top-selling";
            }

            if (cat.slug === "bestsellers") {
                url = "/best-selling";
            }

            return `
                <a href="${url}"
                class="nav-item"
                data-cat-id="${cat.id}"
                data-cat-name="${cat.name}">
                    ${cat.name.toUpperCase()}
                </a>
            `;
        }).join('');
            header.innerHTML = `
                <div class="web-header">
                    <div class="top-bar">Free Shipping on Orders Above ₹999 | Use Code: FIRST50</div>
                    <div class="main-header">
                        <div class="logo-area">
                            <a href="/" class="logo">
                                <img src="" alt="Logo" id="site-logo" class="site-logo"
                                onerror="this.src='https://placehold.co/120x40?text=LOGO'">
                            </a>
                            <nav class="nav-menu" id="navMenu">
                                ${categoriesHtml}
                            </nav>
                        </div>
                        <div class="search-area">
                            <div class="search-box" style="position:relative;">
                                <input type="text" id="web-search-input" placeholder="Search for " autocomplete="off">
                                <button class="search-icon-btn" aria-label="Search">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="10" cy="10" r="7"/>
                                        <line x1="21" y1="21" x2="15" y2="15"/>
                                    </svg>
                                </button>
                                <div id="web-search-suggestions" class="web-search-suggestions" style="display:none;"></div>
                            </div>
                        </div>

                        <div class="header-actions">
                            <a href="javascript:void(0)" class="action-link" onclick="if(!localStorage.getItem('token')) { showLoginPopup(); } else { window.location.href='/profile'; }">
                                <svg class="header-icon" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
                                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Profile
                            </a>

                            <a href="/wishlist" class="action-link">
                                <svg class="header-icon" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 21s-6-4.35-9-8.5C-1 6.5 4 2 8 5c2 1.5 4 3.5 4 3.5S14 6.5 16 5c4-3 9 1.5 5 7.5C18 16.65 12 21 12 21z"
                                        stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Wishlist
                            </a>

                            <a href="/cart" class="action-link cart-link">
                                <span class="cart-icon-wrapper">
                                    <svg class="header-icon" viewBox="0 0 24 24" fill="none">
                                        <circle cx="9" cy="21" r="1.5" stroke="currentColor" stroke-width="2"/>
                                        <circle cx="18" cy="21" r="1.5" stroke="currentColor" stroke-width="2"/>
                                        <path d="M2 2h3l3 12h11l2-8H6" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    <span id="web-cart-count-badge">0</span>
                                </span>
                                Cart
                            </a>
                        </div>
                    </div>
                </div>
                <div class="all-categories-popup" id="allCategoriesPopup" style="display:none; position:absolute; top:100%; left:0; width:100%; background:white; box-shadow:0 10px 25px rgba(0,0,0,0.1); z-index:1000; border-top:1px solid #f0f0f0;"></div>
            `;
            this.setupAllCategoriesPopup();
            this.initWebSearchDropdown();
            this.applyAppSettings();
            setTimeout(() => updateCartCountBadge(), 0);
        } else {
            const isCartPage = document.body.classList.contains('cart-page');
            const isCheckoutPage = document.body.classList.contains('checkout-page');
            const isProfilePage = document.body.classList.contains('profile-page');
            const isOrdersPage = document.body.classList.contains('orders-page');
            const isWishlistPage = document.body.classList.contains('wishlist-page'); 
            const isOrderConfirmationPage = document.body.classList.contains('order-confirmation-page');
            const isTermsPage = document.body.classList.contains('terms-page') || window.location.pathname === '/terms';
            const isReturnsPage = document.body.classList.contains('returns-page') || window.location.pathname === '/returns';
            const isPrivacyPage = document.body.classList.contains('privacy-page') || window.location.pathname === '/privacy-policy';
            const showBackButton = isCartPage || isCheckoutPage || isProfilePage || isOrdersPage || isWishlistPage || isOrderConfirmationPage || isTermsPage || isReturnsPage || isPrivacyPage;

            header.innerHTML = `
                <div class="container">
                    <div class="header-container">
                        ${showBackButton ? '<button class="back-btn-header" onclick="goBack()">←</button>' : ''}
                        <div class="logo-search-container">
                            <div class="header-logo">
                                <a href="/">
                                    <img src="" alt="Logo" class="site-logo" id="site-logo"                                    
                                    onerror="this.src='https://placehold.co/100x35?text=RAPID'">
                                </a>
                            </div>
                            <div class="search-wrapper">
                                <input id="landing-search" type="text" placeholder="Search for Category, Product ...">
                                <button class="search-icon-btn" onclick="window.location.href='/search'" style="background:none; border:none; cursor:pointer; padding:0; display:flex; align-items:center;">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="10" cy="10" r="7"/>
                                       <line x1="21" y1="21" x2="15" y2="15"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="header-icons">
                            <button class="header-icon-btn" onclick="window.location.href='/wishlist'">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333333" stroke-width="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        this.applyAppSettings();
    }

    initWebSearchDropdown() {
        setTimeout(() => {
            const input = document.getElementById("web-search-input");
            if (!input) {
                console.log("Web search input not found");
                return;
            }
            console.log("Web search input found");
            let suggestionsBox = document.getElementById("web-search-suggestions");
            if (!suggestionsBox) {
                const parent = input.parentElement;
                const div = document.createElement("div");
                div.id = "web-search-suggestions";
                div.className = "web-search-suggestions";
                div.style.display = "none";
                parent.appendChild(div);
                suggestionsBox = div;
            }
            let timer;
            let currentController = null;
            const fetchAndShowSuggestions = async (q) => {
                if (currentController) {
                    currentController.abort();
                }
                currentController = new AbortController();
                try {
                    const res = await fetch(`${API_BASE_URL}/products/suggestions?q=${encodeURIComponent(q)}`, {
                        signal: currentController.signal
                    });
                    const data = await res.json();
                    if (!data.success) return;

                    const products = data.data.products || [];
                    let html = "";

                    products.forEach(p => {
                        html += `<div class="web-suggestion-item" onclick="window.location.href='/product/${p.slug}'">${p.name}</div>`;
                    });

                    if (html === "") {
                        html = `<div class="web-suggestion-item">No results found for "${q}"</div>`;
                    }

                    suggestionsBox.innerHTML = html;
                    suggestionsBox.style.display = "block";
                } catch (err) {
                    if (err.name !== 'AbortError') console.log(err);
                }
            };

            input.addEventListener("input", async (e) => {
                clearTimeout(timer);
                const q = e.target.value.trim();
                if (q.length === 0) {
                    suggestionsBox.style.display = "none";
                    suggestionsBox.innerHTML = "";
                    return;
                }
                if (q.length === 1) {
                    await fetchAndShowSuggestions(q);
                    return;
                }
                timer = setTimeout(() => fetchAndShowSuggestions(q), 200);
            });
            input.addEventListener("keydown", function (e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const q = input.value.trim();
            if (!q) return;
            window.location.href = `/products?search=${encodeURIComponent(q)}`;
        });
            document.addEventListener("click", (e) => {
                if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
                    suggestionsBox.style.display = "none";
                }
            });
        }, 500);
    }

    setupAllCategoriesPopup() {
        const navItems = document.querySelectorAll('.nav-item');
        const popup = document.getElementById('allCategoriesPopup');

        if (!navItems.length || !popup) return;
        let hideTimeout = null;

        const showPopup = () => {
            if (hideTimeout) clearTimeout(hideTimeout);
            this.renderAllCategoriesPopup();
            popup.style.display = 'block';
        };
        const hidePopup = () => {
            hideTimeout = setTimeout(() => popup.style.display = 'none', 200);
        };
        navItems.forEach(item => {
            item.addEventListener('mouseenter', showPopup);
            item.addEventListener('mouseleave', hidePopup);
        });
        popup.addEventListener('mouseenter', () => {
            if (hideTimeout) clearTimeout(hideTimeout);
            popup.style.display = 'block';
        });
        popup.addEventListener('mouseleave', hidePopup);
    }
    renderAllCategoriesPopup() {
        const popup = document.getElementById('allCategoriesPopup');
        if (!popup) return;

        if (!this.allCategories || this.allCategories.length === 0) {
            popup.innerHTML = '<div style="padding:40px; text-align:center;">Loading categories...</div>';
            return;
        }
        const categoriesWithSub = this.allCategories.filter(cat => cat.children && cat.children.length > 0);
        const columnSize = Math.ceil(categoriesWithSub.length / 5);
        const columns = [];

        for (let i = 0; i < 5; i++) {
            columns.push(categoriesWithSub.slice(i * columnSize, (i + 1) * columnSize));
        }
        let html = `<div style="max-width:1200px; margin:0 auto; padding:30px; display:grid; grid-template-columns:repeat(5,1fr); gap:25px;">`;
        columns.forEach(col => {
            if (col.length > 0) {
                html += `<div>`;
                col.forEach(cat => {
                    html += `<div style="margin-bottom:20px;">
                        <h3 style="font-size:14px; font-weight:700; color:#282c3f; margin-bottom:12px; border-bottom:2px solid #ff3f6c; padding-bottom:6px; display:inline-block;">${cat.name}</h3>
                        <ul style="list-style:none; padding:0; margin-top:12px;">`;

                    if (cat.children && cat.children.length > 0) {
                        cat.children.slice(0, 6).forEach(sub => {
                            let subSlug = sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
html += `<li style="margin-bottom:8px;"><a href="/collection/${subSlug}" style="text-decoration:none; color:#696b79; font-size:13px;">${sub.name}</a></li>`;
                        });
                        if (cat.children.length > 6) {
                            html += `<li style="margin-top:5px;"><a href="/category/${cat.id}" style="color:#ff3f6c; font-size:11px; font-weight:600; text-decoration:none;">+${cat.children.length - 6} more →</a></li>`;
                        }
                    }
                    html += `</ul></div>`;
                });
                html += `</div>`;
            }
        });
        html += `</div>`;
        popup.innerHTML = html;
    }
    initSearchRedirect() {
        const mobileSearchInput = document.getElementById("landing-search");
        if (mobileSearchInput) {
            mobileSearchInput.addEventListener("focus", () => window.location.href = "/search");
        }
    }
    renderBottomNav() {
        const nav = document.getElementById('mobile-bottom-nav');
        if (!nav) return;
        const currentPath = window.location.pathname;
        let activePage = this.page;
        if (currentPath === '/' || currentPath === '') activePage = 'landing';
        else if (currentPath === '/trends') activePage = 'trends';
        else if (currentPath === '/categories') activePage = 'all-categories';
        else if (currentPath === '/cart') activePage = 'cart';
        else if (currentPath === '/profile' || currentPath.includes('/profile')) activePage = 'profile';
        else if (currentPath === '/wishlist') activePage = 'wishlist';
        else if (currentPath === '/orders') activePage = 'orders';
        nav.innerHTML = `
            <a href="/" class="nav-item-figma ${activePage === 'landing' ? 'active' : ''}">
                <div class="nav-icon-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <span>Home</span>
            </a>
            <a href="/categories" class="nav-item-figma ${activePage === 'all-categories' ? 'active' : ''}">
                <div class="nav-icon-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2"/>
                        <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2"/>
                        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2"/>
                        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2"/>

                    </svg>
                </div>

                <span>Categories</span>

            </a>

            <a href="/cart" class="nav-item-figma ${activePage === 'cart' ? 'active' : ''}">

                <div class="nav-icon-box" style="position: relative;">

                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">

                        <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"

                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

                        <circle cx="9" cy="21" r="1.5" fill="currentColor"/>

                        <circle cx="20" cy="21" r="1.5" fill="currentColor"/>

                    </svg>

                    <span id="cart-count-badge" style="position: absolute; top: -6px; right: -10px; background: red; color: white; font-size: 11px; padding: 2px 6px; border-radius: 50%; display: none;">0</span>

                </div>

                <span>Cart</span>

            </a>

            <a href="javascript:void(0)" class="nav-item-figma ${activePage === 'profile' ? 'active' : ''}" onclick="if(!localStorage.getItem('token')) { showLoginPopup(); } else { window.location.href='/profile'; }">

                <div class="nav-icon-box">

                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

                        <path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>

                        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>

                    </svg>

                </div>

                <span>Profile</span>

            </a>

        `;

        updateCartCountBadge();

    }



    async initLanding() {

        const [catsRes, bannersRes, topSellingRes] = await Promise.all([

            fetch(APP_CONFIG.ENDPOINTS.CATEGORIES).then(r => r.json()),

            fetch(APP_CONFIG.ENDPOINTS.BANNERS).then(r => r.json()),

            fetch(APP_CONFIG.ENDPOINTS.TOP_SELLING).then(r => r.json())

        ]);



        if (catsRes.success) this.allCategories = catsRes.data;

        if (bannersRes.success) this.allBanners = bannersRes.data;

        if (this.isLoggedIn) await this.fetchUserCategoryOrder();



        await this.renderHeroSlider();

        await this.renderTrending();

        await this.renderPromotionalBanners();

        // Do not block the landing-page skeleton on product-detail hover preloading.
        // Existing Style Spotlight rendering + hover logic remains unchanged.
        this.renderStyleSpotlight().catch(() => {});

        await this.renderDynamicCategorySections();



        // Reels are already triggered by renderDynamicCategorySections().
        // Keep this call non-blocking so slow Instagram API cannot delay page visibility.
        this.loadTrendingReels().catch(() => {});





        const skeleton = document.getElementById('skeleton-loader');

        const realContent = document.getElementById('real-content');

        if (skeleton) skeleton.style.display = 'none';

        if (realContent) realContent.style.display = 'block';



        window.addEventListener('resize', () => {

            clearTimeout(this.styleResizeTimer);

            this.styleResizeTimer = setTimeout(() => {

                if (this.page === 'landing') {

                    this.renderStyleSpotlight();

                    if (window.innerWidth >= 1025) {
                        this.loadTrendingReels().catch(() => {});
                    }

                }

            }, 200);

        });

    }



    async fetchUserCategoryOrder() {

        try {

            const response = await fetch(`${API_BASE_URL}/categories/order`, {

                headers: {

                    'Authorization': `Bearer ${localStorage.getItem('token')}`,

                    'Accept': 'application/json'

                }

            });

            const data = await response.json();

            if (data.success && data.data.length > 0) {

                this.userCategories = data.data;

                // console.log('User categories loaded:', this.userCategories);

            }

        } catch (error) {

            console.error('Error fetching user categories:', error);

        }

    }



    async renderHeroSlider() {

        const slider = document.getElementById('hero-slider');

        const dots = document.getElementById('slider-dots');

        if (!slider) return;



        let heroBanners = this.allBanners.filter(b => b.position === 'hero');



        if (heroBanners.length === 0 && this.allBanners.length > 0) {

            heroBanners = this.allBanners;

        }



        if (heroBanners.length === 0) return;



        const isMobile = window.innerWidth < 768;



        slider.innerHTML = heroBanners.map((b, i) => {

            const hasText = b.title || b.subtitle;

            const bannerImage = this.getBannerImage(b, isMobile);



            return `<div class="slide ${i === 0 ? 'active' : ''}">

                <img src="${this.resolveImage(bannerImage)}" class="slide-img-figma" alt="${b.title || 'Banner'}" loading="${i === 0 ? 'eager' : 'lazy'}" fetchpriority="${i === 0 ? 'high' : 'auto'}">

                ${hasText ? `<div class="slide-content-figma">

                    <h1>${b.title || ''}</h1>

                    <p>${b.subtitle || ''}</p>

                    <button class="shop-now-btn" onclick="window.location.href='${b.button_link || '#'}'">${b.button_text || 'Shop Now'}</button>

                </div>` : ''}

            </div>`;

        }).join('');



        if (dots) {

            dots.innerHTML = heroBanners.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`).join('');

            document.querySelectorAll('.dot').forEach(dot => {

                dot.addEventListener('click', (e) => {

                    const idx = parseInt(e.target.dataset.idx);

                    this.changeSlide(idx);

                });

            });

        }



        this.startSlider(heroBanners.length);

    }



    startSlider(count) {

        if (this.slideTimer) clearInterval(this.slideTimer);

        this.slideTimer = setInterval(() => {

            const next = (this.slideIdx + 1) % count;

            this.changeSlide(next);

        }, 7000);

    }



    changeSlide(idx) {

        const slides = document.querySelectorAll('.slide');

        const dots = document.querySelectorAll('.dot');

        if (!slides.length) return;

        slides[this.slideIdx].classList.remove('active');

        if (dots.length) dots[this.slideIdx].classList.remove('active');

        this.slideIdx = idx;

        slides[this.slideIdx].classList.add('active');

        if (dots.length) dots[this.slideIdx].classList.add('active');

    }



    async fetchAppSettings() {

        try {

            const response = await fetch(APP_CONFIG.ENDPOINTS.APP_SETTINGS);

            const data = await response.json();

            if (data.success) {

                this.appSettings = data.data;

                // console.log("App Settings Loaded:", this.appSettings);

                this.applyAppSettings();

            }

        } catch (error) {

            console.error("Error loading app settings:", error);

        }

    }



    async renderPromotionalBanners() {

    const banners = this.allBanners.filter(b => b.position === 'mid');

    const container1 = document.getElementById('mid-banner-1-container');

    const container2 = document.getElementById('mid-banner-2-container');



    if (!banners.length) return;



    const isMobile = window.innerWidth < 768;



    const createBannerHTML = (b) => {

        const bannerImage = this.getBannerImage(b, isMobile);

        const hasText = b.title || b.subtitle || b.button_text;

        return `

            <div style="position: relative; border-radius: 16px; overflow: hidden; background: #f5f5f5; height: 100%;">

                <img src="${this.resolveImage(bannerImage)}" style="width: 100%; height: auto; display: block;" loading="lazy">

                ${hasText ? `

                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); padding: 20px; color: white;">

                        ${b.title ? `<h3 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${b.title}</h3>` : ''}

                        ${b.subtitle ? `<p style="font-size: 12px; margin-bottom: 8px;">${b.subtitle}</p>` : ''}

                        ${b.button_text ? `<button onclick="window.location.href='${b.button_link || '#'}'" style="background: #fff; color: #000; border: none; padding: 6px 16px; border-radius: 30px; font-size: 12px; font-weight: 600; cursor: pointer;">${b.button_text}</button>` : ''}

                    </div>

                ` : ''}

            </div>

        `;

    };



    if (banners.length === 2) {

        const b1 = banners[0];

        const b2 = banners[1];



        if (container1) {

            container1.innerHTML = `

                <div style="display: flex; gap: 16px; width: 100%; margin: 20px 0;">

                    <div style="flex: 1; min-width: 0;">${createBannerHTML(b1)}</div>

                    <div style="flex: 1; min-width: 0;">${createBannerHTML(b2)}</div>

                </div>

            `;

        }

        if (container2) container2.innerHTML = '';

        return;

    }



    if (banners.length > 2) {

        if (container1) {

            let bannersHtml = `<div class="mid-banner-carousel" id="midBannerCarousel">

                <div class="mid-banner-track" id="midBannerTrack" style="display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 8px 0;">`;



            banners.forEach(b => {

                bannersHtml += `<div class="mid-banner-slide" style="flex: 0 0 85%; scroll-snap-align: start; min-width: 85%;">${createBannerHTML(b)}</div>`;

            });



            bannersHtml += `</div></div>`;

            container1.innerHTML = bannersHtml;

            this.startMidBannerAutoScroll();

        }

        if (container2) container2.innerHTML = '';

        return;

    }



    if (banners.length === 1) {

        const b = banners[0];

        if (container1) {

            container1.innerHTML = createBannerHTML(b);

        }

        if (container2) container2.innerHTML = '';

        return;

    }

}



    startMidBannerAutoScroll() {

        const track = document.getElementById('midBannerTrack');

        if (!track) return;



        let autoScrollInterval;

        let isHovering = false;



        const slides = document.querySelectorAll('.mid-banner-slide');

        if (slides.length <= 1) return;



        function autoScroll() {

            if (isHovering) return;

            const maxScroll = track.scrollWidth - track.clientWidth;

            if (track.scrollLeft + 10 >= maxScroll) {

                track.scrollTo({ left: 0, behavior: 'smooth' });

            } else {

                track.scrollBy({ left: track.clientWidth * 0.8, behavior: 'smooth' });

            }

        }



        function startScroll() {

            if (autoScrollInterval) clearInterval(autoScrollInterval);

            autoScrollInterval = setInterval(autoScroll, 3000);

        }



        function stopScroll() {

            if (autoScrollInterval) clearInterval(autoScrollInterval);

        }



        track.addEventListener('mouseenter', () => { isHovering = true; stopScroll(); });

        track.addEventListener('mouseleave', () => { isHovering = false; startScroll(); });

        track.addEventListener('touchstart', () => { isHovering = true; stopScroll(); });

        track.addEventListener('touchend', () => { isHovering = false; startScroll(); });



        startScroll();

    }



    showCategoryPopup(category) {

        let popup = document.getElementById('category-popup-overlay');

        if (!popup) {

            const popupHTML = `<div class="category-popup-overlay" id="category-popup-overlay" onclick="window.app.hideCategoryPopup()">

                <div class="category-popup-content" onclick="event.stopPropagation()">

                    <div class="category-popup-header">

                        <h2 id="category-popup-title">Category</h2>

                        <span class="category-popup-close" onclick="window.app.hideCategoryPopup()">×</span>

                    </div>

                    <div class="category-popup-body" id="category-popup-body"></div>

                </div>

            </div>`;

            document.body.insertAdjacentHTML('beforeend', popupHTML);

        }



        popup = document.getElementById('category-popup-overlay');

        const title = document.getElementById('category-popup-title');

        const body = document.getElementById('category-popup-body');



        if (!popup || !title || !body) return;



        title.textContent = category.name;



        if (category.children && category.children.length > 0) {

            const fallbackImage = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200&auto=format&fit=crop';

            body.innerHTML = category.children.map(child => `

                <div class="subcategory-card" onclick="window.location.href='/products?subcategory=${child.id}'">

                    <div class="subcategory-image">

                        <img src="${child.image_url || fallbackImage}" onerror="this.src='${fallbackImage}'" alt="${child.name}" loading="lazy">

                    </div>

                    <div class="subcategory-name">${child.name}</div>

                </div>

            `).join('');

        } else {

            body.innerHTML = '<div class="popup-empty">No subcategories</div>';

        }



        popup.classList.add('active');

        document.body.style.overflow = 'hidden';

    }



    showCategoryPopupById(categoryId) {

        const category = this.allCategories.find(c => c.id == categoryId);

        if (category) this.showCategoryPopup(category);

    }



    hideCategoryPopup() {

        const popup = document.getElementById('category-popup-overlay');

        if (popup) {

            popup.classList.remove('active');

            document.body.style.overflow = '';

        }

    }



    async renderTrending() {

    const container = document.getElementById('trending-slider');

    if (!container) return;



    let categories = [];

    if (this.allCategories && this.allCategories.length > 0) {

        categories = this.allCategories.slice(0, 5);

    } else {

        const res = await fetch(APP_CONFIG.ENDPOINTS.CATEGORIES);

        const data = await res.json();

        if (data.success) {

            categories = data.data.slice(0, 5);

            this.allCategories = data.data;

        }

    }



    if (!categories.length) return;



    const gradients = [

        { bg: "linear-gradient(135deg, #F0F5FF, #E0ECFF)", border: "#C0D4FF" },

        { bg: "linear-gradient(135deg, #FFF8F0, #FFE8D9)", border: "#FFD9B5" },

        { bg: "linear-gradient(135deg, #FFF0F5, #FFE0EC)", border: "#FFC0D0" },

        { bg: "linear-gradient(135deg, #F0FFF0, #E0FFE0)", border: "#C0FFC0" },

        { bg: "linear-gradient(135deg, #FFF5E6, #FFE8CC)", border: "#FFD9A3" }

    ];



    container.innerHTML = categories.map((cat, idx) => {

        const bgGradient = gradients[idx % gradients.length];

        const categoryName = cat.name;

        const imageUrl = this.resolveImage(cat.image_url) || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200&auto=format&fit=crop';



        return `<div class="trending-card" style="background: ${bgGradient.bg} !important; border: 1px solid ${bgGradient.border} !important;" onclick="redirectToSubcategory(${cat.id})">

            <div class="trending-card-content">

                <div class="trending-main">${categoryName}</div>

                <div class="trending-sub">Shop Collection</div>

                <span class="shop-now-link">SHOP NOW</span>

            </div>

            <div class="trending-img-wrap">

                <img src="${imageUrl}" alt="${categoryName}" loading="lazy" width="85" height="85" decoding="async">

            </div>

        </div>`;

    }).join('');



    this.setupAutoScroll(container);

}



    setupAutoScroll(container) {

        if (this.autoScrollTimer) clearInterval(this.autoScrollTimer);



        const slider = container;

        let isPaused = false;

        let resetting = false;

        const scrollSpeed = 0.8;

        const intervalTime = 40;



        slider.addEventListener('mouseenter', () => { isPaused = true; slider.classList.remove('scrolling'); });

        slider.addEventListener('mouseleave', () => { isPaused = false; });

        slider.addEventListener('touchstart', () => { isPaused = true; slider.classList.remove('scrolling'); });

        slider.addEventListener('touchend', () => { isPaused = false; });



        slider.addEventListener('scroll', () => {

            if (resetting) return;

            slider.classList.add('scrolling');

            if (this.scrollTimeout) clearTimeout(this.scrollTimeout);

            this.scrollTimeout = setTimeout(() => slider.classList.remove('scrolling'), 500);



            const maxScroll = slider.scrollWidth - slider.clientWidth;

            if (slider.scrollLeft >= maxScroll - 5) {

                resetting = true;

                setTimeout(() => {

                    slider.scrollTo({ left: 0, behavior: 'smooth' });

                    setTimeout(() => resetting = false, 500);

                }, 100);

            }

        });



        this.autoScrollTimer = setInterval(() => {

            if (isPaused || resetting) return;

            const maxScroll = slider.scrollWidth - slider.clientWidth;

            if (slider.scrollLeft >= maxScroll - 5) {

                resetting = true;

                slider.scrollTo({ left: 0, behavior: 'smooth' });

                setTimeout(() => resetting = false, 500);

            } else {

                slider.scrollLeft += scrollSpeed;

            }

        }, intervalTime);

    }



    async renderStyleSpotlight() {

    const container = document.getElementById('style-spotlight-grid');

    if (!container) return;



    const res = await fetch(APP_CONFIG.ENDPOINTS.TOP_SELLING).then(r => r.json());



    let displayItems = [];

    if (res.success && res.data) {

        let items = Array.isArray(res.data) ? res.data : (res.data.products || []);

        displayItems = items.slice(0, 8);

    }



    if (!displayItems.length) {

        container.innerHTML = '';

        return;

    }



    const preloadPromises = displayItems.map(async (item) => {

        if (item.slug) {

            try {

                const response = await fetch(`${API_BASE_URL}/products/${item.slug}`);

                const data = await response.json();

                if (data.success && data.data) {

                    const galleryImages = data.data.gallery_images || [];

                    const hoverImage = galleryImages[1] || galleryImages[0];

                    if (hoverImage) {

                        const img = new Image();

                        img.src = this.resolveImage(hoverImage);

                        item.hoverImage = this.resolveImage(hoverImage);

                    }

                }

            } catch(e) {}

        }

        return item;

    });



    await Promise.all(preloadPromises);



    const itemsHtml = displayItems.map(item => {

        const brand = item.brand || 'Premium Brand';

        const name = item.name || 'Fashion Item';

        const rating = item.rating || '4.5';

        const current = this.getProductPrice(item);

        const clickCount = item.click_count || 0;

        const mainImage = this.resolveImage(item.image_url);

        const hoverImageUrl = item.hoverImage || mainImage;



        const old = item.mrp || item.original_price || item.price || current;

        const discount = old > current ? Math.round(((old - current) / old) * 100) : 0;



        return `<div class="spotlight-card" onclick="window.location.href='/product/${item.slug || '#'}'">

            <div class="spotlight-card-img">

                <img src="${mainImage}" 

                    alt="${brand} ${name} - MAHERA JEWEL"

                    data-main="${mainImage}"

                    data-hover="${hoverImageUrl}"

                    onmouseenter="this.src=this.dataset.hover"

                    onmouseleave="this.src=this.dataset.main"

                    onerror="this.src='${APP_CONFIG.FALLBACK_IMAGE}'" 

                    loading="lazy" 

                    width="200" 

                    height="200" 

                    decoding="async">

                 <div class="rating-badge">★ <span>${rating}</span></div>

            </div>

            <div class="spotlight-card-info">

                <div class="card-brand">${brand}</div>

                <div class="card-title">${name.length > 35 ? name.substring(0, 35) + '...' : name}</div>

                <div class="card-price">

                    <span class="current-price">₹${current}</span>

                </div>



                <button class="add-to-cart" onclick="event.stopPropagation(); window.location.href='/product/${item.slug}'" aria-label="Explore ${name} product details">

                    <svg viewBox="0 0 24 24" fill="none">

                        <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>

                        <circle cx="9" cy="21" r="1.5" fill="currentColor"/>

                        <circle cx="20" cy="21" r="1.5" fill="currentColor"/>

                    </svg>

                    Explore

                </button>

            </div>

        </div>`;

    }).join('');



    container.innerHTML = `<div class="style-spotlight-section">

        <div class="spotlight-header">

            <h2>Style Spotlight</h2>

           <a href="/top-selling" class="spotlight-viewall">View All →</a>

        </div>

        <div class="spotlight-grid">${itemsHtml}</div>

    </div>`;

}



    async renderDynamicCategorySections() {

    const container = document.getElementById('dynamic-category-sections');

    if (!container) return;



    container.innerHTML = `

        <section class="trending-reels-section web-only" id="trending-reels-section">

            <div class="container">

                <div class="section-header centered">

                    <h2 class="section-title">Shop The Feed</h2>

                </div>

                <div class="reels-container">

                    <div class="reels-slider-wrapper">

                        <button class="reels-nav reels-prev">◀</button>

                        <div class="reels-slider" id="reels-slider"></div>

                        <button class="reels-nav reels-next">▶</button>

                    </div>

                </div>

            </div>

        </section>

    `;



    this.loadTrendingReels();

}

    async loadTrendingReels() {

        const slider = document.getElementById('reels-slider');

        if (!slider) return;

        if (window.innerWidth < 1025) return;



        try {

          const response = await fetch(`${API_BASE_URL}/instagram/reels`);

const data = await response.json();



if (!data.success) {

    return;

}



this.renderReelsSlider(data.posts || []);

        } catch (error) {

            console.error('Reels API error:', error);

        }

    }

renderInstagramReels(reels) {



    const slider = document.getElementById("reels-slider");



    if (!slider) return;



    slider.innerHTML = reels.map(reel => `

        <div class="reel-card">



            <video

                controls

                muted

                playsinline

                preload="metadata"

                style="width:100%;height:420px;object-fit:cover;border-radius:12px">



                <source src="${reel.media_url}" type="video/mp4">



            </video>



        </div>

    `).join("");



}

renderReelsSlider(reels) {



    const slider = document.getElementById("reels-slider");



    if (!slider) return;



    if (!Array.isArray(reels) || reels.length === 0) {

        slider.innerHTML = `

            <div class="text-center p-4">

                No Instagram Posts Found

            </div>

        `;

        return;

    }



    let currentIndex = 2;



    const getVisibleCards = () => {

        const total = reels.length;

        const cards = [];



        for (let i = -2; i <= 2; i++) {



            let idx = (currentIndex + i) % total;



            if (idx < 0) idx += total;



            cards.push({

                ...reels[idx],

                originalIndex: idx,

                position: i + 3

            });



        }



        return cards;

    };



    const updateSlider = () => {



        const visibleCards = getVisibleCards();



        let html = "";



        visibleCards.forEach((card) => {



            const posClass = `position-${card.position}`;



            html += `

            <div

                class="reel-card ${posClass}"

                data-url="${card.permalink}"

                style="cursor:pointer;">



                <div class="reel-image-wrapper">



                    <img

                        src="${card.media_url}"

                        class="reel-image"

                        loading="lazy"

                        style="

                            width:100%;

                            height:100%;

                            object-fit:cover;

                            border-radius:16px;

                        ">



                    <div class="reel-info-overlay">



                        <div class="reel-title-overlay">



                            ${card.caption || ""}



                        </div>



                    </div>



                </div>



            </div>

            `;



        });



        slider.innerHTML = `

            <div class="reels-track"

                 style="display:flex;justify-content:center;align-items:center;gap:20px;">



                ${html}



            </div>

        `;



        setupReelRedirect();



    };



    updateSlider();



    const handlePrevClick = () => {



        currentIndex =

            (currentIndex - 1 + reels.length) % reels.length;



        updateSlider();



    };



    const handleNextClick = () => {



        currentIndex =

            (currentIndex + 1) % reels.length;



        updateSlider();



    };



    const prevBtn = document.querySelector(".reels-prev");

    const nextBtn = document.querySelector(".reels-next");



    if (prevBtn) {



        const newPrev = prevBtn.cloneNode(true);



        prevBtn.parentNode.replaceChild(newPrev, prevBtn);



        newPrev.onclick = handlePrevClick;



    }



    if (nextBtn) {



        const newNext = nextBtn.cloneNode(true);



        nextBtn.parentNode.replaceChild(newNext, nextBtn);



        newNext.onclick = handleNextClick;



    }



}



    // attachReelVideoEvents() {

    //     document.querySelectorAll('.reel-card').forEach(card => {

    //         const video = card.querySelector('.reel-video');

    //         const playBtn = card.querySelector('.play-reel-btn');

    //         const playPauseBtn = card.querySelector('.play-pause-btn');

    //         const soundBtn = card.querySelector('.sound-btn');



    //         if (video && playBtn) {

    //             card.onmouseenter = () => video.play();

    //             card.onmouseleave = () => { video.pause(); video.currentTime = 0; };



    //             playBtn.onclick = (e) => {

    //                 e.stopPropagation();

    //                 if (video.paused) {

    //                     video.play();

    //                     if (playPauseBtn) playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

    //                 } else {

    //                     video.pause();

    //                     if (playPauseBtn) playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M8 5v14l11-7z"/></svg>`;

    //                 }

    //             };



    //             if (playPauseBtn) {

    //                 playPauseBtn.onclick = (e) => {

    //                     e.stopPropagation();

    //                     if (video.paused) {

    //                         video.play();

    //                         playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

    //                     } else {

    //                         video.pause();

    //                         playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M8 5v14l11-7z"/></svg>`;

    //                     }

    //                 };

    //             }



    //             if (soundBtn) {

    //                 soundBtn.onclick = (e) => {

    //                     e.stopPropagation();

    //                     video.muted = !video.muted;

    //                     soundBtn.innerHTML = video.muted 

    //                         ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`

    //                         : `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`;

    //                 };

    //             }

    //         }

    //     });

    // }



    genCircularItem(p) {

        return `<div class="circular-item" onclick="window.location.href='/product/${p.slug}'">

            <div class="circular-img-wrap"><img src="${this.resolveImage(p.image_url)}" loading="lazy" width="110" height="110" decoding="async" alt="${p.name}"></div>

            <h4>${p.name}</h4>

            <p>₹${this.getProductPrice(p)}</p>

        </div>`;

    }



    genProductCard(p) {

        return `<div class="product-card-horizontal" onclick="window.location.href='/product/${p.slug}'">

            <div class="product-image-wrapper">

                <img src="${this.resolveImage(p.image_url)}" alt="${p.name}" loading="lazy" width="160" height="160" decoding="async">

                <div class="product-rating">⭐ ${p.rating || '4.5'}</div>

            </div>

            <div class="product-info">

                <h4>${p.name}</h4>

                <div class="product-price">

                    <span class="current">₹${this.getProductPrice(p)}</span>

                    ${p.mrp ? `<span class="old">₹${p.mrp}</span>` : ''}

                </div>

            </div>

        </div>`;

    }

}



function redirectToSubcategory(categoryId) {



    fetch(`${API_BASE_URL}/categories`)

        .then(response => response.json())

        .then(data => {



            if (!data.success) {

                window.location.href = `/products?category=${categoryId}`;

                return;

            }



            const category = data.data.find(c => c.id == categoryId);



            if (!category) {

                window.location.href = `/products?category=${categoryId}`;

                return;

            }



            // Trending

            if (category.slug === "trending") {

                window.location.href = "/top-selling";

                return;

            }



            // Bestsellers

            if (category.slug === "bestsellers") {

                window.location.href = "/best-selling";

                return;

            }



            if (category.children && category.children.length > 0) {

                window.location.href = `/collection/${category.slug}`;

            } else {

                window.location.href = `/products?category=${categoryId}`;

            }

        });

}



window.goBack = function() {

    const currentPath = window.location.pathname;

    const token = localStorage.getItem('token');



    if (currentPath.includes('/checkout')) {

        window.location.href = '/cart';

        return;

    }



    if (currentPath === '/cart') {

        const lastProduct = sessionStorage.getItem('last_product_page');

        if (lastProduct && !lastProduct.includes('/checkout')) {

            window.location.href = lastProduct;

            sessionStorage.removeItem('last_product_page');

        } else {

            window.location.href = '/';

        }

        return;

    }



    if (currentPath.includes('/order-confirmation')) { 

        window.location.href = '/orders';

        return;

    }



    if (currentPath === '/profile' || currentPath.includes('/profile')) {

        window.location.href = '/';

        return;

    }



    if (currentPath === '/orders' || currentPath.includes('/orders')) {

        window.location.href = '/profile';

        return;

    }



    if (currentPath === '/login' || currentPath === '/register') {

        window.location.href = token ? '/' : '/';

        return;

    }



    window.history.back();

};



window.app = new RapidRetailsEngine();

document.addEventListener('DOMContentLoaded', () => window.app.init());



window.addEventListener("DOMContentLoaded", function () {

    const loader = document.getElementById("app-loader");

    if (loader) loader.style.display = "none";

});



function updateCartCountBadge() {

    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    let totalItems = cart.length;



    const updateBadge = (badgeId) => {

        const badge = document.getElementById(badgeId);

        if (badge) {

            badge.style.display = 'flex';

            badge.textContent = totalItems;

        }

    };



    updateBadge('cart-count-badge');

    updateBadge('web-cart-count-badge');

}



async function fetchFooterSettings() {

    try {

        const response = await fetch(`${API_BASE_URL}/app-settings`);

        const data = await response.json();

        if (data.success) {

            const appName = data.data.app_name;

            const footerAppName = document.getElementById('footerAppName');

            const footerAppNameBottom = document.getElementById('footerAppNameBottom');

            if (footerAppName) footerAppName.textContent = appName;

            if (footerAppNameBottom) footerAppNameBottom.textContent = appName;

        }

    } catch (error) {

        console.error('Error fetching app settings:', error);

    }

}



async function fetchCategoriesForFooter() {

    try {

        const response = await fetch(`${API_BASE_URL}/categories`);

        const data = await response.json();

        if (data.success && data.data.length > 0) {

            const categories = data.data.slice(0, 6);

            const listContainer = document.getElementById('footerCategoriesList');

            if (listContainer) {

                listContainer.innerHTML = categories.map(cat => `<li><a href="/category/${cat.id}">${cat.name}</a></li>`).join('');

            }

        }

    } catch (error) {

        console.error('Error fetching categories:', error);

    }

}



const footerYear = document.getElementById('footerYear');

if (footerYear) footerYear.textContent = new Date().getFullYear();



document.addEventListener('DOMContentLoaded', function() {

    fetchFooterSettings();

    fetchCategoriesForFooter();

});



document.addEventListener("click", (e) => {

    const box = document.querySelector(".search-box");

    const suggestions = document.getElementById("web-search-suggestions");

    if (!box || !suggestions) return;

    if (!box.contains(e.target)) suggestions.style.display = "none";

});



function setupReelRedirect() {



    document.querySelectorAll(".reel-card").forEach(card => {



        card.onclick = () => {



            const url = card.dataset.url;



            if (url) {



                window.open(url, "_blank");



            }



        };



    });



}

// Dynamic search placeholder - Fetches categories on every page load

(function() {

    let categories = ['Necklace', 'Earrings', 'Maang Tikka', 'Bridal Sets', 'Bangles'];

    let index = 0;

    let intervalId = null;



    function startRotation(input) {

        if (intervalId) clearInterval(intervalId);

        intervalId = setInterval(function() {

            if (input && categories.length > 0) {

                input.placeholder = 'Search for ' + categories[index];

                index = (index + 1) % categories.length;

            }

        }, 3000);

    }



    async function fetchAndRotate() {

        const input = document.getElementById('web-search-input');

        if (!input) {

            setTimeout(fetchAndRotate, 500);

            return;

        }



        try {

            const response = await fetch(`${API_BASE_URL}/categories`);

            const data = await response.json();

            if (data.success && data.data && data.data.length > 0) {

                categories = data.data.map(cat => cat.name);

            }

        } catch(e) {

            // Using fallback categories

        }



        // Immediately set first placeholder

        input.placeholder = 'Search for ' + categories[0];

        // Start rotation

        startRotation(input);

    }



    fetchAndRotate();

})();

window.loadHoverImage = function(imgElement) {

    if (imgElement.dataset.loading === 'true') return;



    const slug = imgElement.dataset.slug;

    if (!slug) return;



    const mainImage = imgElement.dataset.main;

    const hoverUrl = imgElement.dataset.hoverImage;



    if (hoverUrl && imgElement.src === hoverUrl) return;



    if (hoverUrl && hoverUrl !== mainImage) {

        imgElement.src = hoverUrl;

        return;

    }



    imgElement.dataset.loading = 'true';



    fetch(`${API_BASE_URL}/products/${slug}`)

        .then(r => r.json())

        .then(data => {

            if (data.success && data.data) {

                const galleryImages = data.data.gallery_images || [];

                let hoverImage = galleryImages[1] || galleryImages[0];

                if (hoverImage) {

                    const img = new Image();

                    img.onload = function() {

                        imgElement.dataset.hoverImage = hoverImage;

                        imgElement.src = hoverImage;

                    };

                    img.src = hoverImage;

                }

            }

        })

        .catch(() => {})

        .finally(() => {

            imgElement.dataset.loading = 'false';

        });

};

async function trackPageImpression(pageName) {

    try {

        await fetch(`${API_BASE_URL}/page-impression`, {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                page_name: pageName

            })

        });



        console.log(pageName + " impression saved");

    } catch (e) {

        console.error("Impression Error:", e);

    }

}