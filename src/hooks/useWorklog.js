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
 * - Rust command args가 activeDelta/focusDelta를 요구하는 상태에 맞춤
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
          activeDelta: sendA,
          focusDelta: sendF,
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

  // ✅ idle 상태 (3초 이상 입력 없음)
  const IDLE_THRESHOLD_MS = 3000;
  const [isIdle, setIsIdle] = useState(false);
  const [idleMs, setIdleMs] = useState(0);
  const isIdleRef = useRef(false);

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

        if (typeof snap.day === "string") setCurrentDay(snap.day);

        if (snap.exe_seconds && typeof snap.exe_seconds === "object") {
          const out = {};
          for (const [k, v] of Object.entries(snap.exe_seconds)) {
            out[k] = Number(v) || 0;
          }
          setSecondsByExe(out);
        }

        if (typeof snap.switches === "number")
          setSwitches(Number(snap.switches) || 0);

        if (
          Array.isArray(snap.hourly_distraction) &&
          snap.hourly_distraction.length === 24
        ) {
          setHourlyDistraction(
            snap.hourly_distraction.map((x) => Number(x) || 0)
          );
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

          // ✅ Rust store와 day 동기화 (필요 시)
          await invoke("get_today_snapshot").catch(() => {});

          // idle 상태도 리셋
          if (isIdleRef.current) {
            isIdleRef.current = false;
            setIsIdle(false);
          }
          setIdleMs(0);

          setError(null);
          return;
        }

        // ✅ idle 체크 (3초 이상 입력 없으면 집계 중단)
        const idle = await invoke("get_idle_time_ms").catch(() => 0);
        const idleNum = Number(idle) || 0;
        setIdleMs(idleNum);

        const nowIdle = idleNum >= IDLE_THRESHOLD_MS;
        if (nowIdle) {
          if (!isIdleRef.current) {
            isIdleRef.current = true;
            setIsIdle(true);
          }

          // idle 동안에는 스위치가 튀지 않도록 끊기
          prevExeRef.current = null;

          // (원하면 여기서 current를 유지/갱신할 수도 있는데,
          //  "측정 멈춤" 목적이면 집계 로직을 타지 않는 게 핵심)
          setError(null);
          return;
        } else {
          if (isIdleRef.current) {
            isIdleRef.current = false;
            setIsIdle(false);
          }
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
          pendingHourlyRef.current[hour] =
            (pendingHourlyRef.current[hour] ?? 0) + 1;
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

  const totalActive = useMemo(
    () => rows.reduce((acc, r) => acc + (r.sec || 0), 0),
    [rows]
  );

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
          await invoke("record_today_switches", { switchesDelta: sw });
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

      // exe (✅ command이 요구하는 키: exeDeltas, 타입: sequence)
      const exeMap = pendingExeRef.current;
      const entries = Object.entries(exeMap)
        .map(([k, v]) => [k, Number(v) || 0])
        .filter(([, v]) => v > 0);

      if (entries.length > 0) {
        pendingExeRef.current = {}; // flush optimistic 
        try {
          // ✅ Rust command wrapper가 요구: { exeDeltas: Vec<(String,u64)> }
          await invoke("record_today_exe_deltas", { exeDeltas: entries });
        } catch (e) {
          for (const [k, v] of entries) {
            pendingExeRef.current[k] =
              (pendingExeRef.current[k] ?? 0) + (v || 0);
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

    // ✅ idle 관련 (UI에서 표시/디버그 가능)
    isIdle,
    idleMs,
  };
}
