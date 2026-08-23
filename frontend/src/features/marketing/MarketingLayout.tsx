import { Outlet } from "react-router-dom";
import { Header } from "@/features/marketing/Header";
import { Footer } from "@/features/marketing/Footer";

export function MarketingLayout() {
  return (
    <div className="min-h-screen bg-marketing-bg">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}
