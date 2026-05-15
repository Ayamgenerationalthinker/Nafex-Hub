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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Loader2, ShoppingBag, Store, ScrollText, Truck, Package } from "lucide-react";

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

// ── T&C content blocks ───────────────────────────────────────────────────────

const TC_GENERAL = (
  <div className="space-y-5">
    <section>
      <h3 className="font-semibold text-foreground mb-2">1. General Use</h3>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        <li>Users must provide accurate information.</li>
        <li>Buyers and sellers must act honestly and professionally.</li>
        <li>Nafex may suspend accounts involved in fraud, abuse, fake orders, or suspicious activity.</li>
      </ul>
    </section>

    <section>
      <h3 className="font-semibold text-foreground mb-2">7. Prohibited Activities</h3>
      <p className="text-sm text-muted-foreground mb-1">The following are strictly prohibited:</p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        <li>Fraud or scams</li>
        <li>Fake products</li>
        <li>Fake reviews</li>
        <li>Illegal items</li>
        <li>Harassment or abusive behavior</li>
      </ul>
      <p className="text-sm text-muted-foreground mt-1">Violations may result in permanent suspension.</p>
    </section>

    <section>
      <h3 className="font-semibold text-foreground mb-2">8. Privacy</h3>
      <p className="text-sm text-muted-foreground">
        User information will only be used for platform operations, security, payments, and deliveries.
      </p>
    </section>
  </div>
);

const TC_BUYER = (
  <div className="space-y-5">
    <section>
      <h3 className="font-semibold text-foreground mb-2">3. Buyer Responsibilities</h3>
      <p className="text-sm text-muted-foreground mb-1">As a buyer, you agree to:</p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        <li>Provide correct delivery details.</li>
        <li>Avoid fake orders or payment fraud.</li>
        <li>Treat sellers and delivery personnel respectfully.</li>
      </ul>
    </section>

    <section>
      <h3 className="font-semibold text-foreground mb-2">5. Customer Protection</h3>
      <p className="text-sm text-muted-foreground">
        Nafex may investigate complaints and restrict sellers where orders are repeatedly delayed, wrong or fake products
        are delivered, or sellers fail to respond to disputes.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-foreground mb-2">6. Refunds & Disputes</h3>
      <p className="text-sm text-muted-foreground mb-1">Refunds or returns may be approved for:</p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        <li>Undelivered orders</li>
        <li>Wrong items</li>
        <li>Damaged items</li>
        <li>Fraudulent transactions</li>
      </ul>
      <p className="text-sm text-muted-foreground mt-1">Nafex reserves the right to review and decide disputes fairly.</p>
    </section>
  </div>
);

const TC_SELLER = (
  <div className="space-y-5">
    <section>
      <h3 className="font-semibold text-foreground mb-2">2. Seller Responsibilities</h3>
      <p className="text-sm text-muted-foreground mb-1">As a seller, you agree to:</p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        <li>List only genuine and legal products.</li>
        <li>Use accurate descriptions and prices.</li>
        <li>Deliver orders on time.</li>
        <li>Respond professionally to customers.</li>
      </ul>
      <p className="text-sm text-muted-foreground mt-2">
        Repeated complaints, failed deliveries, fake products, or misleading listings may lead to account restrictions,
        payment holds, reduced visibility, or permanent suspension.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-foreground mb-2">4. Delivery Options</h3>
      <p className="text-sm text-muted-foreground">
        Before selling on Nafex, you must choose a delivery method. Where you manage deliveries yourself, you are fully
        responsible for delays, failed deliveries, or customer complaints relating to delivery.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-foreground mb-2">5. Customer Protection</h3>
      <p className="text-sm text-muted-foreground">
        Nafex may investigate complaints and restrict your account where orders are repeatedly delayed, wrong or fake
        products are delivered, buyers report delivery issues, or you fail to respond to disputes.
      </p>
    </section>

    <section>
      <h3 className="font-semibold text-foreground mb-2">6. Refunds & Disputes</h3>
      <p className="text-sm text-muted-foreground mb-1">Refunds or returns may be approved for:</p>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        <li>Undelivered orders</li>
        <li>Wrong items</li>
        <li>Damaged items</li>
        <li>Fraudulent transactions</li>
      </ul>
      <p className="text-sm text-muted-foreground mt-1">Nafex reserves the right to review and decide disputes fairly.</p>
    </section>
  </div>
);

// ── Component ────────────────────────────────────────────────────────────────

export default function Register() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const register = useRegister();
  const [successInfo, setSuccessInfo] = useState<{ name: string; role: string } | null>(null);

  // T&C modal state
  const [showTc, setShowTc] = useState(false);
  const [pendingValues, setPendingValues] = useState<RegisterForm | null>(null);
  const [tcGeneral, setTcGeneral] = useState(false);
  const [tcSuspension, setTcSuspension] = useState(false);
  const [deliveryChoice, setDeliveryChoice] = useState<"self" | "nafex" | null>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: "user" },
  });

  const selectedRole = form.watch("role");
  const isSeller = selectedRole === "business_owner";

  // Step 1: validate form, open T&C modal
  const handleFormSubmit = (values: RegisterForm) => {
    setPendingValues(values);
    setTcGeneral(false);
    setTcSuspension(false);
    setDeliveryChoice(null);
    setShowTc(true);
  };

  // Step 2: user accepted T&C — actually create account
  const canAccept =
    tcGeneral &&
    tcSuspension &&
    (!isSeller || deliveryChoice !== null);

  const handleAccept = () => {
    if (!pendingValues || !canAccept) return;
    register.mutate(
      { data: pendingValues },
      {
        onSuccess: (data) => {
          setShowTc(false);
          setAuth(data.token, data.user as Parameters<typeof setAuth>[1]);
          setSuccessInfo({ name: data.user.name, role: data.user.role });
        },
        onError: (err: unknown) => {
          setShowTc(false);
          form.setError("root", {
            message: (err as { data?: { error?: string } })?.data?.error ?? "Something went wrong. Please try again.",
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

  // ── Success screen ──────────────────────────────────────────────────────
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

  // ── Registration form ───────────────────────────────────────────────────
  return (
    <>
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
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
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
                  className="w-full h-12 text-base font-semibold gap-2"
                  data-testid="btn-register"
                >
                  <ScrollText className="w-4 h-4" />
                  Review Terms & Create Account
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

      {/* ── Terms & Conditions Modal ─────────────────────────────────────── */}
      <Dialog open={showTc} onOpenChange={(open) => { if (!register.isPending) setShowTc(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-serif">
              <ScrollText className="w-5 h-5 text-primary" />
              Nafex Marketplace — Terms &amp; Conditions
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isSeller
                ? "Please read the general terms and seller-specific terms below before creating your account."
                : "Please read the general terms and buyer-specific terms below before creating your account."}
            </p>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8 min-h-0">

            {/* General terms — shown to everyone */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  General — All Users
                </span>
              </div>
              {TC_GENERAL}
            </div>

            <div className="border-t" />

            {/* Role-specific terms */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                {isSeller ? (
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <Store className="w-3 h-3" /> Sellers Only
                  </span>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> Buyers Only
                  </span>
                )}
              </div>
              {isSeller ? TC_SELLER : TC_BUYER}
            </div>

            {/* Delivery choice — sellers only */}
            {isSeller && (
              <>
                <div className="border-t" />
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Section 4 — Choose Your Delivery Method <span className="text-destructive">*</span>
                  </p>
                  <p className="text-xs text-muted-foreground">You must select one before continuing.</p>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        deliveryChoice === "self"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        className="mt-0.5 accent-primary"
                        checked={deliveryChoice === "self"}
                        onChange={() => setDeliveryChoice("self")}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          I will handle my own deliveries
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          You are fully responsible for all delivery logistics, delays, and customer complaints.
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        deliveryChoice === "nafex"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        className="mt-0.5 accent-primary"
                        checked={deliveryChoice === "nafex"}
                        onChange={() => setDeliveryChoice("nafex")}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                          I authorize Nafex to handle all deliveries
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Nafex will coordinate delivery on your behalf. Terms apply.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Acceptance checkboxes */}
            <div className="border-t" />
            <div className="space-y-3 pb-2">
              <p className="text-sm font-semibold text-foreground">Section 9 — Acceptance</p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={tcGeneral}
                  onCheckedChange={(v) => setTcGeneral(!!v)}
                  className="mt-0.5"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  I have read and accepted the Nafex Marketplace Terms &amp; Conditions.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={tcSuspension}
                  onCheckedChange={(v) => setTcSuspension(!!v)}
                  className="mt-0.5"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  I understand that violations may result in account suspension or removal from the platform.
                </span>
              </label>
            </div>
          </div>

          {/* Sticky footer */}
          <div className="px-6 py-4 border-t bg-muted/30 flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {!canAccept
                ? isSeller
                  ? "Check both boxes and select a delivery method to continue."
                  : "Check both boxes above to continue."
                : "You're ready to create your account."}
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setShowTc(false)}
                disabled={register.isPending}
              >
                Go Back
              </Button>
              <Button
                className="flex-1 sm:flex-none gap-2"
                disabled={!canAccept || register.isPending}
                onClick={handleAccept}
              >
                {register.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Accept &amp; Create Account</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
