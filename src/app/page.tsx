"use client";

import { useCoAgent, useCopilotAction } from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar, useCopilotChatSuggestions } from "@copilotkit/react-ui";
import { useEffect, useState } from "react";

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
      console.log("background", background);
      setBackground(background);
    },
  });

  useCopilotChatSuggestions({
    instructions: chatSuggestions.agenticChat,
    // className : "bg-gray-100"
  })

  return (
    <main style={{ "--copilot-kit-primary-color": background } as CopilotKitCSSProperties}>
      <YourMainContent background={background} />
      <Haiku />
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

function YourMainContent({ background }: { background: string }) {
  // 🪁 Shared State: https://docs.copilotkit.ai/coagents/shared-state
  const {state, setState} = useCoAgent<AgentState>({
    name: "sample_agent",
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

  useCopilotChatSuggestions({
    instructions: `
    ${chatSuggestions.agenticChat}
    ${chatSuggestions.writeAProverb}
    ${chatSuggestions.humanInTheLoop}
    ${chatSuggestions.agenticGenerativeUI}
    ${chatSuggestions.toolCallingGenerativeUI}
    `,
  });
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