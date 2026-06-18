import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, Globe, Mail, Settings, Loader2, Save } from "lucide-react";
import { invalidateSettingsCache } from "@/hooks/use-site-settings";

type ContactSettings = { whatsappNumber: string; instagramLink: string; facebookLink: string; email: string };

const FIELDS: { key: keyof ContactSettings; label: string; placeholder: string; icon: React.ElementType; iconColor: string; type?: string }[] = [
  { key: "whatsappNumber", label: "WhatsApp Number", placeholder: "+233 24 000 0000", icon: Phone, iconColor: "text-green-600", type: "tel" },
  { key: "instagramLink", label: "Instagram Link", placeholder: "https://instagram.com/nafexhub", icon: Globe, iconColor: "text-pink-500" },
  { key: "facebookLink", label: "Facebook Link", placeholder: "https://facebook.com/nafexhub", icon: Globe, iconColor: "text-blue-500" },
  { key: "email", label: "Contact Email", placeholder: "hello@nafexhub.com", icon: Mail, iconColor: "text-primary", type: "email" },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ContactSettings>({ whatsappNumber: "", instagramLink: "", facebookLink: "", email: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : {})
      .then((s: Record<string, string>) => {
        setSettings({
          whatsappNumber: s.whatsappNumber ?? "",
          instagramLink: s.instagramLink ?? "",
          facebookLink: s.facebookLink ?? "",
          email: s.email ?? "",
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem("nafex_token") ?? "";
    setSaving(true);
    try {
      await Promise.all(
        (Object.entries(settings) as [string, string][]).map(([key, value]) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ key, value: value || " " }),
          })
        )
      );
      invalidateSettingsCache();
      toast({ title: "Settings saved successfully" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-xl font-bold text-foreground">Site Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage contact details shown on your site</p>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-foreground">Contact &amp; Social Links</h3>
          </div>
          <div className="p-6 space-y-5">
            <p className="text-sm text-muted-foreground">These values appear in the site footer. Leave blank to hide an icon.</p>

            {!loaded ? (
              <div className="space-y-4">
                {FIELDS.map(f => <div key={f.key} className="h-11 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {FIELDS.map(({ key, label, placeholder, icon: Icon, iconColor, type }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                      {label}
                    </label>
                    <Input
                      type={type ?? "text"}
                      placeholder={placeholder}
                      value={settings[key]}
                      onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving || !loaded} className="gap-2 h-11 px-6">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
