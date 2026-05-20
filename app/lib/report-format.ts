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

function getSabakDhorStrength(logs: WeeklyReportLog[]) {
  const avg = averageQuality(logs, ["sabakDhorReadQuality", "sabakDhorRead"]);

  if (avg >= 3.2) return "Excellent";
  if (avg >= 2.7) return "Strong";
  if (avg >= 2.1) return "Good";

  return "Needs More Attention";
}

function getDhorStrength(logs: WeeklyReportLog[]) {
  const avg = averageQuality(logs, ["dhorReadQuality", "dhorRead"]);

  if (avg >= 3.2) return "Excellent";
  if (avg >= 2.7) return "Strong";
  if (avg >= 2.1) return "Good";

  return "Needs More Attention";
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
    return "Some mistakes were noted in both sabak dhor and dhor revision, so extra listening and correction at home will be beneficial.";
  }

  if (hasDhorMistakes) {
    return "Some dhor revision mistakes were noted, so older revision should be given extra attention.";
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
  sabakDhorStrength,
  dhorStrength,
  previousLogs,
  currentLogs,
}: {
  attendance: number;
  goalCompleted: boolean;
  sabakStrength: string;
  sabakDhorStrength: string;
  dhorStrength: string;
  previousLogs: WeeklyReportLog[];
  currentLogs: WeeklyReportLog[];
}) {
  const teacherNotes = currentLogs.map((log) => toText(log.generalNotes)).filter(Boolean);

  if (teacherNotes.length) {
    const note = teacherNotes[0];
    return note.length <= 120 ? note : `${note.slice(0, 120).trim()}...`;
  }

  const currentSabakAvg = averageQuality(currentLogs, ["sabakReadQuality", "sabakRead"]);
  const previousSabakAvg = averageQuality(previousLogs, ["sabakReadQuality", "sabakRead"]);

  const currentSabakDhorAvg = averageQuality(currentLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);
  const previousSabakDhorAvg = averageQuality(previousLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);

  const currentDhorAvg = averageQuality(currentLogs, ["dhorReadQuality", "dhorRead"]);
  const previousDhorAvg = averageQuality(previousLogs, ["dhorReadQuality", "dhorRead"]);

  const sabakImproved = previousLogs.length && currentSabakAvg > previousSabakAvg;
  const sabakDhorImproved = previousLogs.length && currentSabakDhorAvg > previousSabakDhorAvg;
  const dhorImproved = previousLogs.length && currentDhorAvg > previousDhorAvg;

  const hasSabakDhorMistakes = currentLogs.some((log) => toText(log.sabakDhorMistakes));
  const hasDhorMistakes = currentLogs.some((log) => toText(log.dhorMistakes));

  if (attendance >= 5 && goalCompleted && sabakImproved && sabakDhorImproved && dhorImproved) {
    return "Excellent improvement noticed across sabak, sabak dhor and dhor revision this week.";
  }

  if (sabakImproved) return "A noticeable improvement was seen in sabak preparation this week.";
  if (sabakDhorImproved) return "Recent revision improved noticeably this week.";
  if (dhorImproved) return "Older dhor revision showed pleasing improvement this week.";

  if (attendance >= 5 && goalCompleted) {
    return "Very pleasing consistency in attendance, preparation and weekly goal completion.";
  }

  if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    return "Sabak preparation was a pleasing area this week.";
  }

  if (sabakDhorStrength === "Excellent" || sabakDhorStrength === "Strong") {
    return "Sabak dhor was firm and pleasing this week.";
  }

  if (dhorStrength === "Excellent" || dhorStrength === "Strong") {
    return "Older dhor revision was a strong point this week.";
  }

  if (attendance <= 2) {
    return "A stronger attendance routine will help progress improve further.";
  }

  if (hasDhorMistakes) {
    return "Extra attention to older dhor revision will help strengthen retention.";
  }

  if (hasSabakDhorMistakes) {
    return "Recent revision needs a little more strengthening and consistency.";
  }

  return "Steady effort was shown this week, with room to build further.";
}

function buildAutoReflection({
  studentName,
  attendance,
  goalCompleted,
  sabakStrength,
  sabakDhorStrength,
  dhorStrength,
  previousLogs,
  currentLogs,
}: {
  studentName: string;
  attendance: number;
  goalCompleted: boolean;
  sabakStrength: string;
  sabakDhorStrength: string;
  dhorStrength: string;
  previousLogs: WeeklyReportLog[];
  currentLogs: WeeklyReportLog[];
}) {
  const notes = getTeacherNotesFromLogs(currentLogs);
  const mistakeFocus = getMistakeFocus(currentLogs);

  const currentSabakAvg = averageQuality(currentLogs, ["sabakReadQuality", "sabakRead"]);
  const previousSabakAvg = averageQuality(previousLogs, ["sabakReadQuality", "sabakRead"]);

  const currentSabakDhorAvg = averageQuality(currentLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);
  const previousSabakDhorAvg = averageQuality(previousLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);

  const currentDhorAvg = averageQuality(currentLogs, ["dhorReadQuality", "dhorRead"]);
  const previousDhorAvg = averageQuality(previousLogs, ["dhorReadQuality", "dhorRead"]);

  const sabakImproved = previousLogs.length && currentSabakAvg > previousSabakAvg;
  const sabakDhorImproved = previousLogs.length && currentSabakDhorAvg > previousSabakDhorAvg;
  const dhorImproved = previousLogs.length && currentDhorAvg > previousDhorAvg;

  let reflection = "";

  if (notes.length) {
    reflection = `Alhamdulillah, ${studentName} had helpful feedback noted during the week. ${notes.join(" ")} Please continue supporting this progress at home through encouragement and daily revision.`;
  } else if (
    attendance >= 5 &&
    goalCompleted &&
    dhorStrength !== "Needs More Attention" &&
    sabakDhorStrength !== "Needs More Attention"
  ) {
    reflection = `Alhamdulillah, ${studentName} had a strong and pleasing week. The consistency in attendance, completion of the weekly goal, sabak dhor and dhor revision show good effort and commitment.`;
  } else if (attendance <= 2) {
    reflection = `${studentName} will benefit greatly from a stronger attendance routine. With more consistent attendance, it will become easier to build momentum and make steady hifdh progress, in shaa Allah.`;
  } else if (dhorStrength === "Needs More Attention") {
    reflection = `${studentName} is making effort, but older dhor revision needs more attention. Strengthening older work through short, regular listening at home will help the memorised portions become firmer.`;
  } else if (sabakDhorStrength === "Needs More Attention") {
    reflection = `${studentName} is making effort, but sabak dhor needs more consistency. Strengthening recent revision will help the new work remain firm.`;
  } else if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    reflection = `Alhamdulillah, ${studentName} showed pleasing effort in sabak this week. If the same attention continues with sabak dhor and dhor revision, the overall hifdh routine will become much stronger.`;
  } else if (!goalCompleted) {
    reflection = `${studentName} made some progress this week, but the weekly goal was not fully completed. A little more preparation before class can help next week’s goal become easier to reach, in shaa Allah.`;
  } else {
    reflection = `Alhamdulillah, ${studentName} made steady progress this week. The main focus now is to keep building consistency so that sabak, sabak dhor and dhor revision continue improving together.`;
  }

  if (sabakImproved && sabakDhorImproved && dhorImproved) {
    reflection += ` It is also pleasing to see improvement in sabak, sabak dhor and dhor revision compared to last week.`;
  } else if (sabakImproved) {
    reflection += ` There was also a positive improvement in sabak compared to last week.`;
  } else if (sabakDhorImproved) {
    reflection += ` There was also a positive improvement in sabak dhor compared to last week.`;
  } else if (dhorImproved) {
    reflection += ` There was also a positive improvement in dhor revision compared to last week.`;
  }

  if (mistakeFocus) reflection += ` ${mistakeFocus}`;

  return reflection;
}

function buildWhatWentWell({
  attendance,
  goalCompleted,
  sabakStrength,
  sabakDhorStrength,
  dhorStrength,
}: {
  attendance: number;
  goalCompleted: boolean;
  sabakStrength: string;
  sabakDhorStrength: string;
  dhorStrength: string;
}) {
  const points: string[] = [];

  if (attendance >= 5) points.push("Full attendance was maintained.");
  else if (attendance >= 4) points.push("Attendance was good overall.");

  if (goalCompleted) points.push("The weekly goal was completed.");

  if (sabakStrength === "Excellent" || sabakStrength === "Strong") {
    points.push("Sabak was a pleasing area this week.");
  }

  if (sabakDhorStrength === "Excellent" || sabakDhorStrength === "Strong") {
    points.push("Sabak dhor showed good strength.");
  }

  if (dhorStrength === "Excellent" || dhorStrength === "Strong") {
    points.push("Dhor revision was firm this week.");
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
  sabakDhorStrength,
  dhorStrength,
}: {
  attendance: number;
  goalCompleted: boolean;
  sabakStrength: string;
  sabakDhorStrength: string;
  dhorStrength: string;
}) {
  const points: string[] = [];

  if (attendance <= 3) points.push("Work towards stronger attendance and routine.");
  if (!goalCompleted) points.push("Prepare earlier so the weekly goal can be completed.");
  if (sabakStrength === "Can Improve") points.push("Strengthen sabak preparation before class.");
  if (sabakDhorStrength === "Needs More Attention") points.push("Give extra attention to sabak dhor.");
  if (dhorStrength === "Needs More Attention") points.push("Give extra attention to older dhor revision.");

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

⚠️ *Sabak Dhor Mistakes*
${toText(log.sabakDhorMistakes)}`;
    }
  }

  if (hasAnyText(log.dhor, log.dhorReadQuality, log.dhorRead, log.dhorReadNotes, log.dhorMistakes)) {
    hasDetails = true;

    dayText += `

📚 *Dhor Revision*
${toText(log.dhor) || "Not specified"}`;

    const quality = toText(log.dhorReadQuality) || toText(log.dhorRead);
    if (quality) dayText += ` | ${quality}`;

    if (toText(log.dhorReadNotes)) {
      dayText += `
_Note:_ ${toText(log.dhorReadNotes)}`;
    }

    if (toText(log.dhorMistakes)) {
      dayText += `

⚠️ *Dhor Revision Mistakes*
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
  const sabakDhorStrength = getSabakDhorStrength(currentLogs);
  const dhorStrength = getDhorStrength(currentLogs);

  const currentSabakAvg = averageQuality(currentLogs, ["sabakReadQuality", "sabakRead"]);
  const previousSabakAvg = averageQuality(previousLogs, ["sabakReadQuality", "sabakRead"]);

  const currentSabakDhorAvg = averageQuality(currentLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);
  const previousSabakDhorAvg = averageQuality(previousLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);

  const currentDhorAvg = averageQuality(currentLogs, ["dhorReadQuality", "dhorRead"]);
  const previousDhorAvg = averageQuality(previousLogs, ["dhorReadQuality", "dhorRead"]);

  const previousAttendance = getPresentLogs(previousLogs).length;

  const weeklyReflection =
    toText(latestLog?.weeklyReflection) ||
    buildAutoReflection({
      studentName,
      attendance,
      goalCompleted,
      sabakStrength,
      sabakDhorStrength,
      dhorStrength,
      previousLogs,
      currentLogs,
    });

  const teacherHighlight = buildTeacherHighlight({
    attendance,
    goalCompleted,
    sabakStrength,
    sabakDhorStrength,
    dhorStrength,
    previousLogs,
    currentLogs,
  });

  const whatWentWell = buildWhatWentWell({
    attendance,
    goalCompleted,
    sabakStrength,
    sabakDhorStrength,
    dhorStrength,
  });

  const focusForNextWeek = buildFocusForNextWeek({
    attendance,
    goalCompleted,
    sabakStrength,
    sabakDhorStrength,
    dhorStrength,
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
🔁 *Sabak Dhor:* ${sabakDhorStrength}
📚 *Dhor Revision:* ${dhorStrength}

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
${compareNumber(currentSabakDhorAvg, previousSabakDhorAvg, "Sabak Dhor")}
${compareNumber(currentDhorAvg, previousDhorAvg, "Dhor Revision")}

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