export type ControllablePromise<T> = {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
};

export const controllablePromise = <T>(): ControllablePromise<T> => {
  let promiseResolve: ((value: T) => void) | undefined;
  let promiseReject: ((reason?: unknown) => void) | undefined;

  const promise = new Promise<T>((resolve, reject) => {
    promiseResolve = resolve;
    promiseReject = reject;
  });

  if (!promiseResolve || !promiseReject) {
    throw new Error("Illegal state: Promise not created");
  }

  return {
    promise,
    resolve: promiseResolve,
    reject: promiseReject,
  } as const;
};
