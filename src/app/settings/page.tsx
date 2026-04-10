import { AppShell } from "@/components/layout/app-shell";
import { SettingsScreen } from "@/components/settings/settings-screen";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Account, PIN lock, and export or import tools">
      <SettingsScreen />
    </AppShell>
  );
}
