(function () {

    'use strict';



    const CONFIG = {

        apiBase: () => String(window.API_BASE_URL || '').replace(/\/+$/, ''),

        timeoutMs: 15000,

        selectors: {

            grid: '#wishlist-grid',

            count: '#wishlist-count',

            productId: '[data-product-id]',

            addToCart: '.add-to-cart, .pdp-add-to-cart',

            image: '#mainImage, .pdp-main-image',

            price: '#currentPrice, .pdp-current-price',

            title: '.pdp-title, .product-name, h1',

            brand: '.pdp-brand, .brand'

        }

    };



    let items = [];

    let loading = false;

    let initialized = false;



    const token = () => localStorage.getItem('token');



    function user() {

        try { return JSON.parse(localStorage.getItem('user') || '{}'); }

        catch (_) { return {}; }

    }



    function loggedIn() {

        return Boolean(token() && user().id);

    }



    function escapeHtml(value) {

        return String(value ?? '').replace(/[&<>"']/g, ch => ({

            '&': '&amp;', '<': '&lt;', '>': '&gt;',

            '"': '&quot;', "'": '&#39;'

        })[ch]);

    }



    function apiUrl(path) {

        const base = CONFIG.apiBase();

        if (!base) throw new Error('API_BASE_URL is not configured.');

        return `${base}${path}`;

    }



    async function apiRequest(path, options = {}) {

        const authToken = token();

        if (!authToken) throw new Error('Please log in to manage your wishlist.');



        const controller = new AbortController();

        const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);



        try {

            const response = await fetch(apiUrl(path), {

                ...options,

                signal: controller.signal,

                headers: {

                    Accept: 'application/json',

                    ...(options.body ? { 'Content-Type': 'application/json' } : {}),

                    Authorization: `Bearer ${authToken}`,

                    ...(options.headers || {})

                }

            });



            const type = response.headers.get('content-type') || '';

            const payload = type.includes('application/json') ? await response.json() : null;



            if (response.status === 401 || response.status === 419) {

                throw new Error('Your session has expired. Please log in again.');

            }

            if (!response.ok || payload?.success === false) {

                throw new Error(payload?.message || `Request failed (${response.status}).`);

            }

            return payload;

        } catch (error) {

            if (error.name === 'AbortError') {

                throw new Error('Request timed out. Please try again.');

            }

            throw error;

        } finally {

            clearTimeout(timer);

        }

    }



    function normalize(item) {

        if (!item || item.id === undefined || item.id === null) return null;

        return {

            id: item.id,

            name: item.name || 'Product',

            price: item.price ?? 0,

            image: item.image || '',

            brand: item.brand || 'Her Ovia',

            slug: item.slug || '',

            variantId: item.variantId ?? item.variant_id ?? null,

            variantValue: item.variantValue ?? item.variant_value ?? null,

            variantType: item.variantType ?? item.variant_type ?? null,

            mrp: item.mrp ?? item.price ?? 0

        };

    }



    function showToast(message, kind = 'success') {

        document.querySelector('.wishlist-toast')?.remove();

        const toast = document.createElement('div');

        toast.className = `wishlist-toast wishlist-toast--${kind}`;

        toast.setAttribute('role', 'status');

        toast.setAttribute('aria-live', 'polite');

        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 2600);

    }



    function setGridState(title, message, isError = false) {

        const grid = document.querySelector(CONFIG.selectors.grid);

        if (!grid) return;

        grid.innerHTML = `

            <div class="wishlist-state ${isError ? 'wishlist-state--error' : ''}">

                <div class="wishlist-state-icon" aria-hidden="true">${isError ? '!' : '♡'}</div>

                <h2>${escapeHtml(title)}</h2>

                <p>${escapeHtml(message)}</p>

                ${isError ? '<button type="button" class="wishlist-retry-btn" data-wishlist-retry>Try again</button>' : ''}

            </div>`;

    }



    function updateCount() {

        const count = document.querySelector(CONFIG.selectors.count);

        if (count) count.textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;

        document.querySelectorAll('.wishlist-icon, .action-item svg').forEach(icon => {

            icon.classList.toggle('has-items', items.length > 0);

        });

    }



    function emptyState() {

        const grid = document.querySelector(CONFIG.selectors.grid);

        if (!grid) return;

        grid.innerHTML = `

            <div class="empty-wishlist">

                <div class="empty-icon" aria-hidden="true">♡</div>

                <h2>Your wishlist is empty</h2>

                <p>Save your favourite products and find them here anytime.</p>

                <a href="/" class="shop-now-btn">EXPLORE PRODUCTS</a>

            </div>`;

    }



    function render() {

        const grid = document.querySelector(CONFIG.selectors.grid);

        if (!grid) return;



        updateCount();

        if (!items.length) {

            emptyState();

            updateProductButton();

            return;

        }



        grid.innerHTML = items.map(item => {

            const id = escapeHtml(item.id);

            const slug = escapeHtml(item.slug);

            const image = escapeHtml(item.image);

            const name = escapeHtml(item.name);

            const brand = escapeHtml(item.brand);

            const price = Number(item.price || 0).toLocaleString('en-IN');



            return `

                <article class="wishlist-card" data-product-id="${id}">

                    <div class="wishlist-image-container" data-product-link="${slug}" role="link" tabindex="0" aria-label="View ${name}">

                        ${image

                            ? `<img src="${image}" alt="${name}" loading="lazy" decoding="async" width="300" height="400">`

                            : '<div class="wishlist-image-placeholder" aria-label="Image unavailable">♡</div>'}

                        <button type="button" class="wishlist-remove-btn"

                            data-wishlist-remove="${id}" aria-label="Remove ${name} from wishlist"

                            title="Remove from wishlist">×</button>

                    </div>

                    <div class="wishlist-info">

                        <div class="wishlist-brand">${brand}</div>

                        <div class="wishlist-title" data-product-link="${slug}" role="link" tabindex="0">${name}</div>

                        <div class="wishlist-price">₹${price}</div>

                        <button type="button" class="wishlist-remove-from-wishlist"

                            data-wishlist-remove="${id}" aria-label="Remove ${name} from wishlist">

                            REMOVE FROM WISHLIST

                        </button>

                    </div>

                </article>`;

        }).join('');

        updateProductButton();

    }



    async function loadFromApi() {

        if (loading) return;

        if (!loggedIn()) {

            items = [];

            updateCount();

            setGridState('Login required', 'Please log in to view your wishlist.', true);

            return;

        }



        loading = true;

        setGridState('Loading wishlist', 'Fetching your saved products...');

        try {

            const payload = await apiRequest('/wishlist', { method: 'GET' });

            if (!Array.isArray(payload?.data)) {

                throw new Error('Unexpected wishlist API response.');

            }

            // API is the single source of truth. No wishlist localStorage fallback.

            items = payload.data.map(normalize).filter(Boolean);

            render();

        } catch (error) {

            console.error('Wishlist fetch failed:', error);

            setGridState('Unable to load wishlist', error.message || 'Please try again.', true);

        } finally {

            loading = false;

        }

    }



    function currentProduct() {

        const idEl = document.querySelector(CONFIG.selectors.productId);

        const imageEl = document.querySelector(CONFIG.selectors.image);

        const priceEl = document.querySelector(CONFIG.selectors.price);

        const titleEl = document.querySelector(CONFIG.selectors.title);

        const brandEl = document.querySelector(CONFIG.selectors.brand);

        const id = idEl?.dataset?.productId;



        // Never invent a product ID if the page markup is missing it.

        if (!id || !/^\d+$/.test(String(id))) return null;



        return normalize({

            id: Number(id),

            name: titleEl?.textContent?.trim() || 'Product',

            price: priceEl?.textContent?.replace(/[₹,\s]/g, '') || 0,

            image: imageEl?.currentSrc || imageEl?.src || '',

            brand: brandEl?.textContent?.trim() || 'Her Ovia',

            slug: window.location.pathname.split('/').filter(Boolean).pop() || ''

        });

    }



    function isSaved(productId) {

        return items.some(item => String(item.id) === String(productId));

    }



    function updateProductButton() {

        const button = document.getElementById('wishlist-btn');

        if (!button) return;

        const product = currentProduct();

        const saved = product ? isSaved(product.id) : false;

        button.textContent = saved ? '♥ SAVED' : '♡ SAVE';

        button.classList.toggle('active', saved);

        button.setAttribute('aria-pressed', String(saved));

    }



    async function addToWishlist(product) {

        if (!loggedIn()) {
            // Do not queue the product; user must click again after login.
            sessionStorage.removeItem('wishlist_item');
            openLoginForGuest();
            return false;
        }



        const item = normalize(product);

        if (!item) {

            showToast('Product details could not be read.', 'error');

            return;

        }

        if (isSaved(item.id)) {

            showToast('Already in your wishlist.');

            return;

        }



        const button = document.getElementById('wishlist-btn');

        if (button) button.disabled = true;

        try {

            await apiRequest('/wishlist', {

                method: 'POST',

                body: {

                    id: Number(item.id),

                    name: item.name,

                    price: item.price,

                    image: item.image,

                    brand: item.brand,

                    slug: item.slug,

                    variantId: item.variantId ? Number(item.variantId) : null,

                    variantValue: item.variantValue,

                    variantType: item.variantType,

                    mrp: item.mrp

                }

            });

            showToast('Added to wishlist!');

            await loadFromApi();

        } catch (error) {

            console.error('Wishlist add failed:', error);

            showToast(error.message || 'Could not add product.', 'error');

        } finally {

            if (button) button.disabled = false;

            updateProductButton();

        }

    }



    async function removeFromWishlist(productId) {

        if (!loggedIn()) {
            openLoginForGuest();
            return false;
        }



        const card = [...document.querySelectorAll('.wishlist-card')]

            .find(element => element.dataset.productId === String(productId));

        card?.classList.add('is-removing');



        const buttons = document.querySelectorAll(

            `[data-wishlist-remove="${CSS.escape(String(productId))}"]`

        );

        buttons.forEach(button => { button.disabled = true; });



        try {

            await apiRequest(`/wishlist/${encodeURIComponent(productId)}`, {

                method: 'DELETE'

            });

            // Backend currently removes by product_id, so remove all UI entries for that product.

            items = items.filter(item => String(item.id) !== String(productId));

            render();

            showToast('Removed from wishlist.');

        } catch (error) {

            console.error('Wishlist remove failed:', error);

            showToast(error.message || 'Could not remove product.', 'error');

            await loadFromApi();

        }

    }



    function setupProductPage() {

        if (!document.body.classList.contains('product-detail-page')) return;



        const addCart = document.querySelector(CONFIG.selectors.addToCart);

        if (!addCart || document.getElementById('wishlist-btn')) return;



        const container = document.createElement('div');

        container.className = 'product-action-buttons';

        container.style.cssText = 'display:flex;gap:12px;margin-top:20px;';

        addCart.parentNode.insertBefore(container, addCart);

        container.appendChild(addCart);

        addCart.style.flex = '1';



        const button = document.createElement('button');

        button.type = 'button';

        button.id = 'wishlist-btn';

        button.className = 'wishlist-save-btn';

        button.textContent = '♡ SAVE';

        button.setAttribute('aria-pressed', 'false');

        container.appendChild(button);



        button.addEventListener('click', async event => {

            event.preventDefault();

            const product = currentProduct();

            if (!product) {

                showToast('Product ID is missing from this product page.', 'error');

                return;

            }

            if (isSaved(product.id)) await removeFromWishlist(product.id);

            else await addToWishlist(product);

        });

        updateProductButton();

    }



    function bindGridEvents() {

        const grid = document.querySelector(CONFIG.selectors.grid);

        if (!grid || grid.dataset.wishlistBound === 'true') return;

        grid.dataset.wishlistBound = 'true';



        grid.addEventListener('click', async event => {

            const removeButton = event.target.closest('[data-wishlist-remove]');

            if (removeButton) {

                event.preventDefault();

                event.stopPropagation();

                await removeFromWishlist(removeButton.dataset.wishlistRemove);

                return;

            }



            const retry = event.target.closest('[data-wishlist-retry]');

            if (retry) {

                await loadFromApi();

                return;

            }



            const link = event.target.closest('[data-product-link]');

            if (link) {

                const slug = link.dataset.productLink;

                if (slug) window.location.href = `/product/${encodeURIComponent(slug)}`;

            }

        });



        grid.addEventListener('keydown', event => {

            if ((event.key === 'Enter' || event.key === ' ') &&

                event.target.matches('[data-product-link]')) {

                event.preventDefault();

                const slug = event.target.dataset.productLink;

                if (slug) window.location.href = `/product/${encodeURIComponent(slug)}`;

            }

        });

    }



    // Central login gate for product-card hearts and the header Wishlist link.
    // Capture phase prevents other scripts from filling the heart before auth is checked.
    function openLoginForGuest() {
        if (typeof window.showLoginPopup === 'function') {
            window.showLoginPopup();
        } else {
            window.location.href = '/user/login';
        }
    }

    function clearGuestWishlistVisuals() {
        if (loggedIn()) return;

        // Remove legacy guest wishlist data so product cards cannot render as saved.
        try {
            localStorage.removeItem('wishlist');
        } catch (_) {}
        if (Array.isArray(window.wishlist)) window.wishlist = [];

        document.querySelectorAll('.wishlist').forEach(button => {
            button.classList.remove('active', 'selected', 'is-active', 'is-wishlisted', 'wishlisted', 'liked');
            button.setAttribute('aria-pressed', 'false');
            button.textContent = '♡';
        });
    }

    function bindGuestWishlistGuards() {
        if (document.documentElement.dataset.wishlistGuestGuard === 'true') {
            clearGuestWishlistVisuals();
            return;
        }
        document.documentElement.dataset.wishlistGuestGuard = 'true';

        document.addEventListener('click', function (event) {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            if (loggedIn()) return;

            // Header Wishlist links/buttons, including dynamically rendered desktop/mobile headers.
            const wishlistNavigation = target.closest(
                'a[href*="wishlist"], button.wishlist-icon-btn, [data-wishlist-navigation]'
            );
            if (wishlistNavigation) {
                event.preventDefault();
                event.stopImmediatePropagation();
                openLoginForGuest();
                return;
            }

            // Product listing heart uses the exact class ".wishlist".
            const heart = target.closest(
                '.wishlist, button.wishlist-btn, button.wishlist-button, button.add-to-wishlist, ' +
                'button.wishlist-heart, button.heart-btn, .wishlist-icon, ' +
                'button[class*="wish" i], button[class*="heart" i], button[class*="favorite" i], ' +
                '.wishlist-toggle, .product-wishlist, .favorite-btn, .heart-icon, ' +
                '[data-wishlist-toggle], [data-wishlist], [data-action="wishlist"], ' +
                '[onclick*="toggleWish" i], [onclick*="wishlist" i], ' +
                'button[aria-label*="wishlist" i], button[title*="wishlist" i]'
            );
            if (!heart) return;

            // Capture phase prevents the listing's inline toggleWish() from running.
            event.preventDefault();
            event.stopImmediatePropagation();
            heart.classList.remove('active', 'selected', 'is-active', 'is-wishlisted', 'wishlisted', 'liked');
            heart.setAttribute('aria-pressed', 'false');
            heart.setAttribute('aria-checked', 'false');
            heart.textContent = '♡';
            openLoginForGuest();
        }, true);

        // Clear old localStorage-based guest hearts on initial load.
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', clearGuestWishlistVisuals, { once: true });
        } else {
            clearGuestWishlistVisuals();
        }
    }

    function init() {

        if (initialized) return;

        initialized = true;
        bindGuestWishlistGuards();



        if (document.body.classList.contains('wishlist-page')) {

            bindGridEvents();

            loadFromApi();

        }

        setupProductPage();



        document.addEventListener('visibilitychange', () => {

            if (document.visibilityState === 'visible' &&

                document.body.classList.contains('wishlist-page')) {

                loadFromApi();

            }

        });



        window.wishlist = {

            addToWishlist,

            removeFromWishlist,

            isInWishlist: isSaved,

            refresh: loadFromApi

        };

    }



    if (document.readyState === 'loading') {

        document.addEventListener('DOMContentLoaded', init, { once: true });

    } else {

        init();

    }

})();
