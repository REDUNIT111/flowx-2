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

    // Active navigation button
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

function submitInventory() {

    const product = document.getElementById("productName").value.trim();
    const quantity = document.getElementById("quantity").value.trim();
    const location = document.getElementById("location").value.trim();
const price = document.getElementById("price").value.trim();
const unit =
    document.getElementById("unit").value;

   if (
    product === "" ||
    quantity === "" ||
    location === "" ||
    price === "" ||
    unit === ""
) {
    alert("Please fill in all fields.");
    return;
}


    // Create the new inventory item

   const inventory = {

    product: product,

    quantity: quantity,

    unit: unit,

    location: location,

    price: price

};


    // Get saved data

    let savedData = localStorage.getItem("flowxInventory");

    let inventories;


    if (savedData) {

        inventories = JSON.parse(savedData);

        // If old data is a single object,
        // convert it into an array

        if (!Array.isArray(inventories)) {
            inventories = [inventories];
        }

    } else {

        inventories = [];

    }


    // Add the new item

    inventories.push(inventory);


    // Save everything

    localStorage.setItem(
        "flowxInventory",
        JSON.stringify(inventories)
    );
    updateDashboard();


    alert("Inventory added successfully!");


    // Clear the form

    document.getElementById("productName").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("unit").value = "";
    document.getElementById("location").value = "";
    document.getElementById("price").value = "";
}


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

    const savedData =
        localStorage.getItem("flowxInventory");

    if (!savedData) {

        message.innerHTML =
            "<h2>Available Inventory</h2>" +
            "<p>No inventory is currently available.</p>";

        return;
    }

    let inventories;

    try {
        inventories = JSON.parse(savedData);
    } catch (error) {

        console.error("Invalid inventory data:", error);

        message.innerHTML =
            "<h2>Available Inventory</h2>" +
            "<p>There was an error loading inventory.</p>";

        return;
    }

    if (!Array.isArray(inventories)) {
        inventories = [inventories];
    }

    if (inventories.length === 0) {

        message.innerHTML =
            "<h2>Available Inventory</h2>" +
            "<p>No inventory is currently available.</p>";

        return;
    }

    let output =
        "<h2>Available Inventory</h2>" +
        "<div class='inventory-container'>";

    inventories.forEach(function(inventory, index) {

        output +=

            "<div class='inventory-card'>" +

            "<h3>📦 " +
            inventory.product +
            "</h3>" +

            "<p><strong>Available:</strong> " +
            inventory.quantity +
            " " +
            (inventory.unit || "units") +
            "</p>" +

            "<p><strong>Pickup:</strong> " +
            inventory.location +
            "</p>" +

            "<p><strong>Price:</strong> ₹" +
            inventory.price +
            " / " +
            (inventory.unit || "unit") +
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
            "max='" + inventory.quantity + "' " +
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
        const addButton =
        document.getElementById("addTransportBtn");

    const availableButton =
        document.getElementById("availableTransportBtn");

    const requestsButton =
        document.getElementById("transportRequestsBtn");

    if (addButton) {
        addButton.classList.add("active");
    }

    if (availableButton) {
        availableButton.classList.remove("active");
    }

    if (requestsButton) {
        requestsButton.classList.remove("active");
    }
}
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

        alert("Please fill in all transport details.");

        return;
    }


    const capacity = Number(capacityInput);
    const price = Number(priceInput);


    if (capacity <= 0 || price < 0 || isNaN(capacity) || isNaN(price)) {

        alert("Please enter valid capacity and price.");

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


    let savedData =
        localStorage.getItem("flowxTransport");


    let transports;


    if (savedData) {

        transports = JSON.parse(savedData);

        if (!Array.isArray(transports)) {
            transports = [transports];
        }

    } else {

        transports = [];

    }


    transports.push(transport);


    localStorage.setItem(
        "flowxTransport",
        JSON.stringify(transports)
    );
     updateDashboard();

    alert(
        "Transport capacity added successfully!\n\n" +
        "Vehicle: " + vehicleType +
        "\nCapacity: " + capacity +
        " " + capacityUnit +
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
function requestInventory(index) {

    const savedData =
        localStorage.getItem("flowxInventory");

    if (!savedData) {
        return;
    }

    let inventories = JSON.parse(savedData);

    if (!Array.isArray(inventories)) {
        inventories = [inventories];
    }

    const selectedItem = inventories[index];

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


    // Check quantity

    if (!requestedQuantity || requestedQuantity <= 0) {

        alert("Please enter a valid quantity.");

        return;
    }


    if (requestedQuantity > availableQuantity) {

        alert(
            "You cannot request more than the available quantity."
        );

        return;
    }


    // Check delivery location

    if (deliveryLocation === "") {

        alert("Please enter a delivery location.");

        return;
    }


    // Calculate transaction value

    const unitPrice =
        Number(selectedItem.price);

    const totalValue =
        requestedQuantity * unitPrice;


    // Create request

    const request = {

        product: selectedItem.product,

        quantity: requestedQuantity,

        unit: selectedItem.unit,

        pickupLocation: selectedItem.location,

        deliveryLocation: deliveryLocation,

        price: unitPrice,

        totalValue: totalValue,

        status: "Pending"

    };


    // Get existing requests

    let requests =
        JSON.parse(
            localStorage.getItem("flowxRequests")
        ) || [];


    // Add request

    requests.push(request);


    // Save requests

    localStorage.setItem(
        "flowxRequests",
        JSON.stringify(requests)
    );
    updateDashboard();

    alert(
        "Request sent successfully!\n\n" +
        "Product: " + selectedItem.product +
        "\nQuantity: " + requestedQuantity +
        " " + (selectedItem.unit || "") +
        "\nPrice per unit: ₹" + unitPrice +
        "\nEstimated value: ₹" + totalValue +
        "\nPickup: " + selectedItem.location +
        "\nDelivery: " + deliveryLocation
    );
}
function showRequests() {

    // Active navigation button
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

    // Keep the rest of your existing showRequests() code below this

    const savedRequests =
        localStorage.getItem("flowxRequests");


    if (!savedRequests) {

        message.innerHTML =
            "<h2>Inventory Requests</h2>" +
            "<p>No requests yet.</p>";

        return;
    }


    const requests = JSON.parse(savedRequests);


    if (requests.length === 0) {

        message.innerHTML =
            "<h2>Inventory Requests</h2>" +
            "<p>No requests yet.</p>";

        return;
    }


    let output =
        "<h2>Inventory Requests</h2>" +
        "<div class='inventory-container'>";


    requests.forEach(function(request, index) {

        output +=

            "<div class='inventory-card'>" +

            "<h3>📦 " +
            request.product +
            "</h3>" +

            "<p><strong>Quantity:</strong> " +
            request.quantity +
            "</p>" +

            "<p><strong>Pickup:</strong> " +
            request.pickupLocation +
            "</p>" +

            "<p><strong>Delivery:</strong> " +
            request.deliveryLocation +
            "</p>" +

            "<p><strong>Price per unit:</strong> ₹" +
            request.price +
            "</p>" +

            "<p><strong>Transaction Value:</strong> ₹" +
            request.totalValue +
            "</p>" +

            "<p><strong>Status:</strong> " +
            request.status +
            "</p>";
            if (request.transport) {

    output +=

        "<div class='transport-match'>" +

        "<h4>🚚 Transport Matched</h4>" +

        "<p><strong>Vehicle:</strong> " +
        request.transport.vehicleType +
        "</p>" +

        "<p><strong>Capacity:</strong> " +
        request.transport.capacity +
        "</p>" +

        "<p><strong>Route:</strong> " +
        request.transport.from +
        " → " +
        request.transport.to +
        "</p>" +

        "<p><strong>Transport Price:</strong> ₹" +
        request.transport.price +
        "</p>" +

        "<p><strong>Capacity Utilization:</strong> " +
        request.transport.utilization +
        "</p>" +

        "</div>";

}


        // Show buttons only for pending requests

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

    const savedRequests =
        localStorage.getItem("flowxRequests");

    const savedInventory =
        localStorage.getItem("flowxInventory");

    const savedTransport =
        localStorage.getItem("flowxTransport");


    if (!savedRequests || !savedInventory) {

        alert("Inventory or request data not found.");

        return;
    }


    const requests =
        JSON.parse(savedRequests);

    let inventories =
        JSON.parse(savedInventory);

    let transports =
        savedTransport
            ? JSON.parse(savedTransport)
            : [];


    // Make sure data is stored as arrays

    if (!Array.isArray(inventories)) {
        inventories = [inventories];
    }

    if (!Array.isArray(transports)) {
        transports = [transports];
    }


    const request =
        requests[index];


    if (!request) {

        alert("Request not found.");

        return;
    }


    if (request.status !== "Pending") {

        alert("This request has already been processed.");

        return;
    }


    // ==========================================
    // FIND MATCHING INVENTORY
    // ==========================================

    const inventoryIndex =
        inventories.findIndex(function(inventory) {

            return (
                inventory.product === request.product &&
                inventory.location === request.pickupLocation
            );

        });


    if (inventoryIndex === -1) {

        alert("Matching inventory was not found.");

        return;
    }


    const inventory =
        inventories[inventoryIndex];


    const availableQuantity =
        Number(inventory.quantity);

    const requestedQuantity =
        Number(request.quantity);


    // ==========================================
    // CHECK INVENTORY
    // ==========================================

    if (requestedQuantity <= 0) {

        alert("Invalid requested quantity.");

        return;
    }


    if (requestedQuantity > availableQuantity) {

        alert(
            "Not enough inventory available.\n\n" +
            "Available: " + availableQuantity +
            "\nRequested: " + requestedQuantity
        );

        return;
    }


    // ==========================================
    // CONVERT REQUEST TO KG
    // ==========================================

    const requestedKg =
        convertToKg(
            requestedQuantity,
            request.unit
        );


    if (requestedKg === null) {

        alert(
            "FlowX currently supports automatic matching " +
            "only for kg and tonnes."
        );

        return;
    }


    // ==========================================
    // FIND SUITABLE TRANSPORT
    // ==========================================

    const matchingTransports =
        transports.filter(function(transport) {

            const transportKg =
                convertToKg(
                    transport.capacity,
                    transport.capacityUnit
                );


            if (transportKg === null) {
                return false;
            }


            return (

                transport.from.toLowerCase() ===
                request.pickupLocation.toLowerCase() &&

                transport.to.toLowerCase() ===
                request.deliveryLocation.toLowerCase() &&

                transportKg >= requestedKg

            );

        });


    // ==========================================
    // NO TRANSPORT FOUND
    // ==========================================

    if (matchingTransports.length === 0) {

        alert(
            "Request cannot be accepted yet.\n\n" +

            "No suitable transport was found for:\n" +

            request.pickupLocation +
            " → " +
            request.deliveryLocation +

            "\n\nRequired capacity: " +

            requestedQuantity +
            " " +
            (request.unit || "")
        );

        return;
    }


    // ==========================================
    // CALCULATE UTILIZATION
    // ==========================================

    matchingTransports.forEach(function(transport) {

        const transportKg =
            convertToKg(
                transport.capacity,
                transport.capacityUnit
            );


        transport.utilization =
            requestedKg / transportKg;

    });


    // ==========================================
    // CHOOSE BEST TRANSPORT
    // ==========================================

    const matchingTransport =
        matchingTransports.reduce(function(best, current) {

            const bestUtilization =
                Number(best.utilization);

            const currentUtilization =
                Number(current.utilization);


            // Prefer higher utilization

            if (
                currentUtilization >
                bestUtilization
            ) {

                return current;

            }


            // If utilization is equal,
            // choose cheaper transport

            if (
                currentUtilization ===
                bestUtilization &&

                Number(current.price) <
                Number(best.price)
            ) {

                return current;

            }


            return best;

        });


    // ==========================================
    // TRANSPORT CAPACITY BEFORE DEDUCTION
    // ==========================================

    const transportCapacityKg =
        convertToKg(
            matchingTransport.capacity,
            matchingTransport.capacityUnit
        );


    // ==========================================
    // CALCULATE REMAINING TRANSPORT CAPACITY
    // ==========================================

    const remainingTransportKg =
        transportCapacityKg -
        requestedKg;


    if (
        remainingTransportKg < 0
    ) {

        alert(
            "Transport does not have enough capacity."
        );

        return;
    }


    // Convert remaining capacity back
    // to the original transport unit

    if (
        matchingTransport.capacityUnit ===
        "tonnes"
    ) {

        matchingTransport.capacity =
            remainingTransportKg / 1000;

    } else {

        matchingTransport.capacity =
            remainingTransportKg;

    }


    // ==========================================
    // SAVE MATCH INFORMATION
    // BEFORE POSSIBLE REMOVAL
    // ==========================================

    const matchedTransportInfo = {

        vehicleType:
            matchingTransport.vehicleType,

        capacity:
            matchingTransport.capacity,

        capacityUnit:
            matchingTransport.capacityUnit,

        from:
            matchingTransport.from,

        to:
            matchingTransport.to,

        price:
            matchingTransport.price,

        utilization:
            (
                requestedKg /
                transportCapacityKg *
                100
            ).toFixed(1) + "%"

    };


    // ==========================================
    // REMOVE EXHAUSTED TRANSPORT
    // ==========================================

    if (
        matchingTransport.capacity <= 0
    ) {

        const transportIndex =
            transports.indexOf(
                matchingTransport
            );


        if (transportIndex !== -1) {

            transports.splice(
                transportIndex,
                1
            );

        }

    }


    // ==========================================
    // DEDUCT INVENTORY
    // ==========================================

    inventory.quantity =
        availableQuantity -
        requestedQuantity;


    // Remove inventory if sold out

    if (
        inventory.quantity <= 0
    ) {

        inventories.splice(
            inventoryIndex,
            1
        );

    }


    // ==========================================
    // ACCEPT REQUEST
    // ==========================================

    request.status =
        "Accepted";


    request.transport =
        matchedTransportInfo;


   // Create transaction record

const transaction = {

    product: request.product,

    quantity: requestedQuantity,

    unit: request.unit,

    pickupLocation:
        request.pickupLocation,

    deliveryLocation:
        request.deliveryLocation,

    inventoryValue:
        request.totalValue,

    transport: {

        vehicleType:
            matchedTransportInfo.vehicleType,

        capacity:
            matchedTransportInfo.capacity,

        capacityUnit:
            matchedTransportInfo.capacityUnit,

        price:
            matchedTransportInfo.price,

        utilization:
            matchedTransportInfo.utilization

    },

    totalValue:
        Number(request.totalValue) +
        Number(matchedTransportInfo.price),

    status: "Confirmed",

    timestamp:
        new Date().toLocaleString()

};


// Get existing transactions

let transactions =
    JSON.parse(
        localStorage.getItem("flowxTransactions")
    ) || [];


// Add new transaction

transactions.push(transaction);


// Save transactions

localStorage.setItem(
    "flowxTransactions",
    JSON.stringify(transactions)
);
updateDashboard();

// Save inventory

localStorage.setItem(
    "flowxInventory",
    JSON.stringify(inventories)
);


// Save transport

localStorage.setItem(
    "flowxTransport",
    JSON.stringify(transports)
);


// Save requests

localStorage.setItem(
    "flowxRequests",
    JSON.stringify(requests)
);
updateDashboard();


    // ==========================================
    // CONFIRMATION
    // ==========================================

    alert(

        "Request accepted and transport matched! 🚚\n\n" +

        "Product: " +
        request.product +

        "\nQuantity: " +
        requestedQuantity +
        " " +
        (request.unit || "") +

        "\nRoute: " +
        request.pickupLocation +
        " → " +
        request.deliveryLocation +

        "\n\nVehicle: " +
        matchingTransport.vehicleType +

        "\nTransport price: ₹" +
        matchingTransport.price

    );


    showRequests();

}
function rejectRequest(index) {

    const savedRequests =
        localStorage.getItem("flowxRequests");

    if (!savedRequests) {
        return;
    }


    const requests = JSON.parse(savedRequests);


    requests[index].status = "Rejected";


    localStorage.setItem(
        "flowxRequests",
        JSON.stringify(requests)
    );
    updateDashboard();

    alert("Request rejected.");


    showRequests();
}
function useTransport(index) {

    const savedData =
        localStorage.getItem("flowxTransport");

    if (!savedData) {
        return;
    }


    let transports = JSON.parse(savedData);

    if (!Array.isArray(transports)) {
        transports = [transports];
    }


    const selectedTransport = transports[index];


    alert(
        "Transport selected!\n\n" +
        "Vehicle: " + selectedTransport.vehicleType +
        "\nCapacity: " + selectedTransport.capacity +
        "\nRoute: " +
        selectedTransport.from +
        " → " +
        selectedTransport.to +
        "\nPrice: ₹" + selectedTransport.price
    );
}
function showTransportList() {
        const addButton =
        document.getElementById("addTransportBtn");

    const availableButton =
        document.getElementById("availableTransportBtn");

    const requestsButton =
        document.getElementById("transportRequestsBtn");

    if (addButton) {
        addButton.classList.remove("active");
    }

    if (availableButton) {
        availableButton.classList.add("active");
    }

    if (requestsButton) {
        requestsButton.classList.remove("active");
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

    const savedData =
        localStorage.getItem("flowxTransport");


    if (!savedData) {

        message.innerHTML =
            "<h2>🚚 Available Transport</h2>" +
            "<p>No transport capacity is currently available.</p>";

        return;
    }


    let transports = JSON.parse(savedData);


    if (!Array.isArray(transports)) {
        transports = [transports];
    }


    if (transports.length === 0) {

        message.innerHTML =
            "<h2>🚚 Available Transport</h2>" +
            "<p>No transport capacity is currently available.</p>";

        return;
    }


    let output =
        "<h2>🚚 Available Transport</h2>" +
        "<div class='inventory-container'>";


    transports.forEach(function(transport, index) {

        output +=

            "<div class='inventory-card'>" +

            "<h3>🚚 " +
            transport.vehicleType +
            "</h3>" +

            "<p><strong>Capacity:</strong> " +
transport.capacity +
" " +
(transport.capacityUnit || "units") +
"</p>" +

            "<p><strong>From:</strong> " +
            transport.from +
            "</p>" +

            "<p><strong>To:</strong> " +
            transport.to +
            "</p>" +

            "<p><strong>Transport Price:</strong> ₹" +
transport.price +
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

    const savedData =
        localStorage.getItem("flowxTransport");

    if (!savedData) {
        return;
    }


    let transports = JSON.parse(savedData);


    if (!Array.isArray(transports)) {
        transports = [transports];
    }


    const selectedTransport =
        transports[index];


    if (!selectedTransport) {

        alert("Transport not found.");

        return;
    }


    // Create transport request

    const transportRequest = {

        vehicleType:
            selectedTransport.vehicleType,

        capacity:
            selectedTransport.capacity,

        capacityUnit:
            selectedTransport.capacityUnit,

        from:
            selectedTransport.from,

        to:
            selectedTransport.to,

        price:
            selectedTransport.price,

        status:
            "Pending"

    };


    // Get existing requests

    let requests =
        JSON.parse(
            localStorage.getItem(
                "flowxTransportRequests"
            )
        ) || [];


    // Add request

    requests.push(transportRequest);


    // Save requests

    localStorage.setItem(
        "flowxTransportRequests",
        JSON.stringify(requests)
    );


    alert(
        "Transport request sent successfully! 🚚\n\n" +

        "Vehicle: " +
        selectedTransport.vehicleType +

        "\nCapacity: " +
        selectedTransport.capacity +
        " " +
        selectedTransport.capacityUnit +

        "\nFrom: " +
        selectedTransport.from +

        "\nTo: " +
        selectedTransport.to +

        "\nPrice: ₹" +
        selectedTransport.price
    );
}
function acceptTransportRequest(index) {

    const savedRequests =
        localStorage.getItem("flowxTransportRequests");

    const savedTransport =
        localStorage.getItem("flowxTransport");


    if (!savedRequests || !savedTransport) {

        alert("Transport request or transport data not found.");

        return;
    }


    const requests =
        JSON.parse(savedRequests);

    let transports =
        JSON.parse(savedTransport);


    if (!Array.isArray(transports)) {
        transports = [transports];
    }


    const request =
        requests[index];


    if (!request) {

        alert("Transport request not found.");

        return;
    }


    if (request.status !== "Pending") {

        alert(
            "This transport request has already been processed."
        );

        return;
    }


    // Find matching transport

    const transportIndex =
        transports.findIndex(function(transport) {

            return (

                transport.vehicleType ===
                request.vehicleType &&

                transport.from.toLowerCase() ===
                request.from.toLowerCase() &&

                transport.to.toLowerCase() ===
                request.to.toLowerCase() &&

                Number(transport.capacity) >=
                Number(request.capacity)

            );

        });


    if (transportIndex === -1) {

        alert(
            "The requested transport is no longer available."
        );

        return;
    }


    const transport =
        transports[transportIndex];


    // Accept request

    request.status = "Accepted";


    // Attach transport information

    request.transport = {

        vehicleType:
            transport.vehicleType,

        capacity:
            transport.capacity,

        capacityUnit:
            transport.capacityUnit,

        from:
            transport.from,

        to:
            transport.to,

        price:
            transport.price

    };


    // Remove transport from available list

    transports.splice(transportIndex, 1);


    // Save updated data

    localStorage.setItem(
        "flowxTransportRequests",
        JSON.stringify(requests)
    );


    localStorage.setItem(
        "flowxTransport",
        JSON.stringify(transports)
    );
    updateDashboard();

    alert(
        "Transport request accepted! 🚚\n\n" +

        "Vehicle: " +
        transport.vehicleType +

        "\nRoute: " +
        transport.from +
        " → " +
        transport.to +

        "\nPrice: ₹" +
        transport.price
    );


    showTransportRequests();
}
function rejectTransportRequest(index) {

    const savedRequests =
        localStorage.getItem("flowxTransportRequests");


    if (!savedRequests) {

        return;
    }


    const requests =
        JSON.parse(savedRequests);


    if (!requests[index]) {

        alert("Transport request not found.");

        return;
    }


    if (requests[index].status !== "Pending") {

        alert(
            "This transport request has already been processed."
        );

        return;
    }


    requests[index].status =
        "Rejected";


    localStorage.setItem(
        "flowxTransportRequests",
        JSON.stringify(requests)
    );
    updateDashboard();

    alert("Transport request rejected.");


    showTransportRequests();
}
function showTransportRequests() {
        const addButton =
        document.getElementById("addTransportBtn");

    const availableButton =
        document.getElementById("availableTransportBtn");

    const requestsButton =
        document.getElementById("transportRequestsBtn");

    if (addButton) {
        addButton.classList.remove("active");
    }

    if (availableButton) {
        availableButton.classList.remove("active");
    }

    if (requestsButton) {
        requestsButton.classList.add("active");
    }
    document.getElementById("sellerForm").style.display = "none";
    document.getElementById("transportForm").style.display = "none";

    const message =
        document.getElementById("message");

    const savedRequests =
        localStorage.getItem("flowxTransportRequests");


    if (!savedRequests) {

        message.innerHTML =
            "<h2>🚚 Transport Requests</h2>" +
            "<p>No transport requests yet.</p>";

        return;
    }


    const requests =
        JSON.parse(savedRequests);


    if (requests.length === 0) {

        message.innerHTML =
            "<h2>🚚 Transport Requests</h2>" +
            "<p>No transport requests yet.</p>";

        return;
    }


    let output =
        "<h2>🚚 Transport Requests</h2>" +
        "<div class='inventory-container'>";


    requests.forEach(function(request, index) {

        output +=

            "<div class='inventory-card'>" +

            "<h3>🚚 " +
            request.vehicleType +
            "</h3>" +

            "<p><strong>Capacity:</strong> " +
            request.capacity +
            " " +
            (request.capacityUnit || "units") +
            "</p>" +

            "<p><strong>From:</strong> " +
            request.from +
            "</p>" +

            "<p><strong>To:</strong> " +
            request.to +
            "</p>" +

            "<p><strong>Price:</strong> ₹" +
            request.price +
            "</p>" +

            "<p><strong>Status:</strong> " +
            request.status +
            "</p>";


        // Show buttons only for pending requests

        if (request.status === "Pending") {

            output +=

                "<button onclick='acceptTransportRequest(" +
                index +
                ")'>" +

                "Accept Transport Request" +

                "</button>" +

                "<button onclick='rejectTransportRequest(" +
                index +
                ")'>" +

                "Reject" +

                "</button>";

        }


        output += "</div>";

    });


    output += "</div>";

    message.innerHTML = output;
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

    document.getElementById("message").innerHTML =
        "<h2>✅ Demo Reset</h2>" +
        "<p>All FlowX demo data has been cleared.</p>";

    updateDashboard();
    alert("FlowX demo data has been reset successfully.");
}
function showTransactions() {

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

    // Keep the rest of showTransactions() below this
    const savedTransactions =
        localStorage.getItem("flowxTransactions");


    // No transactions yet

    if (!savedTransactions) {

        message.innerHTML =
            "<h2>📊 Transactions</h2>" +
            "<p>No completed transactions yet.</p>";

        return;
    }


    const transactions =
        JSON.parse(savedTransactions);


    // Empty transaction list

    if (transactions.length === 0) {

        message.innerHTML =
            "<h2>📊 Transactions</h2>" +
            "<p>No completed transactions yet.</p>";

        return;
    }


    let output =
        "<h2>📊 Completed Transactions</h2>" +
        "<div class='inventory-container'>";


    transactions.forEach(function(transaction, index) {

        output +=

            "<div class='inventory-card'>" +

            "<h3>📦 " +
            transaction.product +
            "</h3>" +

            "<p><strong>Quantity:</strong> " +
            transaction.quantity +
            " " +
            (transaction.unit || "") +
            "</p>" +

            "<p><strong>Pickup:</strong> " +
            transaction.pickupLocation +
            "</p>" +

            "<p><strong>Delivery:</strong> " +
            transaction.deliveryLocation +
            "</p>" +

            "<hr>" +

            "<p><strong>Inventory Value:</strong> ₹" +
            transaction.inventoryValue +
            "</p>" +

            "<div class='transport-match'>" +

            "<h4>🚚 Transport</h4>" +

            "<p><strong>Vehicle:</strong> " +
            transaction.transport.vehicleType +
            "</p>" +

            "<p><strong>Capacity:</strong> " +
            transaction.transport.capacity +
            " " +
            (transaction.transport.capacityUnit || "") +
            "</p>" +

            "<p><strong>Transport Price:</strong> ₹" +
            transaction.transport.price +
            "</p>" +

            "<p><strong>Utilization:</strong> " +
            transaction.transport.utilization +
            "</p>" +

            "</div>" +

            "<p><strong>Total Value:</strong> ₹" +
            transaction.totalValue +
            "</p>" +

            "<p><strong>Status:</strong> " +
            transaction.status +
            "</p>" +

            "<p><strong>Date:</strong> " +
            transaction.timestamp +
            "</p>" +

            "</div>";

    });


    output += "</div>";

    message.innerHTML = output;
}
function updateDashboard() {

    // =========================
    // INVENTORY COUNT
    // =========================

    const savedInventory =
        localStorage.getItem("flowxInventory");

    let inventories =
        savedInventory
            ? JSON.parse(savedInventory)
            : [];

    if (!Array.isArray(inventories)) {
        inventories = [inventories];
    }


    // =========================
    // TRANSPORT COUNT
    // =========================

    const savedTransport =
        localStorage.getItem("flowxTransport");

    let transports =
        savedTransport
            ? JSON.parse(savedTransport)
            : [];

    if (!Array.isArray(transports)) {
        transports = [transports];
    }


    // =========================
    // INVENTORY REQUEST COUNT
    // =========================

    const savedRequests =
        localStorage.getItem("flowxRequests");

    let requests =
        savedRequests
            ? JSON.parse(savedRequests)
            : [];

    if (!Array.isArray(requests)) {
        requests = [requests];
    }

    const pendingRequests =
        requests.filter(function(request) {
            return request.status === "Pending";
        }).length;


    // =========================
    // TRANSACTION COUNT
    // =========================

    const savedTransactions =
        localStorage.getItem("flowxTransactions");

    let transactions =
        savedTransactions
            ? JSON.parse(savedTransactions)
            : [];

    if (!Array.isArray(transactions)) {
        transactions = [transactions];
    }


    // =========================
    // UPDATE DASHBOARD
    // =========================

    const inventoryCount =
        document.getElementById("inventoryCount");

    const transportCount =
        document.getElementById("transportCount");

    const requestCount =
        document.getElementById("requestCount");

    const transactionCount =
        document.getElementById("transactionCount");


    if (inventoryCount) {
        inventoryCount.innerText =
            inventories.length;
    }

    if (transportCount) {
        transportCount.innerText =
            transports.length;
    }

    if (requestCount) {
        requestCount.innerText =
            pendingRequests;
    }

    if (transactionCount) {
        transactionCount.innerText =
            transactions.length;
    }
}

updateDashboard();

if (document.getElementById("message")) {

    const pageTitle = document.title;

    if (pageTitle.includes("Buy Inventory")) {
        showInventory();
    }

    if (pageTitle.includes("Transactions")) {
        showTransactions();
    }

}

console.log("FLOWX JS LOADED");
//localStorage.removeItem("flowxInventory");
//localStorage.removeItem("flowxRequests");
//localStorage.removeItem("flowxTransport");
//localStorage.removeItem("flowxTransportRequests");
//localStorage.clear()
