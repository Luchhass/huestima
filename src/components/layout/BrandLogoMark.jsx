export default function BrandLogoMark({
  className = "size-9",
  centerClassName = "size-4",
  hollow = false,
}) {
  return (
    <span
      className={[
        "relative grid place-items-center rounded-full",
        className,
      ].join(" ")}
    >
      <span
        className="gradient-icon-flow absolute inset-0 rounded-full opacity-95"
      />
      <span
        className={[
          "relative rounded-full",
          hollow ? "bg-black" : "bg-background shadow-inner",
          centerClassName,
        ].join(" ")}
      />
    </span>
  );
}
