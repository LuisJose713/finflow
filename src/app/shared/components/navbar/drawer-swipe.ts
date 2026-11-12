/** A single-finger drawer drag. All distances are CSS pixels, time is milliseconds. */
export class DrawerSwipe {
  private axis: 'pending' | 'horizontal' | 'rejected' = 'pending';
  private lastX: number;
  private lastTime: number;
  private velocity = 0;
  private dx = 0;
  readonly touchId: number;
  readonly startX: number;
  readonly startY: number;
  readonly initiallyOpen: boolean;
  readonly width: number;

  constructor(
    touchId: number,
    startX: number,
    startY: number,
    initiallyOpen: boolean,
    width: number,
    time: number,
  ) {
    this.touchId = touchId;
    this.startX = startX;
    this.startY = startY;
    this.initiallyOpen = initiallyOpen;
    this.width = width;
    this.lastX = startX;
    this.lastTime = time;
  }

  static canStart(x: number, viewportWidth: number, open: boolean): boolean {
    if (viewportWidth > 768 || viewportWidth <= 0) return false;
    // Keep the system/browser back edge free; the rest of the left zone is generous.
    return open || (x >= 24 && x <= Math.min(112, viewportWidth * .32));
  }

  get active(): boolean { return this.axis === 'horizontal'; }

  move(x: number, y: number, time: number): number | null {
    const dx = x - this.startX;
    const dy = y - this.startY;
    if (this.axis === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) {
      const wrongDirection = this.initiallyOpen ? dx > 0 : dx < 0;
      if (Math.abs(dy) >= Math.abs(dx) || wrongDirection) this.axis = 'rejected';
      else if (Math.abs(dx) >= Math.abs(dy) * 1.35) this.axis = 'horizontal';
    }
    if (!this.active) return null;
    const elapsed = time - this.lastTime;
    if (elapsed > 0) this.velocity = elapsed > 80 ? 0 : (x - this.lastX) / elapsed;
    this.lastX = x;
    this.lastTime = time;
    this.dx = dx;
    return Math.min(0, Math.max(-this.width, (this.initiallyOpen ? 0 : -this.width) + dx));
  }

  finish(time: number, x = this.lastX, y = this.startY): boolean {
    if (x !== this.lastX) this.move(x, y, time);
    if (!this.active) return this.initiallyOpen;
    const velocity = time - this.lastTime > 80 ? 0 : this.velocity;
    // A deliberate flick can finish a short drag, including a reversal.
    if (Math.abs(this.dx) >= 20 && Math.abs(velocity) >= .35) return velocity > 0;
    const distance = Math.min(88, this.width * .28);
    return this.initiallyOpen ? this.dx > -distance : this.dx >= distance;
  }
}
