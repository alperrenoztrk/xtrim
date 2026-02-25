import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
import HomeScreen from "./pages/HomeScreen";
import LoginScreen from "./pages/LoginScreen";
import TemplatesScreen from "./pages/TemplatesScreen";
import VideoEditorScreen from "./pages/VideoEditorScreen";
import AudioEditorScreen from "./pages/AudioEditorScreen";
import PhotoEditorScreen from "./pages/PhotoEditorScreen";
import PhotoAudioScreen from "./pages/PhotoAudioScreen";
import CollageMakerScreen from "./pages/CollageMakerScreen";
import SettingsScreen from "./pages/SettingsScreen";
import ProjectsScreen from "./pages/ProjectsScreen";
import ExportScreen from "./pages/ExportScreen";
import NotFound from "./pages/NotFound";
import { applyTheme, getStoredTheme, subscribeToThemeChanges } from "./lib/theme";
import AndroidBackButtonHandler from "./components/AndroidBackButtonHandler";
import GlobalZoomGuard from "./components/GlobalZoomGuard";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const updateTheme = () => applyTheme(getStoredTheme());
    updateTheme();
    return subscribeToThemeChanges(updateTheme);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AndroidBackButtonHandler />
          <GlobalZoomGuard />
          <ProtectedRoute>
            <Routes>
              <Route path="/" element={<SplashScreen />} />
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/home" element={<HomeScreen />} />
              <Route path="/templates" element={<TemplatesScreen />} />
              <Route path="/editor" element={<VideoEditorScreen />} />
              <Route path="/editor/:projectId" element={<VideoEditorScreen />} />
              <Route path="/export/:projectId" element={<ExportScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/projects" element={<ProjectsScreen />} />
              <Route path="/ai" element={<HomeScreen />} />
              <Route path="/audio" element={<AudioEditorScreen />} />
              <Route path="/audio/:projectId" element={<AudioEditorScreen />} />
              <Route path="/photo-editor" element={<PhotoEditorScreen />} />
              <Route path="/collage" element={<CollageMakerScreen />} />
              <Route path="/photo-audio" element={<PhotoAudioScreen />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProtectedRoute>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
