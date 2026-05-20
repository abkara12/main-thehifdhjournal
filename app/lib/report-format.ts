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

function isAbsent(log: WeeklyReportLog) {
  return toText(log.attendance).toLowerCase().includes("absent");
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

  logs.filter((log) => !isAbsent(log)).forEach((log) => {
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
  return logs.filter((log) => !isAbsent(log));
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
  if (presentLogs.length >= 3) return "Building Consistency";

  return "Needs More Consistency";
}

function getSabakStrength(logs: WeeklyReportLog[]) {
  const avg = averageQuality(logs, ["sabakReadQuality", "sabakRead"]);

  if (avg >= 3.2) return "Excellent";
  if (avg >= 2.7) return "Strong";
  if (avg >= 2.1) return "Good";

  return "Can Improve";
}

function getRevisionStrength(logs: WeeklyReportLog[]) {
  const avg = averageQuality(logs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
    "dhorReadQuality",
    "dhorRead",
  ]);

  if (avg >= 3.2) return "Excellent";
  if (avg >= 2.7) return "Strong";
  if (avg >= 2.1) return "Good";

  return "Needs More Revision";
}

function buildTeacherHighlight({
  attendance,
  goalCompleted,
  sabakStrength,
  revisionStrength,
}: {
  attendance: number;
  goalCompleted: boolean;
  sabakStrength: string;
  revisionStrength: string;
}) {
  if (attendance >= 5 && goalCompleted) {
    return "Excellent consistency and effort shown throughout the week.";
  }

  if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    return "Very pleasing effort in sabak this week.";
  }

  if (revisionStrength === "Excellent" || revisionStrength === "Strong") {
    return "Revision was a strong point this week, alhamdulillah.";
  }

  if (attendance <= 2) {
    return "A stronger attendance routine will help progress improve.";
  }

  return "Steady effort was shown this week, with room to build further.";
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
    return `Alhamdulillah, ${studentName} had a very pleasing week. The effort, consistency and progress shown are signs of a strong hifdh routine. Please continue encouraging daily revision at home so this momentum continues, in shaa Allah.`;
  }

  if (attendance <= 2) {
    return `${studentName} will benefit from stronger attendance and consistency. Regular attendance is one of the biggest foundations for steady hifdh progress. Please help build a stronger routine next week, in shaa Allah.`;
  }

  if (revisionStrength === "Needs More Revision") {
    return `${studentName} is making effort, but revision needs extra attention. A few minutes of listening at home daily can make a big difference in strengthening older work.`;
  }

  if (!goalCompleted) {
    return `${studentName} made progress this week, but the weekly goal was not fully completed. With stronger preparation and revision next week, better progress can be achieved, in shaa Allah.`;
  }

  return `Alhamdulillah, ${studentName} made steady progress this week. Please continue supporting this hifdh journey at home through encouragement, revision and du'aa.`;
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

  if (revisionStrength === "Needs More Revision") {
    return "Please listen to revision over the weekend, especially older dhor, so the memorised work remains firm.";
  }

  if (!goalCompleted) {
    return "Please encourage preparation before class so the weekly goal can be completed next week, in shaa Allah.";
  }

  return "Please continue encouraging daily revision at home. Even a short, consistent routine makes a major difference.";
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

  if (attendance >= 5) badges.push("🌟 Full Attendance");
  if (goalCompleted) badges.push("🎯 Weekly Goal Completed");

  if (revisionStrength === "Excellent" || revisionStrength === "Strong") {
    badges.push("📚 Strong Revision");
  }

  if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    badges.push("📖 Strong Sabak");
  }

  return badges.length ? badges : ["🌱 Building Consistency"];
}

function compareNumber(current: number, previous: number, label: string) {
  if (!previous && current) return `✅ ${label} started strongly`;
  if (current > previous) return `✅ ${label} improved`;
  if (current < previous) return `⚠️ ${label} needs more attention`;
  return `➖ ${label} remained steady`;
}

export function formatWeeklyReportText({
  studentName,
  madrassahName,
  monthLabel,
  logs,
  previousLogs = [],
  teacherName = "Ustad",
}: WeeklyReportInput) {
  const currentLogs = logs || [];
  const latestLog = currentLogs[0];

  const presentLogs = getPresentLogs(currentLogs);

  const weeklyGoal = toText(latestLog?.weeklyGoal) || "-";
  const goalCompleted = getGoalCompleted(latestLog);
  const goalStatus = goalCompleted ? "Completed ✅" : "Still In Progress";
  const attendance = presentLogs.length;

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

  const previousAttendance = getPresentLogs(previousLogs).length;

  const weeklyReflection =
    toText(latestLog?.weeklyReflection) ||
    buildAutoReflection({
      studentName,
      overallWeek,
      attendance,
      goalCompleted,
      revisionStrength,
    });

  const teacherHighlight = buildTeacherHighlight({
    attendance,
    goalCompleted,
    sabakStrength,
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

  let reportText = `السلام عليكم ورحمة الله وبركاته

🌙 *Weekly Hifdh Progress Report*

*Student:* ${studentName}
*Madrassah:* ${madrassahName}
*Month:* ${monthLabel || "-"}
*Teacher:* ${teacherName}

━━━━━━━━━━━━━━━━━━

🌟 *Teacher Highlight*

${teacherHighlight}

━━━━━━━━━━━━━━━━━━

🏆 *This Week At A Glance*

⭐ *Overall:* ${overallWeek}
📅 *Attendance:* ${attendance}/5 days
🎯 *Weekly Goal:* ${weeklyGoal}
✅ *Goal Status:* ${goalStatus}
📖 *Sabak:* ${sabakStrength}
🔁 *Revision:* ${revisionStrength}

━━━━━━━━━━━━━━━━━━

💬 *Teacher’s Reflection*

${weeklyReflection}

━━━━━━━━━━━━━━━━━━

🏅 *This Week’s Achievements*

${badges.map((badge) => `• ${badge}`).join("\n")}

━━━━━━━━━━━━━━━━━━

🏡 *Focus For Home*

${parentFocus}

`;

  if (previousLogs.length) {
    reportText += `━━━━━━━━━━━━━━━━━━

📈 *Compared To Last Week*

${compareNumber(attendance, previousAttendance, "Attendance")}
${compareNumber(currentSabakAvg, previousSabakAvg, "Sabak")}
${compareNumber(currentRevisionAvg, previousRevisionAvg, "Revision")}

`;
  }

  if (!currentLogs.length) {
    reportText += `━━━━━━━━━━━━━━━━━━

No logs were recorded for this week.

Please ensure daily progress is logged so parents can receive meaningful weekly feedback.`;
  } else {
    reportText += `━━━━━━━━━━━━━━━━━━

📚 *Daily Breakdown*

`;

    currentLogs.forEach((log, index) => {
      const { dayName, dateFormatted } = formatDateKey(log.dateKey);

      if (isAbsent(log)) {
        reportText += `📅 *${dayName} - ${dateFormatted}*

❌ *Absent*`;
      } else {
        reportText += `📅 *${dayName} - ${dateFormatted}*

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

Every letter recited is an investment for this world and the Aakhirah. May Allah place barakah in this hifdh journey and make ${studentName} from the people of the Qur’an.

*Powered by The Hifdh Journal*`;

  return reportText.trim();
}