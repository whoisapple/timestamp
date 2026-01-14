// src/hooks/useWindowSizeByView.js
import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

// mac / windows 공통: 강제 중앙
async function forceCenter(win) {
  const size = await win.innerSize();
  const mon = await win.currentMonitor();
  if (!mon) {
    await win.center();
    return;
  }

  const monPos = mon.position;
  const monSize = mon.size;

  const x = Math.round(monPos.x + (monSize.width - size.width) / 2);
  const y = Math.round(monPos.y + (monSize.height - size.height) / 2);

  await win.setPosition({ type: "Logical", x, y });
}

export function useWindowSizeByView(view, sizes) {
  const lastViewRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function apply() {
      const win = getCurrentWindow();
      const target = sizes?.[view];
      if (!target) return;

      const prevView = lastViewRef.current;
      lastViewRef.current = view;

      try {
        // ======================
        // TIMER MODE (항상 강제)
        // ======================
        if (view === "timer") {
          await win.setAlwaysOnTop(true);
          await win.setResizable(false);
          await win.setSize({
            type: "Logical",
            width: target.w,
            height: target.h,
          });
          // 필요하면 중앙
          // await forceCenter(win);
          if (!alive) return;
          return;
        }

        // ======================
        // DASHBOARD MODE
        // ======================
        if (view === "dashboard") {
          await win.setAlwaysOnTop(false);
          await win.setResizable(true);

          // ✅ "timer → dashboard" 로 전환되는 순간만 복구
          const enteredFromTimer = prevView === "timer";

          if (enteredFromTimer) {
            await win.setSize({
              type: "Logical",
              width: target.w,
              height: target.h,
            });

            // 중앙 복귀
            await forceCenter(win);
          }

          if (!alive) return;
        }
      } catch (e) {
        console.error("[WindowControl] failed:", e);
      }
    }

    apply();
    return () => {
      alive = false;
    };
  }, [view, sizes]);
}
