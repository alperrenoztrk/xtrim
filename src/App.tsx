import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppSettingsProvider } from "@/context/AppSettingsContext";
import SplashScreen from "./pages/SplashScreen";
import HomeScreen from "./pages/HomeScreen";
import TemplatesScreen from "./pages/TemplatesScreen";
import VideoEditorScreen from "./pages/VideoEditorScreen";
import SettingsScreen from "./pages/SettingsScreen";
import ProjectsScreen from "./pages/ProjectsScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppSettingsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/templates" element={<TemplatesScreen />} />
            <Route path="/editor" element={<VideoEditorScreen />} />
            <Route path="/editor/:projectId" element={<VideoEditorScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/projects" element={<ProjectsScreen />} />
            <Route path="/ai" element={<HomeScreen />} />
            <Route path="/audio" element={<HomeScreen />} />
            <Route path="/photo-editor" element={<HomeScreen />} />
            <Route path="/collage" element={<HomeScreen />} />
            <Route path="/photo-audio" element={<HomeScreen />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppSettingsProvider>
  </QueryClientProvider>
);

export default App;
