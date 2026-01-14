// src/App.jsx
import "./index.css";
import { useMemo, useState, useEffect } from "react";
import { displayName } from "./lib/appNames";
import { useWorklog } from "./hooks/useWorklog";
import { useWindowSizeByView } from "./hooks/useWindowSizeByView";
import { invoke } from "@tauri-apps/api/core";
import DashboardView from "./views/DashboardView";
import TimerView from "./views/TimerView";

const DASH = { w: 1440, h: 1024, resizable: true };
const TIMER = { w: 363, h: 220, resizable: false };
const fg = await invoke("get_foreground_app");



export default function App() {
  const [view, setView] = useState("dashboard"); // "dashboard" | "timer"
  const [focusedSet, setFocusedSet] = useState(() => new Set()); // ✅ multi focus

  // ✅ useWorklog는 1번만 호출
  const {
    rows,
    totalActive,
    totalFocus, // useWorklog에서 계산된 값 사용
    current,
    error,
    switches,
    switchesPerHour,
    secondsByExe,
    hourlyDistraction,
  } = useWorklog(focusedSet);

  // ✅ 새로고침 막기 (PROD에서만 권장)
  useEffect(() => {
    // 개발 중이면 주석 해제해서 DEV에서는 허용 가능
    // if (!import.meta.env.PROD) return;

    const onKeyDown = (e) => {
      const key = (e.key || "").toLowerCase();

      // F5
      if (key === "f5") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+R / Cmd+R
      if ((e.ctrlKey || e.metaKey) && key === "r") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Ctrl+Shift+R / Cmd+Shift+R
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "r") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  // ✅ view에 따라 윈도우 사이즈 제어
  useWindowSizeByView(view, { dashboard: DASH, timer: TIMER });

  const topApp = useMemo(() => {
    if (!rows.length) return "-";
    return displayName(rows[0].exe);
  }, [rows]);

  // ✅ TimerView용 totalFocus는 현재 focusSet 기준으로 secondsByExe에서 재계산
  // (useWorklog.totalFocus는 이미 focusedSet 기반이지만, 안전하게 동일한 방식 유지 가능)
  const totalFocusForTimer = useMemo(() => {
    let sum = 0;
    for (const exe of focusedSet) sum += secondsByExe[exe] ?? 0;
    return sum;
  }, [focusedSet, secondsByExe]);

  const focusedCount = focusedSet.size;

  useEffect(() => {
    (async () => {
      try {
        await invoke("ensure_store_file");
        const dir = await invoke("debug_store_dir");
        console.log("[store] app_data_dir =", dir);
      } catch (e) {
        console.error("[store] init failed:", e);
      }
    })();
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("focusedSet");
    if (raw) {
      try {
        setFocusedSet(new Set(JSON.parse(raw)));
      } catch {}
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem("focusedSet", JSON.stringify([...focusedSet]));
  }, [focusedSet]);
  

  if (view === "timer") {
    return (
      <TimerView
        totalFocus={totalFocusForTimer}
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
      totalFocus={totalFocus} // ✅ useWorklog 값 사용
      topApp={topApp}
      switches={switches}
      switchesPerHour={switchesPerHour}
      hourlyDistraction={hourlyDistraction}
    />
  );
}
