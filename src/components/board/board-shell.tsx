import type { ReactNode } from "react";

/**
 * FR41/Trello look: full-bleed blue board surface. Breaks out of the padded
 * `main` container (w-screen + centering trick) so the board reaches the
 * viewport edges like Trello, and cancels main's vertical padding.
 */
export function BoardShell({ children }: { children: ReactNode }) {
  return (
    <div className="trello-board relative left-1/2 -mt-8 -mb-8 min-h-[calc(100vh-3.5rem)] w-screen -translate-x-1/2 px-4 py-6 sm:px-6">
      {children}
    </div>
  );
}
