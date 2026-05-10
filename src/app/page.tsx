import { PublicSiteLayout } from "@/components/layouts/PublicSiteLayout";
import { Hero } from "@/components/compositions/Hero";
import { ServicesStrip } from "@/components/compositions/ServicesStrip";
import { WhyUsSection } from "@/components/compositions/WhyUsSection";
import { DoctorSection } from "@/components/compositions/DoctorSection";
import { TestimonialsCarousel } from "@/components/compositions/TestimonialsCarousel";
import { BrandCtaStrip } from "@/components/compositions/BrandCtaStrip";
import { ContactPanel } from "@/components/compositions/ContactPanel";

export default function Home() {
  return (
    <PublicSiteLayout>
      <Hero />
      <ServicesStrip />
      <WhyUsSection />
      <DoctorSection />
      <TestimonialsCarousel />
      <BrandCtaStrip />
      <ContactPanel />
    </PublicSiteLayout>
  );
}
