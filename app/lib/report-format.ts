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

function hasAnyText(...values: unknown[]) {
  return values.some((value) => Boolean(toText(value)));
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

  logs
    .filter((log) => !isAbsent(log))
    .forEach((log) => {
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

function compareNumber(current: number, previous: number, label: string) {
  if (!previous && current) return `✅ ${label} started strongly`;
  if (current > previous) return `✅ ${label} improved`;
  if (current < previous) return `⚠️ ${label} needs more attention`;
  return `➖ ${label} remained steady`;
}

function getTeacherNotesFromLogs(logs: WeeklyReportLog[]) {
  return logs
    .map((log) => toText(log.generalNotes))
    .filter(Boolean)
    .slice(0, 2);
}

function getMistakeFocus(logs: WeeklyReportLog[]) {
  const hasSabakDhorMistakes = logs.some((log) => toText(log.sabakDhorMistakes));
  const hasDhorMistakes = logs.some((log) => toText(log.dhorMistakes));

  if (hasSabakDhorMistakes && hasDhorMistakes) {
    return "Some mistakes were noted in revision, so extra listening and correction at home will be beneficial.";
  }

  if (hasDhorMistakes) {
    return "Some dhor mistakes were noted, so older revision should be given extra attention.";
  }

  if (hasSabakDhorMistakes) {
    return "Some sabak dhor mistakes were noted, so recent revision should be strengthened.";
  }

  return "";
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
    return "A strong week of consistency, effort and goal completion.";
  }

  if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    return "Pleasing effort shown in sabak this week.";
  }

  if (revisionStrength === "Excellent" || revisionStrength === "Strong") {
    return "Revision was a strong point this week, alhamdulillah.";
  }

  if (attendance <= 2) {
    return "A stronger attendance routine will help progress improve.";
  }

  return "Steady effort shown, with room to build further.";
}

function buildAutoReflection({
  studentName,
  attendance,
  goalCompleted,
  sabakStrength,
  revisionStrength,
  previousLogs,
  currentLogs,
}: {
  studentName: string;
  attendance: number;
  goalCompleted: boolean;
  sabakStrength: string;
  revisionStrength: string;
  previousLogs: WeeklyReportLog[];
  currentLogs: WeeklyReportLog[];
}) {
  const notes = getTeacherNotesFromLogs(currentLogs);
  const mistakeFocus = getMistakeFocus(currentLogs);

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

  const sabakImproved = previousLogs.length && currentSabakAvg > previousSabakAvg;
  const revisionImproved = previousLogs.length && currentRevisionAvg > previousRevisionAvg;

  let reflection = "";

  if (notes.length) {
    reflection = `Alhamdulillah, ${studentName} had helpful feedback noted during the week. ${notes.join(" ")} Please continue supporting this progress at home through encouragement and daily revision.`;
  } else if (attendance >= 5 && goalCompleted && revisionStrength !== "Needs More Revision") {
    reflection = `Alhamdulillah, ${studentName} had a strong and pleasing week. The consistency in attendance, completion of the weekly goal and steady revision show good effort and commitment.`;
  } else if (attendance <= 2) {
    reflection = `${studentName} will benefit greatly from a stronger attendance routine. With more consistent attendance, it will become easier to build momentum and make steady hifdh progress, in shaa Allah.`;
  } else if (revisionStrength === "Needs More Revision") {
    reflection = `${studentName} is making effort, but revision needs more attention. Strengthening older work through short, regular listening at home will help the memorised portions become firmer.`;
  } else if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    reflection = `Alhamdulillah, ${studentName} showed pleasing effort in sabak this week. If the same attention is given to revision, the overall hifdh routine will become much stronger.`;
  } else if (!goalCompleted) {
    reflection = `${studentName} made some progress this week, but the weekly goal was not fully completed. A little more preparation before class can help next week’s goal become easier to reach, in shaa Allah.`;
  } else {
    reflection = `Alhamdulillah, ${studentName} made steady progress this week. The main focus now is to keep building consistency so that both new lesson and revision continue improving together.`;
  }

  if (sabakImproved && revisionImproved) {
    reflection += ` It is also pleasing to see improvement in both sabak and revision compared to last week.`;
  } else if (sabakImproved) {
    reflection += ` There was also a positive improvement in sabak compared to last week.`;
  } else if (revisionImproved) {
    reflection += ` There was also a positive improvement in revision compared to last week.`;
  }

  if (mistakeFocus) {
    reflection += ` ${mistakeFocus}`;
  }

  return reflection;
}

function buildWhatWentWell({
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
  const points: string[] = [];

  if (attendance >= 5) points.push("Full attendance was maintained.");
  else if (attendance >= 4) points.push("Attendance was good overall.");

  if (goalCompleted) points.push("The weekly goal was completed.");

  if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    points.push("Sabak was a pleasing area this week.");
  }

  if (revisionStrength === "Excellent" || revisionStrength === "Strong") {
    points.push("Revision showed good strength.");
  }

  if (!points.length) {
    points.push("Effort was made, and there is room to build further next week.");
  }

  return points;
}

function buildFocusForNextWeek({
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
  const points: string[] = [];

  if (attendance <= 3) {
    points.push("Work towards stronger attendance and routine.");
  }

  if (!goalCompleted) {
    points.push("Prepare earlier so the weekly goal can be completed.");
  }

  if (revisionStrength === "Needs More Revision") {
    points.push("Give extra attention to older dhor revision.");
  }

  if (sabakStrength === "Can Improve") {
    points.push("Strengthen sabak preparation before class.");
  }

  if (!points.length) {
    points.push("Continue daily revision so the progress remains firm.");
  }

  return points;
}

function buildDailyBreakdown(log: WeeklyReportLog) {
  const { dayName, dateFormatted } = formatDateKey(log.dateKey);

  if (isAbsent(log)) {
    return `📅 *${dayName} - ${dateFormatted}*

❌ *Absent*`;
  }

  let dayText = `📅 *${dayName} - ${dateFormatted}*`;

  let hasDetails = false;

  if (hasAnyText(log.sabak, log.sabakReadQuality, log.sabakRead, log.sabakReadNotes)) {
    hasDetails = true;

    dayText += `

📖 *Sabak*
${toText(log.sabak) || "Not specified"}`;

    const quality = toText(log.sabakReadQuality) || toText(log.sabakRead);
    if (quality) dayText += ` | ${quality}`;

    if (toText(log.sabakReadNotes)) {
      dayText += `
_Note:_ ${toText(log.sabakReadNotes)}`;
    }
  }

  if (
    hasAnyText(
      log.sabakDhor,
      log.sabakDhorReadQuality,
      log.sabakDhorRead,
      log.sabakDhorReadNotes,
      log.sabakDhorMistakes
    )
  ) {
    hasDetails = true;

    dayText += `

🔁 *Sabak Dhor*
${toText(log.sabakDhor) || "Not specified"}`;

    const quality = toText(log.sabakDhorReadQuality) || toText(log.sabakDhorRead);
    if (quality) dayText += ` | ${quality}`;

    if (toText(log.sabakDhorReadNotes)) {
      dayText += `
_Note:_ ${toText(log.sabakDhorReadNotes)}`;
    }

    if (toText(log.sabakDhorMistakes)) {
      dayText += `

⚠️ *Mistakes*
${toText(log.sabakDhorMistakes)}`;
    }
  }

  if (hasAnyText(log.dhor, log.dhorReadQuality, log.dhorRead, log.dhorReadNotes, log.dhorMistakes)) {
    hasDetails = true;

    dayText += `

📚 *Dhor*
${toText(log.dhor) || "Not specified"}`;

    const quality = toText(log.dhorReadQuality) || toText(log.dhorRead);
    if (quality) dayText += ` | ${quality}`;

    if (toText(log.dhorReadNotes)) {
      dayText += `
_Note:_ ${toText(log.dhorReadNotes)}`;
    }

    if (toText(log.dhorMistakes)) {
      dayText += `

⚠️ *Mistakes*
${toText(log.dhorMistakes)}`;
    }
  }

  if (toText(log.generalNotes)) {
    hasDetails = true;

    dayText += `

🗒️ *General Note*
${toText(log.generalNotes)}`;
  }

  if (!hasDetails) {
    dayText += `

✅ *Present*

No detailed progress was logged for this day.`;
  }

  return dayText;
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
      attendance,
      goalCompleted,
      sabakStrength,
      revisionStrength,
      previousLogs,
      currentLogs,
    });

  const teacherHighlight = buildTeacherHighlight({
    attendance,
    goalCompleted,
    sabakStrength,
    revisionStrength,
  });

  const whatWentWell = buildWhatWentWell({
    attendance,
    goalCompleted,
    sabakStrength,
    revisionStrength,
  });

  const focusForNextWeek = buildFocusForNextWeek({
    attendance,
    goalCompleted,
    sabakStrength,
    revisionStrength,
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

✅ *What Went Well*

${whatWentWell.map((point) => `• ${point}`).join("\n")}

━━━━━━━━━━━━━━━━━━

🎯 *Focus For Next Week*

${focusForNextWeek.map((point) => `• ${point}`).join("\n")}

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

${currentLogs.map(buildDailyBreakdown).join(`

──────────────

`)}`;
  }

  reportText += `

━━━━━━━━━━━━━━━━━━

Every letter recited is an investment for this world and the Aakhirah. May Allah place barakah in this hifdh journey and make ${studentName} from the people of the Qur’an.

*Powered by The Hifdh Journal*`;

  return reportText.trim();
}