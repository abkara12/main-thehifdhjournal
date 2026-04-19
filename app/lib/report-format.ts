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
};

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

export function formatWeeklyReportText({
  studentName,
  madrassahName,
  monthLabel,
  logs,
}: WeeklyReportInput) {
  let reportText = `السلام عليكم ورحمة الله وبركاته

*Weekly Hifdh Report*
*Student:* ${studentName}
*Madrassah:* ${madrassahName}
*Month:* ${monthLabel || "-"}

`;

  if (!logs.length) {
    reportText += `No logs recorded for the last 7 days.

────────────────
*Powered by The Hifdh Journal*`;

    return reportText.trim();
  }

  logs.forEach((log, index) => {
    const { dayName, dateFormatted } = formatDateKey(log.dateKey);

    reportText += `*${dayName} ${dateFormatted}*\n\n`;
    reportText += `*Attendance:* ${toText(log.attendance) || "-"}\n`;
    reportText += `*Sabak:* ${toText(log.sabak) || "-"} | ${
      toText(log.sabakReadQuality) || toText(log.sabakRead) || "-"
    }\n`;

    if (toText(log.sabakReadNotes)) {
      reportText += `Note: ${toText(log.sabakReadNotes)}\n`;
    }

    reportText += `\n`;
    reportText += `*Sabak Dhor:* ${toText(log.sabakDhor) || "-"} | ${
      toText(log.sabakDhorReadQuality) || toText(log.sabakDhorRead) || "-"
    }\n`;

    if (toText(log.sabakDhorReadNotes)) {
      reportText += `Note: ${toText(log.sabakDhorReadNotes)}\n`;
    }

    reportText += `\n`;
    reportText += `*Dhor:* ${toText(log.dhor) || "-"} | ${
      toText(log.dhorReadQuality) || toText(log.dhorRead) || "-"
    }\n`;

    if (toText(log.dhorReadNotes)) {
      reportText += `Note: ${toText(log.dhorReadNotes)}\n`;
    }

    reportText += `\n`;

    if (toText(log.sabakDhorMistakes)) {
      reportText += `*Sabak Dhor Mistakes:* ${toText(log.sabakDhorMistakes)}\n`;
    }

    if (toText(log.dhorMistakes)) {
      reportText += `*Dhor Mistakes:* ${toText(log.dhorMistakes)}\n`;
    }

    if (index !== logs.length - 1) {
      reportText += `──────────────\n\n`;
    }
  });

  const latestLog = logs[0];
  const goalCompleted =
    latestLog?.weeklyGoalCompleted === true ||
    Boolean(latestLog?.weeklyGoalCompletedDateKey);

  reportText += `*Weekly Goal:* ${toText(latestLog?.weeklyGoal) || "-"}\n`;
  reportText += `*Goal Status:* ${goalCompleted ? "Completed" : "In Progress"}\n`;
  reportText += `Duration: ${toText(latestLog?.weeklyGoalDurationDays) || "-"} day(s)\n\n`;
  reportText += `────────────────\n*Powered by The Hifdh Journal*`;

  return reportText.trim();
}