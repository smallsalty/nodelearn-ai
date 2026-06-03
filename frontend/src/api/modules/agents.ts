import { agentApi } from "./agent";

export const agentsApi = {
  runAgent: agentApi.runAgent,
  runWorkflow: agentApi.runWorkflow,
  getTask: agentApi.getAgentTask,
  getTaskEvents: agentApi.listAgentTaskEvents
};

export { agentApi };

