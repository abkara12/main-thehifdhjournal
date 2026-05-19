import { formatDateKey } from "./date";

export type WeeklyReportLog = {
  dateKey?: string;
  attendance?: string;
  sabak?: string;
  sabakRead?: string;
  sabakReadQuality?: string;
  sabakReadNotes?: string;
  sabakDhor?: string;
  sabakDhorRead?: string;
  sabakDhorReadQuality?: string;
  sabakDhorReadNotes?: string;
  dhor?: string;
  dhorRead?: string;
  dhorReadQuality?: string;
  dhorReadNotes?: string;
  sabakDhorMistakes?: string;
  dhorMistakes?: string;
  generalNotes?: string;
  weeklyReflection?: string;
  weeklyGoal?: string;
  weeklyGoalCompleted?: boolean;
  weeklyGoalCompletedDateKey?: string;
  weeklyGoalDurationDays?: number | string;
};

export type WeeklyReportInput = {
  studentName: string;
  madrassahName: string;
  monthLabel: string;
  logs: WeeklyReportLog[];
  previousLogs?: WeeklyReportLog[];
  monthlyLogs?: WeeklyReportLog[];
  teacherName?: string;
};

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value.trim() : String(value).trim();
}

function getQualityScore(value?: string) {
  const q = toText(value).toLowerCase();

  if (q.includes("excellent")) return 4;
  if (q.includes("very good")) return 3.5;
  if (q.includes("good")) return 3;
  if (q.includes("fair")) return 2;
  if (q.includes("weak")) return 1;
  if (q.includes("poor")) return 0.5;

  return 2;
}

function averageQuality(logs: WeeklyReportLog[], fields: (keyof WeeklyReportLog)[]) {
  let total = 0;
  let count = 0;

  logs.forEach((log) => {
    fields.forEach((field) => {
      const value = toText(log[field]);
      if (value) {
        total += getQualityScore(value);
        count++;
      }
    });
  });

  return count ? total / count : 0;
}

function getPresentLogs(logs: WeeklyReportLog[]) {
  return logs.filter((log) => {
    const attendance = toText(log.attendance).toLowerCase();

    if (!attendance) return true;
    if (attendance.includes("absent")) return false;

    return true;
  });
}

function getGoalCompleted(log?: WeeklyReportLog) {
  return log?.weeklyGoalCompleted === true || Boolean(log?.weeklyGoalCompletedDateKey);
}

function getOverallWeek(logs: WeeklyReportLog[]) {
  if (!logs.length) return "No Logs Recorded";

  const presentLogs = getPresentLogs(logs);

  const avg = averageQuality(logs, [
    "sabakReadQuality",
    "sabakRead",
    "sabakDhorReadQuality",
    "sabakDhorRead",
    "dhorReadQuality",
    "dhorRead",
  ]);

  if (presentLogs.length >= 5 && avg >= 3.2) return "Outstanding ⭐";
  if (presentLogs.length >= 5 && avg >= 2.7) return "Excellent";
  if (presentLogs.length >= 4 && avg >= 2.2) return "Good";
  if (presentLogs.length >= 3) return "Needs Attention";

  return "Requires More Consistency";
}

function getSabakStrength(logs: WeeklyReportLog[]) {
  if (!logs.length) return "No sabak recorded";

  const avg = averageQuality(logs, ["sabakReadQuality", "sabakRead"]);

  if (avg >= 3.2) return "Excellent";
  if (avg >= 2.7) return "Strong";
  if (avg >= 2.1) return "Good";

  return "Needs Attention";
}

function getRevisionStrength(logs: WeeklyReportLog[]) {
  if (!logs.length) return "No revision recorded";

  const avg = averageQuality(logs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
    "dhorReadQuality",
    "dhorRead",
  ]);

  if (avg >= 3.2) return "Excellent";
  if (avg >= 2.7) return "Strong";
  if (avg >= 2.1) return "Good";

  return "Needs Attention";
}

function compareNumber(current: number, previous: number, label: string) {
  if (!previous && current) return `✅ ${label} started strongly`;
  if (current > previous) return `✅ ${label} improved`;
  if (current < previous) return `⚠️ ${label} decreased`;
  return `➖ ${label} stayed the same`;
}

function getBadges({
  attendance,
  goalCompleted,
  revisionStrength,
  sabakStrength,
}: {
  attendance: number;
  goalCompleted: boolean;
  revisionStrength: string;
  sabakStrength: string;
}) {
  const badges: string[] = [];

  if (attendance >= 5) badges.push("🌟 Full Attendance Star");
  if (goalCompleted) badges.push("🎯 Goal Achiever");

  if (revisionStrength === "Excellent" || revisionStrength === "Strong") {
    badges.push("📚 Strong Revision Badge");
  }

  if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    badges.push("📖 Sabak Excellence Badge");
  }

  if (badges.length >= 3) {
    badges.push("🔥 Consistency Champion");
  }

  return badges.length ? badges : ["🌱 Building Consistency"];
}

function buildAutoReflection({
  studentName,
  overallWeek,
  attendance,
  goalCompleted,
  revisionStrength,
}: {
  studentName: string;
  overallWeek: string;
  attendance: number;
  goalCompleted: boolean;
  revisionStrength: string;
}) {
  if (overallWeek.includes("Outstanding") || overallWeek === "Excellent") {
    return `Alhamdulillah, ${studentName} had a very pleasing week. The consistency, effort and progress shown are signs of a strong hifdh routine. Please continue encouraging daily revision at home so this momentum continues, in shaa Allah.`;
  }

  if (attendance <= 2) {
    return `${studentName} will benefit greatly from stronger attendance and consistency. Regular attendance is one of the biggest keys to steady hifdh progress. Please help ensure a stronger routine next week, in shaa Allah.`;
  }

  if (revisionStrength === "Needs Attention") {
    return `${studentName} is making effort, but revision requires extra attention. A few minutes of listening at home daily can make a big difference in strengthening older work.`;
  }

  if (!goalCompleted) {
    return `${studentName} made progress this week, but the weekly goal was not fully completed. With stronger preparation and revision next week, better progress can be achieved, in shaa Allah.`;
  }

  return `Alhamdulillah, ${studentName} made steady progress this week. Please continue supporting the hifdh journey at home through encouragement, revision and du'aa.`;
}

function buildParentFocus({
  attendance,
  goalCompleted,
  revisionStrength,
}: {
  attendance: number;
  goalCompleted: boolean;
  revisionStrength: string;
}) {
  if (attendance <= 2) {
    return "Please focus on full attendance next week. Consistency is one of the strongest foundations for successful hifdh.";
  }

  if (revisionStrength === "Needs Attention") {
    return "Please listen to revision over the weekend, especially older dhor, so the memorised work remains firm.";
  }

  if (!goalCompleted) {
    return "Please encourage preparation before class so the weekly goal can be completed next week, in shaa Allah.";
  }

  return "Please continue encouraging daily revision at home. Even a short, consistent routine makes a major difference.";
}

function getLoggedDayStreak(logs: WeeklyReportLog[]) {
  const uniqueDays = new Set(
    logs.map((log) => toText(log.dateKey)).filter(Boolean)
  );

  return uniqueDays.size;
}

function getGoalStreak(logs: WeeklyReportLog[]) {
  const completedGoalDates = new Set(
    logs
      .filter((log) => getGoalCompleted(log))
      .map((log) => toText(log.weeklyGoalCompletedDateKey || log.dateKey))
      .filter(Boolean)
  );

  return completedGoalDates.size;
}

export function formatWeeklyReportText({
  studentName,
  madrassahName,
  monthLabel,
  logs,
  previousLogs = [],
  monthlyLogs,
  teacherName = "Ustad",
}: WeeklyReportInput) {
  const currentLogs = logs || [];
  const currentMonthlyLogs = monthlyLogs?.length ? monthlyLogs : currentLogs;

  const latestLog = currentLogs[0];
  const presentLogs = getPresentLogs(currentLogs);

  const weeklyGoal = toText(latestLog?.weeklyGoal) || "-";
  const goalCompleted = getGoalCompleted(latestLog);
  const goalStatus = goalCompleted ? "Achieved ✅" : "In Progress ⚠️";
  const duration = toText(latestLog?.weeklyGoalDurationDays) || "-";

  const attendance = presentLogs.length;
  const previousAttendance = getPresentLogs(previousLogs).length;

  const overallWeek = getOverallWeek(currentLogs);
  const sabakStrength = getSabakStrength(currentLogs);
  const revisionStrength = getRevisionStrength(currentLogs);

  const currentSabakAvg = averageQuality(currentLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  const previousSabakAvg = averageQuality(previousLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  const currentRevisionAvg = averageQuality(currentLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
    "dhorReadQuality",
    "dhorRead",
  ]);

  const previousRevisionAvg = averageQuality(previousLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
    "dhorReadQuality",
    "dhorRead",
  ]);

  const realWeeklyReflection = toText(latestLog?.weeklyReflection);

  const weeklyReflection =
    realWeeklyReflection ||
    buildAutoReflection({
      studentName,
      overallWeek,
      attendance,
      goalCompleted,
      revisionStrength,
    });

  const parentFocus = buildParentFocus({
    attendance,
    goalCompleted,
    revisionStrength,
  });

  const badges = getBadges({
    attendance,
    goalCompleted,
    revisionStrength,
    sabakStrength,
  });

  const loggedDayStreak = getLoggedDayStreak(currentMonthlyLogs);
  const goalStreak = getGoalStreak(currentMonthlyLogs);

  let reportText = `السلام عليكم ورحمة الله وبركاته

🌙 *Weekly Hifdh Journey Report*

*Student:* ${studentName}
*Madrassah:* ${madrassahName}
*Month:* ${monthLabel || "-"}
*Teacher:* ${teacherName}

━━━━━━━━━━━━━━━━━━

🏆 *This Week’s Snapshot*

⭐ *Overall Week:* ${overallWeek}
📅 *Attendance:* ${attendance}/5 days
🎯 *Weekly Goal:* ${weeklyGoal}
✅ *Goal Status:* ${goalStatus}
📖 *Sabak Strength:* ${sabakStrength}
🔁 *Revision Strength:* ${revisionStrength}
⏳ *Goal Duration:* ${duration} day(s)

━━━━━━━━━━━━━━━━━━

💬 *Weekly Reflection From ${teacherName}*

${weeklyReflection}

━━━━━━━━━━━━━━━━━━

📈 *Progress Compared To Last Week*

${
  previousLogs.length
    ? `${compareNumber(attendance, previousAttendance, "Attendance")}
${compareNumber(currentSabakAvg, previousSabakAvg, "Sabak quality")}
${compareNumber(currentRevisionAvg, previousRevisionAvg, "Revision quality")}`
    : "Previous week data is not available yet. From next week, this section will show improvement trends, in shaa Allah."
}

━━━━━━━━━━━━━━━━━━

🔥 *Current Streaks*

• ${goalStreak} goal achievement record(s) this month
• ${loggedDayStreak} logged day(s) recorded this month

━━━━━━━━━━━━━━━━━━

🏅 *This Week’s Achievements*

${badges.map((badge) => `• ${badge}`).join("\n")}

━━━━━━━━━━━━━━━━━━

🏡 *Parent Focus For The Weekend*

${parentFocus}

━━━━━━━━━━━━━━━━━━

📊 *Monthly Summary*

📅 Logs Recorded: ${currentMonthlyLogs.length}
🎯 Goals Achieved: ${goalStreak}
📖 Strongest Area: ${sabakStrength}
🔁 Focus Area: ${
    revisionStrength === "Needs Attention"
      ? "Older dhor revision"
      : "Maintain consistency"
  }

`;

  if (!currentLogs.length) {
    reportText += `━━━━━━━━━━━━━━━━━━

No logs were recorded for this week.

Please ensure daily progress is logged so parents can receive meaningful weekly feedback.`;
  } else {
    reportText += `━━━━━━━━━━━━━━━━━━

📚 *Detailed Daily Breakdown*

`;

    currentLogs.forEach((log, index) => {
      const { dayName, dateFormatted } = formatDateKey(log.dateKey);

      reportText += `📅 *${dayName} - ${dateFormatted}*

📌 *Attendance*
${toText(log.attendance) || "-"}

📖 *Sabak*
${toText(log.sabak) || "-"} | ${
        toText(log.sabakReadQuality) || toText(log.sabakRead) || "-"
      }`;

      if (toText(log.sabakReadNotes)) {
        reportText += `
_Note:_ ${toText(log.sabakReadNotes)}`;
      }

      reportText += `

🔁 *Sabak Dhor*
${toText(log.sabakDhor) || "-"} | ${
        toText(log.sabakDhorReadQuality) || toText(log.sabakDhorRead) || "-"
      }`;

      if (toText(log.sabakDhorReadNotes)) {
        reportText += `
_Note:_ ${toText(log.sabakDhorReadNotes)}`;
      }

      reportText += `

📚 *Dhor*
${toText(log.dhor) || "-"} | ${
        toText(log.dhorReadQuality) || toText(log.dhorRead) || "-"
      }`;

      if (toText(log.dhorReadNotes)) {
        reportText += `
_Note:_ ${toText(log.dhorReadNotes)}`;
      }

      if (toText(log.sabakDhorMistakes)) {
        reportText += `

⚠️ *Sabak Dhor Mistakes*
${toText(log.sabakDhorMistakes)}`;
      }

      if (toText(log.dhorMistakes)) {
        reportText += `

⚠️ *Dhor Mistakes*
${toText(log.dhorMistakes)}`;
      }

      if (toText(log.generalNotes)) {
        reportText += `

🗒️ *General Note*
${toText(log.generalNotes)}`;
      }

      if (index !== currentLogs.length - 1) {
        reportText += `

──────────────

`;
      }
    });
  }

  reportText += `

━━━━━━━━━━━━━━━━━━

💬 *Parent Reply Options*

You may reply with:

1️⃣ Concern  
2️⃣ Appreciation  
3️⃣ Question for ${teacherName}

━━━━━━━━━━━━━━━━━━

May Allah place barakah in this hifdh journey and make the Qur’an a means of success in this world and the Aakhirah.

*Powered by The Hifdh Journal*`;

  return reportText.trim();
}