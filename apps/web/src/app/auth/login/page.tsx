"use client";

import { LoginButton } from "@/components/auth/login-button";
import { ArrowRightIcon, LockClosedIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

const FloatingParticle = ({ delay = 0, duration = 4 }) => (
  <motion.div
    className="absolute h-1 w-1 rounded-full bg-primary/30"
    initial={{
      opacity: 0,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
    }}
    animate={{
      opacity: [0, 1, 0],
      x: [Math.random() * 100 - 50, Math.random() * 200 - 100, Math.random() * 100 - 50],
      y: [Math.random() * 100 - 50, Math.random() * 200 - 100, Math.random() * 100 - 50],
    }}
    transition={{
      duration,
      repeat: Infinity,
      delay,
      ease: "easeInOut",
    }}
  />
);

const BackgroundAnimation = () => (
  <div className="absolute inset-0 overflow-hidden">
    {/* Gradient orbs */}
    <motion.div
      className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 blur-3xl"
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
    <motion.div
      className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-secondary/10 to-primary/10 blur-3xl"
      animate={{
        scale: [1.2, 1, 1.2],
        rotate: [360, 180, 0],
      }}
      transition={{
        duration: 25,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />

    {/* Floating particles */}
    {[...Array(12)].map((_, i) => (
      <FloatingParticle key={i} delay={i * 0.5} duration={4 + Math.random() * 4} />
    ))}
  </div>
);

const BrandLogo = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
    transition={{ duration: 0.8, delay: 0.2 }}
    className="relative mx-auto mb-8 flex h-16 w-16 items-center justify-center"
  >
    <motion.div
      className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-secondary to-primary"
      animate={{
        rotate: [0, 360],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
    />
    <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-background">
      <motion.span
        className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-xl font-bold text-transparent"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        S0
      </motion.span>
    </div>
  </motion.div>
);

interface FeatureHighlightProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  delay?: number;
}

const FeatureHighlight = ({ icon: Icon, title, description, delay = 0 }: FeatureHighlightProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay }}
    className="flex items-start gap-3 rounded-lg bg-content1/50 p-3 backdrop-blur-sm"
  >
    <motion.div
      className="rounded-lg bg-primary/10 p-2"
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Icon className="h-4 w-4 text-primary" />
    </motion.div>
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-xs text-default-500">{description}</p>
    </div>
  </motion.div>
);

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <BackgroundAnimation />

      <div className="relative z-10 w-full max-w-4xl px-4">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Left side - Branding and features */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col justify-center space-y-8"
          >
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-4"
              >
                <h1 className="text-4xl font-bold text-foreground lg:text-5xl">
                  Welcome to{" "}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Source0
                  </span>
                </h1>
                <motion.div
                  className="mx-auto mt-2 h-1 w-20 bg-gradient-to-r from-primary to-secondary lg:mx-0"
                  initial={{ width: 0 }}
                  animate={{ width: 80 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg text-default-600 lg:text-xl"
              >
                Multi-provider AI chat with bulletproof streaming and secure BYOK architecture
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="space-y-4"
            >
              <FeatureHighlight
                icon={SparklesIcon}
                title="Multi-Provider AI"
                description="OpenAI, Anthropic, Google, xAI, and more in one interface"
                delay={0.8}
              />
              <FeatureHighlight
                icon={ArrowRightIcon}
                title="Bulletproof Streaming"
                description="Resumable conversations that never lose your place"
                delay={1.0}
              />
              <FeatureHighlight
                icon={LockClosedIcon}
                title="Secure BYOK"
                description="Your API keys stay in your browser, never on our servers"
                delay={1.2}
              />
            </motion.div>
          </motion.div>

          {/* Right side - Login form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex items-center justify-center"
          >
            <motion.div
              className="w-full max-w-md space-y-8 rounded-2xl border border-divider/50 bg-content1/80 p-8 shadow-2xl backdrop-blur-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{
                scale: 1.02,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
            >
              <BrandLogo />

              <div className="text-center">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="text-2xl font-bold text-foreground"
                >
                  Welcome back
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="mt-2 text-default-600"
                >
                  Sign in to continue your AI conversations
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <LoginButton />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.1 }}
                className="text-center"
              >
                <p className="text-xs text-default-500">
                  Built for the <span className="font-semibold text-primary">T3 Cloneathon</span>
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
