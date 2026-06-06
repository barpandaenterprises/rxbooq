"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SettingsTabs } from "@/components/molecules/SettingsTabs";
import {
  createDepartmentAction,
  deactivateDepartmentAction,
  reactivateDepartmentAction,
  updateDepartmentAction,
} from "@/app/(clinic-app)/[clinicSlug]/admin/settings/departments/actions";
import type { Department } from "@/lib/data/departments";

const createSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
});
type CreateValues = z.infer<typeof createSchema>;

function inputCls(hasError: boolean): string {
  const base =
    "w-full rounded-md border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover";
  return hasError ? `${base} border-danger focus:border-danger` : `${base} border-border`;
}

type Props = {
  initialDepartments: Department[];
};

export function AdminDepartments({ initialDepartments }: Props) {
  const router = useRouter();
  // Render straight from the prop: every mutation calls router.refresh(), which
  // re-runs the server component and feeds a fresh list down. Holding it in
  // useState would freeze the list at mount-time and require a hard reload.
  const departments = initialDepartments;
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [isPatching, startPatch] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver:      zodResolver(createSchema),
    defaultValues: { name: "" },
    mode:          "onBlur",
  });

  const onCreate = (values: CreateValues) => {
    if (isCreating) return;
    setBannerError(null);
    setBannerSuccess(null);
    startCreate(async () => {
      const result = await createDepartmentAction(values);
      if (!result.ok) {
        setBannerError(result.error);
        return;
      }
      setBannerSuccess(`"${values.name}" added.`);
      reset({ name: "" });
      router.refresh();
    });
  };

  const onSaveRename = (id: string) => {
    const name = editingName.trim();
    if (name.length < 2) {
      setBannerError("Name must be at least 2 characters.");
      return;
    }
    setBannerError(null);
    setBannerSuccess(null);
    startPatch(async () => {
      const result = await updateDepartmentAction({ id, name });
      if (!result.ok) {
        setBannerError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  };

  const onToggleActive = (d: Department) => {
    const verb = d.isActive ? "deactivate" : "reactivate";
    if (!window.confirm(`${verb[0]!.toUpperCase() + verb.slice(1)} "${d.name}"?`)) return;
    setBannerError(null);
    setBannerSuccess(null);
    startPatch(async () => {
      const result = d.isActive
        ? await deactivateDepartmentAction({ id: d.id })
        : await reactivateDepartmentAction({ id: d.id });
      if (!result.ok) {
        setBannerError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="px-5 pt-7 md:px-8 md:pt-8">
      <div className="mb-4">
        <h2 className="text-[28px] font-semibold leading-9 text-heading md:text-[32px]">Settings</h2>
        <p className="mt-1 text-[14px] text-muted">
          Manage your team, departments, and clinic configuration.
        </p>
      </div>

      <SettingsTabs active="departments" />

      <div className="mb-5">
        <h3 className="text-[18px] font-semibold text-heading">Departments</h3>
        <p className="mt-1 text-[13px] text-muted">
          Group doctors by specialty (e.g. Dental, Psychiatry). Patients pick a department in the
          booking flow; reception filters doctors by it. Each clinic comes seeded with four common
          defaults — add or deactivate to match your practice.
        </p>
      </div>

      {bannerError && (
        <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-[13px] text-danger">
          <i className="fas fa-exclamation-triangle mr-1.5" /> {bannerError}
        </div>
      )}
      {bannerSuccess && (
        <div role="status" className="mb-4 rounded-md border border-[#3a8b5e]/30 bg-[#E6F4EC] px-3 py-2 text-[13px] text-[#1f5e3a]">
          <i className="fas fa-check-circle mr-1.5" /> {bannerSuccess}
        </div>
      )}

      {/* Add form */}
      <div className="mb-6 rounded-[12px] border border-border bg-white p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
          Add a new department
        </div>
        <form onSubmit={handleSubmit(onCreate)} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <input
              type="text"
              placeholder="e.g. Cardiology"
              {...register("name")}
              className={inputCls(!!errors.name)}
            />
            {errors.name && <p className="mt-1 text-[12px] text-danger">{errors.name.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className={
              "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-cta px-4 py-2.5 text-[14px] font-semibold text-cta-fg transition-colors hover:bg-[#d92843] " +
              (isCreating ? "cursor-not-allowed opacity-60 hover:bg-cta" : "")
            }
          >
            {isCreating ? (
              <>
                <i className="fas fa-spinner fa-spin text-[12px]" />
                Adding…
              </>
            ) : (
              <>
                <i className="fas fa-plus text-[12px]" />
                Add department
              </>
            )}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-[12px] border border-border bg-white">
        <div className="flex items-center gap-2.5 border-b border-border bg-surface-muted px-4 py-3 text-[13px] text-muted">
          <i className="fas fa-sitemap text-[12px] text-link-hover" />
          <strong>{departments.length}</strong> department{departments.length === 1 ? "" : "s"}
        </div>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col />
            <col style={{ width: 200 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Name</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Slug</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => {
              const isEditing = editingId === d.id;
              return (
                <tr key={d.id} className="border-b border-[#F4F5F7] bg-white hover:bg-[#FAFAFB]">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onSaveRename(d.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className={inputCls(false) + " max-w-[260px]"}
                        />
                        <button
                          type="button"
                          onClick={() => onSaveRename(d.id)}
                          disabled={isPatching}
                          className="rounded-md bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-md border border-border bg-white px-3 py-1.5 text-[12px] text-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="text-[14px] font-semibold text-heading">{d.name}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-muted">{d.slug}</td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold " +
                        (d.isActive ? "bg-[#E6F4EC] text-[#1f5e3a]" : "bg-[#F4F5F7] text-muted")
                      }
                    >
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {!isEditing && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setEditingId(d.id); setEditingName(d.name); }}
                          aria-label={`Rename ${d.name}`}
                          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-border bg-white text-muted hover:text-link-hover"
                        >
                          <i className="fas fa-pen text-[12px]" />
                        </button>
                        <button
                          type="button"
                          disabled={isPatching}
                          onClick={() => onToggleActive(d)}
                          aria-label={d.isActive ? `Deactivate ${d.name}` : `Reactivate ${d.name}`}
                          className={
                            "grid h-8 w-8 cursor-pointer place-items-center rounded-md border bg-white " +
                            (d.isActive
                              ? "border-border text-muted hover:border-danger hover:text-danger"
                              : "border-border text-muted hover:border-link-hover hover:text-link-hover")
                          }
                        >
                          <i className={`fas ${d.isActive ? "fa-eye-slash" : "fa-eye"} text-[12px]`} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {departments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-[13px] text-muted">
                  <i className="fas fa-sitemap text-[24px] text-[#cdd9e4]" />
                  <div className="mt-2">No departments yet — add your first one above.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
