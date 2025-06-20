import { ModelConfig } from "@/config/models";
import { themeOptions } from "@/stores/user-preferences-store";
import {
  ArrowPathIcon,
  CheckIcon,
  Cog6ToothIcon,
  EyeIcon,
  KeyIcon,
  LockClosedIcon,
  PhotoIcon,
  ShareIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ProviderIcon } from "../chat/provider-icon";

export interface Feature {
  id: string;
  title: string;
  description: string;
  visual:
    | "providers"
    | "themes"
    | "streaming"
    | "settings"
    | "sharing"
    | "security"
    | "imageGeneration";
}

const providerList: ModelConfig["provider"][] = [
  "OpenAI",
  "Anthropic",
  "Google",
  "xAI",
  "Groq",
  "DeepSeek",
  "OpenRouter",
];

const modelNames = [
  "Gemini 2.5 Flash",
  "Claude 3.5 Sonnet",
  "GPT-4o",
  "Llama 3.3 70B",
  "DeepSeek R1",
  "DeepSeek V3",
  "Claude 4 Sonnet",
];

// Map theme colors for the visual showcase
const themeColorMap = {
  ocean: ["#0ea5e9", "#0284c7"],
  forest: ["#059669", "#047857"],
  sunset: ["#f59e0b", "#d97706"],
  lavender: ["#8b5cf6", "#7c3aed"],
  rose: ["#ec4899", "#db2777"],
} as const;

const ProviderShowcase = () => {
  const [currentProvider, setCurrentProvider] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentProvider((prev) => (prev + 1) % providerList.length);
        setIsTransitioning(false);
      }, 150);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ scale: isTransitioning ? 0.9 : 1 }}
          transition={{ duration: 0.15 }}
          className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 shadow-xl ring-2 ring-primary/30"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProvider}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.3 }}
            >
              <ProviderIcon provider={providerList[currentProvider]!} className="h-10 w-10" />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentProvider}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <div className="text-sm font-semibold text-foreground">
              {providerList[currentProvider]}
            </div>
            <div className="text-xs text-default-500">
              {modelNames[currentProvider] || "Latest Model"}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-1">
          {providerList.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                scale: index === currentProvider ? 1.2 : 1,
              }}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                index === currentProvider ? "bg-primary" : "bg-default-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ThemeShowcase = () => {
  const [selectedTheme, setSelectedTheme] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedTheme((prev) => (prev + 1) % 5);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex gap-3">
        {themeOptions.slice(2, 7).map((theme, index) => {
          const colors = themeColorMap[theme.key as keyof typeof themeColorMap];
          const isSelected = selectedTheme === index;

          return (
            <motion.div
              key={theme.key}
              animate={{
                scale: isSelected ? 1.1 : 1,
                y: isSelected ? -8 : 0,
              }}
              transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
              className="flex flex-col items-center gap-2"
            >
              <div className="relative">
                <div
                  className="h-16 w-12 rounded-xl shadow-lg transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                    boxShadow: isSelected
                      ? `0 8px 25px ${colors[0]}40, 0 0 0 2px ${colors[0]}60`
                      : "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -right-1 -top-1 rounded-full bg-success p-1"
                    >
                      <CheckIcon className="h-3 w-3 text-success-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  isSelected ? "text-foreground" : "text-default-500"
                }`}
              >
                {theme.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const StreamingAnimation = () => {
  const [text, setText] = useState("");
  const [isReconnecting, setIsReconnecting] = useState(false);
  const fullText = "This is how streaming works seamlessly...";

  useEffect(() => {
    const typeText = () => {
      setText("");
      let currentIndex = 0;

      const typeInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setText(fullText.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          // Simulate reconnection after completion
          setTimeout(() => {
            setIsReconnecting(true);
            setTimeout(() => {
              setIsReconnecting(false);
              setTimeout(typeText, 500); // Restart the cycle
            }, 1000);
          }, 1500);
        }
      }, 80);

      return () => clearInterval(typeInterval);
    };

    typeText();
  }, []);

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-content1 p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-full bg-danger/30"></div>
              <div className="h-3 w-3 rounded-full bg-warning/30"></div>
              <div className="h-3 w-3 rounded-full bg-success/30"></div>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: isReconnecting ? 360 : 0 }}
                transition={{ duration: 0.5 }}
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${isReconnecting ? "text-warning" : "text-success"}`}
                />
              </motion.div>
              <span
                className={`text-xs font-medium ${
                  isReconnecting ? "text-warning" : "text-success"
                }`}
              >
                {isReconnecting ? "Reconnecting..." : "Connected"}
              </span>
            </div>
          </div>

          <div className="min-h-[3rem] font-mono text-sm text-default-700">
            {text}
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-primary"
            >
              |
            </motion.span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsAnimation = () => {
  const [settings, setSettings] = useState({
    hidePersonalInfo: false,
    showSamplePrompts: true,
    memoryEnabled: true,
    suggestQuestions: true,
    showChatNavigator: false,
  });

  const settingLabels = {
    hidePersonalInfo: "Hide Personal Info",
    showSamplePrompts: "Sample Prompts",
    memoryEnabled: "Memory Enabled",
    suggestQuestions: "Suggest Questions",
    showChatNavigator: "Chat Navigator",
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const settingKeys = Object.keys(settings) as Array<keyof typeof settings>;
      const randomKey = settingKeys[Math.floor(Math.random() * settingKeys.length)];
      if (randomKey) {
        setSettings((prev) => ({
          ...prev,
          [randomKey]: !prev[randomKey],
        }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [settings]);

  return (
    <div className="flex h-full items-center justify-center p-2">
      <div className="w-full max-w-xs">
        <div className="rounded-xl bg-content1 p-4 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Cog6ToothIcon className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="text-sm font-semibold">Settings</span>
          </div>

          <div className="space-y-3">
            {Object.entries(settings).map(([key, value]) => (
              <motion.div key={key} layout className="flex items-center justify-between gap-4">
                <span className="text-xs text-default-600">
                  {settingLabels[key as keyof typeof settingLabels]}
                </span>
                <motion.div
                  className={`relative h-4 w-7 cursor-pointer rounded-full transition-colors ${
                    value ? "bg-primary" : "bg-default-300"
                  }`}
                >
                  <motion.div
                    animate={{
                      x: value ? 12 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-content1 shadow-sm"
                  />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SharingAnimation = () => {
  const [shareStep, setShareStep] = useState(0);
  const steps = ["Select", "Share", "Success"];

  useEffect(() => {
    const interval = setInterval(() => {
      setShareStep((prev) => (prev + 1) % 3);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <motion.div
            animate={{ scale: shareStep === 0 ? 1.1 : 1 }}
            className="rounded-2xl bg-content1 p-4 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                <span className="text-xs font-bold text-primary-foreground">AI</span>
              </div>
              <div className="flex-1">
                <div className="h-2 w-16 rounded bg-content3"></div>
                <div className="mt-1 h-2 w-12 rounded bg-content3"></div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {shareStep >= 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute -bottom-2 -right-2"
              >
                <div className="rounded-full bg-primary p-2">
                  <ShareIcon className="h-4 w-4 text-primary-foreground" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={shareStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <div className="text-sm font-medium text-foreground">
              {shareStep === 2 ? "🎉 Shared!" : steps[shareStep]}
            </div>
            <div className="mt-1 text-xs text-default-500">
              {shareStep === 0 && "Choose conversation"}
              {shareStep === 1 && "Generating link..."}
              {shareStep === 2 && "source0.chat/share/abc123"}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-1">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                scale: index <= shareStep ? 1.2 : 1,
              }}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                index <= shareStep ? "bg-primary" : "bg-default-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const SecurityAnimation = () => {
  const [securityState, setSecurityState] = useState("locked");
  const [keyVisible, setKeyVisible] = useState(false);

  useEffect(() => {
    const sequence = async () => {
      // Start locked
      setSecurityState("locked");
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show key entry
      setSecurityState("entering");
      setKeyVisible(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Secure
      setSecurityState("secured");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Hide key and restart
      setKeyVisible(false);
    };

    sequence();
    const interval = setInterval(sequence, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <motion.div
            animate={{
              scale: securityState === "secured" ? 1.1 : 1,
              rotateY: securityState === "entering" ? [0, 360] : 0,
            }}
            transition={{ duration: 0.8 }}
            className={`rounded-2xl p-6 shadow-xl transition-all duration-500 ${
              securityState === "secured"
                ? "bg-gradient-to-br from-success/20 to-primary/20 ring-2 ring-success/30"
                : "bg-content1"
            }`}
          >
            <AnimatePresence mode="wait">
              {securityState === "locked" && (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LockClosedIcon className="h-8 w-8 text-default-400" />
                </motion.div>
              )}
              {securityState === "entering" && (
                <motion.div
                  key="entering"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <KeyIcon className="h-8 w-8 text-warning" />
                </motion.div>
              )}
              {securityState === "secured" && (
                <motion.div
                  key="secured"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="relative">
                    <KeyIcon className="h-8 w-8 text-success" />
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 rounded-full bg-success p-1"
                    >
                      <CheckIcon className="h-3 w-3 text-success-foreground" />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {securityState === "secured" && (
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 0.3 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
                  className="absolute inset-0 rounded-2xl border-2 border-success/40"
                />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.4, opacity: 0.2 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity, repeatType: "reverse", delay: 0.3 }}
                  className="absolute inset-0 rounded-2xl border-2 border-success/30"
                />
              </>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={securityState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <div className="text-sm font-medium text-foreground">
              {securityState === "locked" && "Your API Keys"}
              {securityState === "entering" && "Encrypting..."}
              {securityState === "secured" && "🔒 Secured Locally"}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1 text-xs text-default-500">
              {keyVisible && <EyeIcon className="h-3 w-3" />}
              {securityState === "locked" && "Never stored on servers"}
              {securityState === "entering" && "Browser-only storage"}
              {securityState === "secured" && "Your keys, your control"}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const ImageGenerationAnimation = () => {
  const [step, setStep] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);
  const steps = ["prompt", "generating", "generated", "discussing"];

  useEffect(() => {
    const sequence = async () => {
      // Start with prompt
      setStep(0);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generating with sparkles
      setStep(1);
      setShowSparkles(true);
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Show generated image
      setStep(2);
      setShowSparkles(false);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Discussion phase
      setStep(3);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    };

    sequence();
    const interval = setInterval(sequence, 9000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <motion.div
            animate={{
              scale: step === 1 ? 1.05 : 1,
              y: step === 1 ? -5 : 0,
            }}
            transition={{ duration: 0.3 }}
            className={`rounded-2xl p-6 shadow-xl transition-all duration-500 ${
              step === 2 || step === 3
                ? "bg-gradient-to-br from-primary/10 to-secondary/10 ring-2 ring-primary/20"
                : "bg-content1"
            }`}
          >
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="rounded-xl bg-content2 p-3 text-xs text-default-600">
                    &ldquo;Create a sunset over mountains&rdquo;
                  </div>
                  <PhotoIcon className="h-8 w-8 text-default-400" />
                </motion.div>
              )}
              {step === 1 && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <SparklesIcon className="h-8 w-8 text-primary" />
                  </motion.div>
                  <div className="text-xs font-medium text-primary">Generating...</div>
                </motion.div>
              )}
              {(step === 2 || step === 3) && (
                <motion.div
                  key="generated"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="relative">
                    <div className="h-16 w-20 rounded-lg bg-gradient-to-br from-orange-300 via-pink-300 to-purple-400 shadow-lg" />
                    {step === 2 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -right-1 -top-1 rounded-full bg-success p-1"
                      >
                        <CheckIcon className="h-3 w-3 text-success-foreground" />
                      </motion.div>
                    )}
                  </div>
                  {step === 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg bg-content2 p-2 text-xs text-default-600"
                    >
                      &ldquo;What time of day is this?&rdquo;
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sparkles animation overlay */}
            <AnimatePresence>
              {showSparkles && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        x: [0, Math.random() * 60 - 30],
                        y: [0, Math.random() * 60 - 30],
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      className="absolute h-1 w-1 rounded-full bg-primary"
                      style={{
                        left: "50%",
                        top: "50%",
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <div className="text-sm font-medium text-foreground">
              {step === 0 && "Describe Your Vision"}
              {step === 1 && "🎨 Creating Magic"}
              {step === 2 && "✨ Ready to Share"}
              {step === 3 && "💬 Continue the Chat"}
            </div>
            <div className="mt-1 text-xs text-default-500">
              {step === 0 && "Simple text prompts"}
              {step === 1 && "GPT-Image-1 at work"}
              {step === 2 && "Beautiful results"}
              {step === 3 && "AI understands your image"}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-1">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                scale: index <= step ? 1.2 : 1,
              }}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                index <= step ? "bg-primary" : "bg-default-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const visualComponents = {
  providers: ProviderShowcase,
  themes: ThemeShowcase,
  streaming: StreamingAnimation,
  settings: SettingsAnimation,
  sharing: SharingAnimation,
  security: SecurityAnimation,
  imageGeneration: ImageGenerationAnimation,
};

export function FeatureCard({ title, description, visual }: Feature) {
  const VisualComponent = visualComponents[visual];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex h-full w-full flex-col bg-gradient-to-br from-content1 via-content1 to-content2/50 px-8 py-6 text-center backdrop-blur-sm"
    >
      <div className="flex flex-col items-center justify-start">
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-3 text-xl font-bold text-foreground"
        >
          {title}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="max-w-md text-sm leading-relaxed text-default-600"
        >
          {description}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-8 flex flex-grow items-center justify-center"
      >
        <VisualComponent />
      </motion.div>
    </motion.div>
  );
}
