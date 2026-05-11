"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import type { Booking, Table } from "@/lib/types";
import { getWaitDuration } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createBooking, assignTable, returnToWaitlist, completeBooking } from "@/app/actions/bookings";

export function Waitlist() {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, table:tables(*)")
        .order("created_at", { ascending: true });
      return (data as (Booking & { table?: Table})[]) || [];
    },
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("*");
      return (data as Table[]) || [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("waitlist-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["bookings"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => {
        qc.invalidateQueries({ queryKey: ["tables"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, qc]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const waitingList = bookings.filter((b) => b.type === "walk-in" && b.status === "waiting");
  const seatedList = bookings.filter((b) => b.type === "walk-in" && b.status === "seated");

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignBooking, setAssignBooking] = useState<Booking | null>(null);
  const [selectedTable, setSelectedTable] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);

  const handleAdd = async () => {
    const today = new Date().toISOString().split("T")[0];
    await createBooking({
      customer_name: customerName,
      phone,
      party_size: partySize,
      type: "walk-in",
      date: today,
      start_time: new Date().toTimeString().slice(0, 5),
    });
    setShowAddDialog(false);
    setCustomerName("");
    setPhone("");
    setPartySize(2);
  };

  const handleAssign = async () => {
    if (!assignBooking || !selectedTable) return;

    const table = tables.find((t) => t.id === selectedTable);
    if (table && assignBooking.party_size > table.capacity) {
      alert(`此桌位容納人數為 ${table.capacity} 人，無法容納 ${assignBooking.party_size} 人。`);
      return;
    }

    await assignTable(assignBooking.id, selectedTable);
    setShowAssignDialog(false);
    setAssignBooking(null);
    setSelectedTable("");
  };

  const openAssign = (booking: Booking) => {
    setAssignBooking(booking);
    setShowAssignDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">現場候位</h2>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          + 新增候位
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Waiting */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">等候中 ({waitingList.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {waitingList.length === 0 ? (
              <p className="text-sm text-muted-foreground">目前無等候中的客人</p>
            ) : (
              waitingList.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div>
                    <div className="font-medium">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{b.phone} · {b.party_size}人</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      等候 {getWaitDuration(b.created_at)}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openAssign(b)}>安排桌位</Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Seated */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">已入座 ({seatedList.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {seatedList.length === 0 ? (
              <p className="text-sm text-muted-foreground">目前無已入座客人</p>
            ) : (
              seatedList.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                  <div>
                    <div className="font-medium">{b.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{b.table?.name ?? "未分配"} · {b.party_size}人</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => returnToWaitlist(b.id)}>退回</Button>
                    <Button size="sm" variant="secondary" onClick={() => completeBooking(b.id)}>完成</Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Waitlist Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增候位</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>姓名</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="輸入姓名" />
            </div>
            <div>
              <Label>電話</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="輸入電話" />
            </div>
            <div>
              <Label>人數</Label>
              <Input type="number" min={1} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAdd}>新增候位</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Table Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>安排桌位 — {assignBooking?.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>選擇桌位</Label>
              <Select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                <option value="">— 選擇桌位 —</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (容納 {t.capacity} 人)
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>取消</Button>
            <Button onClick={handleAssign} disabled={!selectedTable}>確認入座</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
