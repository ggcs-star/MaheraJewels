<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>Checkout | MAHERA JEWEL</title>
    <meta name="robots" content="noindex,nofollow">
    <link rel="icon" type="image/jpeg" href="{{ asset('images/mjlogo.jpeg') }}">
    <link rel="stylesheet" href="{{ asset('mobile/style.css') }}">
    <link rel="stylesheet" href="{{ asset('mobile/checkout.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="checkout-page">
<header class="site-header" id="site-header"></header>
<main class="checkout-content">
    <div class="checkout-container">
        <h1 class="page-title">Checkout</h1>
        <div class="checkout-progress">
            <div class="progress-step active">
                <span class="step-number">1</span>
                <span class="step-label">Address</span>
            </div>
            <div class="progress-line"></div>
            <div class="progress-step">
                <span class="step-number">2</span>
                <span class="step-label">Payment</span>
            </div>
            <div class="progress-line"></div>
            <div class="progress-step">
                <span class="step-number">3</span>
                <span class="step-label">Review</span>
            </div>
        </div>
        <div class="checkout-grid">
            <div class="checkout-left">
                <div class="checkout-section" id="shipping-section">
                    <div class="section-header">
                        <h2>1. Delivery Address</h2>
                        <button class="add-address-btn" onclick="showAddAddressForm()">+ Add New</button>
                    </div>
                    <div id="shipping-addresses" class="address-list">
                        <div class="loading-spinner">Loading addresses...</div>
                    </div>
                </div>
                <div class="checkout-section" id="add-address-form" style="display: none;">
                    <!-- <h2>Add New Address</h2> -->
                    <form id="addressForm" onsubmit="saveNewAddress(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" name="full_name" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Phone Number</label>
                                <input type="tel" name="phone" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Address Line 1</label>
                                <input type="text" name="address_line_1" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Address Line 2 (Optional)</label>
                                <input type="text" name="address_line_2">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group half">
                                <label>City</label>
                                <input type="text" name="city" required>
                            </div>
                            <div class="form-group half">
                                <label>State</label>
                                <input type="text" name="state" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group half">
                                <label>Postal Code</label>
                                <input type="text" name="postal_code" required>
                            </div>
                            <div class="form-group half">
                                <label>Country</label>
                                <input type="text" name="country" value="India" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <label class="checkbox-label">
                                <input type="checkbox" name="is_default" value="1">
                                Set as default address
                            </label>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="cancel-btn" onclick="hideAddAddressForm()">Cancel</button>
                            <button type="submit" class="save-btn">Save Address</button>
                        </div>
                    </form>
                </div>
                   <div class="checkout-section payment-methods-section">
                    <h2>2. Payment Method</h2>
                    <div class="payment-options">
                        <!-- <label class="payment-option">
                            <input type="radio" name="payment_method" value="cod" checked>
                            <span>Cash on Delivery</span>
                        </label> -->
                        <label class="payment-option">
                            <input type="radio" name="payment_method" value="razorpay" checked>
                            <span>Pay Online (Razorpay)</span>
                        </label>
                    </div>
                </div>
                
            </div> 
            
            <div class="checkout-right">
                <!-- Order Summary Card ke andar, place-order-btn se pehle -->
<div class="order-summary-card">
    <h2>Order Summary</h2>
    <div id="checkout-summary">
        <div class="loading-spinner">Loading summary...</div>
    </div>
    
    <!-- ✅ COUPON SECTION ADD KARO -->
    <div class="coupon-section">
        <div class="coupon-header" onclick="toggleCouponSection()">
            <span>🎫 Have a coupon?</span>
            <span class="coupon-toggle-btn">Apply Coupon ▼</span>
        </div>
        
        <div class="coupon-body" id="checkoutCouponBody" style="display:none;">
            <!-- Applied Coupon Display -->
            <div class="applied-coupon" id="appliedCoupon" style="display:none;">
                <span>✅ Coupon Applied: <strong id="appliedCouponCode"></strong></span>
                <button class="remove-coupon-btn" onclick="removeCheckoutCoupon()">✕</button>
            </div>
            
            <!-- Coupon Input -->
            <div class="coupon-input-wrapper">
                <input type="text" id="checkoutCouponInput" placeholder="Enter coupon code" class="coupon-input">
                <button class="apply-coupon-btn" onclick="applyCheckoutCoupon()">Apply</button>
            </div>
            
            <!-- Available Coupons -->
          
        </div>
    </div>
    
    <button class="place-order-btn" onclick="handleCheckout()">PLACE ORDER</button>
</div>
            </div>
        </div>
            </div>
        </div>
    </div>
</main>
@include('components.footer')
<nav class="mobile-bottom-nav" id="mobile-bottom-nav"></nav>

<script>
    window.RAZORPAY_KEY_ID = "{{ config('services.razorpay.key') }}";
    console.log('Frontend Razorpay key:', window.RAZORPAY_KEY_ID);
</script>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
    window.API_BASE_URL = "{{ env('API_BASE_URL') }}";
</script>
<script src="{{ asset('mobile/script.js') }}"></script>
<script src="{{ asset('mobile/checkout.js') }}"></script>
<div id="confirmModal" class="confirm-modal" style="display: none;">
    <div class="confirm-modal-overlay"></div>
    <div class="confirm-modal-content">
        <div class="confirm-modal-icon">🗑️</div>
        <h3>Remove Address</h3>
        <p>Are you sure you want to remove this address?</p>
        <div class="confirm-modal-buttons">
            <button class="confirm-modal-cancel" onclick="closeConfirmModal()">Cancel</button>
            <button class="confirm-modal-confirm" onclick="confirmRemoveAddress()">Remove</button>
        </div>
    </div>
</div>
@include('mobile.auth.auth')

</body>
</html>