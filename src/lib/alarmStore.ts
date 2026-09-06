import * as SQLite from 'expo-sqlite';
import { AlarmRecord } from '../types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('calsync.db').then(async (db) => {
      const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(alarms);`);
      const hasOptionKey = columns.some((c) => c.name === 'optionKey');
      if (columns.length > 0 && !hasOptionKey) {
        // Older schema (single alarm per event) — safe to drop, nothing real has been scheduled yet.
        await db.execAsync('DROP TABLE alarms;');
      }
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS alarms (
          optionKey TEXT PRIMARY KEY NOT NULL,
          eventId TEXT NOT NULL,
          alarmId TEXT NOT NULL,
          anchor TEXT NOT NULL,
          offsetMinutes INTEGER NOT NULL,
          fireISO TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_alarms_eventId ON alarms(eventId);
      `);

      const columnsAfterCreate = await db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(alarms);`
      );
      const hasAnchorISO = columnsAfterCreate.some((c) => c.name === 'anchorISO');
      if (!hasAnchorISO) {
        // Existing rows get NULL, which reconcileAlarmsWithEvents treats as
        // "unknown baseline" and backfills on the next sync pass.
        await db.execAsync('ALTER TABLE alarms ADD COLUMN anchorISO TEXT;');
      }
      return db;
    });
  }
  return dbPromise;
}

export function makeOptionKey(eventId: string, anchor: string, offsetMinutes: number): string {
  return `${eventId}:${anchor}:${offsetMinutes}`;
}

export async function getAlarmsForEvent(eventId: string): Promise<AlarmRecord[]> {
  const db = await getDb();
  return db.getAllAsync<AlarmRecord>('SELECT * FROM alarms WHERE eventId = ?', eventId);
}

export async function getAllAlarmRecords(): Promise<AlarmRecord[]> {
  const db = await getDb();
  return db.getAllAsync<AlarmRecord>('SELECT * FROM alarms');
}

export async function saveAlarmRecord(record: AlarmRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO alarms (optionKey, eventId, alarmId, anchor, offsetMinutes, fireISO, anchorISO)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(optionKey) DO UPDATE SET
       alarmId = excluded.alarmId,
       fireISO = excluded.fireISO,
       anchorISO = excluded.anchorISO;`,
    record.optionKey,
    record.eventId,
    record.alarmId,
    record.anchor,
    record.offsetMinutes,
    record.fireISO,
    record.anchorISO
  );
}

export async function removeAlarmRecord(optionKey: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM alarms WHERE optionKey = ?', optionKey);
}
