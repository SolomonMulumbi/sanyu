import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-storage.js";
import { getDatabase, query, limitToFirst, orderByKey, orderByChild, equalTo, ref, remove, push, get, update, onValue, child, set, runTransaction } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";
import {
    getAuth,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-auth.js";


const firebaseConfig = {
    apiKey: "AIzaSyCi_hufIZTzsYtdPGQtvtmKmAkkrydmn_A",
    authDomain: "abbah-83a7b.firebaseapp.com",
    databaseURL: "https://abbah-83a7b-default-rtdb.firebaseio.com",
    projectId: "abbah-83a7b",
    storageBucket: "abbah-83a7b.appspot.com",
    messagingSenderId: "379729759051",
    appId: "1:379729759051:web:e75528d61b02d1e4f536ce",
    measurementId: "G-H41J2WMR6S"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);
const $ = id => document.getElementById(id);

// Separate Firebase app used only for client phone OTP.



const loginForm = $("loginForm");

if (loginForm) {
    onAuthStateChanged(auth, user => {
        if (user) window.location.href = "dashboard.html";
    });

    loginForm.addEventListener("submit", async e => {
        e.preventDefault();

        const email = $("loginEmail").value.trim();
        const password = $("loginPassword").value;

        if (!email || !password) {
            showToast("Enter your email and password.", "error");
            return;
        }

        try {
            showLoader("Signing in...");
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error(error);
            hideLoader();

            let message = "Unable to login.";

            if (error.code === "auth/user-not-found") message = "Account not found.";
            else if (error.code === "auth/wrong-password") message = "Incorrect password.";
            else if (error.code === "auth/invalid-email") message = "Enter a valid email address.";
            else if (error.code === "auth/invalid-login-credentials") message = "Incorrect email or password.";
            else if (error.code === "auth/too-many-requests") message = "Too many attempts. Try again later.";

            showToast(message, "error");
        }
    });
}

$("createAccountBtn")?.addEventListener("click", () => {
    window.location.href = "create-account.html";
});


// ================= CREATE MARKETEER ACCOUNT =================

const marketerRegistrationForm =
    $("marketeerRegistrationForm");

if (marketerRegistrationForm) {

    marketerRegistrationForm.addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            const fullName =
                $("marketeerFullName").value.trim();

            const phone =
                normalizePhone(
                    $("marketeerPhone").value
                );

            const email =
                $("marketeerEmail")
                    .value
                    .trim()
                    .toLowerCase();

            const password =
                $("marketeerPassword").value;

            const confirmPassword =
                $("confirmPassword").value;

            const createButton =
                $("createMarketeerBtn");


            // ================= VALIDATION =================

            if (
                !fullName ||
                !phone ||
                !email ||
                !password ||
                !confirmPassword
            ) {
                showToast(
                    "Complete all required fields.",
                    "error"
                );
                return;
            }


            if (
                phone.length !== 12 ||
                !phone.startsWith("256")
            ) {
                showToast(
                    "Enter a valid Ugandan phone number.",
                    "error"
                );
                return;
            }


            if (password.length < 6) {
                showToast(
                    "Password must have at least 6 characters.",
                    "error"
                );
                return;
            }


            if (password !== confirmPassword) {
                showToast(
                    "Passwords do not match.",
                    "error"
                );
                return;
            }


            try {

                // Prevent double clicking
                if (createButton) {
                    createButton.disabled = true;
                    createButton.textContent =
                        "Creating Account...";
                }

                showLoader(
                    "Creating your account..."
                );


                // ================= FIREBASE AUTH =================

                const credential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                const user =
                    credential.user;


                // ================= MARKETEER PROFILE =================

                const marketerData = {

                    uid: user.uid,

                    fullName: fullName,

                    phone: phone,

                    email: email,

                    photoURL:
                        user.photoURL || "",

                    status: "active",

                    createdAt:
                        Date.now()
                };


                await set(
                    ref(
                        database,
                        `bodaProgram/marketers/${user.uid}`
                    ),
                    marketerData
                );


                console.log(
                    "Marketeer account created:",
                    marketerData
                );


                hideLoader();

                showToast(
                    "Account created successfully.",
                    "success"
                );


                marketerRegistrationForm.reset();


                setTimeout(() => {

                    window.location.href =
                        "dashboard.html";

                }, 700);


            } catch (error) {

                console.error(
                    "Create account error:",
                    error
                );

                hideLoader();


                let message =
                    "Failed to create account.";


                if (
                    error.code ===
                    "auth/email-already-in-use"
                ) {

                    message =
                        "An account already exists with this email.";

                }

                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    message =
                        "Enter a valid email address.";

                }

                else if (
                    error.code ===
                    "auth/weak-password"
                ) {

                    message =
                        "Password must have at least 6 characters.";

                }

                else if (
                    error.code ===
                    "auth/network-request-failed"
                ) {

                    message =
                        "Network error. Check your internet connection.";

                }

                else if (
                    error.code ===
                    "auth/operation-not-allowed"
                ) {

                    message =
                        "Email and password account creation is not enabled.";

                }


                showToast(
                    message,
                    "error"
                );


                // Re-enable button
                if (createButton) {

                    createButton.disabled =
                        false;

                    createButton.textContent =
                        "Create Account";
                }

            }

        }
    );

}




function normalizePhone(phone) {
    let number = String(phone || "").replace(/\D/g, "");
    if (number.startsWith("0") && number.length === 10) number = "256" + number.substring(1);
    else if (number.length === 9) number = "256" + number;
    return number;
}

function formatPhone(phone) {
    const number = normalizePhone(phone);
    if (number.length !== 12) return phone || "";
    return `0${number.substring(3, 6)} ${number.substring(6, 9)} ${number.substring(9, 12)}`;
}

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("en-UG");
}

function formatDate(timestamp) {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("en-UG", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showLoader(message = "Please wait...") {
    let loader = $("globalLoader");

    if (!loader) {
        loader = document.createElement("div");
        loader.id = "globalLoader";
        loader.className = "loader-overlay";
        loader.innerHTML = `<div class="loader"></div><p id="loaderMessage"></p>`;
        document.body.appendChild(loader);
    }

    $("loaderMessage").textContent = message;
    loader.classList.remove("hidden");
}

function hideLoader() {
    $("globalLoader")?.classList.add("hidden");
}

function showToast(message, type = "info") {
    document.querySelector(".toast")?.remove();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}






const stageRegistrationForm = $("stageRegistrationForm");

if (stageRegistrationForm) {
    stageRegistrationForm.addEventListener("submit", async e => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            showToast("Please login again.", "error");
            return;
        }

        const stageName = $("stageName").value.trim();
        const area = $("stageArea").value.trim();
        const chairmanName = $("chairmanName").value.trim();
        const chairmanPhone = normalizePhone($("chairmanPhone").value);
        const district = $("stageDistrict").value.trim();
        const notes = $("stageNotes").value.trim();

        if (!stageName || !area || !chairmanName || !chairmanPhone) {
            showToast("Complete all required fields.", "error");
            return;
        }

        if (chairmanPhone.length !== 12 || !chairmanPhone.startsWith("256")) {
            showToast("Enter a valid Ugandan phone number.", "error");
            return;
        }

        try {
            showLoader("Registering stage...");

            const newStageRef = push(ref(database, "bodaProgram/stages"));

            await set(newStageRef, {
                stageId: newStageRef.key,
                stageName,
                area,
                district,
                chairmanName,
                chairmanPhone,
                notes,
                createdBy: user.uid,
                createdAt: Date.now(),
                status: "active"
            });

            hideLoader();
            showToast("Stage registered successfully.", "success");
            stageRegistrationForm.reset();

            setTimeout(() => {
                window.location.href = "stages.html";
            }, 800);

        } catch (error) {
            console.error(error);
            hideLoader();
            showToast("Failed to register stage.", "error");
        }
    });
}



// ================= COMMUNITY REGISTRATION =================

const communityRegistrationForm = $("communityRegistrationForm");

if (communityRegistrationForm) {
    communityRegistrationForm.addEventListener("submit", async e => {
        e.preventDefault();

        const user = auth.currentUser;

        if (!user) {
            showToast("Please login again.", "error");
            return;
        }

        const type = $("registrationType").value;
        const fullName = $("clientName").value.trim();
        const phone = normalizePhone($("clientPhone").value);
        const nationalId = $("clientNationalId")?.value.trim() || "";

        if (!fullName || !phone) {
            showToast("Enter the name and phone number.", "error");
            return;
        }

        if (phone.length !== 12 || !phone.startsWith("256")) {
            showToast("Enter a valid Ugandan phone number.", "error");
            return;
        }

        if (type !== "rider" && type !== "pregnant") {
            showToast("Select a registration category.", "error");
            return;
        }

        try {
            showLoader("Checking registration...");

            // Check whether this phone is already registered
            const phoneIndexRef = ref(
                database,
                `bodaProgram/phoneIndex/${phone}`
            );

            const phoneSnapshot = await get(phoneIndexRef);

            if (phoneSnapshot.exists()) {
                hideLoader();
                showToast(
                    "This phone number is already registered.",
                    "error"
                );
                return;
            }

            // Get marketer information
            const marketerSnapshot = await get(
                ref(
                    database,
                    `bodaProgram/marketers/${user.uid}`
                )
            );

            const marketer = marketerSnapshot.exists()
                ? marketerSnapshot.val()
                : {};

            const marketerName =
                marketer.fullName ||
                user.email ||
                "Marketer";

            // ================= RIDER =================

            if (type === "rider") {
                const stageSelect = $("stageSelect");
                const stageId = stageSelect?.value || "";

                if (!stageId) {
                    hideLoader();
                    showToast(
                        "Select the rider's Boda Boda stage.",
                        "error"
                    );
                    return;
                }

                const stageSnapshot = await get(
                    ref(
                        database,
                        `bodaProgram/stages/${stageId}`
                    )
                );

                if (!stageSnapshot.exists()) {
                    hideLoader();
                    showToast(
                        "Selected stage was not found.",
                        "error"
                    );
                    return;
                }

                const stage = stageSnapshot.val();

                const riderRef = push(
                    ref(database, "bodaProgram/riders")
                );

                const riderId = riderRef.key;

                showLoader("Registering rider...");

                await set(riderRef, {
                    riderId,
                    fullName,
                    phone,
                    phoneNormalized: phone,
                    nationalId,
                    stageId,
                    stageName: stage.stageName || "",
                    marketerId: user.uid,
                    marketerName,
                    otpVerified: false,
                    verifiedAt: null,
                    registeredAt: Date.now(),
                    status: "pending"
                });

                await set(phoneIndexRef, {
                    registrationId: riderId,
                    type: "rider"
                });

                // Store rider information for OTP page
                sessionStorage.setItem(
                    "pendingRegistrationId",
                    riderId
                );

                sessionStorage.setItem(
                    "pendingRegistrationType",
                    "rider"
                );

                sessionStorage.setItem(
                    "pendingRegistrationPhone",
                    phone
                );

                sessionStorage.setItem(
                    "pendingRegistrationName",
                    fullName
                );
            }

            // ================= PREGNANT WOMAN =================

            else {
                const womanRef = push(
                    ref(
                        database,
                        "bodaProgram/pregnantWomen"
                    )
                );

                const womanId = womanRef.key;

                showLoader(
                    "Registering pregnant woman..."
                );

                await set(womanRef, {
                    registrationId: womanId,
                    fullName,
                    phone,
                    phoneNormalized: phone,
                    marketerId: user.uid,
                    marketerName,

                    // Hospital/reception verification
                    arrived: false,
                    arrivedAt: null,

                    paymentConfirmed: false,
                    paymentConfirmedAt: null,

                    approved: false,
                    approvedAt: null,
                    approvedBy: null,

                    registeredAt: Date.now(),
                    status: "registered"
                });

                await set(phoneIndexRef, {
                    registrationId: womanId,
                    type: "pregnant"
                });

                // Used by success page
                sessionStorage.setItem(
                    "pendingRegistrationId",
                    womanId
                );

                sessionStorage.setItem(
                    "pendingRegistrationType",
                    "pregnant"
                );

                sessionStorage.setItem(
                    "pendingRegistrationPhone",
                    phone
                );

                sessionStorage.setItem(
                    "pendingRegistrationName",
                    fullName
                );
            }

            hideLoader();

            showToast(
                "Registration saved.",
                "success"
            );

            // Rider goes to OTP.
            // Pregnant woman does NOT use OTP.
            setTimeout(() => {
                if (type === "rider") {
                    window.location.href =
                        "verify-otp.html";
                } else {
                    window.location.href =
                        "registration-success.html";
                }
            }, 600);

        } catch (error) {
            console.error(
                "Registration error:",
                error
            );

            hideLoader();

            showToast(
                "Failed to save registration.",
                "error"
            );
        }
    });
}



function loadStages() {
    const stageList = $("stageList");
    const stageSelect = $("stageSelect");

    onValue(ref(database, "bodaProgram/stages"), snapshot => {
        const stages = [];

        snapshot.forEach(childSnapshot => {
            const stage = childSnapshot.val();
            if (stage.status === "active") stages.push(stage);
        });

        stages.sort((a, b) => (a.stageName || "").localeCompare(b.stageName || ""));

        if (stageSelect) {
            stageSelect.innerHTML = `<option value="">Select rider's stage</option>`;

            stages.forEach(stage => {
                stageSelect.innerHTML += `
                    <option value="${stage.stageId}">
                        ${escapeHTML(stage.stageName)} - ${escapeHTML(stage.area)}
                    </option>
                `;
            });
        }

        if (stageList) displayStages(stages);
    }, error => {
        console.error(error);
        showToast("Failed to load stages.", "error");
    });
}

function displayStages(stages) {
    const stageList = $("stageList");
    if (!stageList) return;

    if (!stages.length) {
        stageList.innerHTML = `
            <div class="stage-empty">
                <div class="stage-empty-icon">📍</div>
                <h3>No stages registered</h3>
                <p>Your registered Boda Boda stages will appear here.</p>
                <a href="add-stage.html" class="stage-empty-button">
                    + Register Stage
                </a>
            </div>
        `;
        return;
    }

    stageList.innerHTML = stages.map(stage => {
        const stageName = escapeHTML(stage.stageName || "Unnamed Stage");
        const area = escapeHTML(stage.area || "Location not provided");
        const district = stage.district
            ? escapeHTML(stage.district)
            : "";

        const chairman = escapeHTML(
            stage.chairmanName || "Not provided"
        );

        const phone = stage.chairmanPhone
            ? formatPhone(stage.chairmanPhone)
            : "Not provided";

        const callPhone = stage.chairmanPhone
            ? "+" + normalizePhone(stage.chairmanPhone)
            : "";

        return `
            <div
                class="stage-card"
                data-name="${escapeHTML((stage.stageName || "").toLowerCase())}"
                data-area="${escapeHTML((stage.area || "").toLowerCase())}"
            >

                <!-- LEFT SIDE -->
                <div class="stage-left">

                    <div class="stage-title-row">
                        <div class="stage-location-icon">
                            📍
                        </div>

                        <div class="stage-title-content">
                            <div class="stage-name-line">
                                <h3>${stageName}</h3>

                                <span class="stage-active-badge">
                                    <i></i>
                                    Active
                                </span>
                            </div>

                            <p class="stage-location">
                                ${area}${district ? `, ${district}` : ""}
                            </p>
                        </div>
                    </div>

                    <div class="stage-chairman">
                        <span>STAGE CHAIRMAN</span>
                        <strong>${chairman}</strong>
                    </div>

                </div>


                <!-- RIGHT SIDE -->
                <div class="stage-right">

                    <div class="stage-phone">
                        <span>PHONE NUMBER</span>
                        <strong>
                            ${escapeHTML(phone)}
                        </strong>
                    </div>

                    ${
                        callPhone
                            ? `
                            <a
                                href="tel:${callPhone}"
                                class="stage-call-button"
                                onclick="event.stopPropagation()"
                            >
                                <span>☎</span>
                                Call
                            </a>
                            `
                            : `
                            <button
                                class="stage-call-button disabled"
                                disabled
                            >
                                No Phone
                            </button>
                            `
                    }

                </div>

            </div>
        `;
    }).join("");
}
const stageSearch = $("stageSearch");

stageSearch?.addEventListener("input", () => {
    const search = stageSearch.value.toLowerCase().trim();

    document.querySelectorAll(".stage-card").forEach(card => {
        const name = card.dataset.name || "";
        const area = card.dataset.area || "";
        card.style.display = name.includes(search) || area.includes(search) ? "" : "none";
    });
});

if ($("stageList") || $("stageSelect")) loadStages();


// ================= DASHBOARD =================

const dashboardName = $("marketeerName");

if (dashboardName) {

    onAuthStateChanged(auth, async user => {

        if (!user) {
            window.location.href = "index.html";
            return;
        }

        try {

            // ================= GREETING =================

            const hour = new Date().getHours();

            let greeting = "Good morning,";

            if (hour >= 12 && hour < 17) {
                greeting = "Good afternoon,";
            }

            if (hour >= 17) {
                greeting = "Good evening,";
            }

            if ($("dashboardGreeting")) {
                $("dashboardGreeting").textContent =
                    greeting;
            }


            // ================= MARKETER INFORMATION =================

            const marketerSnapshot =
                await get(
                    ref(
                        database,
                        `bodaProgram/marketers/${user.uid}`
                    )
                );

            const marketer =
                marketerSnapshot.exists()
                    ? marketerSnapshot.val()
                    : {};

            const fullName =
                marketer.fullName ||
                user.displayName ||
                user.email?.split("@")[0] ||
                "Marketeer";

            const firstName =
                fullName
                    .trim()
                    .split(/\s+/)[0];

            dashboardName.textContent =
                firstName;


            // ================= PROFILE PHOTO =================

            const profilePhoto =
                $("dashboardProfilePhoto");

            const profileInitials =
                $("dashboardProfileInitials");

            const avatar =
                $("dashboardProfileAvatar");

            let googlePhoto = user.photoURL || "";

            // Check Google provider information too
            if (!googlePhoto && user.providerData) {

                const googleProvider =
                    user.providerData.find(
                        provider =>
                            provider.providerId === "google.com"
                    );

                if (googleProvider?.photoURL) {
                    googlePhoto =
                        googleProvider.photoURL;
                }
            }


            // Google profile photo available
            if (googlePhoto && profilePhoto) {

                profilePhoto.src =
                    googlePhoto;

                profilePhoto.onload = () => {

                    profilePhoto
                        .classList
                        .remove("hidden");

                    profileInitials
                        ?.classList
                        .add("hidden");
                };

                // Fall back to initials if Google image fails
                profilePhoto.onerror = () => {

                    profilePhoto
                        .classList
                        .add("hidden");

                    profileInitials
                        ?.classList
                        .remove("hidden");
                };

            } else {

                // ================= INITIALS FALLBACK =================

                const names =
                    fullName
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean);

                let initials =
                    names[0]?.charAt(0) || "M";

                if (names.length > 1) {

                    initials +=
                        names[
                            names.length - 1
                        ]?.charAt(0) || "";
                }

                if (profileInitials) {

                    profileInitials.textContent =
                        initials.toUpperCase();

                    profileInitials
                        .classList
                        .remove("hidden");
                }
            }


            // ================= LOAD DASHBOARD DATA =================

            loadDashboardRegistrations(
                user.uid
            );

            loadDashboardEarnings(
                user.uid
            );

        } catch (error) {

            console.error(
                "Dashboard initialization error:",
                error
            );

            showToast(
                "Unable to load dashboard.",
                "error"
            );
        }
    });
}


// ================= DASHBOARD REGISTRATIONS =================

async function loadDashboardRegistrations(marketerId) {
    const container = $("recentRegistrations");

    if (!container) {
        console.error("recentRegistrations container not found.");
        return;
    }

    try {
        container.innerHTML = `
            <div class="dashboard-recent-loading">
                <div class="dashboard-small-spinner"></div>
                <div>
                    <strong>Loading registrations...</strong>
                    <span>Please wait</span>
                </div>
            </div>
        `;

        console.log("Loading dashboard for marketer:", marketerId);

        // Get BOTH registration types
        const [ridersSnapshot, pregnantSnapshot] =
            await Promise.all([
                get(ref(database, "bodaProgram/riders")),
                get(ref(database, "bodaProgram/pregnantWomen"))
            ]);

        const registrations = [];

        // ================= RIDERS =================

        if (ridersSnapshot.exists()) {
            ridersSnapshot.forEach(childSnapshot => {
                const rider = childSnapshot.val() || {};

                console.log(
                    "Dashboard rider:",
                    childSnapshot.key,
                    rider
                );

                if (
                    !rider.marketerId ||
                    rider.marketerId === marketerId
                ) {
                    registrations.push({
                        ...rider,
                        id: childSnapshot.key,
                        registrationType: "rider"
                    });
                }
            });
        }

        // ================= PREGNANT WOMEN =================

        if (pregnantSnapshot.exists()) {
            pregnantSnapshot.forEach(childSnapshot => {
                const woman = childSnapshot.val() || {};

                console.log(
                    "Dashboard pregnant woman:",
                    childSnapshot.key,
                    woman
                );

                if (
                    !woman.marketerId ||
                    woman.marketerId === marketerId
                ) {
                    registrations.push({
                        ...woman,
                        id: childSnapshot.key,
                        registrationType: "pregnant"
                    });
                }
            });
        }

        // Newest first
        registrations.sort((a, b) =>
            Number(b.registeredAt || 0) -
            Number(a.registeredAt || 0)
        );

        console.log(
            "FINAL DASHBOARD REGISTRATIONS:",
            registrations
        );

        // ================= TOTAL =================

        if ($("totalRegistrations")) {
            $("totalRegistrations").textContent =
                registrations.length;
        }

        // ================= THIS MONTH =================

        const now = new Date();

        const thisMonth = registrations.filter(item => {
            if (!item.registeredAt) return false;

            const date = new Date(
                Number(item.registeredAt)
            );

            return (
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear()
            );
        }).length;

        if ($("monthlyRegistrationChange")) {
            $("monthlyRegistrationChange").textContent =
                `${thisMonth} this month`;
        }

        // ================= RECENT 5 =================

        displayDashboardRecentRegistrations(
            registrations.slice(0, 5)
        );

    } catch (error) {
        console.error(
            "DASHBOARD REGISTRATION ERROR:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Unable to load registrations</h3>
                <p>Please refresh and try again.</p>
            </div>
        `;

        showToast(
            "Failed to load recent registrations.",
            "error"
        );
    }
}


// ================= DISPLAY RECENT REGISTRATIONS =================

function displayDashboardRecentRegistrations(
    registrations
) {

    const container =
        $("recentRegistrations");

    if (!container) {
        return;
    }


    // ================= EMPTY =================

    if (!registrations.length) {

        container.innerHTML = `
            <div class="empty-state dashboard-empty">
                <div class="empty-icon">👥</div>
                <h3>No registrations yet</h3>
                <p>
                    Your latest registrations
                    will appear here.
                </p>
            </div>
        `;

        return;
    }


    // ================= CARDS =================

    container.innerHTML =
        registrations
            .map(client => {

                const isRider =
                    client.registrationType ===
                    "rider";


                const typeText =
                    isRider
                        ? "Boda Boda Rider"
                        : "Pregnant Woman";


                let statusText =
                    "Pending";

                let statusClass =
                    "pending";


                // ================= RIDER STATUS =================

                if (isRider) {

                    if (
                        client.otpVerified === true
                    ) {

                        statusText =
                            "Verified";

                        statusClass =
                            "verified";
                    }

                }


                // ================= PREGNANT STATUS =================

                else {

                    if (
                        client.approved === true
                    ) {

                        statusText =
                            "Approved";

                        statusClass =
                            "verified";

                    } else if (
                        client.paymentConfirmed ===
                        true
                    ) {

                        statusText =
                            "Payment Confirmed";

                    } else if (
                        client.arrived === true
                    ) {

                        statusText =
                            "Arrived";

                    } else {

                        statusText =
                            "Awaiting Visit";
                    }
                }


                const initials =
                    getClientInitials(
                        client.fullName || ""
                    );


                const stage =
                    isRider &&
                    client.stageName

                        ? `
                            <span class="dashboard-recent-stage">
                                📍
                                ${escapeHTML(
                                    client.stageName
                                )}
                            </span>
                        `

                        : "";


                return `
                    <div
                        class="dashboard-recent-card"
                        data-id="${escapeHTML(
                            client.id || ""
                        )}"
                        data-type="${escapeHTML(
                            client.registrationType
                        )}"
                    >

                        <div class="
                            dashboard-recent-avatar
                            ${
                                isRider
                                    ? "rider"
                                    : "pregnant"
                            }
                        ">
                            ${escapeHTML(
                                initials
                            )}
                        </div>


                        <div class="
                            dashboard-recent-info
                        ">

                            <strong>
                                ${escapeHTML(
                                    client.fullName ||
                                    "Unknown"
                                )}
                            </strong>


                            <span class="
                                dashboard-recent-type
                            ">
                                ${typeText}
                            </span>


                            <span class="
                                dashboard-recent-phone
                            ">
                                ${escapeHTML(
                                    formatPhone(
                                        client.phone ||
                                        ""
                                    )
                                )}
                            </span>


                            ${stage}


                            <small>
                                ${formatDate(
                                    client.registeredAt
                                )}
                            </small>

                        </div>


                        <div class="
                            dashboard-recent-right
                        ">

                            <span class="
                                dashboard-status
                                ${statusClass}
                            ">
                                ${statusText}
                            </span>

                            <span class="
                                dashboard-recent-arrow
                            ">
                                ›
                            </span>

                        </div>

                    </div>
                `;
            })
            .join("");


    // ================= CLICK REGISTRATION =================

    container
        .querySelectorAll(
            ".dashboard-recent-card"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    sessionStorage.setItem(
                        "selectedRegistrationId",
                        card.dataset.id
                    );

                    sessionStorage.setItem(
                        "selectedRegistrationType",
                        card.dataset.type
                    );

                    window.location.href =
                        "client-details.html";
                }
            );
        });
}


// ================= DASHBOARD EARNINGS =================

function loadDashboardEarnings(marketerId) {

    const commissionsRef =
        ref(
            database,
            "bodaProgram/commissions"
        );


    onValue(

        commissionsRef,

        snapshot => {

            let total = 0;


            snapshot.forEach(
                childSnapshot => {

                    const commission =
                        childSnapshot.val() || {};


                    if (
                        commission.marketerId ===
                        marketerId
                    ) {

                        total +=
                            Number(
                                commission.amount || 0
                            );
                    }
                }
            );


            if ($("totalEarnings")) {

                $("totalEarnings")
                    .textContent =
                    formatMoney(total);
            }
        },

        error => {

            console.error(
                "Dashboard earnings error:",
                error
            );
        }
    );
}








// ================= PROFILE =================

const profileName = $("profileName");

if (profileName) {

    onAuthStateChanged(auth, async user => {

        if (!user) {
            window.location.href = "index.html";
            return;
        }

        try {

            showLoader("Loading profile...");

            const profileRef = ref(
                database,
                `bodaProgram/marketers/${user.uid}`
            );

            let snapshot = await get(profileRef);
            let marketer;

            // ================= CREATE PROFILE IF MISSING =================

            if (!snapshot.exists()) {

                const fallbackName =
                    user.displayName ||
                    user.email?.split("@")[0] ||
                    "Marketer";

                marketer = {
                    uid: user.uid,
                    fullName: fallbackName,
                    phone: user.phoneNumber || "",
                    email: user.email || "",
                    photoURL: user.photoURL || "",
                    status: "active",
                    createdAt: Date.now()
                };

                await set(profileRef, marketer);

            } else {

                marketer = snapshot.val();

            }


            // ================= NAME =================

            const fullName =
                marketer.fullName ||
                user.displayName ||
                "Marketer";

            profileName.textContent = fullName;


            // ================= INITIALS =================

            const names = fullName
                .trim()
                .split(/\s+/)
                .filter(Boolean);

            let initials =
                names[0]?.charAt(0) || "M";

            if (names.length > 1) {
                initials +=
                    names[names.length - 1]
                        ?.charAt(0) || "";
            }

            const profileInitials =
                $("profileInitials");

            if (profileInitials) {
                profileInitials.textContent =
                    initials.toUpperCase();
            }


            // ================= EMAIL =================

            if ($("profileEmail")) {

                $("profileEmail").textContent =
                    marketer.email ||
                    user.email ||
                    "Not provided";

            }


            // ================= PHONE =================

            if ($("profilePhone")) {

                $("profilePhone").textContent =
                    marketer.phone
                        ? formatPhone(marketer.phone)
                        : "Not provided";

            }


            // ================= PROFILE PHOTO =================

            const profilePhoto =
                $("profilePhoto");

            let photoURL =
                marketer.photoURL ||
                user.photoURL ||
                "";

            // Check Google provider
            if (!photoURL && user.providerData) {

                const googleProvider =
                    user.providerData.find(
                        provider =>
                            provider.providerId === "google.com"
                    );

                if (googleProvider?.photoURL) {
                    photoURL =
                        googleProvider.photoURL;
                }

            }

            console.log(
                "PROFILE PHOTO URL:",
                photoURL
            );


            if (profilePhoto && photoURL) {

                profilePhoto.onload = () => {

                    profilePhoto
                        .classList
                        .remove("hidden");

                    profileInitials
                        ?.classList
                        .add("hidden");

                };

                profilePhoto.onerror = () => {

                    console.log(
                        "Profile picture failed to load:",
                        photoURL
                    );

                    profilePhoto
                        .classList
                        .add("hidden");

                    profileInitials
                        ?.classList
                        .remove("hidden");

                };

                profilePhoto.src =
                    photoURL;

            } else {

                profilePhoto
                    ?.classList
                    .add("hidden");

                profileInitials
                    ?.classList
                    .remove("hidden");

            }


            hideLoader();

        } catch (error) {

            console.error(
                "Profile error:",
                error
            );

            hideLoader();

            showToast(
                "Failed to load profile.",
                "error"
            );

        }

    });

}
$("logoutBtn")?.addEventListener("click", async () => {
    try {
        showLoader("Signing out...");
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error(error);
        hideLoader();
        showToast("Failed to sign out.", "error");
    }
});

$("myInformationBtn")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const snapshot = await get(ref(database, `bodaProgram/marketers/${user.uid}`));
        if (!snapshot.exists()) return;

        const marketer = snapshot.val();

        alert(
`My Information

Name: ${marketer.fullName || "-"}
Phone: ${formatPhone(marketer.phone)}
Email: ${marketer.email || user.email || "-"}
Account: ${marketer.status || "active"}`
        );

    } catch (error) {
        console.error(error);
        showToast("Unable to load your information.", "error");
    }
});

$("changePasswordBtn")?.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (!user || !user.email) {
        showToast("Unable to find your email.", "error");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, user.email);
        showToast("Password reset email sent.", "success");
    } catch (error) {
        console.error(error);
        showToast("Failed to send password reset email.", "error");
    }
});

$("notificationsBtn")?.addEventListener("click", () => {
    showToast("Notifications will be available soon.", "info");
});

$("aboutBtn")?.addEventListener("click", () => {
    alert(
`SANYU HOSPITAL

Boda Boda Community Program

Connecting registered Boda Boda riders with approved hospital services and benefits.

Version 1.0`
    );
});
// ================= REGISTRATION TYPE =================

const registrationTypeButtons =
    document.querySelectorAll(".registration-type");

const registrationType =
    $("registrationType");

const riderFields =
    $("riderFields");

const riderExtraFields =
    $("riderExtraFields");

registrationTypeButtons.forEach(button => {
    button.addEventListener("click", () => {
        const type = button.dataset.type;

        registrationTypeButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        if (registrationType) {
            registrationType.value = type;
        }

        if (type === "rider") {
            riderFields?.classList.remove("hidden");
            riderExtraFields?.classList.remove("hidden");

            if ($("stageSelect")) {
                $("stageSelect").required = true;
            }
        } else {
            riderFields?.classList.add("hidden");
            riderExtraFields?.classList.add("hidden");

            if ($("stageSelect")) {
                $("stageSelect").required = false;
            }
        }
    });
});

// ================= AFRICA'S TALKING OTP =================

const OTP_API = "https://sanyu-woad.vercel.app/api";
const otpForm = $("otpForm");

if (otpForm) {
    const otpInputs = document.querySelectorAll(".otp-digit");
    const registrationId = sessionStorage.getItem("pendingRegistrationId");
    const registrationType = sessionStorage.getItem("pendingRegistrationType");
    const registrationPhone = sessionStorage.getItem("pendingRegistrationPhone");
    const registrationName = sessionStorage.getItem("pendingRegistrationName");

    let otpSent = false;
    let sendingOtp = false;

    if (!registrationId || registrationType !== "rider" || !registrationPhone) {
        showToast("No pending rider registration found.", "error");

        setTimeout(() => {
            window.location.href = "register-rider.html";
        }, 1200);
    } else {
        if ($("otpPhoneNumber")) {
            $("otpPhoneNumber").textContent = formatPhone(registrationPhone);
        }

        if ($("otpRegistrationName")) {
            $("otpRegistrationName").textContent = registrationName || "";
        }

        if ($("otpRegistrationType")) {
            $("otpRegistrationType").textContent = "Boda Boda Rider";
        }

        // Firebase reCAPTCHA is no longer required.
        $("recaptchaLoading")?.classList.add("hidden");
        $("recaptcha-container")?.classList.add("hidden");
    }

    // ================= OTP INPUTS =================

    otpInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "").slice(0, 1);

            if (input.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", e => {
            if (
                e.key === "Backspace" &&
                !input.value &&
                index > 0
            ) {
                otpInputs[index - 1].focus();
            }
        });

        input.addEventListener("paste", e => {
            e.preventDefault();

            const pasted = e.clipboardData
                .getData("text")
                .replace(/\D/g, "")
                .slice(0, 6);

            pasted.split("").forEach((number, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = number;
                }
            });

            if (pasted.length === 6) {
                otpInputs[5]?.focus();
            }
        });
    });

    // ================= SEND OTP =================

    async function sendOTP() {
        if (!registrationId || sendingOtp) return;

        const sendButton = $("sendOtpBtn");

        try {
            sendingOtp = true;

            if (sendButton) {
                sendButton.disabled = true;
                sendButton.textContent = "Sending...";
            }

            showLoader("Sending verification code...");

            const response = await fetch(`${OTP_API}/send-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    registrationId
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Unable to send verification code."
                );
            }

            otpSent = true;

            hideLoader();

            showToast(
                data.message || "Verification code sent.",
                "success"
            );

            if ($("otpDescription")) {
                $("otpDescription").textContent =
                    "Enter the 6-digit verification code sent to";
            }

            if (sendButton) {
                sendButton.classList.add("hidden");
            }

            $("resendOtpBtn")?.classList.remove("hidden");

            otpInputs[0]?.focus();

        } catch (error) {
            console.error("Send OTP error:", error);

            hideLoader();

            showToast(
                error.message ||
                "Unable to send verification code.",
                "error"
            );

        } finally {
            sendingOtp = false;

            if (sendButton) {
                sendButton.disabled = false;
                sendButton.textContent = "Send Verification Code";
            }
        }
    }

    $("sendOtpBtn")?.addEventListener("click", async () => {
        await sendOTP();
    });

    // ================= RESEND OTP =================

    $("resendOtpBtn")?.addEventListener("click", async () => {
        await sendOTP();
    });

    // ================= VERIFY OTP =================

    otpForm.addEventListener("submit", async e => {
        e.preventDefault();

        const otp = Array.from(otpInputs)
            .map(input => input.value)
            .join("");

        if (otp.length !== 6) {
            showToast(
                "Enter the complete 6-digit code.",
                "error"
            );
            return;
        }

        if (!otpSent) {
            showToast(
                "Send the verification code first.",
                "error"
            );
            return;
        }

        const verifyButton =
            otpForm.querySelector('button[type="submit"]');

        try {
            if (verifyButton) {
                verifyButton.disabled = true;
                verifyButton.textContent = "Verifying...";
            }

            showLoader("Verifying phone number...");

            const response = await fetch(`${OTP_API}/verify-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    registrationId,
                    otp
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Verification failed."
                );
            }

            hideLoader();
showToast(data.message || "Phone number verified successfully.", "success");

sessionStorage.setItem("lastRegistrationId", registrationId);
sessionStorage.setItem("lastRegistrationType", "rider");

clearPendingRegistration();

setTimeout(() => {
    window.location.href = "registration-success.html";
}, 800);

        } catch (error) {
            console.error("OTP verification error:", error);

            hideLoader();

            showToast(
                error.message ||
                "Unable to verify the code.",
                "error"
            );

        } finally {
            if (verifyButton) {
                verifyButton.disabled = false;
                verifyButton.textContent = "Verify Registration";
            }
        }
    });
}



// ================= REGISTRATION SUCCESS =================

if ($("registeredRiderName")) {
    onAuthStateChanged(auth, async user => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const registrationId =
            sessionStorage.getItem("lastRegistrationId") ||
            sessionStorage.getItem("pendingRegistrationId");

        const registrationType =
            sessionStorage.getItem("lastRegistrationType") ||
            sessionStorage.getItem("pendingRegistrationType");

        if (!registrationId || !registrationType) {
            $("registeredRiderName").textContent = "Registration Completed";
            return;
        }

        try {
            const path = registrationType === "rider"
                ? `bodaProgram/riders/${registrationId}`
                : `bodaProgram/pregnantWomen/${registrationId}`;

            const snapshot = await get(ref(database, path));

            if (!snapshot.exists()) {
                throw new Error("Registration not found.");
            }

            const client = snapshot.val();

            $("registeredRiderName").textContent =
                client.fullName || "Registered Client";

            $("registeredRiderPhone").textContent =
                formatPhone(client.phone || "");

            if (registrationType === "rider") {
                $("registrationSuccessTitle").textContent =
                    "Rider Verified Successfully!";

                $("registeredStageRow")?.classList.remove("hidden");

                let stageName = "Not assigned";

                if (client.stageId) {
                    const stageSnapshot = await get(
                        ref(database, `bodaProgram/stages/${client.stageId}`)
                    );

                    if (stageSnapshot.exists()) {
                        const stage = stageSnapshot.val();
                        stageName = stage.stageName || stage.area || "Registered Stage";
                    }
                }

                $("registeredRiderStage").textContent = stageName;

                $("registrationRewardLabel").textContent =
                    "Registration Reward";

                $("earnedCommission").textContent = "1,000";

                $("registrationRewardMessage").textContent =
                    "UGX 1,000 commission earned for this verified rider.";

                $("registrationSuccessMessage").textContent =
                    "The rider's phone number has been verified successfully.";
            } else {
                $("registrationSuccessTitle").textContent =
                    "Registration Successful!";

                $("registeredStageRow")?.classList.add("hidden");

                $("registrationRewardLabel").textContent =
                    "Referral Status";

                $("earnedCommission").textContent = "0";

                $("registrationRewardMessage").textContent =
                    "UGX 500 will be earned after the maternal referral is approved.";

                $("registrationSuccessMessage").textContent =
                    "Maternal referral registered successfully.";

                if ($("registerAnotherBtn")) {
                    $("registerAnotherBtn").href = "register-rider.html";
                }
            }

        } catch (error) {
            console.error("Success page error:", error);
            showToast("Unable to load registration information.", "error");
        }
    });
}


// ================= EARNINGS PAGE =================

if ($("earningsTotal")) {
    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const commissionsRef = ref(
            database,
            "bodaProgram/commissions"
        );

        onValue(commissionsRef, snapshot => {
            let total = 0;
            let monthTotal = 0;
            let monthCount = 0;
            let pendingTotal = 0;
            const payouts = [];

            const now = new Date();

            snapshot.forEach(childSnapshot => {
                const commission = childSnapshot.val() || {};

                if (commission.marketerId !== user.uid) return;

                const amount = Number(commission.amount || 0);

                total += amount;

                if (commission.status === "pending") {
                    pendingTotal += amount;
                }

                const created = new Date(
                    Number(commission.createdAt || 0)
                );

                if (
                    created.getMonth() === now.getMonth() &&
                    created.getFullYear() === now.getFullYear()
                ) {
                    monthTotal += amount;
                    monthCount++;
                }

                if (commission.status === "paid") {
                    payouts.push(commission);
                }
            });

            $("earningsTotal").textContent =
                formatMoney(total);

            $("monthEarnings").textContent =
                `UGX ${formatMoney(monthTotal)}`;

            $("monthRiders").textContent =
                monthCount;

            $("pendingEarnings").textContent =
                `UGX ${formatMoney(pendingTotal)}`;

            displayPayoutHistory(payouts);
        });
    });
}

function displayPayoutHistory(payouts) {
    const container = $("payoutHistory");

    if (!container) return;

    if (!payouts.length) {
        container.innerHTML = `
            <div class="empty-state">
                No payouts yet.
            </div>
        `;
        return;
    }

    payouts.sort(
        (a, b) =>
            Number(b.paidAt || 0) -
            Number(a.paidAt || 0)
    );

    container.innerHTML = payouts.map(payout => `
        <div class="detail-row">
            <div class="detail-row-content">
                <small>
                    ${payout.riderId ? "Boda Boda Rider Commission" : "Referral Commission"}
                </small>

                <strong>
                    UGX ${formatMoney(Number(payout.amount || 0))}
                </strong>

                <small>
                    ${payout.paidAt
                        ? formatDate(payout.paidAt)
                        : "Paid"}
                </small>
            </div>
        </div>
    `).join("");
}


// ================= MY REGISTRATIONS =================

const clientsList = $("clientsList");
const clientSearch = $("clientSearch");
const clientTabs = document.querySelectorAll(".client-tab");

let allClients = [];
let currentClientFilter = "all";

if (clientsList) {
    onAuthStateChanged(auth, user => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        console.log("Logged in marketer:", user.uid);
        loadMyRegistrations(user.uid);
    });
}

function loadMyRegistrations(marketerId) {
    const ridersRef = ref(database, "bodaProgram/riders");
    const pregnantRef = ref(database, "bodaProgram/pregnantWomen");

    let riders = [];
    let pregnantWomen = [];
    let ridersLoaded = false;
    let pregnantLoaded = false;

    function updateCombinedList() {
        if (!ridersLoaded || !pregnantLoaded) return;

        allClients = [...riders, ...pregnantWomen];

        allClients.sort((a, b) =>
            Number(b.registeredAt || 0) - Number(a.registeredAt || 0)
        );

        console.log("My combined registrations:", allClients);

        updateRegistrationSummary();
        filterRegistrations();
    }

    onValue(ridersRef, snapshot => {
        riders = [];

        console.log("Riders snapshot exists:", snapshot.exists());
        console.log("Riders Firebase data:", snapshot.val());

        snapshot.forEach(childSnapshot => {
            const rider = childSnapshot.val() || {};

            console.log("Rider:", childSnapshot.key, rider);

            /*
             * New records should contain marketerId.
             * Older records without marketerId are temporarily included
             * so they do not disappear while developing.
             */
            if (!rider.marketerId || rider.marketerId === marketerId) {
                riders.push({
                    ...rider,
                    id: childSnapshot.key,
                    registrationType: "rider"
                });
            }
        });

        ridersLoaded = true;
        updateCombinedList();

    }, error => {
        console.error("Riders Firebase error:", error);
        ridersLoaded = true;
        updateCombinedList();
        showToast("Failed to load rider registrations.", "error");
    });

    onValue(pregnantRef, snapshot => {
        pregnantWomen = [];

        console.log("Pregnant snapshot exists:", snapshot.exists());
        console.log("Pregnant Firebase data:", snapshot.val());

        snapshot.forEach(childSnapshot => {
            const woman = childSnapshot.val() || {};

            console.log("Pregnant registration:", childSnapshot.key, woman);

            if (!woman.marketerId || woman.marketerId === marketerId) {
                pregnantWomen.push({
                    ...woman,
                    id: childSnapshot.key,
                    registrationType: "pregnant"
                });
            }
        });

        pregnantLoaded = true;
        updateCombinedList();

    }, error => {
        console.error("Pregnant Firebase error:", error);
        pregnantLoaded = true;
        updateCombinedList();
        showToast("Failed to load pregnant women.", "error");
    });
}


// ================= SUMMARY =================

function updateRegistrationSummary() {
    const total = allClients.length;

    const verified = allClients.filter(client =>
        client.otpVerified === true
    ).length;

    if ($("totalClients")) {
        $("totalClients").textContent = total;
    }

    if ($("verifiedClients")) {
        $("verifiedClients").textContent = verified;
    }
}


// ================= FILTER TABS =================

clientTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        clientTabs.forEach(btn =>
            btn.classList.remove("active")
        );

        tab.classList.add("active");

        currentClientFilter = tab.dataset.filter || "all";

        filterRegistrations();
    });
});


// ================= SEARCH =================

clientSearch?.addEventListener("input", filterRegistrations);


// ================= FILTER =================

function filterRegistrations() {
    let clients = [...allClients];

    const search = (clientSearch?.value || "")
        .trim()
        .toLowerCase();

    if (currentClientFilter === "rider") {
        clients = clients.filter(client =>
            client.registrationType === "rider"
        );
    }

    if (currentClientFilter === "pregnant") {
        clients = clients.filter(client =>
            client.registrationType === "pregnant"
        );
    }

    if (currentClientFilter === "pending") {
        clients = clients.filter(client =>
            client.otpVerified !== true
        );
    }

    if (search) {
        const cleanSearch = search.replace(/\D/g, "");

        clients = clients.filter(client => {
            const name = String(client.fullName || "").toLowerCase();
            const phone = String(client.phone || "");
            const formattedPhone = formatPhone(phone).toLowerCase();

            return name.includes(search) ||
                phone.includes(search) ||
                formattedPhone.includes(search) ||
                (cleanSearch && phone.includes(cleanSearch));
        });
    }

    displayRegistrations(clients);
}


// ================= DISPLAY =================

function displayRegistrations(clients) {
    if (!clientsList) return;

    if (!clients.length) {
        clientsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>
                <h3>No registrations found</h3>
                <p>New registrations will appear here.</p>
            </div>
        `;
        return;
    }

    clientsList.innerHTML = clients.map(client => {
        const isRider = client.registrationType === "rider";
        const verified = client.otpVerified === true;

        const typeText = isRider
            ? "Boda Boda Rider"
            : "Pregnant Woman";

        const statusText = verified
            ? "Verified"
            : "Pending";

        const statusClass = verified
            ? "verified"
            : "pending";

        const initials = getClientInitials(client.fullName);

        const stageText =
            isRider && client.stageName
                ? `<span class="client-stage">${escapeHTML(client.stageName)}</span>`
                : "";

        return `
            <div
                class="client-card ${isRider ? "rider" : "pregnant"}"
                data-id="${escapeHTML(client.id || "")}"
                data-type="${client.registrationType}"
            >

                <div class="client-avatar">
                    ${escapeHTML(initials)}
                </div>

                <div class="client-info">

                    <h3>
                        ${escapeHTML(client.fullName || "Unknown")}
                    </h3>

                    <p>
                        ${escapeHTML(formatPhone(client.phone || ""))}
                    </p>

                    ${stageText}

                    <div class="client-meta">

                        <span class="client-type">
                            ${typeText}
                        </span>

                        <span class="client-status ${statusClass}">
                            ${statusText}
                        </span>

                    </div>

                </div>

                <span class="client-arrow">›</span>

            </div>
        `;
    }).join("");

    attachClientCardEvents();
}


// ================= INITIALS =================

function getClientInitials(name = "") {
    const names = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!names.length) return "?";

    let initials = names[0][0] || "";

    if (names.length > 1) {
        initials += names[names.length - 1][0] || "";
    }

    return initials.toUpperCase();
}


// ================= OPEN DETAILS =================

function attachClientCardEvents() {
    document.querySelectorAll(".client-card").forEach(card => {
        card.addEventListener("click", () => {
            sessionStorage.setItem(
                "selectedRegistrationId",
                card.dataset.id
            );

            sessionStorage.setItem(
                "selectedRegistrationType",
                card.dataset.type
            );

            window.location.href = "client-details.html";
        });
    });
}





// ================= CLIENT DETAILS =================

const detailClientName = $("detailClientName");

if (detailClientName) {
    onAuthStateChanged(auth, async user => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const registrationId = sessionStorage.getItem("selectedRegistrationId");
        const registrationType = sessionStorage.getItem("selectedRegistrationType");

        if (!registrationId || !registrationType) {
            showToast("Registration not found.", "error");

            setTimeout(() => {
                window.location.href = "riders.html";
            }, 1000);

            return;
        }

        try {
            showLoader("Loading registration...");

            const databasePath = registrationType === "rider"
                ? `bodaProgram/riders/${registrationId}`
                : `bodaProgram/pregnantWomen/${registrationId}`;

            const snapshot = await get(ref(database, databasePath));

            if (!snapshot.exists()) {
                hideLoader();
                showToast("Registration not found.", "error");
                return;
            }

            const client = snapshot.val();

            // Make sure a marketer cannot open another marketer's record.
            if (client.marketerId && client.marketerId !== user.uid) {
                hideLoader();
                showToast("You cannot access this registration.", "error");

                setTimeout(() => {
                    window.location.href = "riders.html";
                }, 1000);

                return;
            }

            displayClientDetails(client, registrationType);

            hideLoader();

        } catch (error) {
            console.error("Client details error:", error);
            hideLoader();
            showToast("Failed to load registration.", "error");
        }
    });
}

function displayClientDetails(client, type) {
    const isRider = type === "rider";

    const verified = isRider
        ? client.otpVerified === true
        : client.approved === true;

    $("detailClientName").textContent =
        client.fullName || "Unknown";

    $("detailClientPhone").textContent =
        formatPhone(client.phone || "");
const callClientBtn = $("callClientBtn");

if (callClientBtn && client.phone) {
    callClientBtn.href =
        `tel:+${normalizePhone(client.phone)}`;
}
    $("detailMarketerName").textContent =
        client.marketerName || "Marketer";

    $("detailRegistrationDate").textContent =
        formatDate(client.registeredAt);

    if ($("detailClientInitials")) {
        $("detailClientInitials").textContent =
            getClientInitials(
                client.fullName || ""
            );
    }

    if ($("detailClientType")) {
        $("detailClientType").textContent =
            isRider
                ? "Boda Boda Rider"
                : "Pregnant Woman";

        $("detailClientType").classList.toggle(
            "pregnant",
            !isRider
        );
    }

    // Rider-specific information
    if (isRider) {
        $("detailRiderSection")
            ?.classList.remove("hidden");

        if ($("detailClientNationalId")) {
            $("detailClientNationalId").textContent =
                client.nationalId ||
                "Not provided";
        }

        if ($("detailClientStage")) {
            $("detailClientStage").textContent =
                client.stageName ||
                "Not provided";
        }
    } else {
        $("detailRiderSection")
            ?.classList.add("hidden");
    }

    const statusElement =
        $("detailClientStatus");

    if (statusElement) {
        let statusText = "Pending";
        let statusClass = "pending";

        if (isRider) {
            if (client.otpVerified === true) {
                statusText = "Verified";
                statusClass = "verified";
            }
        } else {
            if (client.approved === true) {
                statusText = "Approved";
                statusClass = "verified";
            } else if (client.paymentConfirmed === true) {
                statusText = "Payment Confirmed";
            } else if (client.arrived === true) {
                statusText = "Arrived";
            } else {
                statusText = "Awaiting Hospital Visit";
            }
        }

        statusElement.textContent =
            statusText;

        statusElement.classList.remove(
            "verified",
            "pending"
        );

        statusElement.classList.add(
            statusClass
        );
    }

    if ($("detailVerificationStatus")) {
        if (isRider) {
            $("detailVerificationStatus")
                .textContent =
                client.otpVerified === true
                    ? "Phone Verified"
                    : "Pending Phone Verification";
        } else {
            $("detailVerificationStatus")
                .textContent =
                client.approved === true
                    ? "Hospital Approved"
                    : "Awaiting Hospital Approval";
        }
    }

    // OTP button ONLY for riders
    if ($("verificationAction")) {
        if (
            isRider &&
            client.otpVerified !== true
        ) {
            $("verificationAction")
                .classList.remove("hidden");
        } else {
            $("verificationAction")
                .classList.add("hidden");
        }
    }
}
// ================= VERIFY FROM DETAILS =================

$("verifyClientPhoneBtn")?.addEventListener(
    "click",
    async () => {
        const registrationId =
            sessionStorage.getItem(
                "selectedRegistrationId"
            );

        const registrationType =
            sessionStorage.getItem(
                "selectedRegistrationType"
            );

        if (!registrationId || !registrationType) {
            showToast(
                "Registration not found.",
                "error"
            );
            return;
        }

        // Only riders use phone OTP
        if (registrationType !== "rider") {
            showToast(
                "Phone verification is only required for Boda Boda riders.",
                "info"
            );
            return;
        }

        try {
            showLoader(
                "Preparing phone verification..."
            );

            const databasePath =
                `bodaProgram/riders/${registrationId}`;

            const snapshot = await get(
                ref(database, databasePath)
            );

            if (!snapshot.exists()) {
                hideLoader();

                showToast(
                    "Rider registration not found.",
                    "error"
                );

                return;
            }

            const client = snapshot.val();

            if (client.otpVerified === true) {
                hideLoader();

                showToast(
                    "This rider's phone is already verified.",
                    "info"
                );

                return;
            }

            sessionStorage.setItem(
                "pendingRegistrationId",
                registrationId
            );

            sessionStorage.setItem(
                "pendingRegistrationType",
                "rider"
            );

            sessionStorage.setItem(
                "pendingRegistrationPhone",
                client.phone || ""
            );

            sessionStorage.setItem(
                "pendingRegistrationName",
                client.fullName || ""
            );

            hideLoader();

            window.location.href =
                "verify-otp.html";

        } catch (error) {
            console.error(
                "Start verification error:",
                error
            );

            hideLoader();

            showToast(
                "Unable to start verification.",
                "error"
            );
        }
    }
);


function clearPendingRegistration() {
    sessionStorage.removeItem(
        "pendingRegistrationId"
    );

    sessionStorage.removeItem(
        "pendingRegistrationType"
    );

    sessionStorage.removeItem(
        "pendingRegistrationPhone"
    );

    sessionStorage.removeItem(
        "pendingRegistrationName"
    );
}