"use client";

import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import {
  BookOpenIcon,
  CodeBracketIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import { memo, useMemo, useState } from "react";

interface SamplePromptsProps {
  onPromptSelect: (prompt: string) => void;
  className?: string;
}

interface SamplePrompt {
  id: string;
  text: string;
  icon: React.ReactNode;
  category: "create" | "explore" | "code" | "learn";
}

type CategoryFilter = "create" | "explore" | "code" | "learn";

const SAMPLE_PROMPTS: SamplePrompt[] = [
  // Create prompts
  {
    id: "creative-story",
    text: "Write a short story about time travel",
    icon: <SparklesIcon className="h-4 w-4" />,
    category: "create",
  },
  {
    id: "business-plan",
    text: "Help me create a business plan for a startup",
    icon: <SparklesIcon className="h-4 w-4" />,
    category: "create",
  },
  {
    id: "poem-generator",
    text: "Create a poem about artificial intelligence",
    icon: <SparklesIcon className="h-4 w-4" />,
    category: "create",
  },
  {
    id: "marketing-copy",
    text: "Write compelling marketing copy for a new product",
    icon: <SparklesIcon className="h-4 w-4" />,
    category: "create",
  },
  {
    id: "social-media-post",
    text: "Create engaging social media content for my brand",
    icon: <SparklesIcon className="h-4 w-4" />,
    category: "create",
  },

  // Explore prompts
  {
    id: "black-holes",
    text: "Are black holes real?",
    icon: <BookOpenIcon className="h-4 w-4" />,
    category: "explore",
  },
  {
    id: "strawberry-rs",
    text: 'How many Rs are in the word "strawberry"?',
    icon: <BookOpenIcon className="h-4 w-4" />,
    category: "explore",
  },
  {
    id: "space-exploration",
    text: "What are the latest discoveries in space exploration?",
    icon: <BookOpenIcon className="h-4 w-4" />,
    category: "explore",
  },
  {
    id: "ocean-mysteries",
    text: "What mysteries still exist in our oceans?",
    icon: <BookOpenIcon className="h-4 w-4" />,
    category: "explore",
  },
  {
    id: "future-technology",
    text: "What technologies will shape the next decade?",
    icon: <BookOpenIcon className="h-4 w-4" />,
    category: "explore",
  },

  // Code prompts
  {
    id: "react-component",
    text: "Create a React component for a todo list",
    icon: <CodeBracketIcon className="h-4 w-4" />,
    category: "code",
  },
  {
    id: "python-script",
    text: "Write a Python script to analyze CSV data",
    icon: <CodeBracketIcon className="h-4 w-4" />,
    category: "code",
  },
  {
    id: "javascript-optimization",
    text: "How to optimize JavaScript performance?",
    icon: <CodeBracketIcon className="h-4 w-4" />,
    category: "code",
  },
  {
    id: "database-design",
    text: "Design a database schema for an e-commerce app",
    icon: <CodeBracketIcon className="h-4 w-4" />,
    category: "code",
  },
  {
    id: "api-integration",
    text: "Help me integrate a REST API with error handling",
    icon: <CodeBracketIcon className="h-4 w-4" />,
    category: "code",
  },

  // Learn prompts
  {
    id: "ai-explanation",
    text: "How does AI work?",
    icon: <LightBulbIcon className="h-4 w-4" />,
    category: "learn",
  },
  {
    id: "meaning-of-life",
    text: "What is the meaning of life?",
    icon: <LightBulbIcon className="h-4 w-4" />,
    category: "learn",
  },
  {
    id: "quantum-physics",
    text: "Explain quantum physics in simple terms",
    icon: <LightBulbIcon className="h-4 w-4" />,
    category: "learn",
  },
  {
    id: "climate-change",
    text: "Explain the science behind climate change",
    icon: <LightBulbIcon className="h-4 w-4" />,
    category: "learn",
  },
  {
    id: "investment-basics",
    text: "Teach me the basics of investing in stocks",
    icon: <LightBulbIcon className="h-4 w-4" />,
    category: "learn",
  },
];

const getCategoryColor = (category: SamplePrompt["category"]) => {
  switch (category) {
    case "create":
      return "text-primary";
    case "explore":
      return "text-secondary";
    case "code":
      return "text-success";
    case "learn":
      return "text-warning";
    default:
      return "text-default-500";
  }
};

export const SamplePrompts = memo(({ onPromptSelect, className = "" }: SamplePromptsProps) => {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("create");
  const { showSamplePrompts } = useUserPreferencesStore();

  const filteredPrompts = useMemo(() => {
    return SAMPLE_PROMPTS.filter((prompt) => prompt.category === activeCategory);
  }, [activeCategory]);

  if (!showSamplePrompts) {
    return null;
  }

  return (
    <div className={`mx-auto w-full max-w-3xl ${className}`}>
      {/* Tabs */}
      <div className="w-full">
        <Tabs
          selectedKey={activeCategory}
          onSelectionChange={(key) => setActiveCategory(key as CategoryFilter)}
          aria-label="Prompt categories"
          color="primary"
          variant="underlined"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary",
          }}
        >
          <Tab
            key="create"
            title={
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-4 w-4" />
                <span>Create</span>
              </div>
            }
          />
          <Tab
            key="explore"
            title={
              <div className="flex items-center space-x-2">
                <BookOpenIcon className="h-4 w-4" />
                <span>Explore</span>
              </div>
            }
          />
          <Tab
            key="code"
            title={
              <div className="flex items-center space-x-2">
                <CodeBracketIcon className="h-4 w-4" />
                <span>Code</span>
              </div>
            }
          />
          <Tab
            key="learn"
            title={
              <div className="flex items-center space-x-2">
                <LightBulbIcon className="h-4 w-4" />
                <span>Learn</span>
              </div>
            }
          />
        </Tabs>

        {/* Prompts List */}
        <div className="mt-8 space-y-3">
          {filteredPrompts.map((prompt) => (
            <Card
              key={prompt.id}
              isPressable
              isHoverable
              className="w-full border-none bg-content1/50 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
              onPress={() => onPromptSelect(prompt.text)}
            >
              <CardBody className="p-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex-shrink-0 rounded-lg bg-content2 p-2 ${getCategoryColor(prompt.category)}`}
                  >
                    {prompt.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed text-foreground">
                      {prompt.text}
                    </p>
                  </div>
                  <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <svg
                        className="h-3 w-3 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
});

SamplePrompts.displayName = "SamplePrompts";
