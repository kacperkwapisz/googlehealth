// Tiny entry: only the spinner module is loaded eagerly so the first frame
// renders immediately after Node startup (~80ms) instead of waiting for the
// SDK + citty + every command module to parse (~230ms). Everything else
// behind a dynamic import runs after the spinner is on screen.
import { startSpinner } from "./output/spinner.ts";

const argv = process.argv.slice(2);
const skipSpinner =
  !process.stderr.isTTY ||
  argv.length === 0 ||
  argv.some(
    (a) =>
      a === "-h" ||
      a === "--help" ||
      a === "-v" ||
      a === "--version" ||
      a === "--json" ||
      a === "--quiet",
  );
const boot = skipSpinner ? undefined : startSpinner();

(async () => {
  try {
    const { runCli } = await import("./bootstrap.ts");
    await runCli();
  } catch (err) {
    boot?.stop();
    if (err instanceof Error) {
      process.stderr.write(`${err.message}\n`);
    } else {
      process.stderr.write(`${String(err)}\n`);
    }
    process.exit(1);
  }
})();
