import fs from 'node:fs';
import path from 'node:path';
import {
  createInitialOrchestratedState,
  DEFAULT_STUDENT_ID,
} from '../src/lib/agentContracts.ts';
import type { OrchestratedLearnerState } from '../src/types/edu.ts';

interface DbSchema {
  version: number;
  students: Record<string, OrchestratedLearnerState>;
}

const DEFAULT_DB_PATH = path.resolve(process.cwd(), '.edulevel-db.json');

export class LearnerStore {
  private readonly dbPath: string;

  constructor(dbPath = DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
  }

  private readDb(): DbSchema {
    try {
      if (!fs.existsSync(this.dbPath)) {
        return { version: 1, students: {} };
      }
      const raw = fs.readFileSync(this.dbPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DbSchema>;
      if (!parsed || typeof parsed !== 'object' || !parsed.students) {
        return { version: 1, students: {} };
      }
      return {
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        students: parsed.students,
      };
    } catch {
      return { version: 1, students: {} };
    }
  }

  private writeDb(db: DbSchema): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${this.dbPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmpPath, this.dbPath);
  }

  getStudentState(studentId = DEFAULT_STUDENT_ID): OrchestratedLearnerState {
    const db = this.readDb();
    const existing = db.students[studentId];
    if (existing && existing.studentId === studentId && Array.isArray(existing.concepts)) {
      return existing;
    }
    const initial = createInitialOrchestratedState(studentId);
    db.students[studentId] = initial;
    this.writeDb(db);
    return initial;
  }

  saveStudentState(state: OrchestratedLearnerState): OrchestratedLearnerState {
    const db = this.readDb();
    const updated: OrchestratedLearnerState = {
      ...state,
      updatedAt: new Date().toISOString(),
    };
    db.students[updated.studentId] = updated;
    this.writeDb(db);
    return updated;
  }

  resetStudentState(studentId = DEFAULT_STUDENT_ID): OrchestratedLearnerState {
    const db = this.readDb();
    const fresh = createInitialOrchestratedState(studentId);
    db.students[studentId] = fresh;
    this.writeDb(db);
    return fresh;
  }
}

export const defaultLearnerStore = new LearnerStore();
