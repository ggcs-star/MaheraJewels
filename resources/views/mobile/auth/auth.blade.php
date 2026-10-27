
<script>
window.API_BASE_URL = "{{ env('API_BASE_URL') }}";
const BASE_URL = window.API_BASE_URL;
let timerInterval = null;

// ========== TOGGLE PASSWORD (ORIGINAL SVG) ==========
function togglePassword(inputId, element) {
    const input = document.getElementById(inputId);
    if(input.type === 'password') {
        input.type = 'text';
        element.classList.add('active');
    } else {
        input.type = 'password';
        element.classList.remove('active');
    }
}

// ========== SHOW POPUP MESSAGE (UI MEIN DIKHEGA) ==========
function showPopupMessage(containerId, message, type) {
    const container = document.getElementById(containerId);
    if(!container) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `popup-msg popup-msg-${type}`;
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
        padding: 12px 14px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 14px;
        background: ${type === 'error' ? '#fee2e2' : '#dcfce7'} !important;
        color: ${type === 'error' ? '#b91c1c' : '#166534'} !important;
        border: 1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'} !important;

    `;
    container.innerHTML = '';
    container.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 5000);
}

// ========== VERIFY OTP POPUP ==========
function showVerifyPopup(email, isReset) {
    let popup = document.getElementById('auth-popup');
    if(popup) popup.remove();
    
    const html = `
    <div id="auth-popup" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif;">
        <div style="background:white; width:90%; max-width:1000px; border-radius:28px; overflow:hidden; display:flex; flex-wrap:wrap; position:relative;">
            <span onclick="document.getElementById('auth-popup').remove()" style="position:absolute; top:16px; right:20px; font-size:28px; cursor:pointer; background:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.1);">&times;</span>
            <div style="flex:1; min-width:280px; background:url('{{ asset("images/jewel.png") }}') center center/cover no-repeat; position:relative; min-height:450px;">
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(135deg, rgba(68,12,44,0.7), rgba(68,12,44,0.85));"></div>
                <div style="position:relative; z-index:2; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; padding:40px; color:white; text-align:center;">
                    <h1 style="font-size:42px; font-weight:800;">Verify OTP</h1>
                    <p style="font-size:18px;">Enter the 6-digit verification code</p>
                </div>
            </div>
            <div style="flex:1; min-width:300px; padding:45px 40px; background:white;">
                <div style="max-width:340px; margin:0 auto;">
                    <div id="verify-msg-container"></div>
                    <h2 style="color:#440C2C; font-size:28px; text-align:center;">Email Verification</h2>
                    <p style="color:#666; text-align:center; margin-bottom:20px;">We've sent a code to ${email}</p>
                    <input type="text" id="otp-code" maxlength="6" placeholder="Enter 6-digit OTP" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd; font-size:18px; text-align:center; letter-spacing:6px; margin-bottom:15px;">
                    <div id="timerDiv" style="font-size:13px; color:#6b7280; margin-bottom:20px; text-align:center;">Code valid for 5:00</div>
                    <button id="verifyOtpBtn" style="width:100%; background:#440C2C; color:white; padding:15px; border:none; border-radius:12px; cursor:pointer; font-weight:600;">Verify & Continue</button>
                    <div style="text-align:center; margin-top:15px;">
                        <a href="javascript:void(0)" id="resendOtpLink" style="color:#F4B94E;">Didn't receive code? Resend OTP</a>
                    </div>
                    <div style="text-align:center; margin-top:15px;">
                        <a href="javascript:void(0)" onclick="showLoginPopup()" style="color:#F4B94E;">← Back to Login</a>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    const timerDiv = document.getElementById('timerDiv');
    let seconds = 300;
    if(timerDiv) {
        if(timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timerDiv.textContent = `Code valid for ${mins}:${secs < 10 ? '0' : ''}${secs}`;
            if(seconds <= 0) {
                clearInterval(timerInterval);
                timerDiv.textContent = "Code expired. Please resend OTP.";
            }
            seconds--;
        }, 1000);
    }
    
    document.getElementById('verifyOtpBtn')?.addEventListener('click', async () => {
        const otp = document.getElementById('otp-code').value.trim();
        if(otp.length !== 6) {
            showPopupMessage('verify-msg-container', 'Please enter valid 6-digit OTP', 'error');
            return;
        }
        
        try {
            const endpoint = isReset ? "/user/verify-reset-otp" : "/user/verify-email-otp";
            const res = await fetch(BASE_URL + endpoint, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if(res.ok && data.success) {
                showPopupMessage('verify-msg-container', 'Verified successfully!', 'success');
                setTimeout(() => {
                    document.getElementById('auth-popup').remove();
                    if(isReset) {
                        showResetPasswordPopup(email, otp);
                    } else {
                        localStorage.removeItem('verify_email');
                        showLoginPopup();
                    }
                }, 1500);
            } else {
                showPopupMessage('verify-msg-container', data.message || 'Invalid OTP', 'error');
            }
        } catch(err) { showPopupMessage('verify-msg-container', 'Server error', 'error'); }
    });
    
    document.getElementById('resendOtpLink')?.addEventListener('click', async () => {
        try {
            const endpoint = isReset ? "/user/forgot-password" : "/user/resend-email-otp";
            const res = await fetch(BASE_URL + endpoint, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if(res.ok) {
                showPopupMessage('verify-msg-container', 'OTP resent successfully!', 'success');
                seconds = 300;
            } else {
                showPopupMessage('verify-msg-container', data.message || 'Failed to resend OTP', 'error');
            }
        } catch(err) { showPopupMessage('verify-msg-container', 'Server error', 'error'); }
    });
}

// ========== RESET PASSWORD POPUP ==========
function showResetPasswordPopup(email, otp) {
    let popup = document.getElementById('auth-popup');
    if(popup) popup.remove();
    
    const html = `
    <div id="auth-popup" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif;">
        <div style="background:white; width:90%; max-width:1000px; border-radius:28px; overflow:hidden; display:flex; flex-wrap:wrap; position:relative;">
            <span onclick="document.getElementById('auth-popup').remove()" style="position:absolute; top:16px; right:20px; font-size:28px; cursor:pointer; background:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&times;</span>
            <div style="flex:1; min-width:280px; background:url('{{ asset("images/jewel.png") }}') center center/cover no-repeat; position:relative; min-height:450px;">
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(135deg, rgba(68,12,44,0.7), rgba(68,12,44,0.85));"></div>
                <div style="position:relative; z-index:2; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; padding:40px; color:white; text-align:center;">
                    <h1 style="font-size:42px; font-weight:800;">Reset Password</h1>
                    <p style="font-size:18px;">Create a new password for your account</p>
                </div>
            </div>
            <div style="flex:1; min-width:300px; padding:45px 40px; background:white;">
                <div style="max-width:340px; margin:0 auto;">
                    <div id="reset-msg-container"></div>
                    <h2 style="color:#440C2C; font-size:28px; text-align:center;">New Password</h2>
                    <p style="color:#666; text-align:center; margin-bottom:28px;">Enter your new password below</p>
                    
                    <div style="margin-bottom:15px;">
                        <label style="font-weight:600; font-size:13px;">New Password</label>
                        <div class="password-wrapper" style="position:relative;">
                            <input type="password" id="reset-password" placeholder="Enter new password" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd; padding-right:45px;">
                            <span class="toggle-password" onclick="togglePassword('reset-password', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer;">
                                <svg class="eye-icon open-eye" viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
                                </svg>
                                <svg class="eye-icon closed-eye" viewBox="0 0 24 24" width="20" height="20" style="display:none;">
                                    <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="font-weight:600; font-size:13px;">Confirm Password</label>
                        <div class="password-wrapper" style="position:relative;">
                            <input type="password" id="reset-password-confirm" placeholder="Confirm new password" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd; padding-right:45px;">
                            <span class="toggle-password" onclick="togglePassword('reset-password-confirm', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer;">
                                <svg class="eye-icon open-eye" viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
                                </svg>
                                <svg class="eye-icon closed-eye" viewBox="0 0 24 24" width="20" height="20" style="display:none;">
                                    <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </span>
                        </div>
                    </div>
                    
                    <button id="resetPasswordBtn" style="width:100%; background:#440C2C; color:white; padding:15px; border:none; border-radius:12px; cursor:pointer; font-weight:600;">Reset Password</button>
                    <div style="text-align:center; margin-top:15px;">
                        <a href="javascript:void(0)" onclick="showLoginPopup()" style="color:#F4B94E;">Back to Login</a>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    document.getElementById('resetPasswordBtn')?.addEventListener('click', async () => {
        const password = document.getElementById('reset-password').value;
        const confirm = document.getElementById('reset-password-confirm').value;
        
        if(!password || !confirm) { showPopupMessage('reset-msg-container', 'Please fill all fields', 'error'); return; }
        if(password !== confirm) { showPopupMessage('reset-msg-container', 'Passwords do not match', 'error'); return; }
        if(password.length < 8) { showPopupMessage('reset-msg-container', 'Password must be at least 8 characters', 'error'); return; }
        
        try {
            const res = await fetch(BASE_URL + "/user/reset-password", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ email, otp, password, password_confirmation: confirm })
            });
            const data = await res.json();
            if(res.ok && data.success) {
                showPopupMessage('reset-msg-container', 'Password reset successfully!', 'success');
                setTimeout(() => {
                    document.getElementById('auth-popup').remove();
                    showLoginPopup();
                }, 1500);
            } else {
                showPopupMessage('reset-msg-container', data.message || 'Failed to reset password', 'error');
            }
        
            } catch (err) {
                console.error('Reset password request failed:', err);
                showPopupMessage(
                    'reset-msg-container',
                    'Unable to reset your password right now. Please try again.',
                    'error'
                );
            }

    });
}

// ========== LOGIN POPUP ==========
function showLoginPopup() {
    if(localStorage.getItem('token')) {
        window.location.href = '/profile';
        return;
    }
    
    let popup = document.getElementById('auth-popup');
    if(popup) popup.remove();
    
    const html = `
    <div id="auth-popup" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif;">
        <div style="background:white; width:90%; max-width:1000px; border-radius:28px; overflow:hidden; display:flex; flex-wrap:wrap; position:relative;">
            <span onclick="document.getElementById('auth-popup').remove()" style="position:absolute; top:16px; right:20px; font-size:28px; cursor:pointer; background:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&times;</span>
            <div style="flex:1; min-width:280px; background:url('{{ asset("images/jewel.png") }}') center center/cover no-repeat; position:relative; min-height:450px;">
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(135deg, rgba(68,12,44,0.7), rgba(68,12,44,0.85));"></div>
                <div style="position:relative; z-index:2; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; padding:40px; color:white; text-align:center;">
                    <h1 style="font-size:42px; font-weight:800;">Welcome Back</h1>
                    <p style="font-size:18px;">Shop smarter. Earn rewards. Enjoy exclusive discounts.</p>
                </div>
            </div>
            <div style="flex:1; min-width:300px; padding:45px 40px; background:white;">
                <div style="max-width:340px; margin:0 auto;">
                    <div id="login-msg-container"></div>
                    <h2 style="color:#440C2C; font-size:28px; text-align:center;">Login</h2>
                    <p style="color:#666; text-align:center; margin-bottom:28px;">Enter your credentials</p>
                    
                    <div style="margin-bottom:18px;">
                        <label style="font-weight:600; font-size:13px;">Email Address</label>
                        <input type="email" id="popup-login-email" placeholder="Enter your email" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd;">
                    </div>
                    
                    <div style="margin-bottom:20px;">
                        <label style="font-weight:600; font-size:13px;">Password</label>
                        <div class="password-wrapper" style="position:relative;">
                            <input type="password" id="popup-login-password" placeholder="Enter your password" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd; padding-right:45px;">
                            <span class="toggle-password" onclick="togglePassword('popup-login-password', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer;">
                                <svg class="eye-icon open-eye" viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
                                </svg>
                                <svg class="eye-icon closed-eye" viewBox="0 0 24 24" width="20" height="20" style="display:none;">
                                    <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </span>
                        </div>
                    </div>
                    
                    <div style="text-align:center; margin-bottom:15px;">
                        <a href="javascript:void(0)" onclick="showForgotPopup()" style="color:#F4B94E;">Forgot password?</a>
                    </div>
                    
                    <button id="popupLoginBtn" style="width:100%; background:#440C2C; color:white; padding:15px; border:none; border-radius:12px; cursor:pointer; font-weight:600;">Login</button>
                    
                    <div style="text-align:center; margin-top:20px;">
                        <span style="font-size:14px; color:#6b7280;">Don't have an account? </span>
                        <a href="javascript:void(0)" onclick="showRegisterPopup()" style="color:#F4B94E; text-decoration:none; font-weight:600;">Create Account</a>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    document.getElementById('popupLoginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('popup-login-email').value.trim();
        const password = document.getElementById('popup-login-password').value;
        if(!email || !password) { showPopupMessage('login-msg-container', 'Please enter email and password', 'error'); return; }
        if(!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) { showPopupMessage('login-msg-container', 'Enter valid email', 'error'); return; }
        
        try {
            const res = await fetch(BASE_URL + "/user/login", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, password})
            });
            
    const response = await res.json();

    if (res.ok && response.success && response.data?.token) {
        const token = response.data.token;
        const user = response.data.user;

        localStorage.setItem("token", token);

        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        }

        showPopupMessage(
            'login-msg-container',
            response.message || 'Login successful!',
            'success'
        );

    const savedRedirect = sessionStorage.getItem('redirect_after_login');
    
    setTimeout(() => {
        document.getElementById('auth-popup').remove();
        
        if(savedRedirect && savedRedirect !== 'null' && savedRedirect !== '') {
            sessionStorage.removeItem('redirect_after_login');  // Clean up
            window.location.href = savedRedirect;  // Checkout page pe jao
        } else {
            window.location.reload();  // Wahi page reload
        }
    }, 1500);
}
             
            else {
                const message = response.message || 'Login failed';

                if (message.toLowerCase().includes("verify")) {
                    localStorage.setItem("verify_email", email);
                    document.getElementById('auth-popup')?.remove();
                    showVerifyPopup(email, false);
                } else {
                    showPopupMessage(
                        'login-msg-container',
                        message,
                        'error'
                    );
                }
            }

        
            } catch (err) {
                console.error('Login request failed:', err);
                showPopupMessage(
                    'login-msg-container',
                    'Unable to log in right now. Please try again.',
                    'error'
                );
            }

    });
}

// ========== REGISTER POPUP (VIDEO LEFT SIDE) ==========
function showRegisterPopup() {
    let popup = document.getElementById('auth-popup');
    if(popup) popup.remove();
    
    const html = `
    <div id="auth-popup" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif;">
        <div style="background:white; width:90%; max-width:1000px; border-radius:28px; overflow:hidden; display:flex; flex-wrap:wrap; position:relative; max-height:90vh; overflow-y:auto;">
            <span onclick="document.getElementById('auth-popup').remove()" style="position:absolute; top:16px; right:20px; font-size:28px; cursor:pointer; background:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&times;</span>
            
           <div style="flex:1; min-width:280px; position:relative; overflow:hidden; min-height:500px;">
                <img src="{{ asset('images/jewel.png') }}"
                    alt="Mahera Jewel"
                    style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">

                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(135deg, rgba(68,12,44,0.6), rgba(68,12,44,0.8));"></div>

                <div style="position:relative; z-index:2; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; padding:40px; color:white; text-align:center;">
                    <h1 style="font-size:42px; font-weight:800;">Join MAHERA JEWEL</h1>
                    <p style="font-size:18px;">Get exclusive discounts & cashback rewards</p>
                </div>
            </div>
            
            <div style="flex:1; min-width:300px; padding:35px 35px; background:white;">
                <div style="max-width:340px; margin:0 auto;">
                    <div id="register-msg-container"></div>
                    <h2 style="color:#440C2C; font-size:28px; text-align:center;">Create Account</h2>
                    <p style="color:#666; text-align:center; margin-bottom:28px;">Start shopping smarter today</p>
                    
                    <div style="margin-bottom:18px;">
                        <label style="font-weight:600; font-size:13px;">Full Name</label>
                        <input type="text" id="reg-name" placeholder="Enter your full name" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd;">
                        <div id="reg-name-error" style="color:#b91c1c; font-size:11px; margin-top:4px; display:none;"></div>
                    </div>
                    
                    <div style="margin-bottom:18px;">
                        <label style="font-weight:600; font-size:13px;">Email Address</label>
                        <input type="email" id="reg-email" placeholder="Enter your email" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd;">
                        <div id="reg-email-error" style="color:#b91c1c; font-size:11px; margin-top:4px; display:none;"></div>
                    </div>
                    
                    <div style="margin-bottom:18px;">
                        <label style="font-weight:600; font-size:13px;">Password</label>
                        <div class="password-wrapper" style="position:relative;">
                            <input type="password" id="reg-password" placeholder="Create a password" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd; padding-right:45px;">
                            <span class="toggle-password" onclick="togglePassword('reg-password', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer;">
                                <svg class="eye-icon open-eye" viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
                                </svg>
                                <svg class="eye-icon closed-eye" viewBox="0 0 24 24" width="20" height="20" style="display:none;">
                                    <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </span>
                        </div>
                        <div id="reg-password-error" style="color:#b91c1c; font-size:11px; margin-top:4px; display:none;"></div>
                    </div>
                    
                    <div style="margin-bottom:24px;">
                        <label style="font-weight:600; font-size:13px;">Confirm Password</label>
                        <div class="password-wrapper" style="position:relative;">
                            <input type="password" id="reg-password-confirm" placeholder="Confirm your password" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd; padding-right:45px;">
                            <span class="toggle-password" onclick="togglePassword('reg-password-confirm', this)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer;">
                                <svg class="eye-icon open-eye" viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
                                </svg>
                                <svg class="eye-icon closed-eye" viewBox="0 0 24 24" width="20" height="20" style="display:none;">
                                    <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                    <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </span>
                        </div>
                        <div id="reg-confirm-error" style="color:#b91c1c; font-size:11px; margin-top:4px; display:none;"></div>
                    </div>
                    
                    <button id="registerBtn" style="width:100%; background:#440C2C; color:white; padding:15px; border:none; border-radius:12px; cursor:pointer; font-weight:600;">Create Account</button>
                    
                    <div style="text-align:center; margin-top:20px;">
                        <span style="font-size:14px; color:#6b7280;">Already have an account? </span>
                        <a href="javascript:void(0)" onclick="showLoginPopup()" style="color:#F4B94E; text-decoration:none; font-weight:600;">Login</a>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Validation functions
    function validateName(name) {
        if(!name) return { valid: false, message: 'Full name is required' };
        if(name.length < 2) return { valid: false, message: 'Full name must be at least 2 characters' };
        if(name.length > 50) return { valid: false, message: 'Full name must be less than 50 characters' };
        if(!/^[a-zA-Z\s]+$/.test(name)) return { valid: false, message: 'Full name can only contain letters and spaces' };
        return { valid: true, message: '' };
    }
    
    function validateEmail(email) {
        if(!email) return { valid: false, message: 'Email is required' };
        if(!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) return { valid: false, message: 'Enter a valid email address' };
        return { valid: true, message: '' };
    }
    
    function validatePassword(password) {
        if(!password) return { valid: false, message: 'Password is required' };
        if(password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
        if(!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' };
        if(!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter' };
        if(!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number' };
        return { valid: true, message: '' };
    }
    
    function showError(id, msg) {
        const el = document.getElementById(id);
        if(el) { el.textContent = msg; el.style.display = 'block'; }
    }
    function clearError(id) {
        const el = document.getElementById(id);
        if(el) { el.style.display = 'none'; el.textContent = ''; }
    }
    
    const nameInp = document.getElementById('reg-name');
    const emailInp = document.getElementById('reg-email');
    const passInp = document.getElementById('reg-password');
    const confirmInp = document.getElementById('reg-password-confirm');
    
    if(nameInp) {
        nameInp.addEventListener('blur', function() {
            const res = validateName(this.value.trim());
            if(!res.valid) showError('reg-name-error', res.message);
            else clearError('reg-name-error');
        });
        nameInp.addEventListener('input', function() { clearError('reg-name-error'); });
    }
    if(emailInp) {
        emailInp.addEventListener('blur', function() {
            const res = validateEmail(this.value.trim());
            if(!res.valid) showError('reg-email-error', res.message);
            else clearError('reg-email-error');
        });
        emailInp.addEventListener('input', function() { clearError('reg-email-error'); });
    }
    if(passInp) {
        passInp.addEventListener('blur', function() {
            const res = validatePassword(this.value);
            if(!res.valid) showError('reg-password-error', res.message);
            else clearError('reg-password-error');
        });
        passInp.addEventListener('input', function() { clearError('reg-password-error'); });
    }
    if(confirmInp) {
        confirmInp.addEventListener('blur', function() {
            if(this.value !== passInp.value) showError('reg-confirm-error', 'Passwords do not match');
            else clearError('reg-confirm-error');
        });
        confirmInp.addEventListener('input', function() {
            if(this.value !== passInp.value) showError('reg-confirm-error', 'Passwords do not match');
            else clearError('reg-confirm-error');
        });
    }
    
    document.getElementById('registerBtn')?.addEventListener('click', async () => {
    clearError('reg-name-error');
    clearError('reg-email-error');
    clearError('reg-password-error');
    clearError('reg-confirm-error');
    
    const name = nameInp?.value.trim() || '';
    const email = emailInp?.value.trim() || '';
    const password = passInp?.value || '';
    const confirm = confirmInp?.value || '';
    
    const nameRes = validateName(name);
    if(!nameRes.valid) { showError('reg-name-error', nameRes.message); return; }
    const emailRes = validateEmail(email);
    if(!emailRes.valid) { showError('reg-email-error', emailRes.message); return; }
    const passRes = validatePassword(password);
    if(!passRes.valid) { showError('reg-password-error', passRes.message); return; }
    if(password !== confirm) { showError('reg-confirm-error', 'Passwords do not match'); return; }
    
    try {
        const res = await fetch(BASE_URL + "/user/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({name, email, password, password_confirmation: confirm})
        });
        const data = await res.json();
        
        console.log('Register status:', res.status);
        console.log('Register data:', data);
        
        if(res.ok && data.success) {
            localStorage.setItem("verify_email", email);
            showPopupMessage('register-msg-container', 'Registration successful! Please verify OTP.', 'success');
            setTimeout(() => {
                document.getElementById('auth-popup').remove();
                showVerifyPopup(email, false);
            }, 1500);
        } 
        else {
            let errMsg = "Registration failed";
            
            if(data && data.message) {
                errMsg = data.message;
            }
            if(data?.errors?.email) {
                errMsg = data.errors.email[0];
            }
            
            errMsg = "This email is already registered. Please login instead.";
            
            showPopupMessage('register-msg-container', errMsg, 'error');
        }
    } catch(err) { 
        console.error('Register error:', err);
        showPopupMessage('register-msg-container', 'This email is already registered. Please login instead.', 'error'); 
    }
});
}

// ========== FORGOT PASSWORD POPUP ==========
function showForgotPopup() {
    let popup = document.getElementById('auth-popup');
    if(popup) popup.remove();
    
    const html = `
    <div id="auth-popup" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif;">
        <div style="background:white; width:90%; max-width:1000px; border-radius:28px; overflow:hidden; display:flex; flex-wrap:wrap; position:relative;">
            <span onclick="document.getElementById('auth-popup').remove()" style="position:absolute; top:16px; right:20px; font-size:28px; cursor:pointer; background:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&times;</span>
            <div style="flex:1; min-width:280px; background:url('{{ asset("images/jewel.png") }}') center center/cover no-repeat; position:relative; min-height:450px;">
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(135deg, rgba(68,12,44,0.7), rgba(68,12,44,0.85));"></div>
                <div style="position:relative; z-index:2; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; padding:40px; color:white; text-align:center;">
                    <h1 style="font-size:42px; font-weight:800;">Forgot Password?</h1>
                    <p style="font-size:18px;">Don't worry! We'll help you recover your account.</p>
                </div>
            </div>
            <div style="flex:1; min-width:300px; padding:45px 40px; background:white;">
                <div style="max-width:340px; margin:0 auto;">
                    <div id="forgot-msg-container"></div>
                    <h2 style="color:#440C2C; font-size:28px; text-align:center;">Reset Password</h2>
                    <p style="color:#666; text-align:center; margin-bottom:28px;">Enter your email to receive OTP</p>
                    
                    <div style="margin-bottom:24px;">
                        <label style="font-weight:600; font-size:13px;">Email Address</label>
                        <input type="email" id="forgot-email" placeholder="Enter your email" style="width:100%; padding:14px; border-radius:12px; border:1px solid #ddd;">
                    </div>
                    
                    <button id="forgotBtn" style="width:100%; background:#440C2C; color:white; padding:15px; border:none; border-radius:12px; cursor:pointer; font-weight:600;">Send OTP</button>
                    
                    <div style="text-align:center; margin-top:20px;">
                        <a href="javascript:void(0)" onclick="showLoginPopup()" style="color:#F4B94E;">Back to Login</a>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    const btn = document.getElementById('forgotBtn');
    btn?.addEventListener('click', async () => {
        const email = document.getElementById('forgot-email').value.trim();
        if(!email) { showPopupMessage('forgot-msg-container', 'Please enter your email', 'error'); return; }
        if(!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) { showPopupMessage('forgot-msg-container', 'Enter valid email', 'error'); return; }
        
        btn.disabled = true;
        btn.innerText = 'Sending...';
        
        try {
            const res = await fetch(BASE_URL + "/user/forgot-password", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email})
            });
            const data = await res.json();
            if(res.ok) {
                showPopupMessage('forgot-msg-container', 'OTP sent to your email', 'success');
                setTimeout(() => {
                    document.getElementById('auth-popup').remove();
                    showVerifyPopup(email, true);
                }, 1500);
            } else {
                showPopupMessage('forgot-msg-container', data.message || 'Failed to send OTP', 'error');
                btn.disabled = false;
                btn.innerText = 'Send OTP';
            }
        } catch(err) { showPopupMessage('forgot-msg-container', 'Server error', 'error'); btn.disabled = false; btn.innerText = 'Send OTP'; }
    });
}

window.showLoginPopup = showLoginPopup;
window.showRegisterPopup = showRegisterPopup;
window.showForgotPopup = showForgotPopup;
</script>

<style>
    @media (max-width: 768px) {

    #auth-popup {
        padding: 20px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow-y: auto !important;
    }

    #auth-popup > div {
        width: 100% !important;
        max-width: 340px !important;
        max-height: 85vh !important;
        border-radius: 20px !important;
        flex-direction: column !important;
        overflow: hidden !important;
    }

    #auth-popup > div > div:first-of-type {
        display: none !important;
    }
    #auth-popup > div > div:last-of-type {
        width: 100% !important;
        padding: 22px 18px !important;
        overflow-y: auto !important;
    }

    #auth-popup h2 {
        font-size: 20px !important;
        text-align: center !important;
    }

    #auth-popup input {
        width: 100% !important;
        font-size: 16px !important;
        padding: 12px !important;
    }

    #auth-popup button {
        width: 100% !important;
        font-size: 15px !important;
        padding: 13px !important;
    }

    #auth-popup > div > span {
        top: 10px !important;
        right: 10px !important;
        width: 30px !important;
        height: 30px !important;
    }
}
</style>