import type { ClassificationResult, ScoreRule } from "./types";

const ruleNameToId = (rules: ScoreRule[], name: string) =>
  rules.find((rule) => rule.name === name && rule.isActive)?.id;

export function classifyUrl(urlInput: string, rules: ScoreRule[]): ClassificationResult {
  const url = urlInput.trim().toLowerCase();
  if (!url) {
    return {
      platform: "URL 없음",
      contentTypeName: "",
      needsManualType: true,
    };
  }

  const result = (platform: string, contentTypeName: string): ClassificationResult => ({
    platform,
    contentTypeName,
    contentTypeId: ruleNameToId(rules, contentTypeName),
    needsManualType: !ruleNameToId(rules, contentTypeName),
  });

  if (url.includes("instagram.com/stories")) return result("Instagram", "스토리");
  if (url.includes("instagram.com/p/")) return result("Instagram", "게시물");
  if (url.includes("instagram.com/reel") || url.includes("instagram.com/reels")) {
    return result("Instagram", "숏폼 영상");
  }
  if (url.includes("youtube.com/shorts")) return result("YouTube", "숏폼 영상");
  if (url.includes("tiktok.com")) return result("TikTok", "숏폼 영상");
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) {
    return result("YouTube", "긴 영상");
  }
  if (url.includes("smartstore") || url.includes("idus") || url.includes("etsy")) {
    return result("쇼핑채널", "쇼핑채널");
  }

  return {
    platform: "기타",
    contentTypeName: "",
    needsManualType: true,
  };
}
