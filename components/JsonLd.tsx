interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function LocalBusinessJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "CafeOrCoffeeShop",
        name: "December Delights",
        alternateName: "DecemberDelights",
        description: "Premium coffee and cuisine in Hyderabad. Experience handcrafted beverages, fresh food, and a cozy café vibe.",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        image: `${siteUrl}/logo.png`,
        email: "info@decemberdelights.in",
        telephone: "+918801460641",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Hyderabad",
          addressRegion: "Telangana",
          addressCountry: "IN",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 17.385,
          longitude: 78.4867,
        },
        sameAs: [
          "https://www.instagram.com/decemberdelights",
        ],
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: "10:00",
            closes: "22:00",
          },
        ],
        priceRange: "$$",
        servesCuisine: ["Coffee", "Beverages", "Food"],
        menu: `${siteUrl}/menu`,
      }}
    />
  );
}

export function OrganizationJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "December Delights",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+918801460641",
          contactType: "customer service",
          email: "info@decemberdelights.in",
        },
        sameAs: [
          "https://www.instagram.com/decemberdelights",
        ],
      }}
    />
  );
}

export function ProductJsonLd({ name, description, image, price, currency = "INR" }: {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        description,
        image: image.startsWith("http") ? image : `${siteUrl}${image}`,
        offers: {
          "@type": "Offer",
          url: siteUrl,
          priceCurrency: currency,
          price,
          availability: "https://schema.org/InStock",
        },
        brand: {
          "@type": "Brand",
          name: "December Delights",
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
        })),
      }}
    />
  );
}

export function WebsiteJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "December Delights",
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/menu?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}
