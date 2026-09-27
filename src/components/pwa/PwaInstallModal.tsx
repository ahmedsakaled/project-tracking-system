import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share, PlusSquare, Smartphone, Download, CheckCircle2, Sparkles, Monitor } from "lucide-react";
import { AnbarWaterLogo } from "@/components/AnbarWaterLogo";

interface PwaInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isIos: boolean;
  isAndroid: boolean;
  onDirectInstall?: () => void;
  hasDeferredPrompt?: boolean;
}

export function PwaInstallModal({
  open,
  onOpenChange,
  isIos,
  isAndroid,
  onDirectInstall,
  hasDeferredPrompt,
}: PwaInstallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[94vw] max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6 border-cyan-500/30 shadow-2xl bg-background/95 backdrop-blur-xl">
        <DialogHeader className="text-center sm:text-right space-y-2">
          <div className="mx-auto sm:mr-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-1 shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/30">
            <AnbarWaterLogo size={48} />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground flex items-center justify-center sm:justify-start gap-2">
            <span>تثبيت تطبيق إدارة المشاريع</span>
            <Badge className="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30 text-[10px] font-bold">
              تطبيق رسمي
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            ثبّت التطبيق على شاشة جهازك الرئيسية لتجربة سريعة وسلسة مع إمكانية الوصول الفوري والعمل بدون إنترنت.
          </DialogDescription>
        </DialogHeader>

        {/* Dynamic Instructions Based on Platform */}
        {isIos ? (
          /* ─── iOS / iPhone / iPad Guide ─── */
          <div className="space-y-3.5 my-2">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-cyan-900 dark:text-cyan-200 font-bold">
              <Smartphone className="h-5 w-5 text-cyan-600 shrink-0" />
              <span>تعليمات التثبيت لأجهزة iPhone و iPad (متصفح Safari)</span>
            </div>

            <ol className="space-y-3 text-xs font-semibold text-foreground">
              {/* Step 1 */}
              <li className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white font-bold text-xs shadow-xs">
                  1
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    اضغط على زر المشاركة
                    <span className="inline-flex items-center justify-center p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600">
                      <Share className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    تجد زر المشاركة في الشريط السفلي للمتصفح (Safari) أو العلوي (Chrome على iOS).
                  </p>
                </div>
              </li>

              {/* Step 2 */}
              <li className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white font-bold text-xs shadow-xs">
                  2
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    مرر لأسفل واختر:
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold">
                      <PlusSquare className="h-3.5 w-3.5 text-emerald-600" />
                      إضافة إلى الشاشة الرئيسية
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    (Add to Home Screen) ستجدها ضمن خيارات القائمة.
                  </p>
                </div>
              </li>

              {/* Step 3 */}
              <li className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white font-bold text-xs shadow-xs">
                  3
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    اضغط على <strong className="text-cyan-600">"إضافة" (Add)</strong> في أعلى الزاوية.
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    سيظهر التطبيق مباشرة على شاشة هاتفك بأيقونة مديرية ماء الأنبار الرسمية.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        ) : hasDeferredPrompt ? (
          /* ─── Android / Desktop with direct prompt ─── */
          <div className="space-y-4 my-2 text-center">
            <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200 dark:border-cyan-800 rounded-2xl space-y-2">
              <Sparkles className="h-8 w-8 text-cyan-600 mx-auto animate-bounce" />
              <h3 className="font-bold text-sm text-foreground">جاهز للتثبيت الفوري</h3>
              <p className="text-xs text-muted-foreground">
                اضغط على زر التثبيت أدناه لتنزيل وتثبيت التطبيق مباشرة على جهازك بنقرة واحدة.
              </p>
            </div>

            <Button
              onClick={() => {
                onDirectInstall?.();
                onOpenChange(false);
              }}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-md shadow-cyan-500/20 gap-2"
            >
              <Download className="h-4 w-4" />
              تثبيت التطبيق الآن
            </Button>
          </div>
        ) : (
          /* ─── Android / Desktop Fallback Manual Guide ─── */
          <div className="space-y-3.5 my-2">
            <div className="p-3 bg-muted border border-border/80 rounded-2xl flex items-center gap-2.5 text-xs text-foreground font-bold">
              <Monitor className="h-5 w-5 text-primary shrink-0" />
              <span>خطوات التثبيت من المتصفح (Chrome / Edge)</span>
            </div>

            <ol className="space-y-2.5 text-xs font-semibold text-foreground">
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-[10px]">
                  1
                </span>
                <span>اضغط على قائمة المتصفح (النقاط الثلاث <strong>⋮</strong> في أعلى زاوية المتصفح).</span>
              </li>
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-[10px]">
                  2
                </span>
                <span>اختر <strong>"تثبيت التطبيق" (Install App)</strong> أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-[10px]">
                  3
                </span>
                <span>أكّد التثبيت لتشغيل المنظومة كنافذة تطبيق مستقلة بدون شريط عناوين.</span>
              </li>
            </ol>
          </div>
        )}

        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>متوافق مع أحدث معايير PWA</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
