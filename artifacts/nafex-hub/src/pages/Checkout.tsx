// src/pages/Checkout.tsx
import { useCart } from "@/hooks/use-cart";
import { useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Checkout() {
  const { clear } = useCart();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for Stripe integration – simply show success.
    toast.success("Order placed successfully! 🎉");
    clear();
    setLocation("/");
  };

  return (
    <div className="max-w-xl mx-auto p-6 glass shadow-lg rounded-lg mt-8">
      <h1 className="text-2xl font-bold mb-4 text-center">Checkout</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <Input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <Input
          name="address"
          placeholder="Shipping Address"
          value={form.address}
          onChange={handleChange}
          required
        />
        {/* Placeholder Stripe button */}
        <Button type="submit" className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary transition-colors">
          Pay with Stripe (demo)
        </Button>
      </form>
    </div>
  );
}
