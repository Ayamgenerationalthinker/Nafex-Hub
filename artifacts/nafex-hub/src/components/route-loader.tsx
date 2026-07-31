import { Loader2 } from "lucide-react";

export function RouteLoader() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading Nafex Hub...</p>
    </div>
  );
}
