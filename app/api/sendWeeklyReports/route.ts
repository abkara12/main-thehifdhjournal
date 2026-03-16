// /app/api/sendWeeklyReports/route.ts
import admin from "firebase-admin";

// Initialize Admin SDK
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase environment variables are not set.");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();

export async function GET() {
  try {
    const usersSnapshot = await db.collection("users").get();
    const reports: any[] = [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Pull logs
      const logsSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("logs")
        .orderBy("createdAt", "desc")
        .get();

      const recentLogs = logsSnapshot.docs.filter((logDoc) => {
        const logData = logDoc.data();
        const createdAt = logData.createdAt?.toDate?.();
        return createdAt && createdAt >= sevenDaysAgo;
      });

      // Build the report
      let reportText = `Assalaamu Alaikum\n\nWeekly Hifdh Report\nStudent: ${userData.username}\n📅 ${new Date().toLocaleDateString()}\n\n`;

      // Add weekly goal info from user doc
      reportText += `Weekly Goal: ${userData.weeklyGoal ?? "-"}\n`;
      reportText += `Goal Start Date: ${userData.weeklyGoalStartDateKey ?? "-"}\n`;
      reportText += `Goal Week Key: ${userData.weeklyGoalWeekKey ?? "-"}\n`;
      reportText += `Goal Completed Date: ${userData.weeklyGoalCompletedDateKey ?? "-"}\n`;
      reportText += `Goal Duration (days): ${userData.weeklyGoalDurationDays ?? "-"}\n\n`;

      if (recentLogs.length > 0) {
        recentLogs.forEach((logDoc) => {
          const logData = logDoc.data();

          // Use exact field names and coalesce to "-" if missing
          reportText += `Log Date: ${logData.createdAt?.toDate().toLocaleString() ?? "-"}\n`;
          reportText += `currentDhor: ${logData["currentDhor"] ?? "-"}\n`;
          reportText += `currentDhorMistakes: ${logData["currentDhorMistakes"] ?? "-"}\n`;
          reportText += `currentDhorReadNotes: ${logData["currentDhorReadNotes"] ?? "-"}\n`;
          reportText += `currentDhorReadQuality: ${logData["currentDhorReadQuality"] ?? "-"}\n`;
          reportText += `currentSabak: ${logData["currentSabak"] ?? "-"}\n`;
          reportText += `currentSabakDhor: ${logData["currentSabakDhor"] ?? "-"}\n`;
          reportText += `currentSabakDhorMistakes: ${logData["currentSabakDhorMistakes"] ?? "-"}\n`;
          reportText += `currentSabakDhorReadNotes: ${logData["currentSabakDhorReadNotes"] ?? "-"}\n`;
          reportText += `currentSabakDhorReadQuality: ${logData["currentSabakDhorReadQuality"] ?? "-"}\n`;
          reportText += `currentSabakReadNotes: ${logData["currentSabakReadNotes"] ?? "-"}\n`;
          reportText += `currentSabakReadQuality: ${logData["currentSabakReadQuality"] ?? "-"}\n\n`;
        });
      } else {
        reportText += `No logs for the last 7 days.\n`;
      }

      reports.push({
        student: userData.username,
        parentPhone: userData.parentPhone,
        report: reportText.trim(),
      });
    }

    return new Response(JSON.stringify({ reports }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}