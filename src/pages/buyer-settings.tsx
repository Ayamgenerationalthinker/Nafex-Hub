import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile, useChangePassword, useDeleteAccount } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, KeyRound, Trash2, ShieldAlert, ShoppingBag, Heart, MessageCircle } from "lucide-react";
import { Link } from "wouter";

export default function BuyerSettings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { mutate: updateProfile, isPending: updatingProfile } = useUpdateProfile({
    mutation: {
      onSuccess: (data) => {
        const stored = localStorage.getItem("nafex_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            localStorage.setItem("nafex_user", JSON.stringify({ ...parsed, name: data.name }));
          } catch {}
        }
        toast({ title: "Profile updated", description: "Your name has been saved." });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to update profile";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const { mutate: changePassword, isPending: changingPassword } = useChangePassword({
    mutation: {
      onSuccess: () => {
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        toast({ title: "Password changed", description: "Your password has been updated." });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to change password";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const { mutate: deleteAccount, isPending: deletingAccount } = useDeleteAccount({
    mutation: {
      onSuccess: () => {
        toast({ title: "Account deleted" });
        logout();
      },
      onError: () => toast({ title: "Error", description: "Failed to delete account", variant: "destructive" }),
    },
  });

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">My Account</h1>
        <p className="text-muted-foreground mt-1">Manage your profile, security, and account preferences.</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { href: "/orders", icon: <ShoppingBag className="w-5 h-5" />, label: "Orders" },
          { href: "/favorites", icon: <Heart className="w-5 h-5" />, label: "Wishlist" },
          { href: "/inbox", icon: <MessageCircle className="w-5 h-5" />, label: "Inbox" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer text-center">
              <span className="text-primary">{item.icon}</span>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="mb-6">
          <TabsTrigger value="personal" className="gap-2">
            <User className="w-4 h-4" /> Personal Details
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <KeyRound className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2">
            <ShieldAlert className="w-4 h-4" /> Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Update your display name. Your email address cannot be changed here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{(user?.name ?? "?").charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Buyer</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" maxLength={100} />
                <p className="text-xs text-muted-foreground">{name.length}/100</p>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email ?? ""} disabled className="bg-muted/50 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <Button onClick={() => updateProfile({ data: { name: name.trim() } })} disabled={updatingProfile || !name.trim() || name === user?.name}>
                {updatingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>At least 8 characters, one uppercase letter, and one number.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
              <Button
                onClick={() => {
                  if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
                  changePassword({ data: { currentPassword, newPassword } });
                }}
                disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Delete Account Permanently
              </CardTitle>
              <CardDescription>All your orders, messages, and favorites will be permanently removed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="gap-2">
                <Trash2 className="w-4 h-4" /> Delete My Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account Forever</DialogTitle>
            <DialogDescription>All your data will be permanently removed. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium">Type <strong>DELETE</strong> to confirm:</p>
            <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE here" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteAccount()} disabled={deleteConfirm !== "DELETE" || deletingAccount}>
              {deletingAccount ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
