import { useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";

type BackButtonListenerEvent = {
  canGoBack: boolean;
};

type PluginListenerHandle = {
  remove: () => Promise<void>;
};

type AppPlugin = {
  addListener: (
    eventName: "backButton",
    listenerFunc: (event: BackButtonListenerEvent) => void,
  ) => Promise<PluginListenerHandle>;
};

const App = registerPlugin<AppPlugin>("App");

const HOME_PATH = "/home";

export default function AndroidBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: PluginListenerHandle | null = null;

    void App.addListener("backButton", () => {
      const isHome = location.pathname === HOME_PATH;
      const isSplash = location.pathname === "/";

      if (isSplash || isHome) {
        navigate(HOME_PATH, { replace: true });
        return;
      }

      navigate(-1);
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      void listenerHandle?.remove();
    };
  }, [location.pathname, navigate]);

  return null;
}
