import { Outlet } from "react-router-dom";
import { Header, Sidebar, MainContent } from "@/components/layout";
import { useKeyboardShortcuts } from "@/hooks";

export function RootLayout() {
  // Initialize keyboard shortcuts - Requirements 79.1
  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <MainContent>
          <Outlet />
        </MainContent>
      </div>
    </div>
  );
}
