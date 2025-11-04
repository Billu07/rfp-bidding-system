// frontend/src/components/NavLink.tsx
import React from "react";
import { Link, useMatch, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils"; // Optional: if using shadcn/ui or clsx
import { ChevronRight } from "lucide-react";

interface NavLinkProps extends Omit<LinkProps, "to"> {
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  showIndicator?: boolean;
  exact?: boolean;
  end?: boolean;
}

export default function NavLink({
  to,
  children,
  className = "",
  activeClassName = "text-blue-600 font-semibold",
  inactiveClassName = "text-gray-600 hover:text-gray-900",
  showIndicator = false,
  exact = false,
  end = false,
  ...props
}: NavLinkProps) {
  // Use useMatch for precise path matching
  const match = useMatch({
    path: to,
    end: exact || end,
  });

  const isActive = !!match;

  // Optional: animate indicator
  const indicator = showIndicator && isActive && (
    <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" />
  );

  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 group",
        isActive ? activeClassName : inactiveClassName,
        className
      )}
      aria-current={isActive ? "page" : undefined}
      {...props}
    >
      <span className="relative">
        {children}
        {isActive && (
          <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
        )}
      </span>
      {indicator}
    </Link>
  );
}
