// src/components/WorkPresence30.jsx
import { useMemo, useState } from "react";

/**
 * days: [{ day: "YYYY-MM-DD", worked: boolean }]
 * UI: 20 x 10 = 200 dots
 * 규칙:
 * - 좌상단 = 가장 최신 날짜(오늘)
 * - 우하단 = 가장 오래된 날짜(200일 전)
 * - days에 없는 날짜는 자동으로 회색 placeholder 처리
 */
export default function WorkPresence30({ days = [] }) {
  const COLS = 20;
  const ROWS = 10;
  const TOTAL = COLS * ROWS;

  const [hover, setHover] = useState(null); // { day, worked }

  // days를 map으로 변환 (빠른 lookup)
  const dayMap = useMemo(() => {
    const m = new Map();
    for (const d of days) m.set(d.day, d);
    return m;
  }, [days]);

  // 오늘부터 200일 생성 (최신 -> 과거)
  const cells = useMemo(() => {
    const arr = [];
    const today = new Date();

    for (let i = 0; i < TOTAL; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const key = d.toISOString().slice(0, 10);
      const found = dayMap.get(key);

      if (found) {
        arr.push({
          day: key,
          worked: !!found.worked,
          __empty: false,
        });
      } else {
        arr.push({
          day: key,
          worked: false,
          __empty: true,
        });
      }
    }

    return arr; // [0] = 오늘 = 좌상단
  }, [dayMap]);

  const workedCount = useMemo(
    () => cells.filter((c) => c.worked).length,
    [cells]
  );

  const hoverText = useMemo(() => {
    if (!hover) return "점에 마우스를 올리면 날짜가 표시됩니다";
    return `${hover.day} • ${hover.worked ? "worked" : "no work"}`;
  }, [hover]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between">
        <div className="text-[16px] font-semibold tracking-[-0.02em]">
          작업 히스토리
        </div>

        <div className="text-[11px] font-medium text-black/45">
          worked {workedCount}/{TOTAL}
        </div>
      </div>

      <div className="mt-[4px] text-[11px] font-medium text-black/45">
        {hoverText}
      </div>

      {/* 카드 안에 맞게 자동 스케일 */}
      <div className="mt-[12px] flex-1 min-h-0 flex items-end justify-center">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: "6px",
            width: "100%",
            maxWidth: "100%",
            aspectRatio: `${COLS}/${ROWS}`,
          }}
        >
          {cells.map((c) => {
            const isWorked = c.worked;
            const isEmpty = c.__empty;

            let bg;
            if (isWorked) bg = "bg-black";
            else if (isEmpty) bg = "bg-black/10";
            else bg = "bg-black/10";

            return (
              <div
                key={c.day}
                onMouseEnter={() => setHover({ day: c.day, worked: isWorked })}
                onMouseLeave={() => setHover(null)}
                className={[
                  "w-full aspect-square rounded-full transition-transform",
                  "hover:scale-[1.15]",
                  bg,
                ].join(" ")}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
