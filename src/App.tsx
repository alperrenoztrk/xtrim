import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
import HomeScreen from "./pages/HomeScreen";
import TemplatesScreen from "./pages/TemplatesScreen";
import MediaPickerScreen from "./pages/MediaPickerScreen";
import VideoEditorScreen from "./pages/VideoEditorScreen";
import SettingsScreen from "./pages/SettingsScreen";
import ProjectsScreen from "./pages/ProjectsScreen";
import AiScreen from "./pages/AiScreen";
import AudioScreen from "./pages/AudioScreen";
import PhotoEditorScreen from "./pages/PhotoEditorScreen";
import CollageScreen from "./pages/CollageScreen";
import PhotoAudioScreen from "./pages/PhotoAudioScreen";
import ExportScreen from "./pages/ExportScreen";
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
          <Route path="/media-picker" element={<MediaPickerScreen />} />
          <Route path="/editor" element={<VideoEditorScreen />} />
          <Route path="/editor/:projectId" element={<VideoEditorScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/projects" element={<ProjectsScreen />} />
          <Route path="/ai" element={<AiScreen />} />
          <Route path="/audio" element={<AudioScreen />} />
          <Route path="/photo-editor" element={<PhotoEditorScreen />} />
          <Route path="/collage" element={<CollageScreen />} />
          <Route path="/photo-audio" element={<PhotoAudioScreen />} />
          <Route path="/export/:projectId" element={<ExportScreen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
