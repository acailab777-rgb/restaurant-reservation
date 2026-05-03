"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { addHours } from "date-fns";

export async function getBookings(date?: string) {
  const supabase = createClient();
  let query = supabase
    .from("bookings")
    .select("*, table:tables(*)")
    .order("start_time", { ascending: true });

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await supabase.from("bookings").select("*, table:tables(*)").order("start_time", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createBooking(formData: {
  customer_name: string;
  phone: string;
  party_size: number;
  type: "walk-in" | "reservation";
  date: string;
  start_time: string;
  assigned_table_id?: string | null;
  purpose?: string;
}) {
  const supabase = createClient();
  const startTime = new Date(`${formData.date}T${formData.start_time}`);
  const endTime = addHours(startTime, 2);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      id: uuidv4(),
      customer_name: formData.customer_name,
      phone: formData.phone,
      party_size: formData.party_size,
      type: formData.type,
      date: formData.date,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      assigned_table_id: formData.assigned_table_id ?? null,
      status: "waiting",
      purpose: formData.purpose ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function updateBookingStatus(
  id: string,
  status: "waiting" | "seated" | "completed" | "cancelled",
  assignedTableId?: string | null
) {
  const supabase = createClient();
  const updates: Record<string, unknown> = { status };
  if (assignedTableId !== undefined) {
    updates.assigned_table_id = assignedTableId;
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function cancelBooking(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function assignTable(bookingId: string, tableId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ assigned_table_id: tableId, status: "seated" })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function returnToWaitlist(bookingId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ assigned_table_id: null, status: "waiting" })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function completeBooking(id: string) {
  return updateBookingStatus(id, "completed");
}
