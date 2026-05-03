export type TableStatus = "idle" | "reserved" | "occupied" | "超时";
export type BookingStatus = "waiting" | "seated" | "completed" | "cancelled";
export type BookingType = "walk-in" | "reservation";

export interface Table {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_name: string;
  phone: string;
  party_size: number;
  type: BookingType;
  date: string;
  start_time: string;
  end_time: string;
  assigned_table_id: string | null;
  status: BookingStatus;
  purpose: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithTable extends Booking {
  table?: Table;
}
