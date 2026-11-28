export const maximumAttempts = 3;

export function mayRetry(completedAttempts) {
  return Number.isInteger(completedAttempts) && completedAttempts >= 0 && completedAttempts < maximumAttempts;
}
