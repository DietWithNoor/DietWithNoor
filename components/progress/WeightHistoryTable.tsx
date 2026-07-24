import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { WeightLog } from "@/types/index";

export function WeightHistoryTable({ logs }: { logs: WeightLog[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Weight</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{formatDate(log.logged_at)}</TableCell>
            <TableCell className="font-medium">
              {log.weight.toFixed(1)} {log.unit}
            </TableCell>
          </TableRow>
        ))}
        {logs.length === 0 && (
          <TableRow>
            <TableCell colSpan={2} className="text-center text-muted-foreground">
              No entries yet
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
