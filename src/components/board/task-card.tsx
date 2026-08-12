import Link from "next/link";
import {
  AssigneeChip,
  CardBadges,
  PriorityLabel,
} from "@/components/board/card-parts";
import type { BoardTask } from "@/server/queries/tasks";

/**
 * FR37: a Trello-style task card — white, rounded, subtle shadow, with a
 * colored priority label, the title, a badge row (due / description /
 * updates), and the assignee avatar.
 */
export function TaskCard({ task, href }: { task: BoardTask; href: string }) {
  return (
    <Link
      href={href}
      className="trello-card-shadow block rounded-lg bg-white p-2.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <PriorityLabel priority={task.priority} />
      <p className="mt-1.5 text-sm font-medium text-[#172b4d]">{task.title}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <CardBadges
          dueDate={task.due_date}
          status={task.status}
          hasDescription={Boolean(task.description?.trim())}
          updateCount={task.updateCount}
        />
        <AssigneeChip user={task.assignee} />
      </div>
    </Link>
  );
}
