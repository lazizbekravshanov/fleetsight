/**
 * Union-Find (Disjoint Set Union) with path compression and union by rank.
 * Used to cluster carriers that share VINs transitively.
 *
 * If A shares a VIN with B, and B shares a different VIN with C,
 * then A-B-C are all in the same affiliation cluster.
 *
 * Time complexity: O(N × α(N)) where α is inverse Ackermann (effectively constant).
 */
export class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  makeSet(x: string): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  find(x: string): string {
    const p = this.parent.get(x);
    if (p === undefined) {
      this.makeSet(x);
      return x;
    }
    if (p !== x) {
      // Path compression
      const root = this.find(p);
      this.parent.set(x, root);
      return root;
    }
    return x;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA) ?? 0;
    const rankB = this.rank.get(rootB) ?? 0;

    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }

  connected(a: string, b: string): boolean {
    return this.find(a) === this.find(b);
  }

  /**
   * Returns clusters with 2+ members.
   * Key = root node, Value = array of all members.
   */
  getClusters(): Map<string, string[]> {
    const clusters = new Map<string, string[]>();
    for (const [node] of this.parent) {
      const root = this.find(node);
      const members = clusters.get(root) ?? [];
      members.push(node);
      clusters.set(root, members);
    }

    // Filter to multi-member clusters only
    const result = new Map<string, string[]>();
    for (const [root, members] of clusters) {
      if (members.length >= 2) {
        result.set(root, members.sort());
      }
    }
    return result;
  }

  get size(): number {
    return this.parent.size;
  }
}
