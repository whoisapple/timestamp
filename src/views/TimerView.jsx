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
      <div className=" w-full px-[16px] pt-[16px] pb-[12px]">
        <div className="text-center text-[18px] font-medium tracking-tight">
          Total Focus Time
        </div>

        <div className="mt-[0px] text-center text-[48px] font-semibold leading-none">
          {formatHMS(totalFocus)}
        </div>

        <div className="mt-[4px] text-center text-[13px] font-medium text-black/55">
          Focused apps: {focusedCount}
        </div>

        <button
          className="mt-[12px] h-[48px] w-full rounded-[16px] bg-black text-[16px] font-semibold text-white active:scale-[0.95]"
          onClick={onBack}
          title="Back to Dashboard"
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
}
