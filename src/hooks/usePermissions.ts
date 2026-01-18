import { useState, useEffect, useCallback } from 'react';
import { permissionService, PermissionResult, PermissionStatus } from '@/services/PermissionService';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionResult>({
    photos: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
  });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      setIsChecking(true);
      const result = await permissionService.checkPermissions();
      setPermissions(result);
      setIsChecking(false);
    };

    checkPermissions();
  }, []);

  const requestPermission = useCallback(async (type: 'photos' | 'camera' | 'microphone') => {
    const result = await permissionService.requestPermission(type);
    setPermissions((prev) => ({ ...prev, [type]: result }));
    return result;
  }, []);

  const requestAllPermissions = useCallback(async () => {
    const result = await permissionService.requestAllPermissions();
    setPermissions(result);
    return result;
  }, []);

  const openSettings = useCallback(async () => {
    await permissionService.openSettings();
  }, []);

  return {
    permissions,
    isChecking,
    requestPermission,
    requestAllPermissions,
    openSettings,
  };
};

export default usePermissions;
