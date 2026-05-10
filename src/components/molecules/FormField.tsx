type Props = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

export function FormField({ label, htmlFor, required, error, hint, children }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-1.5 md:mb-[18px]">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-heading">
        {label}
        {required && <span className="ml-0.5 text-cta">*</span>}
      </label>
      {children}
      {error ? (
        <div className="flex items-center gap-1.5 text-[12px] text-cta">
          <i className="fas fa-exclamation-circle text-[11px]" />
          {error}
        </div>
      ) : hint ? (
        <div className="text-[12px] text-[#9aa9b8]">{hint}</div>
      ) : null}
    </div>
  );
}

/**
 * Shared input class — matches the design's default state.
 * Use `text-input-error` for the error variant (coral border).
 */
export const TEXT_INPUT_CLASS =
  "w-full rounded-md border-[1.5px] border-border bg-white px-3.5 py-3 text-[15px] text-heading outline-none " +
  "focus-visible:border-cta focus-visible:shadow-[0_0_0_3px_rgba(238,52,78,0.18)] " +
  "disabled:opacity-60 placeholder:text-[#9aa9b8]";

export const TEXT_INPUT_ERROR_CLASS =
  "w-full rounded-md border-[1.5px] border-cta bg-white px-3.5 py-3 text-[15px] text-heading outline-none " +
  "focus-visible:shadow-[0_0_0_3px_rgba(238,52,78,0.18)] placeholder:text-[#9aa9b8]";
