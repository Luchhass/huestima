"use client";

export default function HintIcon({
  className = "size-4",
  strokeWidth = 1.9,
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.35 14.7c-.82-.73-1.35-1.78-1.35-3.03a5 5 0 1 1 10 0c0 1.25-.53 2.3-1.35 3.03-.63.56-1 1.12-1.15 1.8h-4c-.15-.68-.52-1.24-1.15-1.8Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.8h4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M10.85 20.75h2.3"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M12 9.2v2.55"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
