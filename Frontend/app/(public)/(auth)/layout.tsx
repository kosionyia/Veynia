import { NightPanel, Showcase } from "@/components/demo/showcase";

// Every auth page: the animated demo on the left (large screens), the card on
// the right, both on the dark panel. Layouts stay mounted when moving between
// auth pages, so the demo keeps playing instead of starting over.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <NightPanel className="flex flex-1 items-center">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-14 xl:gap-16">
        <Showcase className="hidden lg:block" />
        <div className="mx-auto w-full max-w-[420px] rounded-3xl border border-white/10 bg-surface p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] sm:p-8">
          {children}
        </div>
      </div>
    </NightPanel>
  );
}
