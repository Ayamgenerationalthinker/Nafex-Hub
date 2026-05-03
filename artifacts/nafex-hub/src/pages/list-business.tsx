import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBusiness, getGetBusinessesQueryKey, getGetFeaturedBusinessesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store } from "lucide-react";

const listBusinessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  category: z.enum(["Clothing", "Footwear", "Accessories"]),
  description: z.string().min(20, "Description must be at least 20 characters"),
  location: z.string().min(2, "Location is required"),
  phone: z.string().min(8, "Please enter a valid phone number"),
  logo: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type ListBusinessForm = z.infer<typeof listBusinessSchema>;

export default function ListBusiness() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createBusiness = useCreateBusiness();

  const form = useForm<ListBusinessForm>({
    resolver: zodResolver(listBusinessSchema),
    defaultValues: {
      name: "",
      category: "Clothing",
      description: "",
      location: "",
      phone: "",
      logo: "",
    },
  });

  const onSubmit = (values: ListBusinessForm) => {
    createBusiness.mutate(
      {
        data: {
          ...values,
          logo: values.logo || null,
          images: [],
        },
      },
      {
        onSuccess: (business) => {
          queryClient.invalidateQueries({ queryKey: getGetBusinessesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFeaturedBusinessesQueryKey() });
          toast({
            title: "Business listed successfully!",
            description: `${business.name} is now on Nafex Hub.`,
          });
          setLocation(`/brand/${business.id}`);
        },
        onError: (err: any) => {
          toast({
            title: "Failed to list business",
            description: err?.data?.error ?? "Something went wrong",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-secondary/20 border-b py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center space-y-4">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary items-center justify-center shadow-lg mx-auto">
            <Store className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">List Your Business</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Join Ghana's premier fashion marketplace and reach thousands of customers across the country.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="bg-card rounded-2xl border shadow-sm p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Kente Palace" {...field} data-testid="input-name" className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12" data-testid="select-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Clothing">Clothing</SelectItem>
                          <SelectItem value="Footwear">Footwear</SelectItem>
                          <SelectItem value="Accessories">Accessories</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your business, products, and what makes you unique..."
                        {...field}
                        data-testid="input-description"
                        className="min-h-[120px] resize-none"
                      />
                    </FormControl>
                    <FormDescription>At least 20 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Accra, Ghana" {...field} data-testid="input-location" className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (WhatsApp)</FormLabel>
                      <FormControl>
                        <Input placeholder="+233 24 000 0000" {...field} data-testid="input-phone" className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/logo.png" {...field} data-testid="input-logo" className="h-12" />
                    </FormControl>
                    <FormDescription>Direct link to your business logo image</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={createBusiness.isPending}
                data-testid="btn-submit"
              >
                {createBusiness.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  "List My Business"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
