"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { useState } from "react";
import { FeatureCard, type Feature } from "./feature-card";

const features: Feature[] = [
  {
    id: "multi-provider",
    title: "Multi-Provider AI Support",
    description:
      "Seamlessly switch between top AI models from OpenAI, Anthropic, Google, and more to find the perfect one for your task.",
    visual: "providers",
  },
  {
    id: "image-generation",
    title: "AI-Aware Image Generation",
    description:
      "Generate stunning images with GPT-Image-1 and continue the conversation about them. The AI understands your generated images for seamless multimodal chats.",
    visual: "imageGeneration",
  },
  {
    id: "settings",
    title: "Highly Configurable",
    description:
      "Tailor the interface to your workflow with powerful settings and options for every feature.",
    visual: "settings",
  },
  {
    id: "streaming",
    title: "Bulletproof Resumable Streaming",
    description:
      "Never lose your place. Our resilient architecture ensures your chat resumes perfectly, even with network interruptions.",
    visual: "streaming",
  },
  {
    id: "themes",
    title: "Customizable Themes",
    description: "Personalize your experience with a variety of themes to suit your style.",
    visual: "themes",
  },
  {
    id: "sharing",
    title: "Advanced Session Management",
    description:
      "Take control of your conversations with features like branching, sharing, and pinning important chats.",
    visual: "sharing",
  },
  {
    id: "security",
    title: "Secure Bring Your Own Key (BYOK)",
    description:
      "Your API keys are stored only in your browser, never on our servers, giving you full control over your credentials.",
    visual: "security",
  },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, features.length - 1));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur">
      <ModalContent className="max-h-[90vh] overflow-hidden">
        <ModalHeader className="border-b border-divider">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Welcome to Source0!</h2>
              <span className="rounded-full bg-gradient-to-r from-primary to-secondary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Built for T3 Cloneathon
              </span>
            </div>
            <p className="text-sm text-default-500">
              Here&apos;s a quick tour of the powerful features at your fingertips.
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="p-0">
          <div className="relative h-[400px] w-full overflow-hidden">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="absolute h-full w-full transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(${(index - currentStep) * 100}%)`,
                }}
              >
                <FeatureCard {...feature} />
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter className="flex w-full items-center justify-between border-t border-divider">
          <div className="flex items-center gap-2">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  currentStep === index ? "bg-primary" : "bg-content3"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="light"
              onPress={handlePrev}
              isDisabled={currentStep === 0}
              startContent={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Prev
            </Button>
            {currentStep < features.length - 1 ? (
              <Button
                color="primary"
                onPress={handleNext}
                endContent={<ArrowRightIcon className="h-4 w-4" />}
              >
                Next
              </Button>
            ) : (
              <Button color="success" variant="flat" onPress={onClose}>
                Get Started
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
