import { ClinicAppLayout } from "@/components/layouts/ClinicAppLayout";
import { AdminCalendar } from "@/components/compositions/AdminCalendar";
import { getAdminCalendarData, getISTMonday } from "@/lib/data/admin-calendar";

export const metadata = {
  title: "Calendar",
};

type PageProps = {
  searchParams: Promise<{ week?: string }>;
};

const IST = "Asia/Kolkata";

function istIsoDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  }).format(d);
}

export default async function AdminCalendarPage({ searchParams }: PageProps) {
  const { week } = await searchParams;

  // Parse ?week=YYYY-MM-DD (the Monday). Fall back to this week's Monday if absent or invalid.
  let mondayIst: Date;
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    // Construct at IST midnight regardless of caller TZ.
    const candidate = new Date(`${week}T00:00:00+05:30`);
    // Re-snap to Monday of the same week so /admin/calendar?week=<wednesday> still works.
    mondayIst = getISTMonday(candidate);
  } else {
    mondayIst = getISTMonday(new Date());
  }

  const appointments = await getAdminCalendarData(mondayIst);
  const weekStartIso = istIsoDate(mondayIst);

  return (
    <ClinicAppLayout active="Calendar">
      <AdminCalendar weekStartIso={weekStartIso} appointments={appointments} />
    </ClinicAppLayout>
  );
}
