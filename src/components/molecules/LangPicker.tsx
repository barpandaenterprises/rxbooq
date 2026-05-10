export type Locale = "en" | "hi" | "or";

type Option = { value: Locale; abbr: string; full: string };

const OPTIONS: Option[] = [
  { value: "en", abbr: "EN", full: "English" },
  { value: "hi", abbr: "हिं", full: "हिंदी" },
  { value: "or", abbr: "ଓଡ଼ିଆ", full: "ଓଡ଼ିଆ" },
];

type Props = {
  value: Locale;
  onChange: (value: Locale) => void;
  name?: string;
};

export function LangPicker({ value, onChange, name = "lang" }: Props) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <label
            key={opt.value}
            className={
              "flex flex-1 cursor-pointer flex-col items-center rounded-md border-[1.5px] px-1 py-2 text-[12px] transition-colors " +
              (selected
                ? "border-link-hover bg-[#E6F1FA] font-semibold text-link-hover"
                : "border-border bg-white font-normal text-muted hover:border-link-hover")
            }
          >
            <input
              type="radio"
              name={name}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span>{opt.abbr}</span>
            <span className="mt-0.5 text-[10px] opacity-70">{opt.full}</span>
          </label>
        );
      })}
    </div>
  );
}
