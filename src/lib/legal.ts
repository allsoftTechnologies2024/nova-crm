// Business details used by the policy pages (Terms, Privacy, Refund, Shipping, Contact) and the footer.
// Edit here — every page updates. Required by Razorpay for live payments.

export const LEGAL = {
  brand: 'Smart CRM',
  // The person (or registered entity) that operates the service and receives payments. Must match the
  // name on your Razorpay account / bank account.
  operator: 'Deepak T S',
  entity: 'an individual (sole proprietor, not yet a registered company)',
  website: 'https://smartcrm.deepakts.com',
  domain: 'smartcrm.deepakts.com',
  email: 'smartcrm@gmail.com',
  phone: '+91 85906 41172',
  phoneHref: 'tel:+918590641172',
  // Postal address shown on the Contact page (Razorpay asks for one). Leave '' to hide the line.
  address: '',
  country: 'India',
  supportHours: 'Monday to Saturday, 10:00 AM – 6:00 PM IST',
  refundWindowDays: 7, // business days to process an approved refund
  updated: '2 October 2026',
} as const;

export const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund-policy', label: 'Refund & Cancellation' },
  { href: '/shipping-policy', label: 'Shipping & Delivery' },
  { href: '/contact', label: 'Contact Us' },
] as const;
