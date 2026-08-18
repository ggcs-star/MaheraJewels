const API_BASE_URL = window.API_BASE_URL;

(function() {
    if (!document.body.classList.contains('product-detail-page') && !document.body.classList.contains('category-products-page')) return;
    
    let cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    let currentProduct = null;
    let currentImages = [];
    let currentImageIndex = 0;
    let allColors = [];
    let allSizes = [];
    let selectedColor = null;
    let selectedSize = null;
    let selectedVariant = null;
    let allCoupons = [];
    let showAllOffers = false;
    let allReviews = [];
    let currentReviewIndex = 0;
    let imageTimer = null;
    
    const fromProductPage = sessionStorage.getItem('fromProductPage');
    if (fromProductPage) {
        console.log('Returning from product page');
        sessionStorage.removeItem('fromProductPage');
    }
    
    function getProductPrice(product) {
        if (product.variants && product.variants.length > 0) {
            let firstVariant = product.variants[0];
            if (firstVariant.final_price && firstVariant.final_price != "0.00") {
                return parseFloat(firstVariant.final_price);
            }
            if (firstVariant.price && firstVariant.price != "0.00") {
                return parseFloat(firstVariant.price);
            }
        }
        return parseFloat(product.product_price || product.price || 0);
    }
    
    function updateCartBadge() {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        let totalItems = cart.length;

        const appBadge = document.querySelector('.cart-badge');
        if (appBadge) {
            appBadge.textContent = totalItems;
            appBadge.style.display = 'flex';
        }

        const webBadge = document.getElementById('cart-count-badge');
        if (webBadge) {
            webBadge.textContent = totalItems;
            webBadge.style.display = 'flex';
        }
    }
    
    function showConfirmation(productName) {
        const existingToast = document.querySelector('.top-toast-message');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'top-toast-message';
        toast.innerHTML = `
            <div class="top-toast-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff3f6c" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round"/>
                    <polyline points="22 4 12 14.01 9 11.01" stroke-linecap="round"/>
                </svg>
                <span>${productName}</span>
                <span class="toast-action">added to cart</span>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
    
    function showWishlistToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #282c3f;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: fadeInOut 2s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
    
    function getColorNameFromCode(colorCode) {
        const colorMap = {
            '#000000': 'Black', '#ffffff': 'White', '#ff0000': 'Red', '#00ff00': 'Green',
            '#0000ff': 'Blue', '#ffff00': 'Yellow', '#ff00ff': 'Pink', '#00ffff': 'Cyan',
            '#c0c0c0': 'Silver', '#808080': 'Grey', '#800000': 'Maroon', '#808000': 'Olive',
            '#008000': 'Dark Green', '#800080': 'Purple', '#008080': 'Teal', '#000080': 'Navy',
            '#ffa500': 'Orange', '#ffc0cb': 'Pink', '#ffd700': 'Gold', '#a52a2a': 'Brown', '#f5f5dc': 'Beige'
        };
        return colorMap[colorCode.toLowerCase()] || 'Color';
    }
    
    function startImageAutoScroll() {
        if (imageTimer) clearInterval(imageTimer);
        imageTimer = setInterval(() => nextImage(), 3000);
    }
    
    function renderCurrentReview() {
        const review = allReviews[currentReviewIndex];
        if (!review) return;
        const reviewContainer = document.getElementById('currentReview');
        if (!reviewContainer) return;
        const reviewStars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        reviewContainer.innerHTML = `
            <div class="pdp-review">
                <div class="pdp-review-header">
                    <span class="pdp-reviewer">${review.reviewer}</span>
                    <span class="pdp-review-rating">${reviewStars}</span>
                    <span class="pdp-review-date">${review.date}</span>
                </div>
                <div class="pdp-review-title">${review.title}</div>
                <div class="pdp-review-text">${review.text}</div>
            </div>
        `;
        document.querySelectorAll('.pdp-review-dot').forEach((dot, i) => dot.classList.toggle('active', i === currentReviewIndex));
    }
    
    function renderOffers() {
        const container = document.getElementById('offersContainer');
        if (!container) return;
        const currentPrice = parseFloat(selectedVariant?.final_price || window.displayPrice || 0);
        const applicableCoupons = allCoupons.filter(coupon => currentPrice >= parseFloat(coupon.min_order_amount || 0));
        
        if (!applicableCoupons.length) {
            container.innerHTML = '<div class="pdp-offer-card">No offers available for this product</div>';
            return;
        }
        
        const offersToShow = showAllOffers ? applicableCoupons : applicableCoupons.slice(0, 1);
        container.innerHTML = offersToShow.map(offer => {
            const isBank = offer.coupon_type === 'BANK';
            return `
                <div class="pdp-offer-card ${isBank ? 'bank-offer' : ''}">
                    <div class="pdp-offer-header">
                        <span class="pdp-offer-badge">${isBank ? '🏦 Bank Offer' : '🎫 Special Offer'}</span>
                        <span class="pdp-offer-code">${offer.code}</span>
                    </div>
                    <div class="pdp-offer-desc">${offer.description || offer.name || `Get ${offer.value}${offer.discount_type === 'PERCENT' ? '%' : '₹'} off`}</div>
                    <span class="pdp-offer-tnc" onclick="showOfferTerms('${offer.code}')">View T & C</span>
                </div>
            `;
        }).join('');
        
        if (applicableCoupons.length > 1) {
            container.innerHTML += `<div class="pdp-offer-more" onclick="toggleAllOffers()">${showAllOffers ? 'Show Less ▲' : `+${applicableCoupons.length - 1} more offers ▼`}</div>`;
        }
    }
    
    function renderOfferItems(type, isDesktop = false) {
        const content = document.getElementById(isDesktop ? 'offersDesktopContent' : 'offersContent');
        if (!content) return;
        
        const bankOffers = allCoupons.filter(offer => offer.coupon_type === 'BANK');
        const normalOffers = allCoupons.filter(offer => offer.coupon_type !== 'BANK');
        let html = '';
        
        if (type === 'bank') {
            if (!bankOffers.length) {
                html = `<div class="offers-empty"><div class="offers-empty-icon">🏦</div><div>No bank offers available</div></div>`;
            } else {
                bankOffers.forEach(offer => {
                    html += `
                        <div class="offers-popup-item bank-offer">
                            <div class="offers-popup-header-row">
                                <span class="offers-popup-badge">🏦 Bank Offer</span>
                                <span class="offers-popup-code">${offer.code}</span>
                            </div>
                            <div class="offers-popup-desc">${offer.description || offer.name || `Get ${offer.value}${offer.discount_type === 'PERCENT' ? '%' : '₹'} off`}</div>
                            <div class="offers-popup-footer">
                                <span class="offers-popup-min">Min. ₹${offer.min_order_amount || 999}</span>
                                <span class="offers-popup-tnc" onclick="showOfferTerms('${offer.code}')">View T & C</span>
                            </div>
                        </div>
                    `;
                });
            }
        } else {
            if (!normalOffers.length) {
                html = `<div class="offers-empty"><div class="offers-empty-icon">🎫</div><div>No coupons available</div></div>`;
            } else {
                normalOffers.forEach(offer => {
                    html += `
                        <div class="offers-popup-item normal-offer">
                            <div class="offers-popup-header-row">
                                <span class="offers-popup-badge">🎫 Special Offer</span>
                                <span class="offers-popup-code">${offer.code}</span>
                            </div>
                            <div class="offers-popup-desc">${offer.description || offer.name || `Get ${offer.value}${offer.discount_type === 'PERCENT' ? '%' : '₹'} off`}</div>
                            <div class="offers-popup-footer">
                                <span class="offers-popup-min">Min. ₹${offer.min_order_amount || 499}</span>
                                <span class="offers-popup-tnc" onclick="showOfferTerms('${offer.code}')">View T & C</span>
                            </div>
                        </div>
                    `;
                });
            }
        }
        content.innerHTML = html;
    }
    
    function formatDescription(description) {
        if (!description) return [];
        return description.split('\n').map(line => line.replace(/^[•\s]*/, '').trim()).filter(line => line);
    }
        
    window.addToBag = function(product) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const activeBtn = document.querySelector('.pdp-size-btn.active');
        let selectedVariant = null;
        
        if (product.variants && product.variants.length > 0) {
            if (activeBtn) selectedVariant = product.variants.find(v => v.id == activeBtn.dataset.variantId);
            if (!selectedVariant) selectedVariant = product.variants[0];
        }
        
       let finalPrice = 0;
       let originalPrice = 0;
        if (selectedVariant && selectedColor) {
            finalPrice = parseFloat(selectedVariant.final_price) || parseFloat(selectedVariant.price) || 0;
            originalPrice = parseFloat(selectedVariant.price) || finalPrice;
        } else if (selectedVariant) {
            finalPrice = parseFloat(selectedVariant.final_price) || parseFloat(selectedVariant.price) || 0;
            originalPrice = parseFloat(selectedVariant.price) || finalPrice;
        } else if (product.variants && product.variants.length > 0) {
            let firstVariant = product.variants[0];
            finalPrice = parseFloat(firstVariant.final_price) || parseFloat(firstVariant.price) || 0;
            originalPrice = parseFloat(firstVariant.price) || finalPrice;
        } else {
            finalPrice = getProductPrice(product);
            originalPrice = parseFloat(product.product_price || product.price || finalPrice);
        }
        
        const variantType = selectedVariant?.variant_type || 'Size';
        const variantValue = selectedVariant?.variant_value || 'S';
        const variantId = selectedVariant?.id || null;
        
        const availableVariants = product.variants ? product.variants.map(v => ({
            id: v.id, value: v.variant_value, price: parseFloat(v.final_price) || 0, originalPrice: parseFloat(v.price) || 0
        })) : [];

        let imageUrl = '';
        const mainImage = document.getElementById('mainImage');
        if (mainImage && mainImage.src) imageUrl = mainImage.src;
        else if (selectedVariant?.image_url) imageUrl = selectedVariant.image_url;
        else if (product.image_url) imageUrl = product.image_url;
        else if (product.gallery_images && product.gallery_images.length) imageUrl = product.gallery_images[0];

        const cartItem = {
            id: product.id, name: product.name, brand: product.brand || '', 
            price: finalPrice, 
            mrp: originalPrice,
            originalPrice: originalPrice, 
            product_price: product.product_price, 
            image: imageUrl, 
            slug: product.slug,
            variantType: variantType, 
            variantValue: variantValue, 
            variantValue: variantValue || '',
            variantId: variantId, 
            categoryId: product.category?.id,
            
            quantity: 1, 
            availableVariants: availableVariants, 
            rating: product.rating || 4.5, 
            reviewCount: product.review_count || 33
        };

        const existingIndex = cart.findIndex(i => i.id === cartItem.id && i.variantId === cartItem.variantId);
        if (existingIndex >= 0) cart[existingIndex].quantity += 1;
        else cart.push(cartItem);
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartBadge();
        showConfirmation(product.name);
    }
    
    window.addToCartFromProduct = function() {
        const sizeError = document.querySelector('.pdp-size-error');
        if (!selectedSize && allSizes.length > 0) {
            if (sizeError) sizeError.style.display = 'block';
            else {
                const sizeSection = document.querySelector('.pdp-size');
                if (sizeSection) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'pdp-size-error';
                    errorDiv.style.cssText = 'color: #ff3f6c; font-size: 13px; margin-top: 8px; display: block;';
                    errorDiv.textContent = 'Please select a size';
                    sizeSection.appendChild(errorDiv);
                    setTimeout(() => errorDiv.style.display = 'none', 3000);
                }
            }
            document.querySelector('.pdp-size-options')?.classList.add('size-error-shake');
            setTimeout(() => document.querySelector('.pdp-size-options')?.classList.remove('size-error-shake'), 500);
            return;
        }
        
        let finalPriceToUse = selectedVariant ? (parseFloat(selectedVariant.final_price) || parseFloat(selectedVariant.price) || 0) : getProductPrice(currentProduct);
        
        let mrpValue = currentProduct?.product_price || currentProduct?.price || finalPriceToUse;
            if (selectedVariant && selectedVariant.price) {
                mrpValue = parseFloat(selectedVariant.price);
            }

        const product = {
            id: currentProduct?.id, 
            name: currentProduct?.name, 
            brand: currentProduct?.brand, 
            price: finalPriceToUse,
            mrp: mrpValue,
            final_price: finalPriceToUse, 
            product_price: currentProduct?.product_price,
            image_url: document.getElementById('mainImage')?.src || currentProduct?.image_url, 
            slug: currentProduct?.slug,
            category: currentProduct?.category, 
            variants: currentProduct?.variants, 
            gallery_images: currentProduct?.gallery_images
        };
        
        if (selectedVariant) {
            product.variantValue = selectedVariant.value;
            product.variantId = selectedVariant.id;
            product.variantType = selectedVariant.type;
        } else if (selectedSize) {
            product.variantValue = selectedSize;
            product.variantId = null;
            product.variantType = 'Size';
        }
        window.addToBag(product);
    }
    
    window.goBack = function() { window.history.back(); };
    
    window.selectColor = function(element, colorCode, imageUrl, colorName) {
    if (selectedColor === (colorName || colorCode)) {
        selectedColor = null;
        selectedVariant = null;
        document.querySelectorAll('.pdp-color-circle, .pdp-color-name-item').forEach(item => item.classList.remove('active'));
        currentImages = currentProduct.gallery_images && currentProduct.gallery_images.length ? currentProduct.gallery_images : [currentProduct.image_url];
        
        const priceElement = document.getElementById('currentPrice');
        const buyPriceElement = document.getElementById('buyPrice');
        const originalPriceSpan = document.querySelector('.pdp-original-price');
        const discountSpan = document.querySelector('.pdp-discount');
        
        if (priceElement) priceElement.textContent = '₹' + Number(window.displayPrice).toLocaleString('en-IN');
        if (buyPriceElement) buyPriceElement.textContent = Number(window.displayPrice).toLocaleString('en-IN');
        if (originalPriceSpan && window.originalPrice > window.displayPrice) {
            originalPriceSpan.textContent = '₹' + window.originalPrice.toLocaleString('en-IN');
        }
        
        currentImageIndex = 0;
        const mainImage = document.getElementById('mainImage');
        const counter = document.getElementById('currentImage');
        if (mainImage) mainImage.src = currentImages[0];
        if (counter) counter.textContent = `1/${currentImages.length}`;
        startImageAutoScroll();
        return;
    }
    
    document.querySelectorAll('.pdp-color-circle, .pdp-color-name-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    selectedColor = colorName || colorCode;
    
    if (imageUrl) {
        const mainImage = document.getElementById('mainImage');
        mainImage.src = imageUrl;
        currentImages = [imageUrl];
        currentImageIndex = 0;
        const counter = document.getElementById('currentImage');
        if (counter) counter.textContent = `1/1`;
    }
    
    const variant = allSizes.find(v => v.color === colorCode);
    if (variant) {
        selectedVariant = variant;
        window.selectedVariant = variant;
        selectedSize = variant.value;
        
        let variantOriginal = parseFloat(variant.price);
        let variantFinal = parseFloat(variant.final_price) || parseFloat(variant.price);
        let variantDiscount = 0;
        
        if (variantOriginal > variantFinal) {
            variantDiscount = Math.round(((variantOriginal - variantFinal) / variantOriginal) * 100);
        }
        
        const priceElement = document.getElementById('currentPrice');
        const buyPriceElement = document.getElementById('buyPrice');
        const originalPriceSpan = document.querySelector('.pdp-original-price');
        const discountSpan = document.querySelector('.pdp-discount');
        
        if (priceElement) priceElement.textContent = '₹' + variantFinal.toLocaleString('en-IN');
        if (buyPriceElement) buyPriceElement.textContent = variantFinal.toLocaleString('en-IN');
        
        if (variantOriginal > variantFinal) {
            if (!originalPriceSpan) {
                const priceDiv = document.querySelector('.pdp-price');
                const currentSpan = document.querySelector('.pdp-current-price');
                const newOriginalSpan = document.createElement('span');
                newOriginalSpan.className = 'pdp-original-price';
                newOriginalSpan.textContent = '₹' + variantOriginal.toLocaleString('en-IN');
                if (currentSpan && priceDiv) {
                    currentSpan.insertAdjacentElement('afterend', newOriginalSpan);
                }
            } else {
                originalPriceSpan.textContent = '₹' + variantOriginal.toLocaleString('en-IN');
                originalPriceSpan.style.display = 'inline';
            }
            
            if (!discountSpan) {
                const priceDiv = document.querySelector('.pdp-price');
                const newDiscountSpan = document.createElement('span');
                newDiscountSpan.className = 'pdp-discount';
                newDiscountSpan.textContent = variantDiscount + '% Off';
                if (priceDiv) priceDiv.appendChild(newDiscountSpan);
            } else {
                discountSpan.textContent = variantDiscount + '% Off';
                discountSpan.style.display = 'inline';
            }
        } else {
            if (originalPriceSpan) originalPriceSpan.style.display = 'none';
            if (discountSpan) discountSpan.style.display = 'none';
        }
        
        document.querySelectorAll('.pdp-size-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent === variant.value) btn.classList.add('active');
        });
    }
    if (imageTimer) clearInterval(imageTimer);
}
    
    window.selectScrollColor = function(colorCode, imageUrl, colorName) {
        document.querySelectorAll('.pdp-color-circle').forEach((circle, index) => {
            const style = circle.getAttribute('style') || '';
            if (style.includes(colorCode)) window.selectColor(circle, colorCode, imageUrl, colorName);
        });
        window.closeColorScrollPopup();
    }
    
    window.selectVariant = function(btn, price, variantId, variantType) {
    document.querySelectorAll('.pdp-size-btn:not(.disabled)').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSize = btn.textContent;
    const sizeError = document.querySelector('.pdp-size-error');
    if (sizeError) sizeError.style.display = 'none';
    
    const variant = allSizes.find(v => v.id == variantId);
    if (variant) {
        window.selectedSizeOnly = variant;
        
        let variantOriginal = parseFloat(variant.price);
        let variantFinal = parseFloat(variant.final_price) || parseFloat(price);
        let variantDiscount = 0;
        
        if (variantOriginal > variantFinal) {
            variantDiscount = Math.round(((variantOriginal - variantFinal) / variantOriginal) * 100);
        }
        
        const priceElement = document.getElementById('currentPrice');
        const buyPriceElement = document.getElementById('buyPrice');
        let originalPriceSpan = document.querySelector('.pdp-original-price');
        let discountSpan = document.querySelector('.pdp-discount');
        
        if (priceElement) priceElement.textContent = '₹' + variantFinal.toLocaleString('en-IN');
        if (buyPriceElement) buyPriceElement.textContent = variantFinal.toLocaleString('en-IN');
        
        if (variantOriginal > variantFinal) {
            if (originalPriceSpan) {
                originalPriceSpan.textContent = '₹' + variantOriginal.toLocaleString('en-IN');
                originalPriceSpan.style.display = 'inline';
            } else {
                const priceDiv = document.querySelector('.pdp-price');
                const currentSpan = document.querySelector('.pdp-current-price');
                const newOriginalSpan = document.createElement('span');
                newOriginalSpan.className = 'pdp-original-price';
                newOriginalSpan.textContent = '₹' + variantOriginal.toLocaleString('en-IN');
                if (currentSpan && priceDiv) {
                    currentSpan.insertAdjacentElement('afterend', newOriginalSpan);
                }
                originalPriceSpan = document.querySelector('.pdp-original-price');
            }
            
            if (discountSpan) {
                discountSpan.textContent = variantDiscount + '% Off';
                discountSpan.style.display = 'inline';
            } else {
                const priceDiv = document.querySelector('.pdp-price');
                const newDiscountSpan = document.createElement('span');
                newDiscountSpan.className = 'pdp-discount';
                newDiscountSpan.textContent = variantDiscount + '% Off';
                if (priceDiv) priceDiv.appendChild(newDiscountSpan);
            }
        } else {
            if (originalPriceSpan) originalPriceSpan.style.display = 'none';
            if (discountSpan) discountSpan.style.display = 'none';
        }
        
        window.displayPrice = variantFinal;
        window.originalPrice = variantOriginal;
    }
}
    
    window.changeImage = function(index) {
        const mainImage = document.getElementById('mainImage');
        const counter = document.getElementById('currentImage');
        if (mainImage && currentImages[index]) {
            mainImage.src = currentImages[index];
            currentImageIndex = index;
            if (counter) counter.textContent = (index + 1) + '/' + currentImages.length;
        }
    }
    
    window.nextImage = function() { window.changeImage((currentImageIndex + 1) % currentImages.length); }
    window.prevImage = function() { window.changeImage((currentImageIndex - 1 + currentImages.length) % currentImages.length); }
    
    window.showSizeChart = async function() {
        const productId = currentProduct?.id;
        if (!productId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/products/${productId}/size-chart`);
            const data = await response.json();
            if (data.success && data.data.measurements.length) {
                const body = document.getElementById('sizeChartBody');
                const title = document.getElementById('sizeChartTitle');
                if (title) title.textContent = data.data.title || 'Size Chart';
                
                let html = `<table class="pdp-size-table"><thead><tr><th>Size</th><th>Height (cm)</th><th>Width (cm)</th><th>Color</th></tr></thead><tbody>`;
                data.data.measurements.forEach(item => {
                    html += `<tr><td><strong>${item.size}</strong></td><td>${item.height || '-'}</td><td>${item.width || '-'}</td><td>${item.color_name || '-'}</td></tr>`;
                });
                html += `</tbody></table>`;
                if (body) body.innerHTML = html;
                document.getElementById('sizeChartPopup')?.classList.add('active');
                document.body.style.overflow = 'hidden';
            } else alert('Size chart not available for this product');
        } catch(error) { console.error('Error fetching size chart:', error); alert('Size chart not available'); }
    }
    
    window.hideSizeChart = function() {
        document.getElementById('sizeChartPopup')?.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    window.showColorPopup = function() {
        const isDesktop = window.innerWidth >= 1024;
        if (isDesktop) {
            const existingPanel = document.querySelector('.pdp-color-desktop-panel');
            if (existingPanel) { existingPanel.remove(); return; }
            const colorCountSpan = document.querySelector('.pdp-color-count');
            if (!colorCountSpan) return;
            const rect = colorCountSpan.getBoundingClientRect();
            const panel = document.createElement('div');
            panel.className = 'pdp-color-desktop-panel';
            panel.style.cssText = `position:absolute; top:${rect.bottom + window.scrollY + 8}px; right:${window.innerWidth - rect.right}px;`;
            
            let colorsHtml = `<div class="pdp-color-desktop-panel-header">Select Color (${allColors.length})</div><div class="pdp-color-desktop-list">`;
            allColors.forEach(c => {
                let colorImage = c.image || currentImages[0];
                const colorKeyword = (c.name || '').toLowerCase();
                for (let i = 0; i < currentImages.length; i++) {
                    if (currentImages[i].toLowerCase().includes(colorKeyword)) { colorImage = currentImages[i]; break; }
                }
                const isSelected = selectedColor === c.name;
                colorsHtml += `<div class="pdp-color-desktop-item ${isSelected ? 'selected' : ''}" onclick="selectDesktopColor('${c.color}', '${colorImage}', '${c.name}')">
                    <div class="pdp-color-desktop-dot" style="background: ${c.color}; ${c.color.toLowerCase() === '#ffffff' ? 'border:1px solid #ddd' : ''}"></div>
                    ${isSelected ? '<span class="pdp-color-desktop-check">✓</span>' : ''}
                    <img src="${colorImage}" class="pdp-color-desktop-thumb" onerror="this.style.display='none'">
                </div>`;
            });
            colorsHtml += `</div>`;
            panel.innerHTML = colorsHtml;
            document.body.appendChild(panel);
            const closePanel = function(e) {
                if (!panel.contains(e.target) && !colorCountSpan.contains(e.target)) { panel.remove(); document.removeEventListener('click', closePanel); }
            };
            setTimeout(() => document.addEventListener('click', closePanel), 100);
        } else {
            const existingPopup = document.querySelector('.color-scroll-popup');
            if (existingPopup) existingPopup.remove();
            const popup = document.createElement('div');
            popup.className = 'color-scroll-popup';
            let colorsHtml = '<div class="color-scroll-container">';
            allColors.forEach(c => {
                let colorImage = c.image || currentImages[0];
                const colorKeyword = (c.name || '').toLowerCase();
                for (let i = 0; i < currentImages.length; i++) {
                    if (currentImages[i].toLowerCase().includes(colorKeyword)) { colorImage = currentImages[i]; break; }
                }
                const isSelected = selectedColor === c.name;
                colorsHtml += `<div class="color-scroll-item ${isSelected ? 'selected' : ''}" onclick="selectScrollColor('${c.color}', '${colorImage}', '${c.name}')">
                    <div class="color-scroll-image"><img src="${colorImage}" onerror="this.src='https://via.placeholder.com/80x100?text=No+Image'"></div>
                    <div class="color-scroll-info">
                        <span class="color-scroll-dot" style="background: ${c.color}; ${c.color.toLowerCase() === '#ffffff' ? 'border:1px solid #ddd' : ''}"></span>
                        ${isSelected ? '<span class="color-scroll-check">✓</span>' : ''}
                    </div>
                </div>`;
            });
            colorsHtml += '</div>';
            popup.innerHTML = `<div class="color-scroll-header"><span>Select Color</span><button class="color-scroll-close" onclick="closeColorScrollPopup()">✕</button></div>${colorsHtml}`;
            document.body.appendChild(popup);
            document.body.style.overflow = 'hidden';
        }
    }
    
    window.selectDesktopColor = function(colorCode, imageUrl, colorName) {
        document.querySelectorAll('.pdp-color-circle').forEach((circle) => {
            const style = circle.getAttribute('style') || '';
            if (style.includes(colorCode)) window.selectColor(circle, colorCode, imageUrl, colorName);
        });
        document.querySelector('.pdp-color-desktop-panel')?.remove();
    }
    
    window.closeColorScrollPopup = function() {
        const popup = document.querySelector('.color-scroll-popup');
        if (popup) { popup.remove(); document.body.style.overflow = ''; }
    }
    
    window.toggleWishlist = function(button, event) {
        if (event) event.stopPropagation();
        button.classList.toggle('active');
        const mainImage = document.getElementById('mainImage');
        let imageUrl = '';
        if (mainImage && mainImage.src && mainImage.src !== '') imageUrl = mainImage.src;
        else if (window.currentProduct?.gallery_images?.length) imageUrl = window.currentProduct.gallery_images[0];
        else if (window.currentProduct?.image_url) imageUrl = window.currentProduct.image_url;
        
        let productPrice = 0;
        const priceEl = document.getElementById('currentPrice');
        if (priceEl) productPrice = parseFloat(priceEl.textContent.replace('₹','').replace(/,/g,''));
        
        const productData = {
            id: window.currentProduct?.id, name: window.currentProduct?.name, price: productPrice,
            image: imageUrl, brand: window.currentProduct?.brand, slug: window.currentProduct?.slug
        };
        let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
        if (button.classList.contains('active')) {
            if (!wishlist.some(item => item.id == productData.id)) { wishlist.push(productData); showWishlistToast('❤️ Added to wishlist'); }
        } else {
            wishlist = wishlist.filter(item => item.id != productData.id);
            showWishlistToast('💔 Removed from wishlist');
        }
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }
    
    window.shareProduct = function() {
        if (navigator.share) navigator.share({ title: currentProduct?.name, url: window.location.href });
        else { navigator.clipboard.writeText(window.location.href); alert('Link copied!'); }
    }
    
    window.checkPincode = function() {
        const pincode = document.getElementById('pincode').value;
        const info = document.getElementById('deliveryInfo');
        if (pincode.length === 6 && /^\d+$/.test(pincode)) {
            localStorage.setItem('lastPincode', pincode);
            const date = new Date();
            date.setDate(date.getDate() + 5);
            info.innerHTML = `✅ Delivery by ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
            info.className = 'pdp-delivery-info success';
        } else { info.innerHTML = 'Please enter valid 6-digit pincode'; info.className = 'pdp-delivery-info error'; }
    }
    
    window.showOfferTerms = function(code, event) {
        if (event) event.stopPropagation();
        sessionStorage.setItem('view_coupon_code', code);
        window.location.href = '/coupon-terms';
    }
    
    window.toggleAllOffers = function() { window.showAllOffersPopup(); }
    
    window.showAllOffersPopup = function() {
        const isDesktop = window.innerWidth >= 1024;
        const bankOffers = allCoupons.filter(offer => offer.coupon_type === 'BANK');
        const normalOffers = allCoupons.filter(offer => offer.coupon_type !== 'BANK');
        
        if (isDesktop) {
            const existingModal = document.querySelector('.offers-desktop-modal');
            if (existingModal) { existingModal.remove(); return; }
            const modal = document.createElement('div');
            modal.className = 'offers-desktop-modal';
            modal.innerHTML = `
                <div class="offers-desktop-overlay" onclick="closeOffersPopup()"></div>
                <div class="offers-desktop-content">
                    <div class="offers-desktop-header"><h3>All Offers <span class="offers-count">${allCoupons.length}</span></h3><button class="offers-desktop-close" onclick="closeOffersPopup()">✕</button></div>
                    <div class="offers-desktop-tabs">
                        <button class="offers-desktop-tab bank-tab active" onclick="switchDesktopOfferTab('bank')">Bank Offers (${bankOffers.length})</button>
                        <button class="offers-desktop-tab normal-tab" onclick="switchDesktopOfferTab('normal')">Coupons (${normalOffers.length})</button>
                    </div>
                    <div class="offers-desktop-content-body" id="offersDesktopContent"></div>
                </div>
            `;
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
            renderOfferItems('bank', true);
        } else {
            const popup = document.createElement('div');
            popup.className = 'offers-popup';
            popup.innerHTML = `
                <div class="offers-popup-header"><h3>All Offers <span class="offers-count">${allCoupons.length}</span></h3><button class="offers-popup-close" onclick="closeOffersPopup()">✕</button></div>
                <div class="offers-tabs">
                    <button class="offers-tab bank-tab active" onclick="switchOfferTab('bank')">Bank Offers (${bankOffers.length})</button>
                    <button class="offers-tab normal-tab" onclick="switchOfferTab('normal')">Coupons (${normalOffers.length})</button>
                </div>
                <div class="offers-popup-content" id="offersContent"></div>
            `;
            document.body.appendChild(popup);
            document.body.style.overflow = 'hidden';
            renderOfferItems('bank', false);
        }
    }
    
    window.switchDesktopOfferTab = function(type) {
        const bankTab = document.querySelector('.offers-desktop-tab.bank-tab');
        const normalTab = document.querySelector('.offers-desktop-tab.normal-tab');
        if (type === 'bank') { bankTab?.classList.add('active'); normalTab?.classList.remove('active'); }
        else { normalTab?.classList.add('active'); bankTab?.classList.remove('active'); }
        renderOfferItems(type, true);
    }
    
    window.switchOfferTab = function(type) {
        const bankTab = document.querySelector('.offers-tab.bank-tab');
        const normalTab = document.querySelector('.offers-tab.normal-tab');
        if (type === 'bank') { bankTab?.classList.add('active'); normalTab?.classList.remove('active'); }
        else { normalTab?.classList.add('active'); bankTab?.classList.remove('active'); }
        renderOfferItems(type, false);
    }
    
    window.closeOffersPopup = function() {
        document.querySelector('.offers-popup')?.remove();
        document.querySelector('.offers-desktop-modal')?.remove();
        document.body.style.overflow = '';
    }
    
    window.changeReview = function(index) { if (index >= 0 && index < allReviews.length) { currentReviewIndex = index; renderCurrentReview(); } }
    window.nextReview = function() { currentReviewIndex = (currentReviewIndex + 1) % allReviews.length; renderCurrentReview(); }
    window.prevReview = function() { currentReviewIndex = (currentReviewIndex - 1 + allReviews.length) % allReviews.length; renderCurrentReview(); }
    
    // ========== BUY NOW - FIXED ==========
window.buyNow = function() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || !user.id) { 
        sessionStorage.setItem('redirect_after_login', window.location.href);
        if (typeof showLoginPopup === 'function') {
            showLoginPopup();
        } else {
            window.location.href = '/login';
        }
        return; 
    }

    const hasRealVariants = window.hasRealVariants || (allSizes.length > 0 && !(allSizes.length === 1 && allSizes[0]?.value === 'Standard'));
    if (hasRealVariants && !selectedSize && allSizes.length > 0) {
        const sizeSection = document.querySelector('.pdp-size');
        if (sizeSection) {
            let sizeError = document.querySelector('.pdp-size-error');
            if (!sizeError) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'pdp-size-error';
                errorDiv.style.cssText = 'color: #ff3f6c; font-size: 13px; margin-top: 8px; display: block;';
                errorDiv.textContent = 'Please select a size';
                sizeSection.appendChild(errorDiv);
                setTimeout(() => errorDiv.style.display = 'none', 3000);
            } else sizeError.style.display = 'block';
        }
        document.querySelector('.pdp-size-options')?.classList.add('size-error-shake');
        setTimeout(() => document.querySelector('.pdp-size-options')?.classList.remove('size-error-shake'), 500);
        return;
    }
    
    const activeBtn = document.querySelector('.pdp-size-btn.active');
    let selectedVariant = null;
    let variantValue = null;
    
    if (currentProduct?.variants && currentProduct.variants.length > 0) {
        if (activeBtn) {
            selectedVariant = currentProduct.variants.find(v => v.id == activeBtn.dataset.variantId);
        }
        if (!selectedVariant) {
            selectedVariant = currentProduct.variants[0];
        }
        if (selectedVariant) {
            variantValue = selectedVariant.variant_value || selectedVariant.value;
        }
    }
    
    let finalPrice = selectedVariant 
        ? (parseFloat(selectedVariant.final_price) || parseFloat(selectedVariant.price) || 0)
        : getProductPrice(currentProduct);
    
    if (finalPrice === 0 || isNaN(finalPrice)) {
        finalPrice = window.displayPrice || 0;
    }
    
    let imageUrl = '';
    const mainImage = document.getElementById('mainImage');
    if (mainImage && mainImage.src) imageUrl = mainImage.src;
    else if (currentProduct?.image_url) imageUrl = currentProduct.image_url;
    else if (currentProduct?.gallery_images && currentProduct.gallery_images.length) imageUrl = currentProduct.gallery_images[0];
    
    // ✅ FIX: Use currentProduct, not product
    const categoryId = currentProduct?.category?.id || null;
    const subcategoryId = currentProduct?.subcategory?.id || currentProduct?.category?.parent_id || null;
    
    const cartItem = {
        id: currentProduct?.id,
        name: currentProduct?.name,
        brand: currentProduct?.brand || '',
        price: finalPrice,
        product_price: finalPrice,
        image: imageUrl,
        slug: currentProduct?.slug,
        variantId: selectedVariant?.id || null,
        variantValue: variantValue || '',
        quantity: 1,
        categoryId: categoryId,
        subcategoryId: subcategoryId
    };
    
    localStorage.setItem('cart', JSON.stringify([cartItem]));
    
    // ✅ FIX: Save complete data with category_id
    sessionStorage.setItem('buy_now_product', JSON.stringify({
        product_id: currentProduct?.id,
        variant_id: selectedVariant?.id || null,
        price: finalPrice,
        name: currentProduct?.name,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        image: imageUrl,
        variant_value: variantValue || '',
        brand: currentProduct?.brand || '',
        slug: currentProduct?.slug
    }));
    
    updateCartBadge();
    window.location.href = '/checkout/shipping';
}
        
    async function fetchProduct() {
        if (document.body.classList.contains('category-products-page')) return;
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[pathParts.length - 1];
        try {
            const response = await fetch(`${API_BASE_URL}/products/${slug}`);
            const data = await response.json();
            if (data.success && data.data) {
                currentProduct = data.data;
                window.currentProduct = data.data;
                await fetchBrandFromCategory();
                await Promise.all([fetchCoupons(), fetchReviews()]);
                renderProduct(data.data);
                startImageAutoScroll();
            } else showError('Product not found');
        } catch (error) { console.error('Error:', error); showError('Failed to load product'); }
    }
    
    async function fetchBrandFromCategory() {
        if (!currentProduct?.category?.id) return;
        try {
            const res = await fetch(`${API_BASE_URL}/categories/${currentProduct.category.id}/products`);
            const data = await res.json();
            if (data.success && data.data?.products) {
                const productInCategory = data.data.products.find(p => p.id == currentProduct.id);
                if (productInCategory?.brand) currentProduct.brand = productInCategory.brand;
            }
        } catch (error) { console.error('Error fetching brand:', error); }
    }
    
    async function fetchCoupons() {
        try {
            const res = await fetch(`${API_BASE_URL}/coupons`);
            const data = await res.json();
            if (data.success && data.data) allCoupons = data.data;
        } catch (error) { console.error('Error fetching coupons:', error); allCoupons = []; }
    }
    
    async function fetchReviews() {
        allReviews = [
            { id: 1, reviewer: 'Priya S.', rating: 5, date: '2 days ago', title: 'Beautiful but size up if between sizes.', text: 'The dress is stunning and the quality is good. I was between S and M, so I chose M and it fits comfortably.' },
            { id: 2, reviewer: 'Rahul K.', rating: 4, date: '1 week ago', title: 'Perfect for vacation.', text: 'The slit and floral print look so elegant. It\'s comfortable even in warm weather. True to size and exactly like the pictures.' },
            { id: 3, reviewer: 'Anjali M.', rating: 5, date: '2 weeks ago', title: 'Excellent quality and fit!', text: 'The fabric is soft and breathable. Perfect for summer. I received many compliments.' }
        ];
    }
    
    async function fetchSimilarProducts() {
        const similarSection = document.querySelector('.pdp-similar');
        const grid = document.getElementById('similarGrid');
        if (!grid || !similarSection) return;
        try {
            const categoryId = currentProduct?.category?.id;
            if (!categoryId) { similarSection.style.display = 'none'; return; }
            const res = await fetch(`${API_BASE_URL}/categories/${categoryId}/products`);
            const data = await res.json();
            if (data.success && data.data?.products) {
                const otherProducts = data.data.products.filter(p => p.id != currentProduct.id).slice(0, 8);
                if (otherProducts.length > 0) {
                    similarSection.style.display = 'block';
                    grid.innerHTML = otherProducts.map(p => {
                        let currentPrice = getProductPrice(p);
                        let originalPrice = parseFloat(p.price) || 0;
                        return `<div class="pdp-similar-card" onclick="window.location.href='/product/${p.slug}'">
                            <img src="${p.image_url || ''}" 
                                class="pdp-similar-image" 
                                data-main="${p.image_url || ''}"
                                data-slug="${p.slug}"
                                onmouseenter="loadSimilarHoverImage(this)"
                                onmouseleave="this.src=this.dataset.main"
                                onerror="this.style.display='none'">
                            <div class="pdp-similar-brand">${p.brand || 'Brand'}</div>
                            <div class="pdp-similar-name">${p.name}</div>
                            <div class="pdp-similar-price">
                                <span class="pdp-similar-current">₹${currentPrice.toLocaleString('en-IN')}</span>
                                ${originalPrice > currentPrice ? '<span class="pdp-similar-original">₹' + originalPrice.toLocaleString('en-IN') + '</span>' : ''}
                            </div>

                        </div>`;
                    }).join('');
                } else similarSection.style.display = 'none';
            } else similarSection.style.display = 'none';
        } catch (error) { console.error('Error fetching similar products:', error); similarSection.style.display = 'none'; }
    }
    
    async function fetchAppSettingsForProductPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/app-settings`);
        const data = await response.json();
        if (data.success) {
            const headerLogo = data.data.header_logo || data.data.app_logo;
            
            const desktopLogoImg = document.getElementById('site-logo');
            if (desktopLogoImg && headerLogo) { 
                desktopLogoImg.src = headerLogo; 
                desktopLogoImg.style.display = 'block';
                desktopLogoImg.onerror = function() { 
                    this.style.display = 'none';
                };
            }
            
            const desktopHeaderLogo = document.getElementById('desktopHeaderLogo');
            if (desktopHeaderLogo && headerLogo) {
                desktopHeaderLogo.src = headerLogo;
                desktopHeaderLogo.style.display = 'block';
                desktopHeaderLogo.onerror = function() {
                    this.style.display = 'none';
                };
            }
            
            const mobileLogo = document.querySelector('.header-left img');
            if (mobileLogo && headerLogo) mobileLogo.src = headerLogo;
        }
    } catch (error) { console.error('Error fetching app settings:', error); }
}
    
    function loadProductDesktopCategories() {
        const navMenu = document.getElementById('productDesktopNavMenu');
        const popup = document.getElementById('productDesktopPopup');
        if (!navMenu) return;
        fetch(`${API_BASE_URL}/categories`).then(res => res.json()).then(data => {
            if (data.success) {
                const categories = data.data.slice(0, 5);
                navMenu.innerHTML = categories.map(cat => {

                let categorySlug = cat.name.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');

                let url = `/collection/${categorySlug}`;

                // Trending
                if (categorySlug === "trending") {
                    url = "/top-selling";
                }

                // Bestsellers
                if (categorySlug === "bestsellers") {
                    url = "/best-selling";
                }

                return `<a href="${url}"
                        class="nav-item"
                        data-cat-id="${cat.id}"
                        data-cat-name="${cat.name}">
                        ${cat.name.toUpperCase()}
                    </a>`;

            }).join('');              
                const navItems = document.querySelectorAll('#productDesktopNavMenu .nav-item');
                let hideTimeout;
                const showPopup = () => {
                    if (hideTimeout) clearTimeout(hideTimeout);
                    renderDesktopPopupContent(data.data);
                    popup.style.display = 'block';
                };
                const hidePopup = () => { hideTimeout = setTimeout(() => popup.style.display = 'none', 200); };
                navItems.forEach(item => {
                    item.addEventListener('mouseenter', showPopup);
                    item.addEventListener('mouseleave', hidePopup);
                });
                popup.addEventListener('mouseenter', () => { if (hideTimeout) clearTimeout(hideTimeout); popup.style.display = 'block'; });
                popup.addEventListener('mouseleave', hidePopup);
            }
        }).catch(err => console.error('Error loading categories:', err));
    }
    
    function renderDesktopPopupContent(categories) {
        const popup = document.getElementById('productDesktopPopup');
        if (!popup) return;
        const categoriesWithSub = categories.filter(cat => cat.children && cat.children.length > 0);
        const columnSize = Math.ceil(categoriesWithSub.length / 5);
        const columns = [];
        for (let i = 0; i < 5; i++) columns.push(categoriesWithSub.slice(i * columnSize, (i + 1) * columnSize));
        let html = `<div style="max-width:1200px; margin:0 auto; padding:30px; display:grid; grid-template-columns:repeat(5,1fr); gap:25px;">`;
        columns.forEach(col => {
            if (col.length) {
                html += `<div>`;
                col.forEach(cat => {
                    html += `<div style="margin-bottom:20px;"><h3 style="font-size:14px; font-weight:700; color:#282c3f; margin-bottom:12px; border-bottom:2px solid #ff3f6c; padding-bottom:6px; display:inline-block;">${cat.name}</h3><ul style="list-style:none; padding:0; margin-top:12px;">`;
                    if (cat.children && cat.children.length > 0) {
                        cat.children.slice(0, 6).forEach(sub => {
                            let subSlug = sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
html += `<li style="margin-bottom:8px;"><a href="/collection/${subSlug}" style="text-decoration:none; color:#696b79; font-size:13px;">${sub.name}</a></li>`;
                        });
                        if (cat.children.length > 6) html += `<li style="margin-top:5px;"><a href="/category/${cat.id}" style="color:#ff3f6c; font-size:11px; font-weight:600; text-decoration:none;">+${cat.children.length - 6} more →</a></li>`;
                    }
                    html += `</ul></div>`;
                });
                html += `</div>`;
            }
        });
        popup.innerHTML = html + `</div>`;
    }
        
    function renderProduct(product) {
        const container = document.getElementById('product-container');
        const galleryImages = product.gallery_images || [];
        currentImages = galleryImages.length ? galleryImages : (product.image_url ? [product.image_url] : []);
        if (!currentImages.length) currentImages = ['https://via.placeholder.com/400x600?text=No+Image'];
        
        const variants = product.variants || [];
        const colorMap = new Map();
        variants.forEach(v => {
            if (v.color && !colorMap.has(v.color)) {
                const colorName = v.color_name || getColorNameFromCode(v.color);
                colorMap.set(v.color, { color: v.color, name: colorName, image: v.image_url || product.image_url || currentImages[0] });
            }
        });
        allColors = Array.from(colorMap.values());
        if (!allColors.length) allColors = [{ color: '#000000', name: 'Black', image: product.image_url || currentImages[0] }];
        
        allSizes = [];
        variants.forEach(v => {
            if (v.variant_value) {
                let variantPrice = parseFloat(v.final_price) || parseFloat(v.price) || 0;
                if (!variantPrice) variantPrice = getProductPrice(product);
                allSizes.push({
                    id: v.id, type: v.variant_type || 'Size', value: v.variant_value,
                    price: parseFloat(v.price) || variantPrice, 
                    final_price: parseFloat(v.final_price) || variantPrice, 
                    stock: v.quantity || 5,
                    color: v.color, inStock: v.in_stock !== false
                });
            }
        });
        
        let displayPrice = getProductPrice(product);
let originalPrice = parseFloat(product.product_price || product.price || displayPrice);
if (product.variants && product.variants.length > 0) {
    let firstVariant = product.variants[0];
    if (firstVariant.price && parseFloat(firstVariant.price) > originalPrice) {
        originalPrice = parseFloat(firstVariant.price);
    }
}
let discountPercentage = originalPrice > displayPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0;
        const brand = product.brand || 'H&M';
        const name = product.name || 'Maxi Dress';
        const rating = 4.5;
        const reviewCount = 33;
        let starsHtml = '';
        let fullStars = Math.floor(rating);
        for (let i = 0; i < fullStars; i++) starsHtml += '★';
        for (let i = starsHtml.length; i < 5; i++) starsHtml += '☆';
        
        const descriptionPoints = [];
        if (product.style) descriptionPoints.push(`Style: ${product.style}`);
        if (product.neckline) descriptionPoints.push(`Neckline: ${product.neckline}`);
        if (product.length) descriptionPoints.push(`Length: ${product.length}`);
        if (product.fit) descriptionPoints.push(`Fit: ${product.fit}`);
        if (product.fabric) descriptionPoints.push(`Fabric: ${product.fabric}`);
        if (!descriptionPoints.length && product.description) {
            product.description.split('\n').forEach(line => {
                const cleanLine = line.replace(/^[•\s]*/, '').trim();
                if (cleanLine) descriptionPoints.push(cleanLine);
            });
        }
        if (!descriptionPoints.length) descriptionPoints.push('Style: Wrap Maxi Dress', 'Neckline: Square neckline', 'Length: Full length (Maxi)', 'Fit: Regular fit');
        
        let html = `
            <div class="pdp-header">
                <div class="pdp-header-left"><span class="back-btn" onclick="goBack()">←</span></div>
                <div class="pdp-header-right">
                    <button class="search-icon-btn" onclick="window.location.href='/search'"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/></svg></button>
                    <button class="wishlist-icon-btn" onclick="window.location.href='/wishlist'"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
                    <button class="cart-icon-btn" onclick="window.location.href='/cart'"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1H5L7.68 14.39 C7.77 14.85 8.02 15.26 8.39 15.56 C8.75 15.85 9.21 16.01 9.68 16 H19.4 C19.87 16.01 20.33 15.85 20.69 15.56 C21.06 15.26 21.31 14.85 21.4 14.39 L23 6H6"/><circle cx="9" cy="21" r="1.5"/><circle cx="20" cy="21" r="1.5"/></svg><span class="cart-badge">0</span></button>
                </div>
            </div>
            <div class="pdp-main">
                <div class="pdp-thumbnails">${currentImages.map((img, index) => `<img src="${img}" class="pdp-thumb" onclick="event.stopPropagation(); changeImage(${index})">`).join('')}</div>
                <div class="pdp-gallery" onclick="nextImage()">
                    <img src="${currentImages[0]}" class="pdp-main-image" id="mainImage">
                    ${discountPercentage > 20 ? '<span class="pdp-best-seller">Best Seller</span>' : ''}
                    <button class="pdp-wishlist ${wishlist.some(item => item.id == product.id) ? 'active' : ''}" onclick="toggleWishlist(this, event)"><svg class="wishlist-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
                    <span class="pdp-image-counter" id="currentImage">1/${currentImages.length}</span>
                </div>
                <div class="pdp-right">
                    <div class="pdp-info">
                        <div class="pdp-brand-row">
                            <span class="pdp-brand">${brand}</span>
                            <div class="pdp-header-circles">
                                ${allColors.slice(0, 4).map(c => `<span class="pdp-color-circle" style="background: ${c.color}; ${c.color.toLowerCase() === '#ffffff' ? 'border:1px solid #ddd' : ''}" onclick="selectColor(this, '${c.color}', '${c.image}', '${c.name}')" title="${c.name}"></span>`).join('')}
                                ${allColors.length > 4 ? `<span class="pdp-color-more" onclick="showColorPopup()">+${allColors.length - 4}</span>` : ''}
                            </div>
                        </div>
                        <div class="pdp-name-row"><span class="pdp-title">${name}</span><span class="pdp-color-count" onclick="showColorPopup()">${allColors.length} colors</span></div>
                      <div class="pdp-price"><span class="pdp-current-price" id="currentPrice">₹${displayPrice.toLocaleString('en-IN')}</span>${originalPrice > displayPrice ? `<span class="pdp-original-price">₹${originalPrice.toLocaleString('en-IN')}</span>` : ''}${discountPercentage > 0 ? `<span class="pdp-discount">${discountPercentage}% Off</span>` : ''}</div>
                    </div>
                    <div class="pdp-size">
                        <div class="pdp-size-header"><h3>${allSizes[0]?.type || 'Size'}</h3>${allSizes[0]?.type === 'Size' ? '<span class="pdp-size-chart" onclick="showSizeChart()">Size Chart ▾</span>' : ''}</div>
                        <div class="pdp-size-options">${[...new Map(allSizes.map(s => [s.value, s])).values()].map(s => `<button class="pdp-size-btn ${s.stock > 0 ? '' : 'disabled'}" data-variant-id="${s.id || ''}" data-price="${s.price}" onclick="selectVariant(this, '${s.price}', '${s.id || ''}', '${s.type || ''}')" ${s.stock > 0 ? '' : 'disabled'}>${s.value}</button>`).join('')}</div>
                        <div class="pdp-size-error" style="display: none;">Please select a size</div>
                    </div>
                    <div class="pdp-details pdp-details-desktop" id="productDetailsDesktop"></div>
                    <div class="pdp-actions">
                        <button class="pdp-add-to-cart" onclick="addToCartFromProduct()">Add to Cart</button>
                        <button class="pdp-buy-now" onclick="buyNow()">Buy at ₹<span id="buyPrice">${displayPrice.toLocaleString('en-IN')}</span></button>
                    </div>
                </div>
            </div>
            <div class="pdp-bottom">
                <div class="pdp-details"><h3>Product Details</h3><ul class="pdp-details-list">${descriptionPoints.map(point => `<li><span>•</span> <span>${point}</span></li>`).join('')}</ul></div>
                <div class="pdp-delivery"><h3>Delivery Details</h3>
                    <div class="pdp-pincode"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><input type="text" id="pincode" placeholder="Enter pincode" maxlength="6"><button onclick="checkPincode()">Check</button></div>
                    <div class="pdp-delivery-info" id="deliveryInfo"></div>
                    <div class="pdp-return"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke-linecap="round" stroke-linejoin="round"/></svg><span>7 Days Return & Exchange</span></div>
                    <div class="pdp-cod"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="7" cy="15" r="1.5" fill="currentColor"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/></svg><span>Cash on Delivery available</span></div>
                </div>
                <div class="pdp-offers"><h3>Offers and Discounts</h3><div id="offersContainer"></div></div>
                <div class="pdp-ratings"><h3>Ratings and Reviews</h3>
                    <div class="pdp-rating-summary"><span class="pdp-avg-rating">4.5</span><span class="pdp-stars">${starsHtml}</span><span class="pdp-total-ratings">33 Ratings</span></div>
                    <div id="currentReview"></div>
                    <div class="pdp-review-nav"><button onclick="prevReview()">‹</button><button onclick="nextReview()">›</button></div>
                </div>
                <div class="pdp-similar"><h3>Similar Styles</h3><div class="pdp-similar-grid" id="similarGrid"></div></div>
            </div>
        `;
        
        container.innerHTML = html;
        document.title = `${product.name} | MAHERA JEWEL`;

        let metaDesc = document.querySelector('meta[name="description"]');

        if (metaDesc) {
            metaDesc.setAttribute(
                'content',
                product.description
                    ? product.description.replace(/<[^>]*>/g, '').substring(0, 160)
                    : `Buy ${product.name} online at MAHERA JEWEL with best price and fast delivery`
            );
        }
        window.productVariants = allSizes;
        window.displayPrice = displayPrice;
        window.originalPrice = originalPrice;
        renderOffers();
        renderCurrentReview();
        fetchSimilarProducts();
        updateCartBadge();
        
        setTimeout(() => {
            if (window.innerWidth >= 1024) {
                const desktopDetails = document.getElementById('productDetailsDesktop');
                const mobileDetails = document.querySelector('.pdp-bottom .pdp-details');
                if (desktopDetails && mobileDetails) desktopDetails.innerHTML = mobileDetails.innerHTML;
            }
        }, 100);
        
        const lastPincode = localStorage.getItem('lastPincode');
        if (lastPincode) setTimeout(() => { document.getElementById('pincode').value = lastPincode; window.checkPincode(); }, 500);
    }
    
    function showError(message) {
        const container = document.getElementById('product-container');
        container.innerHTML = `<div class="error-container"><h2>${message}</h2><p>Please try again or browse other products.</p><a href="/landing" class="btn-home">Go to Homepage</a></div>`;
    }
        document.addEventListener('DOMContentLoaded', function() {
        updateCartBadge();
        fetchProduct();
        fetchAppSettingsForProductPage();
        setTimeout(() => loadProductDesktopCategories(), 500);
    });
})();

setTimeout(function() {
    let categories = ['Necklace', 'Earrings', 'Maang Tikka', 'Bridal Sets', 'Bangles'];
    let index = 0;
    let isRotating = false;
    let intervalId = null;
    const input = document.getElementById('web-search-input');
    
    if (!input) return;
    
    async function fetchCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/categories`);
            const data = await response.json();
            if (data.success && data.data.length > 0) {
                categories = data.data.map(cat => cat.name);
                if (!isRotating) startRotation();
            } else {
                if (!isRotating) startRotation();
            }
        } catch(e) {
            if (!isRotating) startRotation();
        }
    }
    
    function startRotation() {
        if (isRotating) return;
        isRotating = true;
        input.placeholder = 'Search for ' + categories[0];
        intervalId = setInterval(function() {
            input.placeholder = 'Search for ' + categories[index];
            index = (index + 1) % categories.length;
        }, 3000);
    }
    
    fetchCategories();
}, 2000);
window.loadSimilarHoverImage = function(imgElement) {
    if (imgElement.dataset.loading === 'true') return;
    
    const slug = imgElement.dataset.slug;
    if (!slug) return;
    
    const mainImage = imgElement.dataset.main;
    const hoverUrl = imgElement.dataset.hoverImage;
    
    if (hoverUrl && imgElement.src !== hoverUrl) {
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
// Product detail page - Search on Enter (Direct Search)
(function() {
    if (!document.body.classList.contains('product-detail-page')) return;
    
    setTimeout(function() {
        const input = document.getElementById('web-search-input');
        if (!input) return;
        
        let suggestionsBox = document.getElementById('web-search-suggestions');
        if (!suggestionsBox) {
            const parent = input.parentElement;
            const div = document.createElement('div');
            div.id = 'web-search-suggestions';
            div.className = 'web-search-suggestions';
            div.style.display = 'none';
            parent.appendChild(div);
            suggestionsBox = div;
        }
        
        let timer;
        
        const renderSuggestions = (products) => {
            let html = products.length ? 
                products.map(p => `<div class="web-suggestion-item" onclick="window.location.href='/product/${p.slug}'">${p.name}</div>`).join('') : 
                '<div class="web-suggestion-item">No results found</div>';
            suggestionsBox.innerHTML = html;
            suggestionsBox.style.display = 'block';
        };
        
        // 🔥 ENTER key - Direct search (NO redirect API)
        input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                const q = this.value.trim();
                if (q) {
                    window.location.href = `/products?search=${encodeURIComponent(q)}`;
                }
            }
        });
        
        // Suggestions
        input.addEventListener("input", async (e) => {
            clearTimeout(timer);
            const q = e.target.value.trim();
            
            if (q.length === 0) {
                suggestionsBox.style.display = 'none';
                suggestionsBox.innerHTML = '';
                return;
            }
            
            timer = setTimeout(async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/products/suggestions?q=${encodeURIComponent(q)}`);
                    const data = await res.json();
                    if (data.success) renderSuggestions(data.data.products || []);
                } catch(err) {}
            }, 200);
        });
        
        document.addEventListener("click", (e) => {
            if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.style.display = 'none';
            }
        });
    }, 500);
})();