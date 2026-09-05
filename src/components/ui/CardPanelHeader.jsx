"use client";

import CardCloseButton from "./CardCloseButton";

export default function CardPanelHeader({
  title,
  description,
  onClose,
  closeLabel,
}) {
  return (
    <div data-screen-reveal className="app-panel-header">
      <div className="min-w-0 pr-4">
        <h1 className="app-panel-title">{title}</h1>
        {description ? <p className="app-panel-copy">{description}</p> : null}
      </div>
      <CardCloseButton
        onClick={onClose}
        label={closeLabel}
        className="app-panel-close shrink-0"
      />
    </div>
  );
}
