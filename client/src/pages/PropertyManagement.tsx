import { useState, useEffect, useRef, CSSProperties } from "react";

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (d: any) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const cur = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN");
const today = () => new Date().toISOString().split("T")[0];
const mDiff = (a: string, b: string) => { const da = new Date(a), db = new Date(b); return (db.getFullYear() - da.getFullYear()) * 12 + db.getMonth() - da.getMonth(); };

const SK = "pm-v7";
const loadDB = () => { try { return JSON.parse(localStorage.getItem(SK) || "") || null; } catch { return null; } };
const freshDB = () => ({
  users: [
    { id: "a1", name: "Admin", pin: "1234", role: "admin" },
    { id: "m1", name: "Manager", pin: "5678", role: "manager" },
    { id: "v1", name: "Viewer", pin: "0000", role: "viewer" },
  ],
  townships: [], properties: [], tenants: [], payments: [], expenditures: [], trash: [],
  docCats: ["Property Tax", "Light Bill", "Gas Bill", "Property Card", "Sale Deed", "Rent Agreement", "Registry", "Dastavej", "NOC", "Other"],
});

const PERMS = {
  admin: { c: 1, e: 1, d: 1, r: 1, pay: 1, rpt: 1, usr: 1, stl: 1 },
  manager: { c: 1, e: 1, d: 0, r: 0, pay: 1, rpt: 1, usr: 0, stl: 1 },
  viewer: { c: 0, e: 0, d: 0, r: 0, pay: 0, rpt: 1, usr: 0, stl: 0 },
};

function calcRent(t: any, yr: number, mo: number) {
  if (!t || !t.monthlyRent) return 0;
  const base = Number(t.monthlyRent);
  const start = new Date(t.startDate);
  const target = new Date(yr, mo, 1);
  if (target < start) return 0;
  const incMo = Number(t.incrementEveryMonths) || 12;
  const incPct = Number(t.incrementPercent) || 0;
  const total = mDiff(t.startDate, target.toISOString().split("T")[0]);
  return Math.round(base * Math.pow(1 + incPct / 100, Math.floor(total / incMo)));
}

function getLedger(t: any, payments: any[]) {
  if (!t) return { due: 0, paid: 0, bal: 0 };
  const start = new Date(t.startDate);
  const now = new Date();
  const end = t.endDate ? new Date(t.endDate) : now;
  const eff = end < now ? end : now;
  let due = 0;
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= eff) {
    due += calcRent(t, d.getFullYear(), d.getMonth());
    d.setMonth(d.getMonth() + 1);
  }
  const paid = payments.filter((p: any) => p.tenantId === t.id).reduce((s: number, p: any) => s + Number(p.amount), 0);
  return { due, paid, bal: due - paid };
}

const C = {
  bg: "#080d16", card: "#0f1624", border: "#1a2232", accent: "#d4a928",
  text: "#d0d8e4", muted: "#7a899c", dim: "#567",
  green: "#5de0a8", red: "#f09090", yellow: "#f0d060", blue: "#80b8f0",
  greenBg: "#0a3d2e", redBg: "#5c1a1a", yellowBg: "#5c3a0a", blueBg: "#1a2d4a",
  input: "#0a0f18", inputBorder: "#263040", btnBg: "#141c2c",
};

const S: Record<string, CSSProperties | ((a?: any) => CSSProperties)> = {
  app: { fontFamily: "'Outfit',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", maxWidth: 1200, margin: "0 auto", padding: "0 12px 50px" } as CSSProperties,
  header: { padding: "14px 0 8px", borderBottom: "1px solid " + C.border, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as any, gap: 8 } as CSSProperties,
  logo: { fontSize: 19, fontWeight: 800, color: C.accent } as CSSProperties,
  tabs: { display: "flex", gap: 3, overflowX: "auto", paddingBottom: 6, flexWrap: "wrap" as any } as CSSProperties,
  tab: (a) => ({ padding: "6px 11px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: a ? 700 : 400, background: a ? C.accent : C.btnBg, color: a ? C.bg : C.muted, whiteSpace: "nowrap" } as CSSProperties),
  card: { background: C.card, borderRadius: 9, padding: 12, marginBottom: 8, border: "1px solid " + C.border } as CSSProperties,
  cardT: { fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 6 } as CSSProperties,
  input: { width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid " + C.inputBorder, background: C.input, color: C.text, fontSize: 11.5, marginBottom: 5, boxSizing: "border-box" } as CSSProperties,
  select: { width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid " + C.inputBorder, background: C.input, color: C.text, fontSize: 11.5, marginBottom: 5, boxSizing: "border-box" } as CSSProperties,
  btn: { padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, background: C.accent, color: C.bg } as CSSProperties,
  btnSm: { padding: "3px 8px", borderRadius: 4, border: "1px solid " + C.inputBorder, cursor: "pointer", fontSize: 10.5, background: C.btnBg, color: C.muted } as CSSProperties,
  label: { fontSize: 10, color: C.muted, marginBottom: 1, display: "block" } as CSSProperties,
  badge: (c) => ({ display: "inline-block", padding: "1px 6px", borderRadius: 7, fontSize: 10, fontWeight: 600, background: c === "g" ? C.greenBg : c === "r" ? C.redBg : c === "y" ? C.yellowBg : c === "b" ? C.blueBg : C.border, color: c === "g" ? C.green : c === "r" ? C.red : c === "y" ? C.yellow : c === "b" ? C.blue : C.muted } as CSSProperties),
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 } as CSSProperties,
  sec: { background: "#0d1420", borderRadius: 6, padding: 10, marginTop: 6, border: "1px solid " + C.border } as CSSProperties,
  secT: { fontSize: 11.5, fontWeight: 700, color: C.accent, marginBottom: 5 } as CSSProperties,
};

export default function PropertyManagement() {
  const [D, setD] = useState(loadDB() || freshDB());
  const [user, setUser] = useState<any>(null);
  const [pin, setPin] = useState("");
  const [tab, setTab] = useState("tw");
  const [modal, setModal] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>(null);
  const [perm, setPerm] = useState(PERMS.viewer);

  useEffect(() => {
    localStorage.setItem(SK, JSON.stringify(D));
  }, [D]);

  const handleLogin = () => {
    const u = D.users.find((x: any) => x.pin === pin);
    if (u) {
      setUser(u);
      setPerm(PERMS[u.role as keyof typeof PERMS]);
      setPin("");
    } else {
      alert("Invalid PIN");
    }
  };

  if (!user) {
    return (
      <div style={{ ...(S.app as CSSProperties), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...(S.card as CSSProperties), width: "100%", maxWidth: 300 }}>
          <div style={S.cardT as CSSProperties}>Property Management System</div>
          <input style={S.input as CSSProperties} type="password" placeholder="Enter PIN" value={pin} onChange={(e) => setPin(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleLogin()} />
          <button style={{ ...(S.btn as CSSProperties), width: "100%" }} onClick={handleLogin}>Login</button>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 10, textAlign: "center" }}>
            Demo PINs: Admin=1234, Manager=5678, Viewer=0000
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.app as CSSProperties}>
      <div style={S.header as CSSProperties}>
        <div style={S.logo as CSSProperties}>📊 Property Management</div>
        <button style={S.btnSm as CSSProperties} onClick={() => { setUser(null); setPin(""); }}>Logout</button>
      </div>

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
        Logged in as: <span style={{ color: C.accent, fontWeight: 700 }}>{user.name}</span> ({user.role})
      </div>

      <div style={S.tabs as CSSProperties}>
        {["tw", "pr", "ten", "pay", "exp", "rpt"].map((t) => (
          <button key={t} style={(S.tab as any)(tab === t)} onClick={() => setTab(t)}>
            {t === "tw" && "Townships"}
            {t === "pr" && "Properties"}
            {t === "ten" && "Tenants"}
            {t === "pay" && "Payments"}
            {t === "exp" && "Expenses"}
            {t === "rpt" && "Reports"}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 15 }}>
        {tab === "tw" && <div style={{ color: C.muted }}>Township management coming soon...</div>}
        {tab === "pr" && <div style={{ color: C.muted }}>Property management coming soon...</div>}
        {tab === "ten" && <div style={{ color: C.muted }}>Tenant management coming soon...</div>}
        {tab === "pay" && <div style={{ color: C.muted }}>Payment tracking coming soon...</div>}
        {tab === "exp" && <div style={{ color: C.muted }}>Expense management coming soon...</div>}
        {tab === "rpt" && <div style={{ color: C.muted }}>Reports coming soon...</div>}
      </div>
    </div>
  );
}
