import { KeyRound, Save, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Button, Card, CardHeader, Field, Input, PageHeader, Textarea, useToast } from "../../components/ui";

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", affiliation: user?.affiliation ?? "", designation: user?.designation ?? "", expertise: user?.expertise ?? "" });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  const save = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { setUser(await api.put("/auth/me", f)); toast("Profile updated"); } catch (e: any) { toast(e.message, "error"); } finally { setSaving(false); }
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault(); setPwSaving(true);
    try { await api.post("/auth/change-password", pw); setPw({ current_password: "", new_password: "" }); toast("Password changed"); }
    catch (e: any) { toast(e.message, "error"); } finally { setPwSaving(false); }
  };
  return (
    <>
      <PageHeader title="My Profile" subtitle="Manage your personal and professional information" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Personal details" icon={<UserRound className="h-4 w-4" />} />
          <form onSubmit={save} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Full name"><Input required minLength={2} value={f.name} onChange={set("name")} /></Field>
            <Field label="Email" hint="Email cannot be changed"><Input value={user?.email ?? ""} disabled /></Field>
            <Field label="Phone"><Input value={f.phone} onChange={set("phone")} placeholder="+91 …" /></Field>
            <Field label="Designation"><Input value={f.designation} onChange={set("designation")} placeholder="Professor, Research Scholar…" /></Field>
            <Field label="Affiliation" className="sm:col-span-2"><Input value={f.affiliation} onChange={set("affiliation")} placeholder="Institution / organisation" /></Field>
            {user?.role === "reviewer" && <Field label="Areas of expertise" className="sm:col-span-2"><Textarea value={f.expertise} onChange={set("expertise")} placeholder="e.g. machine learning, IoT, cyber security" /></Field>}
            <div className="sm:col-span-2"><Button type="submit" loading={saving} icon={<Save className="h-4 w-4" />}>Save changes</Button></div>
          </form>
        </Card>
        <Card>
          <CardHeader title="Change password" icon={<KeyRound className="h-4 w-4" />} />
          <form onSubmit={changePw} className="space-y-4 p-5">
            <Field label="Current password"><Input type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} autoComplete="current-password" /></Field>
            <Field label="New password" hint="8+ characters with letters and numbers"><Input type="password" required minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" /></Field>
            <Button type="submit" loading={pwSaving} variant="secondary">Update password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
