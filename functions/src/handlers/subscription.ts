import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {initializeApp} from "firebase-admin/app";
// import * as sgMail from "@sendgrid/mail"
// import * as functions from "firebase-functions"

// initial Firebase Admin SDK
if (!admin.apps.length) {
  initializeApp();
}

export const revenueCatWebhookSSV2 = functions.https.onRequest(async (req: Request, res: Response) => {
  try {
    // Verify the request source (optional, requires RevenueCat's signature key)
    const auth = req.headers.authorization;
    if (auth !== "Bearer 2N9Kd093jalsk23JDDDass941") {
      console.error("Unauthorized webhook", auth);
      res.status(200).send("Ignored. Unauthorized.");
      return;
    }


    console.log("req.body: ", req.body);

    const event = req.body.event; //
    if (!event) {
      console.error("No event field in body");
      res.status(400).send("Bad Request");
      return;
    }
    const appUserId = event.app_user_id; // RevenueCat user ID
    const eventType = event.type;
    const entitlementId = event.entitlement_id || event.entitlement_ids?.[0] || ""; //
    const productId = event.product_id;

    console.log("event value:", event);
    console.log("appUserId: ", appUserId);
    console.log("eventType: ", eventType);
    console.log("entitlementId: ", entitlementId);

    // Update Firestore based on event type
    const userRef = admin.firestore().collection("users").doc(appUserId);
    // Helpers
    const expiration = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
    const purchaseDate = event.purchased_at_ms ? new Date(event.purchased_at_ms) : null;
    const platform =
      event.store === "PLAY_STORE" ?
        "Android" :
        event.store === "APP_STORE" ?
          "iOS" :
          "Null";
    // Handle Subscription Events ----------

    // --- A. Expired or BILLING_ISSUE ---
    if (eventType === "EXPIRATION" || eventType === "BILLING_ISSUE") {
      console.log("Subscription expired for", appUserId);

      await userRef.set({
        hasActiveSubscription: false,
        subscription: {
          type: "None",
          status: "Expired",
          productId: productId,
          originalAppUserId: event.original_app_user_id || null,
          expirationAt: expiration,
          latestPurchaseAt: purchaseDate,
          platform: platform,
        },
      }, {merge: true});

      res.status(200).send("Subscription status updated (expired).");
      return;
    } else if (eventType === "CANCELLATION") {
      // --- B. CANCELLATION ---
      console.log("Subscription cancelled for", appUserId);

      await userRef.set({
        subscription: {
          expirationAt: expiration,
          latestPurchaseAt: purchaseDate,
          // status still（Active）
          productId,
        },
      }, {merge: true});

      res.status(200).send("Subscription status updated (CANCELLATION).");
      return;
    } else if (eventType === "INITIAL_PURCHASE" || eventType === "RENEWAL") {
      // --- C. Active subscription (initial purchase or renewal) ---
      console.log("Subscription active:", appUserId);

      await userRef.set({
        hasActiveSubscription: true,
        subscription: {
          type: "All_Access",
          status: "Active",
          productId: productId,
          originalAppUserId: event.original_app_user_id || null,
          expirationAt: expiration,
          latestPurchaseAt: purchaseDate,
          platform: platform,
        },
      }, {merge: true});

      res.status(200).send("Subscription status updated (active).");
      return;
    } else {
    // --- C. Default catch ---
      console.log("Unhandled RevenueCat event:", eventType);

      await userRef.set(
        {lastUnhandledRCEvent: eventType},
        {merge: true}
      );

      res.status(200).send("Webhook received and processed");
      return;
    }
  } catch (error) {
    console.error("Error processing Webhook:", error);
    res.status(500).send("Internal Server Error");
    return;
  }
});
