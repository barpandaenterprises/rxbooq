import type { MedicalHistory } from "@/lib/patient-history-data";

const SEVERITY_BORDER: Record<"mild" | "moderate" | "severe", string> = {
  mild:     "#F4D9A8",
  moderate: "#EE9A1A",
  severe:   "#EE344E",
};

type Props = {
  history: MedicalHistory | null;
};

/**
 * Coral banner that surfaces the patient's safety-critical clinical flags —
 * allergies, chronic conditions, blood thinners — at the top of the chart.
 * Hidden entirely when nothing is on file (no banner ≠ no allergies; absence
 * of a record is shown elsewhere as "Medical history not filed").
 */
export function MedicalAlertsBanner({ history }: Props) {
  if (!history) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-[#cdd9e4] bg-surface-muted px-4 py-3">
        <i className="fas fa-notes-medical text-[14px] text-[#9aa9b8]" />
        <span className="text-[13px] text-muted">
          Medical history not filed yet.
        </span>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1 text-[12px] font-medium text-link-hover hover:border-link-hover"
        >
          <i className="fas fa-plus text-[10px]" />
          Add
        </button>
      </div>
    );
  }

  const hasAllergies   = history.allergies.length > 0;
  const hasConditions  = history.conditions.length > 0;
  const hasMedications = history.currentMedications.length > 0;
  const flagged = hasAllergies || hasConditions || history.bloodThinners;

  if (!flagged && !hasMedications) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-[#cdebd5] bg-[#E6F4EC] px-4 py-2.5">
        <i className="fas fa-check-circle text-[14px] text-[#3a8b5e]" />
        <span className="text-[13px] text-[#1f5e3a]">
          No allergies or chronic conditions on file.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-md border-[1.5px] border-cta bg-[#FFFAFB] p-4">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-cta">
        <i className="fas fa-exclamation-triangle text-[14px]" />
        Medical alerts
        <span className="ml-auto text-[11px] font-normal text-[#9aa9b8]">
          Review before prescribing
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {history.bloodThinners && (
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-cta bg-white px-2.5 py-1 text-[12px] font-semibold text-cta">
            <i className="fas fa-tint text-[10px]" />
            On blood thinners
          </span>
        )}
        {history.allergies.map((a) => (
          <span
            key={a.name}
            title={a.notes ?? `${a.severity} severity`}
            className="inline-flex items-center gap-1.5 rounded-pill bg-white px-2.5 py-1 text-[12px] font-semibold text-cta"
            style={{
              border: `1px solid ${SEVERITY_BORDER[a.severity]}`,
            }}
          >
            <i className="fas fa-allergies text-[10px]" />
            Allergic · {a.name}
            <span className="text-[10px] uppercase tracking-[0.04em] text-[#9aa9b8]">
              {a.severity}
            </span>
          </span>
        ))}
        {history.conditions.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 rounded-pill border border-[#F4D9A8] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#7a5c2b]"
          >
            <i className="fas fa-heartbeat text-[10px]" />
            {c}
          </span>
        ))}
      </div>

      {hasMedications && (
        <div className="mt-3 border-t border-[#FFE7EC] pt-2.5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
            Current medications
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-heading">
            {history.currentMedications.map((m, i) => (
              <span key={m.name + i}>
                <strong className="font-semibold">{m.name}</strong>{" "}
                <span className="text-muted">· {m.dosage}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {history.dentalHistoryNotes && (
        <div className="mt-3 border-t border-[#FFE7EC] pt-2.5 text-[12px] leading-[18px] text-muted">
          <i className="fas fa-tooth mr-1.5 text-[10px] text-[#9aa9b8]" />
          {history.dentalHistoryNotes}
        </div>
      )}
    </div>
  );
}
