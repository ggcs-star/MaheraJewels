const API_BASE_URL = window.API_BASE_URL;



if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {

    console.log = console.debug = console.info = console.warn = function() {};

}



const CONFIG = {

    CACHE_DURATION: 5 * 60 * 1000,

    CACHE_PREFIX: 'mahera_categories_api_',

    FALLBACK_IMAGE: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200&auto=format&fit=crop'

};



class AllCategoriesPage {

    constructor() {

        this.allCategories = [];

        this.isLoggedIn = !!localStorage.getItem('token');

        this.userCategories = [];

        this.appSettings = null;

        this.sortable = null;

        this.apiCache = new Map();

        this.apiInflight = new Map();

        this.domCache = new Map();

        this.lastRenderState = null;

        this.init();



        let resizeTimer;

        window.addEventListener('resize', () => {

            clearTimeout(resizeTimer);

            resizeTimer = setTimeout(() => {

                this.renderCategories();

                this.renderHeader();

                this.renderWebSidebar();

            }, 100);

        });

    }



    getElement(id) {

        if (!this.domCache.has(id)) {

            this.domCache.set(id, document.getElementById(id));

        }

        return this.domCache.get(id);

    }



    async cachedFetch(url, options = {}) {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        const now = Date.now();
        const storageKey = CONFIG.CACHE_PREFIX + encodeURIComponent(cacheKey);

        // Fast in-memory cache.
        const cached = this.apiCache.get(cacheKey);
        if (cached && (now - cached.timestamp) < CONFIG.CACHE_DURATION) {
            return cached.data;
        }

        // Session cache keeps the page fast after navigation/back.
        try {
            const storedRaw = sessionStorage.getItem(storageKey);
            if (storedRaw) {
                const stored = JSON.parse(storedRaw);
                if (stored && stored.timestamp && (now - stored.timestamp) < CONFIG.CACHE_DURATION) {
                    this.apiCache.set(cacheKey, stored);
                    return stored.data;
                }
                sessionStorage.removeItem(storageKey);
            }
        } catch (error) {}

        // Deduplicate simultaneous identical GET requests.
        if (this.apiInflight.has(cacheKey)) {
            return this.apiInflight.get(cacheKey);
        }

        const request = fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const entry = { data, timestamp: Date.now() };
                this.apiCache.set(cacheKey, entry);

                try {
                    sessionStorage.setItem(storageKey, JSON.stringify(entry));
                } catch (error) {}

                return data;
            })
            .catch(error => {
                console.error('Fetch error:', error);
                return null;
            })
            .finally(() => {
                this.apiInflight.delete(cacheKey);
            });

        this.apiInflight.set(cacheKey, request);
        return request;
    }

    async init() {

        this.showSkeletonLoader();
        this.showSidebarSkeleton();

        await Promise.all([
            this.fetchAppSettings(),
            this.fetchCategories(),
            this.isLoggedIn ? this.fetchUserCategoryOrder() : Promise.resolve()
        ]);

        this.renderHeader();
        this.renderCategories();
        this.renderWebSidebar();
        this.renderBottomNav();

    }

    showSkeletonLoader() {

        const container = this.getElement('all-categories-grid');

        if (!container) return;



        const skeletons = Array(6).fill().map(() => `

            \<div class="skeleton-card">

                \<div class="category-info">\<div class="skeleton-text">\</div>\</div>

                \<div class="skeleton-image">\</div>

            \</div>

        `).join('');

        container.innerHTML = skeletons;

    }



    showSidebarSkeleton() {

        const sidebar = this.getElement('categoriesWebSidebarList');

        if (!sidebar || window.innerWidth < 1024) return;



        const skeleton = Array(6).fill().map(() => `

            \<li>

                \<div style="height:14px; width:80%; background:#e0e0e0; border-radius:6px; margin-bottom:12px; position:relative; overflow:hidden;">

                    \<div style="position:absolute; top:0; left:-100px; height:100%; width:100px; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation:skeleton-loading 1.2s infinite;">\</div>

                \</div>

            \</li>

        `).join('');

        sidebar.innerHTML = skeleton;

    }



    async fetchCategories() {

        const data = await this.cachedFetch(`${API_BASE_URL}/categories`);

        if (data?.success && data.data?.length) {

            this.allCategories = data.data;

            this.setSEO(

                "All Categories | MAHERA JEWEL",

                "Explore premium jewellery categories at MAHERA JEWEL"

            );

        } else {

            this.allCategories = [

                { id: 1, name: "Jewellery", image_url: null, children: [] },

                { id: 2, name: "Necklaces", image_url: null, children: [] },

                { id: 3, name: "Earrings", image_url: null, children: [] },

                { id: 4, name: "Maang Tikka", image_url: null, children: [] },

                { id: 5, name: "Bridal Sets", image_url: null, children: [] },

                { id: 6, name: "Bangles", image_url: null, children: [] }

            ];

        }

    }



    async fetchUserCategoryOrder() {

        try {

            const response = await fetch(`${API_BASE_URL}/categories`, {

                headers: {

                    'Authorization': `Bearer ${localStorage.getItem('token')}`,

                    'Accept': 'application/json'

                }

            });

            const data = await response.json();

            if (data.success && data.data.length) {

                this.userCategories = data.data;

            }

        } catch (error) {

            console.error('Error fetching user categories:', error);

        }

    }



    async fetchAppSettings() {

        const data = await this.cachedFetch(`${API_BASE_URL}/app-settings`);

        if (data?.success) {

            this.appSettings = data.data;

        }

    }

    resolveImage(path) {

    if (!path) return CONFIG.FALLBACK_IMAGE;

    if (path.startsWith('http')) return path;

    if (!path.includes('amazonaws.com')) return window.S3_BASE_URL + path;

    return path;

}

setSEO(title, description) {

    if (title) {

        document.title = title;

    }

    if (description) {

        const metaDesc = document.querySelector('meta[name="description"]');

        if (metaDesc) {

            metaDesc.setAttribute('content', description);

        }

    }

}



    renderHeader() {

        const header = this.getElement('site-header');

        if (!header) return;



        const isDesktop = window.innerWidth >= 1025;



        if (isDesktop) {

            const categoriesHtml = this.allCategories.slice(0, 5).map(cat => {

                let categorySlug = cat.name.toLowerCase()

                    .replace(/[^a-z0-9]+/g, '-')

                    .replace(/^-|-$/g, '');



                let url = `/collection/${categorySlug}`;



             if (categorySlug === "trending") {

    url = "/top-selling";

}



if (categorySlug === "bestsellers") {

    url = "/best-selling";

}



                return `\<a href="${url}" class="nav-item"

                    data-cat-id="${cat.id}"

                    data-cat-name="${cat.name}">

                    ${escapeHtml(cat.name.toUpperCase())}

                \</a>`;

            }).join('');



            header.innerHTML = `

                \<div class="web-header">

                    \<div class="top-bar">Free Shipping on Orders Above ₹999 | Use Code: FIRST50\</div>

                    \<div class="main-header">

                        \<div class="logo-area">

                            \<a href="/" class="logo">

                                \<img src="${this.appSettings?.header_logo || 'https://placehold.co/120x40?text=LOGO'}" alt="MAHERA JEWEL Logo" id="site-logo" class="site-logo" onerror="this.src='https://placehold.co/120x40?text=LOGO'">

                            \</a>

                            \<nav class="nav-menu" id="navMenu">${categoriesHtml}\</nav>

                        \</div>



                            \<div class="search-area">

                                \<div class="search-box" style="position:relative;">

                                    \<input type="text" id="web-search-input" placeholder="Search for " autocomplete="off" aria-label="Search products">

                                    \<button class="search-icon-btn" aria-label="Search">

                                        \<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">

                                            \<circle cx="10" cy="10" r="7"/>

                                            \<line x1="21" y1="21" x2="15" y2="15"/>

                                        \</svg>

                                    \</button>

                                    \<div id="web-search-suggestions" class="web-search-suggestions" style="display:none;">\</div>

                                \</div>



                        \</div>

                        \<div class="header-actions">

                             \<a href="javascript:void(0)" class="action-link" onclick="if(!localStorage.getItem('token')) { showLoginPopup(); } else { window.location.href='/profile'; }">

                                \<svg class="header-icon" viewBox="0 0 24 24" fill="none">

                                    \<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>

                                    \<path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2"/>

                                \</svg>

                                Profile

                            \</a>

                            \<a href="/wishlist" class="action-link">

                                \<svg class="header-icon" viewBox="0 0 24 24" fill="none">

                                    \<path d="M12 21s-6-4.35-9-8.5C-1 6.5 4 2 8 5c2 1.5 4 3.5 4 3.5S14 6.5 16 5c4-3 9 1.5 5 7.5C18 16.65 12 21 12 21z"

                                        stroke="currentColor" stroke-width="2"/>

                                \</svg>

                                Wishlist

                            \</a>

                            \<a href="/cart" class="action-link cart-link">

                                \<span class="cart-icon-wrapper">

                                    \<svg class="header-icon" viewBox="0 0 24 24" fill="none">

                                        \<circle cx="9" cy="21" r="1.5" stroke="currentColor" stroke-width="2"/>

                                        \<circle cx="18" cy="21" r="1.5" stroke="currentColor" stroke-width="2"/>

                                        \<path d="M2 2h3l3 12h11l2-8H6" stroke="currentColor" stroke-width="2"/>

                                    \</svg>

                                    \<span id="web-cart-count-badge">0\</span>

                                \</span>

                                Cart

                            \</a>                        

                            \</div>

                    \</div>

                \</div>

                \<div class="all-categories-popup" id="allCategoriesPopup" style="display:none; position:absolute; top:100%; left:0; width:100%; background:white; box-shadow:0 10px 25px rgba(0,0,0,0.1); z-index:1000; border-top:1px solid #f0f0f0;">\</div>

            `;



            this.setupAllCategoriesPopup();

            this.initWebSearchDropdown();

            if (typeof updateCartCountBadge === 'function') updateCartCountBadge();

        } else {

            header.innerHTML = `

                \<div class="container">

                    \<div class="header-container">

                        \<button class="back-btn-header" onclick="goBack()" aria-label="Go back">←\</button>

                        \<div class="logo-search-container">

                            \<div class="header-logo">

                                \<a href="/" aria-label="Home">

                                    \<img src="${this.appSettings?.header_logo || '/images/logo.jpg'}" alt="MAHERA JEWEL Logo" class="site-logo" onerror="this.src='https://via.placeholder.com/100x35?text=MAHERA'">

                                \</a>

                            \</div>

                            \<div class="search-wrapper">

                                \<input type="text" placeholder="Search for Category, Product ..." onclick="window.location.href='/search'" aria-label="Search">

                                \<button class="search-icon-btn" onclick="window.location.href='/search'" aria-label="Search" style="background:none; border:none; cursor:pointer; padding:0; display:flex; align-items:center;">

                                    \<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">

                                        \<circle cx="10" cy="10" r="7"/>

                                        \<line x1="21" y1="21" x2="15" y2="15"/>

                                    \</svg>

                                \</button>

                            \</div>

                        \</div>

                        \<div class="header-icons">

                            \<button class="header-icon-btn" onclick="window.location.href='/wishlist'" aria-label="Wishlist">

                                \<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333333" stroke-width="2" aria-hidden="true">

                                    \<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>

                                \</svg>

                            \</button>

                        \</div>

                    \</div>

                \</div>

            `;

        }

    }



    initWebSearchDropdown() {

    setTimeout(() => {

        const input = document.getElementById("web-search-input");

        if (!input) return;



        const suggestionsBox = document.getElementById("web-search-suggestions");

        let timer;

        let currentController = null;



        const renderSuggestions = (products) => {

            const html = products.length  ?

                products.map(p => `\<div class="web-suggestion-item" role="button" tabindex="0" onclick="window.location.href='/product/${p.slug}'" onkeypress="if(event.key==='Enter') window.location.href='/product/${p.slug}'">${escapeHtml(p.name)}\</div>`).join('') :

                `\<div class="web-suggestion-item">No results found\</div>`;

            suggestionsBox.innerHTML = html;

            suggestionsBox.style.display = "block";

        };



        // 🔥 ENTER KEY EVENT - ADD THIS

        input.addEventListener("keydown", function(e) {

            if (e.key === "Enter") {

                e.preventDefault();

                const q = this.value.trim();

                if (q) {

                    window.location.href = `/products?search=${encodeURIComponent(q)}`;

                }

            }

        });



        input.addEventListener("input", async (e) => {

            clearTimeout(timer);

            const q = e.target.value.trim();



            if (q.length === 0) {

                suggestionsBox.style.display = "none";

                suggestionsBox.innerHTML = "";

                return;

            }



            if (currentController) currentController.abort();

            currentController = new AbortController();



            try {

                timer = setTimeout(async () => {

                    const res = await fetch(`${API_BASE_URL}/products/suggestions?q=${encodeURIComponent(q)}`, {

                        signal: currentController.signal

                    });

                    const data = await res.json();

                    if (data.success && data.data?.products) {

                        renderSuggestions(data.data.products);

                    }

                }, 300);

            } catch (err) {

                if (err.name !== 'AbortError') console.log(err);

            }

        });



        document.addEventListener("click", (e) => {

            if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {

                suggestionsBox.style.display = "none";

            }

        });

    }, 300);

}



    setupAllCategoriesPopup() {

        const navItems = document.querySelectorAll('.nav-item');

        const popup = this.getElement('allCategoriesPopup');

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

        const popup = this.getElement('allCategoriesPopup');

        if (!popup) return;



        if (!this.allCategories?.length) {

            popup.innerHTML = '\<div style="padding:40px; text-align:center;">Loading categories...\</div>';

            return;

        }



        const categoriesWithSub = this.allCategories.filter(cat => cat.children?.length);

        const columnSize = Math.ceil(categoriesWithSub.length / 5);

        const columns = Array.from({ length: 5 }, (_, i) => categoriesWithSub.slice(i * columnSize, (i + 1) * columnSize));



        let html = `\<div style="max-width:1200px; margin:0 auto; padding:30px; display:grid; grid-template-columns:repeat(5,1fr); gap:25px;">`;



        columns.forEach(col => {

            if (col.length) {

                html += `\<div>`;

                col.forEach(cat => {

                    html += `\<div style="margin-bottom:20px;">

                        \<h3 style="font-size:14px; font-weight:700; color:#282c3f; margin-bottom:12px; border-bottom:2px solid #ff3f6c; padding-bottom:6px; display:inline-block;">${escapeHtml(cat.name)}\</h3>

                        \<ul style="list-style:none; padding:0; margin-top:12px;">`;



                    if (cat.children?.length) {

                        cat.children.slice(0, 6).forEach(sub => {

                            let subSlug = sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

                            html += `\<li style="margin-bottom:8px;">\<a href="/collection/${subSlug}" style="text-decoration:none; color:#696b79; font-size:13px;">${escapeHtml(sub.name)}\</a>\</li>`;

                        });

                        if (cat.children.length > 6) {

                            html += `\<li style="margin-top:5px;">\<a href="/category/${cat.id}" style="color:#ff3f6c; font-size:11px; font-weight:600; text-decoration:none;">+${cat.children.length - 6} more →\</a>\</li>`;

                        }

                    }

                    html += `\</ul>\</div>`;

                });

                html += `\</div>`;

            }

        });

        popup.innerHTML = html + `\</div>`;

    }



    renderBottomNav() {

        const nav = this.getElement('mobile-bottom-nav');

        if (!nav) return;



        const currentPath = window.location.pathname;

        const activePageMap = {

            '/': 'landing', '': 'landing',

            '/trends': 'trends',

            '/categories': 'all-categories',

            '/cart': 'cart',

            '/wishlist': 'wishlist',

            '/orders': 'orders'

        };



        let activePage = activePageMap[currentPath] || (currentPath.includes('/profile') ? 'profile' : '');



        nav.innerHTML = `

            \<a href="/" class="nav-item-figma ${activePage === 'landing' ? 'active' : ''}" aria-label="Home">

                \<div class="nav-icon-box">

                    \<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

                        \<path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

                        \<path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

                    \</svg>

                \</div>

                \<span>Home\</span>

            \</a>

            \<a href="/categories" class="nav-item-figma ${activePage === 'all-categories' ? 'active' : ''}" aria-label="Categories">

                \<div class="nav-icon-box">

                    \<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

                        \<rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2"/>

                        \<rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2"/>

                        \<rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2"/>

                        \<rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="2"/>

                    \</svg>

                \</div>

                \<span>Categories\</span>

            \</a>

            \<a href="/cart" class="nav-item-figma ${activePage === 'cart' ? 'active' : ''}" aria-label="Cart">

                \<div class="nav-icon-box">

                    \<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">

                        \<path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6"/>

                        \<circle cx="9" cy="21" r="1.5"/>

                        \<circle cx="20" cy="21" r="1.5"/>

                    \</svg>

                    \<span id="cart-count-badge" class="cart-count-badge">0\</span>

                \</div>

                \<span>Cart\</span>

            \</a>

            \<a href="javascript:void(0)" class="nav-item-figma ${activePage === 'profile' ? 'active' : ''}" onclick="if(!localStorage.getItem('token')) { showLoginPopup(); } else { window.location.href='/profile'; }" aria-label="Profile">

                \<div class="nav-icon-box">

                    \<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

                        \<path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>

                        \<circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>

                    \</svg>

                \</div>

                \<span>Profile\</span>

            \</a>

        `;

        if (typeof updateCartCountBadge === 'function') updateCartCountBadge();

    }



    renderCategories() {

    const container = this.getElement('all-categories-grid');

    if (!container) return;



    const fallbackImage = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200&auto=format&fit=crop';

    const categoriesToShow = this.userCategories.length ? this.userCategories : this.allCategories;

    const isDesktop = window.innerWidth >= 1024;



    if (isDesktop) {

    container.innerHTML = categoriesToShow.map((cat) => {

        const imageUrl = cat.image_url || fallbackImage;

        const subCategories = cat.children || [];

        const subCount = subCategories.length;



        return `\<div class="category-card" data-id="${cat.id}">

            \<div class="category-image-box" onclick="redirectToSubcategory(${cat.id})">

                \<img src="${this.resolveImage(imageUrl)}" alt="${escapeHtml(cat.name)}" loading="lazy">

            \</div>

            \<div class="category-info">

                \<h3 onclick="redirectToSubcategory(${cat.id})">${escapeHtml(cat.name)}\</h3>

                \<div class="category-count" onclick="redirectToSubcategory(${cat.id})">${subCount} Collections\</div>

                \<span class="shop-now-link-cat" onclick="redirectToSubcategory(${cat.id})">Shop Now\</span>

                ${subCount > 0 ? `\<div class="subcategories-list">

                    ${subCategories.slice(0, 4).map(sub => `\<span class="subcategory-tag" onclick="event.stopPropagation(); redirectToSubcategory(${sub.id})">${escapeHtml(sub.name)}\</span>`).join('')}

                    ${subCount > 4 ? `\<span class="subcategory-tag" onclick="event.stopPropagation(); redirectToSubcategory(${cat.id})">+${subCount - 4}\</span>` : ''}

                \</div>` : ''}

            \</div>

        \</div>`;

    }).join('');

}else {

        const colors = [

            "linear-gradient(135deg, #FBE7A1, #F9D976)",

            "linear-gradient(135deg, #F8C8DC, #F4A6C1)",

            "linear-gradient(135deg, #D6C1E7, #C3A6E8)",

            "linear-gradient(135deg, #FAD7B5, #F6B98C)",

            "linear-gradient(135deg, #C8E6C9, #A5D6A7)",

            "linear-gradient(135deg, #C5CAE9, #9FA8DA)"

        ];



        container.innerHTML = categoriesToShow.map((cat, index) => {

            const imageUrl = cat.image_url || fallbackImage;

            const bgColor = colors[index % colors.length];



            return `\<div class="category-card" style="background: ${bgColor}" data-id="${cat.id}" onclick="redirectToSubcategory(${cat.id})">

                \<div class="category-info">\<h3>${escapeHtml(cat.name)}\</h3>\</div>

                \<div class="category-image-box">\<img src="${this.resolveImage(imageUrl)}" alt="${escapeHtml(cat.name)}" loading="lazy">\</div>

            \</div>`;

        }).join('');

    }



    const layout = document.getElementById('categoriesLayoutWeb');

    if (layout) layout.style.display = 'block';

}



    renderWebSidebar() {

        const sidebar = this.getElement('categoriesWebSidebarList');

        if (!sidebar || window.innerWidth < 1024) return;



        const categoriesToShow = this.userCategories.length ? this.userCategories : this.allCategories;



        sidebar.innerHTML = categoriesToShow.map(cat => {

            const hasChildren = cat.children?.length;

            const subHtml = hasChildren ? `

                \<ul class="subcategory-dropdown" id="sub-${cat.id}" style="display:none;">

                    ${cat.children.map(sub => {

                        let subSlug = sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

                        return `\<li>\<a href="/collection/${subSlug}">${escapeHtml(sub.name)}\</a>\</li>`;

                    }).join('')}

                \</ul>

            ` : '';



            return `\<li class="category-item">

                \<div class="category-parent" onclick="window.allCategoriesPage.toggleSubcategory(${cat.id})" role="button" tabindex="0" aria-label="Toggle ${escapeHtml(cat.name)} subcategories">

                    ${escapeHtml(cat.name)}

                    ${hasChildren ? `\<span class="arrow" aria-hidden="true">▸\</span>` : ''}

                \</div>

                ${subHtml}

            \</li>`;

        }).join('');

    }



    toggleSubcategory(categoryId) {

        const dropdown = document.getElementById(`sub-${categoryId}`);

        if (!dropdown) return;



        const parent = dropdown.previousElementSibling;

        const isOpen = dropdown.style.display === "block";



        document.querySelectorAll(".subcategory-dropdown").forEach(el => el.style.display = "none");

        document.querySelectorAll(".category-parent").forEach(el => el.classList.remove("active"));



        if (!isOpen) {

            dropdown.style.display = "block";

            if (parent) parent.classList.add("active");

        }

    }



    toggleEditMode() {

        const btn = document.querySelector('.edit-categories-btn');

        const grid = this.getElement('all-categories-grid');



        if (btn.classList.contains('done')) {

            btn.classList.remove('done');

            btn.innerHTML = `\<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">

                \<path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" stroke-width="2"/>

                \<polygon points="18 2 22 6 12 16 8 16 8 12 18 2" stroke-width="2"/>

            \</svg> Edit`;

            if (this.sortable) this.sortable.destroy();

            this.saveCategoryOrder();

        } else {

            btn.classList.add('done');

            btn.innerHTML = `Save`;

            if (typeof Sortable !== 'undefined') {

                this.sortable = new Sortable(grid, {

                    animation: 200,

                    ghostClass: "dragging",

                    draggable: ".category-card"

                });

            }

        }

    }



    saveCategoryOrder() {

        const ids = Array.from(document.querySelectorAll(".category-card")).map(item => item.dataset.id);



        fetch(`${API_BASE_URL}/categories/order`, {

            method: "POST",

            headers: {

                "Authorization": "Bearer " + localStorage.getItem("token"),

                "Content-Type": "application/json"

            },

            body: JSON.stringify({ categories: ids })

        })

        .then(res => res.json())

        .then(data => {

            if (data.success && typeof showToast === 'function') {

                showToast('Category order saved', 'success');

            try {
                const cachePrefix = CONFIG.CACHE_PREFIX;
                const categoryUrlPart = encodeURIComponent(`${API_BASE_URL}/categories`);
                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith(cachePrefix) && key.includes(categoryUrlPart)) {
                        sessionStorage.removeItem(key);
                    }
                });
            } catch (e) {}

            }

        })

        .catch(err => console.error('Error saving order:', err));

    }

}



function escapeHtml(str) {

    if (!str) return '';

    return str.replace(/[&<>]/g, function(m) {

        if (m === '&') return '&amp;';

        if (m === '<') return '&lt;';

        if (m === '>') return '&gt;';

        return m;

    });

}



function redirectToSubcategory(categoryId) {

    const resolveAndRedirect = (categories) => {
        if (!Array.isArray(categories)) {
            window.location.href = `/categories`;
            return;
        }

        let targetCategory = null;
        let parentCategory = null;

        for (let cat of categories) {
            if (cat.id == categoryId) {
                targetCategory = cat;
                break;
            }

            if (cat.children) {
                for (let sub of cat.children) {
                    if (sub.id == categoryId) {
                        targetCategory = sub;
                        parentCategory = cat;
                        break;
                    }
                }
            }

            if (targetCategory) break;
        }

        if (!targetCategory) {
            window.location.href = `/categories`;
            return;
        }

        if (parentCategory) {
            const parentSlug = parentCategory.name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            const subSlug = targetCategory.name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            if (subSlug === 'trending') {
                window.location.href = '/top-selling';
            } else if (subSlug === 'bestsellers') {
                window.location.href = '/best-selling';
            } else {
                window.location.href = `/collection/${parentSlug}/${subSlug}`;
            }
            return;
        }

        const slug = targetCategory.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        if (slug === 'trending') {
            window.location.href = '/top-selling';
        } else if (slug === 'bestsellers') {
            window.location.href = '/best-selling';
        } else {
            window.location.href = `/collection/${slug}`;
        }
    };

    const loadedCategories = window.allCategoriesPage?.allCategories;

    if (Array.isArray(loadedCategories) && loadedCategories.length) {
        resolveAndRedirect(loadedCategories);
        return;
    }

    // Safe fallback only if called before the category data is ready.
    fetch(`${API_BASE_URL}/categories`)
        .then(response => {
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                resolveAndRedirect(data.data);
            } else {
                window.location.href = `/categories`;
            }
        })
        .catch(() => window.location.href = `/categories`);
}

window.goBack = function() {

    window.history.back();

};



function showCategoryPopupById(categoryId) {

    const cat = window.allCategoriesPage?.allCategories.find(c => c.id == categoryId);

    if (cat) showCategoryPopup(cat);

}



function showCategoryPopup(cat) {

    const popup = document.getElementById('popup-overlay');

    const title = document.getElementById('popup-title');

    const body = document.getElementById('popup-body');

    if (!popup || !title || !body) return;



    title.textContent = cat.name;

    const fallbackImage = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200&auto=format&fit=crop';



    body.innerHTML = cat.children?.length  ?

        cat.children.map(child => `

            \<div class="subcategory-card" onclick="window.location.href='/products?subcategory=${child.id}'" role="button" tabindex="0">

                \<div class="subcategory-image">

                    \<img src="${child.image_url || fallbackImage}" onerror="this.src='${fallbackImage}'" alt="${escapeHtml(child.name)}" loading="lazy" width="200" height="200">

                \</div>

                \<div class="subcategory-name">${escapeHtml(child.name)}\</div>

            \</div>

        `).join('') :

        '\<div class="popup-empty">No subcategories\</div>';



    popup.classList.add('active');

    document.body.style.overflow = 'hidden';

}



function hideCategoryPopup() {

    const popup = document.getElementById('popup-overlay');

    if (popup) {

        popup.classList.remove('active');

        document.body.style.overflow = '';

    }

}





function updateCartCountBadge() {

    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    const totalItems = cart.length;

    const badge = document.getElementById('cart-count-badge');

    if (badge) {

        badge.style.display = 'flex';

        badge.textContent = totalItems;

    }

}



document.addEventListener('DOMContentLoaded', () => {



    if (document.body.dataset.page === 'all-categories') {

        window.allCategoriesPage = new AllCategoriesPage();

    }



    if (window.location.pathname === '/top-selling') {

        trackPageImpression('top-selling');

    }



    if (window.location.pathname === '/best-selling') {

        trackPageImpression('best-selling');

    }



});

// Dynamic search placeholder for all categories page
setTimeout(function() {
    const input = document.getElementById('web-search-input');
    if (!input) return;

    let categories = [];
    let index = 0;
    let isRotating = false;

    function startRotation() {
        if (isRotating || !categories.length) return;

        isRotating = true;
        input.placeholder = 'Search for ' + categories[index];

        setInterval(function() {
            index = (index + 1) % categories.length;
            input.placeholder = 'Search for ' + categories[index];
        }, 3000);
    }

    const loadedCategories = window.allCategoriesPage?.allCategories;

    if (Array.isArray(loadedCategories) && loadedCategories.length) {
        categories = loadedCategories.map(cat => cat.name).filter(Boolean);
        startRotation();
        return;
    }

    // Safe fallback if the page instance is not ready yet.
    fetch(`${API_BASE_URL}/categories`)
        .then(response => {
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success && Array.isArray(data.data) && data.data.length) {
                categories = data.data.map(cat => cat.name).filter(Boolean);
                startRotation();
            }
        })
        .catch(() => {});
}, 0);
