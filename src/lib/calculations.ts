import type { RewardUsage, UploadRecord, User } from "./types";

export const REWARD_POINT_VALUE = 10000;
export const MIN_REDEEMABLE_POINTS = 10;

export function getWeekRange(date = new Date(), weekStartsOn = 1) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function isInRange(value: string, start: Date, end: Date) {
  const date = new Date(value);
  return date >= start && date <= end;
}

export function userStats(
  user: User,
  uploadRecords: UploadRecord[],
  rewardUsages: RewardUsage[],
) {
  const earned = uploadRecords
    .filter((record) => record.userId === user.id)
    .reduce((sum, record) => sum + record.pointsEarned, 0);
  const used = rewardUsages
    .filter((usage) => usage.userId === user.id)
    .reduce((sum, usage) => sum + usage.pointsUsed, 0);
  const remaining = earned - used;

  return {
    earned,
    used,
    remaining,
    redeemableAmount: remaining >= MIN_REDEEMABLE_POINTS ? remaining * REWARD_POINT_VALUE : 0,
  };
}

export function hasWeeklyUpload(userId: string, records: UploadRecord[], date = new Date()) {
  const { start, end } = getWeekRange(date);
  return records.some((record) => record.userId === userId && isInRange(record.recordedAt, start, end));
}

export function formatPoints(value: number) {
  return Number.isInteger(value) ? `${value}점` : `${Number(value.toFixed(2))}점`;
}

export function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
