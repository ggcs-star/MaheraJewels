const API_BASE_URL = window.API_BASE_URL || '';

// ========== HELPER FUNCTIONS ==========
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCountBadge();
}

function updateCartCountBadge() {
    let cart = getCart();
    const totalItems = cart.length;
    
    const cartPageCount = document.getElementById('cart-count');
    if (cartPageCount) cartPageCount.innerText = totalItems;
    
    const webBadge = document.getElementById('web-cart-count-badge');
    if (webBadge) {
        webBadge.innerText = totalItems;
        webBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    const mobileBadge = document.querySelector('.cart-badge');
    if (mobileBadge) {
        mobileBadge.innerText = totalItems;
        mobileBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `cart-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function closePopup() {
    const popup = document.querySelector('.popup-overlay');
    if (!popup) return;
    popup.classList.remove('active');
    setTimeout(() => popup.remove(), 250);
    document.body.style.overflow = '';
    const checkoutBar = document.querySelector('.sticky-bottom-bar');
    if (checkoutBar) checkoutBar.style.display = 'flex';
}

function getEmptyCartHTML() {
    return `
        <div class="empty-cart">
            <div class="empty-cart-icon">🛒</div>
            <h3>Your bag is empty</h3>
            <p>Looks like you haven't added anything to your bag yet</p>
            <a href="/" class="shop-now-btn">SHOP NOW</a>
        </div>
    `;
}

function getDeliveryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getPriceInfo(item) {
    let price = Number(item.price) || Number(item.product_price) || 0;
    let mrp = Number(item.mrp) || Number(item.originalPrice) || price;
    
    if ((price === 0 || isNaN(price)) && item.availableVariants?.length) {
        const matchedVariant = item.availableVariants.find(v => v.value === item.variantValue);
        if (matchedVariant) {
            price = Number(matchedVariant.price) || 0;
            mrp = Number(matchedVariant.originalPrice) || price;
        }
    }
    
    if (price === 0 || isNaN(price)) {
        price = 999;
        mrp = 1999;
    }
    
    return { price, mrp, discountPercent: mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0 };
}

// ========== CART RENDERING ==========
async function fetchBrandsForCartItems(cart) {
    if (!cart?.length) return cart;
    const updatedCart = [...cart];
    
    for (let i = 0; i < updatedCart.length; i++) {
        const item = updatedCart[i];
        const hasBrand = item.brand && item.brand !== 'RAPID RETAIL' && item.brand !== 'H&M';
        
        if (!hasBrand && item.categoryId) {
            try {
                const res = await fetch(`${API_BASE_URL}/categories/${item.categoryId}/products`);
                const data = await res.json();
                if (data.success && data.data?.products) {
                    const productInCategory = data.data.products.find(p => p.id == item.id);
                    if (productInCategory?.brand) updatedCart[i].brand = productInCategory.brand;
                }
            } catch (error) { console.error('Error fetching brand:', error); }
        }
        
        if ((!item.mrp || item.mrp === 0) && item.availableVariants?.length) {
            const matchedVariant = item.availableVariants.find(v => v.value === item.variantValue);
            if (matchedVariant?.originalPrice) {
                updatedCart[i].mrp = matchedVariant.originalPrice;
                updatedCart[i].originalPrice = matchedVariant.originalPrice;
            }
        }
    }
    return updatedCart;
}

function getCartItemHTML(item, index, qty, price, itemTotal, isWeb) {
    const variantType = item.variantType || 'Size';
    const variantValue = item.variantValue || item.size || '';
    const availableVariants = item.availableVariants || [];
    const { mrp, discountPercent } = getPriceInfo(item);
    const formattedDate = getDeliveryDate();

    let selectorsHtml = '';
    
    if (isWeb) {
        const variantsHtml = availableVariants.map(v => `
            <div class="dropdown-option ${v.value === variantValue ? 'selected' : ''}" 
                 data-value="${v.value}" data-price="${v.price || 0}" data-original="${v.originalPrice || 0}">
                ${v.value}
            </div>
        `).join('');
        
        selectorsHtml = `
            <div class="selector-wrapper">
                <div class="selector-trigger" onclick="toggleVariantDropdown(${index})">
                    <span class="selector-label">${variantType}:</span>
                    <span class="selector-value">${variantValue}</span>
                    <span class="dropdown-arrow">▼</span>
                </div>
                <div class="selector-dropdown" id="variant-dropdown-${index}">
                    <div class="dropdown-options">${variantsHtml}</div>
                </div>
            </div>
            <div class="selector-wrapper">
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateWebQty(${index}, -1)">−</button>
                    <input type="number" class="qty-input" id="qty-input-${index}" value="${qty}" min="1" max="99" onchange="updateWebQtyFromInput(${index})">
                    <button class="qty-btn" onclick="updateWebQty(${index}, 1)">+</button>
                </div>
            </div>
        `;
    } else {
        selectorsHtml = `
            <div class="selector-box" onclick="openSizePopup(${index}, '${variantType}', '${variantValue}')">
                <span class="selector-label">${variantType}:</span>
                <span class="selector-value">${variantValue}</span>
                <span class="dropdown-arrow">▼</span>
            </div>
            <div class="selector-box" onclick="openQtyPopup(${index}, ${qty})">
                <span class="selector-label">Qty:</span>
                <span class="selector-value">${qty}</span>
                <span class="dropdown-arrow">▼</span>
            </div>
        `;
    }

    return `
        <div class="cart-item" data-index="${index}" data-product-id="${item.id}">
            <div class="cart-item-main">
                <img src="${item.image || 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c'}" 
                     alt="${item.name}" class="cart-item-img"
                     onclick="window.location.href='/product/${item.slug || item.id}'"
                     onerror="this.src='https://images.unsplash.com/photo-1503342217505-b0a15ec3261c'">
                <div class="cart-item-info">
                    <div class="cart-item-brand">${item.brand || ''}</div>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-rating">
                        <span class="stars">★★★★☆</span>
                        <span class="rating-count">4.5 | 33</span>
                    </div>
                    <div class="cart-item-price-section">
                        <span class="current-price">₹${price.toFixed(2)}</span>
                        ${mrp > price ? `<span class="original-price">₹${mrp.toFixed(2)}</span><span class="discount-badge">${discountPercent}% Off</span>` : ''}
                    </div>
                    <div class="cart-item-selectors">${selectorsHtml}</div>
                    <div class="delivery-info">
                        <span class="info-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><rect x="2" y="5" width="16" height="12" rx="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M18 9h4v6h-4"/></svg></span>
                        <span class="info-text">Delivery by <span class="delivery-date">${formattedDate}</span></span>
                    </div>
                    <div class="return-info">
                        <span class="info-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                        <span class="info-text">7 Days Return & Exchange</span>
                    </div>
                </div>
            </div>
            <div class="cart-item-actions">
                <button class="action-btn" onclick="removeItem(${index})">Remove</button>
                <button class="action-btn" onclick="moveToWishlist(${index})">Move to Wishlist</button>
            </div>
        </div>
    `;
}

function updatePriceDetails(items) {
    let totalMrp = 0, totalFinalPrice = 0, itemCount = 0;
    
    items.forEach(item => {
        const { price, mrp } = getPriceInfo(item);
        const qty = Number(item.quantity) || 1;
        itemCount += qty;
        totalMrp += mrp * qty;
        totalFinalPrice += price * qty;
    });
    
    const totalProductDiscount = totalMrp - totalFinalPrice;
    
    const elements = {
        itemCount: document.getElementById('item-count'),
        totalMrp: document.getElementById('total-mrp'),
        totalDiscount: document.getElementById('total-discount'),
        finalTotal: document.getElementById('final-total-web'),
        bottomTotal: document.getElementById('bottom-total'),
        savingsAmount: document.getElementById('savings-amount'),
        savingsMsg: document.querySelector('.savings-message')
    };
    
    if (elements.itemCount) elements.itemCount.innerText = itemCount;
    if (elements.totalMrp) elements.totalMrp.innerText = `₹${totalMrp.toFixed(2)}`;
    if (elements.totalDiscount) elements.totalDiscount.innerText = `- ₹${totalProductDiscount.toFixed(2)}`;
    if (elements.finalTotal) elements.finalTotal.innerText = `₹${totalFinalPrice.toFixed(2)}`;
    if (elements.bottomTotal) elements.bottomTotal.innerText = `₹${totalFinalPrice.toFixed(2)}`;
    
    if (elements.savingsMsg && elements.savingsAmount) {
        if (totalProductDiscount > 0) {
            elements.savingsAmount.innerText = `₹${totalProductDiscount.toFixed(2)}`;
            elements.savingsMsg.style.display = 'flex';
        } else {
            elements.savingsMsg.style.display = 'none';
        }
    }
}

function renderCart(items) {
    const container = document.getElementById('cart-items');
    const countEl = document.getElementById('cart-count');
    const couponSection = document.querySelector('.coupon-section');
    const orderSummary = document.querySelector('.order-summary-card');
    const stickyBar = document.querySelector('.sticky-bottom-bar');
    const isWeb = window.innerWidth >= 1025;
    
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = getEmptyCartHTML();
        updatePriceDetails([]);
        if (countEl) countEl.innerText = '0';
        if (couponSection) couponSection.style.display = 'none';
        if (orderSummary) orderSummary.style.display = 'none';
        if (stickyBar) stickyBar.style.display = 'none';
        return;
    }
    
    if (couponSection) couponSection.style.display = 'block';
    if (orderSummary) orderSummary.style.display = 'block';
    if (stickyBar) stickyBar.style.display = 'flex';

    const fixedItems = items.map(item => {
        const { price, mrp } = getPriceInfo(item);
        return { ...item, price, mrp, originalPrice: mrp };
    });

    container.innerHTML = fixedItems.map((item, index) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        const itemTotal = price * qty;
        return getCartItemHTML({ ...item, originalPrice: item.mrp, mrp: item.mrp }, index, qty, price, itemTotal, isWeb);
    }).join('');

    updatePriceDetails(fixedItems);
    if (countEl) countEl.innerText = fixedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    updateCartCountBadge();
}

function loadCart() {
    let cart = getCart();
    console.log('📦 Cart from localStorage:', cart.length);
    
    cart.forEach((item, idx) => {
        console.log(`Item ${idx}: ${item.name} - Price: ${item.price}, MRP: ${item.mrp}, Variant: ${item.variantValue}`);
    });

    fetchBrandsForCartItems(cart).then(updatedCart => {
        renderCart(updatedCart);
    });

 
}

// ========== CART ITEM ACTIONS ==========
function removeItem(index) {
    let cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    
    if (cart.length === 0) {
        localStorage.removeItem('applied_coupon');
        localStorage.removeItem('coupon_discount');
    }
    
    const token = localStorage.getItem('token');
    if (token && window.cartItemIds?.[index]) {
        fetch(`${API_BASE_URL}/cart/remove/${window.cartItemIds[index]}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        }).catch(err => console.warn('Server remove failed:', err));
    }
    loadCart();
}

function moveToWishlist(index) {
    let cart = getCart();
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const item = cart[index];
    cart.splice(index, 1);
    saveCart(cart);
    
    if (!wishlist.some(w => w.id === item.id)) {
        wishlist.push(item);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
    loadCart();
}

function updateWebQty(index, delta) {
    const input = document.getElementById(`qty-input-${index}`);
    if (!input) return;
    
    let currentQty = parseInt(input.value) || 1;
    let newQty = Math.min(99, Math.max(1, currentQty + delta));
    input.value = newQty;
    
    let cart = getCart();
    if (cart[index]) {
        cart[index].quantity = newQty;
        saveCart(cart);
        updatePriceDetails(cart);
    }
}

function updateWebQtyFromInput(index) {
    const input = document.getElementById(`qty-input-${index}`);
    if (!input) return;
    
    let newQty = Math.min(99, Math.max(1, parseInt(input.value) || 1));
    input.value = newQty;
    
    let cart = getCart();
    if (cart[index]) {
        cart[index].quantity = newQty;
        saveCart(cart);
        updatePriceDetails(cart);
    }
}

function toggleVariantDropdown(index) {
    const dropdown = document.getElementById(`variant-dropdown-${index}`);
    const trigger = dropdown?.previousElementSibling;
    if (!dropdown) return;
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        trigger?.classList.remove('open');
    } else {
        document.querySelectorAll('.selector-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.selector-trigger').forEach(t => t.classList.remove('open'));
        dropdown.classList.add('show');
        trigger?.classList.add('open');
        
        dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.onclick = (e) => {
                e.stopPropagation();
                const value = opt.dataset.value;
                const price = parseFloat(opt.dataset.price);
                const originalPrice = parseFloat(opt.dataset.original);
                
                let cart = getCart();
                if (cart[index]) {
                    cart[index].variantValue = value;
                    if (price && !isNaN(price)) cart[index].price = price;
                    if (originalPrice && !isNaN(originalPrice)) {
                        cart[index].mrp = originalPrice;
                        cart[index].originalPrice = originalPrice;
                    }
                    saveCart(cart);
                    
                    dropdown.classList.remove('show');
                    trigger?.classList.remove('open');
                    if (trigger) {
                        const valueSpan = trigger.querySelector('.selector-value');
                        if (valueSpan) valueSpan.innerText = value;
                    }
                    loadCart();
                }
            };
        });
    }
}

// ========== POPUP FUNCTIONS ==========
function openSizePopup(index, variantType, currentValue) {
    let cart = getCart();
    if (!cart[index]) return;
    
    const checkoutBar = document.querySelector('.sticky-bottom-bar');
    if (checkoutBar) checkoutBar.style.display = 'none';
    
    const availableVariants = cart[index].availableVariants || [];
    const optionsHtml = `<div class="popup-options-grid">${availableVariants.map(v => `
        <div class="popup-option ${v.value === currentValue ? 'selected' : ''}" 
             onclick="selectSizeFromPopup(${index}, '${v.value}', ${v.price || 0}, ${v.originalPrice || 0})">
            ${v.value}
        </div>
    `).join('')}</div>`;
    
    const popupHTML = `
        <div class="popup-overlay" onclick="closePopup()">
            <div class="popup-content" onclick="event.stopPropagation()">
                <div class="popup-header"><h3>Select ${variantType}</h3><button class="popup-close" onclick="closePopup()">✕</button></div>
                ${optionsHtml}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    setTimeout(() => document.querySelector('.popup-overlay')?.classList.add('active'), 10);
    document.body.style.overflow = 'hidden';
}

function selectSizeFromPopup(index, value, price, originalPrice) {
    let cart = getCart();
    if (!cart[index]) return;
    
    cart[index].variantValue = value;
    if (price) cart[index].price = price;
    if (originalPrice) {
        cart[index].mrp = originalPrice;
        cart[index].originalPrice = originalPrice;
    }
    saveCart(cart);
    closePopup();
    loadCart();
}

function openQtyPopup(index, currentQty) {
    let cart = getCart();
    if (!cart[index]) return;
    
    const checkoutBar = document.querySelector('.sticky-bottom-bar');
    if (checkoutBar) checkoutBar.style.display = 'none';
    
    const popupHTML = `
        <div class="popup-overlay" id="qty-popup-overlay" onclick="closeQtyPopup()">
            <div class="popup-content" onclick="event.stopPropagation()">
                <div class="popup-header"><h3>Select Quantity</h3><button class="popup-close" onclick="closeQtyPopup()">✕</button></div>
                <div class="popup-qty-container">
                    <div class="popup-qty-controls">
                        <button class="popup-qty-btn" onclick="updateTempQty(${index}, -1)" ${currentQty <= 1 ? 'disabled' : ''}>−</button>
                        <input type="number" class="popup-qty-input" id="popup-qty-input-${index}" value="${currentQty}" min="1" max="99" onchange="updateTempQtyFromInput(${index})">
                        <button class="popup-qty-btn" onclick="updateTempQty(${index}, 1)">+</button>
                    </div>
                    <div class="popup-buttons">
                        <button class="popup-cancel-btn" onclick="closeQtyPopup()">CANCEL</button>
                        <button class="popup-done-btn" onclick="applyQtyChange(${index})">DONE</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    const popup = document.querySelector('.popup-overlay');
    setTimeout(() => popup?.classList.add('active'), 10);
    document.body.style.overflow = 'hidden';
    if (popup) popup.dataset.tempQty = currentQty;
}

function updateTempQty(index, delta) {
    const input = document.getElementById(`popup-qty-input-${index}`);
    if (!input) return;
    let newQty = Math.min(99, Math.max(1, (parseInt(input.value) || 1) + delta));
    input.value = newQty;
    const popup = document.querySelector('.popup-overlay');
    if (popup) popup.dataset.tempQty = newQty;
}

function updateTempQtyFromInput(index) {
    const input = document.getElementById(`popup-qty-input-${index}`);
    if (!input) return;
    let newQty = Math.min(99, Math.max(1, parseInt(input.value) || 1));
    input.value = newQty;
    const popup = document.querySelector('.popup-overlay');
    if (popup) popup.dataset.tempQty = newQty;
}

function applyQtyChange(index) {
    const popup = document.querySelector('.popup-overlay');
    const newQty = popup ? parseInt(popup.dataset.tempQty) : null;
    if (newQty && newQty > 0) {
        let cart = getCart();
        if (cart[index]) {
            cart[index].quantity = newQty;
            saveCart(cart);
            loadCart();
        }
    }
    closeQtyPopup();
}

function closeQtyPopup() {
    const popup = document.querySelector('.popup-overlay');
    if (!popup) return;
    popup.classList.remove('active');
    setTimeout(() => popup.remove(), 250);
    document.body.style.overflow = '';
    const checkoutBar = document.querySelector('.sticky-bottom-bar');
    if (checkoutBar) checkoutBar.style.display = 'flex';
}

// ========== COUPON FUNCTIONS ==========
// function initCouponSection() {
//     const viewCouponsBtn = document.querySelector('.view-coupons-link');
//     const couponsWrapper = document.querySelector('.applicable-coupons');
    
//     if (viewCouponsBtn && couponsWrapper) {
//         couponsWrapper.style.display = 'none';
//         viewCouponsBtn.addEventListener('click', function(e) {
//             e.preventDefault();
//             const isHidden = couponsWrapper.style.display === 'none';
//             couponsWrapper.style.display = isHidden ? 'block' : 'none';
//             if (isHidden) loadAvailableCoupons();
//             viewCouponsBtn.textContent = isHidden ? 'Hide Coupons' : 'View Coupons';
//         });
//     }
    
//     const applyBtn = document.getElementById('apply-coupon-btn');
//     if (applyBtn) applyBtn.addEventListener('click', () => applyCoupon());
    
//     const removeBtn = document.getElementById('remove-coupon-btn');
//     if (removeBtn) removeBtn.addEventListener('click', removeCoupon);
    
//     const input = document.getElementById('coupon-code-input');
//     if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyCoupon(); });
// }
function initCouponSection() {

    const applyBtn = document.getElementById('apply-coupon-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => applyCoupon());
    }

    const removeBtn = document.getElementById('remove-coupon-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', removeCoupon);
    }

    const input = document.getElementById('coupon-code-input');
    if (input) {
        input.addEventListener('keypress', function(e){
            if(e.key === 'Enter'){
                applyCoupon();
            }
        });
    }
}

// function loadAvailableCoupons() {
//     const couponsList = document.getElementById('coupons-list');
//     if (!couponsList) return;
    
//     couponsList.innerHTML = '<div class="loading-coupons">Loading coupons...</div>';
    
//     fetch(`${API_BASE_URL}/coupons`, { headers: { 'Accept': 'application/json' } })
//     .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
//     .then(response => {
//         if (response.success && response.data?.length) {
//             window.allCoupons = response.data;
//             renderCouponsList(response.data);
//         } else {
//             couponsList.innerHTML = '<div class="no-coupons">No coupons available</div>';
//         }
//     })
//     .catch(err => {
//         console.error('Error loading coupons:', err);
//         couponsList.innerHTML = '<div class="no-coupons">Failed to load coupons</div>';
//     });
// }

// function renderCouponsList(coupons) {
//     const couponsList = document.getElementById('coupons-list');
//     if (!couponsList) return;
    
//     const bottomTotalEl = document.getElementById('bottom-total');
//     const cartTotal = parseFloat(bottomTotalEl?.innerText.replace('₹', '').replace(',', '') || 0);
    
//     if (cartTotal === 0) {
//         couponsList.innerHTML = '<div class="no-coupons">Add items to see applicable coupons</div>';
//         return;
//     }
    
//     const applicableCoupons = coupons.filter(c => cartTotal >= (c.min_order_amount ? parseFloat(c.min_order_amount) : 0));
//     if (!applicableCoupons.length) {
//         couponsList.innerHTML = '<div class="no-coupons">No applicable coupons for this order</div>';
//         return;
//     }
    
//     const bankOffers = applicableCoupons.filter(c => c.coupon_type === 'BANK');
//     const normalCoupons = applicableCoupons.filter(c => c.coupon_type !== 'BANK');
    
//     const getStickerHTML = (coupon, isBank) => {
//         const valueText = coupon.discount_type === 'PERCENT' ? `${coupon.value}%` : `₹${coupon.value}`;
//         const icon = isBank ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9L12 3L21 9V20H3V9Z"/><path d="M8 20V12H16V20"/></svg>` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 10h8M8 14h4"/><circle cx="17" cy="10" r="1.5" fill="currentColor"/><circle cx="17" cy="14" r="1.5" fill="currentColor"/></svg>`;
//         return `<div class="coupon-sticker ${isBank ? 'bank-sticker' : 'normal-sticker'}" onclick="applyCoupon('${coupon.code}')">
//             <span class="coupon-sticker-badge">${icon}</span>
//             <span class="coupon-sticker-code">${coupon.code}</span>
//             <span class="coupon-sticker-value">${valueText}</span>
//         </div>`;
//     };
    
//     couponsList.innerHTML = `
//         <div class="coupon-tabs">
//             <button class="coupon-tab active" data-tab="all">All (${applicableCoupons.length})</button>
//             <button class="coupon-tab" data-tab="bank">Bank (${bankOffers.length})</button>
//             <button class="coupon-tab" data-tab="normal">Coupons (${normalCoupons.length})</button>
//         </div>
//         <div class="coupon-tab-content active" id="tab-all"><div class="coupon-stickers-row">${applicableCoupons.map(c => getStickerHTML(c, c.coupon_type === 'BANK')).join('')}</div></div>
//         <div class="coupon-tab-content" id="tab-bank"><div class="coupon-stickers-row">${bankOffers.length ? bankOffers.map(c => getStickerHTML(c, true)).join('') : '<div class="no-coupons-small">No bank offers</div>'}</div></div>
//         <div class="coupon-tab-content" id="tab-normal"><div class="coupon-stickers-row">${normalCoupons.length ? normalCoupons.map(c => getStickerHTML(c, false)).join('') : '<div class="no-coupons-small">No coupons available</div>'}</div></div>
//     `;
    
//     document.querySelectorAll('.coupon-tab').forEach(tab => {
//         tab.addEventListener('click', function() {
//             document.querySelectorAll('.coupon-tab').forEach(t => t.classList.remove('active'));
//             document.querySelectorAll('.coupon-tab-content').forEach(c => c.classList.remove('active'));
//             this.classList.add('active');
//             document.getElementById(`tab-${this.dataset.tab}`).classList.add('active');
//         });
//     });
// }

function applyCoupon(couponCode = null) {
    const code = couponCode || document.getElementById('coupon-code-input')?.value;
    if (!code) { showToast('Please enter a coupon code', 'error'); return; }
    
    // const selectedCoupon = window.allCoupons?.find(c => c.code === code);
    // if (selectedCoupon?.coupon_type === 'BANK') {
    //     showToast('This offer can be applied during checkout', 'info');
    //     return;
    // }
    
    const cartTotal = parseFloat(document.getElementById('final-total-web')?.innerText.replace('₹', '').replace(',', '') || 0);
  const cart = getCart();

if (!cart.length) {
    showToast('Cart is empty', 'error');
    return;
}

const firstItem = cart[0];  
console.log(firstItem);
console.log("First Item:", firstItem);

console.log({
    coupon_code: code.toUpperCase(),
    cart_total: cartTotal,
    product_id: firstItem.id,
    category_id: firstItem.categoryId,
    subcategory_id: firstItem.subcategoryId
});
    fetch(`${API_BASE_URL}/coupons/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
body: JSON.stringify({
    coupon_code: code.toUpperCase(),
    cart_total: cartTotal,
    product_id: firstItem.id,
    category_id: firstItem.categoryId,
    subcategory_id: firstItem.subcategoryId || null  // ✅ FIXED
})
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            localStorage.setItem('applied_coupon', response.data.coupon_code);
            localStorage.setItem('coupon_discount', response.data.discount);
            showAppliedCoupon(response.data.coupon_code, response.data.discount);
            updateTotalsWithCoupon(response.data);
            showCouponSuccessPopup(response.data.coupon_code, response.data.discount);
        } else {
            showToast(response.message || 'Failed to apply coupon', 'error');
        }
    })
    .catch(err => { console.error('Error:', err); showToast('Error applying coupon', 'error'); });
}

function showAppliedCoupon(code, discount) {
    const appliedDiv = document.querySelector('.applied-coupon');
    const couponBox = document.querySelector('.coupon-box');
    const appliedCodeSpan = document.getElementById('applied-coupon-code');
    if (appliedDiv && appliedCodeSpan) {
        appliedCodeSpan.innerText = `${code} • -₹${discount.toFixed(2)}`;
        appliedDiv.style.display = 'flex';
        if (couponBox) couponBox.style.display = 'none';
    }
}

function updateTotalsWithCoupon(couponData) {
    const totalMrp = parseFloat(document.getElementById('total-mrp')?.innerText.replace('₹', '') || 0);
    const productDiscount = parseFloat(document.getElementById('total-discount')?.innerText.replace('- ₹', '') || 0);
    
    const couponRow = document.querySelector('.coupon-discount');
    const couponDiscountSpan = document.getElementById('coupon-discount');
    if (couponRow && couponDiscountSpan) {
        couponRow.style.display = 'flex';
        couponDiscountSpan.innerText = `- ₹${couponData.discount.toFixed(2)}`;
    }
    
    const finalTotal = Math.max(totalMrp - productDiscount - (couponData?.discount || 0), 0);
    const finalTotalEl = document.getElementById('final-total-web');
    const bottomTotalEl = document.getElementById('bottom-total');
    if (finalTotalEl) finalTotalEl.innerText = `₹${finalTotal.toFixed(2)}`;
    if (bottomTotalEl) bottomTotalEl.innerText = `₹${finalTotal.toFixed(2)}`;
    
    const savingsMsg = document.querySelector('.savings-message');
    const savingsAmount = document.getElementById('savings-amount');
    if (savingsMsg && savingsAmount) {
        savingsAmount.innerText = `₹${(productDiscount + couponData.discount).toFixed(2)}`;
        savingsMsg.style.display = 'flex';
    }
}

function removeCoupon() {
    fetch(`${API_BASE_URL}/coupons/remove`, { method: 'POST', headers: { 'Accept': 'application/json' } })
    .then(() => {
        localStorage.removeItem('applied_coupon');
        localStorage.removeItem('coupon_discount');
        document.querySelector('.applied-coupon').style.display = 'none';
        document.querySelector('.coupon-box').style.display = 'flex';
        document.querySelector('.coupon-discount').style.display = 'none';
        document.getElementById('coupon-code-input').value = '';
        document.querySelectorAll('input[name="coupon"]').forEach(r => r.checked = false);
        loadCart();
        showToast('Coupon removed', 'info');
    });
}

function showCouponSuccessPopup(code, discount) {
    const popup = document.createElement('div');
    popup.className = 'coupon-success-popup';
    popup.innerHTML = `
        <div class="coupon-success-overlay" onclick="closeCouponSuccessPopup()"></div>
        <div class="coupon-success-content">
            <div class="coupon-success-icon">🎉</div>
            <h3>Coupon Applied!</h3>
            <div class="coupon-success-code">${code}</div>
            <div class="coupon-success-discount">You saved: ₹${discount.toFixed(2)}</div>
            <p class="coupon-success-message">Discount has been applied to your order</p>
            <button class="coupon-success-btn" onclick="closeCouponSuccessPopup()">OK, Great!</button>
        </div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => closeCouponSuccessPopup(), 3000);
}

function closeCouponSuccessPopup() {
    document.querySelector('.coupon-success-popup')?.remove();
}

// function showBankOfferPopup(couponCode) {
//     const coupon = window.allCoupons?.find(c => c.code === couponCode);
//     if (!coupon) return;
    
//     const popup = document.createElement('div');
//     popup.className = 'bank-offer-popup';
//     popup.innerHTML = `
//         <div class="bank-offer-overlay" onclick="closeBankOfferPopup()"></div>
//         <div class="bank-offer-content">
//             <div class="bank-offer-icon">🏦</div>
//             <h3>Bank Offer</h3>
//             <div class="bank-offer-code">${coupon.code}</div>
//             <p class="bank-offer-message">This offer can only be applied during checkout with online payment</p>
//             <div class="bank-offer-details">
//                 <div class="bank-offer-save">Save: ₹${parseFloat(coupon.value).toFixed(2)}</div>
//                 <div class="bank-offer-min">Min. Purchase: ₹${coupon.min_order_amount || 1000}</div>
//             </div>
//             <div class="bank-offer-buttons">
//                 <button class="bank-offer-checkout-btn" onclick="window.location.href='/checkout/shipping'">Proceed to Checkout</button>
//                 <button class="bank-offer-close-btn" onclick="closeBankOfferPopup()">Later</button>
//             </div>
//         </div>
//     `;
//     document.body.appendChild(popup);
// }

// function closeBankOfferPopup() {
//     document.querySelector('.bank-offer-popup')?.remove();
// }

// window.showCouponTerms = function(code) {
//     sessionStorage.setItem('view_coupon_code', code);
//     window.location.href = '/coupon-terms';
// }

function proceedToCheckout() {
    let cart = getCart();
    if (cart.length === 0) {
        const popup = document.createElement('div');
        popup.className = 'empty-cart-popup';
        popup.innerHTML = `
            <div class="empty-cart-overlay" onclick="closeEmptyCartPopup()"></div>
            <div class="empty-cart-popup-content">
                <div class="empty-cart-popup-icon">🛒</div>
                <h3>Your cart is empty!</h3>
                <p>Looks like you haven't added anything to your bag yet</p>
                <div class="empty-cart-popup-buttons">
                    <button class="empty-cart-shop-btn" onclick="window.location.href='/'">SHOP NOW</button>
                    <button class="empty-cart-close-btn" onclick="closeEmptyCartPopup()">CLOSE</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        return;
    }
    
        const token = localStorage.getItem('token');
    if (!token) {
        sessionStorage.setItem('guest_checkout_cart', JSON.stringify(cart));
        sessionStorage.setItem('redirect_after_login', '/checkout/shipping');
        if (typeof showLoginPopup === 'function') {
            showLoginPopup();
        } else {
            window.location.href = '/login';
        }
        return;
    }
    window.location.href = '/checkout/shipping';
}


function closeEmptyCartPopup() {
    document.querySelector('.empty-cart-popup')?.remove();
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    const buyNowOriginalCart = sessionStorage.getItem('buy_now_original_cart');
    if (buyNowOriginalCart && window.location.pathname === '/cart') {
        console.log('Restoring original cart after Buy Now');
        localStorage.setItem('cart', buyNowOriginalCart);
        sessionStorage.removeItem('buy_now_original_cart');
        location.reload();
        return;
    }
    
    if (document.getElementById('cart-items')) {
        loadCart();
        initCouponSection();
        
        const showPopup = sessionStorage.getItem('show_coupon_popup');
        const popupCode = sessionStorage.getItem('popup_code');
        const popupDiscount = sessionStorage.getItem('popup_discount');
        
        if (showPopup === 'true' && popupCode && popupDiscount) {
            setTimeout(() => {
                showCouponSuccessPopup(popupCode, parseFloat(popupDiscount));
                sessionStorage.removeItem('show_coupon_popup');
                sessionStorage.removeItem('popup_code');
                sessionStorage.removeItem('popup_discount');
            }, 1000);
        }
    }
    
    updateCartCountBadge();
});

if (document.body.classList.contains('cart-page')) {
    window.goBack = function() {
        const lastProduct = sessionStorage.getItem('last_product_page');
        if (lastProduct && !lastProduct.includes('/checkout') && !lastProduct.includes('/cart')) {
            window.location.href = lastProduct;
            sessionStorage.removeItem('last_product_page');
        } else {
            window.location.href = '/';
        }
    };
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.selector-wrapper')) {
        document.querySelectorAll('.selector-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.selector-trigger').forEach(t => t.classList.remove('open'));
    }
});