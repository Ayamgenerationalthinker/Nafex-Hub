import { useState } from "react";
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
import { ImageUpload } from "@/components/image-upload";
import { Loader2, Store } from "lucide-react";

export const ALL_CATEGORIES = [
  // Fashion & Style
  "Clothing",
  "Footwear",
  "Accessories",
  "Jewelry & Watches",
  "Bags & Luggage",
  "Fabric & Textiles",
  // Food & Beverages
  "Food & Drinks",
  "Groceries & Supermarket",
  "Restaurants & Chop Bars",
  "Catering & Events Food",
  "Beverages & Drinks",
  "Bakery & Pastries",
  "Farm Produce",
  // Electronics & Tech
  "Electronics",
  "Phones & Gadgets",
  "Computers & Laptops",
  "Home Appliances",
  "Solar & Power",
  // Home & Living
  "Furniture",
  "Home Decor",
  "Bedding & Bath",
  "Kitchen & Cookware",
  "Building Materials",
  // Health & Beauty
  "Beauty & Skincare",
  "Hair & Wigs",
  "Health & Wellness",
  "Pharmacy & Medicine",
  "Gym & Fitness Equipment",
  // Services
  "Cleaning Services",
  "Laundry & Dry Cleaning",
  "Construction & Repairs",
  "Photography & Videography",
  "Event Planning",
  "Printing & Branding",
  "Transport & Logistics",
  "Security Services",
  // Automotive
  "Cars & Vehicles",
  "Auto Parts & Accessories",
  "Car Wash & Repairs",
  // Education
  "Tutoring & Lessons",
  "Books & Stationery",
  "Training & Courses",
  // Kids & Baby
  "Baby & Kids",
  "Toys & Games",
  "School Supplies",
  // Sports & Outdoors
  "Sports & Fitness",
  "Outdoor & Adventure",
  // Agriculture
  "Agriculture & Farming",
  "Livestock & Poultry",
  // Arts & Entertainment
  "Crafts & Handmade",
  "Art & Collectibles",
  "Music & Instruments",
  "Gaming & Consoles",
  // Travel & Real Estate
  "Travel & Tours",
  "Property & Real Estate",
  // Finance & Other
  "Financial Services",
  "Insurance",
  "Other",
] as const;

export type BusinessCategory = (typeof ALL_CATEGORIES)[number];

const listBusinessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  category: z.enum(ALL_CATEGORIES),
  description: z.string().min(20, "Description must be at least 20 characters"),
  location: z.string().min(2, "Location is required"),
  phone: z.string().min(8, "Please enter a valid phone number"),
});

type ListBusinessForm = z.infer<typeof listBusinessSchema>;

export default function ListBusiness() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createBusiness = useCreateBusiness();
  const [logoImages, setLogoImages] = useState<string[]>([]);
  const [bannerImages, setBannerImages] = useState<string[]>([]);

  const form = useForm<ListBusinessForm>({
    resolver: zodResolver(listBusinessSchema),
    defaultValues: {
      name: "",
      category: "Clothing",
      description: "",
      location: "",
      phone: "",
    },
  });

  const onSubmit = (values: ListBusinessForm) => {
    createBusiness.mutate(
      {
        data: {
          ...values,
          logo: logoImages[0] ?? null,
          images: bannerImages,
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
      <div className="bg-secondary/20 border-b py-12 px-4">
        <div className="container mx-auto max-w-3xl text-center space-y-4">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary items-center justify-center shadow-lg mx-auto">
            <Store className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">List Your Business</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Join Nafex Hub and reach thousands of customers across Ghana — whatever you sell.
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
                        <Input placeholder="e.g. Kente Palace" {...field} className="h-12" />
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
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72">
                          {ALL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
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
                        <Input placeholder="e.g. Accra, Ghana" {...field} className="h-12" />
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
                        <Input placeholder="+233 24 000 0000" {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Logo Upload */}
              <ImageUpload
                value={logoImages}
                onChange={setLogoImages}
                maxImages={1}
                label="Business Logo (optional)"
              />

              {/* Banner/Store Images Upload */}
              <ImageUpload
                value={bannerImages}
                onChange={setBannerImages}
                maxImages={5}
                label="Store Images (optional) — shown on your brand page"
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={createBusiness.isPending}
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
