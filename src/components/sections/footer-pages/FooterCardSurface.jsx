// The loading placeholder and hydrated page start with the same normal game card.
export default function FooterCardSurface({ children, cardRef, className = "", ...props }) {
  return (
    <article
      {...props}
      ref={cardRef}
      data-footer-fullscreen-card
      className={`footer-card-surface footer-page-dark fixed overflow-hidden bg-black text-white ${className}`}
    >
      {children}
    </article>
  );
}

export function FooterCardLoading() {
  return <main className="app-gradient relative h-dvh w-full overflow-hidden"><FooterCardSurface /></main>;
}
