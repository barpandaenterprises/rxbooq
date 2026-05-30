import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { NewCouponForm } from "@/components/compositions/NewCouponForm";

export const metadata = { title: "New coupon" };

export default function NewCouponPage() {
  return (
    <SuperAdminLayout active="Coupons">
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="mb-1 text-[22px] font-semibold text-heading">New coupon</h1>
        <p className="mb-5 text-[13px] text-muted">
          Code activates immediately. Disable from the list when retiring.
        </p>
        <NewCouponForm />
      </div>
    </SuperAdminLayout>
  );
}
