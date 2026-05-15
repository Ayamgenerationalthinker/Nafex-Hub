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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, ShoppingBag, Store } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["user", "business_owner"]).default("user"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const register = useRegister();
  const [successInfo, setSuccessInfo] = useState<{ name: string; role: string } | null>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

  const onSubmit = (values: RegisterForm) => {
    register.mutate(
      { data: values },
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
    if (successInfo?.role === "business_owner") {
      setLocation("/list");
    } else {
      setLocation("/explore");
    }
  };

  if (successInfo) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
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
          <div className="bg-card rounded-2xl border p-6 space-y-3 text-left">
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
          <Button className="w-full h-12 text-base font-semibold" onClick={handleContinue}>
            {successInfo.role === "business_owner" ? "List My Business" : "Explore Brands"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary items-center justify-center text-primary-foreground font-serif font-bold text-3xl shadow-lg mx-auto">
            N
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Join Nafex Hub</h1>
          <p className="text-muted-foreground">Ghana's premier fashion marketplace</p>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-8 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Kofi Mensah" {...field} data-testid="input-name" className="h-12" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" className="h-12" />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="At least 6 characters" {...field} data-testid="input-password" className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>I want to</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12" data-testid="select-role">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">Shop — I want to buy</div>
                              <div className="text-xs text-muted-foreground">Browse brands, place orders, get deals</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="business_owner">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">Sell — I have a business</div>
                              <div className="text-xs text-muted-foreground">List products, manage orders, grow sales</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <p className="text-sm text-destructive text-center">{form.formState.errors.root.message}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={register.isPending}
                data-testid="btn-register"
              >
                {register.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
