/**
 * Minimaler Zustandsspeicher mit unveränderlichen Updates.
 * Listener erhalten (nextState, previousState).
 */
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState: () => state,
    setState(updater) {
      const previous = state;
      const next = typeof updater === 'function' ? updater(previous) : { ...previous, ...updater };
      if (!next || next === previous) return;
      state = next;
      listeners.forEach((listener) => listener(state, previous));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
