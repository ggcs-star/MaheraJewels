<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover">
      <meta name="description" content="Shop exquisite handcrafted jewellery at MAHERA JEWEL. Necklaces, earrings, maang tikka, bridal sets, bangles & more. Free shipping on orders above ₹999.">
      <meta name="keywords" content="jewellery, necklaces, earrings, bridal sets, maang tikka, bangles, kundan jewellery, pearl jewellery">
       <meta name="author" content="MAHERA JEWEL">
        <title>MAHERA JEWEL </title>
  <link rel="icon" type="image/jpeg" href="{{ asset('images/mjlogo.jpeg') }}">
    <link rel="stylesheet" href="{{ asset('mobile/style.css') }}">
    <link rel="stylesheet" href="{{ asset('mobile/categories/category-styles.css') }}">
    <link rel="stylesheet" href="{{ asset('mobile/product-styles.css') }}">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body data-page="landing">

<div id="skeleton-loader">
    <div class="skeleton-container">
        <div class="skeleton skeleton-hero"></div>

        <div class="categories-pills-section">
            <div class="container">
                <div class="skeleton-grid">
                    <div class="skeleton skeleton-category"></div>
                    <div class="skeleton skeleton-category"></div>
                    <div class="skeleton skeleton-category"></div>
                    <div class="skeleton skeleton-category"></div>
                    <div class="skeleton skeleton-category"></div>
                </div>
            </div>
        </div>

        <section class="trending-section">
            <div class="container">
                <div class="section-header centered">
                    <div class="skeleton skeleton-title"></div>
                </div>
                <div class="skeleton-grid">
                    <div class="skeleton skeleton-card"></div>
                    <div class="skeleton skeleton-card"></div>
                    <div class="skeleton skeleton-card"></div>
                    <div class="skeleton skeleton-card"></div>
                </div>
            </div>
        </section>

        <section class="section-container">
            <div class="container">
                <div class="section-header centered">
                    <div class="skeleton skeleton-title"></div>
                </div>
                <div class="skeleton-grid-4">
                    <div class="skeleton skeleton-product"></div>
                    <div class="skeleton skeleton-product"></div>
                    <div class="skeleton skeleton-product"></div>
                    <div class="skeleton skeleton-product"></div>
                </div>
            </div>
        </section>

        <div class="container">
            <div class="skeleton-grid-4">
                <div class="skeleton skeleton-brand"></div>
                <div class="skeleton skeleton-brand"></div>
                <div class="skeleton skeleton-brand"></div>
                <div class="skeleton skeleton-brand"></div>
            </div>
        </div>
    </div>
</div>

<div id="real-content" style="display: none;">
    <header class="site-header" id="site-header"></header>

    <main class="page-content">
        <section class="hero-section">
            <div id="hero-slider" class="hero-slider"></div>
            <div class="slider-dots" id="slider-dots"></div>
        </section>

        <!-- <section class="categories-pills-section">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Wrapped with love</h2>
        </div>
        <div id="categories-pills" class="categories-pills"></div>
    </div>
</section> -->
        <section class="trending-section">
            <div class="container">
                <div class="section-header centered">
                    <h2 class="section-title">Categories</h2>
                </div>
                
                <div class="trending-slider-container">
                    <div class="trending-slider" id="trending-slider">
                    </div>
                </div>
            </div>
        </section>
        

        <section class="section-container">
            <div class="container">
                <div class="section-header centered">
                    <div id="style-spotlight-grid"></div>
                </div>
                <div id="style-spotlight-grid" class="spotlight-grid"></div>
            </div>
        </section>
        <section class="container" id="mid-banner-1-container"></section>
        <section class="container" id="mid-banner-2-container"></section>
        <div id="dynamic-category-sections"></div>

       <section class="container">
    <div class="trust-strip-figma">
        <div class="trust-card-figma">
            <div class="trust-icon-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
            <h4>Fast Delivery</h4>
            <p>Within 24-48 hrs</p>
        </div>
        <div class="trust-card-figma">
            <div class="trust-icon-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 12V8H4V12M20 12L22 14V18H2V14L4 12M20 12H4M12 8V16M8 12V16M16 12V16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <rect x="2" y="4" width="20" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>
            </div>
            <h4>Secure Pay</h4>
            <p>100% protected</p>
        </div>
        <div class="trust-card-figma">
            <div class="trust-icon-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 7L9 18L4 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h4>Easy Returns</h4>
            <p>30-day return policy</p>
        </div>
        <div class="trust-card-figma">
            <div class="trust-icon-circle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15 8H22L16 12L19 18L12 14L5 18L8 12L2 8H9L12 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
            </div>
            <h4>Best Quality</h4>
            <p>Assured products</p>
        </div>
    </div>
</section>
    </main>

@include('components.footer')
    <nav class="mobile-bottom-nav" id="mobile-bottom-nav"></nav>
    <div class="mobile-sticky-cta" id="mobile-sticky-cta"></div>
</div>
<script>
    window.API_BASE_URL = "{{ env('API_BASE_URL') }}";
</script>

<script src="{{ asset('mobile/script.js') }}"></script>
<script src="{{ asset('mobile/search.js') }}"></script>
@include('mobile.auth.auth')
</body>
</html>