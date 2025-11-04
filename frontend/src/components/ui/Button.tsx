// src/components/ui/Button.tsx
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "success" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500":
            variant === "default",
          "border border-gray-300 bg-white hover:bg-gray-50 focus:ring-blue-500":
            variant === "outline",
          "bg-transparent hover:bg-gray-100 focus:ring-gray-500":
            variant === "ghost",
          "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500":
            variant === "success",
          "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500":
            variant === "danger",
        },
        {
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
