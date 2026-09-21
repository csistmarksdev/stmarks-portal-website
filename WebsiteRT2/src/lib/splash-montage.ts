/**
 * The splash montage's arithmetic and running order, apart from the DOM.
 *
 * This lives outside `components/common/splash-screen.tsx` for one reason: it
 * is the part that can be wrong in ways nobody sees. The component's job is
 * layers and attributes, which either look right or do not; this file decides
 * *how many photographs are shown*, in what order and for how long, and a
 * mistake here is a montage that runs beautifully and quietly drops two thirds
 * of the parish. That happened - a reduced-motion branch capped the sequence at
 * three images - and it survived a build, a typecheck and a lint because
 * nothing could execute it without a browser.
 *
 * So it is pure: no DOM, no timers of its own, no `window`. `scripts/verify-splash-montage.mjs`
 * drives every function here against the real manifest with a virtual clock and
 * asserts that the sequence visits every image exactly once.
 */

/**
 * The bounds and the shape of the acceleration.
 *
 * `hold(k) = end + (start - end) * (1 - k / (n - 1)) ** curve`
 *
 * with `start`, `end` and the budget all derived from the image count, so the
 * sequence accelerates by about the same ratio whether it is showing four
 * photographs or four hundred. Three images get a slow held opening; a hundred
 * get a fast one. Both are the same gesture at different sizes.
 */
export interface MontageProfile {
  /** Shortest a photograph may be held. */
  floor: number;
  /** Longest a photograph may be held. */
  ceiling: number;
  /** Curve exponent: higher spends more of the budget on the opening frames. */
  curve: number;
  /** Budget = base + perImage * count, clamped to [min, max]. */
  base: number;
  perImage: number;
  min: number;
  max: number;
  /**
   * Where the curve settles, as a fraction of the montage's average hold.
   *
   * This is what decides whether the sequence is still accelerating when it
   * reaches its last photograph. Set too high, the curve converges on the
   * average early and the final quarter runs at one flat speed - a climax that
   * has stopped building. Around a quarter puts the asymptote below the floor,
   * so every frame to the last is shorter than the one before it.
   */
  endFactor: number;
  /** Crossfade as a fraction of the hold it belongs to, and its bounds. */
  fadeRatio: number;
  fadeMin: number;
  fadeMax: number;
  /** How much a hold is jittered by, as a fraction of itself. */
  jitter: number;
}

/**
 * The montage as most readers see it: two fifths of a second on the opening
 * photograph, a twentieth on the last.
 *
 * At the parish's present fifty-four images the ladder runs
 *
 *     418 392 368 345 323 303 284 265 248 232 217 203 189 177 166 155
 *     145 136 127 119 112 105  99  93  88  84  79  76  72  69  67  64
 *      62  60  59  57  56  55  54  54  53  52  52  52  52  52  52  52
 *      52  52  52  52  52  52
 *
 * - seven seconds, and the same gesture it has always been: a held opening
 * that gives way, frame by frame, to a run of cuts at the floor.
 *
 * It used to run to eleven. The budget came down; nothing else about the shape
 * did. `floor` is untouched at 52ms, so the *speed the sequence arrives at* is
 * exactly what it was - what is shorter is the languid opening and the descent,
 * which is the part that was costing the reader eleven seconds of their first
 * visit. The ratio between the first hold and the last is 8:1 where it was
 * 13:1, which is still unmistakably slow-to-fast.
 *
 * The cost, and it is the one worth knowing about: the last thirteen holds sit
 * on the floor rather than each being a hair shorter than the one before. A
 * climax that has stopped building is not ideal - but the alternative is
 * dropping the floor under 52ms, and 19 cuts a second is already the point
 * where a photograph stops being a photograph. The plateau is the honest price
 * of showing all fifty-four in seven seconds.
 *
 * `max` remains the number worth arguing about, and the single knob: it caps
 * the whole sequence, so lowering it shortens the opening and steepens the
 * descent without touching the speed at the end.
 */
export const CINEMATIC: MontageProfile = {
  floor: 52,
  ceiling: 1600,
  curve: 3.8,
  base: 1300,
  perImage: 109,
  min: 1700,
  max: 7000,
  endFactor: 0.28,
  fadeRatio: 0.4,
  fadeMin: 24,
  fadeMax: 620,
  /*
   * Small on purpose. Some slop keeps the cuts from being metronomic, but the
   * curve's neighbouring holds differ by only a few percent through the middle
   * of the sequence - at 7% the jitter was larger than the trend it was
   * decorating, and the ladder read `530 551 500`, which the eye takes as a
   * wobble rather than as acceleration.
   */
  jitter: 0.035,
};

/**
 * The montage for a reader who has asked for less motion - and for the lite
 * tier, which gets it for a different reason.
 *
 * It shows *every* photograph, exactly as the cinematic profile does. What
 * changes is the character: nothing is ever held for less than 100ms, the ramp
 * is shallower, and the crossfade is most of the hold rather
 * than a fraction of it - so consecutive images are almost always dissolving
 * into one another and the sequence reads as one continuous slow blend instead
 * of a series of cuts. There is no flashing anywhere in it at any point.
 *
 * This replaced a branch that showed three photographs and stopped. That was
 * the wrong trade: "less motion" is a request about how things move, not an
 * instruction to withhold most of the content, and a reader who has turned
 * animations down at the OS level was being shown a different site.
 *
 * Shortened with the cinematic profile, and the floor had to come with it:
 * fifty-four images at the old 150ms floor is eight seconds before the ramp is
 * counted, so a smaller budget would have clamped every hold to the floor and
 * flattened the ramp into a metronome. At 100ms the ladder still descends from
 * 156 to 100 across the sequence. Nothing here is a cut regardless - the
 * crossfade is 85% of the hold, so one photograph is still arriving as the next
 * begins, which is what "less motion" is actually asking for.
 */
export const GENTLE: MontageProfile = {
  floor: 100,
  ceiling: 1400,
  curve: 1.6,
  base: 1500,
  perImage: 150,
  min: 1700,
  max: 6500,
  /*
   * Higher than the cinematic profile's on purpose. This montage is not
   * building to anything - it is a long even dissolve - so there is nothing
   * wrong with the curve settling before the end.
   */
  endFactor: 0.4,
  /* Nearly the whole hold, so one photograph is still arriving as the next
     begins - a continuous dissolve rather than a cut with a soft edge. */
  fadeRatio: 0.85,
  fadeMin: 105,
  fadeMax: 600,
  jitter: 0.04,
};

/** One beat of the montage. */
export interface Beat {
  hold: number;
  fade: number;
}

/**
 * Fisher-Yates over `count` positions, returning the running order.
 *
 * Position zero is left alone deliberately. The first photograph is the only
 * one with a `src` in the server-rendered HTML, and therefore the only one
 * guaranteed to have decoded when the montage starts - opening on a random
 * un-decoded frame risks a blank first cut on a cold connection. Every other
 * position is shuffled, so no two launches run the same order.
 *
 * The returned array is always exactly `count` long and is always a
 * permutation: shuffling changes the order and never the number.
 */
export function shuffleOrder(count: number, random = Math.random): number[] {
  const order = Array.from({ length: count }, (_, index) => index);

  for (let k = order.length - 1; k > 1; k -= 1) {
    const swap = 1 + Math.floor(random() * k);
    [order[k], order[swap]] = [order[swap], order[k]];
  }

  return order;
}

/**
 * The holds and crossfades for a montage of `count` photographs.
 *
 * One entry per photograph - always, whatever the count and whatever the
 * profile. There is no branch in here that returns fewer.
 *
 * The budget is derived from the count, `start` and `end` are derived from the
 * budget, and a single uniform scale corrects the arithmetic to land on it.
 * Scaling uniformly is what preserves the shape: the ratio between the first
 * hold and the last stays about the same at any collection size.
 */
export function planMontage(
  count: number,
  profile: MontageProfile = CINEMATIC,
  random = Math.random,
): Beat[] {
  if (count <= 0) return [];

  const budget = Math.min(
    profile.max,
    Math.max(profile.min, profile.base + profile.perImage * count),
  );

  const end = Math.min(
    profile.ceiling / 4,
    Math.max(profile.floor, (budget / count) * profile.endFactor),
  );

  const start = Math.min(
    profile.ceiling,
    Math.max(end * 1.6, end + ((budget - end * count) * (profile.curve + 1)) / count),
  );

  const raw: number[] = [];

  for (let k = 0; k < count; k += 1) {
    raw.push(
      end + (start - end) * (1 - k / Math.max(1, count - 1)) ** profile.curve,
    );
  }

  const total = raw.reduce((sum, hold) => sum + hold, 0);
  const scale = total > 0 ? budget / total : 1;

  return raw.map((hold) => {
    const scaled = Math.min(
      profile.ceiling,
      Math.max(profile.floor, hold * scale),
    );

    // Jittered last, so the jitter can never push a hold under the floor.
    const jittered = Math.max(
      profile.floor,
      scaled * (1 + (random() * 2 - 1) * profile.jitter),
    );

    return {
      hold: jittered,
      fade: Math.min(
        profile.fadeMax,
        Math.max(profile.fadeMin, jittered * profile.fadeRatio),
      ),
    };
  });
}

export interface MontageOptions {
  /** Running order: indices into the caller's image list, each exactly once. */
  order: number[];
  /** One beat per image, from {@link planMontage}. */
  beats: Beat[];
  /** Whether the image at this index has decoded and can be shown. */
  isReady(index: number): boolean;
  /** Whether the image at this index failed to load and must be given up on. */
  isBroken(index: number): boolean;
  /** Put this image on screen. `position` counts from 0. */
  onShow(image: {
    index: number;
    position: number;
    total: number;
    hold: number;
    fade: number;
  }): void;
  /** Called once, after the last photograph has been put on screen. */
  onComplete(): void;
  /** Timer plumbing, so this can be driven by a virtual clock in tests. */
  schedule(run: () => void, delay: number): number;
  cancel(handle: number): void;
  /** The clock. Injected so a test can drive the montage without waiting. */
  now?(): number;
}

export interface Montage {
  start(): void;
  stop(): void;
}

/**
 * How many beats the montage will wait on a photograph that has not arrived
 * before moving it to the back of the queue. It is only ever moved, never
 * dropped - only an image that has actually failed is given up on.
 */
const STALL_BEATS = 2;

/**
 * The director: decides which photograph is next and when, and nothing else.
 *
 * The queue is the guarantee. It starts as every position after the opener and
 * only ever shrinks, by exactly one entry per photograph shown - so the number
 * of images displayed is the number of images given, on a fast connection and a
 * slow one alike. A frame that has not decoded when its turn comes is moved
 * back and retried rather than skipped, because skipping would make the montage
 * show a different number of photographs depending on the network, which is the
 * one thing it is not allowed to do.
 *
 * Exactly one timer is outstanding at any moment. `stop` cancels it and makes
 * the director inert, so a montage cannot outlive the component that started
 * it or fire after the splash has gone.
 */
export function createMontage(options: MontageOptions): Montage {
  const { order, beats, isReady, isBroken, onShow, onComplete } = options;

  const now = options.now ?? (() => Date.now());

  const total = order.length;
  const queue = order.slice(1);

  let position = 0;
  let stalled = 0;
  let timer = 0;
  let stopped = false;
  let completed = false;

  /*
   * The montage runs against an absolute timeline, not a chain of relative
   * delays.
   *
   * `setTimeout(hold)` measures from the moment it is called, so every beat
   * pays for whatever the main thread was doing when its predecessor fired - a
   * decode, a style recalc, React hydrating - and those debts accumulate. At
   * the fast end the holds are shorter than the debts: a montage planned at
   * eleven seconds took closer to eighteen in a real browser, which is how the
   * splash came to be dismissed on schedule with two thirds of the parish
   * still unshown.
   *
   * So each beat is scheduled to land at `planned`, the sum of every hold so
   * far, measured from one fixed start. A beat that runs late shortens the next
   * delay instead of pushing it back, and the sequence holds its shape.
   */
  const startedAt = now();
  let planned = 0;

  /** Never zero: a montage that has fallen behind should catch up over several
   * frames rather than firing a burst of beats the reader cannot see. */
  const MIN_DELAY = 16;

  const scheduleNext = (hold: number) => {
    planned += hold;
    const delay = Math.max(MIN_DELAY, planned - (now() - startedAt));
    timer = options.schedule(advance, delay);
  };

  const finish = () => {
    if (completed) return;
    completed = true;
    onComplete();
  };

  const beatAt = (k: number) => beats[Math.min(k, beats.length - 1)];

  function advance() {
    if (stopped) return;

    /*
     * The next photograph: the first in the queue that has decoded. Anything
     * ahead of it that has not is left where it is, unless it has been holding
     * the montage up for `STALL_BEATS`, at which point it goes to the back and
     * is given more time to arrive.
     */
    let pick = -1;

    for (let k = 0; k < queue.length; k += 1) {
      const candidate = queue[k];

      if (isBroken(candidate)) {
        queue.splice(k, 1);
        k -= 1;
        continue;
      }

      if (isReady(candidate)) {
        pick = k;
        break;
      }

      if (k === 0 && stalled >= STALL_BEATS && queue.length > 1) {
        queue.push(queue.shift() as number);
        stalled = 0;
        k -= 1;
      }
    }

    if (pick === -1) {
      // Every photograph has been shown, or every one that remains has failed.
      if (queue.length === 0) {
        finish();
        return;
      }

      // Nothing has arrived yet: hold what is on screen and try again. The
      // montage waits for its photographs rather than going without them.
      stalled += 1;
      scheduleNext(beatAt(position).hold);
      return;
    }

    const [index] = queue.splice(pick, 1);

    stalled = 0;
    position += 1;

    const beat = beatAt(position);

    onShow({ index, position, total, hold: beat.hold, fade: beat.fade });

    if (queue.length === 0) {
      finish();
      return;
    }

    scheduleNext(beat.hold);
  }

  return {
    start() {
      if (stopped) return;

      /*
       * No photographs at all. Trivially complete rather than silently inert:
       * the caller gates the splash's departure on `onComplete`, so a montage
       * that never reports finishing would hold the screen up until the
       * ceiling fired - a blank white wait, caused by an empty folder.
       */
      if (total === 0) {
        finish();
        return;
      }

      const beat = beatAt(0);

      // The opener is already on screen - it is the one frame the server
      // rendered with a `src` - so it is reported rather than shown.
      onShow({
        index: order[0],
        position: 0,
        total,
        hold: beat.hold,
        fade: beat.fade,
      });

      if (total === 1) {
        finish();
        return;
      }

      scheduleNext(beat.hold);
    },

    stop() {
      stopped = true;
      if (timer) options.cancel(timer);
    },
  };
}
