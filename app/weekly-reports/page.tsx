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

function escapeForScript(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

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

export default async function WeeklyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; key?: string }>;
}) {
  const params = await searchParams;
  const madrassahId = (params.m || "").trim();
  const key = (params.key || "").trim();

  if (!madrassahId || !key) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Invalid report link</h1>
          <p className="mt-2 text-gray-600">Missing madrassah details.</p>
        </div>
      </main>
    );
  }

  const madrassahSnap = await db.collection("madrassahs").doc(madrassahId).get();

  if (!madrassahSnap.exists) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Madrassah not found</h1>
        </div>
      </main>
    );
  }

  const madrassahData = madrassahSnap.data() as {
    name?: string;
    reportAccessKey?: string;
  };

  if ((madrassahData.reportAccessKey || "") !== key) {
    return (
      <main className="min-h-screen grid place-items-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Invalid access key</h1>
        </div>
      </main>
    );
  }

  const madrassahName = madrassahData.name || "Madrassah";

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

  return (
    <main style={{ fontFamily: "sans-serif", background: "#f6f6f6", minHeight: "100vh", padding: 20 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>Weekly Hifdh Reports</h1>
        <p style={{ marginTop: 0, color: "#555" }}>{madrassahName}</p>

        {reports.map((r, i) => (
          <div
            key={`${r.student}-${i}`}
            style={{
              border: "1px solid #e0e0e0",
              padding: 20,
              margin: "20px 0",
              borderRadius: 12,
              background: "#ffffff",
            }}
          >
            <h2 style={{ marginBottom: 6 }}>{r.student}</h2>
            <div style={{ color: "#666", fontSize: 14, marginBottom: 12 }}>
              Parent: {r.parentName || "-"}
              <br />
              Phone: {r.parentPhone || "-"}
              <br />
              Email: {r.parentEmail || "-"}
            </div>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                background: "#fafafa",
                padding: 16,
                borderRadius: 8,
                border: "1px solid #eee",
              }}
            >
              {r.report}
            </pre>

            <button
              type="button"
              style={{
                marginTop: 10,
                padding: "10px 14px",
                border: "none",
                background: "#111",
                color: "white",
                borderRadius: 8,
                cursor: "pointer",
              }}
              data-copy-report={escapeForScript(r.report)}
            >
              Copy to Clipboard
            </button>
          </div>
        ))}

        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.querySelectorAll("[data-copy-report]").forEach((btn) => {
                btn.addEventListener("click", function () {
                  const text = this.getAttribute("data-copy-report") || "";
                  navigator.clipboard.writeText(text);
                });
              });
            `,
          }}
        />
      </div>
    </main>
  );
}