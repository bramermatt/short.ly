let db;

// Open IndexedDB
const request = indexedDB.open("shortlyDB", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("urls")) {
        db.createObjectStore("urls", { keyPath: "shortCode" });
    }
};

request.onsuccess = function (event) {
    db = event.target.result;
    checkForRedirect(); // Ensures URLs work immediately after creation
};

request.onerror = function (event) {
    console.error("IndexedDB error:", event.target.errorCode);
};

// Shorten URL
document.getElementById("shortenBtn").addEventListener("click", function () {
    let longUrl = document.getElementById("longUrl").value.trim();

    if (!longUrl) {
        alert("Please enter a URL!");
        return;
    }

    // Automatically prepend "https://" if the URL does not have a protocol
    if (!longUrl.startsWith("http://") && !longUrl.startsWith("https://")) {
        longUrl = "https://" + longUrl;
    }

    // Ensure it is a valid URL format
    try {
        new URL(longUrl); // Validates the URL
    } catch (_) {
        alert("Please enter a valid URL!");
        return;
    }

    let shortCode = generateShortCode();
    storeUrl(shortCode, longUrl);
});

// Generate a random short code
function generateShortCode() {
    return Math.random().toString(36).substring(2, 8);
}

// Store URL mapping in IndexedDB
function storeUrl(shortCode, longUrl) {
    const transaction = db.transaction(["urls"], "readwrite");
    const store = transaction.objectStore("urls");

    const request = store.get(shortCode);

    request.onsuccess = function () {
        if (request.result) {
            alert("Custom short name already exists! Choose another.");
        } else {
            store.add({ shortCode, longUrl });

            const shortUrl = `${window.location.origin}/${shortCode}`;
            document.getElementById("output").innerHTML = `
                <h2>Shortened URL: <a href="${shortUrl}" class="short-link" target="_blank">${shortUrl}</a></h2>
                
                <button onclick="copyToClipboard('${shortUrl}')">Copy URL</button>
            `;

            // Ensure it is available immediately for testing
            checkForRedirect();
        }
    };
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

// Redirect if short URL is visited
function checkForRedirect() {
    const shortCode = window.location.pathname.substring(1);
    if (!shortCode) return;

    const transaction = db.transaction(["urls"], "readonly");
    const store = transaction.objectStore("urls");
    const request = store.get(shortCode);

    request.onsuccess = function () {
        if (request.result) {
            window.location.href = request.result.longUrl;
        }
    };
}

// Clear input fields
document.getElementById("clearBtn").addEventListener("click", function () {
    document.getElementById("longUrl").value = "";
    document.getElementById("output").innerHTML = "";

    const transaction = db.transaction(["urls"], "readwrite");
    const store = transaction.objectStore("urls");
    const clearRequest = store.clear();

    clearRequest.onsuccess = function () {
        alert("All shortened URLs have been cleared.");
        document.getElementById("longUrl").focus(); // Refocus after clearing
    };
});

// Auto-focus on the URL input field when the page loads
document.getElementById("longUrl").focus();
