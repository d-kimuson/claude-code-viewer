type PushErrorDetails = {
  statusCode: number | undefined;
  body: string | undefined;
  message: string | undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  return undefined;
};

const getNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return value;
  return undefined;
};

const extractPushErrorDetails = (error: unknown): PushErrorDetails => {
  if (!isRecord(error)) {
    return {
      statusCode: undefined,
      body: undefined,
      message: getString(error),
    };
  }

  return {
    statusCode: getNumber(error.statusCode),
    body: getString(error.body),
    message: getString(error.message),
  };
};

export const shouldDropSubscriptionForPushError = (error: unknown): boolean => {
  const { statusCode } = extractPushErrorDetails(error);
  return statusCode === 404 || statusCode === 410;
};

export const formatPushError = (error: unknown): string => {
  const details = extractPushErrorDetails(error);

  if (details.statusCode !== undefined || details.body !== undefined) {
    const status = details.statusCode ?? "unknown";
    const body = details.body ?? "empty";
    return `status=${status}, body=${body}`;
  }

  return `message=${details.message ?? "unknown"}`;
};
