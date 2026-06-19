"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordInput } from "@/components/molecules/PasswordInput";
import { signInWithPassword } from "./actions";

const loginSchema = z.object({
  email:    z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ initialError, next }: { initialError?: string; next?: string }) {
  const [serverError, setServerError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver:      zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode:          "onBlur",
  });

  const onSubmit = (values: LoginValues) => {
    setServerError(null);
    const fd = new FormData();
    fd.set("email", values.email);
    fd.set("password", values.password);
    if (next) fd.set("next", next);
    startTransition(() => {
      // On success the server action calls redirect(), which throws a special
      // NEXT_REDIRECT "error" the framework catches to navigate — we must let
      // that propagate. On failure it RETURNS { error }, which we render inline.
      signInWithPassword(fd)
        .then((res) => {
          if (res && "error" in res && res.error) setServerError(res.error);
        })
        .catch((err: unknown) => {
          if (isNextRedirectError(err)) throw err;
          setServerError(err instanceof Error ? err.message : "Sign-in failed");
        });
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-small text-danger"
        >
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-small font-medium text-body">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className={inputCls(!!errors.email)}
        />
        {errors.email && (
          <p role="alert" className="mt-1 text-[12px] text-danger">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-small font-medium text-body">
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          {...register("password")}
          className={inputCls(!!errors.password)}
        />
        {errors.password && (
          <p role="alert" className="mt-1 text-[12px] text-danger">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={
          "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-small font-medium text-brand-fg shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 " +
          (isPending ? "cursor-not-allowed opacity-60" : "")
        }
      >
        {isPending ? (
          <>
            <i className="fas fa-spinner fa-spin text-[12px]" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}

function inputCls(hasError: boolean): string {
  const base =
    "mt-1 block w-full rounded-md border bg-surface px-3 py-2 text-body shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";
  return hasError ? `${base} border-danger focus:border-danger focus:ring-danger` : `${base} border-border`;
}

// Detects the special "error" Next.js throws from a Server Action's
// `redirect()` call. The shape is { message: "NEXT_REDIRECT", digest: "..." }.
function isNextRedirectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: unknown; digest?: unknown };
  if (typeof e.message === "string" && e.message === "NEXT_REDIRECT") return true;
  if (typeof e.digest === "string" && e.digest.startsWith("NEXT_REDIRECT")) return true;
  return false;
}
