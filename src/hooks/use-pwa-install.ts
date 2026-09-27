import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIos(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
      setIsInstallModalOpen(false);
      toast.success("🎉 تم تثبيت التطبيق بنجاح على جهازك!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    // If iOS, open iOS guide modal
    if (isIos) {
      setIsInstallModalOpen(true);
      return;
    }

    // If deferredPrompt is available (Android / Chrome / Edge)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          toast.success("جاري تثبيت التطبيق...");
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
      } catch (err) {
        console.warn("[PWA] Install prompt error:", err);
        setIsInstallModalOpen(true);
      }
    } else {
      // Fallback: show instructions modal
      setIsInstallModalOpen(true);
    }
  };

  // Determine if install button should be visible
  const canInstall = !isStandalone && !isInstalled;

  return {
    canInstall,
    isStandalone,
    isInstalled,
    isIos,
    isAndroid,
    hasDeferredPrompt: !!deferredPrompt,
    isInstallModalOpen,
    setIsInstallModalOpen,
    promptInstall,
  };
}
