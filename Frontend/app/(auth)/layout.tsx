import { Showcase } from "@/components/demo/showcase";
import { Logo } from "@/components/logo";

// The form on the left; on wide screens, the animated product demo on the
// right so people see what they're signing up for.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(440px,520px)_minmax(0,1fr)]">
      <div className="flex flex-col bg-canvas px-6 py-8 sm:px-12 lg:px-16">
        <Logo />
        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12 lg:mx-0">{children}</main>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Veynia · Made in Lagos</p>
      </div>
      <aside className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Showcase />
        </div>
      </aside>
    </div>
  );
}
