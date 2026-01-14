// src/components/UsageBars.jsx
import { useMemo } from "react";
import { formatHMS, formatAppName } from "../lib/format";

export default function UsageBars({
  rows,
  totalActive,
  focusedSet,
  limit = 10,
}) {
  const data = useMemo(() => {
    const safe = Array.isArray(rows) ? rows : [];
    const filtered = safe
      .filter((r) => r && r.exe && Number.isFinite(r.sec) && r.sec > 0)
      .sort((a, b) => b.sec - a.sec);

    return filtered.slice(0, limit);
  }, [rows, limit]);

  const max = data[0]?.sec ?? 1;

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium">오늘 Top Apps</div>
        <div className="text-[11px] font-medium text-black/45">
          Total: {formatHMS(totalActive)}
        </div>
      </div>

      {/* list */}
      <div className="mt-[14px] min-h-0 flex-1 overflow-auto pr-1 scrollbar-hide">
        {data.length === 0 ? (
          <div className="rounded-[18px] bg-white/40 p-4 text-[12px] font-medium text-black/55">
            아직 데이터가 없어요.
          </div>
        ) : (
          <div className="space-y-[10px]">
            {data.map((r) => {
              const pct = Math.max(0.06, r.sec / max); // 최소 가시성
              const isFocused = focusedSet?.has?.(r.exe);

              return (
                <div
                  key={r.exe}
                  className="rounded-[16px] bg-white px-[14px] py-[12px]"
                  style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[16px] font-semibold">
                          {formatAppName(r.exe)}
                        </div>
                        {isFocused ? (
                          <span className="rounded-full bg-black px-2 py-[2px] text-[10px] font-semibold text-white">
                            Focus
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 truncate text-[14px] font-medium text-black/45">
                        {r.exe}
                      </div>
                    </div>

                    <div className="shrink-0 text-[14px] font-semibold">
                      {formatHMS(r.sec)}
                    </div>
                  </div>

                  {/* bar */}
                  <div className="mt-[10px] h-[10px] w-full rounded-full bg-black/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct * 100}%`,
                        background: isFocused
                          ? "rgba(0,0,0,0.85)"
                          : "rgba(0,0,0,0.35)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
