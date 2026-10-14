<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title id="page-title">Category Products | MAHERA JEWEL</title>

    <meta name="description"
        content="Explore jewellery collection at MAHERA JEWEL">

    <meta name="robots"
        content="index,follow">

    <link rel="canonical"
        href="{{ url()->current() }}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover">
    <link rel="stylesheet" href="{{ asset('mobile/style.css') }}">
    <link rel="icon" type="image/jpeg" href="{{ asset('images/mjlogo.jpeg') }}">
    <link rel="stylesheet" href="{{ asset('mobile/category-styles.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        /* Same responsive styles as all-categories page */
        /* Copy the style section from all-categories page here */
    </style>
</head>

<body
    class="category-products-page"
    data-page="category-detail"
    data-category-id="{{ $categoryId ?? '' }}"
>
<!-- Header -->
<header class="site-header" id="site-header"></header>

<main class="page-content">
    <div class="container">

        <!-- Breadcrumb -->
        <div class="breadcrumb" id="breadcrumb"></div>

        <!-- Main Layout - WITH FILTER SIDEBAR -->
        <div class="category-layout">

            <!-- Filter Sidebar - UPDATED WITH ALL SECTIONS -->
<aside class="filter-sidebar" id="filter-sidebar">
    <div class="filter-header">
        <h3>REFINE BY</h3>
        <a href="#" class="clear-all">Clear All</a>
        <span class="close-filter" id="close-filter">×</span>
    </div>

    <!-- CATEGORY SECTION -->
    <div class="filter-section">
        <div class="filter-section-title">
            Category
            <span class="toggle-icon">−</span>
        </div>
        <ul class="filter-options" id="filter-shop-for"></ul>
    </div>

    <!-- SUB CATEGORY SECTION -->
    <div class="filter-section">
        <div class="filter-section-title">
            Sub Category
            <span class="toggle-icon">−</span>
        </div>
        <ul class="filter-options" id="filter-categories"></ul>
        <button type="button" class="more-link">+ MORE</button>
    </div>

 <div class="filter-section">
    <div class="filter-section-title">
        Brands
        <span class="toggle-icon">−</span>
    </div>
    <div class="brands-header">
        <button class="select-all-btn" onclick="document.querySelectorAll('.brand-filter').forEach(cb => cb.checked = true); applyAllFilters();">Select All</button>
        <button class="clear-all-btn" onclick="document.querySelectorAll('.brand-filter').forEach(cb => cb.checked = false); applyAllFilters();">Clear All</button>
    </div>
    <ul class="filter-options brands-list" id="brands-list">
        <!-- Dynamic brands will load here -->
    </ul>
</div>

<!-- DISCOUNT SECTION - Add class -->
<div class="filter-section">
    <div class="filter-section-title">
        Discount
        <span class="toggle-icon">−</span>
    </div>
    <ul class="filter-options">
        <li class="filter-option">
            <input type="checkbox" class="discount-filter" value="10" onchange="applyAllFilters()"> 10% and above
        </li>
        <li class="filter-option">
            <input type="checkbox" class="discount-filter" value="20" onchange="applyAllFilters()"> 20% and above
        </li>
        <!-- ... more ... -->
    </ul>
</div>
<!-- PRICE SECTION -->
<div class="filter-section">
    <div class="filter-section-title">
        Price
        <span class="toggle-icon">−</span>
    </div>
    <div class="price-range">
        <div class="price-presets">
            <label class="filter-option">
                <input type="radio" name="price" value="0-500" onchange="applyAllFilters()"> Below ₹500
            </label>
            <label class="filter-option">
                <input type="radio" name="price" value="500-1000" onchange="applyAllFilters()"> ₹500 - ₹1000
            </label>
            <label class="filter-option">
                <input type="radio" name="price" value="1000-1500" onchange="applyAllFilters()"> ₹1000 - ₹1500
            </label>
            <label class="filter-option">
                <input type="radio" name="price" value="1500-2000" onchange="applyAllFilters()"> ₹1500 - ₹2000
            </label>
            <label class="filter-option">
                <input type="radio" name="price" value="2000-2500" onchange="applyAllFilters()"> ₹2000 - ₹2500
            </label>
        </div>
        <div class="custom-price">
            <input type="number" id="min-price" placeholder="Min" onchange="applyAllFilters()">
            <span>to</span>
            <input type="number" id="max-price" placeholder="Max" onchange="applyAllFilters()">
            <button onclick="applyAllFilters()">Apply</button>
        </div>
    </div>
</div>

<!-- COLORS SECTION -->
<div class="filter-section">
    <div class="filter-section-title">
        Colors
        <span class="toggle-icon">−</span>
    </div>
    <div class="colors-grid" style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px;">
        <span class="color-circle" data-color="red" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background: #ff0000; cursor: pointer; border: 2px solid transparent;"></span>
        <span class="color-circle" data-color="blue" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background: #0000ff; cursor: pointer; border: 2px solid transparent;"></span>
        <span class="color-circle" data-color="green" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background: #00ff00; cursor: pointer; border: 2px solid transparent;"></span>
        <span class="color-circle" data-color="black" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background: #000000; cursor: pointer; border: 2px solid transparent;"></span>
        <span class="color-circle" data-color="white" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background: #ffffff; cursor: pointer; border: 2px solid #ddd;"></span>
        <span class="color-circle" data-color="pink" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background: #ffc0cb; cursor: pointer; border: 2px solid transparent;"></span>
        <span class="color-circle" data-color="yellow" style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background: #ffff00; cursor: pointer; border: 2px solid transparent;"></span>
    </div>
</div>
</aside>

            <!-- Products Area -->
            <div class="products-area">

                <!-- Products Header -->
                <div class="products-header">
                    <div class="result-count">
                        <strong id="product-count">0</strong> Items Found
                    </div>

                    <div class="products-actions">
                        <button class="mobile-filter-btn" id="mobile-filter-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                            </svg>
                            FILTER
                        </button>

                        <select class="sort-select" id="sort-select">
                            <option value="relevance">Relevance</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                        </select>
                    </div>
                </div>

                <!-- Products Grid -->
                <div id="category-products-grid" class="product-grid"></div>

            </div>
        </div>
    </div>
</main>

<!-- Footer -->
<footer class="site-footer" id="site-footer"></footer>
<nav class="mobile-bottom-nav" id="mobile-bottom-nav"></nav>

<!-- Category Modal -->
<div class="category-modal" id="category-modal">
    <div class="modal-box">
        <div class="modal-header">
            <h2>SHOP BY CATEGORY</h2>
            <span class="modal-close" id="close-category-modal">&times;</span>
        </div>
        <div class="modal-body" id="modal-popup-body"></div>
    </div>
</div>

<script>
    window.API_BASE_URL = "{{ env('API_BASE_URL') }}";
</script>
<script src="{{ asset('mobile/script.js') }}"></script>
<script src="{{ asset('mobile/filter-fix.js') }}"></script>

<!-- Filter Toggle Script -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const filterBtn = document.getElementById('mobile-filter-btn');
    const closeFilter = document.getElementById('close-filter');
    const filterSidebar = document.getElementById('filter-sidebar');
    
    if (filterBtn && closeFilter && filterSidebar) {
        filterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            filterSidebar.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        
        closeFilter.addEventListener('click', function(e) {
            e.preventDefault();
            filterSidebar.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        filterSidebar.addEventListener('click', function(e) {
            if (e.target === filterSidebar) {
                filterSidebar.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});
</script>

<script>
document.addEventListener('DOMContentLoaded', async () => {
    const currentPath = window.location.pathname.replace(/\/+$/, '');

    const isAllProductsPage = currentPath.endsWith('/all-products');

    let categoryId = document.body.dataset.categoryId;

    if (isAllProductsPage) {
        const catData = await window.app.callAPI(`${window.API_BASE_URL}/categories`);
        if (catData.success) {
            const allProductsCat = catData.data.find(c => (c.slug || '') === 'all-products');
            if (allProductsCat) categoryId = allProductsCat.id;
        }
    }

    if (!categoryId || !window.app || !window.app.callAPI) {
        console.error('Category ID or API helper is missing.');
        return;
    }

    console.log('Category ID:', categoryId);
    console.log(
        'Products API:',
        `${window.API_BASE_URL}/categories/${categoryId}/products`
    );

    // Iske neeche aapka existing code same rahega.
   
    const catRes = await window.app.callAPI(`${window.API_BASE_URL}/categories/${categoryId}`);    
    if (catRes.success && catRes.data) {
        const category = catRes.data;
        
        // Show current category in filter (pre-selected)
        const shopForEl = document.getElementById('filter-shop-for');
        if (shopForEl) {
            shopForEl.innerHTML = `
                <li class="filter-option">
                    <input type="checkbox" class="parent-category-filter" value="${category.id}" id="cat-${category.id}" checked>
                    <label for="cat-${category.id}">${category.name}</label>
                </li>
            `;
        }
        
        // Load subcategories
        const subCategoryEl = document.getElementById('filter-categories');
        if (subCategoryEl && category.children && category.children.length > 0) {
            subCategoryEl.innerHTML = category.children.map(sub => `
                <li class="filter-option">
                    <input type="checkbox" class="sub-category-filter" value="${sub.id}" id="sub-${sub.id}">
                    <label for="sub-${sub.id}">${sub.name}</label>
                </li>
            `).join('');
        }
    }

    // Load products
    const grid = document.getElementById('category-products-grid');
    const countEl = document.getElementById('product-count');
    
    // Show loading
    grid.innerHTML = Array(6).fill(0).map(() => `
        <div class="product-card skeleton">
            <div class="p-img-wrap skeleton"></div>
            <div class="p-info">
                <div class="skeleton" style="height:12px;width:60%"></div>
                <div class="skeleton" style="height:10px;width:80%"></div>
            </div>
        </div>
    `).join('');

const res = await window.app.callAPI(`${window.API_BASE_URL}/categories/${categoryId}/products`);    
    const products = res?.data?.products || [];
    const categoryName = res?.data?.category?.name || 'Category';
    
    renderBreadcrumb({ category: categoryName });
    countEl.innerText = products.length;

    grid.innerHTML = products.length
        ? products.map(p => window.app.genProductCard(p)).join('')
        : `<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">No products found</p>`;

    // Sort functionality
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const value = e.target.value;
            let sortedProducts = [...products];

            if (value === 'price-low') {
                sortedProducts.sort((a, b) => (a.final_price || a.price || 0) - (b.final_price || b.price || 0));
            } else if (value === 'price-high') {
                sortedProducts.sort((a, b) => (b.final_price || b.price || 0) - (a.final_price || a.price || 0));
            }

            grid.innerHTML = sortedProducts.map(p => window.app.genProductCard(p)).join('');
        });
    }

    // Subcategory filter
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('sub-category-filter')) {
            const selectedSubs = Array.from(document.querySelectorAll('.sub-category-filter:checked'))
                .map(cb => cb.value);
            
            if (selectedSubs.length === 0) {
                grid.innerHTML = products.map(p => window.app.genProductCard(p)).join('');
                countEl.innerText = products.length;
            } else {
                const filtered = products.filter(p => selectedSubs.includes(String(p.sub_category_id)));
                grid.innerHTML = filtered.map(p => window.app.genProductCard(p)).join('');
                countEl.innerText = filtered.length;
            }
        }
    });
});
</script>

</body>
</html>