import { onBeforeUnmount } from 'vue';

export function useAnimationLoop(callback: (deltaMs: number) => void) {
  let frameId = 0;
  let lastTime = 0;
  let active = false;

  const tick = (time: number) => {
    if (!active) return;
    const delta = lastTime ? time - lastTime : 16;
    lastTime = time;
    callback(delta);
    frameId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (active) return;
    active = true;
    lastTime = 0;
    frameId = requestAnimationFrame(tick);
  };

  const stop = () => {
    active = false;
    cancelAnimationFrame(frameId);
  };

  onBeforeUnmount(stop);

  return { start, stop, isRunning: () => active };
}
