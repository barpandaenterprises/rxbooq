"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  broadcastWaAction,
  getWaTemplatesAction,
  previewBroadcastAudienceAction,
  type BroadcastAudienceInput,
  type WaTemplateRow,
} from "@/app/(clinic-app)/[clinicSlug]/admin/messages/actions";

type Props = {
  trigger?:      React.ReactNode;
  open?:         boolean;
  onOpenChange?: (open: boolean) => void;
};

const TAG_PRESETS = ["VIP", "Root canal", "Implants", "Braces", "Pediatric", "New"];

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "हिंदी",
  or: "ଓଡ଼ିଆ",
};

// Variables we can fill automatically per recipient.
const AUTO_VARS = new Set(["patient_name", "clinic_name"]);

type Step = "compose" | "review" | "result";

type ResultSummary = {
  sent:     number;
  skipped:  number;
  failed:   number;
  failures: string[];
};

export function BroadcastDialog({ trigger, open: controlledOpen, onOpenChange }: Props) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  // Step state
  const [step, setStep] = useState<Step>("compose");

  // Template catalog
  const [templates, setTemplates] = useState<WaTemplateRow[]>([]);
  const [loadingTpls, setLoadingTpls] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Form state
  const [templateName, setTemplateName] = useState<string>("");
  const [language, setLanguage]         = useState<"en" | "hi" | "or">("en");
  const [optedInOnly, setOptedInOnly]   = useState(true);
  const [audienceLang, setAudienceLang] = useState<"all" | "en" | "hi" | "or">("all");
  const [tags, setTags]                 = useState<Set<string>>(new Set());
  const [lastVisitDays, setLastVisitDays] = useState(0);
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});

  // Preview + send state
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, startSend] = useTransition();
  const [result, setResult] = useState<ResultSummary | null>(null);

  // Load template catalog when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingTpls(true);
    setTemplatesError(null);
    getWaTemplatesAction()
      .then((r) => {
        if (r.ok) {
          // Only approved templates can actually send.
          const approved = r.templates.filter((t) => t.status === "approved");
          setTemplates(approved);
        } else {
          setTemplatesError(r.error);
        }
      })
      .finally(() => setLoadingTpls(false));
  }, [open]);

  // Reset everything on close
  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => {
      setStep("compose");
      setTemplateName("");
      setLanguage("en");
      setOptedInOnly(true);
      setAudienceLang("all");
      setTags(new Set());
      setLastVisitDays(0);
      setDefaultValues({});
      setPreviewCount(null);
      setSendError(null);
      setResult(null);
    }, 200);
    return () => window.clearTimeout(t);
  }, [open]);

  // Derived: the picked template + its non-auto variables
  const tplsByName = useMemo(() => {
    const m = new Map<string, WaTemplateRow[]>();
    for (const t of templates) {
      const list = m.get(t.name) ?? [];
      list.push(t);
      m.set(t.name, list);
    }
    return m;
  }, [templates]);
  const uniqueTemplateNames = useMemo(() => Array.from(tplsByName.keys()).sort(), [tplsByName]);

  const selectedTemplate = useMemo(() => {
    if (!templateName) return null;
    const variants = tplsByName.get(templateName) ?? [];
    return variants.find((t) => t.language === language) ?? variants[0] ?? null;
  }, [templateName, language, tplsByName]);

  const manualVars = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.variables.filter((v) => !AUTO_VARS.has(v));
  }, [selectedTemplate]);

  const audience: BroadcastAudienceInput = {
    optedInOnly,
    language:            audienceLang,
    tags:                Array.from(tags),
    lastVisitWithinDays: lastVisitDays,
  };

  const canPreview = Boolean(selectedTemplate);
  const allManualFilled = manualVars.every((v) => (defaultValues[v] ?? "").trim().length > 0);
  const canSend = canPreview && (previewCount ?? 0) > 0 && allManualFilled;

  const onPreview = () => {
    if (!canPreview) return;
    setPreviewLoading(true);
    previewBroadcastAudienceAction(audience)
      .then((r) => {
        if (r.ok) {
          setPreviewCount(r.count);
          setStep("review");
        } else {
          setSendError(r.error);
        }
      })
      .finally(() => setPreviewLoading(false));
  };

  const onSend = () => {
    if (!canSend || isSending || !selectedTemplate) return;
    setSendError(null);
    startSend(async () => {
      const r = await broadcastWaAction({
        templateName,
        language,
        audience,
        defaultValues,
      });
      if (!r.ok) {
        setSendError(r.error);
        return;
      }
      setResult({ sent: r.sent, skipped: r.skipped, failed: r.failed, failures: r.failures });
      setStep("result");
      router.refresh();
    });
  };

  const toggleTag = (t: string) => {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-heading">
                Broadcast WhatsApp
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                Send a template message to many patients at once. Sends respect opt-out and language preferences.
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
            >
              <i className="fas fa-times text-[12px]" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6">
            {/* Step 1 — compose */}
            {step === "compose" && (
              <>
                {loadingTpls && (
                  <div className="grid place-items-center py-10 text-[13px] text-muted">
                    <i className="fas fa-spinner fa-spin text-[18px]" />
                    <span className="mt-2">Loading templates…</span>
                  </div>
                )}
                {templatesError && (
                  <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-[13px] text-danger">
                    {templatesError}
                  </div>
                )}
                {!loadingTpls && templates.length === 0 && !templatesError && (
                  <div className="rounded-md border border-dashed border-border bg-surface-muted px-4 py-8 text-center text-[13px] text-muted">
                    No approved templates available. Contact Rxbooq support to register a broadcast template.
                  </div>
                )}

                {!loadingTpls && templates.length > 0 && (
                  <>
                    <Section label="Template" required>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                        <select
                          value={templateName}
                          onChange={(e) => {
                            setTemplateName(e.target.value);
                            setDefaultValues({});
                            setPreviewCount(null);
                          }}
                          className={inputCls(false) + " cursor-pointer"}
                        >
                          <option value="">— Pick a template —</option>
                          {uniqueTemplateNames.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "or")}
                          className={inputCls(false) + " cursor-pointer"}
                          disabled={!templateName}
                        >
                          {(["en", "hi", "or"] as const).map((l) => {
                            const available = templateName ? Boolean(tplsByName.get(templateName)?.some((t) => t.language === l)) : false;
                            return (
                              <option key={l} value={l} disabled={!available}>
                                {LANG_LABEL[l]}{!available && " · not approved"}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      {selectedTemplate && selectedTemplate.variables.length > 0 && (
                        <p className="mt-2 text-[12px] text-muted">
                          Variables in this template:{" "}
                          {selectedTemplate.variables.map((v) => (
                            <code key={v} className="ml-1 rounded-sm bg-[#E6F1FA] px-1.5 py-0.5 font-mono text-[11px] text-link-hover">
                              {`{${v}}`}
                            </code>
                          ))}
                        </p>
                      )}
                    </Section>

                    {manualVars.length > 0 && (
                      <Section label="Fill in variables">
                        <div className="space-y-2">
                          {manualVars.map((v) => (
                            <div key={v}>
                              <label className="mb-1 block text-[12px] font-medium text-heading">
                                <code className="rounded-sm bg-[#F4F5F7] px-1.5 py-0.5 font-mono text-[11px]">{`{${v}}`}</code>
                              </label>
                              <input
                                type="text"
                                value={defaultValues[v] ?? ""}
                                onChange={(e) => setDefaultValues((p) => ({ ...p, [v]: e.target.value }))}
                                placeholder={`Value for {${v}}`}
                                className={inputCls(false)}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#9aa9b8]">
                          <code>{"{patient_name}"}</code> and <code>{"{clinic_name}"}</code> are filled automatically per recipient.
                        </p>
                      </Section>
                    )}

                    <Section label="Audience">
                      <label className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-white p-3 text-[13px] text-heading">
                        <input
                          type="checkbox"
                          checked={optedInOnly}
                          onChange={(e) => { setOptedInOnly(e.target.checked); setPreviewCount(null); }}
                          className="h-4 w-4 cursor-pointer accent-[#25D366]"
                        />
                        Only patients who have opted in to WhatsApp
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[12px] font-medium text-heading">Preferred language</label>
                          <select
                            value={audienceLang}
                            onChange={(e) => { setAudienceLang(e.target.value as "all" | "en" | "hi" | "or"); setPreviewCount(null); }}
                            className={inputCls(false) + " cursor-pointer"}
                          >
                            <option value="all">All languages</option>
                            <option value="en">English only</option>
                            <option value="hi">Hindi only</option>
                            <option value="or">Odia only</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[12px] font-medium text-heading">Visited in last…</label>
                          <select
                            value={String(lastVisitDays)}
                            onChange={(e) => { setLastVisitDays(Number(e.target.value)); setPreviewCount(null); }}
                            className={inputCls(false) + " cursor-pointer"}
                          >
                            <option value="0">Any time</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="180">6 months</option>
                            <option value="365">1 year</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="mb-1.5 block text-[12px] font-medium text-heading">Tags (any match)</label>
                        <div className="flex flex-wrap gap-1.5">
                          {TAG_PRESETS.map((t) => {
                            const active = tags.has(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => { toggleTag(t); setPreviewCount(null); }}
                                className={
                                  "rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors " +
                                  (active
                                    ? "bg-brand text-white"
                                    : "border border-border bg-white text-heading hover:border-link-hover")
                                }
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-1.5 text-[11px] text-[#9aa9b8]">No tag selected = everyone.</p>
                      </div>
                    </Section>
                  </>
                )}
              </>
            )}

            {/* Step 2 — review */}
            {step === "review" && (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-surface-muted p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                    About to send
                  </div>
                  <div className="mt-2 text-[28px] font-bold text-heading">
                    {previewCount ?? 0} <span className="text-[16px] font-normal text-muted">recipient{previewCount === 1 ? "" : "s"}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted">
                    Template <code className="rounded-sm bg-white px-1.5 py-0.5 font-mono text-[11px]">{templateName}</code>{" "}
                    in {LANG_LABEL[language]}
                  </p>
                </div>

                <div className="rounded-md border border-border bg-white p-4 text-[13px] text-muted">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Filters applied</div>
                  <ul className="space-y-1">
                    <li>· {optedInOnly ? "Opted-in only" : "Including opted-out (will be skipped at send)"}</li>
                    <li>· Language: {audienceLang === "all" ? "all" : LANG_LABEL[audienceLang]}</li>
                    <li>· Tags: {tags.size === 0 ? "any" : Array.from(tags).join(", ")}</li>
                    <li>· Last visit window: {lastVisitDays === 0 ? "any time" : `${lastVisitDays} days`}</li>
                  </ul>
                </div>

                {sendError && (
                  <div role="alert" className="rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-[13px] text-danger">
                    <i className="fas fa-exclamation-triangle mr-1.5" /> {sendError}
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — result */}
            {step === "result" && result && (
              <div className="space-y-3">
                <div className="rounded-md border border-[#3a8b5e]/30 bg-[#E6F4EC] px-4 py-3 text-[13px] text-[#1f5e3a]">
                  <i className="fas fa-check-circle mr-1.5" />
                  Broadcast complete.
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border border-border bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Sent</div>
                    <div className="mt-1 text-[24px] font-bold text-[#3a8b5e]">{result.sent}</div>
                  </div>
                  <div className="rounded-md border border-border bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Skipped</div>
                    <div className="mt-1 text-[24px] font-bold text-[#7a5c2b]">{result.skipped}</div>
                  </div>
                  <div className="rounded-md border border-border bg-white p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Failed</div>
                    <div className="mt-1 text-[24px] font-bold text-cta">{result.failed}</div>
                  </div>
                </div>
                {result.failures.length > 0 && (
                  <div className="rounded-md border border-border bg-surface-muted p-3 text-[12px] text-muted">
                    <div className="mb-1 font-semibold text-heading">First few failures</div>
                    <ul className="space-y-0.5">
                      {result.failures.map((f, i) => <li key={i}>· {f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-2.5 border-t border-border bg-surface-muted px-5 py-3.5">
            {step === "compose" && (
              <>
                <Dialog.Close className="cursor-pointer rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  disabled={!canPreview || previewLoading}
                  onClick={onPreview}
                  className={
                    "ml-auto inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-5 py-2 text-[14px] font-semibold text-cta-fg hover:bg-[#d92843] " +
                    (!canPreview || previewLoading ? "cursor-not-allowed opacity-50 hover:bg-cta" : "")
                  }
                >
                  {previewLoading ? (
                    <><i className="fas fa-spinner fa-spin text-[12px]" /> Counting…</>
                  ) : (
                    <>Continue <i className="fas fa-arrow-right text-[11px]" /></>
                  )}
                </button>
              </>
            )}
            {step === "review" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("compose")}
                  disabled={isSending}
                  className="cursor-pointer rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="fas fa-arrow-left mr-1.5 text-[10px]" /> Back
                </button>
                <button
                  type="button"
                  onClick={onSend}
                  disabled={!canSend || isSending}
                  className={
                    "ml-auto inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-5 py-2 text-[14px] font-semibold text-cta-fg hover:bg-[#d92843] " +
                    (!canSend || isSending ? "cursor-not-allowed opacity-50 hover:bg-cta" : "")
                  }
                >
                  {isSending ? (
                    <><i className="fas fa-spinner fa-spin text-[12px]" /> Sending…</>
                  ) : (
                    <><i className="fas fa-paper-plane text-[12px]" /> Send to {previewCount ?? 0}</>
                  )}
                </button>
              </>
            )}
            {step === "result" && (
              <Dialog.Close className="ml-auto cursor-pointer rounded-md bg-cta px-5 py-2 text-[14px] font-semibold text-cta-fg hover:bg-[#d92843]">
                Done
              </Dialog.Close>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// =============================================================================
// Small bits
// =============================================================================

function inputCls(hasError: boolean): string {
  const base =
    "w-full rounded-md border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover";
  return hasError ? `${base} border-danger focus:border-danger` : `${base} border-border`;
}

function Section({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
        {label}
        {required && <span className="ml-1 text-cta">*</span>}
      </div>
      <div>{children}</div>
    </div>
  );
}
