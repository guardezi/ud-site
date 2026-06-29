/**
 * Renderiza um bloco `<script type="application/ld+json">` server-side.
 * Schema.org structured data — ler validador em https://validator.schema.org/.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}
