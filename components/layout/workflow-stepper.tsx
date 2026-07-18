import { cn } from "@/lib/utils"

const STEPS = ["Upload", "Map columns", "Generate"]

export function WorkflowStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-3 sm:gap-4 mb-10 overflow-x-auto">
      {STEPS.map((step, i) => {
        const n = i + 1
        const active = n === current
        return (
          <li key={step} className="flex items-center gap-3 sm:gap-4 shrink-0">
            {i > 0 && <span className="hidden sm:block h-px w-16 lg:w-32 bg-border" aria-hidden />}
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "font-mono-ui flex h-7 w-7 items-center justify-center rounded-full text-[11px]",
                  active ? "bg-foreground text-background" : "border border-border text-muted-foreground",
                )}
              >
                {String(n).padStart(2, "0")}
              </span>
              <span className={cn("text-sm", active ? "text-foreground" : "text-muted-foreground")}>{step}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
