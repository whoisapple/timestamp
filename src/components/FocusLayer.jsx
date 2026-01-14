// src/components/FocusLayer.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { displayName } from "../lib/appNames";
import { formatHMS } from "../lib/format";
const MAX_FOCUS = 5;

export default function FocusLayer({ rows, focusedSet, setFocusedSet, totalFocus }) {
  const PANEL = "#F6F6F4";
  const INSET = "0 0 0 1px rgba(0,0,0,0.06)";

  const focusDropRef = useRef(null);
  const listDropRef = useRef(null);

  // drag: { exe, origin: "list" | "focus", x, y, offsetX, offsetY }
  const [drag, setDrag] = useState(null);

  const focusedRows = useMemo(() => {
    const out = [];
    for (const r of rows) if (focusedSet.has(r.exe)) out.push(r);
    return out;
  }, [rows, focusedSet]);

  const distractionRows = useMemo(() => {
    const list = rows.filter((r) => !focusedSet.has(r.exe));
    return list.slice(0, 50); // 필요하면 더 늘리세요
  }, [rows, focusedSet]);

  function isPointInRect(x, y, rect) {
    if (!rect) return false;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function beginDrag(e, exe, origin) {
    e.preventDefault();
    e.stopPropagation();

    const targetRect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - targetRect.left;
    const offsetY = e.clientY - targetRect.top;

    setDrag({ exe, origin, x: e.clientX, y: e.clientY, offsetX, offsetY });

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  }

  const addFocus = useCallback(
    (exe) => {
      setFocusedSet((prev) => {
        // 이미 들어있으면 그대로
        if (prev.has(exe)) return prev;
  
        // 🔒 5개 초과 방지
        if (prev.size >= MAX_FOCUS) {
          return prev;
        }
  
        const next = new Set(prev);
        next.add(exe);
        return next;
      });
    },
    [setFocusedSet]
  );
  
  const removeFocus = useCallback(
    (exe) => {
      setFocusedSet((prev) => {
        const next = new Set(prev);
        next.delete(exe);
        return next;
      });
    },
    [setFocusedSet]
  );

  const clearAll = useCallback(() => {
    setFocusedSet(() => new Set());
  }, [setFocusedSet]);

  useEffect(() => {
    if (!drag) return;

    function onMove(ev) {
      setDrag((prev) => (prev ? { ...prev, x: ev.clientX, y: ev.clientY } : prev));
    }

    function onUp(ev) {
      const focusRect = focusDropRef.current?.getBoundingClientRect();
      const listRect = listDropRef.current?.getBoundingClientRect();

      const droppedOnFocus = isPointInRect(ev.clientX, ev.clientY, focusRect);
      const droppedOnList = isPointInRect(ev.clientX, ev.clientY, listRect);

      if (droppedOnFocus) addFocus(drag.exe);
      else if (droppedOnList && drag.origin === "focus") removeFocus(drag.exe);

      setDrag(null);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, addFocus, removeFocus]);

  const focusHover = useMemo(() => {
    if (!drag) return false;
    const rect = focusDropRef.current?.getBoundingClientRect();
    return isPointInRect(drag.x, drag.y, rect);
  }, [drag]);

  const listHover = useMemo(() => {
    if (!drag) return false;
    const rect = listDropRef.current?.getBoundingClientRect();
    return isPointInRect(drag.x, drag.y, rect);
  }, [drag]);

  const focusCount = focusedSet.size;

  return (
    <div
      className="h-full min-h-0 rounded-[26px] p-[18px] flex flex-col"
      style={{ background: PANEL, boxShadow: INSET }}
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="text-[15px] font-medium">Focus</div>
        <div className="text-[13px] font-medium text-black/45">Focused: {focusCount}/{MAX_FOCUS}</div>
      </div>

      {/* Focus zone */}
      <div
        ref={focusDropRef}
        className="mt-[12px] rounded-[18px] p-[14px] shrink-0"
        style={{
          background: "#F0F0EE",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
          outline: focusHover ? "2px dashed rgba(0,0,0,0.25)" : "none",
          outlineOffset: 6,
        }}
      >
        {/* summary card */}
        <div
          className="rounded-[14px] bg-white px-[14px] py-[12px]"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold">Total Focus Time</div>
            <div className="text-[13px] font-semibold">{formatHMS(totalFocus)}</div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className="h-[32px] flex-1 rounded-full bg-black text-[12px] font-semibold text-white disabled:opacity-40"
              onClick={clearAll}
              disabled={focusCount === 0}
              title="Clear all focused apps"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* focused chips */}
        {focusCount === 0 ? (
          <div
            className="mt-[12px] flex h-[64px] items-center justify-center rounded-[14px] px-4 text-center text-[12px] font-medium"
            style={{
              border: `1px dashed ${focusHover ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.18)"}`,
              background: focusHover ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.35)",
              color: "rgba(0,0,0,0.55)",
            }}
          >
            Focus 앱이 아직 없어요.
            <br />
            아래에서 드래그해서 추가하세요.
          </div>
        ) : (
          <div className="mt-[12px] space-y-[10px]">
            {focusedRows.map((r) => (
              <div
                key={r.exe}
                className="rounded-[16px] bg-white px-[14px] py-[12px] cursor-grab active:cursor-grabbing"
                style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06)", touchAction: "none" }}
                onPointerDown={(e) => beginDrag(e, r.exe, "focus")}
                title="Drag to list to remove from Focus"
              >
                <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-[16px] font-semibold">{displayName(r.exe)}</div>
                    <div className="mt-1 text-[14px] font-medium text-black/45">{r.exe}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distraction */}
      <div className="mt-[32px] text-[13px] font-medium shrink-0">Distraction</div>

      {/* 핵심: flex-1 + min-h-0 + overflow-y-auto */}
      <div
        ref={listDropRef}
        className="mt-[12px] flex-1 min-h-0 space-y-[12px] overflow-y-auto pr-1 overscroll-contain"
        style={{
          borderRadius: 16,
          padding: 2,
          outline: listHover ? "2px dashed rgba(0,0,0,0.25)" : "none",
          outlineOffset: 6,
        }}
      >
        {distractionRows.length ? (
          distractionRows.map((r) => (
            <div
              key={r.exe}
              className="rounded-[16px] bg-white px-[16px] py-[14px] cursor-grab active:cursor-grabbing"
              style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06)", touchAction: "none" }}
              onPointerDown={(e) => beginDrag(e, r.exe, "list")}
              title="Drag to Focus"
            >
              <div className="flex items-start justify-between gap-3">
                  <div className="truncate text-[15px] font-semibold">{displayName(r.exe)}</div>
                  <div className="mt-1 text-[13px] font-medium text-black/45">{r.exe}</div>
              </div>
            </div>
          ))
        ) : (
          <div
            className="rounded-[16px] bg-white px-[16px] py-[14px] text-[12px] font-medium text-black/45"
            style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }}
          >
            데이터가 쌓이면 여기에 표시됩니다.
          </div>
        )}
      </div>

      {/* drag ghost */}
      {drag ? (
        <div
          className="pointer-events-none fixed z-[9999] rounded-[14px] bg-black px-3 py-2 text-[12px] font-semibold text-white"
          style={{
            left: drag.x - (drag.offsetX ?? 0),
            top: drag.y - (drag.offsetY ?? 0),
            opacity: 0.92,
          }}
        >
          {displayName(drag.exe)}
        </div>
      ) : null}
    </div>
  );
}
