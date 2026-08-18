import { ThemeSwitcher } from "@/components/theme-switcher";

export function AppFooter() {
  return (
    <footer className="mx-auto flex w-full items-center justify-center gap-8 border-t py-8 text-center text-xs">
      <ThemeSwitcher />
    </footer>
  );
}
