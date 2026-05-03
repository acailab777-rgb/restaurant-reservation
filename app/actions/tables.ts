"use server";

import { createClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

export async function getTables() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tables")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createTable(name: string, capacity: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tables")
    .insert({ id: uuidv4(), name, capacity, status: "idle" })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function updateTable(id: string, name: string, capacity: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tables")
    .update({ name, capacity })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function deleteTable(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tables").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}
