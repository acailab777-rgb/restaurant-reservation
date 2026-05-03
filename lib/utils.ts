import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Booking, Table, TableStatus } from "./types";
import { addHours, isBefore, isAfter, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTableStatus(table: Table, bookings: Booking[]): TableStatus {
  const now = new Date();
  const tableBookings = bookings.filter(
    (b) => b.assigned_table_id === table.id && b.status === "seated"
  );

  if (tableBookings.length === 0) {
    const hasUpcoming = bookings.some(
      (b) =>
        b.assigned_table_id === table.id &&
        b.status === "waiting" &&
        isBefore(parseISO(b.start_time), addHours(now, 2))
    );
    return hasUpcoming ? "reserved" : "idle";
  }

  const activeBooking = tableBookings.find((b) =>
    isAfter(parseISO(b.end_time), now)
  );
  if (activeBooking) return "occupied";
  return "超时";
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatCountdown(endTime: string): string {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "00:00:00";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return [hours, minutes, seconds]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

export function getWaitDuration(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diff = now.getTime() - created.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function isPastDateTime(date: string, time: string): boolean {
  const selected = new Date(`${date}T${time}`);
  return isBefore(selected, new Date());
}

export function bookingsToCSV(bookings: Booking[]): string {
  const headers = [
    "ID",
    "Customer Name",
    "Phone",
    "Party Size",
    "Type",
    "Date",
    "Start Time",
    "End Time",
    "Table ID",
    "Status",
    "Purpose",
  ];
  const rows = bookings.map((b) => [
    b.id,
    b.customer_name,
    b.phone,
    b.party_size.toString(),
    b.type,
    b.date,
    b.start_time,
    b.end_time,
    b.assigned_table_id ?? "",
    b.status,
    b.purpose ?? "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadBlob(content: string, filename: string, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
