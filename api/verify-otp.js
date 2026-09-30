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

function hashOtp(otp) {
    return crypto.createHash("sha256").update(otp).digest("hex");
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "https://solomonmulumbi.github.io");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(204).end();

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });
    }

    try {
       const firebaseApp = initFirebase();
const db = getDatabase(firebaseApp);

        const registrationId = String(req.body?.registrationId || "").trim();
        const otp = String(req.body?.otp || "").replace(/\D/g, "");

        if (!registrationId || otp.length !== 6) {
            return res.status(400).json({
                success: false,
                message: "Enter the complete 6-digit verification code."
            });
        }

        const otpRef = db.ref(`bodaProgram/otpRequests/${registrationId}`);
        const otpSnapshot = await otpRef.once("value");

        if (!otpSnapshot.exists()) {
            return res.status(400).json({
                success: false,
                message: "No verification request was found. Request a new code."
            });
        }

        const otpData = otpSnapshot.val();

        if (Date.now() > Number(otpData.expiresAt || 0)) {
            await otpRef.remove();

            return res.status(400).json({
                success: false,
                message: "Verification code has expired. Request a new code."
            });
        }

        const attempts = Number(otpData.attempts || 0);

        if (attempts >= 5) {
            await otpRef.remove();

            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts. Request a new code."
            });
        }

        const suppliedHash = hashOtp(otp);

        if (suppliedHash !== otpData.otpHash) {
            await otpRef.update({
                attempts: attempts + 1
            });

            return res.status(400).json({
                success: false,
                message: "Incorrect verification code."
            });
        }

        const riderRef = db.ref(`bodaProgram/riders/${registrationId}`);
        const riderSnapshot = await riderRef.once("value");

        if (!riderSnapshot.exists()) {
            await otpRef.remove();

            return res.status(404).json({
                success: false,
                message: "Rider registration was not found."
            });
        }

        const rider = riderSnapshot.val();

        if (rider.otpVerified === true || rider.status === "verified") {
            await otpRef.remove();

            return res.status(200).json({
                success: true,
                message: "Rider is already verified."
            });
        }

        if (String(otpData.phone) !== String(rider.phoneNormalized || rider.phone)) {
            return res.status(400).json({
                success: false,
                message: "Verification information does not match this rider."
            });
        }

        const commissionId = `rider_${registrationId}`;
        const commissionRef = db.ref(`bodaProgram/commissions/${commissionId}`);
        const commissionSnapshot = await commissionRef.once("value");

        const updates = {};

        updates[`bodaProgram/riders/${registrationId}/otpVerified`] = true;
        updates[`bodaProgram/riders/${registrationId}/verifiedAt`] = Date.now();
        updates[`bodaProgram/riders/${registrationId}/status`] = "verified";

        if (!commissionSnapshot.exists()) {
            updates[`bodaProgram/commissions/${commissionId}`] = {
                commissionId,
                marketerId: rider.marketerId || "",
                riderId: registrationId,
                amount: 1000,
                status: "pending",
                createdAt: Date.now(),
                paidAt: null
            };
        }

        await db.ref().update(updates);

        await otpRef.remove();

        return res.status(200).json({
            success: true,
            message: "Phone number verified successfully."
        });

    } catch (error) {
        console.error("VERIFY OTP ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify the code."
        });
    }
}