type Props = {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

export function ConsentCheckbox({ id, checked, onChange, children, className }: Props) {
  return (
    <label
      htmlFor={id}
      className={
        "flex cursor-pointer items-start gap-2.5 " + (className ?? "")
      }
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={
          "mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center rounded-sm text-[10px] text-white transition-colors " +
          (checked ? "bg-cta" : "border-[1.5px] border-[#c7c9cc] bg-white")
        }
      >
        {checked && <i className="fas fa-check" />}
      </span>
      <span className="text-[13px] leading-5 text-muted">{children}</span>
    </label>
  );
}
