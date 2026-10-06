import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "quiet";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border border-ink bg-ink text-surface hover:bg-ink-soft hover:border-ink-soft",
  secondary: "border border-ink bg-transparent text-ink hover:bg-ink hover:text-surface",
  quiet: "border border-transparent bg-transparent text-ink underline underline-offset-4",
};

export function buttonClasses(variant: ButtonVariant = "secondary", fullWidth = false): string {
  return cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-6 label-caps",
    "transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    fullWidth && "w-full",
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; fullWidth?: boolean };

export function Button({ variant, fullWidth, className, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cx(buttonClasses(variant, fullWidth), className)} {...props} />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: ReactNode;
};

export function ButtonLink({ variant, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={cx(buttonClasses(variant, fullWidth), className)} {...props} />;
}
