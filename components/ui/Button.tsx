import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles = {
    primary:
      "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
    ghost:
      "bg-transparent text-[var(--foreground)] hover:bg-black/5 border border-[var(--border)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
  }[variant];

  return (
    <button className={`${base} ${styles} ${className}`} {...props} />
  );
}
