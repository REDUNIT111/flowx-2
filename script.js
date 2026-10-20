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

function convertToKg(quantity, unit) {

    quantity = Number(quantity);

    if (unit === "kg") {
        return quantity;
    }

    if (unit === "tonnes") {
        return quantity * 1000;
    }

    // Units like boxes, litres, and units
    // cannot be safely converted to kilograms.
    return null;
}

// Unique id for listings, so two listings of the same product
// in the same city are never confused with each other
function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Round money / quantities to 2 decimals (avoids 0.1 * 3 = 0.30000000000000004)
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
        norm(request.pickupLocation) === norm(inventory.location)
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

    const requestedKg =
        convertToKg(request.quantity, request.unit);

    if (requestedKg === null || requestedKg <= 0) {
        return null;
    }

    const candidates = [];

    transports.forEach(function(transport) {

        const transportKg =
            convertToKg(transport.capacity, transport.capacityUnit);

        if (transportKg === null || transportKg <= 0) {
            return;
        }

        if (
            norm(transport.from) === norm(request.pickupLocation) &&
            norm(transport.to) === norm(request.deliveryLocation) &&
            transportKg >= requestedKg
        ) {
            candidates.push({
                transport: transport,
                transportKg: transportKg,
                utilization: requestedKg / transportKg
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

    if (sellButton) {
        sellButton.classList.add("active");
    }

    if (requestsButton) {
        requestsButton.classList.remove("active");
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
        "<div class='inventory-container'>";

    inventories.forEach(function(inventory, index) {

        const reserved =
            reservedQuantity(inventory);

        const free =
            Math.max(round2(Number(inventory.quantity) - reserved), 0);

        // Nothing left to request: show a notice instead of the form
        if (free <= 0) {

            output +=

                "<div class='inventory-card'>" +

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

            "<div class='inventory-card'>" +

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

            "<label>Delivery location:</label>" +

            "<input " +
            "type='text' " +
            "id='deliveryLocation" + index + "' " +
            "placeholder='Where should it be delivered?'>" +

            "<label>Quantity needed:</label>" +

            "<input " +
            "type='number' " +
            "id='requestQuantity" + index + "' " +
            "min='1' " +
            "max='" + esc(free) + "' " +
            "placeholder='Enter quantity'>" +

            "<button class='request-button' " +
            "onclick='requestInventory(" + index + ")'>" +
            "Request Inventory" +
            "</button>" +

            "</div>";
    });

    output += "</div>";

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
        round2(availableQuantity - reserved);


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

    if (sellButton) {
        sellButton.classList.remove("active");
    }

    if (requestsButton) {
        requestsButton.classList.add("active");
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
        "<div class='inventory-container'>";

    requests.forEach(function(request, index) {

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
            "</p>";

        if (request.status === "Pending") {

            const suggestedTransport =
                findBestTransport(request, availableTransports);

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

                "<button onclick='acceptRequest(" + index + ")'>" +
                "Accept Request" +
                "</button>" +

                "<button onclick='rejectRequest(" + index + ")'>" +
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


    // ---- Convert request to kg ----

    const requestedKg =
        convertToKg(requestedQuantity, request.unit);

    if (requestedKg === null) {

        showToast(
            "FlowX currently supports automatic transport matching " +
            "only for kg and tonnes."
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
    const transportCapacityKg = best.transportKg;

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
            (requestedKg / transportCapacityKg * 100).toFixed(1) + "%"
    };


    // ---- Reduce transport capacity ----

    const remainingKg = transportCapacityKg - requestedKg;

    if (matchingTransport.capacityUnit === "tonnes") {
        matchingTransport.capacity = round2(remainingKg / 1000);
    } else {
        matchingTransport.capacity = round2(remainingKg);
    }

    // Remove exhausted transport
    if (matchingTransport.capacity <= 0) {

        const transportIndex = transports.indexOf(matchingTransport);

        if (transportIndex !== -1) {
            transports.splice(transportIndex, 1);
        }
    }


    // ---- Deduct inventory ----

    inventory.quantity = round2(availableQuantity - requestedQuantity);

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
        requests: "transportRequestsBtn"
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
        "<div class='inventory-container'>";

    transports.forEach(function(transport, index) {

        output +=

            "<div class='inventory-card'>" +

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

            "<button class='request-button' " +
            "onclick='requestTransport(" + index + ")'>" +
            "Request Transport" +
            "</button>" +

            "</div>";
    });

    output += "</div>";

    message.innerHTML = output;
}

function requestTransport(index) {

    const transports = loadList("flowxTransport");

    const selectedTransport = transports[index];

    if (!selectedTransport) {
        showToast("Transport not found.");
        return;
    }

    const transportRequest = {
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

            "<p><strong>Status:</strong> " + badge(request.status) + "</p>";

        if (request.status === "Pending") {

            output +=

                "<button onclick='acceptTransportRequest(" + index + ")'>" +
                "Accept Transport Request" +
                "</button>" +

                "<button onclick='rejectTransportRequest(" + index + ")'>" +
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

    const transportIndex =
        transports.findIndex(function(transport) {
            return (
                transport.vehicleType === request.vehicleType &&
                norm(transport.from) === norm(request.from) &&
                norm(transport.to) === norm(request.to) &&
                Number(transport.capacity) >= Number(request.capacity)
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

    const inventory = {
        id: newId(),
        product: "Rice",
        quantity: 1000,
        unit: "kg",
        location: "Bilaspur",
        price: 20
    };

    const transport = {
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
