const API = window.location.origin + '/api';
let fleetCache = [];
let categoryMap = {};
let selectedCompareIDs = [];
let activeSelectedCar = null;

// System Lifecycle Bootstrap Engine Initializer
async function bootstrapShowroom() {
    try {
        const [modelsRes, catsRes] = await Promise.all([ 
            fetch(`${API}/models`), 
            fetch(`${API}/categories`) 
        ]);
        
        const incomingData = await modelsRes.json();
        fleetCache = Array.isArray(incomingData) ? incomingData : [];
        
        const categories = await catsRes.json();
        if (categories && Array.isArray(categories)) {
            categories.forEach(c => categoryMap[c.id] = c.name);
        }

        // Render logic loops independent of lookups or view filtering widgets!
        evaluatePersonalizedRecommendations();
        renderShowroomDisplay(fleetCache);
        populateCategoryDropdown(categories);
        
        // Safely attach event listeners without dropping execution if elements are absent
        const searchInput = document.getElementById('searchFilter');
        if (searchInput) {
            searchInput.addEventListener('input', runFilters);
        }
        
        const catFilter = document.getElementById('categoryFilter');
        if (catFilter) {
            catFilter.addEventListener('change', runFilters);
        }
    } catch (err) { 
        console.error("Initialization Failed:", err); 
    }
}

function showView(viewName) {
    if (!document.getElementById('searchFilter')) {
        window.location.href = "/";
        return;
    }

    clearComparisons();
    document.querySelectorAll('.view-frame').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab-item').forEach(el => el.classList.remove('active-tab'));

    const viewHome = document.getElementById('viewHome');
    const tabHome = document.getElementById('tabHome');
    const viewFleet = document.getElementById('viewFleet');
    const tabFleet = document.getElementById('tabFleet');
    const viewTrack = document.getElementById('viewTrack');
    const tabTrack = document.getElementById('tabTrack');

    if (viewName === 'home') {
        if (viewHome) viewHome.classList.add('active');
        if (tabHome) tabHome.classList.add('active-tab');
        evaluatePersonalizedRecommendations();
    } else if (viewName === 'fleet') {
        if (viewFleet) viewFleet.classList.add('active');
        if (tabFleet) tabFleet.classList.add('active-tab');
    } else if (viewName === 'track') {
        if (viewTrack) viewTrack.classList.add('active');
        if (tabTrack) tabTrack.classList.add('active-tab');
        const trackResult = document.getElementById('trackResultContainer');
        const trackInput = document.getElementById('trackReferenceInput');
        if (trackResult) trackResult.style.display = 'none';
        if (trackInput) trackInput.value = '';
    }
    rebuildComparisonMatrix();
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function populateCategoryDropdown(categories) {
    const dropdown = document.getElementById('categoryFilter');
    if (!dropdown || !categories) return;
    dropdown.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(c => { 
        dropdown.innerHTML += `<option value="${c.id}">${c.name}</option>`; 
    });
}

function renderShowroomDisplay(items) {
    const grid = document.getElementById('mainFleetGrid');
    if (!grid) return;
    if (!items || items.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 3rem 0;">No elite assets match filter criteria.</p>`;
        return;
    }
    grid.innerHTML = items.map(car => generateCardMarkup(car, 'compare-main-')).join('');
}

function generateCardMarkup(car, idPrefix) {
    const isChecked = selectedCompareIDs.includes(car.id) ? 'checked' : '';
    const imgSrc = car.image ? `/api/images/${car.image}` : '';
    return `
        <div class="fleet-card">
            <div class="image-viewport" onclick="openAssetSpecsModal(${car.id})">
                ${imgSrc ? `<img src="${imgSrc}" alt="${car.name}">` : `<span>📷 Visual Asset Pending</span>`}
            </div>
            <div class="card-details">
                <h3>${car.name}</h3>
                <p>Production Tier: <strong>${car.year}</strong></p>
                <div class="price-badge">€${car.pricePerDay} <span style="font-size:0.8rem; font-weight:normal; color:#666;">/ day</span></div>
                <div class="card-actions">
                    <span class="action-link" onclick="openAssetSpecsModal(${car.id})">Rent this vehicle &rarr;</span>
                    <label class="compare-label">
                        <input type="checkbox" id="${idPrefix}${car.id}" ${isChecked} onchange="toggleAssetComparison(${car.id}, this)"> Compare
                    </label>
                </div>
            </div>
        </div>
    `;
}

async function openAssetSpecsModal(id) {
    const res = await fetch(`${API}/models/${id}`);
    const compoundPayload = await res.json();
    
    activeSelectedCar = compoundPayload.model;
    const mfg = compoundPayload.manufacturer;

    localStorage.setItem('hn_fav_category', activeSelectedCar.categoryId);
    
    const titleEl = document.getElementById('modalUnitTitle');
    if (titleEl) titleEl.innerText = activeSelectedCar.name;
    
    const imagePanel = document.getElementById('modalImagePanel');
    if (imagePanel) {
        const imgSrc = activeSelectedCar.image ? `/api/images/${activeSelectedCar.image}` : '';
        imagePanel.innerHTML = imgSrc ? `<img src="${imgSrc}" alt="${activeSelectedCar.name}">` : `<div>📷 Visual Asset Pending</div>`;
    }

    const specsBody = document.getElementById('modalSpecsBody');
    if (specsBody) {
        specsBody.innerHTML = `
            <div class="spec-row"><span class="spec-label">Engine Blueprint</span><span class="spec-value">${activeSelectedCar.specifications.engine}</span></div>
            <div class="spec-row"><span class="spec-label">Performance Output</span><span class="spec-value">${activeSelectedCar.specifications.horsepower} HP</span></div>
            <div class="spec-row"><span class="spec-label">Transmission Box</span><span class="spec-value">${activeSelectedCar.specifications.transmission}</span></div>
            <div class="spec-row"><span class="spec-label">Drivetrain Type</span><span class="spec-value">${activeSelectedCar.specifications.drivetrain}</span></div>
            <div class="spec-row"><span class="spec-label">Manufacturer Name</span><span class="spec-value">${mfg.name || 'N/A'}</span></div>
            <div class="spec-row"><span class="spec-label">Country of Origin</span><span class="spec-value">${mfg.country || 'N/A'}</span></div>
            <div class="spec-row"><span class="spec-label">Founding Year</span><span class="spec-value">${mfg.foundingYear || 'N/A'}</span></div>
        `;
    }
    
    const selector = document.getElementById('rentalDaysSelect');
    if (selector) {
        selector.innerHTML = '';
        for(let i = 1; i <= 7; i++) { selector.innerHTML += `<option value="${i}">${i} Day${i > 1 ? 's' : ''}</option>`; }
        selector.innerHTML += `<option value="custom">More than 7 days... (Custom Deal)</option>`;
    }

    backToSpecsView();
    calculateLiveRate();

    const infoModal = document.getElementById('infoModal');
    if (infoModal) infoModal.style.display = 'grid';
    document.body.style.overflow = 'hidden';
}

function calculateLiveRate() {
    if (!activeSelectedCar) return;
    const selector = document.getElementById('rentalDaysSelect');
    if (!selector) return;
    const selection = selector.value;
    const priceDisplayRow = document.getElementById('priceDisplayRow');
    const submitBtn = document.getElementById('modalSubmitButton');

    if (!submitBtn) return;

    if (selection === 'custom') {
        if (priceDisplayRow) priceDisplayRow.style.display = 'none';
        submitBtn.innerText = "Proceed to Custom Inquiry";
    } else {
        if (priceDisplayRow) priceDisplayRow.style.display = 'flex';
        const total = parseInt(selection) * activeSelectedCar.pricePerDay;
        const totalAmountEl = document.getElementById('estimatedTotalAmount');
        if (totalAmountEl) totalAmountEl.innerText = `€${total}`;
        submitBtn.innerText = `Request Secure Escrow (€${total})`;
    }
}

function transitionToCheckoutForm() {
    const specsView = document.getElementById('sliceSpecsView');
    const checkoutForm = document.getElementById('sliceCheckoutForm');
    if (specsView) specsView.className = "panel-view-state hidden-slice";
    if (checkoutForm) checkoutForm.className = "panel-view-state active-slice";
}

function backToSpecsView() {
    const specsView = document.getElementById('sliceSpecsView');
    const checkoutForm = document.getElementById('sliceCheckoutForm');
    if (specsView) specsView.className = "panel-view-state active-slice";
    if (checkoutForm) checkoutForm.className = "panel-view-state hidden-slice";
    const escrowForm = document.getElementById('escrowBookingForm');
    if (escrowForm) escrowForm.reset();
}

async function submitFormToDatabase(event) {
    event.preventDefault();
    const selector = document.getElementById('rentalDaysSelect');
    const totalAmountEl = document.getElementById('estimatedTotalAmount');
    if (!selector || !activeSelectedCar) return;
    
    const durationSelection = selector.value;
    const payload = {
        carName: activeSelectedCar.name,
        fullName: document.getElementById('formFullName')?.value || '',
        email: document.getElementById('formEmail')?.value || '',
        phone: document.getElementById('formPhone')?.value || '',
        pickupDate: document.getElementById('formPickupDate')?.value || '',
        duration: durationSelection === 'custom' ? '7+ Days (Custom)' : `${durationSelection} Days`,
        totalPrice: durationSelection === 'custom' ? 'Invoiced Contract' : (totalAmountEl?.innerText || '')
    };

    try {
        const response = await fetch(`${API}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            closeAssetModal();
            const refPlaceholder = document.getElementById('popupRefPlaceholder');
            if (refPlaceholder) refPlaceholder.innerText = data.booking.bookingRef;
            const popupConfirm = document.getElementById('popupConfirmationModal');
            if (popupConfirm) popupConfirm.style.display = 'flex';
        } else { alert("Error saving parameters."); }
    } catch (err) { alert("Network error."); }
}

function toggleContactWidgetBox() {
    const drawer = document.getElementById('contactWidgetDrawer');
    if (!drawer) return;
    drawer.style.display = drawer.style.display === "block" ? "none" : "block";
}

async function submitContactWidgetForm(event) {
    event.preventDefault();
    const targetName = document.getElementById('widgetContactName')?.value || '';
    const payload = {
        name: targetName,
        email: document.getElementById('widgetContactEmail')?.value || '',
        message: document.getElementById('widgetContactMessage')?.value || ''
    };

    try {
        const res = await fetch(`${API}/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            document.getElementById('widgetContactForm')?.reset();
            const drawer = document.getElementById('contactWidgetDrawer');
            if (drawer) drawer.style.display = "none";
            const namePlaceholder = document.getElementById('popupContactNamePlaceholder');
            if (namePlaceholder) namePlaceholder.innerText = "Client Node: " + targetName;
            const popupContact = document.getElementById('popupContactConfirmationModal');
            if (popupContact) popupContact.style.display = 'flex';
        } else { alert("Error writing support parameters."); }
    } catch (err) { alert("Timeout crash."); }
}

function copyReferenceToClipboard() {
    const text = document.getElementById('popupRefPlaceholder')?.innerText || '';
    navigator.clipboard.writeText(text).then(() => { alert("Reference code token copied to clipboard!"); });
}

function closeConfirmationPopup() { document.getElementById('popupConfirmationModal').style.display = 'none'; }
function closeContactConfirmationPopup() { document.getElementById('popupContactConfirmationModal').style.display = 'none'; }
  
function closeAssetModal() {
    const infoModal = document.getElementById('infoModal');
    if (infoModal) infoModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    activeSelectedCar = null;
}

async function lookupBookingReference() {
    const refInput = document.getElementById('trackReferenceInput');
    if (!refInput) return;
    const ref = refInput.value.trim();
    const resultBox = document.getElementById('trackResultContainer');
    const specsBody = document.getElementById('trackSpecsBody');
    if(!ref) { alert("Please provide a valid reference token code sequence."); return; }

    try {
        const res = await fetch(`${API}/bookings/lookup?ref=${encodeURIComponent(ref)}`);
        if(!res.ok) { if (resultBox) resultBox.style.display = 'none'; alert("Tracking token reference not found."); return; }

        const booking = await res.json();
        const carTitleEl = document.getElementById('trackCarTitle');
        if (carTitleEl) carTitleEl.innerText = booking.carName;
        if (specsBody) {
            specsBody.innerHTML = `
                <div class="spec-row"><span class="spec-label">Assigned Ledger Client</span><span class="spec-value">${booking.fullName}</span></div>
                <div class="spec-row"><span class="spec-label">Contact Node Box</span><span class="spec-value">${booking.email}</span></div>
                <div class="spec-row"><span class="spec-label">Concierge Call Link</span><span class="spec-value">${booking.phone}</span></div>
                <div class="spec-row"><span class="spec-label">Scheduled Dispatch</span><span class="spec-value">${booking.pickupDate}</span></div>
                <div class="spec-row"><span class="spec-label">Allocated Window</span><span class="spec-value">${booking.duration}</span></div>
                <div class="spec-row"><span class="spec-label">Financial Escrow Value</span><span class="spec-value" style="color:var(--accent-gold); font-weight:700;">${booking.totalPrice}</span></div>
            `;
        }
        if (resultBox) resultBox.style.display = 'block';
    } catch(err) { alert("Ledger search sync connection failure."); }
}

function runFilters() {
    const searchEl = document.getElementById('searchFilter');
    const catEl = document.getElementById('categoryFilter');
    if (!searchEl || !catEl) return;
    
    const lookup = searchEl.value.toLowerCase();
    const chosenCategory = catEl.value;
    const matches = fleetCache.filter(car => {
        const textMatch = car.name.toLowerCase().includes(lookup);
        const categoryMatch = !chosenCategory || car.categoryId == chosenCategory;
        return textMatch && categoryMatch;
    });
    renderShowroomDisplay(matches);
}

function toggleAssetComparison(id, box) {
    const checked = typeof box === 'boolean' ? box : box.checked;

    if (checked) {
        if (selectedCompareIDs.length >= 3) { alert("Maximum of 3 cars can be compared."); if(box.id) box.checked = false; return; }
        if (!selectedCompareIDs.includes(id)) selectedCompareIDs.push(id);

        const homeFrame = document.getElementById('viewHome');
        if (homeFrame && homeFrame.classList.contains('active')) {
            document.querySelectorAll(`[id$="-${id}"]`).forEach(el => { if (el.type === 'checkbox') el.checked = true; });
            document.querySelectorAll('.view-frame').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-tab-item').forEach(el => el.classList.remove('active-tab'));
            document.getElementById('viewFleet')?.classList.add('active');
            document.getElementById('tabFleet')?.classList.add('active-tab');
            rebuildComparisonMatrix();
            window.scrollTo({top: 0, behavior: 'smooth'});
            return;
        }
    } else { selectedCompareIDs = selectedCompareIDs.filter(item => item !== id); }

    document.querySelectorAll(`[id$="-${id}"]`).forEach(el => { if (el.type === 'checkbox') el.checked = checked; });
    rebuildComparisonMatrix();
}

function rebuildComparisonMatrix() {
    const masterSplit = document.getElementById('masterSplitContainer');
    const upperLeftZone = document.getElementById('upperLeftStagingArea');
    const upperStagingGrid = document.getElementById('upperStagingGrid');
    const rightPanel = document.getElementById('rightComparisonPanel');
    const wrapper = document.getElementById('comparisonMatrixTableWrapper');

    if (!masterSplit) return;

    if (selectedCompareIDs.length === 0) {
        masterSplit.classList.remove('split-active', 'three-car-overlay-active');
        if(upperLeftZone) upperLeftZone.style.display = "none"; 
        if(rightPanel) rightPanel.style.display = "none";
        return;
    }

    if (selectedCompareIDs.length === 3) {
        masterSplit.classList.remove('split-active'); masterSplit.classList.add('three-car-overlay-active');
    } else {
        masterSplit.classList.remove('three-car-overlay-active'); masterSplit.classList.add('split-active');
    }

    const fleetFrame = document.getElementById('viewFleet');
    const isFleetActive = fleetFrame ? fleetFrame.classList.contains('active') : false;
    if(upperLeftZone) upperLeftZone.style.display = (isFleetActive && selectedCompareIDs.length > 0) ? "block" : "none";
    if(rightPanel) rightPanel.style.display = "block";

    const selectedObjects = fleetCache.filter(c => selectedCompareIDs.includes(c.id));
    if(upperStagingGrid) upperStagingGrid.innerHTML = selectedObjects.map(car => generateCardMarkup(car, 'compare-upper-')).join('');

    let prices = selectedObjects.map(o => o.pricePerDay);
    let years = selectedObjects.map(o => o.year);
    let horsepowers = selectedObjects.map(o => o.specifications.horsepower);

    let bestPrice = Math.min(...prices);
    let worstPrice = Math.max(...prices);
    let bestYear = Math.max(...years);
    let worstYear = Math.min(...years);
    let bestPower = Math.max(...horsepowers);

    let priceCounts = prices.filter(p => p === bestPrice).length;
    let yearCounts = years.filter(y => y === bestYear).length;
    let powerCounts = horsepowers.filter(h => h === bestPower).length;

    let showPowerHighlight = powerCounts === 1;
    let showOldest = yearCounts > 1 && worstYear !== bestYear;
    let showAffordableHighlight = priceCounts === 1;

    const evalPriceCell = (car) => {
        if (selectedObjects.length <= 1) return `<td><strong>€${car.pricePerDay}</strong></td>`;
        if (car.pricePerDay === bestPrice && showAffordableHighlight) return `<td class="matrix-highlight-best"><strong>€${car.pricePerDay}</strong><span class="matrix-best-tag">Most affordable</span></td>`;
        if (car.pricePerDay === worstPrice && worstPrice !== bestPrice) return `<td class="matrix-highlight-premium"><strong>€${car.pricePerDay}</strong><span class="matrix-premium-tag">💎 Premium Experience</span></td>`;
        return `<td><strong>€${car.pricePerDay}</strong></td>`;
    };

    const evalYearCell = (car) => {
        if (selectedObjects.length <= 1) return `<td>${car.year}</td>`;
        if (car.year === bestYear && yearCounts === 1) return `<td class="matrix-highlight-best">${car.year}<span class="matrix-best-tag">Newest</span></td>`;
        if (car.year === worstYear && showOldest) return `<td class="matrix-highlight-worst-year">${car.year}<span class="matrix-worst-year-tag">Oldest</span></td>`;
        return `<td>${car.year}</td>`;
    };

    const evalPowerCell = (car) => {
        if (selectedObjects.length <= 1) return `<td><strong>${car.specifications.horsepower} HP</strong></td>`;
        const isBest = car.specifications.horsepower === bestPower;
        if (isBest && showPowerHighlight) return `<td class="matrix-highlight-best"><strong>${car.specifications.horsepower} HP</strong><span class="matrix-best-tag">Most Powerful</span></td>`;
        return `<td><strong>${car.specifications.horsepower} HP</strong></td>`;
    };

    if(wrapper) {
        wrapper.innerHTML = `
            <table class="matrix-table">
                <thead>
                    <tr>
                        <th style="width: 105px;">Specification Matrix</th>
                        ${selectedObjects.map(o => `
                            <th>
                                <div class="mini-card-header">
                                    <img src="${o.image ? `/api/images/${o.image}` : ''}" alt="${o.name}" class="mini-card-img" onerror="this.style.display='none';">
                                    <div class="mini-card-name">${o.name}</div>
                                    <div class="mini-card-unselect-btn" onclick="toggleAssetComparison(${o.id}, false)">&times; Remove</div>
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr><td><strong>Rate per Day</strong></td>${selectedObjects.map(o => evalPriceCell(o)).join('')}</tr>
                    <tr><td><strong>Model Year</strong></td>${selectedObjects.map(o => evalYearCell(o)).join('')}</tr>
                    <tr><td><strong>Engine Blueprint</strong></td>${selectedObjects.map(o => `<td>${o.specifications.engine}</td>`).join('')}</tr>
                    <tr><td><strong>Horsepower</strong></td>${selectedObjects.map(o => evalPowerCell(o)).join('')}</tr>
                    <tr><td><strong>Transmission</strong></td>${selectedObjects.map(o => `<td>${o.specifications.transmission}</td>`).join('')}</tr>
                    <tr><td><strong>Drivetrain</strong></td>${selectedObjects.map(o => `<td>${o.specifications.drivetrain}</td>`).join('')}</tr>
                </tbody>
            </table>
        `;
    }
}

function clearComparisons() { 
    selectedCompareIDs = []; 
    document.querySelectorAll('.compare-label input').forEach(el => el.checked = false); 
    rebuildComparisonMatrix(); 
}

function evaluatePersonalizedRecommendations() {
    const targetId = localStorage.getItem('hn_fav_category');
    const recRollElement = document.getElementById('homepageRecommendationsGrid');
    if (!recRollElement) return;
    let selectedRecommendations = [];
    if (targetId && fleetCache.length > 0) { selectedRecommendations = fleetCache.filter(car => car.categoryId == targetId); }
    if (selectedRecommendations.length === 0 && fleetCache.length > 0) { selectedRecommendations = fleetCache.slice(0, 3); }
    recRollElement.innerHTML = selectedRecommendations.map(car => generateCardMarkup(car, 'compare-rec-')).join('');
}

window.onload = async function() {
    await bootstrapShowroom();
};