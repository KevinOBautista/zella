import { Suspense } from "react";
import { AuthResumeNotice } from "@/components/shared/AuthResumeNotice";
import { Footer } from "@/components/layout/Footer";

/**
 * The landing page draws its own navigation over the hero photograph, so it
 * lives outside the (public) group's sticky SiteHeader. Every other public
 * page keeps the shared header.
 */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <AuthResumeNotice />
      </Suspense>
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
