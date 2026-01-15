// src/App.jsx
import "./index.css";
import { useMemo, useState, useEffect, useRef } from "react";
import { displayName } from "./lib/appNames";
import { useWorklog } from "./hooks/useWorklog";
import { useWindowSizeByView } from "./hooks/useWindowSizeByView";
import { invoke } from "@tauri-apps/api/core";
import DashboardView from "./views/DashboardView";
import TimerView from "./views/TimerView";
import { enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { initAnalytics, track } from "./lib/analytics";

const SIZE_PRESETS = {
  macos: {
    dashboard: { w: 1400, h: 980, resizable: true },
    timer: { w: 360, h: 248, resizable: false },
  },
  windows: {
    dashboard: { w: 1440, h: 1024, resizable: true },
    timer: { w: 380, h: 240, resizable: false },
  },
  unknown: {
    dashboard: { w: 1440, h: 1024, resizable: true },
    timer: { w: 363, h: 220, resizable: false },
  },
};


const detectOS = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "macos";
  if (ua.includes("win")) return "windows";
  return "unknown";
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const [focusedSet, setFocusedSet] = useState(() => new Set());
  const os = useMemo(() => detectOS(), []);
  const windowSizes = useMemo(() => {
    return SIZE_PRESETS[os] || SIZE_PRESETS.unknown;
  }, [os]);


  // 1) App Opened (마운트 1회)
  useEffect(() => {
    initAnalytics();
    track("App Opened", { os });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 부팅 시 자동 실행 활성화 (마운트 1회)
  useEffect(() => {
    (async () => {
      try {
        const enabled = await isEnabled();
        if (!enabled) {
          await enable();
          console.log("Autostart enabled");
        }
      } catch (e) {
        console.error("Autostart setup failed:", e);
      }
    })();
  }, []);


  const {
    rows,
    totalActive,
    totalFocus,
    current,
    error,
    switches,
    switchesPerHour,
    secondsByExe,
    hourlyDistraction,
    isIdle,
    idleMs,
  } = useWorklog(focusedSet);

  // 2) View Changed (변할 때만)
  const prevViewRef = useRef(view);
  useEffect(() => {
    const prev = prevViewRef.current;
    if (prev !== view) {
      track("View Changed", { from: prev, to: view, os });
      prevViewRef.current = view;
    }
  }, [view, os]);

  // 3) Idle Detected/Recovered (변할 때만, 스팸 방지)
  const prevIdleRef = useRef(!!isIdle);
  useEffect(() => {
    const prev = prevIdleRef.current;
    const curr = !!isIdle;
    if (prev === curr) return;

    if (curr) track("Idle Detected", { os, idleMs: Math.floor(idleMs || 0) });
    else track("Idle Recovered", { os, idleMs: Math.floor(idleMs || 0) });

    prevIdleRef.current = curr;
  }, [isIdle, idleMs, os]);

  // 4) Focus Changed (개수만)
  const prevFocusCountRef = useRef(focusedSet.size);
  useEffect(() => {
    const prev = prevFocusCountRef.current;
    const curr = focusedSet.size;
    if (prev !== curr) {
      track("Focus Changed", { os, count: curr });
      prevFocusCountRef.current = curr;
    }
  }, [focusedSet, os]);

  // ---- 이하 기존 로직 유지 ----

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = (e.key || "").toLowerCase();
      if (key === "f5") {
        e.preventDefault(); e.stopPropagation(); return;
      }
      if ((e.ctrlKey || e.metaKey) && key === "r") {
        e.preventDefault(); e.stopPropagation(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "r") {
        e.preventDefault(); e.stopPropagation(); return;
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  useWindowSizeByView(view, windowSizes);

  const topApp = useMemo(() => {
    if (!rows.length) return "-";
    return displayName(rows[0].exe);
  }, [rows]);

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
      try { setFocusedSet(new Set(JSON.parse(raw))); } catch {}
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
      totalFocus={totalFocus}
      topApp={topApp}
      switches={switches}
      switchesPerHour={switchesPerHour}
      hourlyDistraction={hourlyDistraction}
    />
  );
}
