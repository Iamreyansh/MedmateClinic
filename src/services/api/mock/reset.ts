/**
 * Putting the mock's state back.
 *
 * The mock is a module-level fixture: the handlers write into the very
 * collections the fixture declared. That is what makes it quick, and it is
 * what makes it a problem in a test suite — a visit booked by one test is
 * still there for the next one, so a test that reads "the clinic" reads
 * whatever the test before it left behind.
 *
 * Every collection a handler writes into is registered here, and
 * `resetMockState()` puts them all back the way the fixture declared them.
 * A test then starts from the clinic the fixture describes, whatever the
 * test before it did — so a test can say what it means rather than being
 * arranged around the order the tests happen to run in.
 *
 * The registry is a module of its own with no imports, so the fixture
 * modules can register with it without importing one another.
 */

/** A way to put one piece of the mock's state back. */
type Resetter = () => void;

/** The registered ways to put the mock's state back. */
const resetters: Resetter[] = [];

/** Register a way to put a piece of the mock's state back. */
export function registerMockReset(reset: Resetter): void {
  resetters.push(reset);
}

/**
 * A collection the handlers write into.
 *
 * The copy is taken when the fixture is declared, so the state a test finds
 * is the state the fixture described and not the state the last test left.
 * The collection itself is kept — the modules that hold it keep their own
 * reference to it, and see the fixture again.
 */
export function restorableArray<T>(collection: T[]): T[] {
  const pristine = collection.map((item) => structuredClone(item));
  registerMockReset(() => {
    collection.splice(
      0,
      collection.length,
      ...pristine.map((item) => structuredClone(item)),
    );
  });
  return collection;
}

/**
 * An object the handlers write into.
 *
 * The copy is taken when the fixture is declared, and the object itself is
 * kept, so the modules that hold it see the fixture again.
 */
export function restorableObject<T extends object>(value: T): T {
  const pristine = structuredClone(value);
  registerMockReset(() => {
    const fields = value as Record<string, unknown>;
    for (const key of Object.keys(fields)) delete fields[key];
    Object.assign(value, structuredClone(pristine));
  });
  return value;
}

/** Put the mock's state back the way the fixtures declared it. */
export function resetMockState(): void {
  for (const reset of resetters) reset();
}
