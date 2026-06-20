import { useId } from "react";
import { getFlagOption } from "@/lib/flags";

const WHITE = "#ffffff";
const BLACK = "#000000";
const FLAG_WIDTH = 300;
const FLAG_HEIGHT = 200;
const THIRD_WIDTH = FLAG_WIDTH / 3;
const THIRD_HEIGHT = FLAG_HEIGHT / 3;
const FLAG_ASSET_BASE = "/flag-assets/emblems";

function starPoints(cx, cy, outerRadius, innerRadius, points = 5, rotation = -90) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = ((rotation + index * (180 / points)) * Math.PI) / 180;

    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(" ");
}

function UnionJack({
  instanceId,
  x = 0,
  y = 0,
  width = FLAG_WIDTH,
  height = FLAG_HEIGHT,
  blue = "#012169",
  white = WHITE,
  red = "#c8102e",
  editableSlots = [],
  areaProps = () => ({}),
}) {
  const clipAllId = `${instanceId}-uj-all`;
  const clipSaltireId = `${instanceId}-uj-saltire`;
  const editableProps = (slotId) =>
    editableSlots.includes(slotId) ? areaProps(slotId) : {};

  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox="0 0 6 3"
      preserveAspectRatio="none"
      overflow="hidden"
    >
      <defs>
        <clipPath id={clipAllId}>
          <path d="M0 0h6v3H0z" />
        </clipPath>
        <clipPath id={clipSaltireId}>
          <path d="M0 0v1.5h6V3zm6 0H3v3H0z" />
        </clipPath>
      </defs>

      <path d="M0 0h6v3H0z" fill={blue} {...editableProps("blue")} />
      <path
        d="m0 0 6 3m0-3L0 3"
        stroke={white}
        strokeWidth="0.6"
        clipPath={`url(#${clipAllId})`}
        {...editableProps("white")}
      />
      <path
        d="m0 0 6 3m0-3L0 3"
        stroke={red}
        strokeWidth="0.4"
        clipPath={`url(#${clipSaltireId})`}
        {...editableProps("red")}
      />
      <path
        d="M3 0v3M0 1.5h6"
        stroke={white}
        strokeWidth="1"
        {...editableProps("white")}
      />
      <path
        d="M3 0v3M0 1.5h6"
        stroke={red}
        strokeWidth="0.6"
        {...editableProps("red")}
      />
    </svg>
  );
}

function UsaStars() {
  const cantonWidth = 123;
  const cantonHeight = (FLAG_HEIGHT / 13) * 7;
  const rows = Array.from({ length: 9 }, (_, rowIndex) => rowIndex);

  return (
    <g>
      {rows.map((rowIndex) => {
        const count = rowIndex % 2 === 0 ? 6 : 5;
        const y = ((rowIndex + 0.6) * cantonHeight) / 9;

        return Array.from({ length: count }, (_, columnIndex) => {
          const x =
            rowIndex % 2 === 0
              ? ((columnIndex + 0.7) * cantonWidth) / 6
              : ((columnIndex + 1.2) * cantonWidth) / 6;

          return (
            <polygon
              key={`${rowIndex}-${columnIndex}`}
              points={starPoints(x, y, 3.2, 1.35)}
              fill={WHITE}
            />
          );
        });
      })}
    </g>
  );
}

function MapleLeaf({ fill }) {
  return (
    <svg
      x="100"
      y="40"
      width="100"
      height="120"
      viewBox="-2015 -2000 4030 4030"
      overflow="visible"
      pointerEvents="none"
    >
      <path
        fill={fill}
        d="m-90 2030 45-863a95 95 0 0 0-111-98l-859 151 116-320a65 65 0 0 0-20-73l-941-762 212-99a65 65 0 0 0 34-79l-186-572 542 115a65 65 0 0 0 73-38l105-247 423 454a65 65 0 0 0 111-57l-204-1052 327 189a65 65 0 0 0 91-27l332-652 332 652a65 65 0 0 0 91 27l327-189-204 1052a65 65 0 0 0 111 57l423-454 105 247a65 65 0 0 0 73 38l542-115-186 572a65 65 0 0 0 34 79l212 99-941 762a65 65 0 0 0-20 73l116 320-859-151a95 95 0 0 0-111 98l45 863z"
      />
    </svg>
  );
}

function FlagAsset({
  href,
  x = 0,
  y = 0,
  width = FLAG_WIDTH,
  height = FLAG_HEIGHT,
  preserveAspectRatio = "none",
}) {
  return (
    <image
      href={href}
      x={x}
      y={y}
      width={width}
      height={height}
      preserveAspectRatio={preserveAspectRatio}
      pointerEvents="none"
    />
  );
}

function VerticalThirds({ left, middle, right, areaProps }) {
  return (
    <>
      <rect x="0" y="0" width={THIRD_WIDTH} height={FLAG_HEIGHT} fill={left.fill} {...areaProps(left.id)} />
      <rect x={THIRD_WIDTH} y="0" width={THIRD_WIDTH} height={FLAG_HEIGHT} fill={middle.fill} {...areaProps(middle.id)} />
      <rect x={THIRD_WIDTH * 2} y="0" width={FLAG_WIDTH - THIRD_WIDTH * 2} height={FLAG_HEIGHT} fill={right.fill} {...areaProps(right.id)} />
    </>
  );
}

function FlagMotif({
  motif,
  slots,
  activeSlotId,
  isInteractive,
  onSlotSelect,
  instanceId,
}) {
  const slotHex = (slotId, fallback = "#000000") =>
    slots.find((slotColor) => slotColor.id === slotId)?.hex || fallback;
  const pulseSlot = (target, slotId) => {
    const slotTargets = target.ownerSVGElement?.querySelectorAll(
      `[data-flag-slot-id="${slotId}"]`,
    ) || [target];

    slotTargets.forEach((slotTarget) => {
      slotTarget.classList.remove("flag-slot-area--pulse");
      slotTarget.getBoundingClientRect();
      slotTarget.classList.add("flag-slot-area--pulse");
      slotTarget.addEventListener(
        "animationend",
        () => slotTarget.classList.remove("flag-slot-area--pulse"),
        { once: true },
      );
    });
  };
  const areaProps = (slotId) => {
    if (!isInteractive || !slotId) return {};

    return {
      className: "flag-slot-area cursor-pointer pointer-events-auto",
      "data-flag-slot-id": slotId,
      role: "button",
      tabIndex: 0,
      onClick: (event) => {
        event.stopPropagation();
        pulseSlot(event.currentTarget, slotId);
        onSlotSelect?.(slotId);
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        pulseSlot(event.currentTarget, slotId);
        onSlotSelect?.(slotId);
      },
    };
  };
  const activeOutline = (slotId) => {
    if (!isInteractive || activeSlotId !== slotId) return null;

    return null;
  };
  const chinaStarId = `${instanceId}-china-star`;
  const bosniaClipId = `${instanceId}-bosnia-clip`;

  switch (motif) {
    case "turkey":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <circle cx="126" cy="100" r="50" fill={WHITE} />
          <circle cx="144" cy="100" r="40" fill={slotHex("red")} />
          <polygon points={starPoints(190, 100, 25, 10.2, 5, -90)} fill={WHITE} />
          {activeOutline("red")}
        </>
      );
    case "united-states": {
      const stripeHeight = FLAG_HEIGHT / 13;

      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          {Array.from({ length: 13 }, (_, index) =>
            index % 2 === 1 ? (
              <rect
                key={index}
                x="0"
                y={index * stripeHeight}
                width={FLAG_WIDTH}
                height={stripeHeight}
                fill={slotHex("white", WHITE)}
                {...areaProps("white")}
              />
            ) : null,
          )}
          <rect x="0" y="0" width="123" height={stripeHeight * 7} fill={slotHex("blue")} {...areaProps("blue")} />
          <UsaStars />
          {activeOutline(activeSlotId)}
        </>
      );
    }
    case "united-kingdom":
      return (
        <UnionJack
          instanceId={instanceId}
          width={FLAG_WIDTH}
          height={FLAG_HEIGHT}
          blue={slotHex("blue")}
          white={slotHex("white", WHITE)}
          red={slotHex("red")}
          editableSlots={["blue", "white", "red"]}
          areaProps={areaProps}
        />
      );
    case "germany":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("black", BLACK)} {...areaProps("black")} />
          <rect x="0" y={FLAG_HEIGHT / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="0" y={FLAG_HEIGHT * 2 / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("yellow")} {...areaProps("yellow")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "france":
      return (
        <>
          <VerticalThirds
            left={{ id: "blue", fill: slotHex("blue") }}
            middle={{ id: "white", fill: slotHex("white", WHITE) }}
            right={{ id: "red", fill: slotHex("red") }}
            areaProps={areaProps}
          />
          {activeOutline(activeSlotId)}
        </>
      );
    case "italy":
      return (
        <>
          <VerticalThirds
            left={{ id: "green", fill: slotHex("green") }}
            middle={{ id: "white", fill: slotHex("white", WHITE) }}
            right={{ id: "red", fill: slotHex("red") }}
            areaProps={areaProps}
          />
          {activeOutline(activeSlotId)}
        </>
      );
    case "spain":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("yellow")} {...areaProps("yellow")} />
          <rect x="0" y="0" width={FLAG_WIDTH} height="50" fill={slotHex("red")} {...areaProps("red")} />
          <rect x="0" y="150" width={FLAG_WIDTH} height="50" fill={slotHex("red")} {...areaProps("red")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/es.svg`} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "russia":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y={FLAG_HEIGHT / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("blue")} {...areaProps("blue")} />
          <rect x="0" y={FLAG_HEIGHT * 2 / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("red")} {...areaProps("red")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "ukraine":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height="100" fill={slotHex("blue")} {...areaProps("blue")} />
          <rect x="0" y="100" width={FLAG_WIDTH} height="100" fill={slotHex("yellow")} {...areaProps("yellow")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "japan":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <circle cx="150" cy="100" r="48" fill={slotHex("red")} {...areaProps("red")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "china":
      return (
        <svg viewBox="0 0 640 480" width={FLAG_WIDTH} height={FLAG_HEIGHT} preserveAspectRatio="none">
          <defs>
            <path id={chinaStarId} fill="#ff0" d="M-.6.8 0-1 .6.8-1-.3h2z" />
          </defs>
          <path fill={slotHex("red")} d="M0 0h640v480H0z" {...areaProps("red")} />
          <use href={`#${chinaStarId}`} transform="matrix(71.9991 0 0 72 120 120)" />
          <use href={`#${chinaStarId}`} transform="matrix(-12.33562 -20.5871 20.58684 -12.33577 240.3 48)" />
          <use href={`#${chinaStarId}`} transform="matrix(-3.38573 -23.75998 23.75968 -3.38578 288 95.8)" />
          <use href={`#${chinaStarId}`} transform="matrix(6.5991 -23.0749 23.0746 6.59919 288 168)" />
          <use href={`#${chinaStarId}`} transform="matrix(14.9991 -18.73557 18.73533 14.99929 240 216)" />
          {activeOutline("red")}
        </svg>
      );
    case "canada":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="75" y="0" width="150" height={FLAG_HEIGHT} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <MapleLeaf fill={slotHex("red")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "brazil":
      return (
        <svg viewBox="0 0 640 480" width={FLAG_WIDTH} height={FLAG_HEIGHT} preserveAspectRatio="none">
          <path fill={slotHex("green")} d="M0 0h640v480H0z" {...areaProps("green")} />
          <path fill={slotHex("yellow")} d="m321.4 436 301.5-195.7L319.6 44 17.1 240.7z" {...areaProps("yellow")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/br.svg`} width={640} height={480} />
          {activeOutline(activeSlotId)}
        </svg>
      );
    case "argentina":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("blue")} {...areaProps("blue")} />
          <rect x="0" y={FLAG_HEIGHT / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/ar.svg`} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "australia":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("blue")} {...areaProps("blue")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/au.svg`} />
          {activeOutline("blue")}
        </>
      );
    case "netherlands":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="0" y={FLAG_HEIGHT / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y={FLAG_HEIGHT * 2 / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("blue")} {...areaProps("blue")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "belgium":
      return (
        <>
          <VerticalThirds
            left={{ id: "black", fill: slotHex("black", BLACK) }}
            middle={{ id: "yellow", fill: slotHex("yellow") }}
            right={{ id: "red", fill: slotHex("red") }}
            areaProps={areaProps}
          />
          {activeOutline(activeSlotId)}
        </>
      );
    case "switzerland":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <svg viewBox="0 0 640 480" width={FLAG_WIDTH} height={FLAG_HEIGHT} preserveAspectRatio="none">
            <path d="M170 195h300v90H170z" fill={slotHex("white", WHITE)} {...areaProps("white")} />
            <path d="M275 90h90v300h-90z" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          </svg>
          {activeOutline(activeSlotId)}
        </>
      );
    case "sweden":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("blue")} {...areaProps("blue")} />
          <rect x="90" y="0" width="28" height={FLAG_HEIGHT} fill={slotHex("yellow")} {...areaProps("yellow")} />
          <rect x="0" y="86" width={FLAG_WIDTH} height="28" fill={slotHex("yellow")} {...areaProps("yellow")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "norway":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="82" y="0" width="44" height={FLAG_HEIGHT} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y="78" width={FLAG_WIDTH} height="44" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="94" y="0" width="20" height={FLAG_HEIGHT} fill={slotHex("blue")} {...areaProps("blue")} />
          <rect x="0" y="90" width={FLAG_WIDTH} height="20" fill={slotHex("blue")} {...areaProps("blue")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "denmark":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="86" y="0" width="24" height={FLAG_HEIGHT} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y="88" width={FLAG_WIDTH} height="24" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "greece": {
      const stripeHeight = FLAG_HEIGHT / 9;

      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("blue")} {...areaProps("blue")} />
          {Array.from({ length: 9 }, (_, index) =>
            index % 2 === 1 ? (
              <rect
                key={index}
                x="0"
                y={index * stripeHeight}
                width={FLAG_WIDTH}
                height={stripeHeight}
                fill={slotHex("white", WHITE)}
                {...areaProps("white")}
              />
            ) : null,
          )}
          <rect x="0" y="0" width={stripeHeight * 5} height={stripeHeight * 5} fill={slotHex("blue")} {...areaProps("blue")} />
          <rect x={stripeHeight * 2} y="0" width={stripeHeight} height={stripeHeight * 5} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y={stripeHeight * 2} width={stripeHeight * 5} height={stripeHeight} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          {activeOutline(activeSlotId)}
        </>
      );
    }
    case "poland":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height="100" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y="100" width={FLAG_WIDTH} height="100" fill={slotHex("red")} {...areaProps("red")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "austria":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="0" y={FLAG_HEIGHT / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "ireland":
      return (
        <>
          <VerticalThirds
            left={{ id: "green", fill: slotHex("green") }}
            middle={{ id: "white", fill: slotHex("white", WHITE) }}
            right={{ id: "orange", fill: slotHex("orange") }}
            areaProps={areaProps}
          />
          {activeOutline(activeSlotId)}
        </>
      );
    case "finland":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("blue")} {...areaProps("blue")} />
          <rect x="0" y="0" width="90" height="78" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="124" y="0" width="176" height="78" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y="112" width="90" height="88" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="124" y="112" width="176" height="88" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "czechia":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height="100" fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y="100" width={FLAG_WIDTH} height="100" fill={slotHex("red")} {...areaProps("red")} />
          <polygon points="0,0 138,100 0,200" fill={slotHex("blue")} {...areaProps("blue")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "hungary":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="0" y={FLAG_HEIGHT / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y={FLAG_HEIGHT * 2 / 3} width={FLAG_WIDTH} height={FLAG_HEIGHT / 3} fill={slotHex("green")} {...areaProps("green")} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "romania":
      return (
        <>
          <VerticalThirds
            left={{ id: "blue", fill: slotHex("blue") }}
            middle={{ id: "yellow", fill: slotHex("yellow") }}
            right={{ id: "red", fill: slotHex("red") }}
            areaProps={areaProps}
          />
          {activeOutline(activeSlotId)}
        </>
      );
    case "india":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height={THIRD_HEIGHT} fill={slotHex("saffron")} {...areaProps("saffron")} />
          <rect x="0" y={THIRD_HEIGHT} width={FLAG_WIDTH} height={THIRD_HEIGHT} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y={THIRD_HEIGHT * 2} width={FLAG_WIDTH} height={FLAG_HEIGHT - THIRD_HEIGHT * 2} fill={slotHex("green")} {...areaProps("green")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/in.svg`} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "albania":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/al.svg`} />
          {activeOutline("red")}
        </>
      );
    case "south-korea":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/kr.svg`} />
          {activeOutline("white")}
        </>
      );
    case "serbia":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height={THIRD_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="0" y={THIRD_HEIGHT} width={FLAG_WIDTH} height={THIRD_HEIGHT} fill={slotHex("blue")} {...areaProps("blue")} />
          <rect x="0" y={THIRD_HEIGHT * 2} width={FLAG_WIDTH} height={FLAG_HEIGHT - THIRD_HEIGHT * 2} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/rs.svg`} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "saudi-arabia":
      return (
        <>
          <rect width={FLAG_WIDTH} height={FLAG_HEIGHT} fill={slotHex("green")} {...areaProps("green")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/sa.svg`} />
          {activeOutline("green")}
        </>
      );
    case "qatar":
      return (
        <svg viewBox="0 0 640 480" width={FLAG_WIDTH} height={FLAG_HEIGHT} preserveAspectRatio="none">
          <path fill={slotHex("maroon")} d="M0 0h640v480H0z" {...areaProps("maroon")} />
          <path
            fill={slotHex("white", WHITE)}
            d="M0 0v480h158.4l97.8-26.7-97.8-26.6 97.7-26.7-97.7-26.7 97.7-26.6-97.7-26.7 97.8-26.7-97.8-26.6 97.7-26.7-97.7-26.7 97.7-26.6-97.7-26.7 97.8-26.7-97.8-26.6L256.1 80l-97.7-26.7 97.8-26.6L158.3 0z"
            {...areaProps("white")}
          />
          {activeOutline(activeSlotId)}
        </svg>
      );
    case "georgia":
      return (
        <svg viewBox="0 0 640 480" width={FLAG_WIDTH} height={FLAG_HEIGHT} preserveAspectRatio="none">
          <path fill={slotHex("white", WHITE)} d="M0 0h640v480H0z" {...areaProps("white")} />
          <path fill={slotHex("red")} d="M272 0h96v480h-96z" {...areaProps("red")} />
          <path fill={slotHex("red")} d="M0 192h640v96H0z" {...areaProps("red")} />
          <path
            fill={slotHex("red")}
            fillRule="evenodd"
            d="M146.8 373.1c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.2c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.1 4zm368-288c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.1c-16.9-1-31.2-3.9-31.2-3.9s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.1c16.9 1 31.2 4 31.2 4s-1-10-1-14.9 1-14.8 1-14.8-14.3 3-31.2 4zm-368 0c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.2c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.1 4zm368 288c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.2c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.2 4z"
            {...areaProps("red")}
          />
          {activeOutline(activeSlotId)}
        </svg>
      );
    case "egypt":
      return (
        <>
          <rect x="0" y="0" width={FLAG_WIDTH} height={THIRD_HEIGHT} fill={slotHex("red")} {...areaProps("red")} />
          <rect x="0" y={THIRD_HEIGHT} width={FLAG_WIDTH} height={THIRD_HEIGHT} fill={slotHex("white", WHITE)} {...areaProps("white")} />
          <rect x="0" y={THIRD_HEIGHT * 2} width={FLAG_WIDTH} height={FLAG_HEIGHT - THIRD_HEIGHT * 2} fill={slotHex("black", BLACK)} {...areaProps("black")} />
          <FlagAsset href={`${FLAG_ASSET_BASE}/eg.svg`} />
          {activeOutline(activeSlotId)}
        </>
      );
    case "bosnia-herzegovina":
      return (
        <svg viewBox="0 0 640 480" width={FLAG_WIDTH} height={FLAG_HEIGHT} preserveAspectRatio="none">
          <defs>
            <clipPath id={bosniaClipId}>
              <path d="M-85.3 0h682.6v512H-85.3z" />
            </clipPath>
          </defs>
          <g fillRule="evenodd" clipPath={`url(#${bosniaClipId})`} transform="translate(80)scale(.9375)">
            <path fill={slotHex("blue")} d="M-85.3 0h682.6v512H-85.3z" {...areaProps("blue")} />
            <path fill={slotHex("yellow")} d="m56.5 0 511 512.3V.3z" {...areaProps("yellow")} />
            <path
              fill={WHITE}
              d="M439.9 481.5 412 461.2l-28.6 20.2 10.8-33.2-28.2-20.5h35l10.8-33.2 10.7 33.3h35l-28 20.7zm81.3 10.4-35-.1-10.7-33.3-10.8 33.2h-35l28.2 20.5-10.8 33.2 28.6-20.2 28 20.3-10.5-33zM365.6 384.7l28-20.7-35-.1-10.7-33.2-10.8 33.2-35-.1 28.2 20.5-10.8 33.3 28.6-20.3 28 20.4zm-64.3-64.5 28-20.6-35-.1-10.7-33.3-10.9 33.2h-34.9l28.2 20.5-10.8 33.2 28.6-20.2 27.9 20.3zm-63.7-63.6 28-20.7h-35L220 202.5l-10.8 33.2h-35l28.2 20.4-10.8 33.3 28.6-20.3 28 20.4-10.5-33zm-64.4-64.3 28-20.6-35-.1-10.7-33.3-10.9 33.2h-34.9L138 192l-10.8 33.2 28.6-20.2 27.9 20.3-10.4-33zm-63.6-63.9 27.9-20.7h-35L91.9 74.3 81 107.6H46L74.4 128l-10.9 33.2L92.1 141l27.8 20.4zm-64-64 27.9-20.7h-35L27.9 10.3 17 43.6h-35L10.4 64l-11 33.3L28.1 77l27.8 20.4zm-64-64L9.4-20.3h-35l-10.7-33.3L-47-20.4h-35L-53.7 0l-10.8 33.2L-35.9 13l27.8 20.4z"
            />
          </g>
          {activeOutline(activeSlotId)}
        </svg>
      );
    case "afghanistan":
      return (
        <>
          <VerticalThirds
            left={{ id: "black", fill: slotHex("black", BLACK) }}
            middle={{ id: "red", fill: slotHex("red") }}
            right={{ id: "green", fill: slotHex("green") }}
            areaProps={areaProps}
          />
          <FlagAsset href={`${FLAG_ASSET_BASE}/af.svg`} />
          {activeOutline(activeSlotId)}
        </>
      );
    default:
      return null;
  }
}

export default function FlagOverlay({
  color,
  className = "",
  slice = "full",
  isInteractive = false,
  activeSlotId = color?.activeSlotId,
  onSlotSelect,
}) {
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const flag = getFlagOption(color?.flagId);
  const slots = Array.isArray(color?.slots) ? color.slots : [];
  const svgPlacement =
    slice === "top"
      ? "absolute inset-x-0 top-0 h-[200%] w-full"
      : slice === "bottom"
        ? "absolute inset-x-0 bottom-0 h-[200%] w-full"
        : "absolute inset-0 h-full w-full";
  const preserveAspectRatio = "none";

  if (!color?.flagId) return null;

  return (
    <span
      aria-hidden={isInteractive ? undefined : "true"}
      className={`absolute inset-0 overflow-hidden rounded-[inherit] ${
        isInteractive ? "pointer-events-auto z-[5]" : "pointer-events-none"
      } ${className}`}
      style={{ borderRadius: "inherit" }}
    >
      <svg
        className={svgPlacement}
        viewBox={`0 0 ${FLAG_WIDTH} ${FLAG_HEIGHT}`}
        preserveAspectRatio={preserveAspectRatio}
      >
        <FlagMotif
          motif={flag.motif}
          slots={slots}
          activeSlotId={activeSlotId}
          isInteractive={isInteractive}
          onSlotSelect={onSlotSelect}
          instanceId={instanceId}
        />
      </svg>
    </span>
  );
}
