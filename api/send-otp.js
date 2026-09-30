import crypto from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

function initFirebase() {
    if (getApps().length) return getApps()[0];

    const privateKey =
        process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    return initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey
        }),
        databaseURL:
            "https://abbah-83a7b-default-rtdb.firebaseio.com"
    });
}

function normalizePhone(phone) {
    let number = String(phone || "").replace(/\D/g, "");
    if (number.startsWith("0") && number.length === 10) {
        number = "256" + number.substring(1);
    } else if (number.length === 9) {
        number = "256" + number;
    }
    return number;
}

function hashOtp(otp) {
    return crypto.createHash("sha256").update(otp).digest("hex");
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "https://solomonmulumbi.github.io");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed." });

    try {
        const firebaseApp = initFirebase();
const db = getDatabase(firebaseApp);
        const registrationId = String(req.body?.registrationId || "").trim();

        if (!registrationId) {
            return res.status(400).json({
                success: false,
                message: "Registration ID is required."
            });
        }

        const riderRef = db.ref(`bodaProgram/riders/${registrationId}`);
        const riderSnapshot = await riderRef.once("value");

        if (!riderSnapshot.exists()) {
            return res.status(404).json({
                success: false,
                message: "Rider registration not found."
            });
        }

        const rider = riderSnapshot.val();

        if (rider.otpVerified === true || rider.status === "verified") {
            return res.status(400).json({
                success: false,
                message: "This rider is already verified."
            });
        }

        const phone = normalizePhone(rider.phoneNormalized || rider.phone);

        if (!phone.startsWith("256") || phone.length !== 12) {
            return res.status(400).json({
                success: false,
                message: "Rider phone number is invalid."
            });
        }

        const otpRef = db.ref(`bodaProgram/otpRequests/${registrationId}`);
        const previousSnapshot = await otpRef.once("value");

        if (previousSnapshot.exists()) {
            const previous = previousSnapshot.val();
            const secondsSinceLastSend = (Date.now() - Number(previous.sentAt || 0)) / 1000;

            if (secondsSinceLastSend < 60) {
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${Math.ceil(60 - secondsSinceLastSend)} seconds before requesting another OTP.`
                });
            }
        }

        const otp = crypto.randomInt(100000, 1000000).toString();

        const message =
            `SANYU HOSPITAL verification code: ${otp}. ` +
            `This code expires in 5 minutes. Do not share it.`;

        const params = new URLSearchParams();
        params.append("username", process.env.AFRICASTALKING_USERNAME || "sandbox");
        params.append("to", `+${phone}`);
        params.append("message", message);

        const response = await fetch(
            "https://api.africastalking.com/version1/messaging",
            {
                method: "POST",
                headers: {
                    "apiKey": process.env.AFRICASTALKING_API_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                },
                body: params.toString()
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error("Africa's Talking error:", result);

            return res.status(502).json({
                success: false,
                message: "SMS provider rejected the request."
            });
        }

        await otpRef.set({
            otpHash: hashOtp(otp),
            registrationId,
            phone,
            sentAt: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000),
            attempts: 0
        });

        return res.status(200).json({
            success: true,
            message: "Verification code sent.",
            expiresIn: 300
        });

    } catch (error) {
        console.error("SEND OTP ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to send verification code."
        });
    }
}