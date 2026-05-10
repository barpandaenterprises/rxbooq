export type SlotState = "available" | "booked" | "selected" | "just-taken";

export type Slot = {
  /** "10:00", "10:30", … */
  short: string;
  /** "10:00 AM" */
  label: string;
};

type Props = {
  slot: Slot;
  state: SlotState;
  onSelect: (short: string) => void;
  showTooltip?: boolean;
};

export function SlotPill({ slot, state, onSelect, showTooltip }: Props) {
  const stateClasses = (() => {
    switch (state) {
      case "booked":
        return "border-border bg-[#F4F5F7] text-[#9aa9b8] line-through cursor-not-allowed";
      case "selected":
        return "border-cta bg-cta text-white shadow-[0_4px_10px_rgba(238,52,78,0.20)] cursor-pointer";
      case "just-taken":
        return "border-cta bg-white text-heading cursor-pointer";
      case "available":
      default:
        return "border-border bg-white text-heading hover:border-link-hover cursor-pointer";
    }
  })();

  return (
    <div className="relative">
      <button
        type="button"
        disabled={state === "booked"}
        onClick={() => state !== "booked" && onSelect(slot.short)}
        className={
          "min-h-[44px] w-full rounded-md border-[1.5px] py-3 text-[14px] font-medium transition-colors duration-150 " +
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta " +
          stateClasses
        }
      >
        {slot.label}
      </button>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute left-1/2 top-[calc(100%+10px)] z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-heading px-3.5 py-2.5 text-[12px] leading-[18px] text-white shadow-[0_10px_24px_rgba(16,24,40,0.20)]"
        >
          <i className="fas fa-exclamation-circle mr-1.5 text-[#FFB36B]" />
          This slot was just taken — please pick another.
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-heading" />
        </div>
      )}
    </div>
  );
}
