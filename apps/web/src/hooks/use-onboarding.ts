import { createClient } from "@/utils/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const fetchOnboardingStatus = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return true; // Assume completed if no user
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("has_completed_onboarding")
    .eq("id", user.id)
    .single();

  if (error) {
    // This can happen if the profile hasn't been created yet by the trigger
    if (error.code === "PGRST116") {
      return false;
    }
    throw error;
  }

  return data?.has_completed_onboarding ?? false;
};

const completeOnboarding = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, has_completed_onboarding: true }, { onConflict: "id" });

  if (error) {
    throw error;
  }
};

export const useOnboarding = () => {
  const queryClient = useQueryClient();

  const { data: hasCompletedOnboarding, isLoading } = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: fetchOnboardingStatus,
    staleTime: Infinity, // Onboarding status doesn't change often
  });

  const { mutate: markOnboardingAsCompleted } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      queryClient.setQueryData(["onboarding-status"], true);
    },
  });

  return {
    hasCompletedOnboarding,
    isLoading,
    markOnboardingAsCompleted,
  };
};
