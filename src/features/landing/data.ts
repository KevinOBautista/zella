/**
 * Static landing page content: section photography and "how it works"
 * copy. Listings, sellers and open houses always come from the database
 * (including labeled demo content), never from this file.
 *
 * Photography: Unsplash (host already allowed in next.config / CSP).
 */

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80`;

export const landingImages = {
  hero: unsplash("1570129477492-45c003edd2be"),
  sellerIntroWide: unsplash("1592595896551-12b371d546d5"),
  sellerCta: unsplash("1558036117-15d82a90b9b1"),
} as const;

export const howItWorks = {
  buyers: [
    { title: "Discover homes and upcoming open houses.", body: "Browse listings across the region and see what is coming soon before it hits the market." },
    { title: "Save properties and follow sellers.", body: "Keep a shortlist and get notified when the sellers you follow add a property or schedule an open house." },
    { title: "Send an inquiry or RSVP to an open house.", body: "Reach the seller through a short inquiry or RSVP form with your name and email. The seller decides how and when to reply." },
  ],
  sellers: [
    { title: "Create your individual or business profile.", body: "Pick a name and @username that buyers can recognize and follow across every property you list." },
    { title: "Add a property and schedule an open house.", body: "A guided flow walks you through photos, details, and pricing. Coming Soon listings can keep the exact address private." },
    { title: "Manage inquiries and choose how to follow up.", body: "Every buyer inquiry and RSVP arrives through a structured form and lands in your lead list with statuses and notes. Your contact details stay private until you reach out." },
  ],
} as const;
