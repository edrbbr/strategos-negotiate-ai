import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Bell, MoreVertical } from "lucide-react";

export const AppLayout = () => {
  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <header className="hidden lg:flex items-center justify-end gap-4 px-10 py-6">
          <button className="w-9 h-9 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
            <Bell className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button className="w-9 h-9 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
            <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </header>
        <div className="px-6 lg:px-10 pb-16">
          <Outlet />
        </div>
        <footer className="px-10 py-6 flex items-center justify-between text-[10px] font-sans uppercase tracking-[0.2em] text-muted-foreground/50 border-t border-border/20">
          <span>Strategos Internal // V.2.0.4-Gold</span>
          <span>Encrypted Status: Active · System: Optimized</span>
        </footer>
      </main>
    </div>
  );
};
