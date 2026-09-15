export class MarketplaceTimeoutError extends Error {
  constructor(
    marketplaceName: string,
    timeoutMs: number
  ) {
    super(
      `${marketplaceName} excedeu o tempo limite de ${timeoutMs}ms.`
    );

    this.name =
      "MarketplaceTimeoutError";
  }
}

export async function withMarketplaceTimeout<T>(
  promise: Promise<T>,
  marketplaceName: string,
  timeoutMs = 8000
): Promise<T> {
  let timeoutId:
    | ReturnType<typeof setTimeout>
    | undefined;

  const timeoutPromise =
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new MarketplaceTimeoutError(
            marketplaceName,
            timeoutMs
          )
        );
      }, timeoutMs);
    });

  try {
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}