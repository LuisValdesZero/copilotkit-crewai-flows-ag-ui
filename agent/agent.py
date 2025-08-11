"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""
import json
from enum import Enum
from litellm import completion
from crewai.flow.flow import Flow, start, router, listen
from ag_ui_crewai.sdk import copilotkit_stream, CopilotKitState, copilotkit_predict_state
from pydantic import BaseModel, Field
from typing import Literal, List, Optional


class TaskStep(BaseModel):
    description: str
    status: Literal["enabled", "disabled"]


class SkillLevel(str, Enum):
    """
    The level of skill required for the recipe.
    """
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"


class CookingTime(str, Enum):
    """
    The cooking time of the recipe.
    """
    FIVE_MIN = "5 min"
    FIFTEEN_MIN = "15 min"
    THIRTY_MIN = "30 min"
    FORTY_FIVE_MIN = "45 min"
    SIXTY_PLUS_MIN = "60+ min"


class Ingredient(BaseModel):
    """
    An ingredient with its details.
    """
    icon: str = Field(..., description="Emoji icon representing the ingredient.")
    name: str = Field(..., description="Name of the ingredient.")
    amount: str = Field(..., description="Amount or quantity of the ingredient.")


class Recipe(BaseModel):
    """
    A recipe.
    """
    title: str
    skill_level: SkillLevel
    dietary_preferences: List[str] = Field(default_factory=list)
    cooking_time: CookingTime
    ingredients: List[Ingredient] = Field(default_factory=list)
    instructions: List[str] = Field(default_factory=list)


class AgentState(CopilotKitState):
    """
    Here we define the state of the agent

    In this instance, we're inheriting from CopilotKitState, which will bring in
    the CopilotKitState fields. We're also adding a custom field, `language`,
    which will be used to set the language of the agent.
    """
    proverbs: list[str] = []
    steps: List[TaskStep] = []
    recipe: Optional[Recipe] = None


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

GENERATE_RECIPE_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_recipe",
        "description": " ".join("""Generate or modify an existing recipe. 
        When creating a new recipe, specify all fields. 
        When modifying, only fill optional fields if they need changes; 
        otherwise, leave them empty.""".split()),
        "parameters": {
            "type": "object",
            "properties": {
                "recipe": {
                    "description": "The recipe object containing all details.",
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "The title of the recipe."
                        },
                        "skill_level": {
                            "type": "string",
                            "enum": [level.value for level in SkillLevel],
                            "description": "The skill level required for the recipe."
                        },
                        "dietary_preferences": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            },
                            "description": "A list of dietary preferences (e.g., Vegetarian, Gluten-free)."
                        },
                        "cooking_time": {
                            "type": "string",
                            "enum": [time.value for time in CookingTime],
                            "description": "The estimated cooking time for the recipe."
                        },
                        "ingredients": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "icon": {"type": "string", "description": "Emoji icon for the ingredient."},
                                    "name": {"type": "string", "description": "Name of the ingredient."},
                                    "amount": {"type": "string", "description": "Amount/quantity of the ingredient."}
                                },
                                "required": ["icon", "name", "amount"]
                            },
                            "description": "A list of ingredients required for the recipe."
                        },
                        "instructions": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Step-by-step instructions for preparing the recipe."
                        }
                    },
                    "required": ["title", "skill_level", "cooking_time", "dietary_preferences", "ingredients", "instructions"]
                }
            },
            "required": ["recipe"]
        }
    }
}

tools = [
    GET_WEATHER_TOOL,
    DEFINE_TASK_TOOL,
    GENERATE_HAIKU_TOOL,
    GENERATE_RECIPE_TOOL
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

        You are a helpful assistant for creating recipes. 
        This is the current state of the recipe: {self.state.model_dump_json(indent=2)}
        You can modify the recipe by calling the 'generate_recipe' tool.
        If you have just created or modified the recipe, just answer in one sentence what you did.
        """

        # 1. Here we specify that we want to stream the tool call to generate_recipe
        #    to the frontend as state.
        await copilotkit_predict_state({
            "recipe": {
                "tool_name": "generate_recipe",
                "tool_argument": "recipe"
            }
        })

        # 2. Run the model and stream the response
        #    Note: In order to stream the response, wrap the completion call in
        #    copilotkit_stream and set stream=True.
        response = await copilotkit_stream(
            completion(

                # 2.1 Specify the model to use
                model="openai/gpt-4o",
                messages=[
                    {
                        "role": "system", 
                        "content": system_prompt
                    },
                    *self.state.messages
                ],

                # 2.2 Bind the tools to the model
                tools=[
                    *self.state.copilotkit.actions,
                    *tools
                ],

                # 2.3 Disable parallel tool calls to avoid race conditions,
                #     enable this for faster performance if you want to manage
                #     the complexity of running tool calls in parallel.
                parallel_tool_calls=False,
                stream=True
            )
        )

        message = response.choices[0].message

        # 3. Append the message to the messages in state
        self.state.messages.append(message)

        # 4. Handle tool calls
        if message.get("tool_calls"):
            tool_call = message["tool_calls"][0]
            tool_call_id = tool_call["id"]
            tool_call_name = tool_call["function"]["name"]
            tool_call_args = json.loads(tool_call["function"]["arguments"])

            if tool_call_name == "generate_recipe":
                # Attempt to update the recipe state using the data from the tool call
                try:

                    updated_recipe_data = tool_call_args["recipe"]

                    # Validate and update the state. Pydantic will raise an error if the structure is wrong.
                    self.state.recipe = Recipe(**updated_recipe_data)

                    print("Recipe updated", self.state.model_dump_json(indent=2))

                    # 4.1 Append the result to the messages in state
                    self.state.messages.append({
                        "role": "tool",
                        "content": "Recipe updated.", # More accurate message
                        "tool_call_id": tool_call_id
                    })
                    return "route_follow_up"
                except Exception as e:
                    # Handle validation or other errors during update
                    print(f"Error updating recipe state: {e}") # Log the error server-side
                    # Optionally inform the user via a tool message, though it might be noisy
                    # self.state.messages.append({"role": "tool", "content": f"Error processing recipe update: {e}", "tool_call_id": tool_call_id})
                    return "route_end" # End the flow on error for now

            # 5. Check for tool calls in the response and handle them. If the tool call
            #    is a CopilotKit action, we return the response to CopilotKit to handle
            if (tool_call_name in
                [action["function"]["name"] for action in self.state.copilotkit.actions]):
                return "route_end"

            # 6. Otherwise, we handle the tool call on the backend
            handler = tool_handlers[tool_call_name]
            result = handler(tool_call_args)

            # 7. Append the result to the messages in state
            self.state.messages.append({
                "role": "tool",
                "content": result,
                "tool_call_id": tool_call_id
            })

            # 8. Return to the follow up route to continue the conversation
            return "route_follow_up"

        # 9. If there are no tool calls, return to the end route
        return "route_end"

    @listen("route_end")
    async def end(self):
        """
        End the flow.
        """