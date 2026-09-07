import { createJsonLd } from "@/lib/seo";

export default function StructuredData({ family, locale = "en" }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(createJsonLd(family, locale)).replace(/</g, "\\u003c") }}
    />
  );
}
