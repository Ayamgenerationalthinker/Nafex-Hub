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
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["user", "business_owner"]).default("user"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const register = useRegister();

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
          toast({ title: "Account created!", description: `Welcome to Nafex Hub, ${data.user.name}!` });
          setLocation("/");
        },
        onError: (err: any) => {
          toast({
            title: "Registration failed",
            description: err?.data?.error ?? "Something went wrong",
            variant: "destructive",
          });
        },
      }
    );
  };

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
                      <Input type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" {...field} data-testid="input-password" className="h-12" />
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
                    <FormLabel>Account Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12" data-testid="select-role">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">Shopper</SelectItem>
                        <SelectItem value="business_owner">Business Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
