import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";
import { OfflineIndicator } from "./components/pwa";
import { KeyboardShortcutsModal } from "./components/shortcuts";
import { OnboardingTour } from "./components/onboarding";
import { HelpModal } from "./components/help";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <OfflineIndicator />
      <KeyboardShortcutsModal />
      <OnboardingTour />
      <HelpModal />
    </QueryClientProvider>
  );
}
