import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { shouldIgnoreExe } from "../lib/ignoreApps";

export function useWorklog() {
  const [secondsByExe, setSecondsByExe] = useState({});
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);

  const [switches, setSwitches] = useState(0);
  const prevExeRef = useRef(null);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const fg = await invoke("get_foreground_app"); // { exe, pid }
        setCurrent(fg);
  
        const exe = fg?.exe;
  
        // ✅ 무시 대상이면: current는 업데이트하되 집계는 안 함
        if (shouldIgnoreExe(exe)) {
          // prevExeRef는 "유효한 앱"만 보관해서 스위치가 튀지 않게 함
          setError(null);
          return;
        }
  
        // ✅ 누적
        setSecondsByExe((prev) => ({
          ...prev,
          [exe]: (prev[exe] ?? 0) + 1,
        }));
  
        // ✅ context switch: "유효한 앱"끼리만 카운트
        const prevExe = prevExeRef.current;
        if (prevExe && prevExe !== exe) {
          setSwitches((s) => s + 1);
        }
        prevExeRef.current = exe;
  
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
      .sort((a, b) => b.sec - a.sec);
  }, [secondsByExe]);

  const totalActive = useMemo(
    () => rows.reduce((acc, r) => acc + (r.sec || 0), 0),
    [rows]
  );

  const elapsedSeconds = useMemo(() => {
    const now = Date.now();
    return Math.max(1, Math.floor((now - startedAtRef.current) / 1000));
  }, [totalActive]);

  const switchesPerHour = useMemo(() => {
    return Math.round((switches / elapsedSeconds) * 3600);
  }, [switches, elapsedSeconds]);

  return {
    secondsByExe,
    rows,
    totalActive,
    current,
    error,
    switches,
    switchesPerHour,
  };
}
