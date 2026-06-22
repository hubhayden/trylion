import type { AppData, ScoreRule, User } from "./types";

const now = () => new Date().toISOString();

export const defaultUsers = (): User[] => [
  { id: "user-me", name: "나", createdAt: now() },
  { id: "user-friend", name: "친구", createdAt: now() },
];

export const defaultScoreRules = (): ScoreRule[] => [
  {
    id: "story",
    name: "스토리",
    points: 0.1,
    description: "인스타 스토리 등 가벼운 공개 기록",
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "post",
    name: "게시물",
    points: 1,
    description: "인스타 피드, 블로그 짧은 글 등",
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "short-video",
    name: "숏폼 영상",
    points: 3,
    description: "릴스, 쇼츠, 틱톡 등 짧은 영상",
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "long-video",
    name: "긴 영상",
    points: 3,
    description: "유튜브 일반 영상 등",
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "shop",
    name: "쇼핑채널",
    points: 3,
    description: "스마트스토어, 아이디어스, Etsy 등",
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: "portfolio",
    name: "홈페이지/포트폴리오",
    points: 5,
    description: "개인 홈페이지, 포트폴리오 페이지, 작업 소개 페이지 등",
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

export const defaultData = (): AppData => ({
  users: defaultUsers(),
  scoreRules: defaultScoreRules(),
  uploadRecords: [],
  rewardUsages: [],
});
