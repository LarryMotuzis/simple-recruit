import { pool } from './pool.js';
import { errorMessage } from '../lib/errors.js';

const PROSPECTS = [
  // === KEEPING TABS ===
  {
    fullName: 'Elijah Carter',
    position: 'PG',
    gradYear: 2026,
    heightInches: 74,
    weightLbs: 175,
    currentSchool: 'Montverde Academy',
    region: 'Southeast',
    prospectType: 'high_school',
    stage: 'keeping_tabs',
    stageOrder: 0,
    notes: 'Elite court vision, 4-star. Visited campus informally last spring. Will evaluate at EYBL Peach Jam.',
  },
  {
    fullName: 'Marcus Webb',
    position: 'SG',
    gradYear: 2026,
    heightInches: 77,
    weightLbs: 190,
    currentSchool: 'Link Academy',
    region: 'Midwest',
    prospectType: 'high_school',
    stage: 'keeping_tabs',
    stageOrder: 1,
    notes: 'Explosive athlete, 4-star. Offer pending final evaluation at UAA circuit.',
  },
  {
    fullName: 'Dante Rosario',
    position: 'SF',
    gradYear: 2026,
    heightInches: 79,
    weightLbs: 205,
    currentSchool: 'IMG Academy',
    region: 'Southeast',
    prospectType: 'high_school',
    stage: 'keeping_tabs',
    stageOrder: 2,
    notes: '3-star with upside. Long and versatile. Need to see more off the dribble.',
  },
  {
    fullName: 'Jordan Miles',
    position: 'C',
    gradYear: 2026,
    heightInches: 83,
    weightLbs: 230,
    currentSchool: 'Oak Hill Academy',
    region: 'Southeast',
    prospectType: 'high_school',
    stage: 'keeping_tabs',
    stageOrder: 3,
    notes: '5-star. Top-5 nationally. Long shot but worth tracking — his family has ACC ties.',
  },

  // === EVALUATING ===
  {
    fullName: 'Trey Simmons',
    position: 'PG',
    gradYear: 2026,
    heightInches: 73,
    weightLbs: 170,
    currentSchool: 'La Lumiere School',
    region: 'Midwest',
    prospectType: 'high_school',
    stage: 'evaluating',
    stageOrder: 0,
    notes: 'Had unofficial visit July 12. Great feel for the game. Family is very interested in Riverbend.',
    contactPhone: '(317) 555-0184',
    contactEmail: 'simmons.family@email.com',
  },
  {
    fullName: 'Kofi Mensah',
    position: 'PF',
    gradYear: 2026,
    heightInches: 81,
    weightLbs: 220,
    currentSchool: 'Sunrise Christian Academy',
    region: 'Midwest',
    prospectType: 'high_school',
    stage: 'evaluating',
    stageOrder: 1,
    notes: 'High-motor power forward. Averaged 18/9 on the EYBL circuit. Official visit scheduled for Oct 4.',
    contactPhone: '(316) 555-0271',
  },
  {
    fullName: 'DeShawn Okafor',
    position: 'C',
    gradYear: 2025,
    heightInches: 84,
    weightLbs: 245,
    currentSchool: 'Kentucky',
    region: 'Southeast',
    prospectType: 'transfer',
    inPortal: true,
    stage: 'evaluating',
    stageOrder: 2,
    notes: 'Transfer portal. Averaged 10/7 off the bench for Kentucky. Grad transfer, eligible immediately.',
    contactEmail: 'deokafor25@email.com',
  },
  {
    fullName: 'Xavier Pope',
    position: 'SG',
    gradYear: 2025,
    heightInches: 76,
    weightLbs: 195,
    currentSchool: 'Gonzaga',
    region: 'West',
    prospectType: 'transfer',
    inPortal: true,
    stage: 'evaluating',
    stageOrder: 3,
    notes: 'Transfer portal. 42% from three last season on high volume. Wants a bigger stage.',
  },

  // === OFFERED ===
  {
    fullName: 'Isaiah Thomas Jr.',
    position: 'SF',
    gradYear: 2026,
    heightInches: 80,
    weightLbs: 210,
    currentSchool: 'Combine Academy',
    region: 'Southeast',
    prospectType: 'high_school',
    stage: 'offered',
    stageOrder: 0,
    notes: 'Offered Aug 3. 4-star. Smooth scorer, can play 2 through 4. Down to Riverbend, Kentucky, UNC.',
    contactPhone: '(704) 555-0138',
    contactEmail: 'ithomas.recruit@email.com',
  },
  {
    fullName: 'Malik Johnson',
    position: 'PF',
    gradYear: 2026,
    heightInches: 82,
    weightLbs: 225,
    currentSchool: 'Paul VI Catholic HS',
    region: 'Mid-Atlantic',
    prospectType: 'high_school',
    stage: 'offered',
    stageOrder: 1,
    notes: 'Offered July 28. Official visit Sep 20. His AAU coach played at Riverbend — strong relationship.',
    contactPhone: '(703) 555-0392',
  },
  {
    fullName: 'Cameron Ellis',
    position: 'PG',
    gradYear: 2025,
    heightInches: 72,
    weightLbs: 165,
    currentSchool: 'Memphis',
    region: 'Southeast',
    prospectType: 'transfer',
    inPortal: true,
    stage: 'offered',
    stageOrder: 2,
    notes: 'Transfer portal. Offered July 30. Elite facilitator, 8.4 APG last season. Visit set for Aug 15.',
    contactEmail: 'cam.ellis.bball@email.com',
  },

  // === COMMITTED ===
  {
    fullName: 'Aaron Mitchell',
    position: 'SG',
    gradYear: 2026,
    heightInches: 78,
    weightLbs: 185,
    currentSchool: 'Sierra Canyon School',
    region: 'West',
    prospectType: 'high_school',
    stage: 'committed',
    stageOrder: 0,
    notes: 'Committed Aug 10. 5-star. #3 nationally. Called Coach Whitfield personally to commit. Riverbend Nation.',
    contactPhone: '(818) 555-0247',
    contactEmail: 'mitchell.aaron2026@email.com',
  },
  {
    fullName: 'Darius Kwame',
    position: 'C',
    gradYear: 2026,
    heightInches: 82,
    weightLbs: 235,
    currentSchool: 'Prolific Prep',
    region: 'West',
    prospectType: 'high_school',
    stage: 'committed',
    stageOrder: 1,
    notes: 'Committed July 4. 4-star. Rim-running big with soft hands. Will enroll in January.',
    contactPhone: '(707) 555-0163',
  },
];

const EVALUATIONS = [
  { prospectName: 'Trey Simmons',      coachEmail: 'dwhitfield@riverbendu.edu', rating: 8, text: 'Watched him at the EYBL session in Atlanta. Pace and poise stands out — never seems rushed. Two live turnovers both came from teammates. Real floor general. I want to see him against elite athletes at Peach Jam before we pull the trigger on an offer.' },
  { prospectName: 'Trey Simmons',      coachEmail: 'mreeves@riverbendu.edu',    rating: 8, text: 'Caught the second session. His handle under pressure is already college-ready. Needs to add strength. His pull-up mid-range is a weapon. Strong lean toward offer.' },
  { prospectName: 'Kofi Mensah',       coachEmail: 'dwhitfield@riverbendu.edu', rating: 7, text: 'Film review on Sunrise Christian. Motor is elite — never stops competing on the glass. Footwork on the block is raw but coachable. Screened for Sunrise more than I would like but that is a system thing. Think he fits our style at the 4.' },
  { prospectName: 'DeShawn Okafor',    coachEmail: 'mreeves@riverbendu.edu',    rating: 7, text: 'Spoke with his agent. Looking for a program where he can showcase as a starter. 10/7 off the bench at Kentucky says he can play; questions are around motor and focus. His size is exactly what we need in the post.' },
  { prospectName: 'Xavier Pope',       coachEmail: 'dwhitfield@riverbendu.edu', rating: 8, text: 'Reviewed full Gonzaga season. Shot creation off movement is as good as advertised. Does need the ball in his hands too much at times. Would need to buy in to off-ball role here. Set a Zoom for next week.' },
  { prospectName: 'Isaiah Thomas Jr.', coachEmail: 'mreeves@riverbendu.edu',    rating: 9, text: 'Official visit went extremely well. His mom loved the academic side. He was locked in during the film session with coaches. Only real competition for us is Kentucky. Need to stay aggressive — I think we get him if we keep the relationship strong.' },
  { prospectName: 'Aaron Mitchell',    coachEmail: 'dwhitfield@riverbendu.edu', rating: 10, text: 'Commitment call was genuine — he was emotional. Family is first-class. Already talking about being here for 2-3 years and winning. This is a cornerstone piece of the 2026 class.' },
  { prospectName: 'Aaron Mitchell',    coachEmail: 'mreeves@riverbendu.edu',    rating: 10, text: 'Watched him at the Nike EYBL Finals. Shot 6/10 from three against a loaded Nightrydas lineup. His pull-up game is NBA-ready now. We landed a special one.' },
  { prospectName: 'Darius Kwame',      coachEmail: 'dwhitfield@riverbendu.edu', rating: 9, text: 'Caught him at Prolific Prep vs Montverde. He held his own against a top-5 center. Rolls to the rim relentlessly. Will be a load in the ACC immediately.' },
];

async function seedDemoProspects() {
  // Find the head coach to use as created_by
  const coachResult = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    ['dwhitfield@riverbendu.edu']
  );
  if (coachResult.rows.length === 0) {
    console.error('Riverbend coaches not found — run seed_demo_team.js first');
    process.exit(1);
  }
  const headCoachId = coachResult.rows[0].id;

  const assistantResult = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    ['mreeves@riverbendu.edu']
  );
  const assistantId = assistantResult.rows[0].id;

  const coachIds: Record<string, string> = {
    'dwhitfield@riverbendu.edu': headCoachId,
    'mreeves@riverbendu.edu': assistantId,
  };

  // Insert prospects
  const prospectIds: Record<string, string> = {};
  let added = 0;
  let skipped = 0;

  for (const p of PROSPECTS) {
    const existing = await pool.query(
      'SELECT id FROM prospects WHERE full_name = $1',
      [p.fullName]
    );
    if (existing.rows.length > 0) {
      console.log(`  Prospect: ${p.fullName} already exists — skipping`);
      prospectIds[p.fullName] = existing.rows[0].id;
      skipped++;
      continue;
    }

    const result = await pool.query(
      `INSERT INTO prospects
         (full_name, position, grad_year, height_inches, weight_lbs, current_school,
          region, prospect_type, in_portal, stage, stage_order, notes,
          contact_phone, contact_email, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        p.fullName, p.position, p.gradYear, p.heightInches, p.weightLbs ?? null,
        p.currentSchool, p.region ?? null, p.prospectType,
        p.inPortal ?? false, p.stage, p.stageOrder, p.notes ?? null,
        p.contactPhone ?? null, p.contactEmail ?? null, headCoachId,
      ]
    );
    prospectIds[p.fullName] = result.rows[0].id;
    console.log(`  Prospect: added ${p.fullName} (${p.stage})`);
    added++;

    // Auto-add committed prospects to Riverbend's roster
    if (p.stage === 'committed') {
      const teamResult = await pool.query('SELECT team_id FROM users WHERE id = $1', [headCoachId]);
      const teamId = teamResult.rows[0]?.team_id ?? null;
      await pool.query(
        `INSERT INTO roster (full_name, position, prospect_id, created_by, user_id, team_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [p.fullName, p.position, result.rows[0].id, headCoachId, headCoachId, teamId]
      );
      console.log(`    → Added to roster (committed)`);
    }
  }

  // Insert evaluations
  let evalAdded = 0;
  for (const e of EVALUATIONS) {
    const prospectId = prospectIds[e.prospectName];
    if (!prospectId) { console.log(`  Eval: prospect not found for "${e.prospectName}" — skipping`); continue; }
    const authorId = coachIds[e.coachEmail];
    if (!authorId) continue;

    const existing = await pool.query(
      'SELECT id FROM evaluations WHERE prospect_id = $1 AND author_id = $2 AND notes = $3',
      [prospectId, authorId, e.text]
    );
    if (existing.rows.length > 0) { continue; }

    await pool.query(
      `INSERT INTO evaluations (prospect_id, author_id, rating, notes) VALUES ($1,$2,$3,$4)`,
      [prospectId, authorId, e.rating, e.text]
    );
    evalAdded++;
  }

  await pool.end();
  console.log(`\nRiverbend prospects seed complete. Added: ${added}, skipped: ${skipped}, evaluations: ${evalAdded}`);
}

seedDemoProspects().catch(err => {
  console.error('Seed failed:', errorMessage(err));
  process.exit(1);
});
