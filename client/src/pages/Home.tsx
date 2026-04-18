import { useState, useEffect, useRef } from "react";

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (d: string | undefined) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const cur = (n: number | string) => "₹" + Number(n || 0).toLocaleString("en-IN");
const today = () => new Date().toISOString().split("T")[0];
const mDiff = (a: string, b: string) => { const da = new Date(a), db = new Date(b); return (db.getFullYear() - da.getFullYear()) * 12 + db.getMonth() - da.getMonth(); };

const SK = "pm-v7";
const loadDB = () => { try { return JSON.parse(localStorage.getItem(SK) || "null"); } catch { return null; } };
const freshDB = () => ({
  users: [
    { id: "a1", name: "Admin", pin: "1234", role: "admin" },
    { id: "m1", name: "Manager", pin: "5678", role: "manager" },
    { id: "v1", name: "Viewer", pin: "0000", role: "viewer" },
  ],
  townships: [], properties: [], tenants: [], payments: [], expenditures: [], trash: [],
  docCats: ["Property Tax", "Light Bill", "Gas Bill", "Property Card", "Sale Deed", "Rent Agreement", "Registry", "Dastavej", "NOC", "Other"],
});

const PERMS: any = {
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
  const paid = payments.filter((p) => p.tenantId === t.id).reduce((s: number, p: any) => s + Number(p.amount), 0);
  return { due, paid, bal: due - paid };
}

const C = {
  bg: "#080d16", card: "#0f1624", border: "#1a2232", accent: "#d4a928",
  text: "#d0d8e4", muted: "#7a899c", dim: "#567",
  green: "#5de0a8", red: "#f09090", yellow: "#f0d060", blue: "#80b8f0",
  greenBg: "#0a3d2e", redBg: "#5c1a1a", yellowBg: "#5c3a0a", blueBg: "#1a2d4a",
  input: "#0a0f18", inputBorder: "#263040", btnBg: "#141c2c",
};

const S: any = {
  app: { fontFamily: "'Outfit',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", maxWidth: 1200, margin: "0 auto", padding: "0 12px 50px" },
  header: { padding: "14px 0 8px", borderBottom: "1px solid " + C.border, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  logo: { fontSize: 19, fontWeight: 800, color: C.accent },
  tabs: { display: "flex", gap: 3, overflowX: "auto", paddingBottom: 6, flexWrap: "wrap" },
  tab: (a: boolean) => ({ padding: "6px 11px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: a ? 700 : 400, background: a ? C.accent : C.btnBg, color: a ? C.bg : C.muted, whiteSpace: "nowrap" }),
  card: { background: C.card, borderRadius: 9, padding: 12, marginBottom: 8, border: "1px solid " + C.border },
  cardT: { fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 6 },
  input: { width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid " + C.inputBorder, background: C.input, color: C.text, fontSize: 11.5, marginBottom: 5, boxSizing: "border-box" },
  select: { width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid " + C.inputBorder, background: C.input, color: C.text, fontSize: 11.5, marginBottom: 5, boxSizing: "border-box" },
  btn: { padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, background: C.accent, color: C.bg },
  btnSm: { padding: "3px 8px", borderRadius: 4, border: "1px solid " + C.inputBorder, cursor: "pointer", fontSize: 10.5, background: C.btnBg, color: C.muted },
  label: { fontSize: 10, color: C.muted, marginBottom: 1, display: "block" },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 },
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 },
  sec: { background: "#0d1420", borderRadius: 6, padding: 10, marginTop: 6, border: "1px solid " + C.border },
  secT: { fontSize: 11.5, fontWeight: 700, color: C.accent, marginBottom: 5 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 11.5 },
  th: { textAlign: "left", padding: "5px 6px", borderBottom: "1px solid " + C.border, color: C.muted, fontSize: 9.5, fontWeight: 600, textTransform: "uppercase" },
  td: { padding: "5px 6px", borderBottom: "1px solid #0d1420" },
};

export default function Home() {
  const [D, setD] = useState<any>(freshDB());
  const [user, setUser] = useState<any>(null);
  const [perm, setPerm] = useState<any>({});
  const [tab, setTab] = useState("dsh");
  const [modal, setModal] = useState<string | null>(null);
  const [edit, setEdit] = useState<any>(null);

  useEffect(() => {
    const saved = loadDB();
    if (saved) setD(saved);
  }, []);

  const saveDB = () => {
    localStorage.setItem(SK, JSON.stringify(D));
  };

  const login = (name: string, pin: string, role: string) => {
    const u = D.users.find((u: any) => u.name === name && u.pin === pin && u.role === role);
    if (u) {
      setUser(u);
      setPerm(PERMS[role]);
    }
  };

  const add = (type: string, obj: any) => {
    const newObj = { ...obj, id: uid() };
    setD({ ...D, [type]: [...D[type], newObj] });
    saveDB();
  };

  if (!user) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: C.card, padding: 30, borderRadius: 10, border: "1px solid " + C.border, maxWidth: 400 }}>
          <h1 style={{ color: C.accent, marginBottom: 20 }}>🏢 Property Management</h1>
          <LoginForm onLogin={login} users={D.users} />
        </div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.logo}>🏢 Property Management System</div>
        <div>
          <span style={{ color: C.muted, fontSize: 12 }}>{user.name} ({user.role})</span>
          <button style={{ ...S.btn, marginLeft: 10 }} onClick={() => setUser(null)}>Logout</button>
        </div>
      </div>

      <div style={S.tabs}>
        <button style={S.tab(tab === "dsh")} onClick={() => setTab("dsh")}>📊 Dashboard</button>
        <button style={S.tab(tab === "tw")} onClick={() => setTab("tw")}>🏘️ Townships</button>
        <button style={S.tab(tab === "pr")} onClick={() => setTab("pr")}>🏠 Properties</button>
        <button style={S.tab(tab === "ten")} onClick={() => setTab("ten")}>👥 Tenants</button>
        <button style={S.tab(tab === "pay")} onClick={() => setTab("pay")}>💳 Payments</button>
        <button style={S.tab(tab === "exp")} onClick={() => setTab("exp")}>💰 Expenditures</button>
        <button style={S.tab(tab === "rpt")} onClick={() => setTab("rpt")}>📈 Reports</button>
      </div>

      <div style={{ padding: "20px 0" }}>
        {tab === "dsh" && <Dashboard D={D} />}
        {tab === "tw" && <Townships D={D} perm={perm} onAdd={(obj: any) => add("townships", obj)} />}
        {tab === "pr" && <Properties D={D} perm={perm} onAdd={(obj: any) => add("properties", obj)} />}
        {tab === "ten" && <Tenants D={D} perm={perm} onAdd={(obj: any) => add("tenants", obj)} />}
        {tab === "pay" && <Payments D={D} perm={perm} onAdd={(obj: any) => add("payments", obj)} />}
        {tab === "exp" && <Expenditures D={D} perm={perm} onAdd={(obj: any) => add("expenditures", obj)} />}
        {tab === "rpt" && <Reports D={D} />}
      </div>
    </div>
  );
}

function LoginForm({ onLogin, users }: any) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("admin");

  return (
    <div>
      <div style={{ marginBottom: 15 }}>
        <label style={S.label}>Username</label>
        <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Admin, Manager, or Viewer" />
      </div>
      <div style={{ marginBottom: 15 }}>
        <label style={S.label}>PIN</label>
        <input style={S.input} type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter PIN" />
      </div>
      <div style={{ marginBottom: 15 }}>
        <label style={S.label}>Role</label>
        <select style={S.select} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <button style={{ ...S.btn, width: "100%" }} onClick={() => onLogin(name, pin, role)}>Login</button>
      <p style={{ marginTop: 15, color: C.muted, fontSize: 11, textAlign: "center" }}>Demo: Admin/1234, Manager/5678, Viewer/0000</p>
    </div>
  );
}

function Dashboard({ D }: any) {
  const totalRev = D.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalExp = D.expenditures.reduce((s: number, e: any) => s + Number(e.amount), 0);

  return (
    <div>
      <h2 style={{ color: C.accent, marginBottom: 15 }}>Dashboard Overview</h2>
      <div style={S.g3}>
        <div style={S.card}>
          <div style={S.cardT}>🏘️ Townships</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>{D.townships.length}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardT}>🏠 Properties</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>{D.properties.length}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardT}>👥 Tenants</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>{D.tenants.length}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardT}>💵 Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>{cur(totalRev)}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardT}>💸 Expenses</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.red }}>{cur(totalExp)}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardT}>📈 Net</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: totalRev - totalExp >= 0 ? C.green : C.red }}>{cur(totalRev - totalExp)}</div>
        </div>
      </div>
    </div>
  );
}

function Townships({ D, perm, onAdd }: any) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  return (
    <div>
      <h2 style={{ color: C.accent, marginBottom: 15 }}>Township Management</h2>
      {perm.c && (
        <div style={S.card}>
          <input style={S.input} placeholder="Township Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={S.input} placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <button style={{ ...S.btn, width: "100%" }} onClick={() => { onAdd({ name, location }); setName(""); setLocation(""); }}>Add Township</button>
        </div>
      )}
      {D.townships.map((t: any) => (
        <div key={t.id} style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{t.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{t.location}</div>
        </div>
      ))}
    </div>
  );
}

function Properties({ D, perm, onAdd }: any) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Residential");
  const [townshipId, setTownshipId] = useState("");

  return (
    <div>
      <h2 style={{ color: C.accent, marginBottom: 15 }}>Property Management</h2>
      {perm.c && (
        <div style={S.card}>
          <select style={S.select} value={townshipId} onChange={(e) => setTownshipId(e.target.value)}>
            <option value="">Select Township</option>
            {D.townships.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input style={S.input} placeholder="Property Name" value={name} onChange={(e) => setName(e.target.value)} />
          <select style={S.select} value={type} onChange={(e) => setType(e.target.value)}>
            <option>Residential</option>
            <option>Commercial</option>
            <option>Industrial</option>
          </select>
          <button style={{ ...S.btn, width: "100%" }} onClick={() => { onAdd({ name, type, townshipId }); setName(""); }}>Add Property</button>
        </div>
      )}
      {D.properties.map((p: any) => {
        const tw = D.townships.find((t: any) => t.id === p.townshipId);
        return (
          <div key={p.id} style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{p.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{tw?.name} | {p.type}</div>
          </div>
        );
      })}
    </div>
  );
}

function Tenants({ D, perm, onAdd }: any) {
  const [name, setName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");

  return (
    <div>
      <h2 style={{ color: C.accent, marginBottom: 15 }}>Tenant Management</h2>
      {perm.c && (
        <div style={S.card}>
          <select style={S.select} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Select Property</option>
            {D.properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input style={S.input} placeholder="Tenant Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={S.input} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input style={S.input} type="number" placeholder="Monthly Rent" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} />
          <button style={{ ...S.btn, width: "100%" }} onClick={() => { onAdd({ name, propertyId, startDate, monthlyRent: Number(monthlyRent), incrementPercent: 10, incrementEveryMonths: 12 }); setName(""); }}>Add Tenant</button>
        </div>
      )}
      {D.tenants.map((t: any) => {
        const prop = D.properties.find((p: any) => p.id === t.propertyId);
        const b = getLedger(t, D.payments);
        return (
          <div key={t.id} style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{t.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{prop?.name} | {fmt(t.startDate)}</div>
            <div style={{ fontSize: 11, color: C.yellow }}>Rent: {cur(t.monthlyRent)}/mo | Pending: {cur(b.bal)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Payments({ D, perm, onAdd }: any) {
  const [tenantId, setTenantId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  return (
    <div>
      <h2 style={{ color: C.accent, marginBottom: 15 }}>Payment Records</h2>
      {perm.pay && (
        <div style={S.card}>
          <select style={S.select} value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value="">Select Tenant</option>
            {D.tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input style={S.input} type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button style={{ ...S.btn, width: "100%" }} onClick={() => { onAdd({ tenantId, amount: Number(amount), date }); setAmount(""); }}>Add Payment</button>
        </div>
      )}
      {D.payments.map((p: any) => {
        const tenant = D.tenants.find((t: any) => t.id === p.tenantId);
        return (
          <div key={p.id} style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{cur(p.amount)}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{tenant?.name} | {fmt(p.date)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Expenditures({ D, perm, onAdd }: any) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  return (
    <div>
      <h2 style={{ color: C.accent, marginBottom: 15 }}>Expenditure Records</h2>
      {perm.c && (
        <div style={S.card}>
          <input style={S.input} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input style={S.input} type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input style={S.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button style={{ ...S.btn, width: "100%" }} onClick={() => { onAdd({ description, amount: Number(amount), date }); setDescription(""); setAmount(""); }}>Add Expenditure</button>
        </div>
      )}
      {D.expenditures.map((e: any) => (
        <div key={e.id} style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>{cur(e.amount)}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{e.description} | {fmt(e.date)}</div>
        </div>
      ))}
    </div>
  );
}

function Reports({ D }: any) {
  const totalRev = D.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalExp = D.expenditures.reduce((s: number, e: any) => s + Number(e.amount), 0);

  return (
    <div>
      <h2 style={{ color: C.accent, marginBottom: 15 }}>Financial Reports</h2>
      <div style={S.g3}>
        <div style={S.card}>
          <div style={S.cardT}>Total Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>{cur(totalRev)}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardT}>Total Expenses</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.red }}>{cur(totalExp)}</div>
        </div>
        <div style={S.card}>
          <div style={S.cardT}>Net Profit</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: totalRev - totalExp >= 0 ? C.green : C.red }}>{cur(totalRev - totalExp)}</div>
        </div>
      </div>
    </div>
  );
}
