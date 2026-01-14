// src/views/TimerView.jsx
import { formatHMS } from "../lib/format";

const TIMER_W = 348;
const TIMER_H = 179;

export default function TimerView({ totalFocus, focusedCount, onBack }) {
  const FONT_FAMILY =
    '"Monoplex KR", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  return (
    <div
      style={{
        background: "#E9E9E7",
        fontFamily: FONT_FAMILY,
        color: "#0B0B0B",
      }}
      className="select-none"
    >
      <div className=" w-full px-[22px] pt-[18px] pb-[16px]">
        <div className="text-center text-[18px] font-medium tracking-tight">
          Total Focus Time
        </div>

        <div className="mt-[10px] text-center text-[56px] font-semibold leading-none">
          {formatHMS(totalFocus)}
        </div>

        <div className="mt-[6px] text-center text-[12px] font-medium text-black/55">
          Focused apps: {focusedCount}
        </div>

        <button
          className="mt-[12px] h-[56px] w-full rounded-[22px] bg-black text-[18px] font-semibold text-white active:scale-[0.99]"
          onClick={onBack}
          title="Back to Dashboard"
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
}
