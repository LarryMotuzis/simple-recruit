import { query } from '../db/pool.js';

export interface RecordAuditEntry {
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

/**
 * Records a single audit entry. Called by services after a mutating operation.
 */
export async function recordAudit({
  actorId,
  entityType,
  entityId,
  action,
  field = null,
  oldValue = null,
  newValue = null,
}: RecordAuditEntry): Promise<void> {
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
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(after)) {
    const oldVal = before[key];
    const newVal = after[key];
    if (newVal !== undefined && String(oldVal) !== String(newVal)) {
      changes.push({ field: key, oldValue: String(oldVal ?? ''), newValue: String(newVal ?? '') });
    }
  }
  return changes;
}
