import * as SQLite from 'expo-sqlite';
import { AlarmRecord } from '../types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('calsync.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS alarms (
          eventId TEXT PRIMARY KEY NOT NULL,
          alarmId TEXT NOT NULL,
          anchor TEXT NOT NULL DEFAULT 'start',
          offsetMinutes INTEGER NOT NULL,
          fireISO TEXT NOT NULL
        );
      `);
      try {
        await db.execAsync(`ALTER TABLE alarms ADD COLUMN anchor TEXT NOT NULL DEFAULT 'start';`);
      } catch {
        // column already exists
      }
      return db;
    });
  }
  return dbPromise;
}

export async function getAlarmForEvent(eventId: string): Promise<AlarmRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AlarmRecord>(
    'SELECT * FROM alarms WHERE eventId = ?',
    eventId
  );
  return row ?? null;
}

export async function getAllAlarmRecords(): Promise<AlarmRecord[]> {
  const db = await getDb();
  return db.getAllAsync<AlarmRecord>('SELECT * FROM alarms');
}

export async function saveAlarmRecord(record: AlarmRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO alarms (eventId, alarmId, anchor, offsetMinutes, fireISO)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(eventId) DO UPDATE SET
       alarmId = excluded.alarmId,
       anchor = excluded.anchor,
       offsetMinutes = excluded.offsetMinutes,
       fireISO = excluded.fireISO;`,
    record.eventId,
    record.alarmId,
    record.anchor,
    record.offsetMinutes,
    record.fireISO
  );
}

export async function removeAlarmRecord(eventId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM alarms WHERE eventId = ?', eventId);
}
