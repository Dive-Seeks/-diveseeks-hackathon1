import type { Config } from "@puckeditor/core";

export type ClassicBlockProps = {
  Hero: { headline: string; subtext: string; cta: string };
  Menu: { title: string; subtitle: string; items: { name: string; price: string; description: string }[] };
  About: { title: string; body: string };
  Contact: { address: string; phone: string; email: string };
  OrderingCta: { headline: string; subtext: string };
  OpeningHours: { title: string; days: { day: string; hours: string }[] };
};

export const classicConfig: Config<ClassicBlockProps> = {
  categories: {
    hero:    { title: "Hero & CTA",  components: ["Hero", "OrderingCta"], defaultExpanded: true },
    content: { title: "Content",     components: ["About", "Menu", "OpeningHours"], defaultExpanded: true },
    info:    { title: "Information", components: ["Contact"], defaultExpanded: false },
  },
  components: {
    Hero: {
      fields: {
        headline: { type: "text" },
        subtext: { type: "text" },
        cta: { type: "text" },
      },
      defaultProps: { headline: "Welcome", subtext: "Great food, great service", cta: "View Menu" },
      render: ({ headline, subtext, cta, puck }) => (
        <section style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", padding: "6rem 2rem", textAlign: "center", minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          {puck?.isEditing && !headline && (
            <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem" }}>
              Click to edit headline...
            </p>
          )}
          <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 800, marginBottom: "1rem" }}>{headline}</h1>
          <p style={{ fontSize: "1.25rem", opacity: 0.9, maxWidth: "600px", marginBottom: "2rem" }}>{subtext}</p>
          <a href="#menu" style={{ background: "var(--background)", color: "var(--foreground)", padding: "0.75rem 2rem", borderRadius: "0.5rem", fontWeight: 700, textDecoration: "none", fontSize: "1rem" }}>{cta}</a>
        </section>
      ),
    },
    Menu: {
      fields: {
        title:    { type: "text" },
        subtitle: { type: "text" },
        items: {
          type: "array",
          arrayFields: { name: { type: "text" }, price: { type: "text" }, description: { type: "textarea" } },
          defaultItemProps: { name: "New dish", price: "£0.00", description: "" },
          getItemSummary: (item) => item.name || "Menu item",
          min: 1, max: 20,
        },
      },
      defaultProps: { title: "Our Menu", subtitle: "Fresh ingredients", items: [{ name: "House Special", price: "£12.99", description: "Chef's signature" }] },
      render: ({ title, subtitle, items, puck }) => (
        <section id="menu" style={{ padding: "5rem 2rem", background: "var(--muted)", textAlign: "center" }}>
          {puck?.isEditing && !title && (
            <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Click to edit menu title...
            </p>
          )}
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--foreground)" }}>{title}</h2>
          <p style={{ color: "var(--muted-foreground)", maxWidth: "600px", margin: "0 auto 3rem" }}>{subtitle}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
            {items.map((item, i) => (
              <div key={i} style={{ background: "var(--background)", borderRadius: "0.75rem", padding: "1.25rem", border: "1px solid var(--border)", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{item.name}</span>
                  <span style={{ color: "hsl(var(--primary))", fontWeight: 700 }}>{item.price}</span>
                </div>
                {item.description && <p style={{ color: "var(--muted-foreground)", fontSize: "0.875rem", margin: 0 }}>{item.description}</p>}
              </div>
            ))}
          </div>
        </section>
      ),
    },
    About: {
      fields: { title: { type: "text" }, body: { type: "textarea" } },
      defaultProps: { title: "About Us", body: "We are passionate about great food and service." },
      render: ({ title, body, puck }) => (
        <section id="about" style={{ padding: "5rem 2rem", textAlign: "center", background: "var(--background)" }}>
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            {puck?.isEditing && !title && (
              <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
                Click to edit about title...
              </p>
            )}
            <h2 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--foreground)" }}>{title}</h2>
            <p style={{ fontSize: "1.1rem", lineHeight: 1.8, color: "var(--muted-foreground)" }}>{body}</p>
          </div>
        </section>
      ),
    },
    Contact: {
      fields: { address: { type: "text" }, phone: { type: "text" }, email: { type: "text" } },
      defaultProps: { address: "123 High Street, London", phone: "+44 20 1234 5678", email: "hello@store.com" },
      render: ({ address, phone, email, puck }) => (
        <section id="contact" style={{ padding: "5rem 2rem", background: "var(--muted)", textAlign: "center" }}>
          {puck?.isEditing && !address && (
            <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Click to edit contact info...
            </p>
          )}
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "2rem", color: "var(--foreground)" }}>Find Us</h2>
          <p style={{ color: "var(--muted-foreground)" }}>📍 {address}</p>
          <p style={{ color: "var(--muted-foreground)" }}>📞 {phone}</p>
          <p style={{ color: "var(--muted-foreground)" }}>✉️ {email}</p>
        </section>
      ),
    },
    OrderingCta: {
      fields: { headline: { type: "text" }, subtext: { type: "text" } },
      defaultProps: { headline: "Order Online", subtext: "Quick, easy, delicious." },
      render: ({ headline, subtext, puck }) => (
        <section style={{ padding: "4rem 2rem", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", textAlign: "center" }}>
          {puck?.isEditing && !headline && (
            <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem", color: "var(--background)" }}>
              Click to edit CTA headline...
            </p>
          )}
          <h2 style={{ fontSize: "2rem", fontWeight: 700 }}>{headline}</h2>
          <p style={{ opacity: 0.9, marginTop: "0.5rem", marginBottom: "1.5rem" }}>{subtext}</p>
          <a href="#" style={{ background: "var(--background)", color: "var(--foreground)", padding: "0.75rem 2.5rem", borderRadius: "0.5rem", fontWeight: 700, textDecoration: "none" }}>Order Now</a>
        </section>
      ),
    },
    OpeningHours: {
      fields: {
        title: { type: "text" },
        days: {
          type: "array",
          arrayFields: { day: { type: "text" }, hours: { type: "text" } },
          defaultItemProps: { day: "Mon-Fri", hours: "9am-10pm" },
          getItemSummary: (item) => item.day || "Day",
          min: 1, max: 7,
        },
      },
      defaultProps: { title: "Opening Hours", days: [{ day: "Mon-Fri", hours: "9am-10pm" }, { day: "Sat-Sun", hours: "10am-11pm" }] },
      render: ({ title, days, puck }) => (
        <section id="hours" style={{ padding: "5rem 2rem", textAlign: "center", background: "var(--background)" }}>
          {puck?.isEditing && !title && (
            <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Click to edit hours title...
            </p>
          )}
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "2rem", color: "var(--foreground)" }}>{title}</h2>
          <div style={{ maxWidth: "400px", margin: "0 auto", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "1.5rem" }}>
            {days.length === 0 && puck?.isEditing && (
              <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.8rem" }}>Add opening hours in the sidebar...</p>
            )}
            {days.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: i < days.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{item.day}</span>
                <span style={{ color: "var(--muted-foreground)" }}>{item.hours}</span>
              </div>
            ))}
          </div>
        </section>
      ),
    },
  },
};
