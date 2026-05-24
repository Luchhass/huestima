import { createJsonLd } from "@/lib/seo";

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(createJsonLd()) }}
    />
  );
}
