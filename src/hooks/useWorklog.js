// src/hooks/useWorklog.js
import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { shouldIgnoreExe } from "../lib/ignoreApps";

/** ✅ 로컬(시스템 타임존) 기준 YYYY-MM-DD */
function localDayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * ✅ active/focus delta 저장 (10초 flush)
 */
function usePersistDailyDeltas({ totalActive, totalFocus }) {
  const lastRef = useRef({ a: 0, f: 0 });
  const pendingRef = useRef({ a: 0, f: 0 });

  useEffect(() => {
    const prev = lastRef.current;

    const da = Math.max(0, (totalActive ?? 0) - prev.a);
    const df = Math.max(0, (totalFocus ?? 0) - prev.f);

    pendingRef.current.a += da;
    pendingRef.current.f += df;

    lastRef.current = { a: totalActive ?? 0, f: totalFocus ?? 0 };
  }, [totalActive, totalFocus]);

  useEffect(() => {
    const id = setInterval(async () => {
      const p = pendingRef.current;
      if (p.a === 0 && p.f === 0) return;

      const sendA = p.a;
      const sendF = p.f;
      pendingRef.current = { a: 0, f: 0 };

      try {
        await invoke("record_today_deltas", {
          // ✅ snake_case로 보내는 게 가장 안전
          active_delta: sendA,
          focus_delta: sendF,
        });
      } catch (e) {
        pendingRef.current.a += sendA;
        pendingRef.current.f += sendF;
        console.error("[persist] record_today_deltas failed:", e);
      }
    }, 10_000);

    return () => clearInterval(id);
  }, []);
}

export function useWorklog(focusedSet) {
  const [secondsByExe, setSecondsByExe] = useState({});
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);

  const [switches, setSwitches] = useState(0);
  const prevExeRef = useRef(null);
  const startedAtRef = useRef(Date.now());

  const [hourlyDistraction, setHourlyDistraction] = useState(() =>
    Array(24).fill(0)
  );

  // ✅ 현재 day (로컬 기준)
  const [currentDay, setCurrentDay] = useState(() => localDayKey());
  const currentDayRef = useRef(currentDay);
  useEffect(() => {
    currentDayRef.current = currentDay;
  }, [currentDay]);

  // ✅ interval 클로저에서 focusedSet 최신값 사용
  const focusedSetRef = useRef(focusedSet);
  useEffect(() => {
    focusedSetRef.current = focusedSet;
  }, [focusedSet]);

  // ✅ store flush용 pending
  const pendingExeRef = useRef({}); // { exe: deltaSec }
  const pendingSwitchRef = useRef(0); // delta switches
  const pendingHourlyRef = useRef(Array(24).fill(0)); // delta hourly

  // ✅ 앱 시작 시 오늘 스냅샷 로드 (재시작/새로고침 복구)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await invoke("get_today_snapshot");
        if (!alive || !snap) return;

        // Rust(Local) day를 currentDay로 맞춤
        if (typeof snap.day === "string") setCurrentDay(snap.day);

        // exe_seconds 복구
        if (snap.exe_seconds && typeof snap.exe_seconds === "object") {
          const out = {};
          for (const [k, v] of Object.entries(snap.exe_seconds)) {
            out[k] = Number(v) || 0;
          }
          setSecondsByExe(out);
        }

        // switches 복구
        if (typeof snap.switches === "number") setSwitches(Number(snap.switches) || 0);

        // hourly_distraction 복구
        if (Array.isArray(snap.hourly_distraction) && snap.hourly_distraction.length === 24) {
          setHourlyDistraction(snap.hourly_distraction.map((x) => Number(x) || 0));
        }

        setError(null);
      } catch (e) {
        console.warn("[get_today_snapshot] failed:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ 1초마다 foreground 집계 (currentDay를 deps로 두지 않음: ref로 비교)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        // ✅ 자정 넘어갔는지 체크 (로컬 기준)
        const nowDay = localDayKey();
        if (nowDay !== currentDayRef.current) {
          setCurrentDay(nowDay);

          // 메모리 리셋
          setSecondsByExe({});
          setSwitches(0);
          setHourlyDistraction(Array(24).fill(0));

          prevExeRef.current = null;
          startedAtRef.current = Date.now();

          // pending 리셋
          pendingExeRef.current = {};
          pendingSwitchRef.current = 0;
          pendingHourlyRef.current = Array(24).fill(0);

          setError(null);
          return;
        }

        const fg = await invoke("get_foreground_app");
        setCurrent(fg);

        const exe = fg?.exe;
        if (!exe) {
          setError(null);
          return;
        }

        // ignore 대상이면 집계 제외 + switches 끊기
        if (shouldIgnoreExe(exe)) {
          prevExeRef.current = null;
          setError(null);
          return;
        }

        // secondsByExe 누적 + pending exe
        setSecondsByExe((prev) => ({ ...prev, [exe]: (prev[exe] ?? 0) + 1 }));
        pendingExeRef.current[exe] = (pendingExeRef.current[exe] ?? 0) + 1;

        // switches 누적 + pending switches
        const prevExe = prevExeRef.current;
        if (prevExe && prevExe !== exe) {
          setSwitches((s) => s + 1);
          pendingSwitchRef.current += 1;
        }
        prevExeRef.current = exe;

        // hourlyDistraction (Focus 아닌 경우만)
        const fs = focusedSetRef.current;
        const isFocused = fs instanceof Set ? fs.has(exe) : false;
        if (!isFocused) {
          const hour = new Date().getHours();
          setHourlyDistraction((prev) => {
            const next = prev.slice();
            next[hour] = (next[hour] || 0) + 1;
            return next;
          });
          pendingHourlyRef.current[hour] = (pendingHourlyRef.current[hour] ?? 0) + 1;
        }

        setError(null);
      } catch (e) {
        setError(String(e));
      }
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    return Object.entries(secondsByExe)
      .map(([exe, sec]) => ({ exe, sec }))
      .sort((a, b) => (b.sec || 0) - (a.sec || 0));
  }, [secondsByExe]);

  const totalActive = useMemo(() => rows.reduce((acc, r) => acc + (r.sec || 0), 0), [rows]);

  const totalFocus = useMemo(() => {
    if (!focusedSet || !(focusedSet instanceof Set)) return 0;
    let s = 0;
    for (const r of rows) if (focusedSet.has(r.exe)) s += r.sec || 0;
    return s;
  }, [rows, focusedSet]);

  const elapsedSeconds = useMemo(() => {
    const now = Date.now();
    return Math.max(1, Math.floor((now - startedAtRef.current) / 1000));
  }, [totalActive]);

  const switchesPerHour = useMemo(() => {
    return Math.round((switches / elapsedSeconds) * 3600);
  }, [switches, elapsedSeconds]);

  // active/focus persist
  usePersistDailyDeltas({ totalActive, totalFocus });

  // switches/hourly/exe persist (10초 flush)
  useEffect(() => {
    const id = setInterval(async () => {
      // switches
      const sw = pendingSwitchRef.current;
      if (sw > 0) {
        pendingSwitchRef.current = 0;
        try {
          await invoke("record_today_switches", { switches_delta: sw });
        } catch (e) {
          pendingSwitchRef.current += sw;
          console.error("[persist] record_today_switches failed:", e);
        }
      }

      // hourly
      const h = pendingHourlyRef.current;
      const hasHourly = h.some((v) => v > 0);
      if (hasHourly) {
        const send = h.slice();
        pendingHourlyRef.current = Array(24).fill(0);
        try {
          await invoke("record_today_hourly_distraction", { deltas: send });
        } catch (e) {
          for (let i = 0; i < 24; i++) pendingHourlyRef.current[i] += send[i];
          console.error("[persist] record_today_hourly_distraction failed:", e);
        }
      }

      // exe
      const exeMap = pendingExeRef.current;
      const entries = Object.entries(exeMap).filter(([, v]) => (v || 0) > 0);
      if (entries.length > 0) {
        pendingExeRef.current = {};
        try {
          await invoke("record_today_exe_deltas", { exe_deltas: entries });
        } catch (e) {
          for (const [k, v] of entries) {
            pendingExeRef.current[k] = (pendingExeRef.current[k] ?? 0) + (v || 0);
          }
          console.error("[persist] record_today_exe_deltas failed:", e);
        }
      }
    }, 10_000);

    return () => clearInterval(id);
  }, []);

  return {
    secondsByExe,
    rows,
    totalActive,
    totalFocus,
    current,
    error,
    switches,
    switchesPerHour,
    hourlyDistraction,
    currentDay,
  };
}
