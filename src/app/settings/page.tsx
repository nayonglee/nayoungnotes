import { AppShell } from "@/components/layout/app-shell";
import { SettingsScreen } from "@/components/settings/settings-screen";

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Themes, privacy, export, and daily comfort tweaks.">
      <SettingsScreen />
    </AppShell>
  );
}
