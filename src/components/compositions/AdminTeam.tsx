"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  deactivateClinicUserAction,
  inviteClinicUserAction,
  updateClinicUserRoleAction,
} from "@/app/(clinic-app)/[clinicSlug]/admin/settings/team/actions";
import { SettingsTabs } from "@/components/molecules/SettingsTabs";
import type { ClinicUserRole, TeamMember } from "@/lib/data/admin-team";

const ROLE_LABEL: Record<ClinicUserRole, string> = {
  clinic_admin: "Admin",
  doctor:       "Doctor",
  receptionist: "Receptionist",
};

const ROLE_DOT: Record<ClinicUserRole, { bg: string; fg: string }> = {
  clinic_admin: { bg: "#FFE7EC", fg: "#EE344E" },
  doctor:       { bg: "#E6F1FA", fg: "#0E5087" },
  receptionist: { bg: "#E6F4EC", fg: "#3a8b5e" },
};

const inviteSchema = z.object({
  email:       z.string().trim().email("Enter a valid email"),
  displayName: z.string().trim().min(2, "Display name is required"),
  role:        z.enum(["clinic_admin", "doctor", "receptionist"]),
  phone:       z.string().trim().optional(),
});

type InviteValues = z.infer<typeof inviteSchema>;

function inputCls(hasError: boolean): string {
  const base =
    "w-full rounded-md border bg-white px-3 py-2.5 text-[14px] text-heading outline-none focus:border-link-hover";
  return hasError ? `${base} border-danger focus:border-danger` : `${base} border-border`;
}

export function AdminTeam({ initialMembers }: { initialMembers: TeamMember[] }) {
  const router = useRouter();
  // Render straight from the prop: invites call router.refresh(), which re-runs
  // the server component and feeds a fresh list down. Holding it in useState
  // would freeze the list at mount-time and require a hard reload.
  const members = initialMembers;
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);
  const [isInviting, startInvite] = useTransition();
  const [isPatching, startPatch]  = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver:      zodResolver(inviteSchema),
    defaultValues: { email: "", displayName: "", role: "receptionist", phone: "" },
    mode:          "onBlur",
  });

  const onInvite = (values: InviteValues) => {
    if (isInviting) return;
    setBannerError(null);
    setBannerSuccess(null);
    startInvite(async () => {
      const result = await inviteClinicUserAction(values);
      if (!result.ok) {
        setBannerError(result.error);
        return;
      }
      setBannerSuccess(`Invitation sent to ${values.email}.`);
      reset({ email: "", displayName: "", role: "receptionist", phone: "" });
      router.refresh();
    });
  };

  const onRoleChange = (clinicUserId: string, role: ClinicUserRole) => {
    if (isPatching) return;
    setBannerError(null);
    setBannerSuccess(null);
    startPatch(async () => {
      const result = await updateClinicUserRoleAction({ clinicUserId, role });
      if (!result.ok) {
        setBannerError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onDeactivate = (m: TeamMember) => {
    if (isPatching) return;
    if (!window.confirm(`Remove ${m.displayName} from the team? They'll lose access immediately.`)) {
      return;
    }
    setBannerError(null);
    setBannerSuccess(null);
    startPatch(async () => {
      const result = await deactivateClinicUserAction({ clinicUserId: m.id });
      if (!result.ok) {
        setBannerError(result.error);
        return;
      }
      setBannerSuccess(`${m.displayName} has been removed.`);
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

      <SettingsTabs active="team" />

      <div className="mb-5">
        <h3 className="text-[18px] font-semibold text-heading">Team</h3>
        <p className="mt-1 text-[13px] text-muted">
          Invite doctors, receptionists, and other admins. Each person gets a one-time magic link to set their password.
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

      {/* Invite form */}
      <div className="mb-6 rounded-[12px] border border-border bg-white p-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">
          Invite a new team member
        </div>
        <form onSubmit={handleSubmit(onInvite)} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1fr_140px_auto]">
          <div>
            <input
              type="email"
              placeholder="email@clinic.in"
              {...register("email")}
              className={inputCls(!!errors.email)}
            />
            {errors.email && <p className="mt-1 text-[12px] text-danger">{errors.email.message}</p>}
          </div>
          <div>
            <input
              type="text"
              placeholder="Full name"
              {...register("displayName")}
              className={inputCls(!!errors.displayName)}
            />
            {errors.displayName && <p className="mt-1 text-[12px] text-danger">{errors.displayName.message}</p>}
          </div>
          <div>
            <select {...register("role")} className={inputCls(false) + " cursor-pointer"}>
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
              <option value="clinic_admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isInviting}
            className={
              "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-cta px-4 py-2.5 text-[14px] font-semibold text-cta-fg transition-colors hover:bg-[#d92843] " +
              (isInviting ? "cursor-not-allowed opacity-60 hover:bg-cta" : "")
            }
          >
            {isInviting ? (
              <>
                <i className="fas fa-spinner fa-spin text-[12px]" />
                Sending…
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane text-[12px]" />
                Send invite
              </>
            )}
          </button>
        </form>
      </div>

      {/* Team list */}
      <div className="overflow-hidden rounded-[12px] border border-border bg-white">
        <div className="flex items-center gap-2.5 border-b border-border bg-surface-muted px-4 py-3 text-[13px] text-muted">
          <i className="fas fa-users text-[12px] text-link-hover" />
          <strong>{members.length}</strong> team member{members.length === 1 ? "" : "s"}
        </div>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col />
            <col style={{ width: 220 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 60 }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Member</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Email</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Role</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9aa9b8]">Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const dot = ROLE_DOT[m.role];
              return (
                <tr key={m.id} className="border-b border-[#F4F5F7] bg-white hover:bg-[#FAFAFB]">
                  <td className="px-4 py-3">
                    <div className="text-[14px] font-semibold text-heading">
                      {m.displayName}
                      {m.isSelf && (
                        <span className="ml-2 rounded-pill bg-[#E6F1FA] px-2 py-0.5 text-[10px] font-semibold text-link-hover">
                          You
                        </span>
                      )}
                    </div>
                    {m.phone && (
                      <div className="text-[11px] text-muted">{m.phone}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[13px] text-muted">{m.email}</td>
                  <td className="px-3 py-3">
                    {m.isSelf ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: dot.bg, color: dot.fg }}
                      >
                        {ROLE_LABEL[m.role]}
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        disabled={isPatching}
                        onChange={(e) => onRoleChange(m.id, e.target.value as ClinicUserRole)}
                        className="cursor-pointer rounded-md border border-border bg-white px-2 py-1 text-[12px] text-heading outline-none focus:border-link-hover"
                      >
                        <option value="receptionist">Receptionist</option>
                        <option value="doctor">Doctor</option>
                        <option value="clinic_admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[12px] text-muted">{m.joinedAt}</td>
                  <td className="px-3 py-3 text-right">
                    {!m.isSelf && (
                      <button
                        type="button"
                        disabled={isPatching}
                        onClick={() => onDeactivate(m)}
                        aria-label={`Remove ${m.displayName}`}
                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-border bg-white text-muted hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <i className="fas fa-user-slash text-[12px]" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-muted">
                  <i className="fas fa-users-slash text-[24px] text-[#cdd9e4]" />
                  <div className="mt-2">No team members yet — invite your first one above.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
