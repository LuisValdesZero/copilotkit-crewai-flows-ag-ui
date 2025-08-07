import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import { HttpAgent } from "@ag-ui/client";

 
// 1. You can use any service adapter here for multi-agent support. We use
//    the empty adapter since we're only using one agent.
const serviceAdapter = new OpenAIAdapter();
 
// 2. Create the CopilotRuntime instance and utilize the HttpAgent AG-UI
//    integration to setup the connection.
const runtime = new CopilotRuntime({
  agents: {
    starterAgent: new HttpAgent({ url: "http://localhost:8000/" })
  }
});
 
// 3. Build a Next.js API route that handles the CopilotKit runtime requests.
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime, 
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
 
  return handleRequest(req);
};