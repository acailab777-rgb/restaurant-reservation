"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { isPastDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBooking } from "@/app/actions/bookings";

export function ReservationForm() {
  const supabase = createClient();

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("*");
      return data || [];
    },
  });

  const today = new Date().toISOString().split("T")[0];
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("12:00");
  const [purpose, setPurpose] = useState("");
  const [assignedTableId, setAssignedTableId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isPast = date === today && time ? isPastDateTime(date, time) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPast) return;
    setSubmitting(true);
    try {
      await createBooking({
        customer_name: customerName,
        phone,
        party_size: partySize,
        type: "reservation",
        date,
        start_time: time,
        assigned_table_id: assignedTableId || null,
        purpose: purpose || undefined,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setCustomerName("");
      setPhone("");
      setPartySize(2);
      setPurpose("");
      setAssignedTableId("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>預訂訂位</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>姓名 *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div>
              <Label>電話 *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>日期 *</Label>
              <Input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>時間 *</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
              {isPast && <p className="text-xs text-red-500 mt-1">時間已過</p>}
            </div>
            <div>
              <Label>人數 *</Label>
              <Input type="number" min={1} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} required />
            </div>
          </div>

          <div>
            <Label>指定桌位（可選）</Label>
            <Select value={assignedTableId} onChange={(e) => setAssignedTableId(e.target.value)}>
              <option value="">自動分配</option>
              {tables.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} (容納 {t.capacity} 人)
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>用途（可選）</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="例：生日聚會、商務餐敘" />
          </div>

          {success && (
            <p className="text-sm text-green-600">✓ 訂位已建立</p>
          )}

          <Button type="submit" disabled={submitting || isPast} className="w-full">
            {submitting ? "建立中…" : "建立訂位"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
