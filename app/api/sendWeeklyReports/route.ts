import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

export async function GET() {
  const studentsSnap = await getDocs(collection(db, "users"));

  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(today.getDate() - 7);

  const reports: any[] = [];

  for (const studentDoc of studentsSnap.docs) {
    const student = studentDoc.data();

    if (student.role !== "student") continue;

    const logsSnap = await getDocs(
      collection(db, "users", studentDoc.id, "logs")
    );

    const weeklyLogs: any[] = [];

    logsSnap.forEach((doc) => {
      const log = doc.data();
      const logDate = new Date(log.dateKey);

      if (logDate >= lastWeek) {
        weeklyLogs.push(log);
      }
    });

    const report = generateReport(student.username, weeklyLogs);

    reports.push({
      student: student.username,
      parentPhone: student.parentPhone,
      report
    });
  }

  return Response.json({ reports });
}

function generateReport(studentName: string, logs: any[]) {
  let message = `Assalaamu Alaikum\n\n`;
  message += `Weekly Hifdh Report\n`;
  message += `Student: ${studentName}\n\n`;

  logs.forEach((log) => {
    message += `📅 ${log.dateKey}\n`;

    if (log.currentSabak)
      message += `Sabak: ${log.currentSabak}\n`;

    if (log.currentSabakReadQuality)
      message += `Quality: ${log.currentSabakReadQuality}\n`;

    if (log.currentSabakReadNotes)
      message += `Notes: ${log.currentSabakReadNotes}\n`;

    if (log.currentDhor)
      message += `Dhor: ${log.currentDhor}\n`;

    message += `\n`;
  });

  return message;
}