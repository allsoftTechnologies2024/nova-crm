// One-off: retire the free "Starter" plan. Only the free trial remains; when it ends, unpaid workspaces lock.
//   1. Starter (key "free") is disabled and hidden (kept for history, never deleted).
//   2. The fallback plan becomes "lock" (no free fallback).
//   3. Every workspace still on Starter gets a fresh free trial of the configured trial plan.
// Dry run by default. Apply with:  node --env-file-if-exists=.env.local scripts/migrate-no-free-plan.mjs --apply
import mongoose from 'mongoose';

const LOCK_PLAN_KEY = '__lock__'; // keep in sync with src/lib/plans.ts
const FREE_KEY = 'free';
const apply = process.argv.includes('--apply');

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set (.env.local)');
await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const settings = (await db.collection('platformsettings').findOne({ key: 'global' })) ?? {};
const trial = { enabled: settings.trial?.enabled ?? true, planKey: settings.trial?.planKey ?? 'pro', days: settings.trial?.days ?? 30 };
const trialPlan = await db.collection('plans').findOne({ key: trial.planKey });
if (!trial.enabled || !trialPlan || trialPlan.active === false) {
  console.error(`The free trial must be on with an enabled plan first (now: ${trial.enabled ? 'on' : 'off'}, plan "${trial.planKey}"). Fix it in the platform console → Plans.`);
  process.exit(1);
}

const orgs = await db.collection('organizations').find({ plan: FREE_KEY }, { projection: { name: 1, plan: 1, planSource: 1 } }).toArray();
const trialEnds = new Date(Date.now() + trial.days * 86_400_000);

console.log(`${apply ? 'Applying' : 'Dry run'}:`);
console.log(`- Disable + hide plan "${FREE_KEY}"`);
console.log(`- Fallback plan: "${settings.fallbackPlanKey ?? FREE_KEY}" → lock`);
console.log(`- ${orgs.length} workspace(s) on Starter → ${trial.days}-day trial of "${trialPlan.name}" (ends ${trialEnds.toDateString()}):`);
for (const o of orgs) console.log(`    · ${o.name}`);

if (apply) {
  await db.collection('plans').updateOne({ key: FREE_KEY }, { $set: { active: false, public: false, popular: false } });
  await db.collection('organizations').updateMany(
    { plan: FREE_KEY },
    { $set: { plan: trial.planKey, planExpiresAt: trialEnds, planSource: 'trial', trialUsed: true } }
  );
  // Bumping catalogVersion makes every running server reload plans + settings.
  await db.collection('platformsettings').updateOne({ key: 'global' }, { $set: { fallbackPlanKey: LOCK_PLAN_KEY }, $inc: { catalogVersion: 1 } }, { upsert: true });
  console.log('Done.');
} else {
  console.log('Nothing changed. Re-run with --apply to make these changes.');
}
await mongoose.disconnect();
