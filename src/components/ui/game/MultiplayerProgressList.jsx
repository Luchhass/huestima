export default function MultiplayerProgressList({ items = [], className = "" }) {
  if (!items.length) return null;

  return (
    <div
      className={`w-38 max-w-[calc(100vw-8rem)] space-y-1 text-base font-semibold leading-none text-current ${className}`}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          title={`#${index + 1} ${item.name} ${item.label}`}
          className={`grid grid-cols-[1.7rem_minmax(0,1fr)_2.15rem] items-center gap-1.5 ${
            item.isCurrent ? "text-current/62" : "text-current/34"
          }`}
        >
          <span>#{index + 1}</span>

          <span className="min-w-0 truncate">{item.name}</span>

          <span className="text-right">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
