/**
 * Seed demo users + busy workspaces/boards via Supabase Auth Admin + REST.
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_PASSWORD
 *
 * Usage: node --env-file=.env scripts/seed-demo.mjs
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const seedPassword = requireEnv("SEED_PASSWORD");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { email: "admin@example.com", name: "Admin" },
  { email: "alice@example.com", name: "Alice Chen" },
  { email: "bob@example.com", name: "Bob Rivera" },
  { email: "carol@example.com", name: "Carol Nguyen" },
  { email: "dana@example.com", name: "Dana Okonkwo" },
  { email: "eli@example.com", name: "Eli Park" },
];

const IDS = {
  acme: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  aliceWs: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ops: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  sprint: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  launch: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  roadmap: "12121212-1212-4121-8121-121212121212",
  support: "13131313-1313-4131-8131-131313131313",
  hiring: "14141414-1414-4141-8141-141414141414",
  side: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  errands: "15151515-1515-4151-8151-151515151515",
};

const ALL_BOARD_IDS = [
  IDS.sprint,
  IDS.launch,
  IDS.roadmap,
  IDS.support,
  IDS.hiring,
  IDS.side,
  IDS.errands,
];

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: init.prefer ?? "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === "object" ? JSON.stringify(body) : String(body);
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${msg}`);
  }
  return body;
}

async function schemaReady() {
  const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  return res.status !== 404;
}

function applySchemaViaPsql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;
  const sqlPath = resolve(root, "supabase/bootstrap-schema.sql");
  const result = spawnSync(
    "psql",
    [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  console.log("Applied bootstrap-schema.sql via DATABASE_URL");
  return true;
}

async function ensureUser({ email, name }) {
  const list = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((u) => u.email === email);
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: seedPassword,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
    await rest("profiles?on_conflict=id", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify([{ id: existing.id, email, name }]),
    });
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: seedPassword,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw error;
  await rest("profiles?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify([{ id: data.user.id, email, name }]),
  });
  return data.user.id;
}

function days(n) {
  return new Date(Date.now() + n * 86400000).toISOString();
}

function card(listId, title, description, dueOffset, position) {
  return {
    list_id: listId,
    title,
    description,
    due_at: dueOffset === null ? null : days(dueOffset),
    position,
  };
}

async function wipeBoardChildren(boardIds) {
  const existingLists = await rest(
    `lists?board_id=in.(${boardIds.join(",")})&select=id`,
  );
  const listIds = (existingLists ?? []).map((l) => l.id);
  if (!listIds.length) return;
  // Delete in chunks to avoid URL length issues
  for (let i = 0; i < listIds.length; i += 40) {
    const chunk = listIds.slice(i, i + 40);
    await rest(`cards?list_id=in.(${chunk.join(",")})`, {
      method: "DELETE",
      prefer: "return=minimal",
    });
  }
  await rest(`lists?board_id=in.(${boardIds.join(",")})`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
}

async function insertCards(cards) {
  for (let i = 0; i < cards.length; i += 50) {
    await rest("cards", {
      method: "POST",
      body: JSON.stringify(cards.slice(i, i + 50)),
    });
  }
}

async function seed() {
  if (process.env.DATABASE_URL) {
    applySchemaViaPsql();
  }

  if (!(await schemaReady())) {
    console.error("Schema missing — apply supabase/bootstrap-schema.sql first.");
    process.exit(1);
  }

  const userIds = {};
  for (const user of USERS) {
    userIds[user.email] = await ensureUser(user);
    console.log(`user ready: ${user.email}`);
  }

  const adminId = userIds["admin@example.com"];
  const aliceId = userIds["alice@example.com"];
  const bobId = userIds["bob@example.com"];
  const carolId = userIds["carol@example.com"];
  const danaId = userIds["dana@example.com"];
  const eliId = userIds["eli@example.com"];

  await rest("workspaces?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify([
      { id: IDS.acme, name: "Acme Product", slug: "acme-product" },
      { id: IDS.ops, name: "Acme Ops", slug: "acme-ops" },
      { id: IDS.aliceWs, name: "Alice Personal", slug: "alice-personal" },
    ]),
  });

  await rest(
    `workspace_members?workspace_id=in.(${IDS.acme},${IDS.ops},${IDS.aliceWs})`,
    { method: "DELETE", prefer: "return=minimal" },
  );

  await rest("workspace_members", {
    method: "POST",
    body: JSON.stringify([
      { workspace_id: IDS.acme, user_id: adminId, role: "owner" },
      { workspace_id: IDS.acme, user_id: aliceId, role: "member" },
      { workspace_id: IDS.acme, user_id: bobId, role: "member" },
      { workspace_id: IDS.acme, user_id: carolId, role: "member" },
      { workspace_id: IDS.acme, user_id: danaId, role: "member" },
      { workspace_id: IDS.acme, user_id: eliId, role: "member" },
      { workspace_id: IDS.ops, user_id: adminId, role: "owner" },
      { workspace_id: IDS.ops, user_id: danaId, role: "member" },
      { workspace_id: IDS.ops, user_id: bobId, role: "member" },
      { workspace_id: IDS.aliceWs, user_id: aliceId, role: "owner" },
    ]),
  });

  await rest("boards?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify([
      { id: IDS.sprint, workspace_id: IDS.acme, name: "Sprint 14", slug: "sprint-14", position: 1000 },
      { id: IDS.launch, workspace_id: IDS.acme, name: "Launch Checklist", slug: "launch-checklist", position: 2000 },
      { id: IDS.roadmap, workspace_id: IDS.acme, name: "Product Roadmap", slug: "product-roadmap", position: 3000 },
      { id: IDS.support, workspace_id: IDS.ops, name: "Customer Support", slug: "customer-support", position: 1000 },
      { id: IDS.hiring, workspace_id: IDS.ops, name: "Hiring Pipeline", slug: "hiring-pipeline", position: 2000 },
      { id: IDS.side, workspace_id: IDS.aliceWs, name: "Side Projects", slug: "side-projects", position: 1000 },
      { id: IDS.errands, workspace_id: IDS.aliceWs, name: "Life Admin", slug: "life-admin", position: 2000 },
    ]),
  });

  await wipeBoardChildren(ALL_BOARD_IDS);

  const lists = await rest("lists", {
    method: "POST",
    body: JSON.stringify([
      // Sprint 14
      { board_id: IDS.sprint, name: "Icebox", position: 500 },
      { board_id: IDS.sprint, name: "Backlog", position: 1000 },
      { board_id: IDS.sprint, name: "Ready", position: 1500 },
      { board_id: IDS.sprint, name: "In Progress", position: 2000 },
      { board_id: IDS.sprint, name: "Blocked", position: 2500 },
      { board_id: IDS.sprint, name: "Review", position: 3000 },
      { board_id: IDS.sprint, name: "Done", position: 4000 },
      // Launch
      { board_id: IDS.launch, name: "Not started", position: 1000 },
      { board_id: IDS.launch, name: "This week", position: 2000 },
      { board_id: IDS.launch, name: "Waiting on", position: 3000 },
      { board_id: IDS.launch, name: "Done", position: 4000 },
      // Roadmap
      { board_id: IDS.roadmap, name: "Now", position: 1000 },
      { board_id: IDS.roadmap, name: "Next", position: 2000 },
      { board_id: IDS.roadmap, name: "Later", position: 3000 },
      { board_id: IDS.roadmap, name: "Shipped", position: 4000 },
      // Support
      { board_id: IDS.support, name: "New", position: 1000 },
      { board_id: IDS.support, name: "Investigating", position: 2000 },
      { board_id: IDS.support, name: "Waiting on customer", position: 3000 },
      { board_id: IDS.support, name: "Resolved", position: 4000 },
      // Hiring
      { board_id: IDS.hiring, name: "Sourced", position: 1000 },
      { board_id: IDS.hiring, name: "Phone screen", position: 2000 },
      { board_id: IDS.hiring, name: "Onsite", position: 3000 },
      { board_id: IDS.hiring, name: "Offer", position: 4000 },
      { board_id: IDS.hiring, name: "Hired / Closed", position: 5000 },
      // Side projects
      { board_id: IDS.side, name: "Ideas", position: 1000 },
      { board_id: IDS.side, name: "Active", position: 2000 },
      { board_id: IDS.side, name: "Parked", position: 3000 },
      // Life admin
      { board_id: IDS.errands, name: "To do", position: 1000 },
      { board_id: IDS.errands, name: "Waiting", position: 2000 },
      { board_id: IDS.errands, name: "Done", position: 3000 },
    ]),
  });

  const L = Object.fromEntries(
    lists.map((l) => [`${l.board_id}:${l.name}`, l.id]),
  );

  const cards = [
    // —— Sprint Icebox ——
    card(L[`${IDS.sprint}:Icebox`], "Keyboard shortcuts for board", "Move cards without the mouse.", 45, 1000),
    card(L[`${IDS.sprint}:Icebox`], "Board templates", "Preset list layouts for new boards.", 60, 2000),
    card(L[`${IDS.sprint}:Icebox`], "Export board as CSV", "Owner-only download.", 90, 3000),
    card(L[`${IDS.sprint}:Icebox`], "Dark mode", "Deferred past v1 light theme.", null, 4000),
    card(L[`${IDS.sprint}:Icebox`], "Custom fields", "Out of MVP — keep simple.", null, 5000),

    // —— Sprint Backlog ——
    card(L[`${IDS.sprint}:Backlog`], "Invite link expiry UX", "Show days remaining on invite page.", 4, 1000),
    card(L[`${IDS.sprint}:Backlog`], "Archive list confirmation", "One-click archive with undo toast later.", 5, 2000),
    card(L[`${IDS.sprint}:Backlog`], "Empty board CTA polish", "Copy from empty.* keys only.", 3, 3000),
    card(L[`${IDS.sprint}:Backlog`], "Card due date picker", "Date only for MVP; time later.", 6, 4000),
    card(L[`${IDS.sprint}:Backlog`], "Comment delete ACL tests", "Author or workspace owner.", 7, 5000),
    card(L[`${IDS.sprint}:Backlog`], "Renumber positions helper", "When midpoint precision collapses.", 8, 6000),
    card(L[`${IDS.sprint}:Backlog`], "Workspace leave edge cases", "Last owner cannot leave.", 5, 7000),
    card(L[`${IDS.sprint}:Backlog`], "Toast for conflict errors", "Map 409 to errors.conflict.", 4, 8000),
    card(L[`${IDS.sprint}:Backlog`], "Board rename inline", "No modal for rename.", 9, 9000),
    card(L[`${IDS.sprint}:Backlog`], "Filter archived boards out", "Default queries archived_at is null.", 3, 10000),

    // —— Sprint Ready ——
    card(L[`${IDS.sprint}:Ready`], "Transfer ownership API", "POST .../transfer-ownership transaction.", 2, 1000),
    card(L[`${IDS.sprint}:Ready`], "Member list on settings", "Avatar + name + role.", 2, 2000),
    card(L[`${IDS.sprint}:Ready`], "Create list at end of board", "Append with max+1000.", 1, 3000),
    card(L[`${IDS.sprint}:Ready`], "Optimistic DnD rollback", "Revert UI if move API fails.", 2, 4000),
    card(L[`${IDS.sprint}:Ready`], "i18n audit auth pages", "No hardcoded strings left.", 1, 5000),

    // —— Sprint In Progress ——
    card(L[`${IDS.sprint}:In Progress`], "Card drawer shell", "Description, due, checklist tabs.", -1, 1000),
    card(L[`${IDS.sprint}:In Progress`], "Labels CRUD on board", "Hex colors; attach to cards.", 0, 2000),
    card(L[`${IDS.sprint}:In Progress`], "Assignee picker", "Workspace members only.", 1, 3000),
    card(L[`${IDS.sprint}:In Progress`], "Checklist items API", "Hard delete; gap positions.", 1, 4000),
    card(L[`${IDS.sprint}:In Progress`], "Comments thread UI", "Newest at bottom; delete ACL.", 2, 5000),
    card(L[`${IDS.sprint}:In Progress`], "Board page N+1 cleanup", "Hydrate lists+cards in one pass.", 0, 6000),

    // —— Sprint Blocked ——
    card(L[`${IDS.sprint}:Blocked`], "Email deliverability for invites", "Waiting on SMTP domain verify.", -3, 1000),
    card(L[`${IDS.sprint}:Blocked`], "Design review for settings", "Blocked on Figma pass from Dana.", -1, 2000),
    card(L[`${IDS.sprint}:Blocked`], "Rate limit on invite accept", "Need infra decision.", 10, 3000),

    // —— Sprint Review ——
    card(L[`${IDS.sprint}:Review`], "Auth cookie session review", "Middleware refresh + protected routes.", 0, 1000),
    card(L[`${IDS.sprint}:Review`], "RLS policy smoke tests", "Cross-workspace read must fail.", 1, 2000),
    card(L[`${IDS.sprint}:Review`], "DnD cross-list persistence", "Hard refresh keeps order.", 0, 3000),
    card(L[`${IDS.sprint}:Review`], "Sign-up profile trigger", "Name from metadata.", 1, 4000),

    // —— Sprint Done ——
    card(L[`${IDS.sprint}:Done`], "Scaffold Next.js + Supabase", "Phase 1 complete.", null, 1000),
    card(L[`${IDS.sprint}:Done`], "Workspace create + owner row", "Single-owner unique index.", null, 2000),
    card(L[`${IDS.sprint}:Done`], "Empty board (zero lists)", "Clarify session decision.", null, 3000),
    card(L[`${IDS.sprint}:Done`], "List/card create endpoints", "Membership enforced.", null, 4000),
    card(L[`${IDS.sprint}:Done`], "Publishable key env wiring", "NEXT_PUBLIC_* only for app.", null, 5000),
    card(L[`${IDS.sprint}:Done`], "Bootstrap schema applied", "profiles → cards live.", null, 6000),
    card(L[`${IDS.sprint}:Done`], "Seed script v1", "Users + sample boards.", null, 7000),
    card(L[`${IDS.sprint}:Done`], "Sign-in / sign-up pages", "Toast + i18n keys.", null, 8000),

    // —— Launch ——
    card(L[`${IDS.launch}:Not started`], "Press kit PDF", "Logo + screenshots pack.", 14, 1000),
    card(L[`${IDS.launch}:Not started`], "Status page link", "Add to footer later.", 20, 2000),
    card(L[`${IDS.launch}:Not started`], "Customer advisory calls", "5 design partners.", 12, 3000),
    card(L[`${IDS.launch}:Not started`], "Pricing page draft", "Free for v1 teams.", 18, 4000),
    card(L[`${IDS.launch}:Not started`], "Security FAQ", "RLS + membership model.", 15, 5000),
    card(L[`${IDS.launch}:This week`], "Write launch blog post", "Announce team boards MVP.", 3, 1000),
    card(L[`${IDS.launch}:This week`], "Record product tour video", "3 minutes max.", 4, 2000),
    card(L[`${IDS.launch}:This week`], "Prepare demo workspace", "Busy seed for walkthrough.", 1, 3000),
    card(L[`${IDS.launch}:This week`], "Social teaser graphics", "One composition, brand first.", 2, 4000),
    card(L[`${IDS.launch}:This week`], "Support inbox routing", "Dana owns first-response.", 2, 5000),
    card(L[`${IDS.launch}:Waiting on`], "Legal review of ToS", "Waiting on counsel.", -2, 1000),
    card(L[`${IDS.launch}:Waiting on`], "Domain DNS for mail", "TXT records pending.", -5, 2000),
    card(L[`${IDS.launch}:Waiting on`], "App Store listing copy", "N/A for web MVP — park.", null, 3000),
    card(L[`${IDS.launch}:Done`], "Choose accent color", "Light theme, one accent.", null, 1000),
    card(L[`${IDS.launch}:Done`], "Logo wordmark", "Hero-level brand signal.", null, 2000),
    card(L[`${IDS.launch}:Done`], "Landing hero copy", "One headline + one CTA.", null, 3000),
    card(L[`${IDS.launch}:Done`], "Staging deploy on Vercel", "Preview URLs for QA.", null, 4000),

    // —— Roadmap ——
    card(L[`${IDS.roadmap}:Now`], "Rich cards (labels, due, checklist)", "US4 — in flight.", 7, 1000),
    card(L[`${IDS.roadmap}:Now`], "Invites + leave + transfer", "US3 — finish settings.", 5, 2000),
    card(L[`${IDS.roadmap}:Now`], "Quickstart validation pass", "All scenarios green.", 4, 3000),
    card(L[`${IDS.roadmap}:Next`], "Realtime board updates", "Supabase Realtime — post MVP.", 30, 1000),
    card(L[`${IDS.roadmap}:Next`], "File attachments", "Storage bucket + RLS.", 45, 2000),
    card(L[`${IDS.roadmap}:Next`], "Calendar / timeline view", "Deferred.", 60, 3000),
    card(L[`${IDS.roadmap}:Next`], "Second locale (he)", "next-intl ready.", 40, 4000),
    card(L[`${IDS.roadmap}:Later`], "Automations", "Out of MVP.", null, 1000),
    card(L[`${IDS.roadmap}:Later`], "SSO / SAML", "Enterprise later.", null, 2000),
    card(L[`${IDS.roadmap}:Later`], "Mobile apps", "Responsive web first.", null, 3000),
    card(L[`${IDS.roadmap}:Later`], "Custom fields", "Keep simple.", null, 4000),
    card(L[`${IDS.roadmap}:Shipped`], "Auth + workspaces", "US1 done.", null, 1000),
    card(L[`${IDS.roadmap}:Shipped`], "Lists, cards, DnD", "US2 done.", null, 2000),
    card(L[`${IDS.roadmap}:Shipped`], "Spec Kit artifacts", "spec/plan/tasks.", null, 3000),

    // —— Support ——
    card(L[`${IDS.support}:New`], "Can't invite teammate", "User: invite link 404.", -1, 1000),
    card(L[`${IDS.support}:New`], "Board loads slowly", "200+ cards — hydrate check.", 0, 2000),
    card(L[`${IDS.support}:New`], "Typo in empty state", "i18n key empty.boardsBody.", 1, 3000),
    card(L[`${IDS.support}:New`], "Password reset email delay", "Auth provider latency.", 0, 4000),
    card(L[`${IDS.support}:New`], "Request: CSV export", "Log as feature request.", 2, 5000),
    card(L[`${IDS.support}:New`], "Mobile scroll jank on DnD", "Touch path later.", 3, 6000),
    card(L[`${IDS.support}:Investigating`], "Session drops after idle", "Cookie refresh race?", -2, 1000),
    card(L[`${IDS.support}:Investigating`], "Duplicate workspace name OK?", "Confirm allowed by design.", 1, 2000),
    card(L[`${IDS.support}:Investigating`], "Card order scrambled", "Need repro with positions.", -1, 3000),
    card(L[`${IDS.support}:Investigating`], "Owner can't delete member", "Check RLS + handler.", 0, 4000),
    card(L[`${IDS.support}:Waiting on customer`], "Need HAR for CORS report", "Emailed twice.", -4, 1000),
    card(L[`${IDS.support}:Waiting on customer`], "Confirm email for invite", "Waiting on reply.", -2, 2000),
    card(L[`${IDS.support}:Waiting on customer`], "Screenshot of broken DnD", "Asked for browser + OS.", -6, 3000),
    card(L[`${IDS.support}:Resolved`], "Sign-in toast generic", "Fixed errorCode mapping.", null, 1000),
    card(L[`${IDS.support}:Resolved`], "Missing profiles table", "Schema bootstrap.", null, 2000),
    card(L[`${IDS.support}:Resolved`], "Wrong Supabase project URL", "Switched env back.", null, 3000),
    card(L[`${IDS.support}:Resolved`], "Empty boards after create", "Expected — add lists.", null, 4000),
    card(L[`${IDS.support}:Resolved`], "Service role in middleware", "Moved to publishable key.", null, 5000),

    // —— Hiring ——
    card(L[`${IDS.hiring}:Sourced`], "Frontend eng — Maya L.", "Strong Next.js.", 5, 1000),
    card(L[`${IDS.hiring}:Sourced`], "Frontend eng — Omar S.", "DnD kit experience.", 6, 2000),
    card(L[`${IDS.hiring}:Sourced`], "Full-stack — Priya N.", "Supabase + RLS.", 7, 3000),
    card(L[`${IDS.hiring}:Sourced`], "Designer — Jules K.", "Product UI.", 8, 4000),
    card(L[`${IDS.hiring}:Sourced`], "Support specialist — Sam T.", "Ops hire.", 10, 5000),
    card(L[`${IDS.hiring}:Phone screen`], "Frontend eng — Riley Q.", "Screen Thu 2pm.", 2, 1000),
    card(L[`${IDS.hiring}:Phone screen`], "Full-stack — Chris W.", "Screen Fri.", 3, 2000),
    card(L[`${IDS.hiring}:Phone screen`], "Designer — Ana V.", "Portfolio review.", 1, 3000),
    card(L[`${IDS.hiring}:Onsite`], "Frontend eng — Jordan M.", "Pair on BoardShell.", 4, 1000),
    card(L[`${IDS.hiring}:Onsite`], "Full-stack — Lee H.", "API + RLS exercise.", 5, 2000),
    card(L[`${IDS.hiring}:Offer`], "Designer — Kim O.", "Offer drafted.", 2, 1000),
    card(L[`${IDS.hiring}:Hired / Closed`], "Founding eng — Alice Chen", "Joined.", null, 1000),
    card(L[`${IDS.hiring}:Hired / Closed`], "Declined — Pat R.", "Took another offer.", null, 2000),
    card(L[`${IDS.hiring}:Hired / Closed`], "Closed role — QA contract", "Deferred hire.", null, 3000),

    // —— Side projects ——
    card(L[`${IDS.side}:Ideas`], "Personal knowledge base", "Maybe later.", null, 1000),
    card(L[`${IDS.side}:Ideas`], "Habit tracker", "Too many already.", null, 2000),
    card(L[`${IDS.side}:Ideas`], "Recipe clipper", "Browser extension.", null, 3000),
    card(L[`${IDS.side}:Ideas`], "Travel packing lists", "Reuse board UX.", null, 4000),
    card(L[`${IDS.side}:Active`], "Garden irrigation notes", "Water schedule.", 1, 1000),
    card(L[`${IDS.side}:Active`], "Home lab network map", "Draw once, keep updated.", 7, 2000),
    card(L[`${IDS.side}:Active`], "Reading list Q3", "Finish 3 books.", 20, 3000),
    card(L[`${IDS.side}:Parked`], "Podcast outline", "Paused.", null, 1000),
    card(L[`${IDS.side}:Parked`], "3D printer enclosure", "No time.", null, 2000),

    // —— Life admin ——
    card(L[`${IDS.errands}:To do`], "Renew domain", "Expires in 12 days.", 12, 1000),
    card(L[`${IDS.errands}:To do`], "Book dentist", "Morning slot.", 5, 2000),
    card(L[`${IDS.errands}:To do`], "Submit expense report", "March travel.", 2, 3000),
    card(L[`${IDS.errands}:To do`], "Buy standing desk mat", "Foam preferred.", 8, 4000),
    card(L[`${IDS.errands}:To do`], "Schedule 1:1 with Bob", "Sprint retro topics.", 3, 5000),
    card(L[`${IDS.errands}:Waiting`], "Passport renewal", "In processing.", -10, 1000),
    card(L[`${IDS.errands}:Waiting`], "Insurance claim", "Adjuster reply.", -3, 2000),
    card(L[`${IDS.errands}:Done`], "Pay quarterly taxes", "Filed.", null, 1000),
    card(L[`${IDS.errands}:Done`], "Update emergency contacts", "Done Monday.", null, 2000),
  ].filter((c) => c.list_id);

  await insertCards(cards);

  console.log("Seed complete (busy).");
  console.log(`Cards inserted: ${cards.length}`);
  console.log("Demo accounts (password from SEED_PASSWORD):");
  for (const u of USERS) console.log(`  - ${u.email} (${u.name})`);
  console.log("Workspaces: Acme Product, Acme Ops, Alice Personal");
  console.log(
    "Boards: Sprint 14, Launch Checklist, Product Roadmap, Customer Support, Hiring Pipeline, Side Projects, Life Admin",
  );
}

seed().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
