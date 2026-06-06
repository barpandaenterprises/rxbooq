import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { serverClient, serviceClient } from "@/lib/supabase/server";
import { formatInr } from "@/lib/billing/pricing";
import { BillingPanel } from "@/components/compositions/BillingPanel";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const sess = await serverClient();
  const { data: { user } } = await sess.auth.getUser();
  if (!user) return null;

  const supabase = serviceClient();
  const { data: cu } = await supabase
    .from("clinic_users")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!cu?.clinic_id) {
    return (
      <ClinicAppLayout active="Settings">
        <div className="p-6 text-[14px] text-muted">Your account is not linked to a clinic.</div>
      </ClinicAppLayout>
    );
  }

  const [{ data: sub }, { data: plans }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(`
        id, status, trial_ends_at, current_period_end, extra_seats,
        razorpay_subscription_id,
        plan:subscription_plans!inner ( id, code, display_name, monthly_price_inr, included_doctor_seats, extra_seat_price_inr )
      `)
      .eq("clinic_id", cu.clinic_id)
      .in("status", ["trialing", "active", "past_due", "paused"])
      .maybeSingle(),
    supabase
      .from("subscription_plans")
      .select("id, code, display_name, tagline, monthly_price_inr, included_doctor_seats, extra_seat_price_inr, is_popular, sort_order, razorpay_plan_id")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return (
    <ClinicAppLayout active="Settings">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-[22px] font-semibold text-heading">Billing</h1>
          <p className="mt-1 text-[13px] text-muted">Manage your plan, seats, and payment method.</p>
        </div>

        {sub && (
          <div className="rounded-lg border border-border bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[15px] font-semibold text-heading">{(sub.plan as unknown as { display_name: string }).display_name}</div>
                <div className="mt-1 text-[12px] text-muted">
                  Status: <span className="font-medium text-heading">{sub.status}</span>
                  {sub.trial_ends_at && sub.status === "trialing" && (
                    <> · Trial ends {new Date(sub.trial_ends_at).toLocaleDateString("en-IN")}</>
                  )}
                  {sub.current_period_end && sub.status === "active" && (
                    <> · Next charge {new Date(sub.current_period_end).toLocaleDateString("en-IN")}</>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-semibold text-heading">
                  {formatInr((sub.plan as unknown as { monthly_price_inr: number }).monthly_price_inr)}
                  <span className="ml-1 text-[12px] font-normal text-muted">/mo</span>
                </div>
                {sub.extra_seats > 0 && (
                  <div className="text-[11px] text-muted">+ {sub.extra_seats} extra seat{sub.extra_seats === 1 ? "" : "s"}</div>
                )}
              </div>
            </div>
          </div>
        )}

        <BillingPanel plans={plans ?? []} currentPlanId={sub?.plan ? (sub.plan as unknown as { id: string }).id : null} />
      </div>
    </ClinicAppLayout>
  );
}
