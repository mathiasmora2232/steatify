import { Sidebar, MobileNav } from '@/components/Sidebar';
import { Providers } from '@/components/Providers';
import { ThemeSync } from '@/components/ThemeSync';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ThemeSync />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav />
          <main className="flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-8 md:pb-8">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
