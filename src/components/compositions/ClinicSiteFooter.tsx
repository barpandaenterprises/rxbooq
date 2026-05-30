import Link from "next/link";

type Props = {
  clinicName: string;
};

export function ClinicSiteFooter({ clinicName }: Props) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-white py-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 px-5 text-[12px] text-muted md:flex-row md:items-center md:justify-between md:px-8">
        <div>© {year} {clinicName}. All rights reserved.</div>
        <div className="flex items-center gap-3">
          <i className="fas fa-lock text-[11px]" />
          Powered by{" "}
          <Link href="https://doctorkart.in" className="text-link-hover no-underline">DoctorKart</Link>
        </div>
      </div>
    </footer>
  );
}
