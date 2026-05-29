import { redirect } from "next/navigation";

/**
 * Pre-redesign deep links into /book/details redirect to the new single-page
 * /book composer. The patient form lives inline there now.
 */
export default function DetailsPage() {
  redirect("/book");
}
