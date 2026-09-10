"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordField({
  id,
  name,
  autoComplete,
  required,
  className,
}: {
  id: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        className={cn("pr-24", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] font-medium text-indigo-dark"
      >
        {visible ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
}
