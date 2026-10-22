import { AuthTabs } from "@/components/auth/auth-tabs";

import { GoogleButton } from "../google-button";

// Shared by /login and /register. Layouts stay mounted when moving between the
// two, so the tabs and Google button stay put and only the form (the page) swaps.
export default function TabsLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="space-y-7">
      <AuthTabs />
      {children}
      <GoogleButton />
    </div>
  );
}
