import type { RouteLocationRaw } from "vue-router";
import type { ResourceRecommendation } from "@/types/resource";

export function resourceRecommendationRoute(recommendation: ResourceRecommendation): RouteLocationRaw {
  const query: Record<string, string> = { resourceId: recommendation.resourceId };
  if (recommendation.nodeId) query.nodeId = recommendation.nodeId;

  if (recommendation.resourceType === "knowledge_video") {
    query.action = "knowledge_video";
  } else if (recommendation.resourceType === "mind_map") {
    query.action = "mind_map";
  } else if (recommendation.resourceType === "digital_human_video") {
    query.action = "digital_human_video";
  }

  return { path: "/resources", query };
}
