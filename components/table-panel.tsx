"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import type { Table, Booking, BookingWithTable } from "@/lib/types";
import { getTableStatus } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTable, updateTable, deleteTable } from "@/app/actions/tables";

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-100 border-green-300 text-green-800",
  reserved: "bg-yellow-100 border-yellow-300 text-yellow-800",
  occupied: "bg-red-100 border-red-300 text-red-800",
  "超时": "bg-gray-100 border-gray-300 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "空閒",
  reserved: "已預訂",
  occupied: "使用中",
  "超时": "超時",
};

export function TablePanel() {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const { data } = await supabase.from("tables").select("*");
      return (data as Table[]) || [];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("*, table:tables(*)");
      return (data as BookingWithTable[]) || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("tables-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => {
        qc.invalidateQueries({ queryKey: ["tables"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        qc.invalidateQueries({ queryKey: ["bookings"] });
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

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [tableName, setTableName] = useState("");
  const [tableCapacity, setTableCapacity] = useState(2);

  // Bug 3: confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"create" | "update" | "delete" | null>(null);

  const openConfirm = (action: "create" | "update" | "delete") => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const handleConfirmExecute = async () => {
    if (confirmAction === "delete" && editTable) {
      await deleteTable(editTable.id);
    } else if (confirmAction === "update" && editTable) {
      await updateTable(editTable.id, tableName, tableCapacity);
    } else if (confirmAction === "create") {
      await createTable(tableName, tableCapacity);
      setTableName("");
      setTableCapacity(2);
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setShowAddDialog(false);
    setShowEditDialog(false);
    setEditTable(null);
  };

  const openEdit = (t: Table) => {
    setEditTable(t);
    setTableName(t.name);
    setTableCapacity(t.capacity);
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">桌位管理</h2>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          + 新增桌位
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tables.map((table) => {
          const status = getTableStatus(table, bookings);
          return (
            <Card
              key={table.id}
              className={`cursor-pointer border-2 ${STATUS_COLORS[status]}`}
              onClick={() => openEdit(table)}
            >
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold">{table.name}</div>
                <div className="text-xs mt-1">容納 {table.capacity} 人</div>
                <div className={`mt-2 text-xs font-medium px-2 py-1 rounded ${
                  status === "idle" ? "bg-green-200" :
                  status === "reserved" ? "bg-yellow-200" :
                  status === "occupied" ? "bg-red-200" : "bg-gray-200"
                }`}>
                  {STATUS_LABELS[status]}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增桌位</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>桌位名稱</Label>
              <Input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="例：A1" />
            </div>
            <div>
              <Label>容納人數</Label>
              <Input type="number" min={1} value={tableCapacity} onChange={(e) => setTableCapacity(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={() => openConfirm("create")} disabled={!tableName}>確認新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯桌位 — {editTable?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>桌位名稱</Label>
              <Input value={tableName} onChange={(e) => setTableName(e.target.value)} />
            </div>
            <div>
              <Label>容納人數</Label>
              <Input type="number" min={1} value={tableCapacity} onChange={(e) => setTableCapacity(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={() => openConfirm("delete")}>刪除</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
              <Button onClick={() => openConfirm("update")}>確認儲存</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirm Change Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認變更</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {confirmAction === "create" && (
              <p>即將新增桌位：<strong>{tableName}</strong>（容納 {tableCapacity} 人）</p>
            )}
            {confirmAction === "update" && editTable && (
              <p>即將更新桌位：<strong>{editTable.name}</strong> → <strong>{tableName}</strong><br/>
              容納人數：{editTable.capacity} 人 → {tableCapacity} 人</p>
            )}
            {confirmAction === "delete" && editTable && (
              <p className="text-red-600">即將刪除桌位：<strong>{editTable.name}</strong>（容納 {editTable.capacity} 人）</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>取消</Button>
            <Button onClick={handleConfirmExecute}>確認</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
