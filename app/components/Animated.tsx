import type { ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";

export function AnimatedView({
  children,
  motionKey,
}: {
  children: ReactNode;
  motionKey: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      key={motionKey}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
      transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

export function AnimatedItem({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.22,
        delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.28),
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ height: "100%" }}
    >
      {children}
    </m.div>
  );
}
