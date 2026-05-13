import { PatientLoginForm } from "./login-form";

export const metadata = {
  title: "Sign in to view your appointments",
};

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function PatientLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-pill bg-[#E6F4EC] text-[20px] text-[#25D366]">
            <i className="fab fa-whatsapp" />
          </span>
          <h1 className="mt-3 text-h3 text-heading">View your appointments</h1>
          <p className="mt-1 text-small text-muted">
            Enter the phone number you used at the clinic. We&rsquo;ll send a code on WhatsApp.
          </p>
        </div>

        <PatientLoginForm next={next} />

        <p className="mt-6 text-center text-small text-muted">
          Not your clinic?{" "}
          <a href="/" className="text-link-hover">Go to home</a>
        </p>
      </div>
    </main>
  );
}
