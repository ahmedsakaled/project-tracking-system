import { useState, useRef, useCallback } from "react";

/**
 * Wraps an async function or event handler to guarantee single-execution lock.
 * If called multiple times before the promise resolves, subsequent calls are dropped immediately.
 */
export function guardAsyncAction<Args extends any[], ReturnVal>(
  actionFn: (...args: Args) => Promise<ReturnVal> | any
): (...args: Args) => Promise<ReturnVal | undefined> {
  let isExecuting = false;

  return async (...args: Args): Promise<ReturnVal | undefined> => {
    if (isExecuting) {
      return undefined;
    }
    isExecuting = true;
    try {
      const result = await actionFn(...args);
      return result;
    } finally {
      isExecuting = false;
    }
  };
}

/**
 * React hook to wrap any async operation or event handler with single-execution lock and pending state.
 */
export function useAsyncAction<Args extends any[], ReturnVal>(
  actionFn: (...args: Args) => Promise<ReturnVal> | any
) {
  const [isPending, setIsPending] = useState(false);
  const isExecutingRef = useRef(false);

  const execute = useCallback(
    async (...args: Args): Promise<ReturnVal | undefined> => {
      if (isExecutingRef.current) {
        return undefined;
      }
      isExecutingRef.current = true;
      setIsPending(true);

      try {
        const result = await actionFn(...args);
        return result;
      } finally {
        isExecutingRef.current = false;
        setIsPending(false);
      }
    },
    [actionFn]
  );

  return { execute, isPending };
}
