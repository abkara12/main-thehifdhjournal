import admin from "firebase-admin";

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

function formatReportText({
  studentName,
  madrassahName,
  monthLabel,
  logs,
}: {
  studentName: string;
  madrassahName: string;
  monthLabel: string;
  logs: admin.firestore.QueryDocumentSnapshot[];
}) {
  let reportText = `السلام عليكم ورحمة الله وبركاته

*Weekly Hifdh Report*
*Student:* ${studentName}
*Madrassah:* ${madrassahName}
*Month:* ${monthLabel}

`;

  if (logs.length > 0) {
    logs.forEach((logDoc, index) => {
      const logData = logDoc.data();
      const dateKey = (logData.dateKey as string | undefined) || "";
      const dateObj = dateKey ? new Date(`${dateKey}T00:00:00`) : new Date();

      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const dateFormatted = dateObj.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });

      reportText += `*${dayName} ${dateFormatted}*\n\n`;
      reportText += `*Attendance:* ${logData.attendance ?? "-"}\n`;
      reportText += `*Sabak:* ${logData.sabak ?? "-"} | ${logData.sabakReadQuality ?? logData.sabakRead ?? "-"}\n`;
      if (logData.sabakReadNotes) reportText += `Note: ${logData.sabakReadNotes}\n`;
      reportText += `\n`;

      reportText += `*Sabak Dhor:* ${logData.sabakDhor ?? "-"} | ${logData.sabakDhorReadQuality ?? logData.sabakDhorRead ?? "-"}\n`;
      if (logData.sabakDhorReadNotes) reportText += `Note: ${logData.sabakDhorReadNotes}\n`;
      reportText += `\n`;

      reportText += `*Dhor:* ${logData.dhor ?? "-"} | ${logData.dhorReadQuality ?? logData.dhorRead ?? "-"}\n`;
      if (logData.dhorReadNotes) reportText += `Note: ${logData.dhorReadNotes}\n`;
      reportText += `\n`;

      if (logData.sabakDhorMistakes) {
        reportText += `*Sabak Dhor Mistakes:* ${logData.sabakDhorMistakes}\n`;
      }
      if (logData.dhorMistakes) {
        reportText += `*Dhor Mistakes:* ${logData.dhorMistakes}\n`;
      }

      if (index !== logs.length - 1) {
        reportText += `──────────────\n\n`;
      }
    });

    const latestLog = logs[0].data();
    const goalStatus = latestLog.weeklyGoalCompleted ? "Completed" : "In Progress";

    reportText += `*Weekly Goal:* ${latestLog.weeklyGoal ?? "-"}\n`;
    reportText += `*Goal Status:* ${goalStatus}\n`;
    reportText += `Duration: ${latestLog.weeklyGoalDurationDays ?? "-"} day(s)\n\n`;
    reportText += `────────────────\n*Powered by The Hifdh Journal*`;
  } else {
    reportText += `No logs recorded for the last 7 days.\n\n────────────────\n*Powered by The Hifdh Journal*`;
  }

  return reportText.trim();
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const meRef = db.collection("users").doc(uid);
    const meSnap = await meRef.get();

    if (!meSnap.exists) {
      return new Response("User record not found", { status: 404 });
    }

    const me = meSnap.data() as {
      role?: string;
      madrassahId?: string;
      madrassahName?: string;
    };

    if (!me.role || !["admin", "teacher", "super_admin"].includes(me.role)) {
      return new Response("Forbidden", { status: 403 });
    }

    if (!me.madrassahId && me.role !== "super_admin") {
      return new Response("No madrassah linked", { status: 400 });
    }

    const madrassahId = me.madrassahId!;
    let madrassahName = me.madrassahName || "Madrassah";

    const madrassahSnap = await db.collection("madrassahs").doc(madrassahId).get();
    if (madrassahSnap.exists) {
      const madrassahData = madrassahSnap.data() as { name?: string };
      madrassahName = madrassahData.name || madrassahName;
    }

    const studentsSnap = await db
      .collection("madrassahs")
      .doc(madrassahId)
      .collection("students")
      .orderBy("fullName")
      .get();

    const reports: {
      student: string;
      parentName: string;
      parentPhone: string;
      parentEmail: string;
      report: string;
    }[] = [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const studentDoc of studentsSnap.docs) {
      const studentData = studentDoc.data() as {
        fullName?: string;
        parentName?: string;
        parentPhone?: string;
        parentEmail?: string;
      };

      const logsSnap = await db
        .collection("madrassahs")
        .doc(madrassahId)
        .collection("students")
        .doc(studentDoc.id)
        .collection("logs")
        .orderBy("dateKey", "desc")
        .get();

      const recentLogs = logsSnap.docs.filter((logDoc) => {
        const logData = logDoc.data();
        const dateKey = logData.dateKey as string | undefined;
        if (!dateKey) return false;

        const logDate = new Date(`${dateKey}T00:00:00`);
        return logDate >= sevenDaysAgo;
      });

      let monthLabel = "";
      if (recentLogs.length > 0) {
        const firstLog = recentLogs[0].data();
        const d = firstLog.dateKey ? new Date(`${firstLog.dateKey}T00:00:00`) : new Date();
        monthLabel = d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }

      const reportText = formatReportText({
        studentName: studentData.fullName || "Student",
        madrassahName,
        monthLabel,
        logs: recentLogs,
      });

      reports.push({
        student: studentData.fullName || "Student",
        parentName: studentData.parentName || "",
        parentPhone: studentData.parentPhone || "",
        parentEmail: studentData.parentEmail || "",
        report: reportText,
      });
    }

    let html = `<html><head><meta charset="UTF-8"><title>Weekly Hifdh Reports</title></head><body style="font-family:sans-serif;background:#f6f6f6;padding:20px;">`;

    html += `<div style="max-width:1000px;margin:0 auto;">`;
    html += `<h1 style="margin-bottom:8px;">Weekly Hifdh Reports</h1>`;
    html += `<p style="margin-top:0;color:#555;">${madrassahName}</p>`;

    reports.forEach((r) => {
      html += `<div style="border:1px solid #e0e0e0;padding:20px;margin:20px 0;border-radius:12px;background:#ffffff;">
        <h2 style="margin-bottom:6px;">${r.student}</h2>
        <div style="color:#666;font-size:14px;margin-bottom:12px;">
          Parent: ${r.parentName || "-"}<br/>
          Phone: ${r.parentPhone || "-"}<br/>
          Email: ${r.parentEmail || "-"}
        </div>
        <pre style="white-space:pre-wrap;font-family:monospace;background:#fafafa;padding:16px;border-radius:8px;border:1px solid #eee;">${r.report}</pre>
        <button style="margin-top:10px;padding:10px 14px;border:none;background:#111;color:white;border-radius:8px;cursor:pointer;"
          onclick="navigator.clipboard.writeText(\`${r.report.replace(/`/g, "\\`")}\`)">
          Copy to Clipboard
        </button>
      </div>`;
    });

    html += `</div></body></html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
}