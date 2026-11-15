import { Injectable, signal } from '@angular/core';

/** Contextual, opt-in tutorial: never creates or edits a transaction itself. */
@Injectable({ providedIn: 'root' })
export class TransactionWalkthroughService {
  /** -1 = inactive; 0 = tap new transaction; 1..6 = form steps. */
  readonly step = signal(-1);
  start(): void { this.step.set(0); }
  advance(expected: number): void {
    if (this.step() === expected) this.step.set(expected + 1);
  }
  finish(): void { this.step.set(-1); }
}
