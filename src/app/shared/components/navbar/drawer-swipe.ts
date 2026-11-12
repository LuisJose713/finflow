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

  static canStart(x: number, viewportWidth: number, open: boolean, fromMenuButton = false): boolean {
    if (viewportWidth > 768 || viewportWidth <= 0) return false;
    // Preserve the system back gesture except where the visible menu button owns the touch.
    if (open) return true;
    if (fromMenuButton && x >= 0 && x <= Math.min(88, viewportWidth * .36)) return true;
    return x >= 24 && x <= Math.min(128, viewportWidth * .36);
  }

  get active(): boolean { return this.axis === 'horizontal'; }

  move(x: number, y: number, time: number): number | null {
    const dx = x - this.startX;
    const dy = y - this.startY;
    if (this.axis === 'pending') {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const wrongDirection = this.initiallyOpen ? dx > 0 : dx < 0;
      // Do not reject a pan on the first small diagonal wobble: let the
      // finger establish intent before giving the gesture to vertical scroll.
      if (absX >= 12 && absX > absY * 1.15 && !wrongDirection) {
        this.axis = 'horizontal';
      } else if (absY >= 18 && absY > absX * 1.25) {
        this.axis = 'rejected';
      } else if (wrongDirection && absX >= 18 && absX > absY) {
        this.axis = 'rejected';
      }
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
    const distance = Math.min(72, this.width * .22);
    return this.initiallyOpen ? this.dx > -distance : this.dx >= distance;
  }
}
