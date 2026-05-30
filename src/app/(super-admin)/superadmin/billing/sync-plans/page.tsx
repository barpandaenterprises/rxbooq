import { redirect } from "next/navigation";

// Sync-plans is now embedded in /superadmin/plans (next to the CRUD table).
// Redirect any bookmarks/links pointed at the old standalone route.
export default function LegacySyncPlansPage() {
  redirect("/superadmin/plans");
}
