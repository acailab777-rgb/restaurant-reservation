"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { format as formatDateFn } from "date-fns";
import { bookingsToCSV, downloadBlob } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function ExportBtn() {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const [format, setFormat] = useState<"csv" | "json">("csv");

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings-today"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, table:tables(name)")
        .eq("date", today);
      return data || [];
    },
  });

  const handleExport = () => {
    const dateStr = formatDateFn(new Date(), "yyyy-MM-dd");
    if (format === "csv") {
      const csv = bookingsToCSV(bookings as any[]);
      downloadBlob(csv, `bookings-${dateStr}.csv`);
    } else {
      downloadBlob(JSON.stringify(bookings, null, 2), `bookings-${dateStr}.json`, "application/json");
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Select value={format} onChange={(e) => setFormat(e.target.value as "csv" | "json")}>
        <option value="csv">CSV</option>
        <option value="json">JSON</option>
      </Select>
      <Button size="sm" variant="outline" onClick={handleExport}>
        📥 匯出今日記錄
      </Button>
    </div>
  );
}
