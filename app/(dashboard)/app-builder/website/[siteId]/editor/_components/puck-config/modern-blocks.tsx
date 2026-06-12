import type { Config } from "@puckeditor/core";

export type ModernBlockProps = {
  Hero: { headline: string; subtext: string; cta: string };
  Menu: { title: string; subtitle: string; items: { name: string; price: string; description: string }[] };
  About: { title: string; body: string };
  Contact: { address: string; phone: string; email: string };
  OrderingCta: { headline: string; subtext: string };
  OpeningHours: { title: string; days: { day: string; hours: string }[] };
};

export const modernConfig: Config<ModernBlockProps> = {
  categories: {
    hero:    { title: "Hero & CTA",  components: ["Hero", "OrderingCta"], defaultExpanded: true },
    content: { title: "Content",     components: ["About", "Menu", "OpeningHours"], defaultExpanded: true },
    info:    { title: "Information", components: ["Contact"], defaultExpanded: false },
  },
  components: {
    Hero: {
      fields: { headline: { type: "text" }, subtext: { type: "text" }, cta: { type: "text" } },
      defaultProps: { headline: "Bold Flavours.\nBold Experience.", subtext: "Premium dining redefined.", cta: "Explore Menu" },
      render: ({ headline, subtext, cta, puck }) => (
        <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", background: "var(--background)", position: "relative", overflow: "hidden", padding: "2rem" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 60% 50%, hsl(var(--primary) / 0.1) 0%, transparent 70%)" }} />
          <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative" }}>
            <div style={{ display: "inline-block", background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", borderRadius: "999px", padding: "0.4rem 1.2rem", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2rem" }}>Now Open</div>
            {puck?.isEditing && !headline && (
              <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem" }}>
                Click to edit headline...
              </p>
            )}
            <h1 style={{ fontSize: "clamp(3rem, 8vw, 7rem)", fontWeight: 900, lineHeight: 1.05, color: "var(--foreground)", marginBottom: "1.5rem", whiteSpace: "pre-line" }}>{headline}</h1>
            <p style={{ fontSize: "1.25rem", color: "var(--muted-foreground)", maxWidth: "600px", lineHeight: 1.7, marginBottom: "2.5rem" }}>{subtext}</p>
            <a href="#menu" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", padding: "1rem 2.5rem", borderRadius: "0.75rem", fontWeight: 700, textDecoration: "none" }}>{cta} →</a>
          </div>
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
      defaultProps: { title: "The Menu", subtitle: "Crafted with the finest ingredients.", items: [{ name: "Truffle Pasta", price: "£24.00", description: "Handmade pasta, black truffle" }] },
      render: ({ title, subtitle, items, puck }) => (
        <section id="menu" style={{ padding: "8rem 2rem", background: "var(--muted)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <p style={{ color: "hsl(var(--primary))", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "1rem" }}>What We Offer</p>
            {puck?.isEditing && !title && (
              <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
                Click to edit menu title...
              </p>
            )}
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 800, color: "var(--foreground)", marginBottom: "1.5rem" }}>{title}</h2>
            <p style={{ color: "var(--muted-foreground)", fontSize: "1.1rem", maxWidth: "600px", lineHeight: 1.8, marginBottom: "4rem" }}>{subtitle}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "2.5rem" }}>
              {items.map((item, i) => (
                <div key={i} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                    <h3 style={{ color: "var(--foreground)", fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{item.name}</h3>
                    <span style={{ color: "hsl(var(--primary))", fontWeight: 800, fontSize: "1.1rem" }}>{item.price}</span>
                  </div>
                  {item.description && <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem", margin: 0, lineHeight: 1.6 }}>{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      ),
    },
    About: {
      fields: { title: { type: "text" }, body: { type: "textarea" } },
      defaultProps: { title: "Our Story", body: "Born from a passion for exceptional dining." },
      render: ({ title, body, puck }) => (
        <section id="about" style={{ padding: "8rem 2rem", background: "var(--background)" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <p style={{ color: "hsl(var(--primary))", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "1rem" }}>Our Story</p>
            {puck?.isEditing && !title && (
              <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
                Click to edit about title...
              </p>
            )}
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "var(--foreground)", marginBottom: "2rem" }}>{title}</h2>
            <p style={{ fontSize: "1.15rem", color: "var(--muted-foreground)", lineHeight: 1.9 }}>{body}</p>
          </div>
        </section>
      ),
    },
    Contact: {
      fields: { address: { type: "text" }, phone: { type: "text" }, email: { type: "text" } },
      defaultProps: { address: "123 High Street, London", phone: "+44 20 1234 5678", email: "hello@store.com" },
      render: ({ address, phone, email, puck }) => (
        <section id="contact" style={{ padding: "8rem 2rem", background: "var(--muted)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <p style={{ color: "hsl(var(--primary))", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "1rem" }}>Get In Touch</p>
            {puck?.isEditing && !address && (
              <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
                Click to edit contact info...
              </p>
            )}
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "var(--foreground)", marginBottom: "3rem" }}>Find Us</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ color: "var(--muted-foreground)", fontSize: "1rem" }}>📍 {address}</p>
              <p style={{ color: "var(--muted-foreground)", fontSize: "1rem" }}>📞 {phone}</p>
              <p style={{ color: "var(--muted-foreground)", fontSize: "1rem" }}>✉️ {email}</p>
            </div>
          </div>
        </section>
      ),
    },
    OrderingCta: {
      fields: { headline: { type: "text" }, subtext: { type: "text" } },
      defaultProps: { headline: "Order Online", subtext: "Fast delivery, premium quality." },
      render: ({ headline, subtext, puck }) => (
        <section style={{ padding: "8rem 2rem", background: "var(--background)", textAlign: "center" }}>
          {puck?.isEditing && !headline && (
            <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Click to edit CTA headline...
            </p>
          )}
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 900, color: "var(--foreground)", marginBottom: "1.5rem" }}>{headline}</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "1.1rem", marginBottom: "2.5rem", maxWidth: "500px", margin: "0 auto 2.5rem" }}>{subtext}</p>
          <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", padding: "1rem 2.5rem", borderRadius: "0.75rem", fontWeight: 700, textDecoration: "none" }}>Order Now →</a>
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
        <section id="hours" style={{ padding: "8rem 2rem", background: "var(--muted)", textAlign: "center" }}>
          <p style={{ color: "hsl(var(--primary))", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "1rem" }}>When We&apos;re Open</p>
          {puck?.isEditing && !title && (
            <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Click to edit hours title...
            </p>
          )}
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, color: "var(--foreground)", marginBottom: "3rem" }}>{title}</h2>
          <div style={{ maxWidth: "500px", margin: "0 auto" }}>
            {days.length === 0 && puck?.isEditing && (
              <p style={{ opacity: 0.4, fontStyle: "italic", fontSize: "0.8rem" }}>Add opening hours in the sidebar...</p>
            )}
            {days.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: i < days.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontWeight: 700, color: "var(--foreground)", fontSize: "1.1rem" }}>{item.day}</span>
                <span style={{ color: "var(--muted-foreground)", fontSize: "1.1rem" }}>{item.hours}</span>
              </div>
            ))}
          </div>
        </section>
      ),
    },
  },
};
