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
import { User, KeyRound, Trash2, ShieldAlert, Store, ArrowRight, Wallet, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useGetDashboardStats } from "@workspace/api-client-react";

export default function SellerSettings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: stats } = useGetDashboardStats();
  const businessId = (stats as { businessId?: number } | undefined)?.businessId;

  const [payoutType, setPayoutType] = useState<"momo" | "nuban">("momo");
  const [payoutName, setPayoutName] = useState("");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutBankCode, setPayoutBankCode] = useState("MTN"); // Default MTN
  const [savingPayout, setSavingPayout] = useState(false);

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
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({ title: "Password changed", description: "Your password has been updated successfully." });
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
        toast({ title: "Account deleted", description: "Your account has been permanently removed." });
        logout();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
      },
    },
  });

  function handleProfileSave() {
    if (!name.trim()) return;
    updateProfile({ data: { name: name.trim() } });
  }

  function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters", variant: "destructive" });
      return;
    }
    changePassword({ data: { currentPassword, newPassword } });
  }

  function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    deleteAccount();
  }

  async function handleSavePayout() {
    if (!businessId) return;
    if (!payoutName.trim() || !payoutAccount.trim() || !payoutBankCode.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setSavingPayout(true);
    try {
      const token = localStorage.getItem("nafex_token");
      const res = await fetch(`/api/businesses/${businessId}/settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: payoutType,
          name: payoutName.trim(),
          account_number: payoutAccount.trim(),
          bank_code: payoutBankCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save payout settings");
      toast({ title: "Payout Settings Saved", description: "Your account has been linked successfully." });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingPayout(false);
    }
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal details, security, and account preferences.</p>
      </div>

      <div className="mb-6">
        <Link href="/my-shop">
          <Button variant="outline" className="gap-2">
            <Store className="w-4 h-4" />
            View My Shop
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="mb-6">
          <TabsTrigger value="personal" className="gap-2">
            <User className="w-4 h-4" /> Personal Details
          </TabsTrigger>
          {businessId && (
            <TabsTrigger value="payouts" className="gap-2">
              <Wallet className="w-4 h-4" /> Payout Settings
            </TabsTrigger>
          )}
          <TabsTrigger value="security" className="gap-2">
            <KeyRound className="w-4 h-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2">
            <ShieldAlert className="w-4 h-4" /> Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* ── Personal Details ── */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>Update your display name. Your email address cannot be changed here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">{(user?.name ?? "?").charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium capitalize">{user?.role?.replace("_", " ")}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">{name.length}/100 characters</p>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email ?? ""} disabled className="bg-muted/50 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Email cannot be changed from this page.</p>
              </div>

              <Button onClick={handleProfileSave} disabled={updatingProfile || !name.trim() || name === user?.name}>
                {updatingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payout Settings ── */}
        {businessId && (
          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Automated Payouts</CardTitle>
                <CardDescription>Link your Mobile Money or Bank Account to receive instant payouts when buyers confirm delivery.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <select
                      value={payoutType}
                      onChange={(e) => setPayoutType(e.target.value as "momo" | "nuban")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="momo">Mobile Money</option>
                      <option value="nuban">Bank Account</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Network / Bank Code</Label>
                    {payoutType === "momo" ? (
                      <select
                        value={payoutBankCode}
                        onChange={(e) => setPayoutBankCode(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="MTN">MTN Momo</option>
                        <option value="VOD">Vodafone Cash</option>
                        <option value="ATL">AirtelTigo Money</option>
                      </select>
                    ) : (
                      <Input
                        value={payoutBankCode}
                        onChange={(e) => setPayoutBankCode(e.target.value)}
                        placeholder="e.g. 044 (Access Bank)"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    value={payoutName}
                    onChange={(e) => setPayoutName(e.target.value)}
                    placeholder="Exact name registered on the account"
                  />
                  <p className="text-xs text-muted-foreground">Must match the registered name exactly or transfers will fail.</p>
                </div>

                <div className="space-y-2">
                  <Label>Account Number / Momo Number</Label>
                  <Input
                    value={payoutAccount}
                    onChange={(e) => setPayoutAccount(e.target.value)}
                    placeholder="e.g. 0541234567"
                  />
                </div>

                <Button onClick={handleSavePayout} disabled={savingPayout} className="w-full sm:w-auto">
                  {savingPayout ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Payout Details"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Security ── */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Choose a strong password. Must be at least 8 characters with an uppercase letter and a number.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Danger Zone ── */}
        <TabsContent value="danger">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Account Permanently
              </CardTitle>
              <CardDescription>
                Once you delete your account, all your business listings, products, orders, and messages will be permanently removed. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account Forever</DialogTitle>
            <DialogDescription>
              This will permanently delete your Nafex Hub account, including all your business data, products, and order history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium">Type <strong>DELETE</strong> to confirm:</p>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE here"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "DELETE" || deletingAccount}
            >
              {deletingAccount ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
