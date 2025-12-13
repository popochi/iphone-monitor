// State
let allData = [];
let carriers = ['Rakuten', 'ahamo', 'UQ mobile'];
let selectedModel = 'All';
let selectedStorage = 'All';
let priceMode = 'rent'; // 'rent' or 'buyout'
let sortOrder = 'price_asc'; // 'price_asc', 'price_desc', 'model_newest'

// DOM Elements
let updatedAtEl, errorMessageEl, errorTextEl, loadingEl, productContainerEl, mobileListEl, noResultsEl;
let carrierCheckboxes, modelContainer, storageContainer;
let modeRentBtn, modeBuyoutBtn, sortSelect, thPriceDisplay;

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Grab Elements
    updatedAtEl = document.getElementById('updated-at');
    errorMessageEl = document.getElementById('error-message');
    errorTextEl = document.getElementById('error-text');
    loadingEl = document.getElementById('loading');
    productContainerEl = document.getElementById('product-container');
    mobileListEl = document.getElementById('mobile-list');
    noResultsEl = document.getElementById('no-results');

    carrierCheckboxes = document.querySelectorAll('.filter-carrier');
    modelContainer = document.getElementById('filter-model-container');
    storageContainer = document.getElementById('filter-storage-container');

    modeRentBtn = document.getElementById('mode-rent');
    modeBuyoutBtn = document.getElementById('mode-buyout');
    sortSelect = document.getElementById('sort-select');

    thPriceDisplay = document.getElementById('th-price-display'); // Might be null if table is removed

    fetchData();
    setupEventListeners();
});

function setupEventListeners() {
    // Carrier Filter
    carrierCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            carriers = Array.from(carrierCheckboxes)
                .filter(c => c.checked)
                .map(c => c.value);
            render();
        });
    });

    // Sort Change
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortOrder = e.target.value;
            render();
        });
    }
}

async function fetchData() {
    try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (updatedAtEl) updatedAtEl.textContent = data.updated_at || '不明';
        allData = data.items;

        populateFilterChips(allData);
        markLowestPrices(allData);

        if (loadingEl) loadingEl.classList.add('hidden');
        if (productContainerEl) productContainerEl.classList.remove('hidden');
        render();

    } catch (err) {
        console.error(err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorMessageEl) errorMessageEl.classList.remove('hidden');
        if (errorTextEl) errorTextEl.textContent = err.message;
    }
}

function populateFilterChips(items) {
    if (!modelContainer || !storageContainer) return;

    // --- Models ---
    const models = [...new Set(items.map(i => i.model))];
    models.sort((a, b) => {
        const getNum = (s) => {
            if (s.includes('SE')) return -1;
            const match = s.match(/iPhone\s*(\d+)/);
            return match ? parseInt(match[1]) : 0;
        };
        const numA = getNum(a);
        const numB = getNum(b);
        if (numA !== numB) return numB - numA; // Descending
        return a.localeCompare(b);
    });
    models.unshift('All'); // Add All option

    modelContainer.innerHTML = '';
    models.forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = (m === 'All') ? '全て' : m.replace('iPhone ', '');
        btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${m === selectedModel
            ? 'bg-gray-900 text-white border-gray-900 shadow-md'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`;
        btn.onclick = () => {
            selectedModel = m;
            updateChipStyles(modelContainer, m, '全て');
            render();
        };
        modelContainer.appendChild(btn);
    });

    // --- Storage ---
    // Sort logic
    const storages = [...new Set(items.map(i => i.storage))];
    storages.sort((a, b) => {
        const parse = (s) => (s.includes('TB') ? parseInt(s) * 1024 : parseInt(s) || 9999);
        return parse(a) - parse(b);
    });
    storages.unshift('All');

    storageContainer.innerHTML = '';
    storages.forEach(s => {
        const btn = document.createElement('button');
        btn.textContent = (s === 'All') ? '全て' : s;
        btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${s === selectedStorage
            ? 'bg-gray-900 text-white border-gray-900 shadow-md'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`;
        btn.onclick = () => {
            selectedStorage = s;
            updateChipStyles(storageContainer, s, '全て');
            render();
        };
        storageContainer.appendChild(btn);
    });
}

function updateChipStyles(container, selectedValue, allLabel) {
    if (!container) return;
    Array.from(container.children).forEach(btn => {
        const label = btn.textContent;
        // Simple check against label or 'iPhone ' prefix logic
        const isSelected = (label === selectedValue.replace('iPhone ', '')) || (label === allLabel && selectedValue === 'All') || (label === selectedValue);

        btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${isSelected
            ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`;
    });
}

function markLowestPrices(items) {
    // Group by Model + Storage
    const groups = {};
    items.forEach(item => {
        const key = `${item.model}-${item.storage}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    Object.values(groups).forEach(group => {
        if (group.length === 0) return;
        if (group.length === 0) return;
        const minPrice = Math.min(...group.map(i => priceMode === 'rent' ? i.price_effective_rent : i.price_gross));
        group.forEach(item => {
            const price = priceMode === 'rent' ? item.price_effective_rent : item.price_gross;
            item.isLowest = (price === minPrice);
        });
    });
}

function setPriceMode(mode) {
    priceMode = mode;

    // Toggle Animation & Text Colors
    const toggleBg = document.getElementById('toggle-bg');
    const modeRentBtn = document.getElementById('mode-rent');
    const modeBuyoutBtn = document.getElementById('mode-buyout');

    if (toggleBg && modeRentBtn && modeBuyoutBtn) {
        if (mode === 'rent') {
            // Slide Left
            toggleBg.classList.remove('translate-x-full');

            // Text Colors
            modeRentBtn.classList.remove('text-gray-500');
            modeRentBtn.classList.add('text-black');

            modeBuyoutBtn.classList.remove('text-black');
            modeBuyoutBtn.classList.add('text-gray-500');

            if (thPriceDisplay) thPriceDisplay.textContent = "実質負担額";
        } else {
            // Slide Right
            toggleBg.classList.add('translate-x-full');

            // Text Colors
            modeRentBtn.classList.remove('text-black');
            modeRentBtn.classList.add('text-gray-500');

            modeBuyoutBtn.classList.remove('text-gray-500');
            modeBuyoutBtn.classList.add('text-black');

            if (thPriceDisplay) thPriceDisplay.textContent = "一括価格";
        }
    }

    markLowestPrices(allData);
    render();
}

function render() {
    // Filter
    let filtered = allData.filter(item => {
        if (!carriers.includes(item.carrier)) return false;
        if (selectedModel !== 'All' && item.model !== selectedModel) return false;
        if (selectedStorage !== 'All' && item.storage !== selectedStorage) return false;
        return true;
    });

    // Sort
    filtered.sort((a, b) => {
        if (sortOrder === 'model_newest') {
            // Extract model number for sorting (iPhone 16 > 15 ...) - SE last
            const getNum = (s) => {
                if (s.includes('SE')) return -1;
                const match = s.match(/iPhone\s*(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };
            const numA = getNum(a.model);
            const numB = getNum(b.model);
            if (numA !== numB) return numB - numA; // Descending
            return a.model.localeCompare(b.model);
        } else {
            // Price Sort
            const valA = priceMode === 'rent' ? a.price_effective_rent : a.price_gross;
            const valB = priceMode === 'rent' ? b.price_effective_rent : b.price_gross;
            return sortOrder === 'price_asc' ? valA - valB : valB - valA;
        }
    });

    // Clear
    if (mobileListEl) mobileListEl.innerHTML = '';

    if (filtered.length === 0) {
        if (productContainerEl) productContainerEl.classList.add('hidden');
        if (noResultsEl) noResultsEl.classList.remove('hidden');
        return;
    } else {
        if (productContainerEl) productContainerEl.classList.remove('hidden');
        if (noResultsEl) noResultsEl.classList.add('hidden');
    }

    filtered.forEach(item => {
        const imgUrl = getProductImage(item.model);
        // const carrierClass = getCarrierColor(item.carrier); // Removed
        const carrierName = getCarrierDisplayName(item.carrier);
        const isLowest = item.isLowest;

        // Values
        let displayPrice, displayLabel, unitBadge = '';
        if (priceMode === 'rent') {
            displayPrice = item.price_effective_rent;
            displayLabel = '実質負担';
            if (item.program_exemption > 0) unitBadge = '返却P';
        } else {
            displayPrice = item.price_gross;
            displayLabel = '一括価格';
            // if (item.points_awarded > 0) unitBadge = 'Pt還元含'; // Usually for effective buyout, but user asked for Gross. Keeping simple.
        }

        const fmtPrice = displayPrice.toLocaleString();

        // --- Mobile Card (Premium Design) ---
        const lowestBadge = isLowest ? `<div class="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded shadow-sm z-10">最安</div>` : '';

        const cardHTML = `
        <div class="flex flex-col gap-3 p-5 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 relative overflow-hidden group">
            ${lowestBadge}
            <div class="flex gap-4 items-start">
                <!-- Image -->
                <div class="w-20 h-24 flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center p-2 group-hover:bg-blue-50/50 transition-colors">
                    <img src="${imgUrl}" class="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110">
                </div>
                <!-- Header Info & Price -->
                <div class="flex-grow min-w-0">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h3 class="text-lg font-bold text-gray-900 leading-tight tracking-tight">${item.model}</h3>
                            <div class="flex flex-wrap gap-1 mt-1">
                                    <span class="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">${item.storage}</span>
                            </div>
                        </div>
                        <img src="${getCarrierLogoPath(item.carrier)}" alt="${carrierName}" class="h-6 w-auto object-contain object-right opacity-80 group-hover:opacity-100 transition-opacity">
                    </div>
                    
                    <!-- Price Block -->
                    <div class="mt-3">
                        <div class="flex items-baseline gap-1">
                            <span class="text-xs text-gray-400 font-bold">${displayLabel}</span>
                            <span class="text-3xl font-black text-slate-800 tracking-tighter font-sans">¥${fmtPrice}</span>
                        </div>
                        ${unitBadge ? `<div class="mt-1"><span class="text-[10px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded font-bold">${unitBadge}</span></div>` : ''}
                    </div>
                </div>
            </div>
        
            <!-- Action -->
            <a href="${item.url}" target="_blank" class="block w-full bg-slate-900 text-white text-center text-sm font-bold py-3 rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 hover:shadow-xl transition active:scale-95 flex items-center justify-center gap-2 group/btn">
                公式サイトで見る
                <svg class="w-4 h-4 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </a>
        </div>
        `;
        if (mobileListEl) mobileListEl.insertAdjacentHTML('beforeend', cardHTML);

    });
}

function getCarrierLogoPath(carrier) {
    if (carrier === 'Rakuten') return './images/logo_rakuten.png';
    if (carrier === 'ahamo') return './images/logo_ahamo.png';
    if (carrier === 'UQ mobile') return './images/logo_uq.png';
    return '';
}

function getCarrierDisplayName(carrier) {
    if (carrier === 'Rakuten') return '楽天モバイル';
    return carrier;
}

function getProductImage(model) {
    const text = model.replace(/\s+/g, '+');
    return `https://placehold.co/150x180/f3f4f6/333333?text=${text}`;
}
