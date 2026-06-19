"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormField, TEXT_INPUT_CLASS } from "@/components/molecules/FormField";
import { updateClinicAction } from "@/app/(super-admin)/superadmin/clinics/actions";

export type EditableClinic = {
  id:              string;
  name:            string;
  slug:            string;
  status:          string;
  whatsapp_number: string | null;
  custom_domain:   string | null;
};

/** Strip a stored E.164 WhatsApp number to its local 10 digits for the input. */
function localTenDigits(v: string | null): string {
  if (!v) return "";
  const digits = v.replace(/\D/g, "");
  const local = digits.length > 10 && digits.startsWith("91") ? digits.slice(2) : digits;
  return local.slice(-10);
}

export function EditClinicForm({ clinic }: { clinic: EditableClinic }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName]       = useState(clinic.name);
  const [slug, setSlug]       = useState(clinic.slug);
  const [status, setStatus]   = useState(clinic.status);
  const [waDigits, setWaDigits] = useState(() => localTenDigits(clinic.whatsapp_number));
  const [domain, setDomain]   = useState(clinic.custom_domain ?? "");

  const clearErr = (key: string) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Clinic name must be at least 2 characters.";
    if (slug.trim().length < 2) e.slug = "URL slug must be at least 2 characters.";
    else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug.trim())) e.slug = "Use lowercase letters, digits, and hyphens.";
    if (waDigits && waDigits.length !== 10) e.whatsapp_number = "Enter the 10-digit number, or leave it blank.";
    if (domain.trim() && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim())) e.custom_domain = "Enter a valid domain, e.g. clinic.example.com";
    return e;
  };

  const submit = () => {
    setError(null);
    setSaved(false);
    const v = validate();
    setFieldErrors(v);
    if (Object.keys(v).length > 0) return;

    startTransition(async () => {
      const res = await updateClinicAction(clinic.id, {
        name:            name.trim(),
        slug:            slug.trim(),
        status:          status as "active" | "onboarding" | "suspended",
        whatsapp_number: waDigits ? `+91${waDigits}` : "",
        custom_domain:   domain.trim(),
      });
      if (!res.ok) {
        if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) setFieldErrors(res.fieldErrors);
        else setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-8 md:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/superadmin/clinics" className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted no-underline hover:bg-surface-muted" title="Back to clinics">
          <i className="fas fa-arrow-left text-[12px]" />
        </Link>
        <div>
          <h1 className="text-[22px] font-semibold text-heading">Edit clinic</h1>
          <p className="mt-0.5 text-[13px] text-muted">{clinic.name}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-[#f3d3d8] bg-[#fff5f6] px-3 py-2 text-[13px] text-heading">{error}</div>
      )}
      {saved && (
        <div className="mb-4 rounded-md border border-[#cfe8d8] bg-[#f0f9f3] px-3 py-2 text-[13px] text-[#1f7a3a]">
          <i className="fas fa-check-circle mr-1.5 text-[11px]" /> Changes saved.
        </div>
      )}

      <div className="rounded-lg border border-border bg-white p-6">
        <div className="grid gap-x-4 md:grid-cols-2">
          <FormField label="Clinic name" required error={fieldErrors.name}>
            <input className={TEXT_INPUT_CLASS} value={name} onChange={(e) => { setName(e.target.value); clearErr("name"); }} />
          </FormField>
          <FormField label="URL slug" required error={fieldErrors.slug} hint={`rxbooq.com/${slug || "your-slug"}`}>
            <input className={TEXT_INPUT_CLASS} value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); clearErr("slug"); }} />
          </FormField>
          <FormField label="Status" required error={fieldErrors.status}>
            <select className={TEXT_INPUT_CLASS} value={status} onChange={(e) => { setStatus(e.target.value); clearErr("status"); }}>
              <option value="active">Active</option>
              <option value="onboarding">Onboarding</option>
              <option value="suspended">Suspended</option>
            </select>
          </FormField>
          <FormField label="WhatsApp number" error={fieldErrors.whatsapp_number} hint={fieldErrors.whatsapp_number ? undefined : "Optional. Used for booking notifications."}>
            <div className="flex gap-2">
              <span className="grid w-[60px] shrink-0 place-items-center rounded-md border-[1.5px] border-border bg-surface-muted text-[15px] text-muted">+91</span>
              <input className={TEXT_INPUT_CLASS} type="tel" inputMode="numeric" maxLength={10} value={waDigits} onChange={(e) => { setWaDigits(e.target.value.replace(/\D/g, "").slice(0, 10)); clearErr("whatsapp_number"); }} placeholder="9999900001" />
            </div>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Custom domain" error={fieldErrors.custom_domain} hint={fieldErrors.custom_domain ? undefined : "Optional. e.g. book.yourclinic.in"}>
              <input className={TEXT_INPUT_CLASS} value={domain} onChange={(e) => { setDomain(e.target.value.trim()); clearErr("custom_domain"); }} placeholder="book.yourclinic.in" />
            </FormField>
          </div>
        </div>

        <p className="mt-2 text-[12px] text-muted">
          Plan &amp; billing live on the Subscriptions page; verification on the Verifications page.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link href="/superadmin/clinics" className="text-[13px] text-muted no-underline hover:text-heading">Cancel</Link>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-6 py-3 text-[15px] font-medium text-cta-fg transition-colors hover:bg-[#d92843] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
          {!pending && <i className="fas fa-check text-[11px]" />}
        </button>
      </div>
    </div>
  );
}
