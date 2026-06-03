import { resourceApi } from "./resource";

export const recommendationsApi = {
  recommendResources: resourceApi.recommendResources,
  getUserRecommendations: resourceApi.listUserRecommendations,
  markViewed: resourceApi.markRecommendationViewed,
  getPushRecords: resourceApi.listPushRecords
};

