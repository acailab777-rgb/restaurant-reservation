import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";

export const metadata: Metadata = {
  title: "餐廳訂位管理",
  description: "Restaurant Reservation Management Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        <QueryProvider>
          <SupabaseProvider>
            {children}
          </SupabaseProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
