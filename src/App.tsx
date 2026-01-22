import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
import HomeScreen from "./pages/HomeScreen";
import TemplatesScreen from "./pages/TemplatesScreen";
import VideoEditorScreen from "./pages/VideoEditorScreen";
import AudioEditorScreen from "./pages/AudioEditorScreen";
import PhotoEditorScreen from "./pages/PhotoEditorScreen";
import PhotoAudioScreen from "./pages/PhotoAudioScreen";
import CollageMakerScreen from "./pages/CollageMakerScreen";
import SettingsScreen from "./pages/SettingsScreen";
import ProjectsScreen from "./pages/ProjectsScreen";
import ExportScreen from "./pages/ExportScreen";
import PrivacyPolicyScreen from "./pages/PrivacyPolicyScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/export/:projectId" element={<ExportScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/privacy" element={<PrivacyPolicyScreen />} />
          <Route path="/projects" element={<ProjectsScreen />} />
          <Route path="/ai" element={<HomeScreen />} />
          <Route path="/audio" element={<AudioEditorScreen />} />
          <Route path="/audio/:projectId" element={<AudioEditorScreen />} />
          <Route path="/photo-editor" element={<PhotoEditorScreen />} />
          <Route path="/collage" element={<CollageMakerScreen />} />
          <Route path="/photo-audio" element={<PhotoAudioScreen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
