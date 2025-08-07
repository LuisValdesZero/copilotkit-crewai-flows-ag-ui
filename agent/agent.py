"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""
import json
from litellm import completion
from crewai.flow.flow import Flow, start, router, listen
from ag_ui_crewai.sdk import copilotkit_stream, CopilotKitState
from pydantic import BaseModel
from typing import Literal, List


class TaskStep(BaseModel):
    description: str
    status: Literal["enabled", "disabled"]


class AgentState(CopilotKitState):
    """
    Here we define the state of the agent

    In this instance, we're inheriting from CopilotKitState, which will bring in
    the CopilotKitState fields. We're also adding a custom field, `language`,
    which will be used to set the language of the agent.
    """
    proverbs: list[str] = []
    steps: List[TaskStep] = []


GET_WEATHER_TOOL = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string", 
                    "description": "The city and state, e.g. San Francisco, CA"
                    }
                    },
            "required": ["location"]
        }
    }
}

# This tool simulates performing a task on the server.
# The tool call will be streamed to the frontend as it is being generated.
DEFINE_TASK_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_task_steps",
        "description": "Make up 10 steps (only a couple of words per step) that are required for a task. The step should be in imperative form (i.e. Dig hole, Open door, ...)",
        "parameters": {
            "type": "object",
            "properties": {
                "steps": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {
                                "type": "string",
                                "description": "The text of the step in imperative form"
                            },
                            "status": {
                                "type": "string",
                                "enum": ["enabled"],
                                "description": "The status of the step, always 'enabled'"
                            }
                        },
                        "required": ["description", "status"]
                    },
                    "description": "An array of 10 step objects, each containing text and status"
                }
            },
            "required": ["steps"]
        }
    }
}

GENERATE_HAIKU_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_haiku",
        "description": "Generate a haiku in Japanese and its English translation",
        "parameters": {
            "type": "object",
            "properties": {
                "japanese": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "An array of three lines of the haiku in Japanese"
                },
                "english": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "An array of three lines of the haiku in English"
                },
                "image_names": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "description": "Names of 3 relevant images from the provided list"
                }
            },
            "required": ["japanese", "english", "image_names"]
        }
    }
}

tools = [
    GET_WEATHER_TOOL,
    DEFINE_TASK_TOOL,
    GENERATE_HAIKU_TOOL
]

def get_weather(args):
    """
    Get the weather for a given location.
    """
    return f"The weather for {args['location']} is 70 degrees, clear skies, 45% humidity, 5 mph wind, and feels like 72 degrees."

tool_handlers = {
    "get_weather": get_weather
}

class SampleAgentFlow(Flow[AgentState]):
    """
    This is a sample flow that uses the CopilotKit framework to create a chat agent.
    """

    @start()
    @listen("route_follow_up")
    async def start_flow(self):
        """
        This is the entry point for the flow.
        """

    @router(start_flow)
    async def chat(self):
        """
        Standard chat node based on the ReAct design pattern. It handles:
        - The model to use (and binds in CopilotKit actions and the tools defined above)
        - The system prompt
        - Getting a response from the model
        - Handling tool calls

        For more about the ReAct design pattern, see: 
        https://www.perplexity.ai/search/react-agents-NcXLQhreS0WDzpVaS4m9Cg
        """
        system_prompt = f"""
        You are a helpful assistant. The current proverbs are {self.state.proverbs}.        

        You MUST call the `generate_task_steps` function when the user asks you to perform a task.
        When the function `generate_task_steps` is called, the user will decide to enable or disable a step.
        After the user has decided which steps to perform, provide a textual description of how you are performing the task.
        If the user has disabled a step, you are not allowed to perform that step.
        However, you should find a creative workaround to perform the task, and if an essential step is disabled, you can even use
        some humor in the description of how you are performing the task.
        Don't just repeat a list of steps, come up with a creative but short description (3 sentences max) of how you are performing the task.

        You assist the user in generating a haiku. When generating a haiku using the 'generate_haiku' tool, you MUST also select exactly 3 image filenames from the following list that are most relevant to the haiku's content or theme. Return the filenames in the 'image_names' parameter. Dont provide the relavent image names in your final response to the user. 
        """

        # 1. Run the model and stream the response
        #    Note: In order to stream the response, wrap the completion call in
        #    copilotkit_stream and set stream=True.
        response = await copilotkit_stream(
            completion(

                # 1.1 Specify the model to use
                model="openai/gpt-4o",
                messages=[
                    {
                        "role": "system", 
                        "content": system_prompt
                    },
                    *self.state.messages
                ],

                # 1.2 Bind the tools to the model
                tools=[
                    *self.state.copilotkit.actions,
                    *tools
                ],

                # 1.3 Disable parallel tool calls to avoid race conditions,
                #     enable this for faster performance if you want to manage
                #     the complexity of running tool calls in parallel.
                parallel_tool_calls=False,
                stream=True
            )
        )

        message = response.choices[0].message

        # 2. Append the message to the messages in state
        self.state.messages.append(message)

        # 3. Handle tool calls
        if message.get("tool_calls"):
            tool_call = message["tool_calls"][0]
            tool_call_id = tool_call["id"]
            tool_call_name = tool_call["function"]["name"]
            tool_call_args = json.loads(tool_call["function"]["arguments"])

            # 4. Check for tool calls in the response and handle them. If the tool call
            #    is a CopilotKit action, we return the response to CopilotKit to handle
            if (tool_call_name in
                [action["function"]["name"] for action in self.state.copilotkit.actions]):
                return "route_end"

            # 5. Otherwise, we handle the tool call on the backend
            handler = tool_handlers[tool_call_name]
            result = handler(tool_call_args)

            # 6. Append the result to the messages in state
            self.state.messages.append({
                "role": "tool",
                "content": result,
                "tool_call_id": tool_call_id
            })

            # 7. Return to the follow up route to continue the conversation
            return "route_follow_up"

        # 8. If there are no tool calls, return to the end route
        return "route_end"

    @listen("route_end")
    async def end(self):
        """
        End the flow.
        """