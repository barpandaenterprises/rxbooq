import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminAnalytics } from "@/components/compositions/AdminAnalytics";
import { getAdminAnalyticsData, type AnalyticsPeriod } from "@/lib/data/admin-analytics";

export const metadata = {
  title: "Analytics",
};

type PageProps = {
  searchParams: Promise<{ period?: string; doctor?: string; service?: string }>;
};

function parsePeriod(raw: string | undefined): AnalyticsPeriod {
  if (raw === "7d" || raw === "30d" || raw === "90d") return raw;
  return "30d";
}

function parseId(raw: string | undefined): string | null {
  if (!raw || raw === "all") return null;
  return raw;
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const { period, doctor, service } = await searchParams;
  const data = await getAdminAnalyticsData(parsePeriod(period), {
    doctorId:  parseId(doctor),
    serviceId: parseId(service),
  });

  return (
    <ClinicAppLayout active="Analytics">
      <AdminAnalytics data={data} />
    </ClinicAppLayout>
  );
}
