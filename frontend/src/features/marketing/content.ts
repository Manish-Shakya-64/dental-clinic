export interface Service {
  name: string;
  desc: string;
  bg: string;
  iconColor: string;
  icon: string;
}

export const STATS = [
  { value: "15+ yrs", label: "In practice" },
  { value: "10,000+", label: "Happy patients" },
  { value: "5-star", label: "Average rating" },
  { value: "Same-day", label: "Appointments available" },
];

export const SERVICES: Service[] = [
  {
    name: "Check-ups & Cleaning",
    desc: "Routine exams and cleans to keep your smile healthy.",
    bg: "var(--color-primary-tint)",
    iconColor: "var(--color-primary)",
    icon: "M9 12l2 2 4-4M12 3l8 4-8 4-8-4 8-4z",
  },
  {
    name: "Fillings",
    desc: "Gentle, tooth-coloured fillings that blend right in.",
    bg: "var(--color-teal-tint)",
    iconColor: "#3D8E82",
    icon: "M12 2a7 7 0 00-7 7c0 3 2 4 2 8a2 2 0 004 0v-2a1 1 0 012 0v2a2 2 0 004 0c0-4 2-5 2-8a7 7 0 00-7-7z",
  },
  {
    name: "Root Canal",
    desc: "Pain-relieving treatment with modern, gentle technique.",
    bg: "#E6E8FA",
    iconColor: "var(--color-accent)",
    icon: "M12 2v20M6 8h12M6 16h12",
  },
  {
    name: "Teeth Whitening",
    desc: "Brighten your smile safely in a single visit.",
    bg: "var(--color-amber-tint)",
    iconColor: "var(--color-amber-ink)",
    icon: "M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z",
  },
  {
    name: "Emergency Care",
    desc: "Same-day appointments when you need us most.",
    bg: "#FBE7E2",
    iconColor: "#C45A40",
    icon: "M12 2L2 21h20L12 2zM12 9v5M12 17h.01",
  },
  {
    name: "Orthodontics",
    desc: "Braces and clear aligners for all ages.",
    bg: "var(--color-primary-tint)",
    iconColor: "var(--color-primary)",
    icon: "M4 9h16M4 15h16M9 4v16M15 4v16",
  },
];

export const WHY_US = [
  {
    title: "Gentle, modern techniques",
    desc: "Comfort-first dentistry using the latest equipment.",
    icon: "M12 21s-7-4.4-9.5-8.6C.7 8.8 2.4 5 6 5c2 0 3.3 1 4 2 0.7-1 2-2 4-2 3.6 0 5.3 3.8 3.5 7.4C19 16.6 12 21 12 21z",
  },
  {
    title: "Flexible booking & reminders",
    desc: "Book online anytime, with automatic reminders.",
    icon: "M8 2v4M16 2v4M3 9h18M4 6h16a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z",
  },
  {
    title: "Transparent pricing",
    desc: "Clear, upfront fees with no surprises on your bill.",
    icon: "M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  },
];

export const TESTIMONIALS = [
  { quote: "The team made me feel completely at ease. Best dental experience I've had.", name: "Olivia R." },
  { quote: "Booking online was so easy and the reminders meant I never missed a visit.", name: "Daniel K." },
  { quote: "Gentle, professional, and genuinely caring. Highly recommend.", name: "Priya S." },
];

export type SocialPlatform = "facebook" | "instagram" | "x";

export const CLINIC = {
  name: "Bright Smile Dental",
  address: "22 Collins Street, Melbourne VIC 3000",
  hours: "Mon–Fri 8am–6pm, Sat 9am–2pm",
  phone: "(03) 9555 0182",
  /** `platform` selects the glyph in the footer's SOCIAL_ICONS map — adding one here without a
   *  matching icon is a compile error. Swap these hrefs for the clinic's real profiles; they're
   *  placeholders, not live accounts. */
  socials: [
    { platform: "facebook", label: "Facebook", href: "https://facebook.com/brightsmiledental" },
    { platform: "instagram", label: "Instagram", href: "https://instagram.com/brightsmiledental" },
    { platform: "x", label: "X", href: "https://x.com/brightsmiledent" },
  ] as { platform: SocialPlatform; label: string; href: string }[],
};
