const API_BASE_URL = window.API_BASE_URL;

(function () {
    const body = document.body;

    const isCategoryPage = body.classList.contains('category-products-page');

    const currentPath = window.location.pathname.replace(/\/+$/, '');

    const isAllProductsPage = currentPath.endsWith('/all-products');

    // Sirf category listing aur All Products page par JS chalao
    if (!isCategoryPage && !isAllProductsPage) {
        return;
    }

    // All Products category ki ID database ke according 29 hai
    const categoryId = isAllProductsPage
        ? '29'
        : body.dataset.categoryId;

    if (!API_BASE_URL) {
        console.error('API_BASE_URL is missing.');
        return;
    }

    if (!categoryId) {
        console.error('Category ID not found on the page.');
        return;
    }

    console.log('Category ID:', categoryId);
    console.log(
        'Products API:',
        `${API_BASE_URL}/categories/${categoryId}/products`
    );

    // Iske neeche apna existing code same rakho:
    // let products = [];
    // let filteredProducts = [];
    // let currentSort = 'relevance';

    let products = [];
    let filteredProducts = [];
    let currentSort = 'relevance';

    async function fetchCategoryProducts() {
        const container = document.getElementById('product-container');
        if (!container) return;

        try {
const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/products`);
            const data = await response.json();
            
            if (data.success && data.data) {
                const categoryName = data.data.category?.name || 'Products';
                products = data.data.products || [];
                filteredProducts = [...products];
                renderCategoryHeader(categoryName);
                renderProducts();
            } else {
                container.innerHTML = '<div class="error-container">No products found</div>';
            }
        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = '<div class="error-container">Failed to load products</div>';
        }
    }

    function renderCategoryHeader(categoryName) {
        const container = document.getElementById('product-container');
        
        const headerHTML = `
            <div class="category-header">
                <div class="back-btn" onclick="window.history.back()">←</div>
                <div class="category-header-text">
                    <h1>${categoryName}</h1>
                    <div class="item-count">${products.length} items</div>
                </div>
            </div>
            <div class="filter-sort-bar">
                <button class="filter-btn" onclick="toggleFilter()">
                    <span>⚫</span> Filter
                </button>
                <select class="sort-select" onchange="sortProducts(this.value)">
                    <option value="relevance">Relevance</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                </select>
            </div>
            <div class="products-grid" id="products-grid"></div>
        `;
        
        container.innerHTML = headerHTML;
    }

    function renderProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        if (!filteredProducts.length) {
            grid.innerHTML = '<div class="no-products">No products found</div>';
            return;
        }

        const fallbackImage = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200&auto=format&fit=crop';

        grid.innerHTML = filteredProducts.map(product => {
            const price = parseFloat(product.final_price || product.price || 0);
            const mrp = parseFloat(product.price || 0);
            const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
            const rating = 4.3;
            const fullStars = Math.floor(rating);
            const halfStar = rating % 1 >= 0.5;
            let starsHtml = '';
            for (let i = 0; i < fullStars; i++) starsHtml += '★';
            if (halfStar) starsHtml += '½';
            for (let i = starsHtml.length; i < 5; i++) starsHtml += '☆';

            return `
                <div class="category-product-card" onclick="window.location.href='/product/${product.slug}'">
                    <div class="category-product-image">
                        <img src="${product.image_url || fallbackImage}" 
                             onerror="this.src='${fallbackImage}'" 
                             alt="${product.name}">
                    </div>
                    <div class="category-product-info">
                        <div class="category-product-brand">${product.brand || 'RAPID RETAIL'}</div>
                        <div class="category-product-name">${product.name}</div>
                        <div class="rating-section">
                            <span class="stars">${starsHtml}</span>
                            <span class="review-count">(49)</span>
                        </div>
                        <div class="category-product-price">
                            <span class="category-current-price">₹${price.toLocaleString('en-IN')}</span>
                            ${mrp > price ? `<span class="category-original-price">₹${mrp.toLocaleString('en-IN')}</span>` : ''}
                            ${discount > 0 ? `<span class="category-discount">${discount}% Off</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.sortProducts = function(sortValue) {
        currentSort = sortValue;
        
        switch(sortValue) {
            case 'price-low':
                filteredProducts.sort((a, b) => {
                    const priceA = parseFloat(a.final_price || a.price || 0);
                    const priceB = parseFloat(b.final_price || b.price || 0);
                    return priceA - priceB;
                });
                break;
            case 'price-high':
                filteredProducts.sort((a, b) => {
                    const priceA = parseFloat(a.final_price || a.price || 0);
                    const priceB = parseFloat(b.final_price || b.price || 0);
                    return priceB - priceA;
                });
                break;
            case 'newest':
                filteredProducts.sort((a, b) => (b.id || 0) - (a.id || 0));
                break;
            default:
                filteredProducts = [...products];
        }
        
        renderProducts();
    };

    window.toggleFilter = function() {
        alert('Filter feature coming soon!');
    };

    fetchCategoryProducts();
})();