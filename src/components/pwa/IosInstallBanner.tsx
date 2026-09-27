import React, { useState, useEffect } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PwaInstallModal } from "./PwaInstallModal";
import { Button } from "@/components/ui/button";
import { Share, PlusSquare, X, Smartphone, Sparkles } from "lucide-react";
import { AnbarWaterLogo } from "@/components/AnbarWaterLogo";

export function IosInstallBanner() {
  const { isIos, isStandalone, isInstallModalOpen, setIsInstallModalOpen } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem("ios_pwa_banner_dismissed");
      if (isDismissed === "true") {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("ios_pwa_banner_dismissed", "true");
    }
  };

  // Only render for iOS devices when not already installed in standalone mode and not dismissed
  if (!isIos || isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Glass Banner for iPhone Safari */}
      <div 
        className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-6 duration-300"
        dir="rtl"
      >
        <div className="bespoke-card p-4 bg-background/95 backdrop-blur-xl border-cyan-500/40 shadow-2xl rounded-2xl flex items-center justify-between gap-3 ring-1 ring-cyan-500/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center">
              <AnbarWaterLogo size={36} />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-black text-foreground flex items-center gap-1.5 truncate">
                <span>تثبيت التطبيق على iPhone</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold">
                  iOS Safari
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug truncate">
                اضغط <Share className="inline h-3 w-3 text-cyan-600 mx-0.5" /> المشاركة ثم <strong>"إضافة للشاشة الرئيسية" ➕</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={() => setIsInstallModalOpen(true)}
              className="h-8 text-xs font-bold gap-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>الخطوات</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl shrink-0"
              title="إغلاق التنبيه"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Visual Instructions Modal */}
      <PwaInstallModal
        open={isInstallModalOpen}
        onOpenChange={setIsInstallModalOpen}
        isIos={true}
        isAndroid={false}
      />
    </>
  );
}
