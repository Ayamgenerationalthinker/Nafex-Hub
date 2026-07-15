import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, ShoppingBag, Store, Eye, EyeOff, ChevronLeft } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["user", "business_owner"]).default("user"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const register = useRegister();
  const [successInfo, setSuccessInfo] = useState<{ name: string; role: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "user", termsAccepted: false },
  });

  const onSubmit = (values: RegisterForm) => {
    // We don't send termsAccepted to the backend usually, just the required fields
    const { termsAccepted, ...dataToSend } = values;
    
    register.mutate(
      { data: dataToSend as any },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.user as any);
          setSuccessInfo({ name: data.user.name, role: data.user.role });
        },
        onError: (err: any) => {
          form.setError("root", {
            message: err?.data?.error ?? "Something went wrong. Please try again.",
          });
        },
      }
    );
  };

  const handleContinue = () => {
    // Every new account MUST verify email before anything else.
    setLocation("/verify-email");
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} registration is currently being configured. Please use email.`,
    });
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (successInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold text-foreground">You're in, {successInfo.name.split(" ")[0]}!</h1>
            <p className="text-muted-foreground">
              {successInfo.role === "business_owner"
                ? "Your business owner account is ready. List your business to start selling on Nafex Hub."
                : "Your account is ready. Start exploring Ghana's best fashion brands."}
            </p>
          </div>
          <div className="bg-card rounded-2xl border p-6 space-y-3 text-left shadow-sm">
            <p className="text-sm font-semibold text-foreground">What's next?</p>
            {successInfo.role === "business_owner" ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Store className="w-4 h-4 text-primary flex-shrink-0" /> List your business and add products</li>
                <li className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary flex-shrink-0" /> Manage orders from your dashboard</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> Get verified for a trust badge</li>
              </ul>
            ) : (
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Store className="w-4 h-4 text-primary flex-shrink-0" /> Discover verified fashion brands</li>
                <li className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary flex-shrink-0" /> Browse deals and discounted products</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> Message sellers and place orders</li>
              </ul>
            )}
          </div>
          <Button className="w-full h-12 text-base font-semibold shadow-lg rounded-xl" onClick={handleContinue}>
            {successInfo.role === "business_owner" ? "List My Business" : "Explore Brands"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-background">
      {/* ── Left Side: Brand Imagery (Desktop Only) ── */}
      <div className="hidden lg:flex flex-col justify-center bg-[#1A1A1A] text-white p-12 lg:p-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/30 to-transparent opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/20 blur-3xl rounded-full" />
        
        <div className="relative z-10 max-w-xl">
          <Link href="/" className="inline-flex w-16 h-16 rounded-2xl bg-primary items-center justify-center text-primary-foreground font-serif font-bold text-4xl shadow-2xl mb-12 hover:scale-105 transition-transform cursor-pointer">
            N
          </Link>
          <h1 className="text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight">
            Join Ghana's premier <span className="text-primary">marketplace</span>.
          </h1>
          <p className="text-xl text-gray-300 font-medium max-w-md">
            Whether you want to shop the best fashion or grow your business, Nafex Hub is the place to be.
          </p>

          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Shop with confidence</h3>
                <p className="text-sm text-gray-400">Verified sellers and secure payments.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Grow your business</h3>
                <p className="text-sm text-gray-400">Reach thousands of buyers across Ghana.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Side: Registration Form ── */}
      <div className="flex flex-col lg:items-center lg:justify-center p-4 sm:p-12 lg:p-24 relative overflow-y-auto min-h-screen bg-slate-50/50 lg:bg-background">
        {/* Mobile App Header (Top bar) */}
        <div className="flex items-center justify-between py-4 lg:hidden border-b border-gray-100 bg-white px-4 -mx-4 -mt-4 mb-6 sticky top-0 z-30 w-screen">
          <Link href="/" className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-xs font-semibold">Back</span>
          </Link>
          <span className="font-serif font-bold text-base text-foreground">Sign Up</span>
          <div className="w-10"></div> {/* Spacer to center title */}
        </div>

        <div className="w-full max-w-md bg-white lg:bg-transparent rounded-3xl p-6 sm:p-0 shadow-sm border border-gray-100/80 lg:border-0 lg:shadow-none space-y-6">
          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="font-serif text-2xl lg:text-3xl font-bold tracking-tight">Create an account</h2>
            <p className="text-muted-foreground text-sm font-medium">
              Join thousands of users on Nafex Hub
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-12 border-gray-200 shadow-sm rounded-xl" onClick={() => handleSocialLogin("Google")}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="h-12 border-gray-200 shadow-sm rounded-xl" onClick={() => handleSocialLogin("Apple")}>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 384 512">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" fill="currentColor"/>
                </svg>
                Apple
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white lg:bg-background px-4 text-muted-foreground font-medium">Or register with email</span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                
                {/* Role Selection via large cards */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-semibold text-foreground">I want to...</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <label className={`relative flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${field.value === 'user' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" value="user" checked={field.value === 'user'} onChange={() => field.onChange('user')} className="sr-only" />
                          <ShoppingBag className={`w-6 h-6 mb-2 ${field.value === 'user' ? 'text-primary' : 'text-gray-400'}`} />
                          <span className={`font-semibold text-sm ${field.value === 'user' ? 'text-primary' : 'text-gray-600'}`}>Shop</span>
                        </label>
                        <label className={`relative flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${field.value === 'business_owner' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" value="business_owner" checked={field.value === 'business_owner'} onChange={() => field.onChange('business_owner')} className="sr-only" />
                          <Store className={`w-6 h-6 mb-2 ${field.value === 'business_owner' ? 'text-primary' : 'text-gray-400'}`} />
                          <span className={`font-semibold text-sm ${field.value === 'business_owner' ? 'text-primary' : 'text-gray-600'}`}>Sell</span>
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Kofi Mensah" {...field} data-testid="input-name" className="h-12 bg-muted/50 border-gray-200 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Email address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" className="h-12 bg-muted/50 border-gray-200 rounded-xl" />
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
                      <FormLabel className="font-semibold">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Min 8 chars, 1 uppercase, 1 number"
                            {...field}
                            data-testid="input-password"
                            className="h-12 bg-muted/50 border-gray-200 pr-10 rounded-xl"
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

                <FormField
                  control={form.control}
                  name="termsAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md py-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium text-muted-foreground">
                          I agree to the{" "}
                          <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <p className="text-sm text-destructive font-medium">{form.formState.errors.root.message}</p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow rounded-xl"
                  disabled={register.isPending}
                  data-testid="btn-register"
                >
                  {register.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating account...</>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <p className="text-center text-sm font-medium text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
