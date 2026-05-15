"use client";

/**
 * Doctor profile-photo upload field.
 *
 * Renders a circular avatar — either the existing photo, a newly-picked
 * preview, or initials in a coloured circle as a fallback. Below the avatar:
 * "Upload photo" / "Replace" / "Remove" controls.
 *
 * Emits two pieces of state to the parent:
 *   - `photoFile` — the File the user picked this session (null when nothing
 *     new is picked).
 *   - `removed`  — true if the user clicked "Remove" on an existing photo.
 *
 * The parent collapses these into the action payload at submit time:
 *   - photoFile present → upload + replace
 *   - removed === true → null out the doctors.photo_url
 *   - neither           → leave the photo alone
 */

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Existing photo URL from the doctor row, if any. */
  existingPhotoUrl?: string;
  /** Two-letter initials for the fallback avatar. */
  initials:          string;
  /** Avatar palette (bg + fg). Derived stably from doctor.id by the parent. */
  bg:                string;
  fg:                string;
  /** Newly-picked file or null. */
  photoFile:         File | null;
  onPhotoFileChange: (file: File | null) => void;
  /** Has the user marked the existing photo for removal? Only meaningful when existingPhotoUrl is set. */
  removed:           boolean;
  onRemovedChange:   (removed: boolean) => void;
  /** Max upload size in bytes. Default 5 MiB to match the public-assets bucket cap. */
  maxBytes?:         number;
};

const ACCEPT_MIME = "image/jpeg,image/png,image/webp";

export function DoctorPhotoField({
  existingPhotoUrl,
  initials,
  bg,
  fg,
  photoFile,
  onPhotoFileChange,
  removed,
  onRemovedChange,
  maxBytes = 5 * 1024 * 1024,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate / revoke an object URL for the newly-picked file so we can preview it.
  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const showExisting = Boolean(existingPhotoUrl) && !removed && !photoFile;
  const showPreview  = Boolean(previewUrl);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    // Reset the input value so picking the same file twice still fires onChange.
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT_MIME.split(",").includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > maxBytes) {
      setError(`Image is too large. Max ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      return;
    }
    onPhotoFileChange(file);
    onRemovedChange(false);
  };

  const onChooseClick = () => fileInputRef.current?.click();

  const onClearPick = () => {
    setError(null);
    onPhotoFileChange(null);
  };

  const onRemove = () => {
    setError(null);
    onPhotoFileChange(null);
    onRemovedChange(true);
  };

  return (
    <div className="flex items-start gap-4">
      <div
        className="relative grid h-20 w-20 flex-none place-items-center overflow-hidden rounded-pill text-[20px] font-semibold"
        style={{ background: bg, color: fg }}
      >
        {showPreview && previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="New photo preview" className="h-full w-full object-cover" />
        ) : showExisting && existingPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={existingPhotoUrl} alt="Doctor photo" className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MIME}
          className="hidden"
          onChange={onPick}
        />

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onChooseClick}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-heading hover:border-link-hover"
          >
            <i className="fas fa-camera text-[11px]" />
            {showExisting || showPreview ? "Replace photo" : "Upload photo"}
          </button>

          {photoFile && (
            <button
              type="button"
              onClick={onClearPick}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-muted hover:text-heading"
            >
              <i className="fas fa-undo text-[10px]" />
              Undo
            </button>
          )}

          {showExisting && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-cta hover:border-cta"
            >
              <i className="fas fa-trash text-[10px]" />
              Remove
            </button>
          )}

          {removed && existingPhotoUrl && (
            <button
              type="button"
              onClick={() => onRemovedChange(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-muted hover:text-heading"
            >
              <i className="fas fa-undo text-[10px]" />
              Keep existing
            </button>
          )}
        </div>

        <p className="mt-2 text-[11px] text-[#9aa9b8]">
          JPG, PNG, or WebP · max {Math.round(maxBytes / 1024 / 1024)} MB · square works best.
        </p>
        {error && (
          <p role="alert" className="mt-1 text-[12px] text-danger">
            <i className="fas fa-exclamation-circle mr-1" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Helper: read a File as base64 (data URL form is OK — actions strip the prefix).
// =============================================================================

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}
