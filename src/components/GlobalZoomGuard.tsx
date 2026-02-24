import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PHOTO_EDITOR_ZOOM_SELECTOR = '[data-photo-zoom-area="true"]';

const isZoomAreaTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(PHOTO_EDITOR_ZOOM_SELECTOR));
};

const isZoomShortcut = (event: KeyboardEvent) => {
  const zoomKeys = ['+', '-', '=', '0'];
  return (event.ctrlKey || event.metaKey) && zoomKeys.includes(event.key);
};

const GlobalZoomGuard = () => {
  const location = useLocation();
  const isPhotoEditorRoute = location.pathname === '/photo-editor';

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      if (isPhotoEditorRoute && isZoomAreaTarget(event.target)) return;
      event.preventDefault();
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length < 2) return;
      if (isPhotoEditorRoute && isZoomAreaTarget(event.target)) return;
      event.preventDefault();
    };

    const handleGesture = (event: Event) => {
      if (isPhotoEditorRoute && isZoomAreaTarget(event.target)) return;
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isZoomShortcut(event)) return;
      if (isPhotoEditorRoute && isZoomAreaTarget(event.target)) return;
      event.preventDefault();
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('gesturestart', handleGesture, { passive: false });
    window.addEventListener('gesturechange', handleGesture, { passive: false });
    window.addEventListener('gestureend', handleGesture, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('gesturestart', handleGesture);
      window.removeEventListener('gesturechange', handleGesture);
      window.removeEventListener('gestureend', handleGesture);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPhotoEditorRoute]);

  return null;
};

export default GlobalZoomGuard;
