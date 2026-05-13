"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { BOOKING_DOCTORS, type BookingDoctor } from "@/lib/booking-data";
import { waLink } from "@/lib/contact";
import {
  type Prescription,
  type PrescriptionItem,
  type PrescriptionSource,
} from "@/lib/patient-history-data";
import { recognisePrescription } from "@/lib/rx-ocr";
import { RX_TEMPLATES, getTemplate } from "@/lib/rx-templates";
import { createPrescriptionAction } from "@/app/(clinic-app)/admin/prescriptions/actions";

// ---------- Form schema ----------------------------------------------------

const rxItemSchema = z.object({
  medication:   z.string(),
  dosage:       z.string(),
  frequency:    z.string(),
  duration:     z.string(),
  instructions: z.string(),
});

const rxFormSchema = z.object({
  items:      z.array(rxItemSchema).min(1),
  notes:      z.string(),
  doctorId:   z.string().min(1, "Pick a doctor"),
  source:     z.enum(["handwritten", "template", "manual"]),
  templateId: z.string(),
});

type RxFormValues = z.infer<typeof rxFormSchema>;

const EMPTY_FORM_ITEM = {
  medication:   "",
  dosage:       "",
  frequency:    "",
  duration:     "",
  instructions: "",
};

type Step = "path" | "camera" | "capture" | "template" | "review" | "saved";

type Props = {
  trigger: React.ReactNode;
  patientId: string;
  patientName: string;
  /** Default doctor for the Rx (e.g. the logged-in user). */
  defaultDoctorId?: string;
  onSaved: (rx: Prescription) => void;
};

const EMPTY_ITEM: PrescriptionItem = {
  medication: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function RxEntryDialog({
  trigger,
  patientId,
  patientName,
  defaultDoctorId = "mm",
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("path");

  // Photo path state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState<number | undefined>(undefined);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Shared form state — RHF
  const form = useForm<RxFormValues>({
    resolver: zodResolver(rxFormSchema),
    defaultValues: {
      items:      [{ ...EMPTY_FORM_ITEM }],
      notes:      "",
      doctorId:   defaultDoctorId,
      source:     "manual",
      templateId: "",
    },
    mode: "onSubmit",
  });
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset: resetForm,
  } = form;
  const { fields, append, remove, replace, update } = useFieldArray({
    control: form.control,
    name:    "items",
  });

  const items      = watch("items");
  const notes      = watch("notes");
  const doctorId   = watch("doctorId");
  const source     = watch("source");
  const templateId = watch("templateId");

  // Result of save
  const [savedRx, setSavedRx] = useState<Prescription | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const doctor: BookingDoctor =
    BOOKING_DOCTORS.find((d) => d.id === doctorId) ?? BOOKING_DOCTORS[0]!;

  const canSave = items.some((it) => it.medication.trim().length > 0);

  const reset = () => {
    setStep("path");
    resetForm({
      items:      [{ ...EMPTY_FORM_ITEM }],
      notes:      "",
      doctorId:   defaultDoctorId,
      source:     "manual",
      templateId: "",
    });
    setOcrWarnings([]);
    setOcrConfidence(undefined);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(null);
    setPhotoUrl(null);
    setOcrLoading(false);
    setSavedRx(null);
    setSubmitError(null);
  };

  // ---------- Step transitions ----------

  const pickPhoto = (kind: "camera" | "gallery") => {
    setValue("source", "handwritten");
    if (kind === "camera") {
      // Live camera step — uses navigator.mediaDevices.getUserMedia so the
      // user actually sees a video preview inside the dialog on desktop too.
      // The hidden file input with capture="environment" is still used as
      // a fallback when getUserMedia isn't available (older mobile browsers).
      setStep("camera");
    } else {
      setStep("capture");
      window.setTimeout(() => galleryInputRef.current?.click(), 0);
    }
  };

  // Called by the CameraCaptureScreen on shutter
  const handleCameraCapture = (file: File) => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
    setStep("capture");
  };

  // Fallback when getUserMedia denies / isn't supported — push them to the file input
  const handleCameraFallback = () => {
    setStep("capture");
    window.setTimeout(() => galleryInputRef.current?.click(), 0);
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so the same file can be picked again
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const retakePhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(null);
    setPhotoUrl(null);
  };

  const toFormItem = (it: PrescriptionItem) => ({
    medication:   it.medication,
    dosage:       it.dosage,
    frequency:    it.frequency,
    duration:     it.duration,
    instructions: it.instructions ?? "",
  });

  const runOcr = async () => {
    if (!photoFile) return;
    setOcrLoading(true);
    try {
      const draft = await recognisePrescription(photoFile);
      replace(draft.items.length > 0 ? draft.items.map(toFormItem) : [{ ...EMPTY_FORM_ITEM }]);
      setValue("notes", draft.notes ?? "");
      setOcrWarnings(draft.warnings ?? []);
      setOcrConfidence(draft.confidence);
      setStep("review");
    } finally {
      setOcrLoading(false);
    }
  };

  const pickTemplate = (id: string) => {
    const tpl = getTemplate(id);
    if (!tpl) return;
    setValue("source", "template");
    setValue("templateId", id);
    replace(tpl.items.length > 0 ? tpl.items.map(toFormItem) : [{ ...EMPTY_FORM_ITEM }]);
    setValue("notes", tpl.notes ?? "");
    setStep("review");
  };

  const pickManual = () => {
    setValue("source", "manual");
    replace([{ ...EMPTY_FORM_ITEM }]);
    setValue("notes", "");
    setStep("review");
  };

  // ---------- Item editing ----------

  const updateItem = (idx: number, field: keyof PrescriptionItem, value: string) => {
    const current = items[idx];
    if (!current) return;
    update(idx, { ...current, [field]: value });
  };

  const addItem = () => append({ ...EMPTY_FORM_ITEM });

  const removeItem = (idx: number) => {
    if (items.length > 1) remove(idx);
  };

  // ---------- Save ----------

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
      reader.readAsDataURL(file);
    });

  const onSubmit = (values: RxFormValues) => {
    if (isPending) return;
    // canSave is a stricter rule than the schema (requires at least one
    // medication with a non-empty name). Block here too.
    const hasMedication = values.items.some((it) => it.medication.trim().length > 0);
    if (!hasMedication) {
      setSubmitError("Add at least one medication.");
      return;
    }
    setSubmitError(null);

    const trimmed = values.items
      .map((it) => ({
        medication:   it.medication.trim(),
        dosage:       it.dosage.trim(),
        frequency:    it.frequency.trim(),
        duration:     it.duration.trim(),
        instructions: it.instructions.trim() || undefined,
      }))
      .filter((it) => it.medication.length > 0);

    startTransition(async () => {
      let photoBase64:   string | undefined;
      let photoMime:     string | undefined;
      let photoFileName: string | undefined;
      if (values.source === "handwritten" && photoFile) {
        try {
          photoBase64   = await fileToBase64(photoFile);
          photoMime     = photoFile.type || "image/jpeg";
          photoFileName = photoFile.name || `rx-${Date.now()}.jpg`;
        } catch {
          setSubmitError("Couldn't read the photo file. Try again or skip the photo.");
          return;
        }
      }

      const result = await createPrescriptionAction({
        patientId,
        doctorId:     values.doctorId,
        items:        trimmed,
        notes:        values.notes.trim() || undefined,
        source:       values.source,
        templateId:   values.templateId || undefined,
        ocrConfidence: values.source === "handwritten" ? ocrConfidence : undefined,
        photoBase64,
        photoMime,
        photoFileName,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      const localRx: Prescription = {
        id:             result.mock ? newId("Rx") : result.prescriptionId,
        appointmentId:  null,
        patientId,
        doctorId:       values.doctorId,
        doctorName:     doctor.name,
        items:          trimmed,
        notes:          values.notes.trim() || undefined,
        createdAt:      new Date().toISOString(),
        source:         values.source,
        templateId:     values.templateId || undefined,
        ocrConfidence:  values.source === "handwritten" ? ocrConfidence : undefined,
        sourcePhotoId:  values.source === "handwritten" && photoFile ? newId("F") : undefined,
      };
      setSavedRx(localRx);
      onSaved(localRx);
      setStep("saved");

      // Live mode: revalidate the chart so the new Rx appears on next nav.
      if (!result.mock) router.refresh();
    });
  };

  const sendWa = () => {
    if (!savedRx) return;
    const body =
      `Hi ${patientName}, here's your prescription from ${doctor.name}:\n\n` +
      savedRx.items
        .map((it, i) => `${i + 1}. ${it.medication} — ${it.dosage}, ${it.frequency}, ${it.duration}${it.instructions ? ` (${it.instructions})` : ""}`)
        .join("\n") +
      (savedRx.notes ? `\n\nNotes: ${savedRx.notes}` : "");
    window.open(waLink(body), "_blank", "noreferrer");
  };

  const printRx = () => {
    window.print();
  };

  // ---------- Render ----------

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) window.setTimeout(reset, 200);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(16,24,40,0.55)] data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-[760px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.30)] focus:outline-none">
          {/* Hidden file inputs.
              Camera path stays image-only (the device camera can't shoot PDFs).
              Gallery path also accepts PDFs — common when the clinic scans
              paper Rx with a flatbed or scans-via-WhatsApp document mode. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChosen}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChosen}
          />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-5 py-4">
            <div>
              <Dialog.Title className="text-[18px] font-semibold text-heading">
                {step === "saved" ? "Prescription saved" : "Add prescription"}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[12px] text-muted">
                For <strong className="font-semibold text-heading">{patientName}</strong> · {doctor.name}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-pill bg-surface-muted text-muted hover:bg-border"
            >
              <i className="fas fa-times text-[12px]" />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
            {step === "path"     && <PathPicker onPhoto={pickPhoto} onTemplate={() => setStep("template")} onManual={pickManual} />}
            {step === "camera"   && (
              <CameraCaptureScreen
                onCapture={handleCameraCapture}
                onCancel={() => setStep("path")}
                onFallbackToUpload={handleCameraFallback}
              />
            )}
            {step === "capture"  && (
              <CaptureScreen
                photoUrl={photoUrl}
                fileType={photoFile?.type ?? null}
                fileName={photoFile?.name ?? null}
                ocrLoading={ocrLoading}
                onRetake={retakePhoto}
                onPickCamera={() => setStep("camera")}
                onPickGallery={() => galleryInputRef.current?.click()}
                onUsePhoto={runOcr}
                onBack={() => { retakePhoto(); setStep("path"); }}
                onSkipOcr={() => {
                  // Use the photo but skip OCR — go to manual review with empty form + photo attached.
                  replace([{ ...EMPTY_FORM_ITEM }]);
                  setValue("notes", "");
                  setStep("review");
                }}
              />
            )}
            {step === "template" && <TemplatePicker onPick={pickTemplate} onBack={() => setStep("path")} />}
            {step === "review"   && (
              <ReviewForm
                items={items}
                notes={notes}
                doctorId={doctorId}
                source={source}
                photoUrl={photoUrl}
                fileType={photoFile?.type ?? null}
                fileName={photoFile?.name ?? null}
                ocrConfidence={ocrConfidence}
                ocrWarnings={ocrWarnings}
                onUpdateItem={updateItem}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onChangeNotes={(v) => setValue("notes", v)}
                onChangeDoctor={(v) => setValue("doctorId", v)}
              />
            )}
            {step === "saved" && savedRx && (
              <SavedSuccess rx={savedRx} patientName={patientName} onSendWa={sendWa} onPrint={printRx} />
            )}
          </div>

          {/* Footer */}
          {step !== "saved" && (
            <div className="flex items-center gap-2.5 border-t border-border bg-surface-muted px-5 py-3.5">
              {step !== "path" && (
                <button
                  type="button"
                  onClick={() => {
                    if (step === "review") {
                      // Go back to whichever entry path was used
                      if (source === "handwritten") setStep("capture");
                      else if (source === "template") setStep("template");
                      else setStep("path");
                    } else {
                      setStep("path");
                    }
                  }}
                  className="cursor-pointer rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-muted hover:text-heading"
                >
                  <i className="fas fa-arrow-left mr-1.5 text-[10px]" /> Back
                </button>
              )}
              <Dialog.Close className="cursor-pointer rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-muted">
                Cancel
              </Dialog.Close>
              {step === "review" && (
                <div className="ml-auto flex items-center gap-3">
                  {submitError && (
                    <span role="alert" className="text-[12px] text-danger">
                      <i className="fas fa-exclamation-triangle mr-1" />
                      {submitError}
                    </span>
                  )}
                  {!canSave && !submitError && (
                    <span className="hidden text-[12px] text-[#9aa9b8] sm:inline">
                      <i className="fas fa-info-circle mr-1" />
                      Add at least one medication to save
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit(onSubmit)}
                    disabled={!canSave || isPending}
                    className={
                      "inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-5 py-2 text-[14px] font-semibold text-cta-fg transition-colors hover:bg-[#d92843] " +
                      (!canSave || isPending ? "cursor-not-allowed opacity-50 hover:bg-cta" : "")
                    }
                  >
                    {isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin text-[12px]" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save text-[12px]" />
                        Save prescription
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "saved" && (
            <div className="flex items-center gap-2.5 border-t border-border bg-surface-muted px-5 py-3.5">
              <button
                type="button"
                onClick={() => { reset(); }}
                className="cursor-pointer rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
              >
                <i className="fas fa-plus mr-1.5 text-[10px]" /> Add another
              </button>
              <Dialog.Close className="ml-auto cursor-pointer rounded-md bg-cta px-5 py-2 text-[14px] font-semibold text-cta-fg hover:bg-[#d92843]">
                Done
              </Dialog.Close>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------- Step components ----------

function PathPicker({
  onPhoto,
  onTemplate,
  onManual,
}: {
  onPhoto: (kind: "camera" | "gallery") => void;
  onTemplate: () => void;
  onManual: () => void;
}) {
  return (
    <div>
      <p className="mb-4 text-[14px] text-muted">
        Pick the easiest way to add this prescription. All three paths converge on the
        same review screen — you can always edit before saving.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Photo — primary */}
        <div className="rounded-[12px] border-[1.5px] border-cta bg-[#FFFAFB] p-4">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-pill bg-cta text-[20px] text-white">
            <i className="fas fa-camera" />
          </div>
          <div className="text-[14px] font-semibold text-heading">Snap paper Rx</div>
          <p className="mt-1 text-[12px] leading-[18px] text-muted">
            The doctor wrote it on paper. Take a photo and we&rsquo;ll read it.
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onPhoto("camera")}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-cta px-3 py-2 text-[13px] font-semibold text-cta-fg hover:bg-[#d92843]"
            >
              <i className="fas fa-camera text-[11px]" /> Use camera
            </button>
            <button
              type="button"
              onClick={() => onPhoto("gallery")}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
            >
              <i className="fas fa-image text-[11px]" /> Upload photo
            </button>
          </div>
        </div>

        {/* Template */}
        <button
          type="button"
          onClick={onTemplate}
          className="cursor-pointer rounded-[12px] border border-border bg-white p-4 text-left transition-colors hover:border-link-hover hover:shadow-sm"
        >
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-pill bg-[#E6F1FA] text-[20px] text-link-hover">
            <i className="fas fa-clipboard-list" />
          </div>
          <div className="text-[14px] font-semibold text-heading">Use a template</div>
          <p className="mt-1 text-[12px] leading-[18px] text-muted">
            Pick from common dental cases — RCT post-op, extraction, whitening aftercare.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-link-hover">
            {RX_TEMPLATES.length} templates ready <i className="fas fa-arrow-right text-[10px]" />
          </div>
        </button>

        {/* Manual */}
        <button
          type="button"
          onClick={onManual}
          className="cursor-pointer rounded-[12px] border border-border bg-white p-4 text-left transition-colors hover:border-link-hover hover:shadow-sm"
        >
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-pill bg-surface-muted text-[20px] text-muted">
            <i className="fas fa-pen" />
          </div>
          <div className="text-[14px] font-semibold text-heading">Type from scratch</div>
          <p className="mt-1 text-[12px] leading-[18px] text-muted">
            Empty form. Add medications one by one. Use this when you have no paper.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-link-hover">
            Start blank <i className="fas fa-arrow-right text-[10px]" />
          </div>
        </button>
      </div>
    </div>
  );
}

/**
 * Live camera capture using navigator.mediaDevices.getUserMedia.
 *
 * On desktop this opens the webcam with a permission prompt; on mobile the
 * built-in camera. Works in both — unlike `<input type="file" capture="...">`
 * which only triggers the camera on mobile and just shows a file picker on
 * desktop.
 *
 * Falls back to the file input via `onFallbackToUpload` when:
 *  - The browser doesn't expose `mediaDevices.getUserMedia`
 *  - The user denies the permission prompt
 *  - The device has no camera at all
 */
type CameraStatus = "requesting" | "live" | "denied" | "unsupported" | "error" | "shooting";

function CameraCaptureScreen({
  onCapture,
  onCancel,
  onFallbackToUpload,
}: {
  onCapture: (file: File) => void;
  onCancel: () => void;
  onFallbackToUpload: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("requesting");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  // Used to retry permission after a denial.
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;
    const start = async () => {
      setStatus("requesting");
      // Stop any prior stream before starting a new one (e.g. when switching cams).
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Some browsers need an explicit play() call.
          videoRef.current.play().catch(() => { /* autoplay policy — preview just shows */ });
        }
        setStatus("live");
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException | undefined)?.name ?? "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
          setStatus("denied");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
          setStatus("unsupported");
        } else {
          setStatus("error");
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode, retryKey]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleShoot = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current || status !== "live") return;
    setStatus("shooting");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setStatus("error");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus("error");
          return;
        }
        const file = new File([blob], `rx-${Date.now()}.jpg`, { type: "image/jpeg" });
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  };

  const handleCancel = () => {
    stopStream();
    onCancel();
  };

  // ---------- Permission denied ----------
  if (status === "denied") {
    return (
      <div className="grid place-items-center rounded-md border border-dashed border-cta bg-[#FFFAFB] px-4 py-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-pill bg-white text-[22px] text-cta">
          <i className="fas fa-video-slash" />
        </span>
        <div className="mt-3 text-[14px] font-semibold text-heading">Camera access blocked</div>
        <p className="mt-1 max-w-[400px] text-[12px] leading-[18px] text-muted">
          The browser blocked camera permission. Click the camera/lock icon in the
          address bar to allow it for this site, then try again. You can also upload
          an existing photo instead.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
          >
            <i className="fas fa-redo text-[10px]" /> Try again
          </button>
          <button
            type="button"
            onClick={onFallbackToUpload}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-semibold text-cta-fg hover:bg-[#d92843]"
          >
            <i className="fas fa-image text-[11px]" /> Upload photo instead
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------- No camera / not supported ----------
  if (status === "unsupported") {
    return (
      <div className="grid place-items-center rounded-md border border-dashed border-border bg-surface-muted px-4 py-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-pill bg-white text-[22px] text-muted">
          <i className="fas fa-camera-retro" />
        </span>
        <div className="mt-3 text-[14px] font-semibold text-heading">No camera available</div>
        <p className="mt-1 max-w-[360px] text-[12px] text-muted">
          This browser or device doesn&rsquo;t expose a camera to web pages. Upload an
          existing photo instead.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onFallbackToUpload}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-semibold text-cta-fg hover:bg-[#d92843]"
          >
            <i className="fas fa-image text-[11px]" /> Upload photo
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-[13px] text-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------- Live / requesting / shooting / error ----------
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-heading">Camera preview</h3>
        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          disabled={status !== "live"}
          className="cursor-pointer text-[12px] text-link-hover hover:underline disabled:cursor-not-allowed disabled:text-[#cdd9e4]"
        >
          <i className="fas fa-sync-alt mr-1 text-[10px]" />
          Switch camera
        </button>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-[#0a0a0a]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="block h-full w-full object-cover"
        />

        {status === "requesting" && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 text-white">
            <div className="text-center">
              <i className="fas fa-circle-notch fa-spin text-[24px]" />
              <div className="mt-2 text-[13px] font-medium">Requesting camera access…</div>
              <div className="mt-0.5 text-[11px] opacity-70">Allow it in the browser prompt</div>
            </div>
          </div>
        )}

        {status === "shooting" && (
          <div className="absolute inset-0 bg-white/85" />
        )}

        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-black/80 text-white">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-[24px] text-cta" />
              <div className="mt-2 text-[13px]">Couldn&rsquo;t open the camera</div>
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[12px] font-medium text-heading"
              >
                <i className="fas fa-redo text-[10px]" /> Try again
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted">
        <i className="fas fa-info-circle mr-1" />
        Frame the prescription so all medications are visible. Hold steady for a sharp photo.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-muted hover:text-heading"
        >
          <i className="fas fa-arrow-left text-[10px]" /> Back
        </button>

        <button
          type="button"
          onClick={handleShoot}
          disabled={status !== "live"}
          aria-label="Capture photo"
          className={
            "inline-flex items-center gap-2 rounded-pill px-7 py-3 text-[14px] font-semibold transition-colors " +
            (status === "live"
              ? "cursor-pointer bg-cta text-cta-fg hover:bg-[#d92843]"
              : "cursor-not-allowed bg-[#cdd9e4] text-white")
          }
        >
          <span
            className={
              "grid h-6 w-6 place-items-center rounded-pill " +
              (status === "live" ? "bg-white" : "bg-white/70")
            }
          >
            <i className={"fas fa-circle text-[14px] " + (status === "live" ? "text-cta" : "text-[#cdd9e4]")} />
          </span>
          Capture
        </button>

        <button
          type="button"
          onClick={onFallbackToUpload}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
        >
          <i className="fas fa-image text-[11px]" /> Upload instead
        </button>
      </div>
    </div>
  );
}

function CaptureScreen({
  photoUrl,
  fileType,
  fileName,
  ocrLoading,
  onRetake,
  onPickCamera,
  onPickGallery,
  onUsePhoto,
  onBack,
  onSkipOcr,
}: {
  photoUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  ocrLoading: boolean;
  onRetake: () => void;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onUsePhoto: () => void;
  onBack: () => void;
  onSkipOcr: () => void;
}) {
  if (!photoUrl) {
    return (
      <div className="grid place-items-center rounded-md border border-dashed border-border bg-surface-muted py-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-pill bg-white text-[22px] text-cta">
          <i className="fas fa-camera" />
        </span>
        <div className="mt-3 text-[14px] font-semibold text-heading">Pick a photo to start</div>
        <p className="mt-1 max-w-[320px] text-[12px] leading-[18px] text-muted">
          On a phone the camera opens directly. On desktop you can upload an existing photo.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onPickCamera}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-cta px-4 py-2 text-[13px] font-semibold text-cta-fg hover:bg-[#d92843]"
          >
            <i className="fas fa-camera text-[11px]" /> Use camera
          </button>
          <button
            type="button"
            onClick={onPickGallery}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
          >
            <i className="fas fa-image text-[11px]" /> Upload photo
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-[13px] font-medium text-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-heading">Preview</h3>
        <button
          type="button"
          onClick={onRetake}
          disabled={ocrLoading}
          className="cursor-pointer text-[12px] text-link-hover hover:underline disabled:cursor-not-allowed disabled:text-[#cdd9e4]"
        >
          <i className="fas fa-redo mr-1 text-[10px]" /> Choose another
        </button>
      </div>
      <FilePreview url={photoUrl} type={fileType} name={fileName} maxHeightClass="max-h-[420px]" />
      {fileType === "application/pdf" && (
        <p className="mt-2 text-[11px] text-muted">
          <i className="fas fa-info-circle mr-1" />
          PDFs can&rsquo;t be previewed inline yet — OCR will still run on the
          rasterised first page.{" "}
          <a href={photoUrl} target="_blank" rel="noreferrer" className="text-link-hover">
            Open PDF in a new tab
          </a>
        </p>
      )}

      {ocrLoading ? (
        <div className="mt-4 flex items-center gap-3 rounded-md border border-[#E6F1FA] bg-[#F9FBFD] px-4 py-3">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-pill bg-[#E6F1FA] text-link-hover">
            <i className="fas fa-circle-notch fa-spin" />
          </span>
          <div>
            <div className="text-[13px] font-semibold text-heading">Recognising handwriting…</div>
            <div className="text-[12px] text-muted">This usually takes a couple of seconds.</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUsePhoto}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-semibold text-cta-fg hover:bg-[#d92843]"
          >
            <i className="fas fa-magic text-[11px]" /> Use this photo
          </button>
          <button
            type="button"
            onClick={onSkipOcr}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-medium text-heading hover:border-link-hover"
          >
            <i className="fas fa-pen text-[11px]" /> Skip OCR · type manually
          </button>
        </div>
      )}
    </div>
  );
}

function TemplatePicker({
  onPick,
  onBack,
}: {
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-[14px] font-semibold text-heading">Pick a template</h3>
        <p className="mt-0.5 text-[12px] text-muted">
          Pre-filled prescriptions for common dental cases. You can edit everything on the
          next screen.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RX_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t.id)}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-white p-3.5 text-left transition-colors hover:border-link-hover hover:shadow-sm"
          >
            <span className="grid h-10 w-10 flex-none place-items-center rounded-md bg-[#E6F1FA] text-[14px] text-link-hover">
              <i className={`fas ${t.icon}`} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-heading">{t.label}</div>
              <p className="mt-0.5 text-[12px] leading-[18px] text-muted">{t.description}</p>
              <div className="mt-1.5 text-[11px] text-[#9aa9b8]">
                {t.items.length === 0
                  ? "Aftercare instructions only · no medications"
                  : `${t.items.length} medication${t.items.length === 1 ? "" : "s"}`}
              </div>
            </div>
            <i className="fas fa-arrow-right mt-1 text-[10px] text-muted" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-link-hover"
      >
        <i className="fas fa-arrow-left text-[10px]" /> Back to all options
      </button>
    </div>
  );
}

function ReviewForm({
  items,
  notes,
  doctorId,
  source,
  photoUrl,
  fileType,
  fileName,
  ocrConfidence,
  ocrWarnings,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onChangeNotes,
  onChangeDoctor,
}: {
  items: PrescriptionItem[];
  notes: string;
  doctorId: string;
  source: PrescriptionSource;
  photoUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  ocrConfidence?: number;
  ocrWarnings: string[];
  onUpdateItem: (idx: number, field: keyof PrescriptionItem, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (idx: number) => void;
  onChangeNotes: (v: string) => void;
  onChangeDoctor: (id: string) => void;
}) {
  const showPhoto = source === "handwritten" && photoUrl;
  return (
    <div className="space-y-4">
      {ocrWarnings.length > 0 && (
        <div className="rounded-md border border-[#F4D9A8] bg-[#FFF8EC] px-3.5 py-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#7a5c2b]">
            <i className="fas fa-exclamation-circle text-[11px]" />
            Please review before saving
            {ocrConfidence !== undefined && (
              <span className="ml-1 rounded-pill bg-white px-1.5 py-0.5 text-[10px] font-normal text-[#7a5c2b]">
                {Math.round(ocrConfidence * 100)}% confidence
              </span>
            )}
          </div>
          <ul className="ml-5 list-disc text-[12px] leading-[18px] text-[#7a5c2b]">
            {ocrWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className={"grid grid-cols-1 gap-4 " + (showPhoto ? "lg:grid-cols-[260px_1fr]" : "")}>
        {showPhoto && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
              {fileType === "application/pdf" ? "Source file" : "Source photo"}
            </div>
            <FilePreview url={photoUrl} type={fileType} name={fileName} />
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-[#FFE7EC] px-2 py-0.5 text-[11px] font-semibold text-cta">
              <i className={`fas ${fileType === "application/pdf" ? "fa-file-pdf" : "fa-camera"} text-[10px]`} />
              {fileType === "application/pdf" ? "From PDF" : "From paper"}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
              Medications <span className="ml-1 text-cta">*</span>
            </div>
            <button
              type="button"
              onClick={onAddItem}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1 text-[12px] font-medium text-link-hover hover:border-link-hover"
            >
              <i className="fas fa-plus text-[10px]" /> Add medication
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((it, idx) => (
              <div key={idx} className="rounded-md border border-border bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
                    Medication {idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      aria-label={`Remove medication ${idx + 1}`}
                      className="text-[12px] text-cta hover:underline"
                    >
                      <i className="fas fa-trash text-[10px]" /> Remove
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    value={it.medication}
                    onChange={(e) => onUpdateItem(idx, "medication", e.target.value)}
                    placeholder="Medication (e.g. Amoxicillin 500mg)"
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-[14px] text-heading outline-none focus:border-link-hover"
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      value={it.dosage}
                      onChange={(e) => onUpdateItem(idx, "dosage", e.target.value)}
                      placeholder="Dosage (1 tab)"
                      className="rounded-md border border-border bg-white px-3 py-1.5 text-[13px] text-heading outline-none focus:border-link-hover"
                    />
                    <input
                      value={it.frequency}
                      onChange={(e) => onUpdateItem(idx, "frequency", e.target.value)}
                      placeholder="Frequency (Twice daily)"
                      className="rounded-md border border-border bg-white px-3 py-1.5 text-[13px] text-heading outline-none focus:border-link-hover"
                    />
                    <input
                      value={it.duration}
                      onChange={(e) => onUpdateItem(idx, "duration", e.target.value)}
                      placeholder="Duration (5 days)"
                      className="rounded-md border border-border bg-white px-3 py-1.5 text-[13px] text-heading outline-none focus:border-link-hover"
                    />
                  </div>
                  <input
                    value={it.instructions ?? ""}
                    onChange={(e) => onUpdateItem(idx, "instructions", e.target.value)}
                    placeholder="Instructions (e.g. after meals) — optional"
                    className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-[13px] text-heading outline-none focus:border-link-hover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
            Notes
          </div>
          <textarea
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Watch for penicillin allergy. Soft food for 24h."
            className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading outline-none focus:border-link-hover"
          />
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
            Doctor
          </div>
          <select
            value={doctorId}
            onChange={(e) => onChangeDoctor(e.target.value)}
            className="w-full cursor-pointer rounded-md border border-border bg-white px-3 py-2 text-[13px] text-heading outline-none focus:border-link-hover"
          >
            {BOOKING_DOCTORS.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function SavedSuccess({
  rx,
  patientName,
  onSendWa,
  onPrint,
}: {
  rx: Prescription;
  patientName: string;
  onSendWa: () => void;
  onPrint: () => void;
}) {
  const sourceLabel: Record<PrescriptionSource, string> = {
    handwritten: "From a paper photo",
    template:    "From a template",
    manual:      "Typed manually",
  };
  return (
    <div className="py-2 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-pill bg-[#E6F4EC] text-[26px] text-[#3a8b5e]">
        <i className="fas fa-check-circle" />
      </div>
      <h3 className="mt-3 text-[20px] font-semibold text-heading">Prescription saved</h3>
      <p className="mt-1.5 text-[14px] leading-[20px] text-muted">
        {rx.items.length} medication{rx.items.length === 1 ? "" : "s"} for{" "}
        <strong className="text-heading">{patientName}</strong>.
        {rx.source && <> {sourceLabel[rx.source]}.</>}
      </p>

      <div className="mx-auto mt-4 max-w-[360px] rounded-md border border-border bg-surface-muted p-3 text-left">
        {rx.items.slice(0, 3).map((it, i) => (
          <div key={i} className="text-[12px] text-heading">
            <strong className="font-semibold">{it.medication}</strong>{" "}
            <span className="text-muted">· {it.dosage} · {it.frequency} · {it.duration}</span>
          </div>
        ))}
        {rx.items.length > 3 && (
          <div className="mt-1 text-[11px] text-[#9aa9b8]">+{rx.items.length - 3} more</div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onSendWa}
          className="inline-flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-[14px] font-semibold text-cta-fg hover:bg-[#d92843]"
        >
          <i className="fab fa-whatsapp" /> Send to patient
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-link-hover bg-white px-4 py-2 text-[14px] font-medium text-link-hover hover:bg-link-hover hover:text-white"
        >
          <i className="fas fa-print text-[12px]" /> Print
        </button>
      </div>
    </div>
  );
}

/**
 * Shared preview card. Renders an inline `<img>` for image MIME types and a
 * card-style placeholder (icon + filename + "Open" link) for PDFs and anything
 * else we can't display inline. Both branches use the same blob/object URL.
 */
function FilePreview({
  url,
  type,
  name,
  maxHeightClass,
}: {
  url: string | null;
  type: string | null;
  name: string | null;
  maxHeightClass?: string;
}) {
  if (!url) return null;

  const isImage = !type || type.startsWith("image/");

  if (isImage) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-[#0a0a0a]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name ?? "Prescription"}
          className={`block w-full object-contain ${maxHeightClass ?? ""}`}
        />
      </div>
    );
  }

  // PDF / other non-image — show a placeholder card with file name + open-in-tab link.
  return (
    <div className="rounded-md border border-border bg-surface-muted p-6 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-[#FFE7EC] text-[24px] text-cta">
        <i className="fas fa-file-pdf" />
      </span>
      <div className="mt-2.5 break-all text-[13px] font-semibold text-heading">
        {name ?? "Document.pdf"}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-[#9aa9b8]">
        PDF
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-link-hover no-underline hover:border-link-hover"
      >
        <i className="fas fa-external-link-alt text-[10px]" />
        Open in new tab
      </a>
    </div>
  );
}
