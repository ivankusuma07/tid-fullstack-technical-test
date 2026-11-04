export const CLOCK = Symbol('CLOCK');

/** Abstracted so date rules ("not in the future", start_date = now) are testable. */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
