import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-h3 text-heading">Sign in to Doctor Kart</h1>
          <p className="mt-1 text-small text-muted">
            Clinic staff access. Patients use the booking link in your reminder.
          </p>
        </div>

        <LoginForm initialError={error} next={next} />

        <p className="mt-6 text-small text-muted">
          Don&apos;t have an account? Ask your clinic admin to invite you.
        </p>
      </div>
    </main>
  );
}
