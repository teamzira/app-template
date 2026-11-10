import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Mirrors AlloyAlert: an inline banner on a tinted surface, not a floating card, with the
// leading icon set in a 32px chip. The status tokens in globals.css flip for dark mode.
const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0 rounded-lg border px-3 py-2.5 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*8)_1fr] has-[>svg]:gap-x-3 [&>svg]:row-span-2 [&>svg]:size-8 [&>svg]:self-center [&>svg]:rounded-button [&>svg]:p-1.5",
  {
    variants: {
      variant: {
        default:
          "border-border bg-muted text-foreground *:data-[slot=alert-description]:text-(--color-content-secondary) [&>svg]:bg-accent [&>svg]:text-muted-foreground",
        info: "border-(--color-info-border) bg-(--color-info-bg) text-(--color-info-content) [&>svg]:bg-(--color-info-content)/10",
        success:
          "border-(--color-success-border) bg-(--color-success-bg) text-(--color-success-content) [&>svg]:bg-(--color-success-content)/10",
        warning:
          "border-(--color-warning-border) bg-(--color-warning-bg) text-(--color-warning-content) [&>svg]:bg-(--color-warning-content)/10",
        destructive:
          "border-(--color-error-border) bg-(--color-error-bg) text-(--color-error-content) [&>svg]:bg-(--color-error-content)/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>

// Errors and warnings interrupt; the rest are announced politely, as in AlloyAlert.
const ASSERTIVE: ReadonlySet<AlertVariant> = new Set(["warning", "destructive"])

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const assertive = ASSERTIVE.has(variant ?? "default")
  return (
    <div
      data-slot="alert"
      data-variant={variant ?? "default"}
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? undefined : "polite"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 font-medium leading-5", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm leading-5 [&_p]:leading-5",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
