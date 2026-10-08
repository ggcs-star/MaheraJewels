const API_BASE_URL = window.API_BASE_URL;
document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
    updateCartBadge();
    setupEventListeners();
});

window.addEventListener('storage', function(e) {
    if (e.key === 'token' || e.key === 'user') {
        console.log('🔄 Token changed, reloading profile...');
        initializeProfile();
        if (localStorage.getItem('token')) {
            loadUserStats();
        }
    }
});

function initializeProfile() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('profile-container');
    if (container) {
        container.innerHTML = '';
    }
    
    if (token) {
        validateAndLoadUserProfile();
    } else {
        showLoginPopup();
    }
}

async function validateAndLoadUserProfile() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('profile-container');
    if (!container) return;
    
    // console.log('🔄 Validating profile for token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    // container.innerHTML = '<div class="loading-spinner">Loading profile...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            cache: 'no-store'
        });
        
        const data = await response.json();
        
       if (response.ok && data.success && data.data) {
            renderProfile(data.data);
            loadUserStats();
        } else {
            localStorage.removeItem('token');
            showLoginPopup();
        }
        } catch (error) {
        console.error('Profile error:', error);
        localStorage.removeItem('token');
        showLoginPopup();
    }
}

function renderGuestProfile() {
    const container = document.getElementById('profile-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="profile-menu" style="margin-top: 20px;">
            <div class="menu-card">
                <h3>My Account</h3>
                <div class="menu-item" onclick="window.location.href='/login'">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Z"/>
                        <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke-linecap="round"/>
                    </svg>
                    <span>Sign In</span>
                    <span class="menu-arrow">›</span>
                </div>
                <div class="menu-item" onclick="window.location.href='/register'">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="8.5" cy="7" r="4"/>
                        <line x1="20" y1="8" x2="20" y2="14"/>
                        <line x1="23" y1="11" x2="17" y2="11"/>
                    </svg>
                    <span>Create Account</span>
                    <span class="menu-arrow">›</span>
                </div>
            </div>
            
            <div class="menu-card">
                <h3>Customer Care</h3>
                <div class="menu-item" onclick="window.location.href='/help/how-to-return'">
                    <span>How To Return</span>
                    <span class="menu-arrow">›</span>
                </div>
                <div class="menu-item" onclick="window.location.href='/help/terms'">
                    <span>Terms & Conditions</span>
                    <span class="menu-arrow">›</span>
                </div>
                <div class="menu-item" onclick="window.location.href='/help/privacy'">
                    <span>Privacy Policy</span>
                    <span class="menu-arrow">›</span>
                </div>
            </div>
        </div>
        
        <div class="promo-banner" onclick="window.location.href='/summer-sale'">
            <h4>🔥 Summer Sale Live!</h4>
            <p>Min 50% Off on Top Brands</p>
            <span class="shop-now">Shop Now →</span>
        </div>
    `;
}

async function loadUserStats() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const [ordersRes, wishlistRes] = await Promise.all([
            fetch(`${API_BASE_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/wishlist`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        const ordersData = await ordersRes.json();
        const wishlistData = await wishlistRes.json();
        
        updateStats({
            orders: ordersData.data?.length || 0,
            wishlist: wishlistData.data?.length || 0
        });
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStats(stats) {
    const statsContainer = document.querySelector('.profile-stats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stat-item" onclick="window.location.href='/orders'">
            <span class="stat-value">${stats.orders}</span>
            <span class="stat-label">Orders</span>
        </div>
        <div class="stat-item" onclick="window.location.href='/wishlist'">
            <span class="stat-value">${stats.wishlist}</span>
            <span class="stat-label">Wishlist</span>
        </div>
        <div class="stat-item" onclick="window.location.href='/coupons'">
            <span class="stat-value">0</span>
            <span class="stat-label">Coupons</span>
        </div>
    `;
}

function renderProfile(user) {
    const container = document.getElementById('profile-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    let profileImage = user.profile_image;
    
    if (profileImage && !profileImage.startsWith('http')) {
        profileImage = `https://inventorydata-s3-bucket.s3.amazonaws.com/${profileImage}`;
    }
    
    const html = `
        <div class="profile-header">
            <div class="profile-avatar" style="cursor: pointer; position: relative;">
    ${profileImage ? 
        `<img src="${profileImage}" alt="${user.name}" id="profileAvatarImg" style="width:100%; height:100%; border-radius:50%; object-fit:cover; border:3px solid #ff3f6c;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-initials\\'>${initials}</div>';">` : 
        `<div class="avatar-initials">${initials}</div>`
    }
    
    <input type="file" id="avatarUpload" accept="image/jpeg,image/jpg,image/png,image/webp" 
       style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; z-index: 999; cursor: pointer;">

    <div class="edit-avatar-btn" style="pointer-events: none;"> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
            <line x1="12" y1="9" x2="12" y2="17"/>
            <line x1="9" y1="12" x2="15" y2="12"/>
        </svg>
    </div>
</div>
            <div class="profile-info">
                <h2 class="profile-name">${escapeHtml(user.name) || 'User'}</h2>
                <p class="profile-email">${escapeHtml(user.email) || ''}</p>
                <p class="profile-phone">${escapeHtml(user.phone || user.mobile) || ''}</p>
                <div class="profile-actions">
                    <button class="edit-profile-btn" onclick="openEditProfile()">Edit Profile</button>
                    ${profileImage ? `<button class="remove-image-btn" onclick="removeProfileImage()">Remove Photo</button>` : ''}
                </div>
            </div>
        </div>
        
        <div class="profile-stats"></div>
        
        <div class="profile-menu">
            <div class="menu-card">
                <h3>My Orders</h3>
                <div class="menu-item" data-link="/orders">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>My Orders</span>
                    <span class="menu-arrow">›</span>
                </div>
                <div class="menu-item" onclick="return false;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>Return Creation Demo</span>
                    <span class="menu-arrow">›</span>
                </div>
            </div>
            
            <div class="menu-card">
                <h3>Customer Care</h3>
                <!--
                <div class="menu-item" onclick="return false;">
                    <span>How To Return</span>
                    <span class="menu-arrow">›</span>
                </div>
                <div class="menu-item" onclick="return false;">
                    <span>How Do I Redeem My Coupon?</span>
                    <span class="menu-arrow">›</span>
                </div>
                    -->
                <a href="/terms" class="menu-item" style="text-decoration: none; color: inherit; display: flex; justify-content: space-between; align-items: center;">
                    <span>Terms & Conditions</span>
                    <span class="menu-arrow">›</span>
                </a>
                <a href="/returns" class="menu-item" style="text-decoration: none; color: inherit; display: flex; justify-content: space-between; align-items: center;">
                    <span>Returns & Refund Policy</span>
                    <span class="menu-arrow">›</span>
                </a>
                <a href="/privacy-policy" class="menu-item" style="text-decoration: none; color: inherit; display: flex; justify-content: space-between; align-items: center;">
                    <span>Privacy Policy</span>
                    <span class="menu-arrow">›</span>
                </a>
                
                <div class="menu-item" onclick="return false;">
                    <span>Shipping Policy</span>
                    <span class="menu-arrow">›</span>
                </div>
                <div class="menu-item" onclick="return false;">
                    <span>Cancellation & Return Policy</span>
                    <span class="menu-arrow">›</span>
                </div>
                
                <div class="menu-item" onclick="return false;">
                    <span>FAQ</span>
                    <span class="menu-arrow">›</span>
                </div>
                
                <div class="menu-item logout-btn" onclick="handleLogout()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span>Logout</span>
                </div>
            </div>
            
            
        
        <div class="promo-banner" onclick="window.location.href='/summer-sale'">
            <h4>🔥 Summer Sale Live!</h4>
            <p>Min 50% Off on Top Brands</p>
            <span class="shop-now">Shop Now →</span>
        </div>
        
        <div class="version-info">Version 9.29.1 Build 3630</div>
    `;
    
    container.innerHTML = html;
    setTimeout(() => {
    const fileInput = document.getElementById('avatarUpload');
    if (fileInput) {
        fileInput.addEventListener('change', handleImageUpload);
        console.log("✅ File upload listener attached");
    }
}, 100);
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

function triggerImageUpload() {
    const fileInput = document.getElementById('avatarUpload');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
}

function handleImageUpload(event) {
    console.log('🚀 3. UPLOAD START: handleImageUpload function trigger ho gaya!');
    
    const file = event.target.files[0];
    
    if (!file) {
        console.warn('⚠️ CANCELLED: User ne gallery open ki par koi photo select nahi ki.');
        return;
    }
    
    console.log(`📁 4. FILE DETAILS - Name: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)} MB, Type: ${file.type}`);
    
    if (file.size > 2 * 1024 * 1024) {
        console.error('❌ ERROR: File 2MB se badi hai!');
        showToast('File size must be less than 2MB', 'error');
        return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        console.error(`❌ ERROR: Galat file format select hua hai -> ${file.type}`);
        showToast('Only JPG, PNG, WEBP allowed', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('profile_image', file);
    formData.append('_method', 'PUT');
    
    console.log(`🌐 5. API CALL: Photo API par bheji ja rahi hai... (${API_BASE_URL}/user/profile)`);
    
    fetch(`${API_BASE_URL}/user/profile`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(res => {
        console.log(`📡 6. API RESPONSE STATUS: ${res.status}`);
        return res.json();
    })
    .then(response => {
        console.log('📦 7. API FULL RESPONSE:', response);
        if (response.success) {
            console.log('✅ SUCCESS: Profile picture successfully update ho gayi!');
            validateAndLoadUserProfile();
            showToast('Profile picture updated!', 'success');
        } else {
            console.error('❌ API REJECTED:', response.message);
            showToast(response.message || 'Upload failed', 'error');
        }
    })
    .catch(err => {
        console.error('🔥 CRITICAL NETWORK ERROR:', err);
        showToast('Network error', 'error');
    });
}

function removeProfileImage() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    fetch(`${API_BASE_URL}/user/profile/image`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            validateAndLoadUserProfile();
            showToast('Profile picture removed', 'success');
        } else {
            showToast(response.message || 'Failed to remove', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Network error', 'error');
    });
}

function openEditProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please login first', 'error');
        return;
    }
    
    fetch(`${API_BASE_URL}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success && data.data) {
            const user = data.data;
            showEditModal(user);
        }
    });
}

function showEditModal(user) {
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    modal.innerHTML = `
        <div class="edit-modal-content" style="background: white; padding: 30px; border-radius: 16px; width: 90%; max-width: 400px;">
            <h3 style="margin-bottom: 20px; color: #282c3f;">Edit Profile</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Full Name <span style="color: var(--accent, #F4B94E);">*</span></label>
                <input type="text" id="edit-name" value="${escapeHtml(user.name || '')}" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                <div id="name-error" style="color: var(--accent, #F4B94E); font-size: 12px; margin-top: 5px; display: none;"></div>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Email Address <span style="color: var(--accent, #F4B94E);">*</span></label>
                <input type="email" id="edit-email" value="${escapeHtml(user.email || '')}" readonly style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #f5f5f5;">
                <div style="color: #999; font-size: 11px; margin-top: 5px;">Email cannot be changed</div>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Phone Number <span style="color: var(--accent, #F4B94E);">*</span></label>
                <input type="tel" id="edit-phone" value="${escapeHtml(user.phone || user.mobile || '')}" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px;">
                <div id="phone-error" style="color: var(--accent, #F4B94E); font-size: 12px; margin-top: 5px; display: none;"></div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="closeEditModal()" style="flex: 1; padding: 14px; background: #f5f5f5; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
                <button onclick="saveProfile()" style="flex: 1; padding: 14px; background: var(--accent, #F4B94E); color: var(--primary, #440C2C); border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Save Changes</button>            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeEditModal() {
    const modal = document.querySelector('.edit-modal');
    if (modal) modal.remove();
}

function saveProfile() {
    const nameInput = document.getElementById('edit-name');
    const phoneInput = document.getElementById('edit-phone');
    const name = nameInput?.value.trim() || '';
    const phone = phoneInput?.value.trim() || '';
    
    document.getElementById('name-error').style.display = 'none';
    document.getElementById('phone-error').style.display = 'none';
    
    let hasError = false;
    
    if (!name || name.length < 3) {
        document.getElementById('name-error').textContent = 'Name must be at least 3 characters';
        document.getElementById('name-error').style.display = 'block';
        hasError = true;
    }
    
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phone || !phoneRegex.test(phone)) {
        document.getElementById('phone-error').textContent = 'Enter a valid 10-digit mobile number';
        document.getElementById('phone-error').style.display = 'block';
        hasError = true;
    }
    
    if (hasError) return;
    
    closeEditModal();
    
    fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
        },
        body: JSON.stringify({ name, mobile: phone })
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            validateAndLoadUserProfile();
            showToast('Profile updated!', 'success');
        } else {
            showToast(response.message || 'Update failed', 'error');
        }
    })
    .catch(() => {
        showToast('Network error', 'error');
    });
}

function handleLogout() {
    const token = localStorage.getItem('token');
    if (token) {
        fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
    }
    
    localStorage.clear();
    sessionStorage.clear();
    
    window.dispatchEvent(new Event('storage'));
    
    window.location.href = '/';
}

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

function showToast(message, type) {
    const existing = document.querySelector('.toast-message');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ff3f6c' : '#333'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

function setupEventListeners() {
    const fileInput = document.getElementById('avatarUpload');
    if (fileInput) {
        fileInput.addEventListener('change', handleImageUpload);
    }
    
    window.addEventListener('storage', function(e) {
        if (e.key === 'cart') updateCartBadge();
        if (e.key === 'token') initializeProfile();
    });
    
    document.addEventListener('click', function(e) {
        const item = e.target.closest('.menu-item');
        if (item && item.dataset.link) {
            e.preventDefault();
            window.location.href = item.dataset.link;
        }
    });
}