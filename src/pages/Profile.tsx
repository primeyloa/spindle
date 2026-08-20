import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../lib/store";
import { User, Save, LogOut, AlertCircle, Sparkles } from "lucide-react";

interface ProfileData {
  username: string;
  display_name: string;
  bio: string;
  technical_level: string | null;
  preferred_os: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData>({
    username: "",
    display_name: "",
    bio: "",
    technical_level: null,
    preferred_os: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/sign-in");
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();

    if (!error && data) {
      setProfile({
        username: data.username || "",
        display_name: data.display_name || "",
        bio: data.bio || "",
        technical_level: data.technical_level,
        preferred_os: data.preferred_os,
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({
        id: user!.id,
        ...profile,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/sign-in");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto h-full overflow-y-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-semibold">Profile Settings</h1>
          <p className="text-sm text-text-muted">Manage your Spindle account</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 mb-4 rounded-lg bg-accent/10 border border-accent/20 text-sm text-accent">
          Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="card">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            Personal Info
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="label block mb-1.5">
                Username
              </label>
              <input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                className="input"
                placeholder="username"
              />
            </div>
            <div>
              <label htmlFor="displayName" className="label block mb-1.5">
                Display Name
              </label>
              <input
                id="displayName"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                className="input"
                placeholder="Your display name"
              />
            </div>
            <div>
              <label htmlFor="bio" className="label block mb-1.5">
                Bio
              </label>
              <textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="input min-h-[80px] resize-none"
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="technicalLevel" className="label block mb-1.5">
                Technical Level
              </label>
              <select
                id="technicalLevel"
                value={profile.technical_level || ""}
                onChange={(e) => setProfile({ ...profile, technical_level: e.target.value || null })}
                className="input"
              >
                <option value="">Not specified</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label htmlFor="preferredOs" className="label block mb-1.5">
                Preferred OS
              </label>
              <select
                id="preferredOs"
                value={profile.preferred_os || ""}
                onChange={(e) => setProfile({ ...profile, preferred_os: e.target.value || null })}
                className="input"
              >
                <option value="">Not specified</option>
                <option value="macos">macOS</option>
                <option value="windows">Windows</option>
                <option value="linux">Linux</option>
                <option value="web">Web</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={handleSignOut} className="btn-destructive">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </form>
    </div>
  );
}