// src/App.jsx
import "./index.css";
import { useMemo, useState } from "react";
import { displayName } from "./lib/appNames";
import { useWorklog } from "./hooks/useWorklog";
import { useWindowSizeByView } from "./hooks/useWindowSizeByView";
import DashboardView from "./views/DashboardView";
import TimerView from "./views/TimerView";

const DASH = { w: 1440, h: 1024, resizable: true };
const TIMER = { w: 363, h: 220, resizable: false };

export default function App() {
  const [view, setView] = useState("dashboard"); // "dashboard" | "timer"
  const [focusedSet, setFocusedSet] = useState(() => new Set()); // ✅ multi focus

  const { rows, totalActive, current, error, switches, switchesPerHour, secondsByExe } =
    useWorklog();

  useWindowSizeByView(view, { dashboard: DASH, timer: TIMER });

  const topApp = useMemo(() => {
    if (!rows.length) return "-";
    return displayName(rows[0].exe);
  }, [rows]);

  const totalFocus = useMemo(() => {
    let sum = 0;
    for (const exe of focusedSet) sum += secondsByExe[exe] ?? 0;
    return sum;
  }, [focusedSet, secondsByExe]);

  const focusedCount = focusedSet.size;

  if (view === "timer") {
    return (
      <TimerView
        totalFocus={totalFocus}
        focusedCount={focusedCount}
        onBack={() => setView("dashboard")}
      />
    );
  }

  return (
    <DashboardView
      onClickTimer={() => setView("timer")}
      rows={rows}
      current={current}
      error={error}
      focusedSet={focusedSet}
      setFocusedSet={setFocusedSet}
      totalActive={totalActive}
      totalFocus={totalFocus}
      topApp={topApp}
      switches={switches}
      switchesPerHour={switchesPerHour}
    />
  );
}
