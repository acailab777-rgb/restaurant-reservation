"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function Timer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatCountdown(endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <Badge variant="outline" className="font-mono text-xs">
      {timeLeft}
    </Badge>
  );
}
