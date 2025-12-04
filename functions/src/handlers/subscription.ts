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
      res.status(200).send("Webhook received and processed");
    }


    console.log("req.body: ", req.body);

    const event = req.body.event; //
    const appUserId = event.app_user_id; // RevenueCat user ID
    const eventType = event.type;
    const entitlementId = event.entitlement_id || event.entitlement_ids?.[0] || ""; //

    console.log("event value:", event);
    console.log("appUserId: ", appUserId);
    console.log("eventType: ", eventType);
    console.log("entitlementId: ", entitlementId);

    // Update Firestore based on event type
    if (eventType === "EXPIRATION") {
      console.log("EXPIRATION");
      await admin.firestore().collection("users").doc(appUserId).set({
        // TODO
      }, {
        merge: true,
      });
    } else if (eventType === "RENEWAL" || eventType === "INITIAL_PURCHASE") {
      // Subscription renewal or first purchase
      console.log("Subscription renewal or first purchase");
      await admin.firestore().collection("users").doc(appUserId).set({
        // TODO

      }, {
        merge: true,
      }
      );
    } else {
      console.log("eventType: ", eventType);
      await admin.firestore().collection("users").doc(appUserId).set({
        subEventType: eventType,
      },
      {merge: true}
      );
      console.warn("Unhandled event types:", eventType);
    }

    res.status(200).send("Webhook received and processed");
  } catch (error) {
    console.error("Error processing Webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});
