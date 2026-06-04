import { resourceApi } from "./resource";

export const filesApi = {
  uploadFile: resourceApi.uploadFile,
  getFile: resourceApi.getFile,
  deleteFile: resourceApi.deleteFile,
  buildKnowledgeBase: resourceApi.buildKnowledgeBase,
  getBuildTask: resourceApi.getKnowledgeBuildTask,
  searchKnowledgeBase: resourceApi.searchKnowledgeBase,
  embedText: resourceApi.embedText
};

