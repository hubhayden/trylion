export type User = {
  id: string;
  name: string;
  createdAt: string;
};

export type ScoreRule = {
  id: string;
  name: string;
  points: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UploadRecord = {
  id: string;
  userId: string;
  url: string;
  platform: string;
  contentTypeId: string;
  contentTypeName: string;
  customTypeName?: string;
  isCustomType?: boolean;
  pointsEarned: number;
  memo: string;
  recordedAt: string;
  createdAt: string;
};

export type RewardUsage = {
  id: string;
  userId: string;
  title: string;
  amount: number;
  pointsUsed: number;
  memo: string;
  usedAt: string;
  createdAt: string;
};

export type StorageSettings = {
  mode: "local" | "sheets";
  sheetsApiUrl: string;
};

export type AppData = {
  users: User[];
  scoreRules: ScoreRule[];
  uploadRecords: UploadRecord[];
  rewardUsages: RewardUsage[];
};

export type ClassificationResult = {
  platform: string;
  contentTypeName: string;
  contentTypeId?: string;
  needsManualType: boolean;
};
