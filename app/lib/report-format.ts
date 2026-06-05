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

  if (q.includes("excellent")) return 5;
  if (q.includes("very good")) return 4;
  if (q.includes("good")) return 3;
  if (q.includes("fair")) return 2;
  if (q.includes("weak")) return 1;
  if (q.includes("poor")) return 0;

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

function calculateMistakePenalty(
  logs: WeeklyReportLog[]
) {
  let penalty = 0;

  logs.forEach((log) => {
    if (toText(log.sabakDhorMistakes)) {
      penalty += 2;
    }

    if (toText(log.dhorMistakes)) {
      penalty += 2;
    }
  });

  return Math.min(penalty, 15);
}




function calculateHifdhScore({
  attendance,
  goalCompleted,
  currentLogs,
}: {
  attendance: number;
  goalCompleted: boolean;
  currentLogs: WeeklyReportLog[];
}) {
  const sabakAvg = averageQuality(currentLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  const sabakDhorAvg = averageQuality(currentLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);

  const dhorAvg = averageQuality(currentLogs, [
    "dhorReadQuality",
    "dhorRead",
  ]);

  const attendanceScore = (attendance / 5) * 20;
const sabakScore = (sabakAvg / 5) * 30;
const sabakDhorScore = (sabakDhorAvg / 5) * 25;
const dhorScore = (dhorAvg / 5) * 20;

  const goalScore = goalCompleted ? 5 : 0;

const mistakePenalty =
  calculateMistakePenalty(currentLogs);

const total =
  attendanceScore +
  sabakScore +
  sabakDhorScore +
  dhorScore +
  goalScore -
  mistakePenalty;

  return Math.round(Math.min(total, 100));
}



function getTeacherAssessment(score: number) {
  if (score >= 95) {
    return "Outstanding Progress ⭐";
  }

  if (score >= 85) {
    return "Excellent Progress";
  }

  if (score >= 75) {
    return "Good Progress";
  }

  if (score >= 65) {
    return "Satisfactory Progress";
  }

  return "Needs Improvement";
}

function getScoreBand(score: number) {
  if (score >= 95) return "Exceptional";
  if (score >= 85) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 65) return "Developing";
  return "Needs Attention";
}


function getProgressTrend(
  currentScore: number,
  previousScore: number
) {
  const difference = currentScore - previousScore;

  if (difference >= 5) return "⬆ Improving";
  if (difference <= -5) return "⬇ Needs Attention";

  return "➡ Stable";
}


function getStudentProfile({
  attendance,
  goalCompleted,
  score,
}: {
  attendance: number;
  goalCompleted: boolean;
  score: number;
}) {
  if (attendance === 5 && goalCompleted && score >= 85) {
    return "Consistent Achiever";
  }

  if (attendance === 5 && score < 75) {
    return "Hard Working Student";
  }

  if (attendance <= 3 && score >= 80) {
    return "Capable But Inconsistent";
  }

  if (score < 60) {
    return "Developing";
  }

  return "Steady Progress";
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
  const notes = currentLogs
    .map((log) => toText(log.generalNotes))
    .filter(Boolean);

  const currentSabak = averageQuality(currentLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  const previousSabak = averageQuality(previousLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  const currentSabakDhor = averageQuality(currentLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);

  const previousSabakDhor = averageQuality(previousLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);

  const currentDhor = averageQuality(currentLogs, [
    "dhorReadQuality",
    "dhorRead",
  ]);

  const previousDhor = averageQuality(previousLogs, [
    "dhorReadQuality",
    "dhorRead",
  ]);

  const highlights: string[] = [];

  /*
   * Teacher notes always win
   */

  if (notes.length) {
    return notes[0].length > 140
      ? notes[0].slice(0, 140).trim() + "..."
      : notes[0];
  }

  /*
   * Attendance
   */

  if (attendance === 5) {
    highlights.push(
      "Excellent consistency was maintained through full attendance."
    );
  }

  /*
   * Goal completion
   */

  if (goalCompleted) {
    highlights.push(
      "The weekly target was successfully completed."
    );
  }

  /*
   * Major improvements
   */

  if (currentSabak - previousSabak >= 0.5) {
    highlights.push(
      "A noticeable improvement was seen in new lesson preparation."
    );
  }

  if (currentSabakDhor - previousSabakDhor >= 0.5) {
    highlights.push(
      "Recent revision showed encouraging improvement."
    );
  }

  if (currentDhor - previousDhor >= 0.5) {
    highlights.push(
      "Older revision retention strengthened compared to last week."
    );
  }

  /*
   * Strong areas
   */

  if (
    sabakStrength === "Excellent" &&
    sabakDhorStrength === "Excellent" &&
    dhorStrength === "Excellent"
  ) {
    highlights.push(
      "Strong performance was maintained across all areas of recitation."
    );
  }

  if (
    sabakStrength === "Excellent" &&
    dhorStrength === "Excellent"
  ) {
    highlights.push(
      "Both new lesson preparation and long-term retention were particularly pleasing."
    );
  }

  /*
   * Hard worker profile
   */

  if (
    attendance === 5 &&
    !goalCompleted &&
    highlights.length < 2
  ) {
    highlights.push(
      "Commendable effort was shown throughout the week despite some remaining challenges."
    );
  }

  /*
   * Attendance concerns
   */

  if (attendance <= 2) {
    highlights.push(
      "Improved attendance will significantly assist future progress."
    );
  }

  /*
   * Weak areas
   */

  if (
    sabakStrength === "Can Improve" &&
    sabakDhorStrength === "Needs More Attention"
  ) {
    highlights.push(
      "Greater consistency in preparation and recent revision remains a priority."
    );
  }

  /*
   * Final fallback
   */

  if (!highlights.length) {
    highlights.push(
      "Steady progress was observed throughout the week."
    );
  }

  /*
   * Randomize first highlight
   * Prevents identical reports.
   */


return highlights.slice(0, 2).join(" ");}

function getAttendanceInsight(
  attendance: number
) {
  if (attendance === 5) {
    return "Perfect attendance was maintained.";
  }

  if (attendance === 4) {
    return "Attendance remained strong.";
  }

  if (attendance === 3) {
    return "Attendance was moderate.";
  }

  return "Attendance significantly affected progress.";
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
  const notes = currentLogs
    .map((log) => toText(log.generalNotes))
    .filter(Boolean);

  const currentSabak = averageQuality(currentLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  const previousSabak = averageQuality(previousLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  const currentSabakDhor = averageQuality(currentLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);

  const previousSabakDhor = averageQuality(previousLogs, [
    "sabakDhorReadQuality",
    "sabakDhorRead",
  ]);

  const currentDhor = averageQuality(currentLogs, [
    "dhorReadQuality",
    "dhorRead",
  ]);

  const previousDhor = averageQuality(previousLogs, [
    "dhorReadQuality",
    "dhorRead",
  ]);

  const sabakTrend =
    currentSabak > previousSabak
      ? "improved"
      : currentSabak < previousSabak
      ? "declined"
      : "steady";

  const sabakDhorTrend =
    currentSabakDhor > previousSabakDhor
      ? "improved"
      : currentSabakDhor < previousSabakDhor
      ? "declined"
      : "steady";

  const dhorTrend =
    currentDhor > previousDhor
      ? "improved"
      : currentDhor < previousDhor
      ? "declined"
      : "steady";

  const paragraphs: string[] = [];

  /*
   * OPENING
   */

  if (attendance === 5 && goalCompleted) {
    paragraphs.push(
      `${studentName} demonstrated strong commitment throughout the week, maintaining full attendance and successfully completing the weekly target.`
    );
  } else if (attendance === 5) {
    paragraphs.push(
      `${studentName} maintained excellent attendance throughout the week and showed encouraging effort during lessons.`
    );
  } else if (attendance >= 3) {
    paragraphs.push(
      `${studentName} made reasonable progress this week, although greater consistency would help strengthen overall development.`
    );
  } else {
    paragraphs.push(
      `${studentName}'s progress this week was affected by limited attendance, making it more difficult to build momentum and consistency.`
    );
  }

  /*
   * PERFORMANCE ANALYSIS
   */

  const strengths: string[] = [];

  if (
    sabakStrength === "Excellent" ||
    sabakStrength === "Strong"
  ) {
    strengths.push("new lesson preparation");
  }

  if (
    sabakDhorStrength === "Excellent" ||
    sabakDhorStrength === "Strong"
  ) {
    strengths.push("recent revision");
  }

  if (
    dhorStrength === "Excellent" ||
    dhorStrength === "Strong"
  ) {
    strengths.push("older revision retention");
  }

  if (strengths.length) {
    paragraphs.push(
      `Particular strength was observed in ${strengths.join(
        ", "
      )}, which contributed positively to overall performance.`
    );
  }

  /*
   * TREND ANALYSIS
   */

  const improvements: string[] = [];

  if (sabakTrend === "improved") {
    improvements.push("new lesson recitation");
  }

  if (sabakDhorTrend === "improved") {
    improvements.push("recent revision");
  }

  if (dhorTrend === "improved") {
    improvements.push("older revision");
  }

  if (improvements.length) {
    paragraphs.push(
      `Compared to the previous week, improvement was noticed in ${improvements.join(
        ", "
      )}.`
    );
  }

  /*
   * ATTENTION AREAS
   */

  const concerns: string[] = [];

  if (sabakStrength === "Can Improve") {
    concerns.push("new lesson preparation");
  }

  if (sabakDhorStrength === "Needs More Attention") {
    concerns.push("recent revision");
  }

  if (dhorStrength === "Needs More Attention") {
    concerns.push("older revision");
  }

  if (concerns.length) {
    paragraphs.push(
      `The primary area${concerns.length > 1 ? "s" : ""} requiring additional attention ${
        concerns.length > 1 ? "are" : "is"
      } ${concerns.join(
        ", "
      )}. Continued focus in these areas should lead to noticeable improvement.`
    );
  }

  /*
   * TEACHER NOTES
   */

  if (notes.length) {
    paragraphs.push(
      `Additional observations from the teacher included: ${notes
        .slice(0, 2)
        .join(" ")}`
    );
  }

  /*
   * CONCLUSION
   */

  if (goalCompleted) {
    paragraphs.push(
      `Overall, this was a productive week and the target set for the week was successfully achieved.`
    );
  } else {
    paragraphs.push(
      `The weekly target was not fully achieved, however continued effort and consistency should help improve results in the coming weeks.`
    );
  }

  return paragraphs.join(" ");
}

function buildWhatWentWell({
  attendance,
  goalCompleted,
  currentLogs,
  previousLogs,
}: {
  attendance: number;
  goalCompleted: boolean;
  currentLogs: WeeklyReportLog[];
  previousLogs: WeeklyReportLog[];
}) {
  const points: string[] = [];

  const currentSabak = averageQuality(currentLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  const previousSabak = averageQuality(previousLogs, [
    "sabakReadQuality",
    "sabakRead",
  ]);

  if (attendance === 5) {
    points.push("Excellent attendance was maintained throughout the week.");
  }

  if (goalCompleted) {
    points.push("The weekly target was successfully completed.");
  }

  if (currentSabak > previousSabak) {
    points.push("New lesson preparation improved compared to last week.");
  }

  if (
    averageQuality(currentLogs, [
      "dhorReadQuality",
      "dhorRead",
    ]) >= 3
  ) {
    points.push("Older revision remained firm and well retained.");
  }

  if (!points.length) {
    points.push("Steady effort was shown throughout the week.");
  }

  return points;
}

function buildParentGuidance({
  sabakStrength,
  sabakDhorStrength,
  dhorStrength,
}: {
  sabakStrength: string;
  sabakDhorStrength: string;
  dhorStrength: string;
}) {
  const guidance: string[] = [];

  if (sabakStrength === "Can Improve") {
    guidance.push(
      "Listen to the new lesson before class each day."
    );
  }

  if (sabakDhorStrength === "Needs More Attention") {
    guidance.push(
      "Spend additional time revising recent memorisation."
    );
  }

  if (dhorStrength === "Needs More Attention") {
    guidance.push(
      "Encourage revision of older portions to strengthen retention."
    );
  }

  if (!guidance.length) {
    guidance.push(
      "Continue the current revision routine and maintain consistency."
    );
  }

  return guidance;
}

const attendanceFocus = [
  "Aim to attend every class to maintain momentum.",
  "Consistency in attendance should be the main focus next week.",
  "Regular attendance will greatly improve overall progress.",
  "Establishing a stronger routine will help build confidence.",
  "Making every lesson count should be a priority."
];

const goalFocus = [
  "Break the weekly target into smaller daily goals.",
  "Earlier preparation should help achieve next week's target.",
  "Focus on completing daily tasks consistently.",
  "A stronger revision schedule will support goal completion.",
  "Improving preparation outside class should help achieve targets."
];

const sabakFocus = [
  "Listen to the new lesson more frequently before class.",
  "Increase fluency before presenting the new lesson.",
  "Reduce hesitation by revising the lesson multiple times.",
  "Focus on smoother recitation during sabak.",
  "Spend extra time strengthening new lesson preparation."
];

const sabakDhorFocus = [
  "Increase revision of recently memorised portions.",
  "Dedicate additional time to sabak dhor revision.",
  "Focus on retaining newer memorisation more confidently.",
  "Review recent lessons consistently throughout the week.",
  "Strengthen recall of recently completed portions."
];

const dhorFocus = [
  "Allocate extra time to older revision.",
  "Strengthen retention of older portions through repetition.",
  "Review older surahs more consistently.",
  "Focus on maintaining long-term retention.",
  "Spend additional time on weaker older portions."
];

const excellenceFocus = [
  "Maintain the excellent standards achieved this week.",
  "Continue the strong routine that produced these results.",
  "Build on this week's momentum and consistency.",
  "Aim to sustain the quality demonstrated this week.",
  "Continue striving for excellence across all areas."
];

function randomItem(items: string[]) {
  return items[Math.floor(Math.random() * items.length)];
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

  if (attendance <= 3) {
    points.push(randomItem(attendanceFocus));
  }

  if (!goalCompleted) {
    points.push(randomItem(goalFocus));
  }

  if (sabakStrength === "Can Improve") {
    points.push(randomItem(sabakFocus));
  }

  if (sabakDhorStrength === "Needs More Attention") {
    points.push(randomItem(sabakDhorFocus));
  }

  if (dhorStrength === "Needs More Attention") {
    points.push(randomItem(dhorFocus));
  }

  if (!points.length) {
    points.push(randomItem(excellenceFocus));
    points.push(randomItem(excellenceFocus));
  }

  return [...new Set(points)].slice(0, 3);
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

  const hifdhScore = calculateHifdhScore({
  attendance,
  goalCompleted,
  currentLogs,
});

const previousScore = calculateHifdhScore({
  attendance: getPresentLogs(previousLogs).length,
  goalCompleted:
    previousLogs.length > 0
      ? getGoalCompleted(previousLogs[0])
      : false,
  currentLogs: previousLogs,
});

const teacherAssessment =
  getTeacherAssessment(hifdhScore);

const progressTrend = getProgressTrend(
  hifdhScore,
  previousScore
);

const studentProfile = getStudentProfile({
  attendance,
  goalCompleted,
  score: hifdhScore,
});

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
  currentLogs,
  previousLogs,
});

  const focusForNextWeek = buildFocusForNextWeek({
    attendance,
    goalCompleted,
    sabakStrength,
    sabakDhorStrength,
    dhorStrength,
  });

  const parentGuidance = buildParentGuidance({
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
🏅 *Assessment:* ${teacherAssessment}
🎯 *Weekly Goal:* ${weeklyGoal}
✅ *Goal Status:* ${goalStatus}
📖 *Sabak:* ${sabakStrength}
🔁 *Sabak Dhor:* ${sabakDhorStrength}
📚 *Dhor Revision:* ${dhorStrength}

━━━━━━━━━━━━━━━━━━

📅 *Attendance:* ${attendance}/5
💡 *Attendance Insight:* ${getAttendanceInsight(attendance)}

🏅 *Teacher Assessment*
${teacherAssessment}

📈 *Trend:* ${progressTrend}


💬 *Teacher’s Reflection*

${weeklyReflection}

━━━━━━━━━━━━━━━━━━

✅ *What Went Well*

${whatWentWell.map((point) => `• ${point}`).join("\n")}

━━━━━━━━━━━━━━━━━━

🎯 *Focus For Next Week*

${focusForNextWeek.map((point) => `• ${point}`).join("\n")}

━━━━━━━━━━━━━━━━━━

🏠 *Parent Guidance*

${parentGuidance.map((point) => `• ${point}`).join("\n")}

`;

  if (previousLogs.length) {
    reportText += `━━━━━━━━━━━━━━━━━━

📈 *Compared To Last Week*

${compareNumber(attendance, previousAttendance, "Attendance")}
${compareNumber(currentSabakAvg, previousSabakAvg, "New Lesson")}
${compareNumber(currentSabakDhorAvg, previousSabakDhorAvg, "Recent Revision")}
${compareNumber(currentDhorAvg, previousDhorAvg, "Older Revision")}
${compareNumber(hifdhScore, previousScore, "Overall Progress")}

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