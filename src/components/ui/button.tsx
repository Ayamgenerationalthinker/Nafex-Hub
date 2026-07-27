import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-poppins font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A1B9A] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[#6A1B9A] text-white hover:bg-[#5B1687] shadow-sm font-semibold",
        primary:
          "bg-[#6A1B9A] text-white hover:bg-[#5B1687] shadow-sm font-semibold",
        secondary:
          "bg-[#D4A017] text-white hover:bg-[#B88A12] shadow-sm font-semibold",
        outline:
          "border-2 border-[#6A1B9A] text-[#6A1B9A] bg-transparent hover:bg-[#F6F2FF] font-semibold",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        ghost:
          "text-[#222222] hover:bg-[#F6F2FF] hover:text-[#6A1B9A]",
        link:
          "text-[#6A1B9A] underline-offset-4 hover:underline font-semibold",
      },
      size: {
        default: "min-h-10 px-5 py-2.5 text-sm",
        sm: "min-h-8 rounded-lg px-3 text-xs",
        lg: "min-h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
