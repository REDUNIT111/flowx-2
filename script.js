/* =====================================================
   FLOWX - script.js
   Data is stored in browser localStorage (demo only).
   ===================================================== */


/* =========================
   HELPERS
   ========================= */

// Escape user text before putting it into innerHTML
function esc(value) {
    return String(value === undefined || value === null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Normalise a location/product for comparison:
// trim, lowercase, collapse repeated spaces
function norm(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function normalizeCity(value) {
    let city = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[.,-]/g, " ")
        .replace(/\s+/g, " ");

    while (/\s+(chhattisgarh|cg|india)$/.test(city)) {
        city = city.replace(/\s+(chhattisgarh|cg|india)$/, "");
    }

    const aliases = {
        "bilspur": "bilaspur",
        "bhilai nagar": "bhilai"
    };

    return aliases[city] || city;
}

const CITY_SUGGESTIONS = [
    "Bilaspur",
    "Raipur",
    "Durg",
    "Bhilai",
    "Korba",
    "Raigarh",
    "Rajnandgaon",
    "Jagdalpur",
    "Ambikapur",
    "Dhamtari",
    "Kawardha",
    "Janjgir",
    "Champa",
    "Mahasamund",
    "Bemetara",
    "Balod",
    "Baloda Bazar",
    "Surajpur",
    "Kanker",
    "Kondagaon"
];

function setupCitySuggestions() {
    const cityList = document.createElement("datalist");
    cityList.id = "flowxCitySuggestions";

    CITY_SUGGESTIONS.forEach(function(city) {
        const option = document.createElement("option");
        option.value = city;
        cityList.appendChild(option);
    });

    document.body.appendChild(cityList);
}

setupCitySuggestions();

// Safely read an array from localStorage
function loadList(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
        console.error("Invalid data in " + key + ":", error);
        return [];
    }
}

function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}

// Coloured status label, e.g. Pending / Accepted / Rejected
function badge(status) {

    const text = String(status || "");
    const cls = text.toLowerCase().replace(/[^a-z]/g, "");

    return "<span class='badge badge-" + cls + "'>" + esc(text) + "</span>";
}

function statusGuidance(status, requestType, transportUnavailable) {

    const guidance = {
        inventory: {
            Pending: {
                className: "pending",
                title: "Next: wait for the seller",
                text: "The requested stock is reserved while the seller reviews this request."
            },
            Accepted: {
                className: "accepted",
                title: "Next: review the completed deal",
                text: "Stock and matched transport capacity were updated. The deal is recorded in Transactions."
            },
            Rejected: {
                className: "rejected",
                title: "Request declined",
                text: "Reserved stock is released. You can submit another request if stock is still available."
            }
        },
        transport: {
            Pending: {
                className: "pending",
                title: "Next: wait for the transporter",
                text: "The vehicle is held for this request while the transporter reviews it."
            },
            Accepted: {
                className: "accepted",
                title: "Next: coordinate the trip",
                text: "The vehicle was removed from available listings. Arrange delivery details outside this demo."
            },
            Rejected: {
                className: "rejected",
                title: "Request declined",
                text: "The vehicle remains listed. You can request another available vehicle."
            }
        },
        "inventory-seller": {
            Pending: {
                className: "pending",
                title: "Next: review and decide",
                text: "Check the suggested transport, then accept or reject. The requested stock stays reserved until you decide."
            },
            Accepted: {
                className: "accepted",
                title: "Deal confirmed",
                text: "Stock and matched vehicle capacity were updated. The transaction is recorded."
            },
            Rejected: {
                className: "rejected",
                title: "Request declined",
                text: "The reservation is released, so this stock is available for other buyers."
            }
        },
        "transport-owner": {
            Pending: {
                className: "pending",
                title: "Next: review this request",
                text: "The vehicle is held from other requests until you decide. Accept to reserve it, or reject to make it available again."
            },
            Accepted: {
                className: "accepted",
                title: "Transport request accepted",
                text: "The vehicle was removed from available listings. Coordinate delivery directly; this demo has no messaging or booking."
            },
            Rejected: {
                className: "rejected",
                title: "Transport request declined",
                text: "The vehicle remains available for another request."
            }
        }
    };

    const statusMap = guidance[requestType];
    let info = statusMap && statusMap[status];

    if (requestType === "inventory-seller" &&
        status === "Pending" &&
        transportUnavailable) {
        info = {
            className: "pending",
            title: "Next: wait for matching transport or reject",
            text: "No available vehicle fits this route and quantity. Wait for suitable transport to be listed, or reject to release the stock reservation."
        };
    }

    if (!info) {
        return (
            "<div class='status-guidance status-guidance-neutral'>" +
            "<strong>Status update</strong>" +
            "<p>Check with the other party for the next step.</p>" +
            "</div>"
        );
    }

    return (
        "<div class='status-guidance status-guidance-" + info.className + "'>" +
        "<strong>" + esc(info.title) + "</strong>" +
        "<p>" + esc(info.text) + "</p>" +
        (status === "Accepted" &&
            (requestType === "inventory" || requestType === "inventory-seller")
            ? "<a href='transactions.html'>View Transactions</a>"
            : "") +
        "</div>"
    );
}

function requestStatusSummary(requests) {

    const counts = {
        Pending: 0,
        Accepted: 0,
        Rejected: 0
    };

    requests.forEach(function(request) {
        if (Object.prototype.hasOwnProperty.call(counts, request.status)) {
            counts[request.status] += 1;
        }
    });

    return (
        "<div class='request-status-summary' aria-label='Request totals'>" +
        "<span><strong>" + counts.Pending + "</strong> Pending</span>" +
        "<span><strong>" + counts.Accepted + "</strong> Accepted</span>" +
        "<span><strong>" + counts.Rejected + "</strong> Rejected</span>" +
        "</div>"
    );
}

// Friendly message when a list is empty (actionHtml is trusted markup)
function emptyState(icon, title, text, actionHtml) {

    return (
        "<div class='empty-state'>" +
        "<div class='empty-icon'>" + icon + "</div>" +
        "<h3>" + esc(title) + "</h3>" +
        "<p>" + esc(text) + "</p>" +
        (actionHtml || "") +
        "</div>"
    );
}

function listingFilterMarkup(prefix, placeholder, units, includeAvailability) {

    const unitOptions = units
        .filter(function(unit, index, allUnits) {
            return allUnits.indexOf(unit) === index;
        })
        .map(function(unit) {
            return "<option value='" + esc(norm(unit)) + "'>" +
                esc(unit) + "</option>";
        })
        .join("");

    return (
        "<div class='listing-filters'>" +
        "<div class='listing-filter-fields'>" +
        "<div class='listing-filter-field'>" +
        "<label for='" + prefix + "Search'>Search</label>" +
        "<input type='search' id='" + prefix + "Search' " +
        "placeholder='" + esc(placeholder) + "'>" +
        "</div>" +
        "<div class='listing-filter-field'>" +
        "<label for='" + prefix + "Unit'>Unit</label>" +
        "<select id='" + prefix + "Unit'>" +
        "<option value=''>All units</option>" + unitOptions +
        "</select>" +
        "</div>" +
        (includeAvailability
            ? "<div class='listing-filter-field'>" +
                "<label for='" + prefix + "Availability'>Stock</label>" +
                "<select id='" + prefix + "Availability'>" +
                "<option value=''>All stock</option>" +
                "<option value='available'>Available</option>" +
                "<option value='reserved'>Fully reserved</option>" +
                "</select>" +
                "</div>"
            : "") +
        "</div>" +
        "<p class='listing-filter-count' id='" + prefix +
        "ListingCount' aria-live='polite'></p>" +
        "<p class='listing-filter-empty' id='" + prefix +
        "NoResults' hidden>No listings match these filters. Try changing your search.</p>" +
        "</div>"
    );
}

function applyListingFilters(prefix, includeAvailability) {

    const searchInput = document.getElementById(prefix + "Search");
    const unitFilter = document.getElementById(prefix + "Unit");
    const availabilityFilter = includeAvailability
        ? document.getElementById(prefix + "Availability")
        : null;
    const count = document.getElementById(prefix + "ListingCount");
    const noResults = document.getElementById(prefix + "NoResults");
    const cards = document.querySelectorAll(
        "#" + prefix + "Cards .inventory-card"
    );

    const searchTerms = norm(searchInput.value).split(" ").filter(Boolean);
    const selectedUnit = unitFilter.value;
    const selectedAvailability = availabilityFilter
        ? availabilityFilter.value
        : "";
    let visibleCount = 0;

    cards.forEach(function(card) {
        const matchesSearch = searchTerms.every(function(term) {
            return card.dataset.search.indexOf(term) !== -1;
        });
        const matchesUnit =
            selectedUnit === "" || card.dataset.unit === selectedUnit;
        const matchesAvailability =
            selectedAvailability === "" ||
            card.dataset.availability === selectedAvailability;
        const visible =
            matchesSearch && matchesUnit && matchesAvailability;

        card.hidden = !visible;

        if (visible) {
            visibleCount += 1;
        }
    });

    count.textContent =
        "Showing " + visibleCount + " of " + cards.length + " listings";
    noResults.hidden = visibleCount > 0;
}

function bindListingFilters(prefix, includeAvailability) {

    const searchInput = document.getElementById(prefix + "Search");
    const unitFilter = document.getElementById(prefix + "Unit");

    searchInput.addEventListener("input", function() {
        applyListingFilters(prefix, includeAvailability);
    });
    unitFilter.addEventListener("change", function() {
        applyListingFilters(prefix, includeAvailability);
    });

    if (includeAvailability) {
        document.getElementById(prefix + "Availability")
            .addEventListener("change", function() {
                applyListingFilters(prefix, includeAvailability);
            });
    }

    applyListingFilters(prefix, includeAvailability);
}

// Thin bar showing how full the vehicle is, from a string like "8.0%"
function utilBar(utilization) {

    const pct = Math.max(0, Math.min(100, parseFloat(utilization) || 0));

    return (
        "<div class='util-bar'><span style='width:" + pct + "%'></span></div>"
    );
}

// Indian-style money, e.g. 124500 -> ₹1,24,500
function money(value) {

    return "₹" + Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

let flowxToastTimer;

function showToast(message) {

    let toast = document.getElementById("flowxToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "flowxToast";
        toast.className = "flowx-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
    }

    toast.className = "flowx-toast";
    toast.textContent = message;
    toast.classList.add("visible");

    window.clearTimeout(flowxToastTimer);
    flowxToastTimer = window.setTimeout(function() {
        toast.classList.remove("visible");
    }, 4500);
}

function convertQuantity(quantity, fromUnit, toUnit) {

    quantity = Number(quantity);

    if (!Number.isFinite(quantity)) {
        return null;
    }

    if (fromUnit === toUnit) {
        return ["kg", "tonnes", "boxes", "litres", "units"].indexOf(fromUnit) !== -1
            ? quantity
            : null;
    }

    if (fromUnit === "kg" && toUnit === "tonnes") {
        return quantity / 1000;
    }

    if (fromUnit === "tonnes" && toUnit === "kg") {
        return quantity * 1000;
    }

    return null;
}

// Unique id for listings, so two listings of the same product
// in the same city are never confused with each other
function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Round money / quantities to 2 decimals (avoids 0.1 * 3 = 0.30000000000000004)
// Quantities keep 3 decimals so a 4 kg load on a tonne-based truck
// (0.004 tonnes) is not rounded away. Money stays at 2 decimals.
function roundQty(value) {
    return Math.round(Number(value) * 1000) / 1000;
}

function round2(value) {
    return Math.round(Number(value) * 100) / 100;
}

// Does this request belong to this inventory listing?
// Uses the listing id when both have one, and falls back to
// product + pickup location for data saved before ids existed.
function sameListing(request, inventory) {

    if (request.inventoryId && inventory.id) {
        return request.inventoryId === inventory.id;
    }

    return (
        norm(request.product) === norm(inventory.product) &&
        normalizeCity(request.pickupLocation) === normalizeCity(inventory.location)
    );
}

// Quantity of a listing already promised to pending requests
function reservedQuantity(inventory) {

    return loadList("flowxRequests")
        .filter(function(request) {
            return (
                request.status === "Pending" &&
                sameListing(request, inventory)
            );
        })
        .reduce(function(sum, request) {
            return sum + Number(request.quantity);
        }, 0);
}

function findBestTransport(request, transports) {

    const requestedQuantity = Number(request.quantity);

    if (
        requestedQuantity <= 0 ||
        convertQuantity(requestedQuantity, request.unit, request.unit) === null
    ) {
        return null;
    }

    const candidates = [];

    transports.forEach(function(transport) {

        const transportCapacity =
            convertQuantity(
                transport.capacity,
                transport.capacityUnit,
                request.unit
            );

        if (transportCapacity === null || transportCapacity <= 0) {
            return;
        }

        if (
            normalizeCity(transport.from) === normalizeCity(request.pickupLocation) &&
            normalizeCity(transport.to) === normalizeCity(request.deliveryLocation) &&
            transportCapacity >= requestedQuantity
        ) {
            candidates.push({
                transport: transport,
                transportCapacity: transportCapacity,
                utilization: requestedQuantity / transportCapacity
            });
        }
    });

    if (candidates.length === 0) {
        return null;
    }

    return candidates.reduce(function(best, candidate) {

        if (candidate.utilization > best.utilization) {
            return candidate;
        }

        if (
            candidate.utilization === best.utilization &&
            Number(candidate.transport.price) < Number(best.transport.price)
        ) {
            return candidate;
        }

        return best;
    });
}


/* =========================
   SELLER PAGE
   ========================= */

function showSellerForm() {

    const sellerForm =
        document.getElementById("sellerForm");

    const message =
        document.getElementById("message");

    if (sellerForm) {
        sellerForm.style.display = "block";
    }

    if (message) {
        message.innerHTML = "";
    }

    const sellButton =
        document.getElementById("sellInventoryBtn");

    const requestsButton =
        document.getElementById("viewRequestsBtn");

    const manageButton =
        document.getElementById("manageInventoryBtn");

    if (sellButton) {
        sellButton.classList.add("active");
        sellButton.setAttribute("aria-pressed", "true");
    }

    if (requestsButton) {
        requestsButton.classList.remove("active");
        requestsButton.setAttribute("aria-pressed", "false");
    }

    if (manageButton) {
        manageButton.classList.remove("active");
        manageButton.setAttribute("aria-pressed", "false");
    }
}

function submitInventory() {

    const product = document.getElementById("productName").value.trim();
    const quantityInput = document.getElementById("quantity").value.trim();
    const location = document.getElementById("location").value.trim();
    const priceInput = document.getElementById("price").value.trim();
    const unit = document.getElementById("unit").value;

    if (
        product === "" ||
        quantityInput === "" ||
        location === "" ||
        priceInput === "" ||
        unit === ""
    ) {
        showToast("Please fill in all fields.");
        return;
    }

    const quantity = Number(quantityInput);
    const price = Number(priceInput);

    if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
        showToast("Please enter a valid quantity and price.");
        return;
    }

    const inventory = {
        id: newId(),
        product: product,
        quantity: quantity,
        unit: unit,
        location: location,
        price: price
    };

    const inventories = loadList("flowxInventory");

    inventories.push(inventory);

    saveList("flowxInventory", inventories);

    updateDashboard();

    showToast("Inventory added successfully!");

    document.getElementById("productName").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("unit").value = "";
    document.getElementById("location").value = "";
    document.getElementById("price").value = "";
}

function inventoryHasPendingRequests(inventory) {
    return loadList("flowxRequests").some(function(request) {
        return request.status === "Pending" &&
            sameListing(request, inventory);
    });
}

function showInventoryListings() {

    const sellerForm = document.getElementById("sellerForm");
    const message = document.getElementById("message");

    if (sellerForm) {
        sellerForm.style.display = "none";
    }

    const tabs = [
        ["sellInventoryBtn", false],
        ["viewRequestsBtn", false],
        ["manageInventoryBtn", true]
    ];

    tabs.forEach(function(tab) {
        const button = document.getElementById(tab[0]);
        if (button) {
            button.classList.toggle("active", tab[1]);
            button.setAttribute("aria-pressed", String(tab[1]));
        }
    });

    if (!message) {
        return;
    }

    const inventories = loadList("flowxInventory");
    let output =
        "<h2>Manage Inventory Listings</h2>" +
        "<p class='listing-management-note'>Listings are stored in this browser. " +
        "There are no user accounts, so anyone using this browser can manage them. " +
        "Listings with pending requests cannot be edited or removed.</p>";

    if (inventories.length === 0) {
        message.innerHTML = output + emptyState(
            "📦",
            "No inventory listings",
            "Add inventory first, and it will appear here for management.",
            "<a class='empty-action' href='seller.html'>Add inventory</a>"
        );
        return;
    }

    output += "<div class='inventory-container'>";

    inventories.forEach(function(inventory, index) {
        const locked = inventoryHasPendingRequests(inventory);
        const lockNote = locked
            ? "<p class='card-note'>This listing has a pending request, so it is locked.</p>"
            : "";

        output +=
            "<div class='inventory-card'>" +
            "<h3>📦 " + esc(inventory.product) + "</h3>" +
            "<p><strong>Quantity:</strong> " + esc(inventory.quantity) +
            " " + esc(inventory.unit || "units") + "</p>" +
            "<p><strong>Pickup:</strong> " + esc(inventory.location) + "</p>" +
            "<p><strong>Price:</strong> " + esc(money(inventory.price)) +
            " / " + esc(inventory.unit || "unit") + "</p>" +
            lockNote +
            "<div class='listing-actions'>" +
            "<button type='button' aria-label='Edit " + esc(inventory.product) +
            " listing' onclick='editInventoryListing(" + index + ")'" +
            (locked ? " disabled" : "") + ">Edit</button>" +
            "<button type='button' class='listing-delete' aria-label='Remove " +
            esc(inventory.product) + " listing' " +
            "onclick='deleteInventoryListing(" + index + ")'" +
            (locked ? " disabled" : "") + ">Remove</button>" +
            "</div></div>";
    });

    output += "</div>";
    message.innerHTML = output;
}

function editInventoryListing(index) {

    const inventories = loadList("flowxInventory");
    const inventory = inventories[index];

    if (!inventory) {
        showToast("Inventory listing not found.");
        return;
    }

    if (inventoryHasPendingRequests(inventory)) {
        showToast("Resolve pending requests before editing this listing.");
        showInventoryListings();
        return;
    }

    const card = document.querySelectorAll("#message .inventory-card")[index];
    if (!card) {
        showToast("Inventory listing could not be opened for editing.");
        return;
    }

    const unitOptions = [
        ["kg", "Kilograms (kg)"],
        ["tonnes", "Tonnes"],
        ["units", "Units"],
        ["boxes", "Boxes"],
        ["litres", "Litres"]
    ].map(function(option) {
        return "<option value='" + option[0] + "'" +
            (inventory.unit === option[0] ? " selected" : "") +
            ">" + option[1] + "</option>";
    }).join("");

    card.innerHTML =
        "<h3>Edit Inventory Listing</h3>" +
        "<div class='listing-edit-field'><label for='editInventoryProduct'>Product name</label>" +
        "<input id='editInventoryProduct' type='text' value='" +
        esc(inventory.product) + "'></div>" +
        "<div class='listing-edit-field'><label for='editInventoryQuantity'>Quantity</label>" +
        "<input id='editInventoryQuantity' type='number' min='0.01' step='any' value='" +
        esc(inventory.quantity) + "'></div>" +
        "<div class='listing-edit-field'><label for='editInventoryUnit'>Unit</label>" +
        "<select id='editInventoryUnit'>" + unitOptions + "</select></div>" +
        "<div class='listing-edit-field'><label for='editInventoryLocation'>Pickup location</label>" +
        "<input id='editInventoryLocation' type='text' list='flowxCitySuggestions' value='" +
        esc(inventory.location) + "'></div>" +
        "<div class='listing-edit-field'><label for='editInventoryPrice'>Price per unit (₹)</label>" +
        "<input id='editInventoryPrice' type='number' min='0' step='0.01' value='" +
        esc(inventory.price) + "'></div>" +
        "<div class='listing-actions'>" +
        "<button type='button' onclick='saveInventoryListing(" + index + ")'>Save changes</button>" +
        "<button type='button' class='listing-cancel' onclick='showInventoryListings()'>Cancel</button>" +
        "</div>";
}

function saveInventoryListing(index) {

    const inventories = loadList("flowxInventory");
    const inventory = inventories[index];

    if (!inventory) {
        showToast("Inventory listing not found.");
        return;
    }

    if (inventoryHasPendingRequests(inventory)) {
        showToast("Resolve pending requests before editing this listing.");
        showInventoryListings();
        return;
    }

    const product = document.getElementById("editInventoryProduct").value.trim();
    const quantityInput = document.getElementById("editInventoryQuantity").value.trim();
    const unit = document.getElementById("editInventoryUnit").value;
    const location = document.getElementById("editInventoryLocation").value.trim();
    const priceInput = document.getElementById("editInventoryPrice").value.trim();
    const quantity = Number(quantityInput);
    const price = Number(priceInput);

    if (!product || !quantityInput || !unit || !location || !priceInput) {
        showToast("Please fill in all inventory details.");
        return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0 ||
        !Number.isFinite(price) || price < 0) {
        showToast("Enter a valid quantity and price.");
        return;
    }

    inventory.product = product;
    inventory.quantity = quantity;
    inventory.unit = unit;
    inventory.location = location;
    inventory.price = price;

    saveList("flowxInventory", inventories);
    updateDashboard();
    showToast("Inventory listing updated.");
    showInventoryListings();
}

function deleteInventoryListing(index) {

    const inventories = loadList("flowxInventory");
    const inventory = inventories[index];

    if (!inventory) {
        showToast("Inventory listing not found.");
        return;
    }

    if (inventoryHasPendingRequests(inventory)) {
        showToast("Resolve pending requests before removing this listing.");
        showInventoryListings();
        return;
    }

    if (!confirm("Remove " + inventory.product + " from inventory?")) {
        return;
    }

    inventories.splice(index, 1);
    saveList("flowxInventory", inventories);
    updateDashboard();
    showToast("Inventory listing removed.");
    showInventoryListings();
}


/* =========================
   BUY INVENTORY PAGE
   ========================= */

function showInventory() {

    const sellerForm =
        document.getElementById("sellerForm");

    const transportForm =
        document.getElementById("transportForm");

    const message =
        document.getElementById("message");

    if (!message) {
        return;
    }

    if (sellerForm) {
        sellerForm.style.display = "none";
    }

    if (transportForm) {
        transportForm.style.display = "none";
    }

    setBuyerInventoryTab("browse");

    const inventories = loadList("flowxInventory");

    if (inventories.length === 0) {

        message.innerHTML =
            "<h2>Available Inventory</h2>" +
            emptyState(
                "📦",
                "No inventory available yet",
                "Sellers can list surplus stock and it will appear here.",
                "<a class='empty-action' href='seller.html'>List inventory</a>"
            );

        return;
    }

    let output =
        "<h2>Available Inventory</h2>" +
        listingFilterMarkup(
            "inventory",
            "Search products or pickup cities",
            inventories.map(function(inventory) {
                return inventory.unit || "units";
            }),
            true
        ) +
        "<div class='inventory-container' id='inventoryCards'>";

    inventories.forEach(function(inventory, index) {

        const reserved =
            reservedQuantity(inventory);

        const free =
            Math.max(roundQty(Number(inventory.quantity) - reserved), 0);
        const unit = inventory.unit || "units";
        const searchText =
            norm(inventory.product + " " + inventory.location);
        const availability = free > 0 ? "available" : "reserved";

        // Nothing left to request: show a notice instead of the form
        if (free <= 0) {

            output +=

                "<div class='inventory-card' " +
                "data-search='" + esc(searchText) + "' " +
                "data-unit='" + esc(norm(unit)) + "' " +
                "data-availability='" + availability + "'>" +

                "<h3>📦 " + esc(inventory.product) + "</h3>" +

                "<p><strong>Pickup:</strong> " +
                esc(inventory.location) +
                "</p>" +

                "<p><strong>Status:</strong> " + badge("Reserved") + "</p>" +

                "<p class='card-note'>Fully reserved by pending requests.</p>" +

                "</div>";

            return;
        }

        output +=

            "<div class='inventory-card' " +
            "data-search='" + esc(searchText) + "' " +
            "data-unit='" + esc(norm(unit)) + "' " +
            "data-availability='" + availability + "'>" +

            "<h3>📦 " + esc(inventory.product) + "</h3>" +

            "<p><strong>Available:</strong> " +
            esc(free) + " " + esc(inventory.unit || "units") +
            "</p>" +

            "<p><strong>Pickup:</strong> " +
            esc(inventory.location) +
            "</p>" +

            "<p><strong>Price:</strong> " +
            esc(money(inventory.price)) + " / " +
            esc(inventory.unit || "unit") +
            "</p>" +

            "<label for='deliveryLocation" + index + "'>Delivery location:</label>" +

            "<input " +
            "type='text' " +
            "id='deliveryLocation" + index + "' " +
            "list='flowxCitySuggestions' " +
            "aria-label='Delivery location for " + esc(inventory.product) + "' " +
            "placeholder='Where should it be delivered?'>" +

            "<label for='requestQuantity" + index + "'>Quantity needed:</label>" +

            "<input " +
            "type='number' " +
            "id='requestQuantity" + index + "' " +
            "aria-label='Quantity of " + esc(inventory.product) + " needed' " +
            "min='1' " +
            "max='" + esc(free) + "' " +
            "placeholder='Enter quantity'>" +

            "<button class='request-button' " +
            "aria-label='Request " + esc(inventory.product) + " inventory' " +
            "onclick='requestInventory(" + index + ")'>" +
            "Request Inventory" +
            "</button>" +

            "</div>";
    });

    output += "</div>";

    message.innerHTML = output;
    bindListingFilters("inventory", true);
}

function setBuyerInventoryTab(active) {

    const tabs = {
        browse: document.getElementById("browseInventoryBtn"),
        requests: document.getElementById("buyerRequestStatusBtn")
    };

    Object.keys(tabs).forEach(function(key) {
        if (tabs[key]) {
            tabs[key].classList.toggle("active", key === active);
            tabs[key].setAttribute("aria-pressed", String(key === active));
        }
    });
}

function showBuyerRequestStatus() {

    setBuyerInventoryTab("requests");

    const message = document.getElementById("message");
    if (!message) {
        return;
    }

    const inventoryRequests = loadList("flowxRequests");
    const transportRequests = loadList("flowxTransportRequests");
    const allRequests = inventoryRequests.concat(transportRequests);

    if (allRequests.length === 0) {
        message.innerHTML =
            "<h2>Request Status</h2>" +
            "<p class='request-scope-note'>Requests saved in this browser are shown here. " +
            "The demo does not have accounts, so it cannot separate requests by person.</p>" +
            emptyState(
                "📋",
                "No requests yet",
                "Browse inventory or available transport to send a request."
            );
        return;
    }

    let output =
        "<h2>Request Status</h2>" +
        "<p class='request-scope-note'>Requests saved in this browser are shown here. " +
        "The demo does not have accounts, so it cannot separate requests by person.</p>";

    if (inventoryRequests.length > 0) {
        output +=
            "<h3 class='request-section-title'>📦 Inventory requests</h3>" +
            requestStatusSummary(inventoryRequests) +
            "<div class='inventory-container'>";

        inventoryRequests.slice().reverse().forEach(function(request) {
            output +=
                "<div class='inventory-card'>" +
                "<h3>📦 " + esc(request.product) + "</h3>" +
                "<p><strong>Quantity:</strong> " + esc(request.quantity) +
                " " + esc(request.unit || "") + "</p>" +
                "<p><strong>Route:</strong> " + esc(request.pickupLocation) +
                " → " + esc(request.deliveryLocation) + "</p>" +
                "<p><strong>Request value:</strong> " +
                esc(money(request.totalValue)) + "</p>" +
                "<p><strong>Status:</strong> " + badge(request.status) + "</p>" +
                statusGuidance(request.status, "inventory") +
                (request.transport
                    ? "<div class='transport-match'><h4>🚚 Matched transport</h4>" +
                        "<p><strong>Vehicle:</strong> " +
                        esc(request.transport.vehicleType) + "</p>" +
                        "<p><strong>Route:</strong> " +
                        esc(request.transport.from) + " → " +
                        esc(request.transport.to) + "</p>" +
                        "<p><strong>Transport price:</strong> " +
                                esc(money(request.transport.price)) + "</p></div>"
                            : "") +
                        "</div>";
        });

        output += "</div>";
    }

    if (transportRequests.length > 0) {
        output +=
            "<h3 class='request-section-title'>🚚 Transport requests</h3>" +
            requestStatusSummary(transportRequests) +
            "<div class='inventory-container'>";

        transportRequests.slice().reverse().forEach(function(request) {
            output +=
                "<div class='inventory-card'>" +
                "<h3>🚚 " + esc(request.vehicleType) + "</h3>" +
                "<p><strong>Capacity:</strong> " + esc(request.capacity) +
                " " + esc(request.capacityUnit || "units") + "</p>" +
                "<p><strong>Route:</strong> " + esc(request.from) +
                " → " + esc(request.to) + "</p>" +
                "<p><strong>Price:</strong> " + esc(money(request.price)) + "</p>" +
                "<p><strong>Status:</strong> " + badge(request.status) + "</p>" +
                statusGuidance(request.status, "transport") +
                (request.transport
                    ? "<div class='transport-match'><h4>🚚 Accepted vehicle</h4>" +
                        "<p><strong>Vehicle:</strong> " +
                        esc(request.transport.vehicleType) + "</p>" +
                        "<p><strong>Route:</strong> " +
                        esc(request.transport.from) + " → " +
                        esc(request.transport.to) + "</p></div>"
                    : "") +
                "</div>";
        });

        output += "</div>";
    }

    message.innerHTML = output;
}

function requestInventory(index) {

    const inventories = loadList("flowxInventory");

    const selectedItem = inventories[index];

    if (!selectedItem) {
        return;
    }

    const quantityInput =
        document.getElementById("requestQuantity" + index);

    const deliveryLocationInput =
        document.getElementById("deliveryLocation" + index);

    const requestedQuantity =
        Number(quantityInput.value);

    const deliveryLocation =
        deliveryLocationInput.value.trim();

    const availableQuantity =
        Number(selectedItem.quantity);

    // Stock already promised to other pending requests
    const reserved =
        reservedQuantity(selectedItem);

    const freeQuantity =
        roundQty(availableQuantity - reserved);


    if (!requestedQuantity || requestedQuantity <= 0) {
        showToast("Please enter a valid quantity.");
        return;
    }

    if (requestedQuantity > freeQuantity) {

        showToast(
            "You cannot request more than the available quantity.\n\n" +
            "Available: " + freeQuantity + " " + (selectedItem.unit || "") +
            (reserved > 0
                ? "\n(" + reserved + " is already reserved by pending requests)"
                : "")
        );

        return;
    }

    if (deliveryLocation === "") {
        showToast("Please enter a delivery location.");
        return;
    }


    const unitPrice =
        Number(selectedItem.price);

    const totalValue =
        round2(requestedQuantity * unitPrice);

    const request = {

        inventoryId: selectedItem.id,

        product: selectedItem.product,

        quantity: requestedQuantity,

        unit: selectedItem.unit,

        pickupLocation: selectedItem.location,

        deliveryLocation: deliveryLocation,

        price: unitPrice,

        totalValue: totalValue,

        status: "Pending"

    };

    const requests = loadList("flowxRequests");

    requests.push(request);

    saveList("flowxRequests", requests);

    updateDashboard();

    showToast(
        "Request sent successfully!\n\n" +
        "Product: " + selectedItem.product +
        "\nQuantity: " + requestedQuantity +
        " " + (selectedItem.unit || "") +
        "\nPrice per unit: ₹" + unitPrice +
        "\nEstimated value: ₹" + totalValue +
        "\nPickup: " + selectedItem.location +
        "\nDelivery: " + deliveryLocation
    );

    // Refresh so the remaining available quantity updates
    showInventory();
}


/* =========================
   SELLER: VIEW REQUESTS
   ========================= */

function showRequests() {

    const sellButton =
        document.getElementById("sellInventoryBtn");

    const requestsButton =
        document.getElementById("viewRequestsBtn");
    const manageButton =
        document.getElementById("manageInventoryBtn");

    if (sellButton) {
        sellButton.classList.remove("active");
        sellButton.setAttribute("aria-pressed", "false");
    }

    if (requestsButton) {
        requestsButton.classList.add("active");
        requestsButton.setAttribute("aria-pressed", "true");
    }

    if (manageButton) {
        manageButton.classList.remove("active");
        manageButton.setAttribute("aria-pressed", "false");
    }

    const sellerForm =
        document.getElementById("sellerForm");

    const transportForm =
        document.getElementById("transportForm");

    const message =
        document.getElementById("message");

    if (sellerForm) {
        sellerForm.style.display = "none";
    }

    if (transportForm) {
        transportForm.style.display = "none";
    }

    if (!message) {
        return;
    }

    const requests = loadList("flowxRequests");
    const availableTransports = loadList("flowxTransport");

    if (requests.length === 0) {

        message.innerHTML =
            "<h2>Inventory Requests</h2>" +
            emptyState(
                "📋",
                "No requests yet",
                "Buyer requests for your listed inventory will show up here."
            );

        return;
    }

    let output =
        "<h2>Inventory Requests</h2>" +
        requestStatusSummary(requests) +
        "<div class='inventory-container'>";

    requests.forEach(function(request, index) {

        const suggestedTransport = request.status === "Pending"
            ? findBestTransport(request, availableTransports)
            : null;

        output +=

            "<div class='inventory-card'>" +

            "<h3>📦 " + esc(request.product) + "</h3>" +

            "<p><strong>Quantity:</strong> " +
            esc(request.quantity) + " " + esc(request.unit || "") +
            "</p>" +

            "<p><strong>Pickup:</strong> " +
            esc(request.pickupLocation) +
            "</p>" +

            "<p><strong>Delivery:</strong> " +
            esc(request.deliveryLocation) +
            "</p>" +

            "<p><strong>Price per unit:</strong> " +
            esc(money(request.price)) +
            "</p>" +

            "<p><strong>Transaction Value:</strong> " +
            esc(money(request.totalValue)) +
            "</p>" +

            "<p><strong>Status:</strong> " +
            badge(request.status) +
            "</p>" +
            statusGuidance(
                request.status,
                "inventory-seller",
                request.status === "Pending" && !suggestedTransport
            );

        if (request.status === "Pending") {

            if (suggestedTransport) {
                const utilization =
                    (suggestedTransport.utilization * 100).toFixed(1) + "%";

                output +=
                    "<div class='transport-match'>" +
                    "<h4>🚚 Suggested truck: " +
                    esc(suggestedTransport.transport.vehicleType) +
                    "</h4>" +
                    "<p><strong>Capacity use:</strong> " +
                    esc(utilization) + " full · " +
                    esc(money(suggestedTransport.transport.price)) +
                    "</p>" +
                    utilBar(utilization) +
                    "</div>";
            } else {
                output +=
                    "<div class='transport-no-match'>" +
                    "<strong>⚠️ No suitable transport</strong>" +
                    "<p>No available vehicle matches this route and quantity yet.</p>" +
                    "</div>";
            }
        }

        if (request.transport) {

            output +=

                "<div class='transport-match'>" +

                "<h4>🚚 Transport Matched</h4>" +

                "<p><strong>Vehicle:</strong> " +
                esc(request.transport.vehicleType) +
                "</p>" +

                "<p><strong>Vehicle capacity:</strong> " +
                esc(request.transport.capacity) + " " +
                esc(request.transport.capacityUnit || "") +
                "</p>" +

                "<p><strong>Route:</strong> " +
                esc(request.transport.from) +
                " → " +
                esc(request.transport.to) +
                "</p>" +

                "<p><strong>Transport Price:</strong> " +
                esc(money(request.transport.price)) +
                "</p>" +

                "<p><strong>Capacity Utilization:</strong> " +
                esc(request.transport.utilization) +
                "</p>" +

                utilBar(request.transport.utilization) +

                "</div>";
        }

        if (request.status === "Pending") {

            output +=

                "<button aria-label='Accept " + esc(request.product) +
                " request' onclick='acceptRequest(" + index + ")'" +
                (suggestedTransport
                    ? ""
                    : " disabled title='Add a matching transport before accepting.'") +
                ">" +
                "Accept Request" +
                "</button>" +

                "<button aria-label='Reject " + esc(request.product) +
                " request' onclick='rejectRequest(" + index + ")'>" +
                "Reject Request" +
                "</button>";
        }

        output += "</div>";
    });

    output += "</div>";

    message.innerHTML = output;
}

function acceptRequest(index) {

    const requests = loadList("flowxRequests");
    const inventories = loadList("flowxInventory");
    const transports = loadList("flowxTransport");

    if (requests.length === 0 || inventories.length === 0) {
        showToast("Inventory or request data not found.");
        return;
    }

    const request = requests[index];

    if (!request) {
        showToast("Request not found.");
        return;
    }

    if (request.status !== "Pending") {
        showToast("This request has already been processed.");
        return;
    }


    // ---- Find matching inventory ----

    const inventoryIndex =
        inventories.findIndex(function(inventory) {
            return sameListing(request, inventory);
        });

    if (inventoryIndex === -1) {
        showToast("Matching inventory was not found.");
        return;
    }

    const inventory = inventories[inventoryIndex];

    const availableQuantity = Number(inventory.quantity);
    const requestedQuantity = Number(request.quantity);

    if (requestedQuantity <= 0) {
        showToast("Invalid requested quantity.");
        return;
    }

    if (requestedQuantity > availableQuantity) {

        showToast(
            "Not enough inventory available.\n\n" +
            "Available: " + availableQuantity +
            "\nRequested: " + requestedQuantity
        );

        return;
    }


    // ---- Find suitable transports ----
    // Utilization is kept in a separate list so it is
    // never written into the saved transport records.

    const best = findBestTransport(request, transports);

    if (!best) {

        showToast(
            "Request cannot be accepted yet.\n\n" +
            "No suitable transport was found for:\n" +
            request.pickupLocation + " → " + request.deliveryLocation +
            "\n\nRequired capacity: " +
            requestedQuantity + " " + (request.unit || "")
        );

        return;
    }

    const matchingTransport = best.transport;
    const requestedQuantityInTransportUnit =
        convertQuantity(
            requestedQuantity,
            request.unit,
            matchingTransport.capacityUnit
        );

    // Record the match BEFORE reducing capacity,
    // so it shows the vehicle's original capacity
    const matchedTransportInfo = {
        vehicleType: matchingTransport.vehicleType,
        capacity: matchingTransport.capacity,
        capacityUnit: matchingTransport.capacityUnit,
        from: matchingTransport.from,
        to: matchingTransport.to,
        price: matchingTransport.price,
        utilization:
            (best.utilization * 100).toFixed(1) + "%"
    };


    // ---- Reduce transport capacity ----

    matchingTransport.capacity = roundQty(
        Number(matchingTransport.capacity) - requestedQuantityInTransportUnit
    );

    // Remove exhausted transport
    if (matchingTransport.capacity <= 0) {

        const transportIndex = transports.indexOf(matchingTransport);

        if (transportIndex !== -1) {
            transports.splice(transportIndex, 1);
        }
    }


    // ---- Deduct inventory ----

    inventory.quantity = roundQty(availableQuantity - requestedQuantity);

    if (inventory.quantity <= 0) {
        inventories.splice(inventoryIndex, 1);
    }


    // ---- Accept request ----

    request.status = "Accepted";
    request.transport = matchedTransportInfo;


    // ---- Record transaction ----

    const transaction = {

        product: request.product,

        quantity: requestedQuantity,

        unit: request.unit,

        pickupLocation: request.pickupLocation,

        deliveryLocation: request.deliveryLocation,

        inventoryValue: request.totalValue,

        transport: {
            vehicleType: matchedTransportInfo.vehicleType,
            capacity: matchedTransportInfo.capacity,
            capacityUnit: matchedTransportInfo.capacityUnit,
            price: matchedTransportInfo.price,
            utilization: matchedTransportInfo.utilization
        },

        totalValue:
            round2(
                Number(request.totalValue) +
                Number(matchedTransportInfo.price)
            ),

        status: "Confirmed",

        timestamp: new Date().toLocaleString()
    };

    const transactions = loadList("flowxTransactions");

    transactions.push(transaction);

    saveList("flowxTransactions", transactions);
    saveList("flowxInventory", inventories);
    saveList("flowxTransport", transports);
    saveList("flowxRequests", requests);

    updateDashboard();

    showToast(
        "Request accepted and transport matched! 🚚\n\n" +
        "Product: " + request.product +
        "\nQuantity: " + requestedQuantity + " " + (request.unit || "") +
        "\nRoute: " + request.pickupLocation + " → " + request.deliveryLocation +
        "\n\nVehicle: " + matchedTransportInfo.vehicleType +
        "\nTransport price: ₹" + matchedTransportInfo.price
    );

    showRequests();
}

function rejectRequest(index) {

    const requests = loadList("flowxRequests");

    if (!requests[index]) {
        showToast("Request not found.");
        return;
    }

    if (requests[index].status !== "Pending") {
        showToast("This request has already been processed.");
        return;
    }

    requests[index].status = "Rejected";

    saveList("flowxRequests", requests);

    updateDashboard();

    showToast("Request rejected.");

    showRequests();
}


/* =========================
   TRANSPORT PAGE
   ========================= */

function setTransportTabs(active) {

    const ids = {
        add: "addTransportBtn",
        available: "availableTransportBtn",
        requests: "transportRequestsBtn",
        manage: "manageTransportBtn"
    };

    Object.keys(ids).forEach(function(key) {

        const button = document.getElementById(ids[key]);

        if (!button) {
            return;
        }

        if (key === active) {
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
        button.setAttribute("aria-pressed", String(key === active));
    });
}

function hideForms() {

    const sellerForm =
        document.getElementById("sellerForm");

    const transportForm =
        document.getElementById("transportForm");

    if (sellerForm) {
        sellerForm.style.display = "none";
    }

    if (transportForm) {
        transportForm.style.display = "none";
    }
}

function showTransport() {

    const transportForm =
        document.getElementById("transportForm");

    const message =
        document.getElementById("message");

    if (transportForm) {
        transportForm.style.display = "block";
    }

    if (message) {
        message.innerHTML = "";
    }

    setTransportTabs("add");
}

function submitTransport() {

    const vehicleType =
        document.getElementById("vehicleType").value.trim();

    const capacityInput =
        document.getElementById("capacity").value.trim();

    const capacityUnit =
        document.getElementById("capacityUnit").value;

    const from =
        document.getElementById("transportFrom").value.trim();

    const to =
        document.getElementById("transportTo").value.trim();

    const priceInput =
        document.getElementById("transportPrice").value.trim();

    if (
        vehicleType === "" ||
        capacityInput === "" ||
        capacityUnit === "" ||
        from === "" ||
        to === "" ||
        priceInput === ""
    ) {
        showToast("Please fill in all transport details.");
        return;
    }

    const capacity = Number(capacityInput);
    const price = Number(priceInput);

    if (capacity <= 0 || price < 0 || isNaN(capacity) || isNaN(price)) {
        showToast("Please enter valid capacity and price.");
        return;
    }

    const transport = {
        id: newId(),
        vehicleType: vehicleType,
        capacity: capacity,
        capacityUnit: capacityUnit,
        from: from,
        to: to,
        price: price
    };

    const transports = loadList("flowxTransport");

    transports.push(transport);

    saveList("flowxTransport", transports);

    updateDashboard();

    showToast(
        "Transport capacity added successfully!\n\n" +
        "Vehicle: " + vehicleType +
        "\nCapacity: " + capacity + " " + capacityUnit +
        "\nFrom: " + from +
        "\nTo: " + to +
        "\nPrice: ₹" + price
    );

    document.getElementById("vehicleType").value = "";
    document.getElementById("capacity").value = "";
    document.getElementById("capacityUnit").value = "";
    document.getElementById("transportFrom").value = "";
    document.getElementById("transportTo").value = "";
    document.getElementById("transportPrice").value = "";
}

// Placeholder for the full "use this transport" booking flow
// (kept for the complete app; currently only shows the selection)
function useTransport(index) {

    const transports = loadList("flowxTransport");

    const selectedTransport = transports[index];

    if (!selectedTransport) {
        showToast("Transport not found.");
        return;
    }

    showToast(
        "Transport selected!\n\n" +
        "Vehicle: " + selectedTransport.vehicleType +
        "\nCapacity: " + selectedTransport.capacity +
        " " + (selectedTransport.capacityUnit || "") +
        "\nRoute: " +
        selectedTransport.from +
        " → " +
        selectedTransport.to +
        "\nPrice: ₹" + selectedTransport.price
    );
}

function showTransportList() {

    setTransportTabs("available");
    hideForms();

    const message =
        document.getElementById("message");

    if (!message) {
        return;
    }

    const transports = loadList("flowxTransport");

    if (transports.length === 0) {

        message.innerHTML =
            "<h2>🚚 Available Transport</h2>" +
            emptyState(
                "🚚",
                "No transport capacity listed",
                "Use “Add Transport Capacity” to register a vehicle and route."
            );

        return;
    }

    let output =
        "<h2>🚚 Available Transport</h2>" +
        listingFilterMarkup(
            "transport",
            "Search vehicles or route cities",
            transports.map(function(transport) {
                return transport.capacityUnit || "units";
            }),
            false
        ) +
        "<div class='inventory-container' id='transportCards'>";

    transports.forEach(function(transport, index) {
        const requestPending = transportHasPendingRequests(transport);

        output +=

            "<div class='inventory-card' " +
            "data-search='" + esc(norm(
                transport.vehicleType + " " + transport.from + " " + transport.to
            )) + "' " +
            "data-unit='" + esc(norm(transport.capacityUnit || "units")) + "'>" +

            "<h3>🚚 " + esc(transport.vehicleType) + "</h3>" +

            "<p><strong>Capacity:</strong> " +
            esc(transport.capacity) + " " +
            esc(transport.capacityUnit || "units") +
            "</p>" +

            "<p><strong>From:</strong> " + esc(transport.from) + "</p>" +

            "<p><strong>To:</strong> " + esc(transport.to) + "</p>" +

            "<p><strong>Transport Price:</strong> " +
            esc(money(transport.price)) +
            "</p>" +

            "<button class='request-button' aria-label='" +
            (requestPending ? "Transport request pending for " : "Request transport from ") +
            esc(transport.from) + " to " + esc(transport.to) + " using " +
            esc(transport.vehicleType) + "' " +
            "onclick='requestTransport(" + index + ")'" +
            (requestPending ? " disabled" : "") + ">" +
            (requestPending ? "Request Pending" : "Request Transport") +
            "</button>" +

            "</div>";
    });

    output += "</div>";

    message.innerHTML = output;
    bindListingFilters("transport", false);
}

function transportHasPendingRequests(transport) {

    return loadList("flowxTransportRequests").some(function(request) {
        if (request.status !== "Pending") {
            return false;
        }

        if (request.transportId && transport.id) {
            return request.transportId === transport.id;
        }

        return (
            request.vehicleType === transport.vehicleType &&
            normalizeCity(request.from) === normalizeCity(transport.from) &&
            normalizeCity(request.to) === normalizeCity(transport.to) &&
            Number(request.capacity) === Number(transport.capacity) &&
            norm(request.capacityUnit) === norm(transport.capacityUnit) &&
            Number(request.price) === Number(transport.price)
        );
    });
}

function showTransportListings() {

    setTransportTabs("manage");
    hideForms();

    const message = document.getElementById("message");
    if (!message) {
        return;
    }

    const transports = loadList("flowxTransport");
    let output =
        "<h2>Manage Transport Listings</h2>" +
        "<p class='listing-management-note'>Listings are stored in this browser. " +
        "There are no user accounts, so anyone using this browser can manage them. " +
        "Listings with pending requests cannot be edited or removed.</p>";

    if (transports.length === 0) {
        message.innerHTML = output + emptyState(
            "🚚",
            "No transport listings",
            "Add transport capacity first, and it will appear here for management.",
            "<a class='empty-action' href='transport.html'>Add transport</a>"
        );
        return;
    }

    output += "<div class='inventory-container'>";

    transports.forEach(function(transport, index) {
        const locked = transportHasPendingRequests(transport);

        output +=
            "<div class='inventory-card'>" +
            "<h3>🚚 " + esc(transport.vehicleType) + "</h3>" +
            "<p><strong>Capacity:</strong> " + esc(transport.capacity) +
            " " + esc(transport.capacityUnit || "units") + "</p>" +
            "<p><strong>From:</strong> " + esc(transport.from) + "</p>" +
            "<p><strong>To:</strong> " + esc(transport.to) + "</p>" +
            "<p><strong>Price:</strong> " + esc(money(transport.price)) + "</p>" +
            (locked
                ? "<p class='card-note'>This listing has a pending request, so it is locked.</p>"
                : "") +
            "<div class='listing-actions'>" +
            "<button type='button' aria-label='Edit " + esc(transport.vehicleType) +
            " listing from " + esc(transport.from) + " to " + esc(transport.to) +
            "' onclick='editTransportListing(" + index + ")'" +
            (locked ? " disabled" : "") + ">Edit</button>" +
            "<button type='button' class='listing-delete' aria-label='Remove " +
            esc(transport.vehicleType) + " listing from " + esc(transport.from) +
            " to " + esc(transport.to) + "' " +
            "onclick='deleteTransportListing(" + index + ")'" +
            (locked ? " disabled" : "") + ">Remove</button>" +
            "</div></div>";
    });

    output += "</div>";
    message.innerHTML = output;
}

function editTransportListing(index) {

    const transports = loadList("flowxTransport");
    const transport = transports[index];

    if (!transport) {
        showToast("Transport listing not found.");
        return;
    }

    if (transportHasPendingRequests(transport)) {
        showToast("Resolve pending requests before editing this listing.");
        showTransportListings();
        return;
    }

    const card = document.querySelectorAll("#message .inventory-card")[index];
    if (!card) {
        showToast("Transport listing could not be opened for editing.");
        return;
    }

    const unitOptions = [
        ["kg", "Kilograms (kg)"],
        ["tonnes", "Tonnes"],
        ["units", "Units"],
        ["boxes", "Boxes"],
        ["litres", "Litres"]
    ].map(function(option) {
        return "<option value='" + option[0] + "'" +
            (transport.capacityUnit === option[0] ? " selected" : "") +
            ">" + option[1] + "</option>";
    }).join("");

    card.innerHTML =
        "<h3>Edit Transport Listing</h3>" +
        "<div class='listing-edit-field'><label for='editTransportVehicle'>Vehicle type</label>" +
        "<input id='editTransportVehicle' type='text' value='" +
        esc(transport.vehicleType) + "'></div>" +
        "<div class='listing-edit-field'><label for='editTransportCapacity'>Available capacity</label>" +
        "<input id='editTransportCapacity' type='number' min='0.01' step='any' value='" +
        esc(transport.capacity) + "'></div>" +
        "<div class='listing-edit-field'><label for='editTransportUnit'>Capacity unit</label>" +
        "<select id='editTransportUnit'>" + unitOptions + "</select></div>" +
        "<div class='listing-edit-field'><label for='editTransportFrom'>Starting location</label>" +
        "<input id='editTransportFrom' type='text' list='flowxCitySuggestions' value='" +
        esc(transport.from) + "'></div>" +
        "<div class='listing-edit-field'><label for='editTransportTo'>Destination</label>" +
        "<input id='editTransportTo' type='text' list='flowxCitySuggestions' value='" +
        esc(transport.to) + "'></div>" +
        "<div class='listing-edit-field'><label for='editTransportPrice'>Transport price (₹)</label>" +
        "<input id='editTransportPrice' type='number' min='0' step='0.01' value='" +
        esc(transport.price) + "'></div>" +
        "<div class='listing-actions'>" +
        "<button type='button' onclick='saveTransportListing(" + index + ")'>Save changes</button>" +
        "<button type='button' class='listing-cancel' onclick='showTransportListings()'>Cancel</button>" +
        "</div>";
}

function saveTransportListing(index) {

    const transports = loadList("flowxTransport");
    const transport = transports[index];

    if (!transport) {
        showToast("Transport listing not found.");
        return;
    }

    if (transportHasPendingRequests(transport)) {
        showToast("Resolve pending requests before editing this listing.");
        showTransportListings();
        return;
    }

    const vehicleType = document.getElementById("editTransportVehicle").value.trim();
    const capacityInput = document.getElementById("editTransportCapacity").value.trim();
    const capacityUnit = document.getElementById("editTransportUnit").value;
    const from = document.getElementById("editTransportFrom").value.trim();
    const to = document.getElementById("editTransportTo").value.trim();
    const priceInput = document.getElementById("editTransportPrice").value.trim();
    const capacity = Number(capacityInput);
    const price = Number(priceInput);

    if (!vehicleType || !capacityInput || !capacityUnit ||
        !from || !to || !priceInput) {
        showToast("Please fill in all transport details.");
        return;
    }

    if (!Number.isFinite(capacity) || capacity <= 0 ||
        !Number.isFinite(price) || price < 0) {
        showToast("Enter a valid capacity and price.");
        return;
    }

    transport.vehicleType = vehicleType;
    transport.capacity = capacity;
    transport.capacityUnit = capacityUnit;
    transport.from = from;
    transport.to = to;
    transport.price = price;

    saveList("flowxTransport", transports);
    updateDashboard();
    showToast("Transport listing updated.");
    showTransportListings();
}

function deleteTransportListing(index) {

    const transports = loadList("flowxTransport");
    const transport = transports[index];

    if (!transport) {
        showToast("Transport listing not found.");
        return;
    }

    if (transportHasPendingRequests(transport)) {
        showToast("Resolve pending requests before removing this listing.");
        showTransportListings();
        return;
    }

    if (!confirm("Remove the " + transport.vehicleType + " listing?")) {
        return;
    }

    transports.splice(index, 1);
    saveList("flowxTransport", transports);
    updateDashboard();
    showToast("Transport listing removed.");
    showTransportListings();
}

function requestTransport(index) {

    const transports = loadList("flowxTransport");

    const selectedTransport = transports[index];

    if (!selectedTransport) {
        showToast("Transport not found.");
        return;
    }

    if (transportHasPendingRequests(selectedTransport)) {
        showToast("A request for this transport is already pending.");
        showTransportList();
        return;
    }

    const transportRequest = {
        transportId: selectedTransport.id,
        vehicleType: selectedTransport.vehicleType,
        capacity: selectedTransport.capacity,
        capacityUnit: selectedTransport.capacityUnit,
        from: selectedTransport.from,
        to: selectedTransport.to,
        price: selectedTransport.price,
        status: "Pending"
    };

    const requests = loadList("flowxTransportRequests");

    requests.push(transportRequest);

    saveList("flowxTransportRequests", requests);

    updateDashboard();

    showToast(
        "Transport request sent successfully! 🚚\n\n" +
        "Vehicle: " + selectedTransport.vehicleType +
        "\nCapacity: " + selectedTransport.capacity +
        " " + selectedTransport.capacityUnit +
        "\nFrom: " + selectedTransport.from +
        "\nTo: " + selectedTransport.to +
        "\nPrice: ₹" + selectedTransport.price
    );
}

function showTransportRequests() {

    setTransportTabs("requests");
    hideForms();

    const message =
        document.getElementById("message");

    if (!message) {
        return;
    }

    const requests = loadList("flowxTransportRequests");

    if (requests.length === 0) {

        message.innerHTML =
            "<h2>🚚 Transport Requests</h2>" +
            emptyState(
                "📋",
                "No transport requests yet",
                "Requests for your listed vehicles will appear here."
            );

        return;
    }

    let output =
        "<h2>🚚 Transport Requests</h2>" +
        requestStatusSummary(requests) +
        "<div class='inventory-container'>";

    requests.forEach(function(request, index) {

        output +=

            "<div class='inventory-card'>" +

            "<h3>🚚 " + esc(request.vehicleType) + "</h3>" +

            "<p><strong>Capacity:</strong> " +
            esc(request.capacity) + " " +
            esc(request.capacityUnit || "units") +
            "</p>" +

            "<p><strong>From:</strong> " + esc(request.from) + "</p>" +

            "<p><strong>To:</strong> " + esc(request.to) + "</p>" +

            "<p><strong>Price:</strong> " + esc(money(request.price)) + "</p>" +

            "<p><strong>Status:</strong> " + badge(request.status) + "</p>" +
            statusGuidance(request.status, "transport-owner");

        if (request.status === "Pending") {

            output +=

                "<button aria-label='Accept transport request from " +
                esc(request.from) + " to " + esc(request.to) +
                "' onclick='acceptTransportRequest(" + index + ")'>" +
                "Accept Transport Request" +
                "</button>" +

                "<button aria-label='Reject transport request from " +
                esc(request.from) + " to " + esc(request.to) +
                "' onclick='rejectTransportRequest(" + index + ")'>" +
                "Reject" +
                "</button>";
        }

        output += "</div>";
    });

    output += "</div>";

    message.innerHTML = output;
}

function acceptTransportRequest(index) {

    const requests = loadList("flowxTransportRequests");
    const transports = loadList("flowxTransport");

    if (requests.length === 0 || transports.length === 0) {
        showToast("Transport request or transport data not found.");
        return;
    }

    const request = requests[index];

    if (!request) {
        showToast("Transport request not found.");
        return;
    }

    if (request.status !== "Pending") {
        showToast("This transport request has already been processed.");
        return;
    }

    const transportIndex = request.transportId
        ? transports.findIndex(function(transport) {
            return transport.id === request.transportId;
        })
        : transports.findIndex(function(transport) {
            return (
                norm(transport.vehicleType) === norm(request.vehicleType) &&
                normalizeCity(transport.from) === normalizeCity(request.from) &&
                normalizeCity(transport.to) === normalizeCity(request.to) &&
                Number(transport.capacity) === Number(request.capacity) &&
                norm(transport.capacityUnit) === norm(request.capacityUnit) &&
                Number(transport.price) === Number(request.price)
            );
        });

    if (transportIndex === -1) {
        showToast("The requested transport is no longer available.");
        return;
    }

    const transport = transports[transportIndex];

    request.status = "Accepted";

    request.transport = {
        vehicleType: transport.vehicleType,
        capacity: transport.capacity,
        capacityUnit: transport.capacityUnit,
        from: transport.from,
        to: transport.to,
        price: transport.price
    };

    // Remove transport from the available list
    transports.splice(transportIndex, 1);

    saveList("flowxTransportRequests", requests);
    saveList("flowxTransport", transports);

    updateDashboard();

    showToast(
        "Transport request accepted! 🚚\n\n" +
        "Vehicle: " + transport.vehicleType +
        "\nRoute: " + transport.from + " → " + transport.to +
        "\nPrice: ₹" + transport.price
    );

    showTransportRequests();
}

function rejectTransportRequest(index) {

    const requests = loadList("flowxTransportRequests");

    if (!requests[index]) {
        showToast("Transport request not found.");
        return;
    }

    if (requests[index].status !== "Pending") {
        showToast("This transport request has already been processed.");
        return;
    }

    requests[index].status = "Rejected";

    saveList("flowxTransportRequests", requests);

    updateDashboard();

    showToast("Transport request rejected.");

    showTransportRequests();
}


/* =========================
   DEMO DATA
   ========================= */

function loadSampleData() {

    const hasData = [
        "flowxInventory",
        "flowxRequests",
        "flowxTransport",
        "flowxTransportRequests",
        "flowxTransactions"
    ].some(function(key) {
        return loadList(key).length > 0;
    });

    if (hasData && !confirm(
        "Load sample data?\n\n" +
        "This replaces everything currently saved in this browser."
    )) {
        return;
    }

    const inventory = {
        id: newId(),
        product: "Rice",
        quantity: 1000,
        unit: "kg",
        location: "Bilaspur",
        price: 20
    };

    const transport = {
        id: newId(),
        vehicleType: "Truck",
        capacity: 1250,
        capacityUnit: "kg",
        from: "Bilaspur",
        to: "Raipur",
        price: 1000
    };

    const sampleRequests = [
        { quantity: 100, deliveryLocation: "Raipur" },
        { quantity: 250, deliveryLocation: "Raipur" },
        { quantity: 100, deliveryLocation: "Durg" }
    ].map(function(sample) {
        return {
            inventoryId: inventory.id,
            product: inventory.product,
            quantity: sample.quantity,
            unit: inventory.unit,
            pickupLocation: inventory.location,
            deliveryLocation: sample.deliveryLocation,
            price: inventory.price,
            totalValue: round2(sample.quantity * inventory.price),
            status: "Pending"
        };
    });

    saveList("flowxInventory", [inventory]);
    saveList("flowxRequests", sampleRequests);
    saveList("flowxTransport", [transport]);
    saveList("flowxTransportRequests", []);
    saveList("flowxTransactions", []);

    updateDashboard();
    showToast("Sample scenario loaded. Current demo data was replaced.");
}

function resetFlowXData() {

    const confirmation =
        confirm(
            "⚠️ Reset FlowX demo data?\n\n" +
            "This will delete:\n" +
            "• Inventory\n" +
            "• Inventory requests\n" +
            "• Transport\n" +
            "• Transport requests\n" +
            "• Transactions\n\n" +
            "This cannot be undone."
        );

    if (!confirmation) {
        return;
    }

    localStorage.removeItem("flowxInventory");
    localStorage.removeItem("flowxRequests");
    localStorage.removeItem("flowxTransport");
    localStorage.removeItem("flowxTransportRequests");
    localStorage.removeItem("flowxTransactions");

    hideForms();

    const message = document.getElementById("message");

    if (message) {
        message.innerHTML =
            "<h2>✅ Demo Reset</h2>" +
            "<p>All FlowX demo data has been cleared.</p>";
    }

    updateDashboard();

    showToast("FlowX demo data has been reset successfully.");
}


/* =========================
   TRANSACTIONS PAGE
   ========================= */

function showTransactions() {

    hideForms();

    const message =
        document.getElementById("message");

    if (!message) {
        return;
    }

    const transactions = loadList("flowxTransactions");

    if (transactions.length === 0) {

        message.innerHTML =
            "<h2>📊 Transactions</h2>" +
            emptyState(
                "🧾",
                "No completed deals yet",
                "When a seller accepts a request and a truck is matched, the deal is recorded here.",
                "<a class='empty-action' href='inventory.html'>Browse inventory</a>"
            );

        return;
    }

    const totalValue = transactions.reduce(function(sum, transaction) {
        return sum + Number(transaction.totalValue || 0);
    }, 0);

    const utilizations = transactions
        .map(function(transaction) {
            return parseFloat(
                transaction.transport && transaction.transport.utilization
            );
        })
        .filter(function(value) {
            return !isNaN(value);
        });

    const averageUtilization =
        utilizations.length === 0
            ? "-"
            : (
                utilizations.reduce(function(a, b) { return a + b; }, 0) /
                utilizations.length
            ).toFixed(1) + "%";

    let output =
        "<h2>📊 Completed Transactions</h2>" +

        "<div class='summary-strip'>" +

        "<div class='summary-item'><strong>" +
        transactions.length +
        "</strong><span>Deals completed</span></div>" +

        "<div class='summary-item'><strong>" +
        esc(money(totalValue)) +
        "</strong><span>Total deal value</span></div>" +

        "<div class='summary-item'><strong>" +
        esc(averageUtilization) +
        "</strong><span>Avg. vehicle utilization</span></div>" +

        "</div>" +

        "<div class='inventory-container'>";

    // Newest deal first
    transactions.slice().reverse().forEach(function(transaction) {

        output +=

            "<div class='inventory-card'>" +

            "<h3>📦 " + esc(transaction.product) + "</h3>" +

            "<p><strong>Quantity:</strong> " +
            esc(transaction.quantity) + " " + esc(transaction.unit || "") +
            "</p>" +

            "<p><strong>Pickup:</strong> " +
            esc(transaction.pickupLocation) +
            "</p>" +

            "<p><strong>Delivery:</strong> " +
            esc(transaction.deliveryLocation) +
            "</p>" +

            "<hr>" +

            "<p><strong>Inventory Value:</strong> " +
            esc(money(transaction.inventoryValue)) +
            "</p>" +

            "<div class='transport-match'>" +

            "<h4>🚚 Transport</h4>" +

            "<p><strong>Vehicle:</strong> " +
            esc(transaction.transport.vehicleType) +
            "</p>" +

            "<p><strong>Vehicle capacity:</strong> " +
            esc(transaction.transport.capacity) + " " +
            esc(transaction.transport.capacityUnit || "") +
            "</p>" +

            "<p><strong>Transport Price:</strong> " +
            esc(money(transaction.transport.price)) +
            "</p>" +

            "<p><strong>Utilization:</strong> " +
            esc(transaction.transport.utilization) +
            "</p>" +

            utilBar(transaction.transport.utilization) +

            "</div>" +

            "<p class='total-row'><strong>Total Value:</strong> " +
            esc(money(transaction.totalValue)) +
            "</p>" +

            "<p><strong>Status:</strong> " +
            badge(transaction.status) +
            "</p>" +

            "<p><strong>Date:</strong> " +
            esc(transaction.timestamp) +
            "</p>" +

            "</div>";
    });

    output += "</div>";

    message.innerHTML = output;
}


/* =========================
   DASHBOARD
   ========================= */

function updateDashboard() {

    // Pending inventory requests + pending transport requests
    const pendingRequests =
        loadList("flowxRequests")
            .concat(loadList("flowxTransportRequests"))
            .filter(function(request) {
                return request.status === "Pending";
            }).length;

    const values = {
        inventoryCount: loadList("flowxInventory").length,
        transportCount: loadList("flowxTransport").length,
        requestCount: pendingRequests,
        transactionCount: loadList("flowxTransactions").length
    };

    Object.keys(values).forEach(function(id) {

        const element = document.getElementById(id);

        if (element) {
            element.innerText = values[id];
        }
    });
}


/* =========================
   PAGE START
   ========================= */

updateDashboard();

if (document.getElementById("message")) {

    const pageTitle = document.title;

    if (pageTitle.includes("Buy Inventory")) {
        showInventory();
    }

    if (pageTitle.includes("Transactions")) {
        showTransactions();
    }

    if (pageTitle.includes("Seller")) {
        showSellerForm();
    }

    if (pageTitle.includes("Transporter")) {
        showTransport();
    }
}

console.log("FLOWX JS LOADED");
//localStorage.removeItem("flowxInventory");
//localStorage.removeItem("flowxRequests");
//localStorage.removeItem("flowxTransport");
//localStorage.removeItem("flowxTransportRequests");
//localStorage.clear()
