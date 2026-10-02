// Demo workspace for trying the app: one user per role + a realistic pipeline.
// Run: npm run seed:demo  (development only)   (re-running resets the demo workspace only; other workspaces are untouched)
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Demo data uses a public password (demo12345) — never allow it on a production database.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== '1') {
  console.error('Refusing to seed demo data with NODE_ENV=production (it creates accounts with the password demo12345).');
  process.exit(1);
}
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set (.env.local)');
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const PASSWORD = 'demo12345';
const OWNER_EMAIL = 'demo@leadpilot.test';
const USERS = [
  { name: 'Demo Owner', email: OWNER_EMAIL, role: 'owner' },
  { name: 'Anita Admin', email: 'admin@leadpilot.test', role: 'admin' },
  { name: 'Manoj Manager', email: 'manager@leadpilot.test', role: 'manager' },
  { name: 'Asha Agent', email: 'agent@leadpilot.test', role: 'agent' },
  { name: 'Ravi Agent', email: 'agent2@leadpilot.test', role: 'agent' },
  { name: 'Vik Viewer', email: 'viewer@leadpilot.test', role: 'viewer' },
];

// Reset the previous demo workspace (found via the demo owner).
const existing = await db.collection('users').findOne({ email: OWNER_EMAIL });
if (existing) {
  const orgId = existing.orgId;
  await Promise.all([
    db.collection('leads').deleteMany({ orgId }),
    db.collection('payments').deleteMany({ orgId }),
    db.collection('conversations').deleteMany({ orgId }),
    db.collection('users').deleteMany({ orgId }),
    db.collection('organizations').deleteOne({ _id: orgId }),
  ]);
}
await db.collection('users').deleteMany({ email: { $in: USERS.map((u) => u.email) } });

const now = new Date();
const days = (n, hour = 11) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

// On Pro for 30 days so all 6 demo users fit; sign up a fresh workspace to try Starter → Pro with Razorpay.
const { insertedId: orgId } = await db.collection('organizations').insertOne({
  name: 'Demo Co',
  plan: 'pro',
  planExpiresAt: days(30),
  ai: { provider: process.env.ANTHROPIC_API_KEY ? 'claude' : 'gemini', model: '' },
  aiUsage: { month: '', count: 0 },
  createdAt: now,
  updatedAt: now,
});

const hash = await bcrypt.hash(PASSWORD, 10);
const ids = {};
for (const u of USERS) {
  const { insertedId } = await db.collection('users').insertOne({ ...u, orgId, passwordHash: hash, active: true, createdAt: now, updatedAt: now });
  ids[u.role === 'agent' && ids.agent ? 'agent2' : u.role] = insertedId;
}

const act = (type, text, by, daysAgo) => ({ _id: new mongoose.Types.ObjectId(), type, text, by, at: days(-daysAgo, 10) });
const L = (o) => ({
  orgId,
  name: '',
  company: '',
  email: '',
  phone: '',
  source: '',
  need: '',
  value: 0,
  status: 'new',
  priority: 'warm',
  tags: [],
  nextFollowUp: null,
  ai: null,
  createdBy: ids.owner,
  ...o,
  activities: o.activities ?? [act('created', 'Lead created', 'Demo Owner', o.age ?? 10)],
  createdAt: days(-(o.age ?? 10)),
  updatedAt: days(-(o.idle ?? 1)),
});

const leads = [
  L({ company: 'Mehta Logistics', name: 'Rahul Mehta', email: 'rahul@mehtalogistics.in', phone: '98400 11223', source: 'Expo', need: '40 trucks, wants live fleet tracking + driver app. Budget ~3.5L.', value: 350000, status: 'proposal', priority: 'hot', tags: ['fleet', 'expo'], assignedTo: ids.agent, nextFollowUp: days(0, 15), activities: [act('created', 'Met at the logistics expo', 'Asha Agent', 9), act('call', 'Demo went well, wants proposal by Friday', 'Asha Agent', 3), act('status', 'Qualified → Proposal', 'Asha Agent', 2)] }),
  L({ company: 'Bloom Clinics', name: 'Ananya Rao', phone: '98450 12345', source: 'Referral', need: 'Appointment booking + WhatsApp reminders for 3 clinics.', value: 120000, status: 'qualified', priority: 'hot', tags: ['healthcare'], assignedTo: ids.agent, nextFollowUp: days(-1), idle: 6 }),
  L({ company: 'Zen Foods', name: 'Karthik S', email: 'karthik@zenfoods.co', source: 'Website', need: 'Online ordering site for 5 outlets.', value: 180000, status: 'negotiation', priority: 'warm', tags: ['restaurant'], assignedTo: ids.agent2, nextFollowUp: days(1), activities: [act('created', 'Inbound from website', 'Ravi Agent', 12), act('email', 'Sent revised quote ₹1.8L', 'Ravi Agent', 2)] }),
  L({ company: 'Sri Balaji Hardware', name: 'Ramesh', phone: '94440 55667', source: 'Google Maps', need: 'No website today; wants a simple site + Google listing.', value: 25000, status: 'contacted', priority: 'warm', tags: ['no-website'], assignedTo: ids.agent2, nextFollowUp: days(2) }),
  L({ company: 'Nova Interiors', name: 'Priya Nair', email: 'priya@novainteriors.in', source: 'LinkedIn', need: 'CRM for their design consultants (12 seats).', value: 240000, status: 'new', priority: 'hot', tags: ['saas'], assignedTo: ids.manager }),
  L({ company: 'GreenLeaf Schools', name: 'Mr. Joseph', phone: '98840 99881', source: 'Referral', need: 'Fee collection + parent app for 2 campuses.', value: 450000, status: 'qualified', priority: 'warm', tags: ['education'], assignedTo: ids.manager, nextFollowUp: days(3), idle: 4 }),
  L({ company: 'Urban Fitness', name: 'Sneha', email: 'sneha@urbanfit.in', source: 'Instagram', need: 'Membership app with class booking.', value: 90000, status: 'contacted', priority: 'cold', tags: ['fitness'], assignedTo: ids.agent, idle: 14 }),
  L({ company: 'Coastal Exports', name: 'Abdul Rahman', email: 'abdul@coastalexports.com', source: 'Cold call', need: 'Inventory + export docs portal.', value: 600000, status: 'won', priority: 'hot', tags: ['enterprise'], assignedTo: ids.manager, idle: 5 }),
  L({ company: 'Lotus Pharma', name: 'Dr. Meera', source: 'Expo', need: 'Field-sales tracking app.', value: 300000, status: 'won', priority: 'warm', tags: ['pharma'], assignedTo: ids.agent2, idle: 20 }),
  L({ company: 'QuickMart', name: 'Vinod', phone: '90030 44556', source: 'Google Maps', need: 'Was exploring delivery app; went with a competitor.', value: 150000, status: 'lost', priority: 'cold', assignedTo: ids.agent2, idle: 9 }),
  L({ company: 'Aster Realty', name: 'Farhan', email: 'farhan@asterrealty.in', source: 'Website', need: 'Lead capture landing pages for 4 projects.', value: 75000, status: 'new', priority: 'warm', tags: ['real-estate'], assignedTo: null }),
  L({ company: 'Kaveri Textiles', name: 'Lakshmi', phone: '97910 22334', source: 'Referral', need: 'B2B catalogue + order portal for dealers.', value: 320000, status: 'proposal', priority: 'warm', tags: ['b2b'], assignedTo: ids.manager, nextFollowUp: days(-2), idle: 8 }),
];
// Older history so the 12-month overview chart has a real shape.
const HISTORY = ['Apex Motors', 'Sunrise Bakery', 'Metro Dental', 'BlueWave Travels', 'Pixel Studio', 'Vasan Opticals', 'Royal Caterers', 'Prime Realty', 'Swift Couriers', 'Lakeview Hotel', 'Indus Tiles', 'Kiran Jewellers', 'Orbit Coworking', 'Fresh Farms', 'Silverline Gym', 'Delta Auto Parts', 'Om Sai Traders', 'Nimbus Labs'];
const OUTCOMES = ['won', 'lost', 'won', 'negotiation', 'lost', 'won', 'proposal', 'lost', 'won'];
const OWNERS = [ids.agent, ids.agent2, ids.manager];
HISTORY.forEach((company, i) => {
  const age = 40 + ((i * 97) % 300); // spread over ~10 months
  leads.push(
    L({
      company,
      source: ['Website', 'Referral', 'Google Maps', 'LinkedIn'][i % 4],
      need: 'Website / app project.',
      value: 40000 + ((i * 53000) % 400000),
      status: OUTCOMES[i % OUTCOMES.length],
      priority: ['warm', 'cold', 'hot'][i % 3],
      assignedTo: OWNERS[i % OWNERS.length],
      age,
      idle: Math.max(1, age - 20),
    })
  );
});
// Recent leads were added over the last few weeks.
leads.forEach((l, i) => {
  if (i < 12) l.createdAt = days(-[3, 18, 25, 2, 1, 30, 45, 60, 75, 33, 0, 50][i]);
});

await db.collection('leads').insertMany(leads);

console.log(`Seeded "Demo Co" (Pro plan) with ${leads.length} leads. Password for every user: ${PASSWORD}`);
for (const u of USERS) console.log(`  ${u.role.padEnd(8)} ${u.email}`);
await mongoose.disconnect();
