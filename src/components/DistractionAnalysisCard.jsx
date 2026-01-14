// src/components/DistractionAnalysisCard.jsx
import { formatHMS, formatAppName } from "../lib/format";

function hourLabel(h) {
  const s = String(h).padStart(2, "0");
  const e = String((h + 1) % 24).padStart(2, "0");
  return `${s}:00–${e}:00`;
}

export default function DistractionAnalysisCard({
  rows = [],
  focusedSet,
  totalActive = 0,
  totalFocus = 0,
  hourlyDistraction = [],
}) {
  const distractionSec = Math.max(0, (totalActive || 0) - (totalFocus || 0));
  const distractionRate =
    totalActive > 0 ? (distractionSec / totalActive) * 100 : 0;

  // rows에서 Focus 제외한 앱들 중 가장 큰 것 = Top Distraction
  const topDistraction = (() => {
    for (const r of rows) {
      const exe = r?.exe;
      if (!exe) continue;
      if (focusedSet?.has(exe)) continue;
      return r; // rows가 이미 desc 정렬이라면 첫 매치가 top
    }
    return null;
  })();

  // 시간대: hourlyDistraction[0..23]에서 max hour 찾기
  const mostDistractedHour = (() => {
    if (
      !Array.isArray(hourlyDistraction) ||
      hourlyDistraction.length !== 24
    )
      return null;
    let bestH = 0;
    let bestV = hourlyDistraction[0] || 0;
    for (let h = 1; h < 24; h++) {
      const v = hourlyDistraction[h] || 0;
      if (v > bestV) {
        bestV = v;
        bestH = h;
      }
    }
    if (bestV <= 0) return null;
    return { hour: bestH, sec: bestV };
  })();

  return (
    <div className="h-full flex flex-col">
      <div className="text-[13px] font-medium">Distraction</div>

      <div className="mt-[10px] grid grid-cols-2 gap-x-[14px] gap-y-[12px]">
        <div>
          <div className="text-[11px] font-medium text-black/45">
            Outside Focus
          </div>
          <div className="mt-[3px] text-[18px] font-semibold leading-none">
            {distractionRate.toFixed(0)}%
          </div>
          <div className="mt-[3px] text-[11px] font-medium text-black/45">
            {formatHMS(distractionSec)}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-black/45">
            Top Distraction
          </div>
          <div className="mt-[3px] text-[18px] font-semibold leading-none line-clamp-1">
            {topDistraction ? formatAppName(topDistraction.exe) : "-"}
          </div>
          <div className="mt-[3px] text-[11px] font-medium text-black/45">
            {topDistraction ? formatHMS(topDistraction.sec || 0) : "-"}
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-[11px] font-medium text-black/45">
            Most distracted hour
          </div>
          <div className="mt-[3px] text-[16px] font-semibold leading-none">
            {mostDistractedHour ? hourLabel(mostDistractedHour.hour) : "-"}
          </div>
          <div className="mt-[3px] text-[11px] font-medium text-black/45">
            {mostDistractedHour
              ? formatHMS(mostDistractedHour.sec)
              : "오늘 누적이 더 필요해요"}
          </div>
        </div>
      </div>

      {/* 상위 distraction 3개 */}
      <div className="mt-auto pt-[12px]">
        <div className="text-[11px] font-medium text-black/45">
          Top distractions (non-focus)
        </div>
        <div className="mt-[8px] space-y-[6px]">
          {rows
            .filter((r) => r?.exe && !focusedSet?.has(r.exe))
            .slice(0, 3)
            .map((r) => (
              <div key={r.exe} className="flex items-center justify-between">
                <div className="text-[12px] font-semibold text-black/80 line-clamp-1">
                  {formatAppName(r.exe)}
                </div>
                <div className="text-[12px] font-medium text-black/45">
                  {formatHMS(r.sec || 0)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
