import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function useIdleDetector(idleMs = 3000) {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    const t = setInterval(async () => {
      const ms = await invoke("get_idle_time_ms");

      setIsIdle(ms >= idleMs);
    }, 1000);

    return () => clearInterval(t);
  }, [idleMs]);

  return isIdle;
}
