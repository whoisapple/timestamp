// src/hooks/useWindowSizeByView.js
import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * view === "timer"      : 항상 348x179 강제 + resizable false
 * view === "dashboard"  : "진입 시 1회만" 1440x1024로 맞춤 + resizable true (이후 유저 리사이즈 존중)
 *
 * sizes = {
 *   timer: { w: 348, h: 179 },
 *   dashboard: { w: 1440, h: 1024 },
 * }
 */
export function useWindowSizeByView(view, sizes) {
  const lastAppliedRef = useRef(null); // { view, w, h }
  const lastViewRef = useRef(null);

  useEffect(() => {
    let alive = true;

    async function apply() {
      const win = getCurrentWindow();

      const target = sizes?.[view];
      if (!target) return;

      // 이미 같은 view에 대해 같은 사이즈 적용했으면 재적용 금지
      const last = lastAppliedRef.current;
      const alreadyApplied =
        last && last.view === view && last.w === target.w && last.h === target.h;

      // view 전환 감지
      const viewChanged = lastViewRef.current !== view;
      lastViewRef.current = view;

      // timer는 항상 강제 고정
      if (view === "timer") {
        try {
          await win.setResizable(false);
          await win.setSize({ type: "Logical", width: target.w, height: target.h });
          await win.center();
          if (!alive) return;
          lastAppliedRef.current = { view, w: target.w, h: target.h };
        } catch {}
        return;
      }

      // dashboard는 "진입 시 1회만" 사이즈 맞춤
      // (유저가 리사이즈한 걸 다시 덮어쓰지 않기 위해 viewChanged 조건만)
      if (view === "dashboard") {
        try {
          await win.setResizable(true);

          if (viewChanged && !alreadyApplied) {
            await win.setSize({ type: "Logical", width: target.w, height: target.h });
            await win.center();
            if (!alive) return;
            lastAppliedRef.current = { view, w: target.w, h: target.h };
          }
        } catch {}
      }
    }

    apply();
    return () => {
      alive = false;
    };
  }, [view, sizes]);
}
