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
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber
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
// This prevents OTP verification from replacing the marketer's login.
const phoneVerificationApp = initializeApp(
    firebaseConfig,
    "phoneVerificationApp"
);

const phoneAuth = getAuth(phoneVerificationApp);
phoneAuth.useDeviceLanguage();


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


const marketerRegistrationForm = $("marketeerRegistrationForm");

if (marketerRegistrationForm) {
    marketerRegistrationForm.addEventListener("submit", async e => {
        e.preventDefault();

        const fullName = $("marketeerFullName").value.trim();
        const phone = normalizePhone($("marketeerPhone").value);
        const email = $("marketeerEmail").value.trim().toLowerCase();
        const password = $("marketeerPassword").value;
        const confirmPassword = $("confirmPassword").value;

        if (!fullName || !phone || !email || !password) {
            showToast("Complete all required fields.", "error");
            return;
        }

        if (phone.length !== 12 || !phone.startsWith("256")) {
            showToast("Enter a valid Ugandan phone number.", "error");
            return;
        }

        if (password.length < 6) {
            showToast("Password must have at least 6 characters.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Passwords do not match.", "error");
            return;
        }

        try {
            showLoader("Creating account...");

            const credential = await createUserWithEmailAndPassword(auth, email, password);
            const user = credential.user;

            await set(ref(database, `bodaProgram/marketers/${user.uid}`), {
                uid: user.uid,
                fullName,
                phone,
                email,
                status: "active",
                createdAt: Date.now()
            });

            hideLoader();
            showToast("Account created successfully.", "success");

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 700);

        } catch (error) {
            console.error(error);
            hideLoader();

            let message = "Failed to create account.";

            if (error.code === "auth/email-already-in-use") message = "That email already has an account.";
            else if (error.code === "auth/invalid-email") message = "Enter a valid email address.";
            else if (error.code === "auth/weak-password") message = "Choose a stronger password.";

            showToast(message, "error");
        }
    });
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
            <div class="empty-state">
                <h3>No stages registered</h3>
                <p>Register the first Boda Boda stage.</p>
            </div>
        `;
        return;
    }

    stageList.innerHTML = stages.map(stage => `
        <div class="stage-card" data-name="${escapeHTML((stage.stageName || "").toLowerCase())}" data-area="${escapeHTML((stage.area || "").toLowerCase())}">
            <div class="stage-card-top">
                <div>
                    <h3>${escapeHTML(stage.stageName)}</h3>
                    <p>${escapeHTML(stage.area)}${stage.district ? `, ${escapeHTML(stage.district)}` : ""}</p>
                </div>
                <span class="status-badge active">Active</span>
            </div>

            <div class="stage-info">
                <p><strong>Chairman:</strong> ${escapeHTML(stage.chairmanName)}</p>
                <p><strong>Phone:</strong> ${formatPhone(stage.chairmanPhone)}</p>
            </div>
        </div>
    `).join("");
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





// ================= PROFILE =================

const profileName = $("profileName");

if (profileName) {
    onAuthStateChanged(auth, async user => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        try {
            const snapshot = await get(ref(database, `bodaProgram/marketers/${user.uid}`));

            if (!snapshot.exists()) {
                showToast("Profile information not found.", "error");
                return;
            }

            const marketer = snapshot.val();
            profileName.textContent = marketer.fullName || "Marketer";

            const names = (marketer.fullName || "M").trim().split(/\s+/);
            let initials = names[0]?.charAt(0) || "M";
            if (names.length > 1) initials += names[names.length - 1].charAt(0);

            if ($("profileInitials")) $("profileInitials").textContent = initials.toUpperCase();

        } catch (error) {
            console.error("Profile error:", error);
            showToast("Failed to load profile.", "error");
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
`Bibo Medical System

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

// ================= FIREBASE PHONE OTP =================

const otpForm = $("otpForm");

let confirmationResult = null;
let recaptchaVerifier = null;
let recaptchaWidgetId = null;

if (otpForm) {
    const otpInputs = document.querySelectorAll(".otp-digit");

    const registrationId =
        sessionStorage.getItem("pendingRegistrationId");

    const registrationType =
        sessionStorage.getItem("pendingRegistrationType");

    const registrationPhone =
        sessionStorage.getItem("pendingRegistrationPhone");

    const registrationName =
        sessionStorage.getItem("pendingRegistrationName");

    if (!registrationId ||
        !registrationType ||
        !registrationPhone) {

        showToast(
            "No pending registration found.",
            "error"
        );

        setTimeout(() => {
            window.location.href = "register.html";
        }, 1200);

    } else {

        $("otpPhoneNumber").textContent =
            formatPhone(registrationPhone);

        $("otpRegistrationName").textContent =
            registrationName || "";

        $("otpRegistrationType").textContent =
            registrationType === "rider"
                ? "Boda Boda Rider"
                : "Pregnant Woman";

        setupPhoneVerification();
    }


    // ================= RECAPTCHA =================

  async function setupPhoneVerification() {
    try {
        recaptchaVerifier = new RecaptchaVerifier(
            "recaptcha-container",
            {
                size: "normal",

                callback: () => {
                    console.log("reCAPTCHA completed");
                },

                "expired-callback": () => {
                    confirmationResult = null;

                    showToast(
                        "reCAPTCHA expired. Complete it again.",
                        "error"
                    );
                }
            },
            phoneAuth
        );

        recaptchaWidgetId =
            await recaptchaVerifier.render();

        console.log("Firebase reCAPTCHA ready");

    } catch (error) {
        console.error("reCAPTCHA error:", error);

        showToast(
            "Unable to prepare phone verification.",
            "error"
        );
    }
}


    // ================= SEND OTP =================

    async function sendFirebaseOTP() {
        if (!recaptchaVerifier) {
            showToast(
                "Phone verification is still loading.",
                "error"
            );

            return;
        }

        const phone =
            "+" + normalizePhone(registrationPhone);

        try {
            showLoader(
                "Sending verification code..."
            );

            confirmationResult =
                await signInWithPhoneNumber(
                    phoneAuth,
                    phone,
                    recaptchaVerifier
                );

            hideLoader();

            showToast(
                "Verification code sent.",
                "success"
            );

            if ($("otpDescription")) {
                $("otpDescription").textContent =
                    "Enter the 6-digit verification code sent to";
            }

            otpInputs[0]?.focus();

        } catch (error) {
            console.error(
                "Send OTP error:",
                error
            );

            hideLoader();

            handleOTPError(error);

            resetRecaptcha();
        }
    }


    // ================= RESET RECAPTCHA =================

    function resetRecaptcha() {
        if (
            window.grecaptcha &&
            recaptchaWidgetId !== null
        ) {
            window.grecaptcha.reset(
                recaptchaWidgetId
            );
        }

        confirmationResult = null;
    }


    // ================= OTP INPUTS =================

    otpInputs.forEach((input, index) => {

        input.addEventListener("input", () => {

            input.value = input.value
                .replace(/\D/g, "")
                .slice(0, 1);

            if (
                input.value &&
                index < otpInputs.length - 1
            ) {
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

            const pasted =
                e.clipboardData
                    .getData("text")
                    .replace(/\D/g, "")
                    .slice(0, 6);

            pasted
                .split("")
                .forEach((number, i) => {

                    if (otpInputs[i]) {
                        otpInputs[i].value =
                            number;
                    }
                });

            if (pasted.length === 6) {
                otpInputs[5]?.focus();
            }
        });
    });


    // ================= VERIFY OTP =================

    otpForm.addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            const otp =
                Array.from(otpInputs)
                    .map(input => input.value)
                    .join("");

            if (otp.length !== 6) {

                showToast(
                    "Enter the complete 6-digit code.",
                    "error"
                );

                return;
            }

            if (!confirmationResult) {

                showToast(
                    "Send the verification code first.",
                    "error"
                );

                return;
            }

            try {

                showLoader(
                    "Verifying phone number..."
                );

                const result =
                    await confirmationResult.confirm(
                        otp
                    );

                const verifiedPhone =
                    result.user.phoneNumber || "";

                console.log(
                    "Verified Firebase phone:",
                    verifiedPhone
                );

                await completeClientVerification(
                    registrationId,
                    registrationType,
                    result.user.uid,
                    verifiedPhone
                );

                // Sign client out of SECONDARY auth only.
                await signOut(phoneAuth);

                hideLoader();

                showToast(
                    "Phone number verified successfully.",
                    "success"
                );

                clearPendingRegistration();

                setTimeout(() => {

                    window.location.href =
                        "registration-success.html";

                }, 800);

            } catch (error) {

                console.error(
                    "OTP verification error:",
                    error
                );

                hideLoader();

                handleOTPError(error);
            }
        }
    );


    // ================= RESEND =================

    $("resendOtpBtn")?.addEventListener(
        "click",
        async () => {

            resetRecaptcha();

            showToast(
                "Complete reCAPTCHA again to resend the code.",
                "info"
            );
        }
    );

$("sendOtpBtn")?.addEventListener(
    "click",
    async () => {

        await sendFirebaseOTP();

        if (confirmationResult) {
            $("sendOtpBtn").classList.add(
                "hidden"
            );
        }
    }
);
    // ================= OTP ERRORS =================

    function handleOTPError(error) {

        let message =
            "Phone verification failed.";

        if (
            error.code ===
            "auth/invalid-verification-code"
        ) {
            message =
                "The verification code is incorrect.";
        }

        else if (
            error.code ===
            "auth/code-expired"
        ) {
            message =
                "The verification code has expired.";
        }

        else if (
            error.code ===
            "auth/too-many-requests"
        ) {
            message =
                "Too many attempts. Please try again later.";
        }

        else if (
            error.code ===
            "auth/invalid-phone-number"
        ) {
            message =
                "The phone number is invalid.";
        }

        else if (
            error.code ===
            "auth/quota-exceeded"
        ) {
            message =
                "Firebase SMS quota has been reached.";
        }

        else if (
            error.code ===
            "auth/captcha-check-failed"
        ) {
            message =
                "reCAPTCHA verification failed.";
        }

        showToast(
            message,
            "error"
        );
    }
}




// ================= COMPLETE CLIENT VERIFICATION =================

async function completeClientVerification(
    registrationId,
    registrationType,
    phoneAuthUid,
    verifiedPhone
) {

    const user = auth.currentUser;

    if (!user) {
        throw new Error(
            "Marketer authentication was lost."
        );
    }

    const databasePath =
        registrationType === "rider"
            ? `bodaProgram/riders/${registrationId}`
            : `bodaProgram/pregnantWomen/${registrationId}`;

    const registrationRef =
        ref(database, databasePath);

    const snapshot =
        await get(registrationRef);

    if (!snapshot.exists()) {
        throw new Error(
            "Registration does not exist."
        );
    }

    const registration =
        snapshot.val();

    if (
        registration.marketerId &&
        registration.marketerId !== user.uid
    ) {
        throw new Error(
            "Registration belongs to another marketer."
        );
    }

    const expectedPhone =
        normalizePhone(
            registration.phone
        );

    const actualPhone =
        normalizePhone(
            verifiedPhone
        );

    if (
        !expectedPhone ||
        expectedPhone !== actualPhone
    ) {
        throw new Error(
            "Verified phone number does not match registration."
        );
    }


    // Already verified.
    if (registration.otpVerified === true) {
        return;
    }


    const updates = {};

    updates[
        `${databasePath}/otpVerified`
    ] = true;

    updates[
        `${databasePath}/verifiedAt`
    ] = Date.now();

    updates[
        `${databasePath}/status`
    ] = "verified";

    updates[
        `${databasePath}/phoneAuthUid`
    ] = phoneAuthUid;


    // Commission currently applies to riders.
    if (registrationType === "rider") {

        const commissionId =
            `rider_${registrationId}`;

        updates[
            `bodaProgram/commissions/${commissionId}`
        ] = {
            commissionId,
            marketerId: user.uid,
            riderId: registrationId,
            amount: 1000,
            status: "pending",
            createdAt: Date.now(),
            paidAt: null
        };
    }


    await update(
        ref(database),
        updates
    );
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