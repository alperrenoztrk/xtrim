import { useEffect, useRef } from "react";
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
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listenerHandle: PluginListenerHandle | null = null;

    void App.addListener("backButton", ({ canGoBack }) => {
      const currentPath = pathnameRef.current;
      const isHome = currentPath === HOME_PATH;

      if (isHome) {
        return;
      }

      if (canGoBack) {
        navigate(-1);
        return;
      }

      navigate(HOME_PATH, { replace: true });
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      void listenerHandle?.remove();
    };
  }, [navigate]);

  return null;
}
