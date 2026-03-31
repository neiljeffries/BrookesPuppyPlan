import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {setGlobalOptions} from "firebase-functions/v2/options";

admin.initializeApp();
const db = admin.database();

setGlobalOptions({maxInstances: 10});

export const sendReminders = onSchedule("every 1 minutes", async () => {
  const now = new Date();
  const usersSnap = await db.ref("users").once("value");
  const users = usersSnap.val();
  if (!users) return;

  for (const [uid, userData] of Object.entries(users) as [string, any][]) {
    const reminders = userData.reminders;
    const fcmTokens = userData.fcmTokens;
    if (!reminders || !fcmTokens) continue;

    const tokens: string[] = Object.values(fcmTokens)
      .map((t: any) => t.token)
      .filter(Boolean);
    if (tokens.length === 0) continue;

    for (const [remId, rem] of Object.entries(reminders) as [string, any][]) {
      if (rem.sent) continue;

      const remTime = new Date(rem.dateTime);
      if (remTime > now) continue;

      // Send the notification
      try {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: rem.title ?? "Puppy Plan Reminder",
            body: rem.body ?? "",
          },
          data: {
            title: rem.title ?? "Puppy Plan Reminder",
            body: rem.body ?? "",
            category: rem.category ?? "custom",
          },
          // Required for background delivery on Chrome/Android
          webpush: {
            fcmOptions: {
              link: "https://neiljeffries-e25e8.web.app/reminders",
            },
          },
        });
      } catch (err) {
        console.error(`Failed to send reminder ${remId} for user ${uid}:`, err);
        continue;
      }

      // Handle repeat or mark sent
      if (rem.repeat === "daily") {
        const next = new Date(remTime);
        next.setDate(next.getDate() + 1);
        await db.ref(`users/${uid}/reminders/${remId}/dateTime`)
          .set(next.toISOString());
      } else if (rem.repeat === "weekly") {
        const next = new Date(remTime);
        next.setDate(next.getDate() + 7);
        await db.ref(`users/${uid}/reminders/${remId}/dateTime`)
          .set(next.toISOString());
      } else {
        await db.ref(`users/${uid}/reminders/${remId}/sent`).set(true);
      }
    }
  }
});
