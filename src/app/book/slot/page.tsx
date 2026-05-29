import { redirect } from "next/navigation";

/**
 * Pre-redesign deep links into /book/slot redirect to the new single-page
 * /book composer. Query params are dropped — the new flow picks dept/doctor
 * inside the page rather than via URL state.
 */
export default function SlotPage() {
  redirect("/book");
}
