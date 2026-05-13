import { notFound } from "next/navigation";
import { BookingLayout } from "@/components/layouts/BookingLayout";
import { BookingSlotPicker } from "@/components/compositions/BookingSlotPicker";
import { getCurrentClinic } from "@/lib/booking/current-clinic";
import {
  findPublicServiceById,
  getPublicBookedSlots,
  getPublicDoctors,
} from "@/lib/data/public-booking";

export const metadata = {
  title: "Choose a time",
};

type SearchParams = Promise<{ service?: string; doctor?: string }>;

const TOTAL_DAYS = 14;
const IST = "Asia/Kolkata";

function istIsoDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  }).format(d);
}

export default async function SlotPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const clinic = await getCurrentClinic();
  if (!clinic) notFound();

  const service = await findPublicServiceById(clinic.id, params.service);
  if (!service) notFound();

  // If the user didn't pick a doctor, default to the first active doctor at
  // the clinic so we have a doctor_id to compute booked slots against.
  let doctorId = params.doctor ?? null;
  if (!doctorId) {
    const doctors = await getPublicDoctors(clinic.id);
    doctorId = doctors[0]?.id ?? null;
  }

  // Fetch booked slots for the next 14 days for the chosen doctor.
  let bookedByDate: Record<string, string[]> = {};
  if (doctorId) {
    const today = new Date();
    const dateIsos: string[] = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dateIsos.push(istIsoDate(d));
    }
    const lists = await Promise.all(
      dateIsos.map((iso) => getPublicBookedSlots(clinic.id, doctorId!, iso)),
    );
    bookedByDate = Object.fromEntries(dateIsos.map((iso, i) => [iso, lists[i] ?? []]));
  }

  return (
    <BookingLayout>
      <BookingSlotPicker
        service={service}
        doctorId={doctorId}
        bookedByDate={bookedByDate}
      />
    </BookingLayout>
  );
}
