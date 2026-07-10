import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Github } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginForm) => {
    login.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.user as any);
          toast({ title: "Welcome back!", description: `Logged in as ${data.user.name}` });
          setLocation("/");
        },
        onError: (err: any) => {
          toast({
            title: "Login failed",
            description: err?.data?.error ?? "Invalid credentials",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} login is currently being configured. Please use email/password.`,
    });
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-background">
      {/* ── Left Side: Brand Imagery (Desktop Only) ── */}
      <div className="hidden lg:flex flex-col justify-center bg-[#1A1A1A] text-white p-12 lg:p-24 relative overflow-hidden">
        {/* Subtle background glow/gradient */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/30 to-transparent opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
        
        <div className="relative z-10 max-w-xl">
          <Link href="/" className="inline-flex w-16 h-16 rounded-2xl bg-primary items-center justify-center text-primary-foreground font-serif font-bold text-4xl shadow-2xl mb-12 hover:scale-105 transition-transform cursor-pointer">
            N
          </Link>
          <h1 className="text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight">
            Welcome back to <span className="text-primary">Nafex Hub</span>.
          </h1>
          <p className="text-xl text-gray-300 font-medium max-w-md">
            Ghana's premium marketplace. Discover verified brands, exclusive deals, and safe transactions.
          </p>

          {/* Trust Badges / Social Proof */}
          <div className="mt-16 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#1A1A1A] bg-gray-600 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=e2e8f0`} alt="User" />
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-400 font-medium">
              <span className="text-white font-bold">10,000+</span> users trust us
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Side: Login Form ── */}
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-24 relative">
        {/* Mobile Logo */}
        <div className="absolute top-8 left-6 lg:hidden">
          <Link href="/" className="inline-flex w-10 h-10 rounded-xl bg-primary items-center justify-center text-primary-foreground font-serif font-bold text-xl shadow-lg">
            N
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8 mt-12 lg:mt-0">
          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-bold tracking-tight">Sign In</h2>
            <p className="text-muted-foreground font-medium">
              Enter your credentials to access your account
            </p>
          </div>

          <div className="space-y-6">
            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-12 border-gray-300 shadow-sm" onClick={() => handleSocialLogin("Google")}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="h-12 border-gray-300 shadow-sm" onClick={() => handleSocialLogin("Apple")}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 384 512">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" fill="currentColor"/>
                </svg>
                Apple
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground font-medium">Or continue with email</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Email address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                          data-testid="input-email"
                          className="h-12 bg-muted/50 border-gray-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="font-semibold">Password</FormLabel>
                        <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-password"
                            className="h-12 bg-muted/50 border-gray-200 pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  disabled={login.isPending}
                  data-testid="btn-login"
                >
                  {login.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Signing in...</>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-center text-sm font-medium text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline" data-testid="link-register">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
