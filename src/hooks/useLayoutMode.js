import { useEffect, useState } from "react";

export function useLayoutMode() {
  const [w, setW] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (w >= 1400) return "3col";
  if (w >= 1000) return "2col";
  return "1col";
}
