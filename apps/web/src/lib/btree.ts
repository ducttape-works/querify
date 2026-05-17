export type BTreeNode = {
  id: string;
  keys: number[];
  children: BTreeNode[];
  isLeaf: boolean;
};

export type StepType = "traverse" | "insert" | "split" | "found" | "not-found";

export type BTreeStep = {
  root: BTreeNode;
  highlightNodeId: string | null;
  highlightKeyIdx: number | null;
  message: string;
  type: StepType;
};

let _id = 0;

function newNode(isLeaf: boolean): BTreeNode {
  return { id: `n${_id++}`, keys: [], children: [], isLeaf };
}

function cloneNode(n: BTreeNode): BTreeNode {
  return {
    id: n.id,
    keys: [...n.keys],
    children: n.children.map(cloneNode),
    isLeaf: n.isLeaf,
  };
}

export class BTree {
  root: BTreeNode;
  readonly t: number;

  constructor(t = 2) {
    this.t = t;
    _id = 0;
    this.root = newNode(true);
  }

  private snap(
    highlightNodeId: string | null,
    highlightKeyIdx: number | null,
    message: string,
    type: StepType,
  ): BTreeStep {
    return {
      root: cloneNode(this.root),
      highlightNodeId,
      highlightKeyIdx,
      message,
      type,
    };
  }

  insert(key: number): BTreeStep[] {
    const steps: BTreeStep[] = [];

    if (this.root.keys.length === 2 * this.t - 1) {
      const old = this.root;
      const newRoot = newNode(false);
      newRoot.children.push(old);
      this.root = newRoot;
      this.splitChild(newRoot, 0, steps);
    }

    this.insertNonFull(this.root, key, steps);
    return steps;
  }

  private splitChild(parent: BTreeNode, i: number, steps: BTreeStep[]) {
    const { t } = this;
    const full = parent.children[i];
    const right = newNode(full.isLeaf);

    const median = full.keys[t - 1];
    right.keys = full.keys.splice(t);
    full.keys.splice(t - 1, 1);

    if (!full.isLeaf) right.children = full.children.splice(t);

    parent.keys.splice(i, 0, median);
    parent.children.splice(i + 1, 0, right);

    steps.push(
      this.snap(
        parent.id,
        i,
        `Node is full — ${median} moves up and the node splits in two`,
        "split",
      ),
    );
  }

  private insertNonFull(node: BTreeNode, key: number, steps: BTreeStep[]) {
    const label = node.keys.length ? `[${node.keys.join(", ")}]` : "empty node";
    steps.push(
      this.snap(
        node.id,
        null,
        `Looking at ${label} — where does ${key} go?`,
        "traverse",
      ),
    );

    let i = node.keys.length - 1;

    if (node.isLeaf) {
      while (i >= 0 && key < node.keys[i]) i--;
      node.keys.splice(i + 1, 0, key);
      steps.push(
        this.snap(
          node.id,
          i + 1,
          `Found the spot — ${key} lands here`,
          "insert",
        ),
      );
    } else {
      while (i >= 0 && key < node.keys[i]) i--;
      i++;
      if (node.children[i].keys.length === 2 * this.t - 1) {
        this.splitChild(node, i, steps);
        if (key > node.keys[i]) i++;
      }
      this.insertNonFull(node.children[i], key, steps);
    }
  }

  search(key: number): BTreeStep[] {
    const steps: BTreeStep[] = [];
    this.searchNode(this.root, key, steps);
    return steps;
  }

  private searchNode(
    node: BTreeNode,
    key: number,
    steps: BTreeStep[],
  ): boolean {
    steps.push(
      this.snap(
        node.id,
        null,
        `Checking [${node.keys.join(", ")}] — is ${key} here?`,
        "traverse",
      ),
    );

    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;

    if (i < node.keys.length && key === node.keys[i]) {
      steps.push(this.snap(node.id, i, `Found ${key}!`, "found"));
      return true;
    }

    if (node.isLeaf) {
      steps.push(
        this.snap(node.id, null, `${key} is not in the tree`, "not-found"),
      );
      return false;
    }

    return this.searchNode(node.children[i], key, steps);
  }

  seed(keys: number[]) {
    for (const key of keys) this._insert(key);
  }

  private _insert(key: number) {
    if (this.root.keys.length === 2 * this.t - 1) {
      const old = this.root;
      const s = newNode(false);
      s.children.push(old);
      this.root = s;
      this._split(s, 0);
    }
    this._insertNF(this.root, key);
  }

  private _split(parent: BTreeNode, i: number) {
    const { t } = this;
    const full = parent.children[i];
    const right = newNode(full.isLeaf);
    const median = full.keys[t - 1];
    right.keys = full.keys.splice(t);
    full.keys.splice(t - 1, 1);
    if (!full.isLeaf) right.children = full.children.splice(t);
    parent.keys.splice(i, 0, median);
    parent.children.splice(i + 1, 0, right);
  }

  private _insertNF(node: BTreeNode, key: number) {
    let i = node.keys.length - 1;
    if (node.isLeaf) {
      while (i >= 0 && key < node.keys[i]) i--;
      node.keys.splice(i + 1, 0, key);
    } else {
      while (i >= 0 && key < node.keys[i]) i--;
      i++;
      if (node.children[i].keys.length === 2 * this.t - 1) {
        this._split(node, i);
        if (key > node.keys[i]) i++;
      }
      this._insertNF(node.children[i], key);
    }
  }
}
