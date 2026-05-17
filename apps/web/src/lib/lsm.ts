export type LSMEntry = { key: number; value: string };
export type SSTable = { id: string; entries: LSMEntry[] };

export type LSMState = {
  memTable: LSMEntry[];
  l0: SSTable[];
  l1: SSTable | null;
};

export type LSMStepType =
  | "write"
  | "flush"
  | "compact"
  | "search-mem"
  | "search-l0"
  | "search-l1"
  | "found"
  | "not-found";

export type LSMHighlight = {
  level: "memtable" | "l0" | "l1";
  tableIdx?: number;
  keyIdx?: number;
} | null;

export type LSMStep = {
  state: LSMState;
  highlight: LSMHighlight;
  message: string;
  type: LSMStepType;
};

export const MEMTABLE_CAPACITY = 4;
export const L0_CAPACITY = 3;

function cloneState(s: LSMState): LSMState {
  return {
    memTable: s.memTable.map((e) => ({ ...e })),
    l0: s.l0.map((t) => ({ id: t.id, entries: t.entries.map((e) => ({ ...e })) })),
    l1: s.l1 ? { id: s.l1.id, entries: s.l1.entries.map((e) => ({ ...e })) } : null,
  };
}

export class LSMTree {
  private _sstId = 0;
  private s: LSMState = { memTable: [], l0: [], l1: null };

  private newSSTable(entries: LSMEntry[]): SSTable {
    return { id: `sst${this._sstId++}`, entries: [...entries] };
  }

  getState(): LSMState {
    return cloneState(this.s);
  }

  seed(pairs: [number, string][]) {
    for (const [key, value] of pairs) this._insertSilent(key, value);
  }

  private _insertSilent(key: number, value: string) {
    const idx = this.s.memTable.findIndex((e) => e.key === key);
    if (idx !== -1) {
      this.s.memTable[idx].value = value;
    } else {
      this.s.memTable.push({ key, value });
      this.s.memTable.sort((a, b) => a.key - b.key);
    }
    if (this.s.memTable.length >= MEMTABLE_CAPACITY) this._flushSilent();
    if (this.s.l0.length >= L0_CAPACITY) this._compactSilent();
  }

  private _flushSilent() {
    this.s.l0.push(this.newSSTable(this.s.memTable));
    this.s.memTable = [];
  }

  private _compactSilent() {
    const merged: LSMEntry[] = [];
    const seen = new Set<number>();
    for (let i = this.s.l0.length - 1; i >= 0; i--) {
      for (const e of this.s.l0[i].entries) {
        if (!seen.has(e.key)) { seen.add(e.key); merged.push({ ...e }); }
      }
    }
    if (this.s.l1) {
      for (const e of this.s.l1.entries) {
        if (!seen.has(e.key)) { seen.add(e.key); merged.push({ ...e }); }
      }
    }
    merged.sort((a, b) => a.key - b.key);
    this.s.l0 = [];
    this.s.l1 = this.newSSTable(merged);
  }

  private snap(hl: LSMHighlight, msg: string, type: LSMStepType): LSMStep {
    return { state: cloneState(this.s), highlight: hl, message: msg, type };
  }

  insert(key: number, value: string): LSMStep[] {
    const steps: LSMStep[] = [];

    const memIdx = this.s.memTable.findIndex((e) => e.key === key);
    if (memIdx !== -1) {
      this.s.memTable[memIdx].value = value;
      steps.push(this.snap(
        { level: "memtable", keyIdx: memIdx },
        `Key ${key} is already in the MemTable — updated in place`,
        "write",
      ));
      return steps;
    }

    this.s.memTable.push({ key, value });
    this.s.memTable.sort((a, b) => a.key - b.key);
    const newIdx = this.s.memTable.findIndex((e) => e.key === key);
    steps.push(this.snap(
      { level: "memtable", keyIdx: newIdx },
      `Write ${key} → MemTable (${this.s.memTable.length}/${MEMTABLE_CAPACITY} entries)`,
      "write",
    ));

    if (this.s.memTable.length >= MEMTABLE_CAPACITY) {
      steps.push(this.snap(
        { level: "memtable" },
        `MemTable is full (${MEMTABLE_CAPACITY}/${MEMTABLE_CAPACITY}) — flushing to a new L0 SSTable`,
        "flush",
      ));
      this._flushSilent();
      steps.push(this.snap(
        { level: "l0", tableIdx: this.s.l0.length - 1 },
        `Flushed to L0 SSTable ${this.s.l0.length} — sorted and immutable. MemTable cleared.`,
        "flush",
      ));

      if (this.s.l0.length >= L0_CAPACITY) {
        steps.push(this.snap(
          { level: "l0" },
          `L0 has ${this.s.l0.length} SSTables — compacting into L1 (merge sort)`,
          "compact",
        ));
        this._compactSilent();
        steps.push(this.snap(
          { level: "l1" },
          `Compaction done — L0 cleared, all entries merged into a single sorted L1 SSTable`,
          "compact",
        ));
      }
    }

    return steps;
  }

  search(key: number): LSMStep[] {
    const steps: LSMStep[] = [];

    steps.push(this.snap(
      { level: "memtable" },
      `Search ${key} — start with MemTable (most recent writes are here)`,
      "search-mem",
    ));

    const memIdx = this.s.memTable.findIndex((e) => e.key === key);
    if (memIdx !== -1) {
      steps.push(this.snap(
        { level: "memtable", keyIdx: memIdx },
        `Found ${key} in MemTable!`,
        "found",
      ));
      return steps;
    }

    if (this.s.l0.length > 0) {
      steps.push(this.snap(
        null,
        `${key} not in MemTable — checking L0 SSTables newest first`,
        "search-l0",
      ));
      for (let i = this.s.l0.length - 1; i >= 0; i--) {
        const sst = this.s.l0[i];
        steps.push(this.snap(
          { level: "l0", tableIdx: i },
          `Checking L0 SSTable ${i + 1} for ${key}`,
          "search-l0",
        ));
        const ei = sst.entries.findIndex((e) => e.key === key);
        if (ei !== -1) {
          steps.push(this.snap(
            { level: "l0", tableIdx: i, keyIdx: ei },
            `Found ${key} in L0 SSTable ${i + 1}!`,
            "found",
          ));
          return steps;
        }
      }
    }

    if (this.s.l1) {
      steps.push(this.snap(
        { level: "l1" },
        `Not in L0 — checking L1 (the fully sorted, compacted SSTable)`,
        "search-l1",
      ));
      const ei = this.s.l1.entries.findIndex((e) => e.key === key);
      if (ei !== -1) {
        steps.push(this.snap(
          { level: "l1", keyIdx: ei },
          `Found ${key} in L1!`,
          "found",
        ));
        return steps;
      }
    }

    steps.push(this.snap(null, `${key} is not in the tree`, "not-found"));
    return steps;
  }
}
