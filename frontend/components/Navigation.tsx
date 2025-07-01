"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, BarChart3, Settings, FileJson, FlaskConical, History } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2 font-semibold hover:opacity-90 transition-opacity">
            <img 
              src="/favicon.ico" 
              alt="LLM-Bench Logo" 
              width={36} 
              height={36}
              className="rounded"
            />
            <span>LLM-Bench</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === "/" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </Link>
            <Link
              href="/benchmark"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === "/benchmark" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Benchmark</span>
            </Link>
            <Link
              href="/testset"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === "/testset" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <FileJson className="h-4 w-4" />
              <span>Test Set</span>
            </Link>
            <Link
              href="/history"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === "/history" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </Link>
            <Link
              href="/settings"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === "/settings" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            <Link
              href="/test-api"
              className={cn(
                "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                pathname === "/test-api" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <FlaskConical className="h-4 w-4" />
              <span>Test API</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}