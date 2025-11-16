import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function PrimaryButton({ children, ...rest }: PrimaryButtonProps) {
  return (
    <button className="button-primary" {...rest}>
      {children}
    </button>
  );
}
