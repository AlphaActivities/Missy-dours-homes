export function calculateDaysOnline(createdDate: string | undefined): number {
  if (!createdDate) return 0;

  const created = new Date(createdDate);
  const today = new Date();

  created.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(today.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
