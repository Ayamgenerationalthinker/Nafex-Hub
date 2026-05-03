import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-xl">
              N
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-foreground">
              Nafex Hub
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/explore"
              className={`text-sm font-medium transition-colors hover:text-primary ${location === '/explore' ? 'text-primary' : 'text-muted-foreground'}`}
              data-testid="nav-explore"
            >
              Explore Brands
            </Link>
            {user ? (
              <>
                <Link
                  href="/list"
                  className={`text-sm font-medium transition-colors hover:text-primary ${location === '/list' ? 'text-primary' : 'text-muted-foreground'}`}
                  data-testid="nav-list"
                >
                  List Business
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className={`text-sm font-medium transition-colors hover:text-primary ${location === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}
                    data-testid="nav-admin"
                  >
                    Admin
                  </Link>
                )}
                <Button variant="ghost" onClick={logout} data-testid="btn-logout">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  data-testid="nav-login"
                >
                  Login
                </Link>
                <Link href="/register">
                  <Button data-testid="nav-register">Join Nafex</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-sm">
              N
            </div>
            <span className="font-serif font-bold text-lg text-foreground">Nafex Hub</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Ghana's premier digital fashion marketplace.
          </p>
        </div>
      </footer>
    </div>
  );
}
