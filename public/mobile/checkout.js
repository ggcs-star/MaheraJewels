const API_BASE_URL = window.API_BASE_URL;
let PAYMENT_IN_PROGRESS = false;
let PAYMENT_COMPLETED = false;

// ========== CHECKOUT PAGE - FIXED ==========
document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        sessionStorage.setItem('redirect_after_login', '/checkout/shipping');
        if (typeof showLoginPopup === 'function') {
            showLoginPopup();
        } else {
            window.location.href = '/login';
        }
        return;
    }

    // ✅ FIX: Preserve category_id from buy_now_product
    const buyNowProduct = sessionStorage.getItem('buy_now_product');

    if (buyNowProduct) {
        const product = JSON.parse(buyNowProduct);
        const cart = [{
            id: product.product_id,
            variantId: product.variant_id,
            quantity: 1,
            price: product.price,
            name: product.name,
            image: product.image,
            categoryId: product.category_id,        // ✅ ADDED
            subcategoryId: product.subcategory_id,  // ✅ ADDED
            brand: product.brand || '',
            slug: product.slug || ''
        }];
        localStorage.setItem('cart', JSON.stringify(cart));
        sessionStorage.removeItem('buy_now_product');
    }

    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];

    if (cartItems.length === 0) {
        alert('Your cart is empty. Please add items to continue.');
        window.location.href = '/';
        return;
    }

    syncCartWithServer().then(() => {
        loadCheckoutSummary();
        loadUserAddresses();
        loadAppliedCheckoutCoupon();
    });
    
});

// ========== SYNC CART WITH SERVER - FIXED ==========
async function syncCartWithServer() {
    const token = localStorage.getItem('token');
    const localCart = JSON.parse(localStorage.getItem('cart')) || [];

    if (localCart.length === 0) {
        return true;
    }

    try {
        const getRes = await fetch(`${API_BASE_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        const data = await getRes.json();
        const serverItems = data?.data?.items || [];

        for (const item of serverItems) {
            await fetch(`${API_BASE_URL}/cart/remove/${item.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
        }

        for (const item of localCart) {
            let variantId = item.variantId;
            
            if (!variantId || variantId === null || variantId === 'null') {
                variantId = item.id;
            }
            
            // ✅ FIX: Include category_id in payload
            const payload = {
                product_id: item.id,
                variant_id: variantId,
                quantity: item.quantity,
                price: Number(item.price) || Number(item.product_price) || 0,
                category_id: item.categoryId || item.category_id || null,  // ✅ ADDED
                subcategory_id: item.subcategoryId || item.subcategory_id || null  // ✅ ADDED
            };
            
            console.log('Syncing item with category:', payload);
            
            const addRes = await fetch(`${API_BASE_URL}/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ items: [payload] })
            });
            
            if (!addRes.ok) {
                console.error('Add failed for product', item.id);
                return false;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
    } catch (error) {
        console.warn('Cart sync failed', error);
        return false;
    }
}
function loadCheckoutSummary() {
    const summaryContainer = document.getElementById('checkout-summary');
    if (!summaryContainer) return;
    
    summaryContainer.innerHTML = '<div class="loading-spinner">Loading summary...</div>';
    
    let url = `${API_BASE_URL}/checkout/summary`;
    const couponCode = localStorage.getItem('applied_coupon');
    if (couponCode) {
        url += `?coupon_code=${encodeURIComponent(couponCode)}`;
    }
    
    console.log('Fetching summary from:', url);
    
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
        }
    })
    .then(res => res.json())
    .then(response => {
        console.log('Full checkout summary response:', response);
        
        if (response.success && response.data && response.data.cart) {
            renderCheckoutSummary(response.data.cart);
            
            // ✅ Check if coupon applied from server response
            if (response.data.cart.discount > 0) {
                const appliedCode = localStorage.getItem('applied_coupon');
                if (appliedCode) {
                    showAppliedCheckoutCoupon(appliedCode, response.data.cart.discount);
                }
            }
        } else {
            console.log('Response success false or no cart data');
            let localCart = JSON.parse(localStorage.getItem('cart')) || [];
            let localSubtotal = 0;
            for(let item of localCart) {
                let price = Number(item.product_price) || Number(item.price) || 0;
                localSubtotal += price * (item.quantity || 1);
            }
            
            let tax = response.data?.cart?.tax || 0;
            let shipping = response.data?.cart?.shipping || 0;
            let platformFee = response.data?.cart?.platform_fee || 0;
            let discount = parseFloat(localStorage.getItem('coupon_discount')) || 0; // ✅ Add this
            
            let total = localSubtotal + tax + shipping + platformFee - discount;
            
            summaryContainer.innerHTML = `
                <div class="order-details">
                    <h3 class="price-details-title">Price Details (${localCart.length} Items)</h3>
                    <div class="detail-row"><span>Product Price</span><span>₹${localSubtotal.toFixed(2)}</span></div>
                    ${discount > 0 ? `<div class="detail-row discount"><span>Coupon Discount</span><span>-₹${discount.toFixed(2)}</span></div>` : ''}
                    <div class="detail-row"><span>Tax (GST)</span><span>₹${tax.toFixed(2)}</span></div>
                    <div class="detail-row"><span>Delivery Fee</span><span>₹${shipping.toFixed(2)}</span></div>
                    <div class="detail-row"><span>Platform Fee</span><span>₹${platformFee.toFixed(2)}</span></div>
                    <div class="detail-row final-total"><span>Final Total</span><span>₹${total.toFixed(2)}</span></div>
                </div>
            `;
            
            summaryContainer.dataset.total = total;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        summaryContainer.innerHTML = '<div class="error-message">Failed to load summary</div>';
    });
}
function renderCheckoutSummary(cart) {
    const summaryContainer = document.getElementById('checkout-summary');
    if (!summaryContainer) return;

    const subtotal = parseFloat(cart.subtotal) || 0;
    const tax = parseFloat(cart.tax) || 0;
    const shipping = parseFloat(cart.shipping) || 0;
    const discount = parseFloat(cart.discount) || 0;
    const platformFee = parseFloat(cart.platform_fee) || 0;
    const total = parseFloat(cart.total) || 0;
    const itemsCount = cart.items_count || 0;

    let html = `
        <div class="order-details">
            <h3 class="price-details-title">Price Details (${itemsCount} Items)</h3>

            <div class="detail-row">
                <span>Product Price</span>
                <span>₹${subtotal.toFixed(2)}</span>
            </div>
    `;

    if (discount > 0) {
        html += `
            <div class="detail-row discount">
                <span>Product Discounts</span>
                <span>-₹${discount.toFixed(2)}</span>
            </div>
        `;
    }

    if (tax > 0) {
        html += `
            <div class="detail-row">
                <span>Tax (GST)</span>
                <span>₹${tax.toFixed(2)}</span>
            </div>
        `;
    }

    if (shipping > 0) {
        html += `
            <div class="detail-row">
                <span>Delivery Fee</span>
                <span>₹${shipping.toFixed(2)}</span>
            </div>
        `;
    } else {
        html += `
            <div class="detail-row">
                <span>Delivery Fee</span>
                <span class="free">FREE</span>
            </div>
        `;
    }
    
    if (platformFee > 0) {
        html += `
            <div class="detail-row">
                <span>Platform Fee</span>
                <span>₹${platformFee.toFixed(2)}</span>
            </div>
        `;
    }

    html += `
        <div class="detail-row final-total">
            <span>Final Total</span>
            <span>₹${total.toFixed(2)}</span>
        </div>
    `;

    if (discount > 0) {
        html += `
            <div class="total-savings">
                <span>🎉 Yay! Your total discount is ₹${discount.toFixed(2)}</span>
            </div>
        `;
    }

    summaryContainer.innerHTML = html;
    summaryContainer.dataset.total = total;
}
function loadUserAddresses() {
    const addressContainer = document.getElementById('shipping-addresses');
    if (!addressContainer) return;
    
    addressContainer.innerHTML = '<div class="loading-spinner">Loading addresses...</div>';
    
    fetch(`${API_BASE_URL}/user/addresses`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
        }
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            renderAddresses(response.data);
        } else {
            addressContainer.innerHTML = `
                <div class="error-message">
                    <p>Could not load addresses</p>
                    <button onclick="loadUserAddresses()" class="retry-btn">Try Again</button>
                </div>
            `;
        }
    })
    .catch(() => {
        addressContainer.innerHTML = `
            <div class="error-message">
                <p>Network error. Please check your connection.</p>
                <button onclick="loadUserAddresses()" class="retry-btn">Try Again</button>
            </div>
        `;
    });
}

function renderAddresses(responseData) {
    const addressContainer = document.getElementById('shipping-addresses');
    if (!addressContainer) return;
    
    let addresses = [];
    if (responseData && responseData.addresses) {
        addresses = responseData.addresses;
    } else if (Array.isArray(responseData)) {
        addresses = responseData;
    }
    
    const validAddresses = addresses.filter(addr => addr.id && addr.full_name);
    
    if (validAddresses.length === 0) {
        addressContainer.innerHTML = `
            <div class="no-addresses">
                <p>No saved addresses found</p>
                
            </div>
        `;
        return;
    }
    
    let html = '';
    validAddresses.forEach(address => {
        const isDefault = address.is_default === true;
        const defaultClass = isDefault ? 'default' : '';
        
        html += `
            <div class="address-card ${defaultClass}" data-address-id="${address.id}">
                <div class="address-radio" onclick="event.stopPropagation(); selectAddress(${address.id})">
                    <input type="radio" name="shipping_address" value="${address.id}" ${isDefault ? 'checked' : ''}>
                </div>
                <div class="address-details" onclick="selectAddress(${address.id})">
                    <div class="address-name">${escapeHtml(address.full_name) || ''}</div>
                    <div class="address-phone">${escapeHtml(address.phone) || ''}</div>
                    <div class="address-text">
                        ${escapeHtml(address.address_line_1) || ''}${address.address_line_2 ? ', ' + escapeHtml(address.address_line_2) : ''}, 
                        ${escapeHtml(address.city) || ''}, ${escapeHtml(address.state) || ''} - ${escapeHtml(address.postal_code) || ''}
                    </div>
                </div>
                <div class="address-actions" onclick="event.stopPropagation()">
                <button class="remove-address-btn" onclick="showConfirmModal(${address.id})" aria-label="Remove address">                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke-linecap="round"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    addressContainer.innerHTML = html;
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
async function removeAddress(addressId) {
    const token = localStorage.getItem('token');
    const btn = document.querySelector(`.remove-address-btn[onclick*="${addressId}"]`);
    const originalText = btn ? btn.innerText : 'Remove';
    if (btn) {
        btn.innerText = 'Removing...';
        btn.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/addresses/${addressId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast('Address removed successfully', 'success');
            loadUserAddresses();
        } else {
            showToast(data.message || 'Failed to remove address', 'error');
            if (btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error removing address:', error);
        showToast('Server error, please try again', 'error');
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}
function showAddAddressForm() {
    document.getElementById('shipping-section').style.display = 'none';
    document.getElementById('add-address-form').style.display = 'block';
}

function hideAddAddressForm() {
    document.getElementById('shipping-section').style.display = 'block';
    document.getElementById('add-address-form').style.display = 'none';
    clearValidationErrors();
}

function clearValidationErrors() {
    document.querySelectorAll('.error-text').forEach(el => el.remove());
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
}

function validateAddressForm(formData) {
    let errors = [];
    
    if (!formData.full_name || formData.full_name.trim() === '') {
        errors.push({ field: 'full_name', message: 'Please enter your full name' });
    } else if (formData.full_name.length < 3) {
        errors.push({ field: 'full_name', message: 'Name must be at least 3 characters' });
    }
    
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.phone) {
        errors.push({ field: 'phone', message: 'Please enter your phone number' });
    } else if (!phoneRegex.test(formData.phone)) {
        errors.push({ field: 'phone', message: 'Please enter a valid 10-digit mobile number' });
    }
    
    if (!formData.address_line_1 || formData.address_line_1.trim() === '') {
        errors.push({ field: 'address_line_1', message: 'Please enter your address' });
    }
    
    if (!formData.city || formData.city.trim() === '') {
        errors.push({ field: 'city', message: 'Please enter your city' });
    }
    
    if (!formData.state || formData.state.trim() === '') {
        errors.push({ field: 'state', message: 'Please enter your state' });
    }
    
    const pincodeRegex = /^\d{6}$/;
    if (!formData.postal_code) {
        errors.push({ field: 'postal_code', message: 'Please enter your postal code' });
    } else if (!pincodeRegex.test(formData.postal_code)) {
        errors.push({ field: 'postal_code', message: 'Please enter a valid 6-digit pincode' });
    }
    
    return errors;
}

function showValidationErrors(errors) {
    clearValidationErrors();
    
    errors.forEach(error => {
        const input = document.querySelector(`[name="${error.field}"]`);
        if (input) {
            input.classList.add('input-error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-text';
            errorDiv.textContent = error.message;
            input.parentNode.appendChild(errorDiv);
        }
    });
    
    const firstError = document.querySelector('.input-error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function saveNewAddress(event) {
    event.preventDefault();
    
    const form = document.getElementById('addressForm');
    const formData = {
        type: 'shipping',
        full_name: form.querySelector('[name="full_name"]').value.trim(),
        phone: form.querySelector('[name="phone"]').value.trim(),
        address_line_1: form.querySelector('[name="address_line_1"]').value.trim(),
        address_line_2: form.querySelector('[name="address_line_2"]').value.trim() || '',
        city: form.querySelector('[name="city"]').value.trim(),
        state: form.querySelector('[name="state"]').value.trim(),
        postal_code: form.querySelector('[name="postal_code"]').value.trim(),
        country: form.querySelector('[name="country"]').value.trim() || 'India',
        is_default: form.querySelector('[name="is_default"]')?.checked || false
    };
    
    const errors = validateAddressForm(formData);
    if (errors.length > 0) {
        showValidationErrors(errors);
        return;
    }
    
    const saveBtn = form.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = 'Saving...';
    saveBtn.disabled = true;
    
    fetch(`${API_BASE_URL}/user/addresses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            form.reset();
            hideAddAddressForm();
            loadUserAddresses();
            showToast('Address added successfully', 'success');
        } else {
            showToast(response.message || 'Could not save address', 'error');
        }
    })
    .catch(() => {
        showToast('Network error. Please try again.', 'error');
    })
    .finally(() => {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    });
}

function selectAddress(addressId) {
    document.querySelectorAll('input[name="shipping_address"]').forEach(radio => {
        if (radio.value == addressId) {
            radio.checked = true;
        }
    });
    
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/user/addresses/${addressId}/set-default`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.success) {
            loadUserAddresses();
        } else {
            console.error('Set default failed:', data.message);
        }
    })
    .catch(err => {
        console.error('Error setting default:', err);
        // Don't show toast, just log error
    });
}
function placeOrder() {
    const shippingAddress = document.querySelector(
        'input[name="shipping_address"]:checked'
    )?.value;

    if (!shippingAddress) {
        showToast('Please select a delivery address', 'error');
        return;
    }

    const placeOrderBtn = document.querySelector('.place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerText = 'Placing Order...';
    }

    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];

    const orderItems = cartItems.map(item => ({
        product_id: item.id,
        variant_id: item.variantId,
        product_name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image || '',
        mrp: item.mrp || item.originalPrice || item.price
    }));

    fetch(`${API_BASE_URL}/checkout/place-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            shipping_address_id: Number(shippingAddress),
            billing_address_id: Number(shippingAddress),
            payment_method_id: 1,
            coupon_code: localStorage.getItem('applied_coupon') || null,
            items: orderItems
        })
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            const orderData = {
                id: response.data.order.id,
                total: response.data.order.total,
                payment_status: response.data.order.payment_status || 'Paid',
                created_at: new Date().toISOString(),
                items: cartItems.map(item => ({
                    product_name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image,
                    product_id: item.id,
                    variant_id: item.variantId
                }))
            };
            
            const recentOrders = JSON.parse(localStorage.getItem('recent_orders') || '[]');
            recentOrders.unshift(orderData);
            if (recentOrders.length > 10) recentOrders.pop();
            localStorage.setItem('recent_orders', JSON.stringify(recentOrders));
            localStorage.setItem('last_order', JSON.stringify(orderData));
            localStorage.removeItem('cart');
            localStorage.removeItem('cart_synced');
            localStorage.removeItem('applied_coupon');
            localStorage.removeItem('coupon_discount');

            showToast('Order placed successfully', 'success');
            
            setTimeout(() => {
                window.location.replace(`/order-confirmation/${response.data.order.id}`);
            }, 1200);

        } else {
            PAYMENT_IN_PROGRESS = false;
            if (placeOrderBtn) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerText = 'PLACE ORDER';
            }
            showToast(response.message || 'Could not place order', 'error');
        }
    })
    .catch(err => {
        PAYMENT_IN_PROGRESS = false;
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerText = 'PLACE ORDER';
        }
        showToast('Network error. Please try again.', 'error');
    });
}

function getSelectedPaymentMethod() {
    const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
    
    if (paymentRadios.length > 0) {
        const selected = document.querySelector('input[name="payment_method"]:checked');
        if (!selected) return null;
        return selected.value === 'cod' ? 1 : 2;
    }
    
    return 1;
}

function handleCheckout() {
    if (PAYMENT_IN_PROGRESS || PAYMENT_COMPLETED) {
        showToast('Please wait, your order is being processed', 'info');
        return;
    }

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        showToast('Your cart is empty', 'info');
        return;
    }

    const selectedPaymentMethod = getSelectedPaymentMethod();

    if (selectedPaymentMethod === 1) {
        placeOrder();
    } else if (selectedPaymentMethod === 2) {
        startRazorpayPayment();
    } else {
        showToast('Please select a payment method', 'error');
    }
}

async function startRazorpayPayment() {
    if (PAYMENT_IN_PROGRESS || PAYMENT_COMPLETED) {
        showToast('Please wait, your order is being processed', 'info');
        return;
    }

    const shippingAddress = document.querySelector('input[name="shipping_address"]:checked')?.value;

    if (!shippingAddress) {
        showToast('Please select a delivery address', 'error');
        return;
    }

    PAYMENT_IN_PROGRESS = true;

    const payload = {
        shipping_address_id: Number(shippingAddress),
        billing_address_id: Number(shippingAddress),
        payment_method_id: 2,
        coupon_code: localStorage.getItem('applied_coupon') || null
    };

    console.log("=== Razorpay Create Order Debug ===");
    console.log("API URL:", `${API_BASE_URL}/checkout/razorpay/create-order`);
    console.log("Payload:", payload);

    try {
        const response = await fetch(`${API_BASE_URL}/checkout/razorpay/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log("Response Status:", response.status);
        console.log("Response OK:", response.ok);

        const text = await response.text();
        console.log("Raw Response:", text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("JSON parse error:", e);
            throw new Error("Invalid JSON response from server");
        }

        console.log("Parsed Response:", data);

        if (!response.ok || !data.success) {
            PAYMENT_IN_PROGRESS = false;
            console.error("Backend Error Message:", data.message);
            throw new Error(data.message || `Server error (${response.status})`);
        }

        console.log("Razorpay order created successfully");
        openRazorpay(data.data);

    } catch (err) {
        PAYMENT_IN_PROGRESS = false;
        console.error("=== Razorpay Error ===", err);
        showToast(err.message, 'error');
    }
}

function openRazorpay(data) {
    const options = {
        key: window.RAZORPAY_KEY_ID,
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        order_id: data.razorpay_order_id,
        name: 'MAHERA JEWEL',
        description: 'Order Payment',

        handler: function (response) {
            PAYMENT_COMPLETED = true;

            const btn = document.querySelector('.place-order-btn');
            if (btn) {
                btn.disabled = true;
                btn.innerText = 'Processing...';
            }

            verifyRazorpayPayment(response);
        }
    };

    const rzp = new Razorpay(options);
    rzp.open();
}

function verifyRazorpayPayment(response) {
    fetch(`${API_BASE_URL}/checkout/razorpay/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
        },
        body: JSON.stringify(response)
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            PAYMENT_COMPLETED = true;

            const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
            
            const orderData = {
                id: res.data.order_id,
                total: res.data.amount,
                payment_status: 'Paid',
                created_at: new Date().toISOString(),
                items: cartItems.map(item => ({
                    product_name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image || '',
                    product_id: item.id,
                    variant_id: item.variantId
                }))
            };
            
            const recentOrders = JSON.parse(localStorage.getItem('recent_orders') || '[]');
            recentOrders.unshift(orderData);
            if (recentOrders.length > 10) recentOrders.pop();
            localStorage.setItem('recent_orders', JSON.stringify(recentOrders));
            localStorage.setItem('last_order', JSON.stringify(orderData));

            localStorage.removeItem('cart');
            localStorage.removeItem('cart_synced');
            localStorage.removeItem('applied_coupon');
            localStorage.removeItem('coupon_discount');

             window.location.replace(`/order-confirmation/${res.data.order_id}`);
            return;
        }

        PAYMENT_IN_PROGRESS = false;
        showToast(res.message || 'Payment could not be verified', 'error');
    })
    .catch(() => {
        PAYMENT_IN_PROGRESS = false;
        showToast('Network error during verification', 'error');
    });
}

function showToast(message, type) {
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function applyCoupon() {
    const input = document.getElementById('coupon-code-input');
    const code = input?.value.trim().toUpperCase();
    
    if (!code) {
        showToast('Please enter a coupon code', 'error');
        return;
    }
    
    localStorage.setItem('applied_coupon', code);
    loadCheckoutSummary();
    input.value = '';
}

function removeCoupon() {
    localStorage.removeItem('applied_coupon');
    localStorage.removeItem('coupon_discount');
    loadCheckoutSummary();
    showToast('Coupon removed', 'info');
}
let pendingAddressId = null;

function showConfirmModal(addressId) {
    pendingAddressId = addressId;
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        pendingAddressId = null;
    }
}

function confirmRemoveAddress() {
    if (pendingAddressId) {
        removeAddress(pendingAddressId);
        closeConfirmModal();
    }
}
function renderCheckoutSummary(cart) {
    const summaryContainer = document.getElementById('checkout-summary');
    if (!summaryContainer) return;

    const subtotal = parseFloat(cart.subtotal) || 0;
    const tax = parseFloat(cart.tax) || 0;
    const shipping = parseFloat(cart.shipping) || 0;
    const discount = parseFloat(cart.discount) || 0;
    const platformFee = parseFloat(cart.platform_fee) || 0;
    const total = parseFloat(cart.total) || 0;
    const itemsCount = cart.items_count || 0;

    let html = `
        <div class="order-details">
            <h3 class="price-details-title">Price Details (${itemsCount} Items)</h3>
            <div class="detail-row">
                <span>Product Price</span>
                <span>₹${subtotal.toFixed(2)}</span>
            </div>
    `;

    if (discount > 0) {
        html += `
            <div class="detail-row discount">
                <span>Coupon Discount</span>
                <span>-₹${discount.toFixed(2)}</span>
            </div>
        `;
    }

    if (tax > 0) {
        html += `
            <div class="detail-row">
                <span>Tax (GST)</span>
                <span>₹${tax.toFixed(2)}</span>
            </div>
        `;
    }

    if (shipping > 0) {
        html += `
            <div class="detail-row">
                <span>Delivery Fee</span>
                <span>₹${shipping.toFixed(2)}</span>
            </div>
        `;
    } else {
        html += `
            <div class="detail-row">
                <span>Delivery Fee</span>
                <span class="free">FREE</span>
            </div>
        `;
    }
    
    if (platformFee > 0) {
        html += `
            <div class="detail-row">
                <span>Platform Fee</span>
                <span>₹${platformFee.toFixed(2)}</span>
            </div>
        `;
    }

    html += `
        <div class="detail-row final-total">
            <span>Final Total</span>
            <span>₹${total.toFixed(2)}</span>
        </div>
    `;

    if (discount > 0) {
        html += `
            <div class="total-savings">
                <span>🎉 Yay! Your total discount is ₹${discount.toFixed(2)}</span>
            </div>
        `;
    }

    summaryContainer.innerHTML = html;
    summaryContainer.dataset.total = total;
}
// ========== CHECKOUT COUPON FUNCTIONS ==========

let allCoupons = [];

function toggleCouponSection() {
    const body = document.getElementById('checkoutCouponBody');
    const btn = document.querySelector('.coupon-toggle-btn');
    
    if (body.style.display === 'none' || body.style.display === '') {
        body.style.display = 'block';
        btn.textContent = 'Hide ▲';
        loadCheckoutCoupons();
    } else {
        body.style.display = 'none';
        btn.textContent = 'Apply Coupon ▼';
    }
}

function toggleAvailableCoupons() {
    const list = document.getElementById('checkoutCouponList');
    const link = document.querySelector('.coupon-toggle-link');
    
    if (list.style.display === 'none' || list.style.display === '') {
        list.style.display = 'block';
        link.textContent = 'Hide Available Coupons ▲';
        loadCheckoutCoupons();
    } else {
        list.style.display = 'none';
        link.textContent = 'View Available Coupons ▼';
    }
}

function loadCheckoutCoupons() {
    const list = document.getElementById('checkoutCouponList');
    if (!list) return;
    
    list.innerHTML = '<div class="loading-coupons">Loading coupons...</div>';
    
    fetch(`${API_BASE_URL}/coupons`, {
        headers: { 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(response => {
        if (response.success && response.data?.length) {
            allCoupons = response.data;
            renderCheckoutCoupons(response.data);
        } else {
            list.innerHTML = '<div class="no-coupons">No coupons available</div>';
        }
    })
    .catch(err => {
        console.error('Error loading coupons:', err);
        list.innerHTML = '<div class="no-coupons">Failed to load coupons</div>';
    });
}

function renderCheckoutCoupons(coupons) {
    const list = document.getElementById('checkoutCouponList');
    if (!list) return;
    
    // Get current cart total from summary
    const summaryContainer = document.getElementById('checkout-summary');
    const totalMatch = summaryContainer?.innerHTML?.match(/₹([\d.]+)/);
    const cartTotal = totalMatch ? parseFloat(totalMatch[1]) : 0;
    
    if (cartTotal === 0) {
        list.innerHTML = '<div class="no-coupons">Add items to see applicable coupons</div>';
        return;
    }
    
    const applicableCoupons = coupons.filter(c => 
        cartTotal >= (c.min_order_amount ? parseFloat(c.min_order_amount) : 0)
    );
    
    if (!applicableCoupons.length) {
        list.innerHTML = '<div class="no-coupons">No applicable coupons for this order</div>';
        return;
    }
    
    // Filter out BANK coupons
    const normalCoupons = applicableCoupons.filter(c => c.coupon_type !== 'BANK');
    
    if (!normalCoupons.length) {
        list.innerHTML = '<div class="no-coupons">No normal coupons available. Bank offers can be applied during payment.</div>';
        return;
    }
    
    let html = '<div class="coupon-stickers-row">';
    normalCoupons.forEach(coupon => {
        const valueText = coupon.discount_type === 'PERCENT' ? `${coupon.value}%` : `₹${coupon.value}`;
        const isApplied = localStorage.getItem('applied_coupon') === coupon.code;
        
        html += `
            <div class="coupon-sticker ${isApplied ? 'applied' : ''}" 
                 onclick="applyCheckoutCoupon('${coupon.code}')"
                 style="${isApplied ? 'border-color: #2e7d32; background: #e8f5e9;' : ''}">
                <span class="code">${coupon.code}</span>
                <span class="value">${valueText}</span>
                ${isApplied ? ' ✅' : ''}
            </div>
        `;
    });
    html += '</div>';
    
    list.innerHTML = html;
}

// ========== APPLY COUPON - FIXED ==========
function applyCheckoutCoupon(couponCode = null) {
    const input = document.getElementById('checkoutCouponInput');
    const code = couponCode || input?.value?.trim()?.toUpperCase();
    
    if (!code) {
        showToast('Please enter a coupon code', 'error');
        return;
    }
    
    // Check if it's a BANK coupon
    const coupon = allCoupons.find(c => c.code === code);
    if (coupon?.coupon_type === 'BANK') {
        showToast('This is a bank offer. It will be applied during payment.', 'info');
        return;
    }
    
    // Get cart total from summary
    const summaryContainer = document.getElementById('checkout-summary');
    const totalMatch = summaryContainer?.innerHTML?.match(/₹([\d.]+)/);
    const cartTotal = totalMatch ? parseFloat(totalMatch[1]) : 0;
    
    // Get cart items with proper category data
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (!cart.length) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    const firstItem = cart[0];
    
    // ✅ FIX: Get category_id from cart item, with fallback to fetch from server
    let categoryId = firstItem.categoryId || firstItem.category_id || null;
    let subcategoryId = firstItem.subcategoryId || firstItem.subcategory_id || null;
    
    // ✅ FIX: If categoryId is still null, try to fetch from server
    if (!categoryId) {
        // Try to get from product data
        const productId = firstItem.id;
        // For Buy Now, it should already be in the cart item
        // If not, we'll use a fallback
        console.warn('Category ID missing for product:', productId);
        // Show error to user
        showToast('Product category not found. Please try again.', 'error');
        return;
    }
    
    // Show loading
    const applyBtn = document.querySelector('.apply-coupon-btn');
    const originalText = applyBtn?.innerHTML || 'Apply';
    if (applyBtn) {
        applyBtn.innerHTML = 'Applying...';
        applyBtn.disabled = true;
    }
    
    // ✅ FIX: Include bank_id and card_type if available
    const bankId = document.getElementById('bank-select')?.value || null;
    const cardType = document.querySelector('input[name="card_type"]:checked')?.value || null;
    
    const requestData = {
        coupon_code: code,
        cart_total: cartTotal,
        product_id: firstItem.id,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        bank_id: bankId,
        card_type: cardType
    };
    
    console.log('Applying coupon with data:', requestData);
    
    fetch(`${API_BASE_URL}/coupons/apply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            // Store in localStorage
            localStorage.setItem('applied_coupon', response.data.coupon_code);
            localStorage.setItem('coupon_discount', response.data.discount);
            
            // Show applied coupon
            showAppliedCheckoutCoupon(response.data.coupon_code, response.data.discount);
            
            // Update summary
            loadCheckoutSummary();
            
            // Show success
            showToast(`Coupon ${response.data.coupon_code} applied! You saved ₹${response.data.discount.toFixed(2)}`, 'success');
            
            // Clear input
            if (input) input.value = '';
            
            // Refresh coupon list
            loadCheckoutCoupons();
            
        } else {
            showToast(response.message || 'Failed to apply coupon', 'error');
        }
    })
    .catch(err => {
        console.error('Error applying coupon:', err);
        showToast('Error applying coupon. Please try again.', 'error');
    })
    .finally(() => {
        if (applyBtn) {
            applyBtn.innerHTML = originalText;
            applyBtn.disabled = false;
        }
    });
}

function showAppliedCheckoutCoupon(code, discount) {
    const appliedDiv = document.getElementById('appliedCoupon');
    const codeSpan = document.getElementById('appliedCouponCode');
    
    if (appliedDiv && codeSpan) {
        codeSpan.textContent = `${code} • -₹${parseFloat(discount).toFixed(2)}`;
        appliedDiv.style.display = 'flex';
    }
}

function removeCheckoutCoupon() {
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE_URL}/coupons/remove`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(() => {
        localStorage.removeItem('applied_coupon');
        localStorage.removeItem('coupon_discount');
        
        document.getElementById('appliedCoupon').style.display = 'none';
        loadCheckoutSummary();
        loadCheckoutCoupons();
        showToast('Coupon removed', 'info');
    })
    .catch(err => {
        console.error('Error removing coupon:', err);
        showToast('Error removing coupon', 'error');
    });
}

function loadAppliedCheckoutCoupon() {
    const code = localStorage.getItem('applied_coupon');
    const discount = localStorage.getItem('coupon_discount');
    
    if (code && discount) {
        showAppliedCheckoutCoupon(code, parseFloat(discount));
        
        // Auto-expand coupon section
        const body = document.getElementById('checkoutCouponBody');
        const btn = document.querySelector('.coupon-toggle-btn');
        if (body && (body.style.display === 'none' || body.style.display === '')) {
            body.style.display = 'block';
            if (btn) btn.textContent = 'Hide ▲';
        }
    }
}