"use client";

export default function BlendComposition({ color, className = "" }) {
  const sources = Array.isArray(color?.sources) ? color.sources.slice(0, 3) : [];

  if (sources.length < 3) return null;

  return (
    <div className={`isolate relative h-[14rem] w-[16rem] sm:h-[16rem] sm:w-[18rem] ${className}`}>
      <span
        className="absolute top-0 left-[3.5rem] size-[9rem] rounded-full border-[3px] sm:left-14 sm:size-[11rem] sm:border-4"
        style={{
          backgroundColor: sources[0].hex,
          borderColor: sources[0].hex,
          mixBlendMode: "screen",
        }}
      />
      <span
        className="absolute top-20 left-0 size-[9rem] rounded-full border-[3px] sm:size-[11rem] sm:border-4"
        style={{
          backgroundColor: sources[1].hex,
          borderColor: sources[1].hex,
          mixBlendMode: "screen",
        }}
      />
      <span
        className="absolute top-20 left-28 size-[9rem] rounded-full border-[3px] sm:size-[11rem] sm:border-4"
        style={{
          backgroundColor: sources[2].hex,
          borderColor: sources[2].hex,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
