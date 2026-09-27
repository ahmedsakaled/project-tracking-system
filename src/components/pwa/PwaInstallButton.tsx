import React from "react";
import { Download, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PwaInstallModal } from "./PwaInstallModal";
import { cn } from "@/lib/utils";

interface PwaInstallButtonProps {
  variant?: "topbar" | "sidebar" | "banner" | "auth" | "compact";
  className?: string;
}

export function PwaInstallButton({ variant = "topbar", className }: PwaInstallButtonProps) {
  const {
    canInstall,
    isStandalone,
    isIos,
    isAndroid,
    hasDeferredPrompt,
    isInstallModalOpen,
    setIsInstallModalOpen,
    promptInstall,
  } = usePwaInstall();

  // If already installed/standalone, do not show button
  if (!canInstall || isStandalone) {
    return null;
  }

  return (
    <>
      {variant === "topbar" && (
        <Button
          onClick={promptInstall}
          variant="default"
          size="sm"
          className={cn(
            "h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-bold rounded-xl gap-1.5",
            "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white",
            "shadow-md shadow-cyan-500/15 transition-all duration-200 cursor-pointer active:scale-95 touch-target",
            className
          )}
          title="تثبيت التطبيق على جهازك"
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-bounce" />
          <span className="hidden xs:inline">تثبيت التطبيق</span>
          <span className="xs:hidden">تثبيت</span>
        </Button>
      )}

      {variant === "sidebar" && (
        <button
          onClick={promptInstall}
          type="button"
          className={cn(
            "w-full flex items-center justify-between gap-2 p-2.5 rounded-xl text-xs font-bold",
            "bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 text-sidebar-foreground",
            "hover:bg-cyan-600/30 transition-all duration-200 cursor-pointer active:scale-98",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-cyan-600 text-white shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="text-right truncate leading-tight">
              <div className="text-xs font-bold text-sidebar-foreground">تثبيت التطبيق</div>
              <div className="text-[10px] text-sidebar-foreground/70">تشغيل أسرع وبدون إنترنت</div>
            </div>
          </div>
          <Download className="h-4 w-4 text-cyan-400 shrink-0 ml-1" />
        </button>
      )}

      {variant === "auth" && (
        <Button
          onClick={promptInstall}
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3.5 rounded-xl text-xs font-bold gap-2",
            "bg-white/80 dark:bg-slate-900/80 border-cyan-500/40 text-slate-800 dark:text-slate-100",
            "hover:bg-cyan-50 hover:border-cyan-500 shadow-sm transition-all active:scale-95",
            className
          )}
        >
          <Download className="h-4 w-4 text-cyan-600 animate-pulse" />
          <span>تثبيت التطبيق على هاتفك</span>
        </Button>
      )}

      {variant === "compact" && (
        <Button
          onClick={promptInstall}
          variant="outline"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-xl border-cyan-500/40 text-cyan-600 hover:bg-cyan-50",
            className
          )}
          title="تثبيت التطبيق"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}

      {/* Instructional / Prompt Modal */}
      <PwaInstallModal
        open={isInstallModalOpen}
        onOpenChange={setIsInstallModalOpen}
        isIos={isIos}
        isAndroid={isAndroid}
        hasDeferredPrompt={hasDeferredPrompt}
        onDirectInstall={promptInstall}
      />
    </>
  );
}
