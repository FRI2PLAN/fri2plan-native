export type PointsFeedbackEvent = {
  delta: number;
  occurredAt: number;
};

type Listener = (event: PointsFeedbackEvent) => void;

const listeners = new Set<Listener>();

export function emitPointsFeedback(delta: number) {
  if (!delta) return;
  const event = { delta, occurredAt: Date.now() };
  listeners.forEach((listener) => listener(event));
}

export function subscribeToPointsFeedback(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
