"use client";
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputCls =
  "glass-field w-full h-11 rounded-2xl border-[rgb(var(--tint)/0.09)] px-4 text-[14px] text-(--tx1) placeholder:text-(--tx4) outline-none transition hover:border-[rgb(var(--tint)/0.14)] focus:border-[#7c5cff]/60 focus:bg-[rgb(var(--tint)/0.08)] focus:ring-4 focus:ring-[#7c5cff]/10";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref} className={cn(inputCls, className)} {...p} />
  )
);
Input.displayName = "Input";

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={cn(inputCls, "pr-11", props.className)} />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-lg text-(--tx3) hover:text-(--tx1) hover:bg-[rgb(var(--tint)/0.10)] transition"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea
      ref={ref}
      className={cn(inputCls, "h-auto min-h-[96px] py-3 resize-y", className)}
      {...p}
    />
  )
);
Textarea.displayName = "Textarea";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-(--tx2)">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-[12.5px] text-[#fb7185]">{error}</span>}
    </label>
  );
}
