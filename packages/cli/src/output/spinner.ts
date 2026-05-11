/**
 * Minimal label-less spinner. Renders to stderr so stdout (JSON/CSV/etc.)
 * stays clean for pipes. On a non-TTY stderr (CI, pipes, redirects, NO_COLOR)
 * the spinner is a no-op.
 *
 * - First frame writes synchronously so feedback is immediate.
 * - Module-scoped singleton: only one spinner is ever active. Multiple
 *   `startSpinner()` calls return the same handle.
 * - `stop()` is idempotent; cursor is restored on SIGINT and process exit.
 */
export interface SpinnerHandle {
  stop(): void;
}

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_MS = 80;

let active: SpinnerHandle | undefined;

export function startSpinner(): SpinnerHandle {
  if (active) return active;
  if (!process.stderr.isTTY || process.env.NO_COLOR || process.env.CI) {
    const noop: SpinnerHandle = { stop() {} };
    return noop;
  }

  let phase = 0;
  let stopped = false;

  const render = () => {
    if (stopped) return;
    process.stderr.write(`\r\x1B[K${FRAMES[phase++ % FRAMES.length]}`);
  };

  const restoreCursor = () => process.stderr.write("\r\x1B[K\x1B[?25h");
  process.stderr.write("\x1B[?25l");
  render();
  const tick = setInterval(render, FRAME_MS);

  process.once("SIGINT", () => {
    restoreCursor();
    process.exit(130);
  });
  process.once("exit", () => {
    if (!stopped) restoreCursor();
  });

  const handle: SpinnerHandle = {
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(tick);
      restoreCursor();
      active = undefined;
    },
  };
  active = handle;
  return handle;
}

/** Returns the currently-running spinner handle, if any. */
export function activeSpinner(): SpinnerHandle | undefined {
  return active;
}
