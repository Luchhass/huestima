"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";

const CardCloseButton = forwardRef(function CardCloseButton({
  onClick,
  label,
  className = "",
  disabled = false,
  iconClassName = "",
  href = null,
  ...props
}, ref) {
  const classNameValue = `app-close-button solo-close-button grid place-items-center rounded-full text-white transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:pointer-events-none disabled:opacity-50 ${className}`;

  if (href) {
    return (
      <Link ref={ref} href={href} onClick={onClick} aria-label={label} className={classNameValue} {...props}>
        <X className={`size-6 sm:size-[26px] ${iconClassName}`} strokeWidth={1.8} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={classNameValue}
      ref={ref}
      {...props}
    >
      <X className={`size-6 sm:size-[26px] ${iconClassName}`} strokeWidth={1.8} />
    </button>
  );
});

export default CardCloseButton;
