import { Suspense } from "react";
import { AuthResumeNotice } from "@/components/shared/AuthResumeNotice";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <Suspense fallback={null}>
        <AuthResumeNotice />
      </Suspense>
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
