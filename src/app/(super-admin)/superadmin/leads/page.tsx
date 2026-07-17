import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { serviceClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/data/leads";
import { LeadsTable } from "@/components/compositions/LeadsTable";

export const metadata = { title: "Lead Management" };

// Leads change frequently and are superadmin-only — never cache.
export const dynamic = "force-dynamic";

export default async function SuperAdminLeadsPage() {
  const supabase = serviceClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, name, phone, email, landing_page_url, referrer, ip_address, utm, meta, status, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as Lead[];

  return (
    <SuperAdminLayout active="Leads">
      <div className="px-5 pt-7 md:px-8 md:pt-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-semibold leading-9 text-heading md:text-[32px] md:leading-10">
              Lead Management
            </h2>
            <p className="mt-1 text-[14px] text-muted">
              Leads captured from the home-page form · Live data.
            </p>
          </div>
        </div>

        <LeadsTable leads={leads} />
      </div>
    </SuperAdminLayout>
  );
}
