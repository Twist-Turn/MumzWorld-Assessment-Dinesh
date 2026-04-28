"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VAR: Record<Variant, string> = {
  primary: "bg-brand-600 text-white shadow-sm shadow-brand-900/20 hover:bg-brand-700",
  secondary: "bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-200 shadow-sm",
  ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100",
  danger: "bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700",
};
const SIZ: Record<Size, string> = {
  sm: "min-h-9 text-sm px-3 py-1.5 rounded-md",
  md: "min-h-11 text-sm px-4 py-2 rounded-md",
  lg: "min-h-12 text-base px-5 py-3 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, Props>(({ variant = "primary", size = "md", className, ...rest }, ref) => (
  <button ref={ref} className={cn("inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", VAR[variant], SIZ[size], className)} {...rest} />
));
Button.displayName = "Button";
