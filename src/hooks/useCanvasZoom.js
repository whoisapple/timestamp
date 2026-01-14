import { useEffect, useMemo, useState } from "react";

export function useCanvasZoom(baseW, baseH) {
  const [vp, setVp] = useState(() => ({
    w: window.innerWidth || baseW,
    h: window.innerHeight || baseH,
  }));

  useEffect(() => {
    const onResize = () =>
      setVp({ w: window.innerWidth || baseW, h: window.innerHeight || baseH });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [baseW, baseH]);

  const zoom = useMemo(() => {
    const s = Math.min(vp.w / baseW, vp.h / baseH);
    return Math.max(0.6, Math.min(1.25, s));
  }, [vp.w, vp.h, baseW, baseH]);

  return { zoom };
}
    