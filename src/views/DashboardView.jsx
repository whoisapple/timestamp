// src/views/DashboardView.jsx
import FocusLayer from "../components/FocusLayer";
import { formatHMS } from "../lib/format";
import { displayName } from "../lib/appNames";

export default function DashboardView({
  onClickTimer,
  rows,
  current,
  error,
  focusedSet,
  setFocusedSet,
  totalActive,
  totalFocus,
  topApp,
  switches,
  switchesPerHour,
}) {
  const FONT_FAMILY =
    '"Monoplex KR", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  const BG = "#E9E9E7";
  const CARD = "#F6F6F4";
  const PANEL = "#F6F6F4";
  const INSET = "0 0 0 1px rgba(0,0,0,0.06)";

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: BG }}>
      {/* center + max width */}
      <div
        className="mx-auto w-full max-w-[1440px] px-[24px] pt-[24px] pb-[24px] h-screen"
        style={{ fontFamily: FONT_FAMILY, color: "#0B0B0B" }}
      >
        {/* Top bar */}
        <div className="flex items-center">
          <div className="flex items-center gap-3">
            <img src="./logo.svg" alt="" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              className="h-[34px] rounded-full bg-black px-5 text-[14px] font-semibold text-white"
              title="View Timer"
              onClick={onClickTimer}
            >
              View Timer
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-[18px] grid gap-[12px] grid-cols-1 xl:grid-cols-[1fr_420px] min-h-0">
          {/* LEFT */}
          <div className="min-h-0 min-w-0">
            {/* KPI */}
            <div className=" grid gap-[12px] grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              <div
                className="rounded-[22px] px-[22px] py-[16px]"
                style={{ background: CARD, boxShadow: INSET }}
              >
                <div className="text-[13px] font-medium">Total Active Time</div>
                <div className="mt-[10px] text-[34px] font-semibold leading-none">
                  {formatHMS(totalActive)}
                </div>
              </div>

              <div
                className="rounded-[22px] px-[22px] py-[16px]"
                style={{ background: CARD, boxShadow: INSET }}
              >
                <div className="text-[13px] font-medium">Total Focus Time</div>
                <div className="mt-[10px] text-[34px] font-semibold leading-none">
                  {formatHMS(totalFocus)}
                </div>
              </div>

              <div
                className="rounded-[22px] px-[22px] py-[16px]"
                style={{ background: CARD, boxShadow: INSET }}
              >
                <div className="text-[13px] font-medium">Top App</div>
                <div className="mt-[10px] text-[34px] font-semibold leading-none line-clamp-1">
                  {topApp}
                </div>
              </div>
            </div>

            {/* Middle */}
            <div className="mt-[12px] grid gap-[12px] grid-cols-1 lg:grid-cols-2">
              <div
                className="rounded-[26px] p-[22px]"
                style={{ background: PANEL, boxShadow: INSET, height: 380 }}
              >
                <div className="text-[13px] font-medium">Context Switches</div>
                <div className="mt-[10px] text-[34px] font-semibold leading-none">
                  {switches}
                </div>
                <div className="mt-2 text-[12px] font-medium text-black/55">
                  Switches / hour: {switchesPerHour || 0}
                </div>
              </div>

              <div
                className="rounded-[26px] p-[22px]"
                style={{ background: PANEL, boxShadow: INSET, height: 380 }}
              >
                <div className="text-[13px] font-medium">Current App</div>
                <div className="mt-[10px] text-[24px] font-semibold leading-none">
                  {displayName(current?.exe)}
                </div>
                <div className="mt-2 text-[12px] font-medium text-black/55">
                  {current?.exe || "-"}
                </div>
              </div>
            </div>

            {/* Bottom placeholder */}
            <div
              className="mt-[12px] min-h-0 rounded-[26px] p-[22px]"
              style={{ background: PANEL, boxShadow: INSET, minHeight: 220 }}
            >
              <div className="text-[13px] font-medium">최근 180일</div>
              <div className="mt-[14px] h-[220px] rounded-[18px]" />
            </div>
          </div>

          {/* RIGHT */}
          <div className="min-h-0 min-w-0">
            <FocusLayer
              rows={rows}
              focusedSet={focusedSet}
              setFocusedSet={setFocusedSet}
              totalFocus={totalFocus}
            />

            {error ? (
              <div className="mt-3 text-[11px] font-medium text-red-600">
                {String(error).slice(0, 140)}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
