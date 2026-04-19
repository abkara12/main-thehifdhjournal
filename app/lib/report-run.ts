import { getDateKeySA, shiftDateKey } from "./date";

export function getCurrentReportWindow() {
  const todayKey = getDateKeySA();
  const startKey = shiftDateKey(todayKey, -7);
  const endKey = todayKey;
  const runId = `${startKey}__${endKey}`;

  return {
    todayKey,
    startKey,
    endKey,
    runId,
    label: `${startKey} → ${endKey}`,
  };
}