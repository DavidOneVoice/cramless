import { useEffect, useState } from "react";

export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    if (secondsLeft <= 0) {
      setIsRunning(false);
      return;
    }

    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isRunning, secondsLeft]);

  function start(seconds) {
    setSecondsLeft(Math.max(0, Number(seconds || 0)));
    setIsRunning(true);
  }

  function stop() {
    setIsRunning(false);
  }

  function reset() {
    setSecondsLeft(0);
    setIsRunning(false);
  }

  return { secondsLeft, isRunning, start, stop, reset, setSecondsLeft };
}
