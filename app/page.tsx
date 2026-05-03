"use client";

import { TablePanel } from "@/components/table-panel";
import { Waitlist } from "@/components/waitlist";
import { ReservationForm } from "@/components/reservation-form";
import { ExportBtn } from "@/components/export-btn";
import { Timer } from "@/components/timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { Booking, Table } from "@/lib/types";

export default function DashboardPage() {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-timer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("date", today)
        .eq("status", "seated");
      return (data as Booking[]) || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {})
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">🍽️ 餐廳訂位管理</h1>
          <p className="text-xs text-muted-foreground">{format(now, "yyyy-MM-dd HH:mm:ss")}</p>
        </div>
        <ExportBtn />
      </header>

      {/* Active Timers */}
      {bookings.length > 0 && (
        <div className="bg-red-50 border-b px-4 py-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-red-700">計時中：</span>
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-1 bg-white border rounded px-2 py-1 text-xs">
                <span>{b.customer_name}</span>
                <Timer endTime={b.end_time} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <main className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Table Panel */}
        <div className="lg:col-span-2">
          <TablePanel />
        </div>

        {/* Right: Reservation Form */}
        <div>
          <ReservationForm />
        </div>

        {/* Bottom: Waitlist */}
        <div className="lg:col-span-3">
          <Waitlist />
        </div>
      </main>
    </div>
  );
}
