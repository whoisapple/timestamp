import { useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";


export function useWindowSizeByView(view, sizes) {
  useEffect(() => {
    const win = getCurrentWindow();

    (async () => {
      try {
        const next = sizes[view];
        if (!next) return;

        await win.setResizable(!!next.resizable);
        await win.setSize(new LogicalSize(next.w, next.h));
        await win.center();
      } catch (e) {
        console.error("resize failed", e);
      }
    })();
  }, [view, sizes]);
}
