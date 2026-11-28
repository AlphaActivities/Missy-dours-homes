export const maximumAttempts = 2;

export function mayRetry(completedAttempts) {
  return Number.isInteger(completedAttempts) && completedAttempts >= 0 && completedAttempts < maximumAttempts;
}
