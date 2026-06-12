import { query } from '../db/pool.js';

/**
 * Records a single audit entry. Called by services after a mutating operation.
 *
 * @param {object} entry
 * @param {string} entry.actorId      - user id who performed the action
 * @param {string} entry.entityType   - 'prospect' | 'evaluation' | 'stat_entry'
 * @param {string} entry.entityId
 * @param {string} entry.action       - 'create' | 'update' | 'stage_change' | 'archive'
 * @param {string} [entry.field]
 * @param {string} [entry.oldValue]
 * @param {string} [entry.newValue]
 */
export async function recordAudit({ actorId, entityType, entityId, action, field = null, oldValue = null, newValue = null }) {
  await query(
    `INSERT INTO audit_log (actor_id, entity_type, entity_id, action, field, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorId, entityType, entityId, action, field, oldValue, newValue]
  );
}

/**
 * Given an existing record and an update payload, return one audit entry per
 * changed field. Pure function — easy to unit test.
 */
export function diffFields(before, after) {
  const changes = [];
  for (const key of Object.keys(after)) {
    const oldVal = before[key];
    const newVal = after[key];
    if (newVal !== undefined && String(oldVal) !== String(newVal)) {
      changes.push({ field: key, oldValue: String(oldVal ?? ''), newValue: String(newVal ?? '') });
    }
  }
  return changes;
}
