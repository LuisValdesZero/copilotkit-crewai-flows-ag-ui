"use client";

import { useCoAgent, useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar, useCopilotChatSuggestions } from "@copilotkit/react-ui";
import { useEffect, useRef, useState } from "react";

import { Role, TextMessage } from "@copilotkit/runtime-client-gql";

import { chatSuggestions, initialPrompt } from "@/lib/prompts";
import HaikuCard from "./HaikuCard";

const VALID_IMAGE_NAMES = [
  "Osaka_Castle_Turret_Stone_Wall_Pine_Trees_Daytime.jpg",
  "Tokyo_Skyline_Night_Tokyo_Tower_Mount_Fuji_View.jpg",
  "Itsukushima_Shrine_Miyajima_Floating_Torii_Gate_Sunset_Long_Exposure.jpg",
  "Takachiho_Gorge_Waterfall_River_Lush_Greenery_Japan.jpg",
  "Bonsai_Tree_Potted_Japanese_Art_Green_Foliage.jpeg",
  "Shirakawa-go_Gassho-zukuri_Thatched_Roof_Village_Aerial_View.jpg",
  "Ginkaku-ji_Silver_Pavilion_Kyoto_Japanese_Garden_Pond_Reflection.jpg",
  "Senso-ji_Temple_Asakusa_Cherry_Blossoms_Kimono_Umbrella.jpg",
  "Cherry_Blossoms_Sakura_Night_View_City_Lights_Japan.jpg",
  "Mount_Fuji_Lake_Reflection_Cherry_Blossoms_Sakura_Spring.jpg"
];

export default function CopilotKitPage() {
  const [background, setBackground] = useState<string>("#6366f1");

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/guides/frontend-actions
  useCopilotAction({
    name: "change_background",
    description:
      "Change the background color of the chat. Can be anything that the CSS background attribute accepts. Regular colors, linear of radial gradients etc.",
    parameters: [
      {
        name: "background",
        type: "string",
        description: "The background. Prefer gradients.",
      },
    ],
    handler: ({ background }) => {
      setBackground(background);
    },
  });

  useCopilotChatSuggestions({
    instructions: `
    ${chatSuggestions.agenticChat}
    ${chatSuggestions.writeAProverb}
    ${chatSuggestions.humanInTheLoop}
    ${chatSuggestions.agenticGenerativeUI}
    ${chatSuggestions.toolCallingGenerativeUI}
    ${chatSuggestions.sharedState}
    `,
  });

  return (
    <main style={{ "--copilot-kit-primary-color": background } as CopilotKitCSSProperties}>
      <Proverbs background={background} />
      <Haiku />
      <div
          id="recipe-container"
          className="app-container"
          style={{
            backgroundImage: "url('./shared_state_background.png')",
            backgroundAttachment: "fixed",
            backgroundSize: "cover",
            position: "relative",
          }}
        >
          <div 
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(5px)",
              zIndex: 0,
            }}
          />
          <Recipe />
        </div>
      <CopilotSidebar
        clickOutsideToClose={false}
        defaultOpen={true}
        labels={{
          title: "Popup Assistant",
          initial: "👋 Hi, there! You're chatting with an agent. This agent comes with a few tools to get you started.\n\nFor example you can try:\n- **Frontend Tools**: \"Set the theme to orange\"\n- **Shared State**: \"Write a proverb about AI\"\n- **Generative UI**: \"Get the weather in SF\"\n\nAs you interact with the agent, you'll see the UI update in real-time to reflect the agent's **state**, **tool calls**, and **progress**.\n\n" + initialPrompt.toolCallingGenerativeUI
        }}
      />
    </main>
  );
}

// State of the agent, make sure this aligns with your agent's state.
type AgentState = {
  proverbs: string[];
}

function Proverbs({ background }: { background: string }) {
  // 🪁 Shared State: https://docs.copilotkit.ai/coagents/shared-state
  const {state, setState} = useCoAgent<AgentState>({
    name: "starterAgent",
    initialState: {
      proverbs: [
        "CopilotKit may be new, but its the best thing since sliced bread.",
      ],
    },
  })

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/coagents/frontend-actions
  useCopilotAction({
    name: "addProverb",
    parameters: [{
      name: "proverb",
      description: "The proverb to add. Make it witty, short and concise.",
      required: true,
    }],
    handler: ({ proverb }) => {
      setState({
        ...state,
        proverbs: [...state.proverbs, proverb],
      });
      document.getElementById("proverbs-container")?.scrollIntoView({ behavior: "smooth" });
    },
  });

  //🪁 Generative UI: https://docs.copilotkit.ai/coagents/generative-ui
  useCopilotAction({
    name: "get_weather",
    description: "Get the weather for a given location.",
    available: "disabled",
    parameters: [
      { name: "location", type: "string", required: true },
    ],
    render: ({ args }) => {
      return <WeatherCard location={args.location} background={background} />
    },
  });

  useCopilotAction({
    name: "generate_task_steps",
    parameters: [
      {
        name: "steps",
        type: "object[]",
        attributes: [
          {
            name: "description",
            type: "string",
          },
          {
            name: "status",
            type: "string",
            enum: ["enabled", "disabled", "executing"],
          },
        ],
      },
    ],
    renderAndWaitForResponse: ({ args, respond, status }) => {
      return <StepsFeedback args={args} respond={respond} status={status} />;
    },
  });

  return (
    <div
      id="proverbs-container"
      style={{ background }}
      className="h-screen w-screen flex justify-center items-center flex-col transition-colors duration-300"
    >
      <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">Proverbs</h1>
        <p className="text-gray-200 text-center italic mb-6">This is a demonstrative page, but it could be anything you want! 🪁</p>
        <hr className="border-white/20 my-6" />
        <div className="flex flex-col gap-3">
          {state.proverbs?.map((proverb, index) => (
            <div 
              key={index} 
              className="bg-white/15 p-4 rounded-xl text-white relative group hover:bg-white/20 transition-all"
            >
              <p className="pr-8">{proverb}</p>
              <button 
                onClick={() => setState({
                  ...state,
                  proverbs: state.proverbs?.filter((_, i) => i !== index),
                })}
                className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity 
                  bg-red-500 hover:bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {state.proverbs?.length === 0 && <p className="text-center text-white/80 italic my-8">
          No proverbs yet. Ask the assistant to add some!
        </p>}
      </div>
    </div>
  );
}

// Simple sun icon for the weather card
function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-yellow-200">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2" stroke="currentColor" />
    </svg>
  );
}

// Weather card component where the location and themeColor are based on what the agent
// sets via tool calls.
function WeatherCard({ location, background }: { location?: string, background: string }) {
  return (
    <div
    style={{ background }}
    className="rounded-xl shadow-xl mt-6 mb-4 max-w-md w-full"
  >
    <div className="bg-white/90 p-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-800 capitalize">{location}</h3>
          <p className="text-gray-600">Current Weather</p>
        </div>
        <SunIcon />
      </div>
      
      <div className="mt-4 flex items-end justify-between">
        <div className="text-3xl font-bold text-gray-800">70°</div>
        <div className="text-sm text-gray-600">Clear skies</div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-300">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-gray-600 text-xs">Humidity</p>
            <p className="text-gray-800 font-medium">45%</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs">Wind</p>
            <p className="text-gray-800 font-medium">5 mph</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs">Feels Like</p>
            <p className="text-gray-800 font-medium">72°</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}


function Haiku() {
  const [haikus, setHaikus] = useState<Haiku[]>([{
    japanese: ["仮の句よ", "まっさらながら", "花を呼ぶ"],
    english: [
      "A placeholder verse—",
      "even in a blank canvas,",
      "it beckons flowers.",
    ],
    image_names: [],
    selectedImage: null,
  }])
  const [activeIndex, setActiveIndex] = useState(0);
  const [isJustApplied, setIsJustApplied] = useState(false);

  const validateAndCorrectImageNames = (rawNames: string[] | undefined): string[] | null => {
    if (!rawNames || rawNames.length !== 3) {
      return null;
    }

    const correctedNames: string[] = [];
    const usedValidNames = new Set<string>();

    for (const name of rawNames) {
      if (VALID_IMAGE_NAMES.includes(name) && !usedValidNames.has(name)) {
        correctedNames.push(name);
        usedValidNames.add(name);
        if (correctedNames.length === 3) break;
      }
    }

    if (correctedNames.length < 3) {
      const availableFallbacks = VALID_IMAGE_NAMES.filter(name => !usedValidNames.has(name));
      for (let i = availableFallbacks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableFallbacks[i], availableFallbacks[j]] = [availableFallbacks[j], availableFallbacks[i]];
      }

      while (correctedNames.length < 3 && availableFallbacks.length > 0) {
        const fallbackName = availableFallbacks.pop();
        if (fallbackName) {
          correctedNames.push(fallbackName);
        }
      }
    }

    while (correctedNames.length < 3 && VALID_IMAGE_NAMES.length > 0) {
      const fallbackName = VALID_IMAGE_NAMES[Math.floor(Math.random() * VALID_IMAGE_NAMES.length)];
      correctedNames.push(fallbackName);
    }

    return correctedNames.slice(0, 3);
  };

  interface Haiku {
    japanese: string[];
    english: string[];
    image_names: string[];
    selectedImage: string | null;
  }

  useCopilotAction({
    name: "generate_haiku",
    parameters: [
      {
        name: "japanese",
        type: "string[]",
      },
      {
        name: "english",
        type: "string[]",
      },
      {
        name: "image_names",
        type: "string[]",
        description: "Names of 3 relevant images",
      },
    ],
    followUp: false,
    handler: async ({ japanese, english, image_names }) => {
      const finalCorrectedImages = validateAndCorrectImageNames(image_names);
      const newHaiku = {
        japanese: japanese || [],
        english: english || [],
        image_names: finalCorrectedImages || [],
        selectedImage: finalCorrectedImages?.[0] || null,
      };
      console.log(finalCorrectedImages, "finalCorrectedImages");
      setHaikus(prev => [...prev, newHaiku]);
      setActiveIndex(haikus.length - 1);
      setIsJustApplied(true);
      setTimeout(() => setIsJustApplied(false), 600);
      document.getElementById("haiku-container")?.scrollIntoView({ behavior: "smooth" });

      return "Haiku generated.";
    },
    render: ({ args: generatedHaiku }) => {
      return (
        <HaikuCard generatedHaiku={generatedHaiku} setHaikus={setHaikus} haikus={haikus} />
      );
    },
  }, [haikus]);

  return (
    <div id="haiku-container" className="flex h-screen w-full">

      {/* Thumbnail List */}
      <div className="w-40 p-4 border-r border-gray-200 overflow-y-auto overflow-x-hidden">
        {haikus.filter((haiku) => haiku.english[0] !== "A placeholder verse—").map((haiku, index) => (
          <div
            key={index}
            className={`haiku-card animated-fade-in mb-4 cursor-pointer ${index === activeIndex ? 'active' : ''}`}
            style={{
              width: '80px',
              transform: 'scale(0.2)',
              transformOrigin: 'top left',
              marginBottom: '-340px',
              opacity: index === activeIndex ? 1 : 0.5,
              transition: 'opacity 0.2s',
            }}
            onClick={() => setActiveIndex(index)}
          >
            {haiku.japanese.map((line, lineIndex) => (
              <div
                className="flex items-start gap-2 mb-2 haiku-line"
                key={lineIndex}
              >
                <p className="text-2xl font-bold text-gray-600 w-auto">{line}</p>
                <p className="text-xs font-light text-gray-500 w-auto">{haiku.english?.[lineIndex]}</p>
              </div>
            ))}
            {haiku.image_names && haiku.image_names.length === 3 && (
              <div className="mt-2 flex gap-2 justify-center">
                {haiku.image_names.map((imageName, imgIndex) => (
                  <img
                    style={{
                      width: '110px',
                      height: '110px',
                      objectFit: 'cover',
                    }}
                    key={imageName}
                    src={`/images/${imageName}`}
                    alt={imageName || ""}
                    className="haiku-card-image w-12 h-12 object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Display */}
      {/* Add a margin to the left of margin-left: -48px; */}
      <div className="flex-1 p-8 flex items-center justify-center " style={{ marginLeft: '-48px' }}>
        <div className="haiku-stack">
          {haikus.filter((_haiku: Haiku, index: number) => {
            if (haikus.length == 1) return true;
            else return index == activeIndex + 1;
          }).map((haiku, index) => (
            <div
              key={index}
              className={`haiku-card animated-fade-in ${isJustApplied && index === activeIndex ? 'applied-flash' : ''} ${index === activeIndex ? 'active' : ''}`}
              style={{
                zIndex: index === activeIndex ? haikus.length : index,
                transform: `translateY(${index === activeIndex ? '0' : `${(index - activeIndex) * 20}px`}) scale(${index === activeIndex ? '1' : '0.95'})`,
              }}
            // onClick={() => setActiveIndex(index)}
            >
              {haiku.japanese.map((line, lineIndex) => (
                <div
                  className="flex items-start gap-4 mb-4 haiku-line"
                  key={lineIndex}
                  style={{ animationDelay: `${lineIndex * 0.1}s` }}
                >
                  <p className="text-4xl font-bold text-gray-600 w-auto">{line}</p>
                  <p className="text-base font-light text-gray-500 w-auto">{haiku.english?.[lineIndex]}</p>
                </div>
              ))}
              {haiku.image_names && haiku.image_names.length === 3 && (
                <div className="mt-6 flex gap-4 justify-center">
                  {haiku.image_names.map((imageName, imgIndex) => (
                    <img
                      key={imageName}
                      src={`/images/${imageName}`}
                      alt={imageName || ""}
                      style={{
                        width: '130px',
                        height: '130px',
                        objectFit: 'cover',
                      }}
                      className={(haiku.selectedImage === imageName) ? `suggestion-card-image-focus` : `haiku-card-image`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const StepsFeedback = ({ args, respond, status }: { args: any, respond: any, status: any }) => {
  const [localSteps, setLocalSteps] = useState<
    {
      description: string;
      status: "disabled" | "enabled" | "executing";
    }[]
  >([]);
  const [newStep, setNewStep] = useState("");

  useEffect(() => {
    if (status === "executing" && localSteps.length === 0) {
      setLocalSteps(args.steps);
    }
  }, [status, args.steps, localSteps]);

  if (args.steps === undefined || args.steps.length === 0) {
    return <></>;
  }

  const steps = localSteps.length > 0 ? localSteps : args.steps;

  const handleCheckboxChange = (index: number) => {
    setLocalSteps((prevSteps) =>
      prevSteps.map((step, i) =>
        i === index
          ? {
            ...step,
            status: step.status === "enabled" ? "disabled" : "enabled",
          }
          : step
      )
    );
  };

  const handleAddStep = () => {
    const trimmed = newStep.trim();
    if (trimmed.length === 0) return;
    setLocalSteps((prevSteps) => [
      ...prevSteps,
      { description: trimmed, status: "enabled" },
    ]);
    setNewStep("");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddStep();
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[500px] w-full bg-gray-100 rounded-lg p-6 mb-4 mx-auto">
      <div className=" text-black space-y-2">
        <h2 className="text-lg font-bold mb-4">Select Steps</h2>
        {steps.map((step: any, index: any) => (
          <div key={index} className="text-sm flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={step.status === "enabled"}
                onChange={() => {
                  if (respond) {
                    handleCheckboxChange(index)
                  }
                }}
                className="mr-2"
              />
              <span
                className={
                  step.status !== "enabled" && status != "inProgress"
                    ? "line-through"
                    : ""
                }
              >
                {step.description}
              </span>
            </label>
          </div>
        ))}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            className="flex-1 rounded py-2 focus:outline-none"
            placeholder="Add a new step..."
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            onKeyDown={handleInputKeyDown}
            hidden={status != "executing"}
          />
        </div>
        {status === "executing" && (
          <button
            className="mt-4 bg-gradient-to-r from-purple-400 to-purple-600 text-white py-2 px-4 rounded cursor-pointer w-full max-w-48 font-bold"
            onClick={() => {
              const selectedSteps = localSteps
                .filter((step) => step.status === "enabled")
                .map((step) => step.description);
              respond(
                "The user selected the following steps: " +
                selectedSteps.join(", ")
              );
            }}
          >
            ✨ Perform Steps
          </button>
        )}
      </div>
    </div>
  );
};

function Spinner() {
  return (
    <svg
      className="mr-2 size-3 animate-spin text-slate-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

enum SkillLevel {
  BEGINNER = "Beginner",
  INTERMEDIATE = "Intermediate",
  ADVANCED = "Advanced",
}

enum CookingTime {
  FiveMin = "5 min",
  FifteenMin = "15 min",
  ThirtyMin = "30 min",
  FortyFiveMin = "45 min",
  SixtyPlusMin = "60+ min",
}

const cookingTimeValues = [
  { label: CookingTime.FiveMin, value: 0 },
  { label: CookingTime.FifteenMin, value: 1 },
  { label: CookingTime.ThirtyMin, value: 2 },
  { label: CookingTime.FortyFiveMin, value: 3 },
  { label: CookingTime.SixtyPlusMin, value: 4 },
];

const dietaryOptions = [
  "Vegetarian",
  "Nut-free",
  "Dairy-free",
  "Gluten-free",
  "Vegan",
  "Low-carb"
];

interface Ingredient {
  icon: string;
  name: string;
  amount: string;
}

interface Recipe {
  title: string;
  skill_level: SkillLevel;
  cooking_time: CookingTime;
  dietary_preferences: string[];
  ingredients: Ingredient[];
  instructions: string[];
}

interface RecipeAgentState {
  recipe: Recipe;
}

const INITIAL_STATE: RecipeAgentState = {
  recipe: {
    title: "Make Your Recipe",
    skill_level: SkillLevel.INTERMEDIATE,
    cooking_time: CookingTime.FortyFiveMin,
    dietary_preferences: [],
    ingredients: [
      { icon: "🥕", name: "Carrots", amount: "3 large, grated" },
      { icon: "🌾", name: "All-Purpose Flour", amount: "2 cups" },
    ],
    instructions: [
      "Preheat oven to 350°F (175°C)",
    ],
  },
};

function Recipe() {
  const { state: agentState, setState: setAgentState } =
    useCoAgent<RecipeAgentState>({
      name: "starterAgent",
      initialState: INITIAL_STATE,
    });

    console.log("agentState", agentState)

  const [recipe, setRecipe] = useState(INITIAL_STATE.recipe);
  const { appendMessage, isLoading } = useCopilotChat();
  const [editingInstructionIndex, setEditingInstructionIndex] = useState<number | null>(null);
  const newInstructionRef = useRef<HTMLTextAreaElement>(null);

  const updateRecipe = (partialRecipe: Partial<Recipe>) => {
    setAgentState({
      ...agentState,
      recipe: {
        ...recipe,
        ...partialRecipe,
      },
    });
    setRecipe({
      ...recipe,
      ...partialRecipe,
    });
  };

  const newRecipeState = { ...recipe };
  const newChangedKeys = [];
  const changedKeysRef = useRef<string[]>([]);

  for (const key in recipe) {
    if (
      agentState &&
      agentState.recipe &&
      (agentState.recipe as any)[key] !== undefined &&
      (agentState.recipe as any)[key] !== null
    ) {
      let agentValue = (agentState.recipe as any)[key];
      const recipeValue = (recipe as any)[key];

      // Check if agentValue is a string and replace \n with actual newlines
      if (typeof agentValue === "string") {
        agentValue = agentValue.replace(/\\n/g, "\n");
      }

      if (JSON.stringify(agentValue) !== JSON.stringify(recipeValue)) {
        (newRecipeState as any)[key] = agentValue;
        newChangedKeys.push(key);
      }
    }
  }

  if (newChangedKeys.length > 0) {
    changedKeysRef.current = newChangedKeys;
  } else if (!isLoading) {
    changedKeysRef.current = [];
  }

  useEffect(() => {
    setRecipe(newRecipeState);
  }, [JSON.stringify(newRecipeState)]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateRecipe({
      title: event.target.value,
    });
  };

  const handleSkillLevelChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateRecipe({
      skill_level: event.target.value as SkillLevel,
    });
  };

  const handleDietaryChange = (preference: string, checked: boolean) => {
    if (checked) {
      updateRecipe({
        dietary_preferences: [...recipe.dietary_preferences, preference],
      });
    } else {
      updateRecipe({
        dietary_preferences: recipe.dietary_preferences.filter(
          (p) => p !== preference
        ),
      });
    }
  };

  const handleCookingTimeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateRecipe({
      cooking_time: cookingTimeValues[Number(event.target.value)].label,
    });
  };

  
  const addIngredient = () => {
    // Pick a random food emoji from our valid list
    updateRecipe({
      ingredients: [...recipe.ingredients, { icon: "🍴", name: "", amount: "" }],
    });
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updatedIngredients = [...recipe.ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value,
    };
    updateRecipe({ ingredients: updatedIngredients });
  };

  const removeIngredient = (index: number) => {
    const updatedIngredients = [...recipe.ingredients];
    updatedIngredients.splice(index, 1);
    updateRecipe({ ingredients: updatedIngredients });
  };

  const addInstruction = () => {
    const newIndex = recipe.instructions.length;
    updateRecipe({
      instructions: [...recipe.instructions, ""],
    });
    // Set the new instruction as the editing one
    setEditingInstructionIndex(newIndex);
    
    // Focus the new instruction after render
    setTimeout(() => {
      const textareas = document.querySelectorAll('.instructions-container textarea');
      const newTextarea = textareas[textareas.length - 1] as HTMLTextAreaElement;
      if (newTextarea) {
        newTextarea.focus();
      }
    }, 50);
  };

  const updateInstruction = (index: number, value: string) => {
    const updatedInstructions = [...recipe.instructions];
    updatedInstructions[index] = value;
    updateRecipe({ instructions: updatedInstructions });
  };

  const removeInstruction = (index: number) => {
    const updatedInstructions = [...recipe.instructions];
    updatedInstructions.splice(index, 1);
    updateRecipe({ instructions: updatedInstructions });
  };

  // Simplified icon handler that defaults to a fork/knife for any problematic icons
  const getProperIcon = (icon: string | undefined): string => {
    // If icon is undefined  return the default
    if (!icon) {
      return "🍴";
    }
    
    return icon;
  };


  return (
    <form className="recipe-card">
      {/* Recipe Title */}
      <div className="recipe-header">
        <input
          type="text"
          value={recipe.title || ''}
          onChange={handleTitleChange}
          className="recipe-title-input"
        />
        
        <div className="recipe-meta">
          <div className="meta-item">
            <span className="meta-icon">🕒</span>
            <select
              className="meta-select"
              value={cookingTimeValues.find(t => t.label === recipe.cooking_time)?.value || 3}
              onChange={handleCookingTimeChange}
              style={{
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23555\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0px center',
                backgroundSize: '12px',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              {cookingTimeValues.map((time) => (
                <option key={time.value} value={time.value}>
                  {time.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="meta-item">
            <span className="meta-icon">🏆</span>
            <select
              className="meta-select"
              value={recipe.skill_level}
              onChange={handleSkillLevelChange}
              style={{
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23555\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0px center',
                backgroundSize: '12px',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              {Object.values(SkillLevel).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dietary Preferences */}
      <div className="section-container relative">
        {changedKeysRef.current.includes("dietary_preferences") && <Ping />}
        <h2 className="section-title">Dietary Preferences</h2>
        <div className="dietary-options">
          {dietaryOptions.map((option) => (
            <label key={option} className="dietary-option">
              <input
                type="checkbox"
                checked={recipe.dietary_preferences.includes(option)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDietaryChange(option, e.target.checked)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ingredients */}
      <div className="section-container relative">
        {changedKeysRef.current.includes("ingredients") && <Ping />}
        <div className="section-header">
          <h2 className="section-title">Ingredients</h2>
          <button 
            type="button" 
            className="add-button"
            onClick={addIngredient}
          >
            + Add Ingredient
          </button>
        </div>
        <div className="ingredients-container">
          {recipe.ingredients.map((ingredient, index) => (
            <div key={index} className="ingredient-card">
              <div className="ingredient-icon">{getProperIcon(ingredient.icon)}</div>
              <div className="ingredient-content">
                <input
                  type="text"
                  value={ingredient.name || ''}
                  onChange={(e) => updateIngredient(index, "name", e.target.value)}
                  placeholder="Ingredient name"
                  className="ingredient-name-input"
                />
                <input
                  type="text"
                  value={ingredient.amount || ''}
                  onChange={(e) => updateIngredient(index, "amount", e.target.value)}
                  placeholder="Amount"
                  className="ingredient-amount-input"
                />
              </div>
              <button 
                type="button" 
                className="remove-button" 
                onClick={() => removeIngredient(index)}
                aria-label="Remove ingredient"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="section-container relative">
        {changedKeysRef.current.includes("instructions") && <Ping />}
        <div className="section-header">
          <h2 className="section-title">Instructions</h2>
          <button 
            type="button" 
            className="add-step-button"
            onClick={addInstruction}
          >
            + Add Step
          </button>
        </div>
        <div className="instructions-container">
          {recipe.instructions.map((instruction, index) => (
            <div key={index} className="instruction-item">
              {/* Number Circle */}
              <div className="instruction-number">
                {index + 1}
              </div>
              
              {/* Vertical Line */}
              {index < recipe.instructions.length - 1 && (
                <div className="instruction-line" />
              )}
              
              {/* Instruction Content */}
              <div 
                className={`instruction-content ${
                  editingInstructionIndex === index 
                    ? 'instruction-content-editing' 
                    : 'instruction-content-default'
                }`}
                onClick={() => setEditingInstructionIndex(index)}
              >
                <textarea
                  className="instruction-textarea"
                  value={instruction || ''}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder={!instruction ? "Enter cooking instruction..." : ""}
                  onFocus={() => setEditingInstructionIndex(index)}
                  onBlur={(e) => {
                    // Only blur if clicking outside this instruction
                    if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) {
                      setEditingInstructionIndex(null);
                    }
                  }}
                />
                
                {/* Delete Button (only visible on hover) */}
                <button 
                  type="button"
                  className={`instruction-delete-btn ${
                    editingInstructionIndex === index 
                      ? 'instruction-delete-btn-editing' 
                      : 'instruction-delete-btn-default'
                  } remove-button`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering parent onClick
                    removeInstruction(index);
                  }}
                  aria-label="Remove instruction"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Improve with AI Button */}
      <div className="action-container">
        <button
          className={isLoading ? "improve-button loading" : "improve-button"}
          type="button"
          onClick={() => {
            if (!isLoading) {
              appendMessage(
                new TextMessage({
                  content: "Improve the recipe",
                  role: Role.User,
                })
              );
            }
          }}
          disabled={isLoading}
        >
          {isLoading ? "Please Wait..." : "Improve with AI"}
        </button>
      </div>
    </form>
  );
}

function Ping() {
  return (
    <span className="ping-animation">
      <span className="ping-circle"></span>
      <span className="ping-dot"></span>
    </span>
  );
}
