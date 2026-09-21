const { onValueUpdated } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

initializeApp();


// ================= RIDER COMMISSION =================

exports.createRiderCommission = onValueUpdated(
    {
        ref: "/bodaProgram/riders/{riderId}/otpVerified",
        region: "europe-west1"
    },
    async event => {
        const before = event.data.before.val();
        const after = event.data.after.val();

        if (before === true || after !== true) return;

        const riderId = event.params.riderId;
        const db = getDatabase();

        const snapshot = await db
            .ref(`bodaProgram/riders/${riderId}`)
            .once("value");

        if (!snapshot.exists()) return;

        const rider = snapshot.val();

        if (!rider.marketerId) return;

        const commissionId = `rider_${riderId}`;

        await createCommission(
            commissionId,
            {
                commissionId,
                marketerId: rider.marketerId,
                registrationId: riderId,
                registrationType: "rider",
                amount: 1000,
                status: "pending",
                createdAt: Date.now(),
                paidAt: null
            }
        );
    }
);


// ================= PREGNANT WOMAN COMMISSION =================

exports.createPregnantCommission = onValueUpdated(
    {
        ref: "/bodaProgram/pregnantWomen/{registrationId}/approved",
        region: "europe-west1"
    },
    async event => {
        const before = event.data.before.val();
        const after = event.data.after.val();

        if (before === true || after !== true) return;

        const registrationId =
            event.params.registrationId;

        const db = getDatabase();

        const snapshot = await db
            .ref(
                `bodaProgram/pregnantWomen/${registrationId}`
            )
            .once("value");

        if (!snapshot.exists()) return;

        const woman = snapshot.val();

        if (!woman.marketerId) return;

        // Commission requires both arrival and payment.
        if (
            woman.arrived !== true ||
            woman.paymentConfirmed !== true
        ) {
            console.log(
                "Pregnant registration not eligible:",
                registrationId
            );

            return;
        }

        const commissionId =
            `pregnant_${registrationId}`;

        await createCommission(
            commissionId,
            {
                commissionId,
                marketerId: woman.marketerId,
                registrationId,
                registrationType: "pregnant",
                amount: 500,
                status: "pending",
                createdAt: Date.now(),
                paidAt: null
            }
        );
    }
);


// ================= CREATE COMMISSION =================

async function createCommission(
    commissionId,
    commission
) {
    const db = getDatabase();

    const commissionRef = db.ref(
        `bodaProgram/commissions/${commissionId}`
    );

    const result = await commissionRef.transaction(
        current => {
            if (current !== null) return;

            return commission;
        }
    );

    if (result.committed) {
        console.log(
            "Commission created:",
            commissionId,
            commission.amount
        );
    } else {
        console.log(
            "Commission already exists:",
            commissionId
        );
    }
}