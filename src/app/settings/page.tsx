import { AppShell } from "@/components/layout/app-shell";
import { SettingsScreen } from "@/components/settings/settings-screen";

export default function SettingsPage() {
  return (
    <AppShell title="설정" subtitle="계정 상태, PIN 잠금, 내보내기/가져오기">
      <SettingsScreen />
    </AppShell>
  );
}
