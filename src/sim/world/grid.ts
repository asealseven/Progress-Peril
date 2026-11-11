// Uniform spatial grid for neighbour and targeting queries (GDD 9.15).

export class SpatialGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly cells: number[][];

  constructor(
    width: number,
    height: number,
    readonly cellSize: number,
  ) {
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(height / cellSize));
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
  }

  clear(): void {
    for (const cell of this.cells) cell.length = 0;
  }

  private col(x: number): number {
    return Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
  }

  private row(y: number): number {
    return Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
  }

  insert(slot: number, x: number, y: number): void {
    this.cells[this.row(y) * this.cols + this.col(x)]?.push(slot);
  }

  /**
   * Collects the slots in every cell touching the circle's bounding box.
   * Callers run the exact distance test. Clears and returns `out`.
   */
  query(x: number, y: number, radius: number, out: number[]): number[] {
    out.length = 0;
    const minCol = this.col(x - radius);
    const maxCol = this.col(x + radius);
    const minRow = this.row(y - radius);
    const maxRow = this.row(y + radius);
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cell = this.cells[row * this.cols + col];
        if (!cell) continue;
        for (const slot of cell) out.push(slot);
      }
    }
    return out;
  }
}
