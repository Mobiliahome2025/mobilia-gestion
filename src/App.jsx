import React, { useState, useMemo, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './Login';
import { 
  LayoutDashboard, Package, ShoppingCart, BarChart3, Plus, Search, Clock, 
  Armchair, Trash2, Pencil, X, Menu, Settings, CreditCard, Tags, Coins, 
  Receipt, Check, ArrowRight, Wallet, TrendingDown, TrendingUp, Gift, 
  Boxes, Percent, PackagePlus, CheckCircle2, UploadCloud, FileSpreadsheet, 
  Download, ShoppingBag, Calendar, Activity, FileText, Filter, ChevronRight, 
  ChevronDown, PieChart, Info, Landmark, Sparkles, Loader2,
  Printer, Type, AlignLeft, AlignCenter, AlignRight, CheckSquare, PlusSquare,
  ArrowRightLeft
} from 'lucide-react';

// --- CONSTANTES INICIALES ---
const INITIAL_CATEGORIES = ['Sofás', 'Mesas', 'Sillas', 'Living', 'Dormitorio', 'Decoración'];
const INITIAL_PURCHASE_CATEGORIES = ['Mercadería', 'Alquiler', 'Luz', 'Internet', 'Sueldos', 'Publicidad', 'Mantenimiento', 'Impuestos', 'Financiero', 'Otros'];
const INITIAL_ACCOUNTS = [
  { id: 1, name: 'Caja Efectivo', initialBalance: 50000 }, 
  { id: 2, name: 'Banco Santander', initialBalance: 150000 }, 
  { id: 3, name: 'Mercado Pago', initialBalance: 0 }
];
const INITIAL_PAYMENTS = [
  { name: 'Efectivo', account: 'Caja Efectivo' },
  { name: 'Transferencia', account: 'Banco Santander' },
  { name: 'Tarjeta 3 Cuotas', account: 'Mercado Pago' },
  { name: 'Tarjeta 6 Cuotas', account: 'Mercado Pago' },
  { name: 'E-Check', account: 'Banco Santander' }
];
const INITIAL_CATEGORY_MARGINS = [
  { category: 'Sofás', margin: 60 }, { category: 'Mesas', margin: 50 }, 
  { category: 'Sillas', margin: 40 }, { category: 'Living', margin: 45 }, 
  { category: 'Dormitorio', margin: 55 }, { category: 'Decoración', margin: 70 }
];
const INITIAL_PAYMENT_BONUSES = [
  { id: 1, method: 'Efectivo', value: 30 },
  { id: 2, method: 'Transferencia', value: 30 }
];
const INITIAL_TAX_CONCEPTS = ['IVA', 'IIBB', 'Costo Transaccional', 'DyC', 'Costo Financiero'];
const INITIAL_TAX_RULES = [
  {
    id: 3,
    category: 'Todas',
    paymentMethod: 'Tarjeta 3 Cuotas',
    concepts: [{ name: 'Costo Financiero', value: 15, base: 'Precio Lista c/IVA' }]
  }
];

// --- UTILIDADES ---
const formatCurrency = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return '$ 0,00';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);
};

const parseLocaleNumber = (val) => {
  if (val === undefined || val === null) return 0;
  let str = val.toString().trim();
  if (!str) return 0;
  str = str.replace(/[$\s]/g, '');
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  if (lastComma > lastDot) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma && lastComma !== -1) {
    str = str.replace(/,/g, '');
  } else if (lastComma !== -1 && lastDot === -1) {
    str = str.replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const generateSKU = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'MH-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// --- COMPONENTES DE APOYO ---
function StatCard({ title, value, icon, color }) {
  const colors = { 
    greige: 'bg-[#b5a898]/10 text-[#b5a898]', 
    grey: 'bg-stone-100 text-stone-600', 
    red: 'bg-rose-50 text-rose-600', 
    emerald: 'bg-emerald-50 text-emerald-600'
  };
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform ${colors[color] || colors.greige}`}>
        {icon}
      </div>
      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-3xl font-black text-stone-900 tracking-tight">{value}</p>
    </div>
  );
}

function ExpandableRow({ title, amount, isNegative, children, isTotalRow }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`mb-4 bg-white rounded-2xl border border-stone-200 overflow-hidden ${isTotalRow ? 'shadow-md border-[#b5a898]' : 'shadow-sm'}`}>
      <div 
        className="flex justify-between items-center p-5 cursor-pointer hover:bg-stone-50 transition select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-stone-100 p-1.5 rounded-lg text-stone-500">
            {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
          <span className={`font-black uppercase tracking-widest ${isTotalRow ? 'text-[#8c8173] text-base' : 'text-stone-800 text-sm'}`}>{title}</span>
        </div>
        <span className={`font-black text-xl tracking-tight ${isNegative ? 'text-rose-600' : isTotalRow ? 'text-emerald-600' : 'text-stone-900'}`}>
          {isNegative && amount > 0 ? '-' : ''}{formatCurrency(amount)}
        </span>
      </div>
      {isOpen && (
        <div className="px-6 pb-6 pt-4 bg-stone-50/50 border-t border-stone-100">
          {children}
        </div>
      )}
    </div>
  );
}

// --- VISTAS DEL SISTEMA ---
function DashboardView({ sales, products, purchases, transfers, accounts, paymentMethods, taxRules, paymentBonuses }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // --- 1. Posición de Caja Global (Histórica hasta la fecha límite) ---
  const balancesByAccount = useMemo(() => {
    const balances = {};
    accounts.forEach(acc => balances[acc.name] = parseFloat(acc.initialBalance) || 0);
    
    sales.forEach(sale => {
      sale.payments?.forEach(pay => {
        if (pay.date <= endDate) {
          const methodObj = paymentMethods.find(m => m.name === pay.method);
          const accountName = methodObj ? methodObj.account : 'Otras Cuentas';
          if(balances[accountName] !== undefined) balances[accountName] += pay.amount;
        }
      });
    });

    purchases.forEach(purchase => {
      if (purchase.date <= endDate) {
        const methodObj = paymentMethods.find(m => m.name === purchase.paymentMethod);
        const accountName = methodObj ? methodObj.account : 'Otras Cuentas';
        if(balances[accountName] !== undefined) balances[accountName] -= purchase.amount;
      }
    });

    // Sumar y restar las transferencias internas de las cajas
    transfers?.forEach(t => {
      if (t.date <= endDate) {
        if (balances[t.fromAccount] !== undefined) balances[t.fromAccount] -= t.amount;
        if (balances[t.toAccount] !== undefined) balances[t.toAccount] += t.amount;
      }
    });

    return balances;
  }, [sales, purchases, transfers, accounts, paymentMethods, endDate]);

  const netResult = Object.values(balancesByAccount).reduce((sum, val) => sum + val, 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  // --- 2. Métricas del PERÍODO SELECCIONADO ---
  let periodIn = 0;
  let periodOut = 0;
  let periodSalesCount = 0;

  sales.forEach(s => {
    let isSaleInPeriod = false;
    s.payments?.forEach(p => {
      if (p.date >= startDate && p.date <= endDate) {
        periodIn += p.amount;
        isSaleInPeriod = true;
      }
    });
    if (isSaleInPeriod) periodSalesCount++;
  });
  purchases.forEach(p => {
    if (p.date >= startDate && p.date <= endDate) periodOut += p.amount;
  });
  const periodTicket = periodSalesCount > 0 ? periodIn / periodSalesCount : 0;

  // --- 3. Datos Evolutivos (Últimos 6 meses) y Rentabilidad Neta por Categoría ---
  const { monthsData, catProfitMap } = useMemo(() => {
    const endParts = endDate.split('-');
    const endYear = parseInt(endParts[0], 10);
    const endMonth = parseInt(endParts[1], 10) - 1;

    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(endYear, endMonth - i, 1);
      data.push({
        m: d.getMonth(), y: d.getFullYear(),
        label: d.toLocaleDateString('es-AR', {month: 'short'}).toUpperCase(),
        in: 0, out: 0
      });
    }

    const map = {};

    sales.forEach(s => {
      const subtotalCart = s.items.reduce((acc, item) => acc + (item.price * item.qty), 0);

      s.payments?.forEach(p => {
        const pParts = (p.date || s.date).split('-');
        const pMonth = parseInt(pParts[1], 10) - 1;
        const pYear = parseInt(pParts[0], 10);
        const monthIndex = data.findIndex(x => x.m === pMonth && x.y === pYear);

        if (monthIndex !== -1) {
          data[monthIndex].in += p.amount;
          // Cálculo profundo de Rentabilidad Neta a ese mes
          if (subtotalCart > 0 && paymentBonuses && taxRules) {
              const bonus = paymentBonuses.find(b => b.method === p.method)?.value || 0;
              const amountCoveredBase = p.amount / (1 - (bonus / 100));
              const proportionOfSale = amountCoveredBase / subtotalCart;
              const descuentos = amountCoveredBase - p.amount;

              s.items.forEach(item => {
                  const itemSubtotal = item.price * item.qty * proportionOfSale;
                  const itemCMV = (item.cost || 0) * item.qty * proportionOfSale;
                  const itemDiscount = descuentos * ((item.price * item.qty) / subtotalCart);

                  let itemTaxes = 0;
                  const matchingRules = taxRules.filter(r => (r.category === item.category || r.category === 'Todas') && (r.paymentMethod === p.method || r.paymentMethod === 'Todas'));
                  matchingRules.forEach(rule => {
                     rule.concepts.forEach(c => {
                        let baseAmount = itemSubtotal;
                        if (c.base === 'CMV (Costo Origen)') baseAmount = itemCMV;
                        else if (c.base === 'Lista s/IVA (Neto)') baseAmount = itemSubtotal / (1 + (item.iva || 21) / 100);
                        itemTaxes += baseAmount * (c.value / 100);
                     });
                  });

                  const netProfit = itemSubtotal - itemCMV - itemDiscount - itemTaxes;
                  if (!map[item.category]) map[item.category] = [0,0,0,0,0,0];
                  map[item.category][monthIndex] += netProfit;
              });
          }
        }
      });
    });

    purchases.forEach(p => {
      const pParts = p.date.split('-');
      const pMonth = parseInt(pParts[1], 10) - 1;
      const pYear = parseInt(pParts[0], 10);
      const match = data.find(x => x.m === pMonth && x.y === pYear);
      if (match) match.out += p.amount;
    });
    return { monthsData: data, catProfitMap: map };
  }, [sales, purchases, endDate, paymentBonuses, taxRules]);

  // Extraer el Top 3 de Categorías más rentables del semestre
  const top3Cats = useMemo(() => {
    const totals = Object.entries(catProfitMap).map(([cat, arr]) => ({ cat, total: arr.reduce((a,b)=>a+b,0) }));
    totals.sort((a,b) => b.total - a.total);
    return totals.slice(0, 3).map(t => t.cat);
  }, [catProfitMap]);

  // Controladores del Gráfico SVG
  const [hoverPoint, setHoverPoint] = useState(null);
  const CAT_COLORS = ['#b5a898', '#10b981', '#f43f5e'];
  const allVals = top3Cats.flatMap(cat => catProfitMap[cat]);
  const maxProfit = allVals.length > 0 ? Math.max(10, ...allVals) : 10;
  const minProfit = allVals.length > 0 ? Math.min(0, ...allVals) : 0;
  const rangeProfit = maxProfit - minProfit;
  const getY = (val) => 150 - ((val - minProfit) / rangeProfit) * 100;
  const getX = (idx) => 20 + (idx * 92); // Anchura 500, separaciones iguales

  const MiniCard = ({ title, value, icon, colorClass }) => (
    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
       <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>{icon}</div>
       <div className="overflow-hidden">
         <h4 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-0.5 truncate">{title}</h4>
         <p className="text-lg font-black text-stone-900 tracking-tight truncate">{value}</p>
       </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Selector de Período */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <h2 className="text-xl font-bold flex items-center gap-3 text-stone-900">
          <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><LayoutDashboard className="w-6 h-6" /></div> Dashboard Gerencial
        </h2>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-2 px-3">
             <Filter className="w-4 h-4 text-stone-400" />
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Desde</span>
             <input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="w-px h-6 bg-stone-200"></div>
          <div className="flex items-center gap-2 px-3">
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Hasta</span>
             <input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* KPIs del Mes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MiniCard title="Ingresos (Período)" value={formatCurrency(periodIn)} icon={<TrendingUp className="w-5 h-5"/>} colorClass="bg-emerald-50 text-emerald-600" />
        <MiniCard title="Egresos (Período)" value={formatCurrency(periodOut)} icon={<TrendingDown className="w-5 h-5"/>} colorClass="bg-rose-50 text-rose-600" />
        <MiniCard title="Ventas (Período)" value={periodSalesCount.toString()} icon={<ShoppingCart className="w-5 h-5"/>} colorClass="bg-[#b5a898]/10 text-[#b5a898]" />
        <MiniCard title="Ticket Promedio" value={formatCurrency(periodTicket)} icon={<Receipt className="w-5 h-5"/>} colorClass="bg-stone-100 text-stone-600" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* LEFT: Posición de Caja */}
         <div className="lg:col-span-5 bg-[#1a1a1a] text-white rounded-[2rem] p-10 shadow-xl flex flex-col justify-center border border-stone-800 text-center relative overflow-hidden group">
            <h3 className="text-[#b5a898] font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Posición de Caja (A Fecha)</h3>
            <p className="text-5xl lg:text-6xl font-black tracking-tighter text-white drop-shadow-sm mb-8">{formatCurrency(netResult)}</p>
            
            {Object.keys(balancesByAccount).length > 0 && (
              <div className="pt-8 border-t border-stone-800/50 text-left">
                <h4 className="text-[9px] text-stone-500 font-bold uppercase tracking-widest mb-3">Saldos por Cuenta</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {Object.entries(balancesByAccount).map(([account, amount]) => (
                    <div key={account} className="bg-black/50 rounded-xl px-4 py-3 min-w-[140px] flex-1 border border-stone-800/50 flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-stone-400 uppercase truncate tracking-widest mb-1" title={account}>{account}</span>
                      <span className={`text-sm font-black ${amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
         </div>
         
         {/* RIGHT: Gráficos del Periodo */}
         <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Gráfico 1: 6 Meses */}
            <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm flex-1 flex flex-col">
               <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-stone-800 text-xs uppercase tracking-widest">Flujo Histórico (6 Meses)</h3>
                  <div className="flex gap-3 text-[9px] font-bold uppercase tracking-widest text-stone-400">
                     <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#b5a898]"></div> Ingresos</span>
                     <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-stone-800"></div> Egresos</span>
                  </div>
               </div>
               <div className="flex-1 flex items-end justify-between gap-2 pt-12 mt-auto">
                  {monthsData.map(m => {
                     const maxVal = Math.max(...monthsData.map(x => Math.max(x.in, x.out)), 1);
                     const inHeight = Math.max((m.in / maxVal) * 100, 2); 
                     const outHeight = Math.max((m.out / maxVal) * 100, 2);
                     return (
                       <div key={m.label} className="flex flex-col items-center flex-1 gap-3 group relative cursor-pointer">
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 transition-opacity shadow-xl flex flex-col gap-1">
                            <span className="text-emerald-400">Ingresos: {formatCurrency(m.in)}</span>
                            <span className="text-rose-400">Egresos: {formatCurrency(m.out)}</span>
                          </div>
                          <div className="flex items-end justify-center w-full gap-1.5 h-32">
                             <div className="w-full max-w-[24px] bg-[#b5a898] rounded-t-md transition-all duration-1000" style={{height: `${inHeight}%`}}></div>
                             <div className="w-full max-w-[24px] bg-stone-800 rounded-t-md transition-all duration-1000" style={{height: `${outHeight}%`}}></div>
                          </div>
                         <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{m.label}</span>
                       </div>
                     )
                  })}
               </div>
            </div>

 {/* Gráfico 2: Rentabilidad Neta (Líneas) */}
            <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm flex flex-col min-h-[320px]">
               <div className="flex justify-between items-center mb-6 shrink-0">
                   <h3 className="font-bold text-stone-800 text-xs uppercase tracking-widest">Rentabilidad Neta (Top 3 Categorías)</h3>
                   <div className="flex gap-3 text-[9px] font-bold uppercase tracking-widest text-stone-500">
                      {top3Cats.map((c, i) => (
                          <span key={c} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: CAT_COLORS[i]}}></div> {c}</span>
                      ))}
                      {top3Cats.length === 0 && <span>Sin Datos</span>}
                   </div>
               </div>
               <div className="relative w-full flex-1">
                  {top3Cats.length > 0 ? (
                     <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible" onMouseLeave={() => setHoverPoint(null)}>
                        {/* Líneas Base Cero */}
                        <line x1="20" y1={getY(0)} x2="480" y2={getY(0)} stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4 4" />
                        <line x1="20" y1={getY(maxProfit)} x2="480" y2={getY(maxProfit)} stroke="#f3f4f6" strokeWidth="1" />

                        {/* Líneas Dinámicas de Categorías */}
                        {top3Cats.map((cat, i) => {
                           const pathData = catProfitMap[cat].map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`).join(' ');
                           return (
                              <g key={cat}>
                                 <path d={pathData} fill="none" stroke={CAT_COLORS[i]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                 {catProfitMap[cat].map((val, idx) => (
                                    <circle key={idx} cx={getX(idx)} cy={getY(val)} r="6" fill="#fff" stroke={CAT_COLORS[i]} strokeWidth="2.5"
                                       className="cursor-pointer transition-all hover:r-8"
                                       onMouseEnter={() => setHoverPoint({ cat, val, mLabel: monthsData[idx].label, color: CAT_COLORS[i], x: getX(idx), y: getY(val) })}
                                    />
                                 ))}
                              </g>
                           );
                        })}

                        {/* Textos Inferiores (Meses) */}
                        {monthsData.map((m, idx) => (
                           <text key={idx} x={getX(idx)} y="180" textAnchor="middle" fill="#9ca3af" fontSize="10" fontWeight="bold" className="uppercase tracking-widest">{m.label}</text>
                        ))}

                        {/* Tooltip Dinámico en SVG */}
                        {hoverPoint && (
                           <g transform={`translate(${hoverPoint.x}, ${hoverPoint.y})`} className="pointer-events-none transition-transform duration-200 drop-shadow-lg">
                              <rect x="-45" y="-45" width="90" height="32" fill="#1a1a1a" rx="6" />
                              <polygon points="-5,-13 5,-13 0,-8" fill="#1a1a1a" />
                              <text x="0" y="-32" textAnchor="middle" fill={hoverPoint.color} fontSize="9" fontWeight="900" className="uppercase">{hoverPoint.cat}</text>
                              <text x="0" y="-20" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">{formatCurrency(hoverPoint.val)}</text>
                           </g>
                        )}
                     </svg>
                 ) : (
                     <div className="flex h-full items-center justify-center text-stone-400 font-bold uppercase tracking-widest text-[10px]">Esperando ventas para analizar rentabilidad...</div>
                 )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function PnLView({ sales, purchases, paymentBonuses, taxRules }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const pnlData = useMemo(() => {
    const filteredPurchases = purchases.filter(p => p.date >= startDate && p.date <= endDate);

    const revenueByCategory = {};
    let ventasBrutas = 0;
    const directCostsBreakdown = { 'CMV (Costo de Mercadería)': 0 };
    let totalDirectCosts = 0;
    const taxesBreakdown = {};
    let totalTaxes = 0;
    const opExBreakdown = {};
    let totalOpEx = 0;
    let comprasMercaderiaAisladas = 0;

    sales.forEach(sale => {
      const subtotalCart = sale.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      if (subtotalCart <= 0) return;

      const paymentsInPeriod = sale.payments?.filter(p => p.date >= startDate && p.date <= endDate) || [];
      if (paymentsInPeriod.length === 0) return;

      paymentsInPeriod.forEach(pay => {
        const bonus = paymentBonuses.find(b => b.method === pay.method)?.value || 0;
        const amountCoveredBase = pay.amount / (1 - (bonus / 100));
        const proportionOfSale = amountCoveredBase / subtotalCart;

        ventasBrutas += amountCoveredBase;
        const descuentos = amountCoveredBase - pay.amount;
        if (descuentos > 0) {
          directCostsBreakdown['Bonificaciones Otorgadas'] = (directCostsBreakdown['Bonificaciones Otorgadas'] || 0) + descuentos;
          totalDirectCosts += descuentos;
        }

        sale.items.forEach(item => {
          const subtotalItem = item.price * item.qty;
          const costItem = (item.cost || 0) * item.qty;
          const propSubtotal = subtotalItem * proportionOfSale;
          const propCost = costItem * proportionOfSale;

          revenueByCategory[item.category] = (revenueByCategory[item.category] || 0) + propSubtotal;
          directCostsBreakdown['CMV (Costo de Mercadería)'] += propCost;
          totalDirectCosts += propCost;

          const matchingRules = taxRules.filter(r => (r.category === item.category || r.category === 'Todas') && (r.paymentMethod === pay.method || r.paymentMethod === 'Todas'));
          matchingRules.forEach(rule => {
            rule.concepts.forEach(c => {
              let baseAmount = propSubtotal;
              if (c.base === 'CMV (Costo Origen)') baseAmount = propCost;
              else if (c.base === 'Lista s/IVA (Neto)') baseAmount = propSubtotal / (1 + (item.iva || 21) / 100);

              const conceptVal = baseAmount * (c.value / 100);
              const nameUpper = String(c.name).toUpperCase();
              if (nameUpper.includes('IVA') || nameUpper.includes('IIBB') || nameUpper.includes('IMPUESTO')) {
                taxesBreakdown[c.name] = (taxesBreakdown[c.name] || 0) + conceptVal;
                totalTaxes += conceptVal;
              } else {
                directCostsBreakdown[c.name] = (directCostsBreakdown[c.name] || 0) + conceptVal;
                totalDirectCosts += conceptVal;
              }
            });
          });
        });
      });
    });
    filteredPurchases.forEach(p => {
      const iva = parseFloat(p.ivaAmount) || 0;
      const iibb = parseFloat(p.iibbAmount) || 0;
      const cat = String(p.category).toLowerCase();
      
      const neto = p.netAmount !== undefined ? parseFloat(p.netAmount) : (parseFloat(p.amount) - iva - iibb);
      
      if (cat.includes('mercadería') || cat.includes('mercaderia') || cat.includes('stock')) {
        comprasMercaderiaAisladas += neto;
      } else if (cat.includes('impuesto') || cat.includes('iibb') || cat.includes('iva')) {
        taxesBreakdown[`Pagos: ${p.category}`] = (taxesBreakdown[`Pagos: ${p.category}`] || 0) + neto;
        totalTaxes += neto;
      } else {
        opExBreakdown[p.category] = (opExBreakdown[p.category] || 0) + neto;
        totalOpEx += neto;
      }

      if (iva > 0) {
         taxesBreakdown['Crédito Fiscal IVA (Compras)'] = (taxesBreakdown['Crédito Fiscal IVA (Compras)'] || 0) - iva;
         totalTaxes -= iva;
      }
      if (iibb > 0) {
         taxesBreakdown['Crédito IIBB (Percepciones)'] = (taxesBreakdown['Crédito IIBB (Percepciones)'] || 0) - iibb;
         totalTaxes -= iibb;
      }
    });

    const utilidadBruta = ventasBrutas - totalDirectCosts;
    const resultadoNeto = utilidadBruta - totalOpEx - totalTaxes;

    return {
      ventasBrutas, revenueByCategory, totalDirectCosts, directCostsBreakdown, 
      utilidadBruta, totalOpEx, opExBreakdown, totalTaxes, taxesBreakdown, 
      resultadoNeto, comprasMercaderiaAisladas,
      margen: ventasBrutas > 0 ? (resultadoNeto / ventasBrutas) * 100 : 0
    };
  }, [sales, purchases, startDate, endDate, taxRules, paymentBonuses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900">
          <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><FileText className="w-6 h-6" /></div>
          Estado de Resultados (P&L)
        </h3>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-2 px-3">
             <Filter className="w-4 h-4 text-stone-400" />
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Desde</span>
             <input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="w-px h-6 bg-stone-200"></div>
          <div className="flex items-center gap-2 px-3">
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Hasta</span>
             <input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8 lg:p-12">
        <div className="max-w-4xl mx-auto">
           <div className="text-center mb-10">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-stone-900">P&L Consolidado Percibido</h2>
              <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-2">Período: {String(startDate)} al {String(endDate)}</p>
           </div>

           <div className="space-y-2 text-sm">
              <ExpandableRow title="Ingresos Operativos (Ventas Devengadas s/Cobros)" amount={pnlData.ventasBrutas} isNegative={false}>
                 <div className="space-y-3">
                   {Object.keys(pnlData.revenueByCategory).length === 0 && <p className="text-xs text-stone-400 font-bold uppercase">Sin registros</p>}
                   {Object.entries(pnlData.revenueByCategory).map(([cat, val]) => (
                     <div key={cat} className="flex justify-between items-center text-xs font-bold text-stone-600 uppercase border-b border-stone-200/50 pb-2">
                       <span>{String(cat)}</span><span className="font-black text-stone-800">{formatCurrency(val)}</span>
                     </div>
                   ))}
                 </div>
              </ExpandableRow>

              <ExpandableRow title="Costos Directos y Financieros" amount={pnlData.totalDirectCosts} isNegative={true}>
                 <div className="space-y-3">
                   {Object.keys(pnlData.directCostsBreakdown).length === 0 && <p className="text-xs text-stone-400 font-bold uppercase">Sin registros</p>}
                   {Object.entries(pnlData.directCostsBreakdown).map(([concept, val]) => (
                     <div key={concept} className="flex justify-between items-center text-xs font-bold text-stone-600 uppercase border-b border-stone-200/50 pb-2">
                       <span>{String(concept)}</span><span className="font-black text-rose-600">-{formatCurrency(val)}</span>
                     </div>
                   ))}
                 </div>
              </ExpandableRow>

              <div className="flex justify-between items-center bg-[#b5a898]/10 p-6 rounded-2xl border border-[#b5a898]/30 shadow-sm mb-6 mt-6">
                 <span className="font-black uppercase tracking-widest text-[#8c8173]">Utilidad Bruta</span>
                 <span className="font-black text-2xl text-[#8c8173] tracking-tight">{formatCurrency(pnlData.utilidadBruta)}</span>
              </div>

              <ExpandableRow title="Gastos Fijos y Operativos" amount={pnlData.totalOpEx} isNegative={true}>
                 <div className="space-y-3">
                   {Object.keys(pnlData.opExBreakdown).length === 0 && <p className="text-xs text-stone-400 font-bold uppercase">Sin registros</p>}
                   {Object.entries(pnlData.opExBreakdown).map(([cat, val]) => (
                     <div key={cat} className="flex justify-between items-center text-xs font-bold text-stone-600 uppercase border-b border-stone-200/50 pb-2">
                       <span>{String(cat)}</span><span className="font-black text-rose-600">-{formatCurrency(val)}</span>
                     </div>
                   ))}
                 </div>
              </ExpandableRow>

              <ExpandableRow title="Impuestos y Retenciones" amount={pnlData.totalTaxes} isNegative={true}>
                 <div className="space-y-3">
                   {Object.keys(pnlData.taxesBreakdown).length === 0 && <p className="text-xs text-stone-400 font-bold uppercase">Sin registros</p>}
                   {Object.entries(pnlData.taxesBreakdown).map(([tax, val]) => (
                     <div key={tax} className="flex justify-between items-center text-xs font-bold text-stone-600 uppercase border-b border-stone-200/50 pb-2">
                       <span>{String(tax)}</span><span className={`font-black ${val < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{val < 0 ? '+' : '-'}{formatCurrency(Math.abs(val))}</span>
                     </div>
                   ))}
                 </div>
              </ExpandableRow>

              <div className="bg-black p-8 rounded-[2rem] flex justify-between items-center font-black uppercase text-white mt-10 shadow-2xl">
                 <div className="flex flex-col">
                   <span className="text-[#b5a898] text-[10px] tracking-widest mb-1">Resultado Final</span>
                   <span className="text-2xl">Ganancia Neta</span>
                 </div>
                 <div className="text-right">
                   <span className={`text-5xl tracking-tighter block ${pnlData.resultadoNeto >= 0 ? 'text-white' : 'text-rose-400'}`}>
                     {formatCurrency(pnlData.resultadoNeto)}
                   </span>
                   <span className={`text-xs font-bold tracking-widest block mt-2 ${pnlData.margen >= 0 ? 'text-[#b5a898]' : 'text-rose-400'}`}>
                     Margen Neto: {String(pnlData.margen.toFixed(2))}%
                   </span>
                 </div>
              </div>

              <div className="mt-8 flex items-start gap-3 bg-stone-100 p-6 rounded-2xl border border-stone-200 text-stone-600 shadow-sm">
                <Info className="w-6 h-6 shrink-0 mt-0.5 text-stone-400" />
                <p className="text-xs font-bold leading-relaxed">
                  CONTABILIDAD: P&L basado en criterio de Percepción según fecha de pago. Las compras de mercadería por <strong className="font-black underline">{formatCurrency(pnlData.comprasMercaderiaAisladas)}</strong> netas NO se restan, representan un activo. El Crédito Fiscal IVA se deduce automáticamente de los impuestos devengados.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProfitabilityView({ sales, taxRules, paymentBonuses, searchTerm }) {
  const [expandedSale, setExpandedSale] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const profitData = useMemo(() => {
    let filteredSales = sales;
    if (startDate) filteredSales = filteredSales.filter(s => s.date >= startDate);
    if (endDate) filteredSales = filteredSales.filter(s => s.date <= endDate);

    let data = filteredSales.map(sale => {
      const subtotal = sale.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const totalCost = sale.items.reduce((acc, item) => acc + ((item.cost || 0) * item.qty), 0);
      
      let absorbedCosts = 0;
      const detailedCosts = [];
      const totalPaymentsVolume = sale.payments ? sale.payments.reduce((acc, p) => acc + p.amount, 0) : 0;
      
      const amountCoveredBase = sale.payments?.reduce((acc, p) => {
        const bonus = paymentBonuses.find(b => b.method === p.method)?.value || 0;
        return acc + (p.amount / (1 - (bonus / 100)));
      }, 0) || 0;

      const descuentos = amountCoveredBase - totalPaymentsVolume;
      if (descuentos > 0) {
        absorbedCosts += descuentos;
        detailedCosts.push({ name: 'Bonificaciones Comerciales', amount: descuentos });
      }

      if (totalPaymentsVolume > 0 && sale.payments) {
        sale.items.forEach(item => {
          const itemBaseTotal = item.price * item.qty;
          const itemCostTotal = (item.cost || 0) * item.qty;

          sale.payments.forEach(pay => {
            const proportion = pay.amount / totalPaymentsVolume;
            const propSubtotal = itemBaseTotal * proportion;
            const propCost = itemCostTotal * proportion;
            
            const matchingRules = taxRules.filter(r => (r.category === item.category || r.category === 'Todas') && (r.paymentMethod === pay.method || r.paymentMethod === 'Todas'));
            
            matchingRules.forEach(rule => {
               rule.concepts.forEach(c => {
                  let baseAmount = propSubtotal;
                  if (c.base === 'CMV (Costo Origen)') baseAmount = propCost;
                  else if (c.base === 'Lista s/IVA (Neto)') baseAmount = propSubtotal / (1 + (item.iva || 21) / 100);

                  const conceptCost = baseAmount * (c.value / 100);
                  absorbedCosts += conceptCost; // Sumamos al costo general extra
                  
                  const existing = detailedCosts.find(d => d.name === c.name);
                  if (existing) existing.amount += conceptCost;
                  else detailedCosts.push({ name: c.name, amount: conceptCost });
               });
            });
          });
        });
      }

      const netProfit = subtotal - totalCost - absorbedCosts;
      const margin = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;
      return { ...sale, subtotal, totalCost, absorbedCosts, detailedCosts, netProfit, margin };
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(s => String(s.id).toLowerCase().includes(term));
    }
    return data.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, searchTerm, taxRules, paymentBonuses, startDate, endDate]);

  const globalRevenue = profitData.reduce((acc, s) => acc + s.subtotal, 0);
  const globalCost = profitData.reduce((acc, s) => acc + s.totalCost, 0);
  const globalNet = profitData.reduce((acc, s) => acc + s.netProfit, 0);
  const globalMargin = globalRevenue > 0 ? (globalNet / globalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3 text-stone-900 uppercase">
          <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><PieChart className="w-6 h-6" /></div>
          <h3 className="text-xl font-bold tracking-tighter">Rentabilidad por Venta</h3>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-2 px-3">
             <Filter className="w-4 h-4 text-stone-400" />
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Desde</span>
             <input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="w-px h-6 bg-stone-200"></div>
          <div className="flex items-center gap-2 px-3">
             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Hasta</span>
             <input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Ingreso Bruto" value={formatCurrency(globalRevenue)} icon={<TrendingUp className="w-6 h-6" />} color="greige" />
        <StatCard title="Costo Mercadería" value={formatCurrency(globalCost)} icon={<Boxes className="w-6 h-6" />} color="grey" />
        <StatCard title="Ganancia Neta" value={formatCurrency(globalNet)} icon={<Activity className="w-6 h-6" />} color={globalNet >= 0 ? "emerald" : "red"} />
        <StatCard title="Margen Promedio" value={`${String(globalMargin.toFixed(1))}%`} icon={<Percent className="w-6 h-6" />} color="greige" />
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-stone-900">
            <thead>
              <tr className="bg-stone-50 text-stone-400 text-[10px] font-bold uppercase tracking-widest border-b border-stone-200">
                <th className="p-6">Fecha / ID</th>
                <th className="p-6 text-right">Venta Bruta</th>
                <th className="p-6 text-right">Costo (CMV)</th>
                <th className="p-6 text-right">Costos Financ/Imp.</th>
                <th className="p-6 text-right">Result. Neto</th>
                <th className="p-6 text-center">Desglose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {profitData.map((s, idx) => (
                <React.Fragment key={`${s.id}-${idx}`}>
                  <tr className="hover:bg-stone-50/50 transition">
                    <td className="p-6"><p className="font-black text-sm">#{String(s.id).split('-')[1]}</p><p className="text-[10px] font-bold text-stone-400 mt-1 uppercase">{String(s.date)}</p></td>
                    <td className="p-6 text-right font-black text-stone-900">{formatCurrency(s.subtotal)}</td>
                    <td className="p-6 text-right font-bold text-stone-500">-{formatCurrency(s.totalCost)}</td>
                    <td className="p-6 text-right font-bold text-stone-400">-{formatCurrency(s.absorbedCosts)}</td>
                    <td className={`p-6 text-right font-black text-lg tracking-tight ${s.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(s.netProfit)}</td>
                    <td className="p-6 text-center"><button onClick={() => setExpandedSale(expandedSale === s.id ? null : s.id)} className="p-2 bg-stone-100 text-stone-500 rounded-lg hover:bg-stone-200 transition"><ChevronDown className={`w-4 h-4 transition-transform ${expandedSale === s.id ? 'rotate-180' : ''}`} /></button></td>
                  </tr>
                  {expandedSale === s.id && (
                    <tr className="bg-[#f4f2f0]/50 shadow-inner">
                      <td colSpan="6" className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                           <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-4 border-b border-stone-100 pb-2">Desglose CMV (Mercadería)</h4>
                              <div className="space-y-3">
                                {s.items.map((item, i) => (
                                  <div key={i} className="flex justify-between items-center text-xs font-bold text-stone-600">
                                    <span>{item.qty}x {item.name}</span><span className="text-stone-400">-{formatCurrency((item.cost || 0) * item.qty)}</span>
                                  </div>
                                ))}
                              </div>
                           </div>
                           <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-4 border-b border-stone-100 pb-2">Desglose Costos / Impuestos Extra</h4>
                              <div className="space-y-3">
                                {s.detailedCosts.length === 0 && <p className="text-xs text-stone-400">Sin costos extra registrados.</p>}
                                {s.detailedCosts.map((cost, i) => (
                                  <div key={i} className="flex justify-between items-center text-xs font-bold text-stone-600">
                                     <span>{cost.name}</span><span className="text-rose-500">-{formatCurrency(cost.amount)}</span>
                                  </div>
                                ))}
                              </div>
                           </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {profitData.length === 0 && (
                <tr><td colSpan="6" className="py-20 text-center text-stone-400"><PieChart className="w-12 h-12 mx-auto mb-4 opacity-30" /><p className="font-bold text-xs uppercase tracking-widest">Sin datos de rentabilidad</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CashFlowView({ sales, purchases, transfers, setTransfers, accounts, searchTerm }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferForm, setTransferForm] = useState({
    date: new Date().toISOString().split('T')[0],
    fromAccount: '', toAccount: '', amount: '', description: ''
  });

  const handleTransfer = (e) => {
    e.preventDefault();
    const amt = parseFloat(transferForm.amount);
    if (!transferForm.fromAccount || !transferForm.toAccount || transferForm.fromAccount === transferForm.toAccount || isNaN(amt) || amt <= 0) {
      alert("Por favor, revisa las cuentas y el monto de la transferencia.");
      return;
    }
    // Llamamos al setTransfers que inyectamos en App para que suba a Firebase
    setTransfers([{ ...transferForm, id: Date.now(), amount: amt }, ...(transfers || [])]);
    setIsTransferring(false);
    setTransferForm({ date: new Date().toISOString().split('T')[0], fromAccount: '', toAccount: '', amount: '', description: '' });
  };

  const movements = useMemo(() => {
    const s = [];
    sales.forEach(sale => {
      sale.payments?.forEach(pay => {
        s.push({
          id: pay.id || Math.random(), date: pay.date || sale.date,
          concept: `Cobro Venta #${String(sale.id).split('-')[1] || String(sale.id)}`,
          detail: sale.items.map(i => i.name).join(', '), type: 'Ingreso',
          method: pay.method, amount: pay.amount 
        });
      });
    });

    const p = purchases.map(pur => ({
      id: pur.id, date: pur.date, concept: pur.category,
      detail: pur.description, type: 'Egreso', method: pur.paymentMethod,
      amount: -pur.amount 
    }));
    
    // Agregamos las transferencias (impacto visual para auditoría)
    transfers?.forEach(t => {
      s.push({
        id: t.id + '-out', date: t.date, concept: 'Mov. Interno (Salida)',
        detail: `Hacia ${t.toAccount} ${t.description ? ' - ' + t.description : ''}`, type: 'Transferencia',
        method: t.fromAccount, amount: -t.amount, isTransfer: true
      });
      s.push({
        id: t.id + '-in', date: t.date, concept: 'Mov. Interno (Entrada)',
        detail: `Desde ${t.fromAccount} ${t.description ? ' - ' + t.description : ''}`, type: 'Transferencia',
        method: t.toAccount, amount: t.amount, isTransfer: true
      });
    });

    let all = [...s, ...p];

    if (startDate) all = all.filter(m => m.date >= startDate);
    if (endDate) all = all.filter(m => m.date <= endDate);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      all = all.filter(m => String(m.concept).toLowerCase().includes(term) || String(m.detail).toLowerCase().includes(term) || String(m.method).toLowerCase().includes(term));
    }

    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, purchases, transfers, startDate, endDate, searchTerm]);

  // Las transferencias no deben sumar ni restar del ingreso neto o egreso total del negocio
  const periodIn = movements.filter(m => m.amount > 0 && !m.isTransfer).reduce((acc, m) => acc + m.amount, 0);
  const periodOut = movements.filter(m => m.amount < 0 && !m.isTransfer).reduce((acc, m) => acc + Math.abs(m.amount), 0);
  const periodBalance = periodIn - periodOut;

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Concepto', 'Detalle', 'Medio de Pago/Caja', 'Monto'];
    const rows = movements.map(m => [ m.date, m.type, `"${m.concept}"`, `"${m.detail}"`, `"${m.method}"`, m.amount ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Flujo_Caja_${startDate}_al_${endDate}.csv`;
    document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900">
          <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Activity className="w-6 h-6" /></div> Movimientos de Caja (Cashflow)
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-stone-200">
            <div className="flex items-center gap-2 px-3"><Filter className="w-4 h-4 text-stone-400" /><input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div className="w-px h-6 bg-stone-200"></div>
            <div className="flex items-center gap-2 px-3"><input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <button onClick={handleExportCSV} className="bg-black text-white p-2.5 rounded-xl hover:bg-stone-800 transition shadow-sm" title="Descargar CSV"><Download className="w-4 h-4" /></button>
          </div>
          <button onClick={() => setIsTransferring(true)} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition shadow-sm flex items-center gap-2">
             <ArrowRightLeft className="w-4 h-4 text-[#b5a898]" /> Transferir Fondos
          </button>
        </div>
      </div>

      {isTransferring && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-black p-6 flex justify-between items-center text-white">
               <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-[#b5a898]" /> Transferencia Interna</h3>
               <button onClick={() => setIsTransferring(false)} className="hover:text-[#b5a898] transition"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleTransfer} className="p-8 space-y-4">
               <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Fecha</label><input type="date" required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm font-bold outline-none" value={transferForm.date} onChange={e => setTransferForm({...transferForm, date: e.target.value})} /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Sale de (Origen)</label><select required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm font-bold outline-none" value={transferForm.fromAccount} onChange={e => setTransferForm({...transferForm, fromAccount: e.target.value})}><option value="">Caja...</option>{accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-emerald-600 uppercase">Entra a (Destino)</label><select required className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm font-bold outline-none text-emerald-900" value={transferForm.toAccount} onChange={e => setTransferForm({...transferForm, toAccount: e.target.value})}><option value="">Caja...</option>{accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
               </div>
               <div className="space-y-1 pt-2"><label className="text-[10px] font-bold text-stone-500 uppercase">Monto a mover ($)</label><input type="number" step="0.01" required className="w-full bg-white border border-stone-300 rounded-xl px-4 py-3 text-lg font-black text-stone-900 outline-none focus:ring-2 focus:ring-[#b5a898]" placeholder="Monto..." value={transferForm.amount} onChange={e => setTransferForm({...transferForm, amount: e.target.value})} /></div>
               <div className="space-y-1 pt-2"><label className="text-[10px] font-bold text-stone-500 uppercase">Motivo o Ref. (Opcional)</label><input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm font-bold outline-none" value={transferForm.description} onChange={e => setTransferForm({...transferForm, description: e.target.value})} placeholder="Ej: Depósito por ventanilla..." /></div>
               <button type="submit" className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] mt-6 shadow-md hover:bg-[#a39686] transition flex items-center justify-center gap-2">Registrar Movimiento <Check className="w-4 h-4"/></button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-stone-200 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600"><TrendingUp className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Ingresos Reales</p><p className="text-2xl font-black text-stone-900">{formatCurrency(periodIn)}</p></div>
        </div>
        <div className="bg-white border border-stone-200 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 p-4 rounded-2xl text-rose-600"><TrendingDown className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Egresos Reales</p><p className="text-2xl font-black text-stone-900">{formatCurrency(periodOut)}</p></div>
        </div>
        <div className="bg-black p-6 rounded-[2rem] shadow-xl flex items-center gap-4 text-white">
          <div className="bg-[#b5a898]/20 p-4 rounded-2xl text-[#b5a898]"><Wallet className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-bold text-[#b5a898] uppercase tracking-widest">Saldo del Período</p><p className="text-2xl font-black">{formatCurrency(periodBalance)}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-stone-900">
          <thead><tr className="bg-stone-50 text-stone-400 text-[10px] font-bold uppercase tracking-widest border-b border-stone-200"><th className="p-6">Fecha</th><th className="p-6">Movimiento</th><th className="p-6">Caja/Cuenta</th><th className="p-6 text-right">Monto</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {movements.map((m, idx) => (
              <tr key={`${m.id}-${idx}`} className={`transition ${m.isTransfer ? 'bg-stone-50/30 hover:bg-stone-100' : 'hover:bg-stone-50/50'}`}>
                <td className="p-6 text-xs font-bold text-stone-500">{String(m.date)}</td>
                <td className="p-6">
                  <p className="font-black text-sm flex items-center gap-2">
                     {m.isTransfer && <ArrowRightLeft className="w-3.5 h-3.5 text-stone-400" />} {String(m.concept)}
                  </p>
                  <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase truncate max-w-[300px]">{String(m.detail)}</p>
                </td>
                <td className="p-6"><span className={`text-[9px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest border ${m.isTransfer ? 'bg-stone-200 border-stone-300 text-stone-600' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>{String(m.method)}</span></td>
                <td className={`p-6 text-right font-black text-lg ${m.isTransfer ? 'text-stone-500' : m.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {m.amount > 0 ? '+' : ''}{formatCurrency(m.amount)}
                </td>
              </tr>
            ))}
            {movements.length === 0 && <tr><td colSpan="4" className="py-20 text-center text-stone-400"><FileText className="w-12 h-12 mx-auto mb-4 opacity-30" /><p className="font-bold text-xs uppercase tracking-widest">Sin movimientos en este período</p></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- VISTA DE INVENTARIO Y CARGA MASIVA ---

function MassUploadModal({ onUpload, onClose, categoryMargins }) {
  const [step, setStep] = useState('upload');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const fileInputRef = useRef(null);
  const [mapping, setMapping] = useState({ name: -1, category: -1, supplier: -1, stock: -1, minStock: -1, cost: -1, iva: -1, margin: -1, material: -1, dimensions: -1 });
  const SYSTEM_FIELDS = [
    { key: 'name', label: 'Nombre' }, { key: 'category', label: 'Categoría' }, { key: 'supplier', label: 'Proveedor' },
    { key: 'stock', label: 'Stock' }, { key: 'minStock', label: 'Mínimo' }, { key: 'cost', label: 'Costo' },
    { key: 'iva', label: 'IVA' }, { key: 'margin', label: 'Margen' }, { key: 'material', label: 'Material' },
    { key: 'dimensions', label: 'Medidas' }
  ];
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
      if (lines.length === 0) return;
      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => line.split(separator).map(c => c.trim().replace(/"/g, '')));
      setCsvHeaders(headers); setCsvRows(rows);
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const processImport = () => {
    const finalProducts = csvRows.map((row, index) => {
      const category = mapping.category !== -1 && row[mapping.category] ? String(row[mapping.category]) : 'General';
      const cost = mapping.cost !== -1 ? parseLocaleNumber(row[mapping.cost]) : 0;
      const iva = mapping.iva !== -1 ? parseLocaleNumber(row[mapping.iva]) : 21;
      
      const parsedMargin = mapping.margin !== -1 && row[mapping.margin] ? parseLocaleNumber(row[mapping.margin]) : null;
      const catMargin = categoryMargins.find(m => m.category === category);
      const margin = parsedMargin !== null ? parsedMargin : (catMargin ? catMargin.margin : 50);

      const withIva = cost * (1 + iva / 100);
      const finalPrice = Math.round(withIva * (1 + margin / 100));

      return {
        id: Date.now() + index + Math.random(), sku: generateSKU(),
        name: mapping.name !== -1 && row[mapping.name] ? String(row[mapping.name]) : `Importado ${index + 1}`,
        category,
        supplier: mapping.supplier !== -1 && row[mapping.supplier] ? String(row[mapping.supplier]) : 'Sin Proveedor',
        stock: mapping.stock !== -1 ? parseInt(row[mapping.stock]) || 0 : 0,
        minStock: mapping.minStock !== -1 ? parseInt(row[mapping.minStock]) || 5 : 5,
        cost, iva, margin, price: finalPrice, material: mapping.material !== -1 ? String(row[mapping.material]) : '-', dimensions: mapping.dimensions !== -1 ? String(row[mapping.dimensions]) : '-'
      };
    });
    onUpload(finalProducts); setStep('success');
  };

  const handleDownloadTemplate = () => {
    const headers = ['Nombre', 'Categoría', 'Proveedor', 'Stock', 'Stock Mínimo', 'Costo', 'IVA', 'Margen', 'Material', 'Medidas'];
    const rows = [
      ['"Sofá Florencia 3 Cuerpos"', '"Sofás"', '"Tapicería Premium"', 5, 2, 350000, 21, 60, '"Lino Antimanchas"', '"210x90x85"'],
      ['"Mesa de Comedor Oslo"', '"Mesas"', '"Maderera Sur"', 12, 3, 120000, 21, 50, '"Madera Paraíso"', '"160x80x75"']
    ];
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); 
    link.download = 'Plantilla_Inventario.csv';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };
  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="bg-black p-6 flex justify-between items-center text-white">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><UploadCloud className="w-5 h-5 text-[#b5a898]" /> Importador Masivo</h3>
          <button onClick={onClose} className="hover:text-[#b5a898] transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8">
          {step === 'upload' && (
            <div className="text-center space-y-6">
              <FileSpreadsheet className="w-16 h-16 text-stone-300 mx-auto" />
              <h4 className="text-xl font-black text-stone-800">Sube tu Excel (.CSV)</h4>
              <div className="flex flex-col items-center gap-4">
                <button onClick={() => fileInputRef.current.click()} className="bg-black text-white px-8 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-stone-800 transition shadow-md">Seleccionar Archivo</button>
                <button onClick={handleDownloadTemplate} className="text-stone-400 hover:text-stone-800 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition">
                  <Download className="w-3.5 h-3.5" /> Descargar modelo (.CSV)
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
            </div>
          )}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                {SYSTEM_FIELDS.map(f => (
                  <div key={f.key} className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{String(f.label)}</label>
                    <select className="bg-white border border-stone-200 rounded-lg px-3 py-2 font-bold text-stone-800 text-xs" value={mapping[f.key]} onChange={(e) => setMapping({...mapping, [f.key]: parseInt(e.target.value)})}>
                      <option value="-1">Omitir / Automático</option>
                      {csvHeaders.map((h, i) => (<option key={i} value={i}>{String(h)}</option>))}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={processImport} className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-md hover:bg-[#a39686] transition">Procesar Importación</button>
            </div>
          )}
          {step === 'success' && (
            <div className="text-center py-10">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h4 className="text-xl font-black text-stone-900">¡Carga Exitosa!</h4>
              <button onClick={onClose} className="mt-8 bg-black text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px]">Cerrar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductForm({ categories, categoryMargins, editingProduct, onClose, onSave }) {
  const [formData, setFormData] = useState(editingProduct || {
    sku: generateSKU(), name: '', category: '', supplier: '', stock: 0, minStock: 5, cost: 0, iva: 21, margin: 50, price: 0, material: '', dimensions: ''
  });
  const handleCategoryChange = (e) => {
    const selectedCat = e.target.value;
    const defaultMarginObj = categoryMargins.find(m => m.category === selectedCat);
    const newMargin = defaultMarginObj ? defaultMarginObj.margin : 50;
    setFormData(prev => ({ ...prev, category: selectedCat, margin: newMargin }));
  };
  useEffect(() => {
    const costNum = parseFloat(formData.cost) || 0;
    const ivaNum = parseFloat(formData.iva) || 0;
    const marginNum = parseFloat(formData.margin) || 0;
    const withIva = costNum * (1 + ivaNum / 100);
    const final = withIva * (1 + marginNum / 100);
    setFormData(prev => ({ ...prev, price: Math.round(final) }));
  }, [formData.cost, formData.iva, formData.margin]);
  return (
    <div className="bg-white border border-stone-200 rounded-[2rem] overflow-hidden shadow-xl animate-in zoom-in-95">
      <div className="bg-black p-6 flex justify-between items-center text-white">
        <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><PackagePlus className="w-5 h-5 text-[#b5a898]" /> {editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
        <button onClick={onClose} className="hover:text-[#b5a898] transition"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
             <div className="space-y-1"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nombre</label><input required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#b5a898]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
             <div className="space-y-1"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Proveedor</label><input className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#b5a898]" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} /></div>
             <div className="space-y-1"><label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1 text-[#8c8173]">Categoría *</label>
               <select required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#b5a898]" value={formData.category} onChange={handleCategoryChange}>
                 <option value="">Seleccionar...</option>
                 {categories.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
               </select>
             </div>
          </div>
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Stock</label><input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-stone-800 outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(formData.stock)} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Mínimo</label><input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-rose-500 outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(formData.minStock)} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value) || 0})} /></div>
             </div>
             <div className="space-y-1"><label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Material</label><input className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(formData.material)} onChange={e => setFormData({...formData, material: e.target.value})} /></div>
             <div className="space-y-1"><label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Medidas</label><input className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(formData.dimensions)} onChange={e => setFormData({...formData, dimensions: e.target.value})} /></div>
          </div>
          <div className="bg-stone-50 p-6 rounded-[1.5rem] border border-stone-200 flex flex-col justify-center">
             <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-stone-500 uppercase">Costo ($)</span><input type="number" className="bg-white border border-stone-200 rounded-lg px-2 py-1 w-24 text-right font-black outline-none text-sm" value={String(formData.cost)} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value) || 0})} /></div>
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-stone-500 uppercase">IVA %</span><input type="number" className="bg-white border border-stone-200 rounded-lg px-2 py-1 w-16 text-right font-black outline-none text-sm" value={String(formData.iva)} onChange={e => setFormData({...formData, iva: parseFloat(e.target.value) || 0})} /></div>
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-[#b5a898] uppercase">Margen %</span><input type="number" className="bg-white border border-[#b5a898] rounded-lg px-2 py-1 w-16 text-right font-black text-[#8c8173] outline-none text-sm" value={String(formData.margin)} onChange={e => setFormData({...formData, margin: parseFloat(e.target.value) || 0})} /></div>
             </div>
             <div className="border-t border-stone-200 pt-4 text-center">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Precio Final</p>
                <p className="text-3xl font-black text-stone-900 tracking-tight">{formatCurrency(formData.price)}</p>
             </div>
          </div>
        </div>
        <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-stone-800 transition">Guardar Producto</button>
      </form>
    </div>
  );
}

function InventoryView({ products, setProducts, categories, categoryMargins, searchTerm }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isMassLoading, setIsMassLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [editingProduct, setEditingProduct] = useState(null);
  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesSearch = !searchTerm || 
        String(p.name).toLowerCase().includes(searchTerm.toLowerCase()) || 
        String(p.sku).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.supplier).toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);
  const handleExportCSV = () => {
    const headers = ['Nombre', 'Categoría', 'Proveedor', 'Stock', 'Stock Mínimo', 'Costo', 'IVA', 'Margen', 'Material', 'Medidas'];
    let rows = [];
    
    if (products.length > 0) {
      rows = products.map(p => [
        `"${p.name || ''}"`, `"${p.category || ''}"`, `"${p.supplier || ''}"`, 
        p.stock || 0, p.minStock || 0, p.cost || 0, p.iva || 0, p.margin || 0, 
        `"${p.material || ''}"`, `"${p.dimensions || ''}"`
      ]);
    } else {
      rows = [
        ['"Sofá Florencia 3 Cuerpos"', '"Sofás"', '"Tapicería Premium"', 5, 2, 350000, 21, 60, '"Lino Antimanchas"', '"210x90x85"'],
        ['"Mesa de Comedor Oslo"', '"Mesas"', '"Maderera Sur"', 12, 3, 120000, 21, 50, '"Madera Paraíso"', '"160x80x75"']
      ];
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); 
    link.download = products.length > 0 ? `Base_Inventario_${new Date().toISOString().split('T')[0]}.csv` : `Plantilla_Inventario.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 w-full custom-scrollbar">
          <button onClick={() => setSelectedCategory('Todos')} className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition shrink-0 ${selectedCategory === 'Todos' ? 'bg-black text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>Todos</button>
          {categories.map(cat => (<button key={String(cat)} onClick={() => setSelectedCategory(String(cat))} className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition shrink-0 ${selectedCategory === String(cat) ? 'bg-black text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>{String(cat)}</button>))}
        </div>
        {!isAdding && (
          <div className="flex gap-2 shrink-0">
            <button onClick={handleExportCSV} className="bg-white border border-stone-200 text-stone-700 px-4 py-2.5 rounded-xl hover:bg-stone-50 transition shadow-sm flex items-center gap-2" title="Descargar Base / Plantilla"><Download className="w-4 h-4" /> Exportar</button>
            <button onClick={() => { if(confirm('¿Eliminar inventario?')) setProducts([]); }} className="bg-white border border-rose-100 text-rose-500 px-4 py-2.5 rounded-xl hover:bg-rose-50 transition shadow-sm" title="Limpiar"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => setIsMassLoading(true)} className="bg-white border border-stone-200 text-stone-700 px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-50 transition shadow-sm flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Masivo</button>
            <button onClick={() => { setEditingProduct(null); setIsAdding(true); }} className="bg-[#b5a898] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] hover:bg-[#a39686] shadow-md transition flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo</button>
          </div>
        )}
      </div>

      {isMassLoading && <MassUploadModal categoryMargins={categoryMargins} onUpload={(newProds) => setProducts([...newProds, ...products])} onClose={() => setIsMassLoading(false)} />}
      
      {isAdding ? (
        <ProductForm categories={categories} categoryMargins={categoryMargins} editingProduct={editingProduct} onClose={() => { setIsAdding(false); setEditingProduct(null); }} onSave={(prod) => {
            if (editingProduct) setProducts(products.map(p => p.id === prod.id ? prod : p));
            else setProducts([{ ...prod, id: Date.now() }, ...products]);
            setIsAdding(false);
        }} />
      ) : (
        <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden min-h-[400px]">
          {filtered.length === 0 ? (
             <div className="py-32 text-center text-stone-400 opacity-50 flex flex-col items-center">
                <Package className="w-12 h-12 mb-3" />
                <p className="font-bold text-xs uppercase tracking-widest">Sin resultados</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-stone-900">
                <thead><tr className="bg-[#f4f2f0] text-stone-500 text-[10px] font-bold uppercase tracking-widest border-b border-stone-200"><th className="p-6">Producto</th><th className="p-6">Detalles</th><th className="p-6 text-center">Stock</th><th className="p-6 text-right">Precio Lista</th><th className="p-6 text-center">Editar</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map(product => (
                    <tr key={product.id} className="hover:bg-stone-50/50 transition">
                      <td className="p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400"><Armchair className="w-5 h-5" /></div><div><p className="text-[9px] font-black text-[#b5a898] uppercase tracking-wider">{String(product.sku)}</p><p className="font-bold text-[#1a1a1a]">{String(product.name)}</p></div></div></td>
                      <td className="p-6"><p className="text-xs font-bold text-[#333333]">{String(product.supplier)}</p><p className="text-[9px] text-[#a8a096] uppercase font-bold mt-0.5">{String(product.category)} • {String(product.dimensions)}</p></td>
                      <td className="p-6 text-center"><span className={`inline-block px-3 py-1 rounded-md font-black text-xs ${product.stock <= product.minStock ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-700'}`}>{String(product.stock)}</span></td>
                      <td className="p-6 text-right"><p className="text-base font-black text-[#1a1a1a]">{formatCurrency(product.price)}</p><p className="text-[9px] font-bold text-[#8c8173] uppercase mt-0.5">Mrg {String(product.margin)}%</p></td>
                      <td className="p-6 text-center"><button onClick={() => { setEditingProduct(product); setIsAdding(true); }} className="p-2 text-stone-400 hover:text-black hover:bg-stone-100 rounded-lg transition"><Pencil className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- VISTAS VENTAS ---
function SaleDetailModal({ sale, onClose, paymentMethods, paymentBonuses, onUpdateSale }) {
  const subtotal = sale.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const amountCoveredBase = sale.payments?.reduce((acc, p) => {
    const bonus = paymentBonuses.find(b => b.method === p.method)?.value || 0;
    return acc + (p.amount / (1 - (bonus / 100)));
  }, 0) || 0;
  
  const balance = subtotal - amountCoveredBase;
  const actualTotalPaid = sale.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
  const [tempMethod, setTempMethod] = useState('');
  const [tempAmount, setTempAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const currentBonusVal = paymentBonuses.find(b => b.method === tempMethod)?.value || 0;
  
  useEffect(() => {
    if (tempMethod && balance > 0) {
      const maxToPay = balance * (1 - (currentBonusVal / 100));
      setTempAmount(maxToPay.toFixed(2));
    } else {
      setTempAmount('');
    }
  }, [tempMethod, balance, currentBonusVal]);

  const handleAddPayment = () => {
    const a = parseFloat(tempAmount);
    if (!tempMethod || isNaN(a) || a <= 0) return;
    
    const newPayment = {
      id: Date.now() + Math.random(),
      method: tempMethod, amount: a, date: newPaymentDate
    };
    const updatedSale = { ...sale, payments: [...(sale.payments || []), newPayment] };
    onUpdateSale(updatedSale);
    setTempMethod(''); setTempAmount('');
  };

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="bg-black p-6 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><Receipt className="w-5 h-5 text-[#b5a898]" /> Comprobante #{String(sale.id).split('-')[1] || String(sale.id)}</h3>
          <button onClick={onClose} className="hover:text-[#b5a898] transition"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="mb-8">
                 <h4 className="text-[10px] text-stone-400 mb-4 tracking-widest border-b border-stone-200 pb-2 font-bold uppercase">Artículos Vendidos</h4>
                 <table className="w-full text-left">
                    <thead>
                      <tr className="text-[9px] text-stone-400 uppercase tracking-widest"><th className="pb-2">Producto</th><th className="pb-2 text-center">Cant.</th><th className="pb-2 text-right">Subtotal</th></tr>
                    </thead>
                    <tbody className="text-xs">
                       {sale.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-stone-100 last:border-0">
                          <td className="py-3 font-bold text-stone-800">{String(item.name)} <span className="text-[8px] font-black text-[#b5a898] block tracking-widest mt-0.5 uppercase">{String(item.category)}</span></td>
                          <td className="py-3 text-center font-black">{String(item.qty)}</td>
                          <td className="py-3 text-right font-black text-stone-900">{formatCurrency(item.price * item.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
              <div>
                 <h4 className="text-[10px] text-stone-400 mb-4 tracking-widest border-b border-stone-200 pb-2 font-bold uppercase">Pagos Registrados</h4>
                 <div className="flex flex-col gap-3">
                    {sale.payments && sale.payments.map((pay, idx) => (
                      <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 flex justify-between items-center shadow-sm">
                         <div><span className="text-[10px] font-bold text-stone-500 tracking-widest uppercase block">{String(pay.method)}</span><span className="text-[8px] text-stone-400 font-bold tracking-widest uppercase">{pay.date || sale.date}</span></div>
                         <span className="text-sm font-black text-emerald-600">{formatCurrency(pay.amount)}</span>
                      </div>
                    ))}
                    {(!sale.payments || sale.payments.length === 0) && <p className="text-xs font-bold text-rose-500 uppercase">Sin pagos registrados</p>}
                 </div>
              </div>
            </div>

            <div className="flex flex-col justify-between h-full">
               <div>
                 <h4 className="text-[10px] text-stone-400 mb-4 tracking-widest border-b border-stone-200 pb-2 font-bold uppercase">Resumen de Operación</h4>
                 <div className="bg-stone-50 rounded-[2rem] p-8 border border-stone-200 shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-6 text-xs font-bold text-stone-500 uppercase tracking-widest border-b border-stone-200 pb-6">
                         <span>Suma Lista</span><span className="text-stone-800 font-black">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 text-stone-900">
                        <span className="font-black text-xs uppercase tracking-widest text-emerald-600">Total Abonado</span>
                        <div className="text-right"><span className="text-4xl font-black block tracking-tighter text-emerald-600">{formatCurrency(actualTotalPaid)}</span></div>
                      </div>
                      <div className={`mt-6 pt-6 border-t border-stone-200 flex justify-between items-center text-xs font-bold uppercase tracking-widest ${balance > 0.1 ? 'text-rose-500' : 'text-stone-400'}`}>
                        <span>Saldo Pendiente</span><span className="font-black text-lg">{formatCurrency(balance)}</span>
                      </div>
                    </div>
                 </div>
               </div>

               {balance > 0.1 && (
                 <div className="mt-8 bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm">
                   <h4 className="text-[10px] font-bold text-stone-800 uppercase tracking-widest mb-4">Registrar Nuevo Cobro</h4>
                   <div className="space-y-4">
                      <div className="flex gap-2">
                       <input type="date" className="w-36 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none text-stone-600" value={newPaymentDate} onChange={e=>setNewPaymentDate(e.target.value)} />
                       <select className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={tempMethod} onChange={(e)=>setTempMethod(e.target.value)}>
                         <option value="">Medio de Pago...</option>
                         {paymentMethods.map(p => <option key={String(p.name)} value={String(p.name)}>{String(p.name)}</option>)}
                       </select>
                     </div>
                     <div className="flex gap-2">
                       <input type="number" className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-emerald-600 text-sm outline-none" value={tempAmount} onChange={(e)=>setTempAmount(e.target.value)} placeholder="Monto a cobrar..." />
                       <button onClick={handleAddPayment} className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition">Cobrar</button>
                     </div>
                     {currentBonusVal > 0 && tempMethod && (<p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest text-center mt-2">Aplicando {currentBonusVal}% descuento</p>)}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewSaleForm({ products, paymentMethods, categories, paymentBonuses, onClose, onSave, editingSale }) {
  const [saleDate, setSaleDate] = useState(editingSale ? editingSale.date : new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState(editingSale ? editingSale.items : []);
  const [payments, setPayments] = useState(editingSale ? editingSale.payments || [] : []);
  const [productSearch, setProductSearch] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [tempCost, setTempCost] = useState('');
  const [tempIva, setTempIva] = useState('21'); 
  const [tempQty, setTempQty] = useState('1');
  const [showResults, setShowResults] = useState(false);
  const [tempPaymentMethod, setTempPaymentMethod] = useState('');
  const [tempPaymentAmount, setTempPaymentAmount] = useState('');

  const filteredInventory = useMemo(() => {
    if (!productSearch || productSearch.length < 1) return [];
    return products.filter(p => String(p.name).toLowerCase().includes(productSearch.toLowerCase()));
  }, [productSearch, products]);
  const subtotalCart = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const amountCoveredBase = payments.reduce((acc, p) => {
    const bonus = paymentBonuses.find(b => b.method === p.method)?.value || 0;
    return acc + (p.amount / (1 - (bonus / 100)));
  }, 0);
  const balanceBase = subtotalCart - amountCoveredBase;
  const actualTotalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const currentBonusVal = paymentBonuses.find(b => b.method === tempPaymentMethod)?.value || 0;
  const consolidatedBonus = amountCoveredBase - actualTotalPaid;
  const projectedBonus = balanceBase > 0 ? balanceBase * (currentBonusVal / 100) : 0;
  const displayBonus = consolidatedBonus + projectedBonus;
  const displaySaldo = balanceBase > 0 ? balanceBase - projectedBonus : 0;
  
  useEffect(() => {
    if (tempPaymentMethod && balanceBase > 0) {
      setTempPaymentAmount((balanceBase * (1 - (currentBonusVal / 100))).toFixed(2));
    } else if (!tempPaymentMethod) {
      setTempPaymentAmount('');
    }
  }, [tempPaymentMethod, balanceBase, currentBonusVal]);
  
  const handleMaxPayment = () => { if (balanceBase > 0) setTempPaymentAmount((balanceBase * (1 - (currentBonusVal / 100))).toFixed(2)); };
  
  const addToCart = () => {
    const p = parseFloat(tempPrice);
    if (!productSearch || !tempCategory || isNaN(p) || p <= 0) return;
    setCart([...cart, { id: Date.now() + Math.random(), name: productSearch, category: tempCategory, price: p, cost: parseFloat(tempCost)||0, iva: parseFloat(tempIva)||21, qty: parseInt(tempQty)||1 }]);
    setProductSearch('');
    setTempCategory(''); setTempPrice(''); setTempCost(''); setTempQty('1');
  };

  const addPayment = () => {
    const a = parseFloat(tempPaymentAmount);
    if (!tempPaymentMethod || isNaN(a) || a <= 0) return;
    setPayments([...payments, { id: Date.now() + Math.random(), method: tempPaymentMethod, amount: a, date: saleDate }]);
    setTempPaymentMethod(''); setTempPaymentAmount('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-stone-100 pb-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2"><Armchair className="w-5 h-5 text-[#b5a898]" /> 1. Selección de Productos</h4>
            <div className="flex items-center gap-2 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200">
              <Clock className="w-4 h-4 text-stone-400" /><span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Fecha Venta:</span>
              <input type="date" className="bg-transparent text-xs font-bold text-stone-800 outline-none" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
             <div className="space-y-2 relative"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Artículo (Inventario)</label>
              <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setShowResults(true); }} placeholder="Buscar o escribir..." />
              {showResults && filteredInventory.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                   {filteredInventory.map(p => (
                     <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setProductSearch(String(p.name)); setTempCategory(String(p.category)); setTempPrice(String(p.price)); setTempCost(String(p.cost||0)); setTempIva(String(p.iva||21)); setShowResults(false); }} className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-100 flex justify-between items-center transition">
                       <span className="font-bold text-sm text-stone-800">{String(p.name)}</span><span className="text-stone-400 text-[9px] font-black uppercase tracking-widest">{String(p.category)}</span>
                     </button>
                   ))}
                </div>
              )}
            </div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Categoría</label>
              <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={tempCategory} onChange={(e)=>setTempCategory(e.target.value)}>
                <option value="">Seleccione...</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Precio Lista ($)</label>
              <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-[#8c8173] outline-none text-sm" value={tempPrice} onChange={(e)=>setTempPrice(e.target.value)} />
            </div>
            <div className="space-y-2 flex gap-2 items-end"><div className="flex-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Cantidad</label>
              <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-sm outline-none" value={tempQty} onChange={(e)=>setTempQty(e.target.value)} /></div>
              <button type="button" onClick={addToCart} className="bg-black text-white p-3.5 rounded-xl hover:bg-stone-800 transition shadow-sm"><Plus className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="border-t border-stone-100 pt-6 space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div><p className="font-bold text-sm text-stone-800">{item.name}</p><p className="text-[9px] font-black uppercase text-stone-400 tracking-widest">{item.category} • x{item.qty}</p></div>
                <div className="flex items-center gap-6"><p className="font-black text-base text-stone-900">{formatCurrency(item.price * item.qty)}</p>
                <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="p-2 text-stone-300 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
          <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 mb-6 flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-500" /> 2. Registro de Pagos Parciales/Totales</h4>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex justify-between">Medio Abonado {currentBonusVal > 0 && <span className="text-emerald-500">(-{currentBonusVal}%)</span>}</label>
              <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={tempPaymentMethod} onChange={(e)=>setTempPaymentMethod(e.target.value)}>
                <option value="">Seleccione Pago...</option>{paymentMethods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Monto a Cobrar ($)</label>
              <div className="relative"><input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-emerald-600 text-sm pr-16 outline-none" value={tempPaymentAmount} onChange={(e)=>setTempPaymentAmount(e.target.value)} />
              {balanceBase > 0 && tempPaymentMethod && <button type="button" onClick={handleMaxPayment} className="absolute right-2 top-2.5 px-2 py-1 bg-white border border-stone-200 text-[9px] font-bold uppercase rounded text-stone-500 hover:text-emerald-600 shadow-sm transition">Máx</button>}</div>
            </div>
            <button type="button" onClick={addPayment} className="self-end bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition shadow-sm">Añadir Pago</button>
          </div>
          <div className="space-y-3">
            {payments.map(pay => {
               const b = paymentBonuses.find(x => x.method === pay.method)?.value || 0;
               return (
                <div key={pay.id} className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div><span className="font-bold text-sm text-emerald-900 block">{pay.method}</span><span className="text-[9px] text-emerald-700 uppercase font-bold tracking-widest block">Saldó: {formatCurrency(pay.amount / (1 - (b/100)))}</span></div>
                  </div>
                  <div className="flex items-center gap-4"><span className="font-black text-emerald-700 text-base">{formatCurrency(pay.amount)}</span><button onClick={() => setPayments(payments.filter(p => p.id !== pay.id))} className="text-stone-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4"/></button></div>
                </div>
               )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-black text-white rounded-[2.5rem] p-8 shadow-xl sticky top-10 text-center">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-[#b5a898]">{editingSale ? 'Editando Venta' : 'Liquidación Cliente'}</h4>
          <div className="space-y-6">
            <div className="flex justify-between items-center text-stone-400 border-b border-stone-800 pb-4"><span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Suma Lista</span><span className="font-black text-white text-xl">{formatCurrency(subtotalCart)}</span></div>
            <div className="space-y-5">
              <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${displayBonus > 0 ? 'bg-[#b5a898]/20 border-[#b5a898]/30 text-[#b5a898]' : 'bg-transparent border-transparent text-stone-500'}`}><span className="text-[9px] font-bold uppercase tracking-widest">Bonificaciones</span><span className="text-lg font-black">-{formatCurrency(displayBonus)}</span></div>
              <div className="pt-4 text-center"><p className="text-[9px] font-bold uppercase text-stone-500 mb-1 tracking-[0.2em]">Total Final Cobrado</p><p className="text-5xl font-black tracking-tighter text-emerald-400">{formatCurrency(actualTotalPaid)}</p></div>
              <div className={`p-3 rounded-xl flex justify-between items-center transition-colors ${displaySaldo <= 0.1 ? 'text-emerald-500' : 'text-rose-400'}`}><span className="text-[9px] font-bold uppercase tracking-widest">Saldo a cubrir</span><span className="text-sm font-black">{formatCurrency(displaySaldo)}</span></div>
            </div>
          </div>
          <button onClick={() => { if(cart.length>0) onSave({ id: editingSale ? editingSale.id : `V-${Math.floor(Math.random()*9000)+1000}`, items: cart, date: saleDate, total: actualTotalPaid, payments: payments}); }} disabled={cart.length === 0 || balanceBase < -0.1} className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#a39686] transition mt-8 shadow-lg disabled:opacity-10 active:scale-95 flex items-center justify-center gap-2">
            {balanceBase > 0.1 ? 'Vender con Saldo Pendiente' : 'Confirmar Venta'} <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="w-full text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-6 hover:text-white transition">Cancelar y Volver</button>
        </div>
      </div>
    </div>
  );
}

function SalesView({ sales, setSales, products, paymentMethods, taxRules, categories, paymentBonuses }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  
  const filteredSales = useMemo(() => {
    let filtered = sales;
    if (startDate) filtered = filtered.filter(s => s.date >= startDate);
    if (endDate) filtered = filtered.filter(s => s.date <= endDate);
    if (searchTerm) filtered = filtered.filter(s => String(s.id).toLowerCase().includes(searchTerm.toLowerCase()) || s.items.some(i => String(i.name).toLowerCase().includes(searchTerm.toLowerCase())));
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, searchTerm, startDate, endDate]);

  const handleExportCSV = () => {
    const headers = ['Fecha', 'ID Venta', 'Artículos', 'Cant. Total', 'Suma Lista', 'Cobrado Neto', 'Medios de Pago'];
    const rows = filteredSales.map(s => {
      const listTotal = s.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
      const qtyTotal = s.items.reduce((acc, i) => acc + i.qty, 0);
      const methods = s.payments ? s.payments.map(p => p.method).join(' | ') : 'N/A';
      const items = s.items.map(i => i.name).join(' | ');
      return [ s.date, s.id, `"${items}"`, qtyTotal, listTotal, s.total, `"${methods}"` ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Reporte_Ventas_${startDate}_al_${endDate}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const updateSale = (updatedSale) => {
    setSales(sales.map(s => s.id === updatedSale.id ? updatedSale : s));
    setSelectedSaleDetail(updatedSale);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><ShoppingCart className="w-6 h-6" /></div>Ventas Realizadas</h3>
        {!isAdding && (
          <div className="flex gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-2 px-3"><Filter className="w-4 h-4 text-stone-400" /><input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="w-px h-6 bg-stone-200"></div>
              <div className="flex items-center gap-2 px-3"><input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <button onClick={handleExportCSV} className="bg-white text-stone-700 px-4 py-2.5 rounded-xl border border-stone-200 font-bold uppercase tracking-widest text-[10px] hover:bg-stone-50 transition shadow-sm flex items-center gap-2" title="Exportar CSV/Excel"><Download className="w-4 h-4" /> Exportar</button>
            <button onClick={() => { setEditingSale(null); setIsAdding(true); }} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition shadow-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva Venta</button>
          </div>
        )}
      </div>

      {selectedSaleDetail && <SaleDetailModal sale={selectedSaleDetail} onClose={() => setSelectedSaleDetail(null)} paymentMethods={paymentMethods} paymentBonuses={paymentBonuses} onUpdateSale={updateSale} />}

      {isAdding ? <NewSaleForm products={products} paymentMethods={paymentMethods} taxRules={taxRules} categories={categories} paymentBonuses={paymentBonuses} editingSale={editingSale} onClose={() => { setIsAdding(false); setEditingSale(null); }} onSave={(newSale) => { if (editingSale) setSales(sales.map(s => s.id === newSale.id ? newSale : s)); else setSales([newSale, ...sales]); setIsAdding(false); setEditingSale(null); }} /> : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSales.map(sale => {
            const subtotal = sale.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
            const amountCoveredBase = sale.payments?.reduce((acc, p) => acc + (p.amount / (1 - ((paymentBonuses.find(b => b.method === p.method)?.value || 0) / 100))), 0) || 0;
            const balance = subtotal - amountCoveredBase;

            return (
            <div key={sale.id} className="bg-white border border-stone-200 p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition group hover:border-[#b5a898]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center font-black text-stone-400 text-sm group-hover:bg-[#b5a898]/10 group-hover:text-[#b5a898] transition">#{String(sale.id).split('-')[1]}</div>
                <div><h4 className="font-bold text-stone-800 text-base">{sale.items.length === 1 ? String(sale.items[0].name) : `${sale.items.length} productos`}</h4><p className="text-[10px] font-bold uppercase text-stone-400 mt-1 flex items-center gap-1 tracking-widest"><Clock className="w-3 h-3"/> {String(sale.date)}</p></div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col md:items-end gap-1">
                  <p className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(subtotal)}</p>
                  {balance > 0.1 ? <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-md text-[9px] font-black uppercase tracking-widest">Debe {formatCurrency(balance)}</span> : <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest">Cobrado</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedSaleDetail(sale)} className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition shadow-sm ${balance > 0.1 ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-stone-50 text-stone-500 hover:bg-[#b5a898] hover:text-white'}`}>
                    {balance > 0.1 ? 'Cobrar' : 'Comprobante'} <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditingSale(sale); setIsAdding(true); }} className="p-3 bg-stone-50 text-stone-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition" title="Editar Venta"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => {if(confirm("¿Seguro?")) setSales(sales.filter(s => s.id !== sale.id))}} className="p-3 bg-stone-50 text-stone-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition" title="Eliminar Venta"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            )
          })}
          {filteredSales.length === 0 && <div className="py-20 text-center opacity-30"><ShoppingCart className="w-16 h-16 mx-auto mb-4" /><p className="font-bold uppercase tracking-widest text-[10px]">Sin ventas</p></div>}
        </div>
      )}
    </div>
  );
}

// --- VISTA DE COMPRAS ---

function PurchasesView({ purchases, setPurchases, paymentMethods, expenseCategories, searchTerm }) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftExpenses, setDraftExpenses] = useState([]);
  const [form, setForm] = useState({ description: '', category: expenseCategories[0] || 'Otros', paymentMethod: paymentMethods[0]?.name || 'Efectivo', netAmount: '', ivaAmount: '', iibbAmount: '', date: new Date().toISOString().split('T')[0] });
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const filteredPurchases = useMemo(() => {
    let filtered = purchases;
    if (startDate) filtered = filtered.filter(p => p.date >= startDate);
    if (endDate) filtered = filtered.filter(p => p.date <= endDate);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => String(p.description).toLowerCase().includes(term) || String(p.category).toLowerCase().includes(term));
    }
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [purchases, searchTerm, startDate, endDate]);

  const addDraft = (e) => {
    e.preventDefault();
    if (!form.description || !form.netAmount) return;
    const net = parseFloat(form.netAmount) || 0;
    const iva = parseFloat(form.ivaAmount) || 0;
    const iibb = parseFloat(form.iibbAmount) || 0;
    setDraftExpenses([{ ...form, id: Date.now() + Math.random(), netAmount: net, amount: net + iva + iibb, ivaAmount: iva, iibbAmount: iibb }, ...draftExpenses]);
    setForm({...form, description: '', netAmount: '', ivaAmount: '', iibbAmount: ''});
  };

  const batchNet = draftExpenses.reduce((sum, item) => sum + item.netAmount, 0);
  const batchIva = draftExpenses.reduce((sum, item) => sum + item.ivaAmount, 0);
  const batchIibb = draftExpenses.reduce((sum, item) => sum + item.iibbAmount, 0);
  const batchTotal = draftExpenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900"><div className="bg-rose-500/10 p-3 rounded-2xl text-rose-600 shadow-sm"><ShoppingBag className="w-6 h-6" /></div>Gastos Operativos</h3>
        {!isAdding && (
          <div className="flex gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-stone-200">
              <div className="flex items-center gap-2 px-3"><Filter className="w-4 h-4 text-stone-400" /><input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div className="w-px h-6 bg-stone-200"></div>
              <div className="flex items-center gap-2 px-3"><input type="date" className="bg-transparent text-sm font-bold text-stone-800 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <button onClick={() => setIsAdding(true)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition shadow-sm flex items-center gap-2"><Plus className="w-4 h-4 text-[#b5a898]" /> Nuevo Egreso</button>
          </div>
        )}
      </div>
      {isAdding ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95">
          <div className="lg:col-span-1 bg-white border border-rose-200 rounded-[2rem] p-6 shadow-md h-fit">
            <form onSubmit={addDraft} className="space-y-4 text-stone-900">
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Fecha</label><input type="date" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Concepto / Referencia</label><input required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descripción..." /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Categoría P&L</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Medio Pago</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>{paymentMethods.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}</select></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Neto ($)</label><input required type="number" step="0.01" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-black text-stone-800 outline-none" value={String(form.netAmount)} onChange={e => setForm({...form, netAmount: e.target.value})} placeholder="Monto..." /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-emerald-600 uppercase">IVA ($)</label><input type="number" step="0.01" className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm font-black text-emerald-700 outline-none" value={String(form.ivaAmount)} onChange={e => setForm({...form, ivaAmount: e.target.value})} placeholder="IVA" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-emerald-600 uppercase">IIBB ($)</label><input type="number" step="0.01" className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm font-black text-emerald-700 outline-none" value={String(form.iibbAmount)} onChange={e => setForm({...form, iibbAmount: e.target.value})} placeholder="IIBB" /></div>
              </div>
              <div className="bg-stone-100 p-4 rounded-xl flex justify-between items-center border border-stone-200 mt-2">
                 <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Total a Pagar</span>
                 <span className="text-xl font-black text-rose-600">{formatCurrency((parseFloat(form.netAmount)||0) + (parseFloat(form.ivaAmount)||0) + (parseFloat(form.iibbAmount)||0))}</span>
              </div>
              <button type="submit" className="w-full bg-black text-white py-3 rounded-lg font-bold uppercase text-[10px] mt-4 shadow-sm">Añadir al Lote</button>
            </form>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Lote a registrar</h4>
              <div className="space-y-2">{draftExpenses.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div>
                     <p className="font-bold text-stone-800 text-sm">{String(item.description)}</p>
                     <p className="text-[9px] font-bold uppercase text-stone-400 tracking-widest">{String(item.category)} • {String(item.paymentMethod)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="text-right">
                        <p className="font-black text-rose-600 text-base">{formatCurrency(item.amount)}</p>
                        <p className="text-[9px] font-bold text-stone-400 uppercase">Neto: {formatCurrency(item.netAmount)}</p>
                     </div>
                     <button onClick={() => setDraftExpenses(draftExpenses.filter(i => i.id !== item.id))} className="p-2 text-stone-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}</div>
            </div>
            
            {draftExpenses.length > 0 && (
               <div className="bg-stone-900 text-white rounded-[2rem] p-8 shadow-xl">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b5a898] mb-6 border-b border-stone-800 pb-4">Totalizador del Lote</h4>
                  <div className="space-y-4 mb-8">
                     <div className="flex justify-between items-center text-stone-400 text-xs font-bold uppercase tracking-widest">
                        <span>Costo Neto Total</span><span className="text-white">{formatCurrency(batchNet)}</span>
                     </div>
                     <div className="flex justify-between items-center text-emerald-500 text-xs font-bold uppercase tracking-widest">
                        <span>Impuestos Recuperables (IVA + IIBB)</span><span>{formatCurrency(batchIva + batchIibb)}</span>
                     </div>
                     <div className="flex justify-between items-center pt-4 border-t border-stone-800 text-sm font-black uppercase tracking-widest text-rose-400">
                        <span>Total a Egresar (Caja)</span><span className="text-2xl">{formatCurrency(batchTotal)}</span>
                     </div>
                  </div>
                  <button onClick={() => { setPurchases([...draftExpenses, ...purchases]); setDraftExpenses([]); setIsAdding(false); }} className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-[#a39686] transition">Confirmar Salida de Caja</button>
               </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-stone-900">
            <thead><tr className="bg-[#f4f2f0] text-stone-400 text-[10px] font-bold uppercase tracking-widest border-b border-stone-200"><th className="p-6">Fecha</th><th className="p-6">Detalle Operativo</th><th className="p-6 text-right">Monto</th><th className="p-6 text-center">Borrar</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-stone-50/50 transition">
                  <td className="p-6 text-stone-400 text-xs font-bold"><div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {String(p.date)}</div></td>
                  <td className="p-6"><p className="font-bold text-stone-800 text-sm">{String(p.description)}</p><div className="flex gap-2 mt-1"><span className="text-[8px] bg-black text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider">{String(p.category)}</span><span className="text-[8px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded uppercase font-bold tracking-wider border border-stone-200">{String(p.paymentMethod)}</span></div></td>
                  <td className="p-6 text-right"><p className="font-black text-rose-600 text-lg">-{formatCurrency(p.amount)}</p><p className="text-[9px] font-bold text-stone-400 uppercase mt-0.5">Neto: {formatCurrency(p.netAmount)}</p></td>
                  <td className="p-6 text-center"><button onClick={() => setPurchases(purchases.filter(x => x.id !== p.id))} className="p-3 text-stone-300 hover:text-red-500 transition hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPurchases.length === 0 && <div className="py-20 text-center opacity-30"><ShoppingBag className="w-16 h-16 mx-auto mb-4" /><p className="font-bold uppercase tracking-widest text-[10px]">Sin gastos operativos</p></div>}
        </div>
      )}
    </div>
  );
}

// --- VISTAS VARIABLES ---

function MarginManager({ categories, categoryMargins, setCategoryMargins }) {
  const getMargin = (cat) => { const m = categoryMargins.find(x => x.category === cat); return m ? m.margin : 50; };
  const updateMargin = (cat, val) => { const num = parseFloat(val) || 0; const exists = categoryMargins.find(x => x.category === cat); if (exists) setCategoryMargins(categoryMargins.map(x => x.category === cat ? { ...x, margin: num } : x)); else setCategoryMargins([...categoryMargins, { category: cat, margin: num }]); };
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Percent className="w-6 h-6" /></div><h3 className="text-xl font-black">Márgenes Predeterminados</h3></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {categories.map(cat => (
           <div key={cat} className="bg-white border p-5 rounded-xl flex justify-between items-center transition shadow-sm border-stone-200 hover:border-[#b5a898]"><span className="font-bold text-stone-800 text-sm uppercase">{String(cat)}</span><div className="flex items-center gap-2"><input type="number" className="w-20 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-right font-black text-[#8c8173] outline-none" value={String(getMargin(cat))} onChange={(e) => updateMargin(cat, e.target.value)} /><span className="text-stone-400 font-bold">%</span></div></div>
         ))}
      </div>
    </div>
  );
}

function AccountManager({ accounts, setAccounts }) {
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const handleAdd = (e) => {
    e.preventDefault();
    if(newName.trim() !== '') {
      setAccounts([...accounts, { id: Date.now(), name: newName.trim(), initialBalance: parseFloat(newBalance) || 0 }]);
      setNewName(''); setNewBalance('');
    }
  };

  const handleSave = (id) => {
    if(editName.trim() !== '') {
      setAccounts(accounts.map(acc => acc.id === id ? { ...acc, name: editName.trim(), initialBalance: parseFloat(editBalance) || 0 } : acc));
      setEditingId(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Landmark className="w-6 h-6" /></div><h3 className="text-xl font-black">Cuentas y Cajas</h3></div>
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 mb-8">
        <input type="text" placeholder="Nombre (Ej: Caja Fuerte)" className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input type="number" placeholder="Saldo Inicial ($)" className="w-48 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 font-black text-emerald-700 text-sm outline-none" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />
        <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest">Crear</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className={`bg-white border p-4 rounded-xl flex flex-col justify-between group shadow-sm transition ${editingId === acc.id ? 'border-[#b5a898] ring-2 ring-[#b5a898]/20' : 'border-stone-200'}`}>
            {editingId === acc.id ? (
              <div className="space-y-3">
                <input autoFocus className="w-full bg-stone-50 border-none outline-none font-bold text-stone-800 py-2 px-3 rounded-lg text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <input type="number" className="w-full bg-emerald-50 border-none outline-none font-black text-emerald-700 py-2 px-3 rounded-lg text-sm" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
                <button onClick={() => handleSave(acc.id)} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest">Guardar</button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2"><span className="font-bold text-stone-800 text-sm truncate pr-2">{acc.name}</span><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => { setEditingId(acc.id); setEditName(acc.name); setEditBalance(acc.initialBalance); }} className="p-1.5 text-stone-400 hover:text-[#b5a898] hover:bg-stone-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => setAccounts(accounts.filter(i => i.id !== acc.id))} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button></div></div>
                <div className="bg-stone-50 px-3 py-2 rounded-lg border border-stone-100"><span className="text-[9px] font-bold text-stone-400 uppercase block mb-0.5">Saldo Inicial</span><span className="font-black text-emerald-600">{formatCurrency(acc.initialBalance)}</span></div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VariableManager({ title, list, setList, icon: Icon, placeholder }) {
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');
  const addItem = (e) => { e.preventDefault(); if (newItem.trim() && !list.includes(newItem)) { setList([...list, newItem.trim()]); setNewItem(''); } };
  const startEdit = (index, value) => { setEditingIndex(index); setEditValue(value); };
  const saveEdit = (index) => { if (editValue.trim()) { const newList = [...list]; newList[index] = editValue.trim(); setList(newList); setEditingIndex(null); } };
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Icon className="w-6 h-6" /></div><h3 className="text-xl font-black">{title}</h3></div>
      <form onSubmit={addItem} className="flex gap-3 mb-8"><input type="text" placeholder={placeholder} className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none" value={newItem} onChange={(e) => setNewItem(e.target.value)} /><button type="submit" className="bg-black text-white px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest">Agregar</button></form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((item, index) => (
          <div key={index} className={`bg-white border p-4 rounded-xl flex justify-between items-center group shadow-sm transition ${editingIndex === index ? 'border-[#b5a898] ring-2 ring-[#b5a898]/20' : 'border-stone-200'}`}>
            {editingIndex === index ? (
              <div className="flex-1 flex gap-2"><input autoFocus className="flex-1 bg-stone-50 border-none outline-none font-bold text-stone-800 py-1 px-3 rounded-lg text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(index)} /><button onClick={() => saveEdit(index)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button></div>
            ) : (
              <><span className="font-bold text-stone-800 text-sm">{item}</span><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => startEdit(index, item)} className="p-2 text-stone-400 hover:text-[#b5a898] hover:bg-stone-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => setList(list.filter(i => i !== item))} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button></div></>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentMethodManager({ paymentMethods, setPaymentMethods, accounts }) {
  const [newName, setNewName] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [editingName, setEditingName] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAccount, setEditAccount] = useState('');
  const addItem = (e) => { e.preventDefault(); if (newName.trim() && newAccount && !paymentMethods.find(p => p.name === newName.trim())) { setPaymentMethods([...paymentMethods, { name: newName.trim(), account: newAccount }]); setNewName(''); setNewAccount(''); } };
  
  const saveEdit = (oldName) => {
    if (editName.trim() && editAccount) {
      setPaymentMethods(paymentMethods.map(p => p.name === oldName ? { name: editName.trim(), account: editAccount } : p));
      setEditingName(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><CreditCard className="w-6 h-6" /></div><h3 className="text-xl font-black">Formas de Pago</h3></div>
      <form onSubmit={addItem} className="flex flex-wrap gap-3 mb-8">
        <input type="text" placeholder="Ej: Tarjeta de Débito" className="flex-1 min-w-[200px] bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <select className="flex-1 min-w-[200px] bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none" value={newAccount} onChange={(e) => setNewAccount(e.target.value)}><option value="">Vincular a Cuenta...</option>{accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}</select>
        <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest">Enlazar</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods.map((item, idx) => (
          <div key={idx} className={`bg-white border p-4 rounded-xl flex flex-col justify-between group shadow-sm transition ${editingName === item.name ? 'border-[#b5a898] ring-2 ring-[#b5a898]/20' : 'border-stone-200'}`}>
            {editingName === item.name ? (
              <div className="space-y-3">
                <input autoFocus className="w-full bg-stone-50 border-none outline-none font-bold text-stone-800 py-2 px-3 rounded-lg text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <select className="w-full bg-stone-50 border-none outline-none font-bold text-stone-800 py-2 px-3 rounded-lg text-sm" value={editAccount} onChange={(e) => setEditAccount(e.target.value)}>{accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}</select>
                <div className="flex gap-2">
                   <button onClick={() => saveEdit(item.name)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest">Guardar</button>
                   <button onClick={() => setEditingName(null)} className="flex-1 bg-stone-200 text-stone-600 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-stone-800 text-sm block">{item.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => { setEditingName(item.name); setEditName(item.name); setEditAccount(item.account); }} className="p-1.5 text-stone-400 hover:text-[#b5a898] hover:bg-stone-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setPaymentMethods(paymentMethods.filter(i => i.name !== item.name))} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="bg-stone-50 px-3 py-2 rounded-lg border border-stone-100"><span className="text-[9px] font-bold text-stone-400 uppercase block mb-0.5">⮑ {item.account}</span></div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BonusManager({ paymentBonuses, setPaymentBonuses, paymentMethods }) {
  const [newBonus, setNewBonus] = useState({ method: '', value: '' });
  const [editingId, setEditingId] = useState(null);
  const [editMethod, setEditMethod] = useState('');
  const [editValue, setEditValue] = useState('');
  const saveEdit = (id) => {
    if (editMethod && editValue) {
      setPaymentBonuses(paymentBonuses.map(b => b.id === id ? { ...b, method: editMethod, value: parseFloat(editValue) } : b));
      setEditingId(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex items-center gap-3 mb-8"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Gift className="w-6 h-6" /></div><h3 className="text-xl font-black text-stone-900">Bonificaciones Comerciales</h3></div>
      <div className="flex flex-wrap gap-4 items-end mb-8 bg-white p-6 rounded-[1.5rem] border border-stone-200 shadow-sm">
        <div className="flex-1 min-w-[200px] space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Medio Pago</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 font-bold text-sm outline-none" value={newBonus.method} onChange={(e)=>setNewBonus({...newBonus, method: e.target.value})}><option value="">Seleccione...</option>{paymentMethods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div>
        <div className="w-32 space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Valor (%)</label><div className="relative"><input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 font-black text-sm pr-8 outline-none" value={String(newBonus.value)} onChange={(e)=>setNewBonus({...newBonus, value: e.target.value})} /><Percent className="absolute right-3 top-3.5 w-3.5 h-3.5 text-stone-400"/></div></div>
        <button onClick={() => { if(newBonus.method && newBonus.value) { setPaymentBonuses([...paymentBonuses.filter(x=>x.method!==newBonus.method), { ...newBonus, id: Date.now(), value: parseFloat(newBonus.value) }]); setNewBonus({ method: '', value: '' }); } }} className="bg-black text-white px-8 py-3 rounded-lg font-bold uppercase text-[10px] tracking-widest">Configurar</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentBonuses.map(b => (
          <div key={b.id} className={`bg-stone-50 border p-5 rounded-xl flex flex-col justify-between group shadow-sm transition ${editingId === b.id ? 'border-[#b5a898] ring-2 ring-[#b5a898]/20' : 'border-stone-200'}`}>
            {editingId === b.id ? (
              <div className="space-y-3">
                <select className="w-full bg-white border border-stone-200 outline-none font-bold text-stone-800 py-2 px-3 rounded-lg text-sm" value={editMethod} onChange={(e) => setEditMethod(e.target.value)}>{paymentMethods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select>
                <div className="relative"><input type="number" className="w-full bg-white border border-stone-200 outline-none font-black text-stone-800 py-2 px-3 rounded-lg text-sm pr-8" value={editValue} onChange={(e) => setEditValue(e.target.value)} /><Percent className="absolute right-2 top-2.5 w-3.5 h-3.5 text-stone-400"/></div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(b.id)} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest">Guardar</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-stone-200 text-stone-600 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center w-full">
                <div><p className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-0.5">{b.method}</p><p className="text-xl font-black text-[#8c8173]">{b.value}% OFF</p></div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => { setEditingId(b.id); setEditMethod(b.method); setEditValue(b.value); }} className="p-1.5 text-stone-400 hover:text-[#b5a898] hover:bg-white rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setPaymentBonuses(paymentBonuses.filter(x => x.id !== b.id))} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaxManager({ taxRules, setTaxRules, categories, paymentMethods, taxConcepts, setTaxConcepts }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newRule, setNewRule] = useState({ category: '', paymentMethod: '', concepts: [] });
  const [newConcept, setNewConcept] = useState({ name: '', value: '', base: 'Precio Lista c/IVA' });
  const [isCreatingConcept, setIsCreatingConcept] = useState(false);
  const [customConcept, setCustomConcept] = useState('');
  
  const handleSaveRule = () => { 
    if (newRule.category && newRule.paymentMethod && newRule.concepts.length > 0) { 
      if (editingId) {
        setTaxRules(taxRules.map(r => r.id === editingId ? { ...newRule, id: editingId } : r));
      } else {
        setTaxRules([...taxRules, { ...newRule, id: Date.now() }]);
      }
      setNewRule({ category: '', paymentMethod: '', concepts: [] }); 
      setEditingId(null);
      setShowForm(false); 
    } 
  };
  const startEdit = (rule) => {
    setEditingId(rule.id);
    setNewRule(rule);
    setShowForm(true);
  };
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Coins className="w-6 h-6" /></div><h3 className="text-xl font-black text-stone-900">Reglas Financieras e Impuestos</h3></div>{!showForm && <button onClick={() => { setShowForm(true); setEditingId(null); setNewRule({ category: '', paymentMethod: '', concepts: [] }); }} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva Regla</button>}</div>
      {showForm && (
        <div className="bg-white border border-[#b5a898]/30 rounded-[2rem] p-8 mb-8 shadow-lg relative">
          <h4 className="font-black text-[#b5a898] text-xs uppercase tracking-widest mb-6">{editingId ? 'Editando Regla' : 'Nueva Regla Financiera'}</h4>
          <button onClick={() => { setShowForm(false); setEditingId(null); setNewRule({ category: '', paymentMethod: '', concepts: [] }); }} className="absolute top-8 right-8 text-stone-400 hover:text-stone-800 transition"><X className="w-5 h-5"/></button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Categoría</label><select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={newRule.category} onChange={(e) => setNewRule({...newRule, category: e.target.value})}><option value="">Seleccione...</option><option value="Todas">Todas</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Medio Pago</label><select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={newRule.paymentMethod} onChange={(e) => setNewRule({...newRule, paymentMethod: e.target.value})}><option value="">Seleccione...</option><option value="Todas">Todas</option>{paymentMethods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div>
          </div>
          <div className="border-t border-stone-100 pt-6 mb-6">
            <div className="flex flex-wrap gap-4 items-end mb-6 bg-stone-50 p-6 rounded-[1.5rem]">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Concepto P&L</label>
                {isCreatingConcept ? (
                   <div className="flex items-center gap-2"><input type="text" className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none" placeholder="Nombre..." value={customConcept} onChange={e => setCustomConcept(e.target.value)} autoFocus /><button onClick={() => { if (customConcept.trim()) { if (!taxConcepts.includes(customConcept.trim())) setTaxConcepts([...taxConcepts, customConcept.trim()]); setNewConcept({...newConcept, name: customConcept.trim()}); setCustomConcept(''); setIsCreatingConcept(false); } }} className="p-2.5 bg-black text-white rounded-lg"><Check className="w-4 h-4"/></button></div>
                ) : (
                   <select className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none" value={newConcept.name} onChange={(e) => e.target.value === '__NEW__' ? setIsCreatingConcept(true) : setNewConcept({...newConcept, name: e.target.value})}><option value="">Seleccionar...</option>{taxConcepts.map(opt => <option key={opt} value={opt}>{opt}</option>)}<option value="__NEW__" className="text-[#b5a898]">+ Nuevo...</option></select>
                )}
              </div>
              <div className="w-48 space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Base Cálculo</label><select className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none" value={newConcept.base} onChange={(e) => setNewConcept({...newConcept, base: e.target.value})}><option value="Precio Lista c/IVA">Lista c/IVA (Total)</option><option value="Lista s/IVA (Neto)">Lista s/IVA (Neto)</option><option value="CMV (Costo Origen)">CMV (Costo Origen)</option></select></div>
              <div className="w-24 space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Valor %</label><input type="number" className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-black outline-none text-rose-600" value={newConcept.value} onChange={(e) => setNewConcept({...newConcept, value: e.target.value})} /></div>
              <button onClick={() => { if(newConcept.name && newConcept.value) { setNewRule({ ...newRule, concepts: [...newRule.concepts, { ...newConcept, value: parseFloat(newConcept.value) }] }); setNewConcept({ name: '', value: '', base: 'Precio Lista c/IVA' }); } }} className="bg-[#b5a898] text-white h-[42px] px-6 rounded-lg font-bold text-[10px] uppercase tracking-widest">Añadir</button>
            </div>
            <div className="space-y-3">{newRule.concepts.map((c, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white border border-stone-100 px-5 py-3 rounded-xl shadow-sm">
                <span className="font-bold text-sm text-stone-800">{c.name} <span className="text-[9px] text-stone-400 block mt-0.5">Base: {c.base}</span></span>
                <div className="flex items-center gap-4">
                  <span className="font-black text-rose-600">{c.value}%</span>
                  <button onClick={() => setNewRule({...newRule, concepts: newRule.concepts.filter((_, i) => i !== idx)})} className="text-stone-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}</div>
          </div>
          <button onClick={handleSaveRule} className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-stone-800 transition">{editingId ? 'Guardar Cambios' : 'Guardar Regla'}</button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {taxRules.map(rule => (
          <div key={rule.id} className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between shadow-sm group transition gap-4">
            <div className="flex items-center gap-3"><span className="bg-black text-white px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">{rule.category}</span><Plus className="w-3.5 h-3.5 text-stone-400" /><span className="bg-stone-100 text-[#8c8173] px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">{rule.paymentMethod}</span></div>
            <div className="flex items-center gap-4">
              <div className="flex gap-4 flex-wrap justify-end">
                {rule.concepts.map((c,i)=>(<div key={i} className="text-right bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-100"><p className="text-[9px] font-bold text-stone-500">{c.name}</p><p className="font-black text-rose-500 text-sm">{c.value}%</p></div>))}
              </div>
              <div className="flex flex-col gap-1 ml-2 opacity-0 group-hover:opacity-100 transition">
                 <button onClick={() => startEdit(rule)} className="p-2 text-stone-400 hover:text-[#b5a898] bg-stone-50 hover:bg-stone-100 rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>
                 <button onClick={() => setTaxRules(taxRules.filter(r => r.id !== rule.id))} className="p-2 text-stone-400 hover:text-red-500 bg-stone-50 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
       ))}
      </div>
    </div>
  );
}

function LabelPrinterView({ products, categories, paymentBonuses }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Obtenemos el descuento de Efectivo configurado en el ERP (Si no existe, es 0)
  const cashBonus = paymentBonuses?.find(b => b.method.toLowerCase().includes('efectivo'))?.value || 0;
  
  const [config, setConfig] = useState({
    width: 50, height: 30, // mm (Dimensiones de 1 sola etiqueta)
    columns: 1, gap: 2,    // Configuración de Bobina (Bandas y separación)
    font: 'font-sans', align: 'text-center',
    showName: true, nameSize: 11, nameBold: true,
    showDimensions: true, dimensionsSize: 9, dimensionsBold: false,
    showCustom: false, customText: 'OFERTA ESPECIAL', customSize: 9, customBold: true,
    showListPrice: true, listPriceSize: 9, listPriceBold: false,
    showCashPrice: true, cashPriceSize: 14, cashPriceBold: true,
  });
  const filteredSearch = useMemo(() => {
    if (search.length < 2) return [];
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));
  }, [search, products]);
  const addProduct = (prod) => {
    if (!selectedItems.find(i => i.id === prod.id)) {
      setSelectedItems([{ ...prod, printQty: 1 }, ...selectedItems]);
    }
    setSearch('');
  };

  const addCategory = () => {
    if (!selectedCategory) return;
    const catProds = products.filter(p => p.category === selectedCategory);
    const newItems = catProds.filter(cp => !selectedItems.find(i => i.id === cp.id)).map(p => ({ ...p, printQty: 1 }));
    setSelectedItems([...newItems, ...selectedItems]);
    setSelectedCategory('');
  };

  const updateQty = (id, delta) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        const currentQty = parseInt(item.printQty) || 0;
        const newQty = Math.max(1, currentQty + delta);
        return { ...item, printQty: newQty };
      }
      return item;
    }));
  };

  const handleExactQty = (id, val) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        return { ...item, printQty: val };
      }
      return item;
    }));
  };

  const handlePrint = () => {
    if (selectedItems.length === 0) {
      alert("Añade al menos un producto para imprimir.");
      return;
    }
    window.print();
  };

  const totalLabels = selectedItems.reduce((acc, item) => acc + (parseInt(item.printQty) || 0), 0);
  // Aplanar la lista de etiquetas y dividirlas en filas según las bandas de la bobina
  const allLabelsToPrint = useMemo(() => {
    const arr = [];
    selectedItems.forEach(item => {
      const qty = parseInt(item.printQty) || 0;
      for(let i=0; i<qty; i++) arr.push(item);
    });
    return arr;
  }, [selectedItems]);
  const labelChunks = useMemo(() => {
    const chunks = [];
    const cols = parseInt(config.columns) || 1;
    for (let i = 0; i < allLabelsToPrint.length; i += cols) {
        chunks.push(allLabelsToPrint.slice(i, i + cols));
    }
    return chunks;
  }, [allLabelsToPrint, config.columns]);
  // Calcular el Ancho Total de la Hoja (Página) sumando las columnas y sus separaciones
  const colsNum = parseInt(config.columns) || 1;
  const pageWidth = (parseFloat(config.width) * colsNum) + (parseFloat(config.gap) * (colsNum - 1));
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{`
        @media print {
          /* Esconder elementos del ERP */
          header, aside, .no-print { display: none !important; }
          main, .flex-1 { overflow: visible !important; padding: 0 !important; background: white !important; }
          body { background: white; }
           
          /* Configuración de Hoja Dinámica considerando el Ancho Total de la Bobina */
          @page { size: ${pageWidth}mm ${config.height}mm; margin: 0; }
          
          #print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="flex items-center gap-3 mb-4 text-stone-900 no-print">
        <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Printer className="w-6 h-6" /></div>
        <h3 className="text-xl font-bold">Impresor de Etiquetas</h3>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 no-print">
        
        {/* PANEL IZQUIERDO: SELECCIÓN */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm">
            <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest mb-6 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-[#b5a898]" /> 1. Elegir Productos</h4>
            
            <div className="space-y-4 mb-8">
               <div className="space-y-1 relative">
                 <label className="text-[10px] font-bold text-stone-500 uppercase">Buscar Artículo</label>
                 <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                    <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ej: Sofá Florencia..." />
                 </div>
                 {filteredSearch.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                       {filteredSearch.map(p => (
                         <button key={p.id} onClick={() => addProduct(p)} className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                           <span className="font-bold text-sm text-stone-800">{p.name}</span><span className="text-[10px] font-black text-emerald-600">{formatCurrency(p.price)}</span>
                         </button>
                       ))}
                    </div>
                 )}
               </div>

               <div className="flex gap-2 items-end border-t border-stone-100 pt-4">
                 <div className="flex-1 space-y-1">
                   <label className="text-[10px] font-bold text-stone-500 uppercase">Categoría Completa</label>
                   <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 font-bold text-sm outline-none" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                     <option value="">Seleccionar...</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <button onClick={addCategory} className="bg-stone-800 text-white p-2.5 rounded-xl hover:bg-black transition"><PlusSquare className="w-5 h-5" /></button>
               </div>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50 h-[300px] flex flex-col">
               <div className="bg-stone-100 p-3 border-b border-stone-200 flex justify-between items-center text-[10px] font-bold text-stone-500 uppercase tracking-widest shrink-0">
                  <span>En Cola ({selectedItems.length})</span><span>Copias</span>
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {selectedItems.map(item => (
                    <div key={item.id} className="bg-white border border-stone-100 p-3 rounded-lg flex justify-between items-center shadow-sm">
                       <div className="flex-1 truncate pr-2">
                         <p className="text-xs font-bold text-stone-800 truncate">{item.name}</p>
                         <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{item.dimensions}</p>
                       </div>
                       <div className="flex items-center gap-3 shrink-0">
                         <div className="flex items-center bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
                            <button onClick={() => updateQty(item.id, -1)} className="px-2.5 py-1 text-stone-500 hover:bg-stone-200 hover:text-black font-black transition">-</button>
                            <input 
                               type="number" 
                               min="1"
                               className="w-10 py-1 text-center text-xs font-black bg-transparent outline-none [&::-webkit-inner-spin-button]:appearance-none" 
                               value={item.printQty} 
                               onChange={(e) => handleExactQty(item.id, e.target.value)} 
                               onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) handleExactQty(item.id, 1); }}
                            />
                            <button onClick={() => updateQty(item.id, 1)} className="px-2.5 py-1 text-stone-500 hover:bg-stone-200 hover:text-black font-black transition">+</button>
                         </div>
                         <button onClick={() => setSelectedItems(selectedItems.filter(i => i.id !== item.id))} className="text-stone-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                  ))}
                  {selectedItems.length === 0 && <div className="h-full flex items-center justify-center text-stone-400 text-xs font-bold uppercase tracking-widest">Cola Vacía</div>}
               </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: DISEÑO Y PREVIEW */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm flex-1">
            <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Type className="w-4 h-4 text-[#b5a898]" /> 2. Formato y Bobina</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
               <div className="space-y-4">
                 <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3 border-b border-stone-200 pb-2">Tamaño de 1 Etiqueta</p>
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-stone-400 uppercase">Ancho (mm)</label><input type="number" className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-black outline-none" value={config.width} onChange={e => setConfig({...config, width: e.target.value})} /></div>
                      <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-stone-400 uppercase">Alto (mm)</label><input type="number" className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-black outline-none" value={config.height} onChange={e => setConfig({...config, height: e.target.value})} /></div>
                    </div>
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3 border-b border-stone-200 pb-2">Distribución de Bobina</p>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-stone-400 uppercase">Bandas (Col)</label><input type="number" min="1" className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-black outline-none text-[#b5a898]" value={config.columns} onChange={e => setConfig({...config, columns: e.target.value})} /></div>
                      <div className="flex-1 space-y-1"><label className="text-[9px] font-bold text-stone-400 uppercase">Gap/Separación (mm)</label><input type="number" min="0" className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm font-black outline-none" value={config.gap} onChange={e => setConfig({...config, gap: e.target.value})} /></div>
                    </div>
                  </div>

                 <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3 border-b border-stone-200 pb-2">Tipografía Base</p>
                    <div className="flex gap-2">
                       <select className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" value={config.font} onChange={e => setConfig({...config, font: e.target.value})}>
                          <option value="font-sans">Sans-Serif (Moderna)</option>
                          <option value="font-serif">Serif (Clásica)</option>
                          <option value="font-mono">Monoespaciada</option>
                       </select>
                       <div className="flex bg-white border border-stone-200 rounded-lg overflow-hidden">
                          <button onClick={() => setConfig({...config, align: 'text-left'})} className={`p-2 ${config.align === 'text-left' ? 'bg-stone-200 text-black' : 'text-stone-400'}`}><AlignLeft className="w-4 h-4"/></button>
                          <button onClick={() => setConfig({...config, align: 'text-center'})} className={`p-2 ${config.align === 'text-center' ? 'bg-stone-200 text-black' : 'text-stone-400'}`}><AlignCenter className="w-4 h-4"/></button>
                          <button onClick={() => setConfig({...config, align: 'text-right'})} className={`p-2 ${config.align === 'text-right' ? 'bg-stone-200 text-black' : 'text-stone-400'}`}><AlignRight className="w-4 h-4"/></button>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 border-b border-stone-200 pb-2">Contenido a Imprimir</p>
                  
                  {/* Config Name */}
                  <div className="flex items-center justify-between gap-3">
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[#b5a898] w-4 h-4" checked={config.showName} onChange={e => setConfig({...config, showName: e.target.checked})} /><span className="text-xs font-bold">Nombre Prod.</span></label>
                     <div className="flex gap-2">
                       <input type="number" title="Tamaño px" className="w-12 text-center text-xs font-bold border rounded-md" value={config.nameSize} onChange={e => setConfig({...config, nameSize: e.target.value})} disabled={!config.showName} />
                       <button onClick={() => setConfig({...config, nameBold: !config.nameBold})} className={`px-2 py-0.5 text-xs rounded-md border ${config.nameBold ? 'bg-stone-800 text-white font-black' : 'bg-white text-stone-400 font-bold'}`} disabled={!config.showName}>B</button>
                     </div>
                  </div>

                  {/* Config Dimensions */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-200">
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[#b5a898] w-4 h-4" checked={config.showDimensions} onChange={e => setConfig({...config, showDimensions: e.target.checked})} /><span className="text-xs font-bold">Medidas</span></label>
                     <div className="flex gap-2">
                       <input type="number" title="Tamaño px" className="w-12 text-center text-xs font-bold border rounded-md" value={config.dimensionsSize} onChange={e => setConfig({...config, dimensionsSize: e.target.value})} disabled={!config.showDimensions} />
                       <button onClick={() => setConfig({...config, dimensionsBold: !config.dimensionsBold})} className={`px-2 py-0.5 text-xs rounded-md border ${config.dimensionsBold ? 'bg-stone-800 text-white font-black' : 'bg-white text-stone-400 font-bold'}`} disabled={!config.showDimensions}>B</button>
                     </div>
                  </div>

                  {/* Config Custom Text */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-200">
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[#b5a898] w-4 h-4" checked={config.showCustom} onChange={e => setConfig({...config, showCustom: e.target.checked})} /><input type="text" className="text-xs font-bold border rounded-md px-2 py-0.5 w-24" value={config.customText} onChange={e => setConfig({...config, customText: e.target.value})} disabled={!config.showCustom} placeholder="Texto..." /></label>
                     <div className="flex gap-2">
                       <input type="number" title="Tamaño px" className="w-12 text-center text-xs font-bold border rounded-md" value={config.customSize} onChange={e => setConfig({...config, customSize: e.target.value})} disabled={!config.showCustom} />
                       <button onClick={() => setConfig({...config, customBold: !config.customBold})} className={`px-2 py-0.5 text-xs rounded-md border ${config.customBold ? 'bg-stone-800 text-white font-black' : 'bg-white text-stone-400 font-bold'}`} disabled={!config.showCustom}>B</button>
                     </div>
                  </div>

                  {/* Config List Price */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-200">
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[#b5a898] w-4 h-4" checked={config.showListPrice} onChange={e => setConfig({...config, showListPrice: e.target.checked})} /><span className="text-xs font-bold">Precio Lista</span></label>
                     <div className="flex gap-2">
                       <input type="number" title="Tamaño px" className="w-12 text-center text-xs font-bold border rounded-md" value={config.listPriceSize} onChange={e => setConfig({...config, listPriceSize: e.target.value})} disabled={!config.showListPrice} />
                       <button onClick={() => setConfig({...config, listPriceBold: !config.listPriceBold})} className={`px-2 py-0.5 text-xs rounded-md border ${config.listPriceBold ? 'bg-stone-800 text-white font-black' : 'bg-white text-stone-400 font-bold'}`} disabled={!config.showListPrice}>B</button>
                     </div>
                  </div>

                  {/* Config Cash Price */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-200">
                     <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-emerald-600 w-4 h-4" checked={config.showCashPrice} onChange={e => setConfig({...config, showCashPrice: e.target.checked})} /><span className="text-xs font-bold text-emerald-700">Precio Efectivo (-{cashBonus}%)</span></label>
                     <div className="flex gap-2">
                       <input type="number" title="Tamaño px" className="w-12 text-center text-xs font-bold border rounded-md" value={config.cashPriceSize} onChange={e => setConfig({...config, cashPriceSize: e.target.value})} disabled={!config.showCashPrice} />
                       <button onClick={() => setConfig({...config, cashPriceBold: !config.cashPriceBold})} className={`px-2 py-0.5 text-xs rounded-md border ${config.cashPriceBold ? 'bg-stone-800 text-white font-black' : 'bg-white text-stone-400 font-bold'}`} disabled={!config.showCashPrice}>B</button>
                     </div>
                  </div>
               </div>
            </div>

            {/* VISTA PREVIA */}
            <div className="mb-8 flex flex-col items-center justify-center p-8 bg-[#e8e6e1] rounded-[1.5rem] border-2 border-dashed border-stone-300 relative overflow-x-auto" style={{ backgroundImage: 'radial-gradient(#d6d3d1 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
               <span className="absolute top-3 right-4 text-[9px] font-black text-stone-400 uppercase tracking-widest bg-white/50 px-2 py-1 rounded backdrop-blur-sm z-10">Vista Previa ({colsNum} Bandas)</span>
               
               {/* Simulación del Rollo con la cantidad de columnas especificadas */}
               <div className="flex shrink-0" style={{ gap: `${config.gap}mm` }}>
                 {Array.from({ length: colsNum }).map((_, idx) => (
                   <div 
                     key={idx}
                     className={`bg-white shadow-xl flex flex-col justify-center box-border p-1 leading-tight ${config.align} ${config.font} text-black shrink-0`}
                     style={{ width: `${config.width}mm`, height: `${config.height}mm` }}
                   >
                      {config.showName && <p style={{ fontSize: `${config.nameSize}px`, fontWeight: config.nameBold ? '900' : 'normal' }}>Sofá Múnich 3 Cuerpos</p>}
                      {config.showDimensions && <p style={{ fontSize: `${config.dimensionsSize}px`, fontWeight: config.dimensionsBold ? '900' : 'normal', marginTop: '2px' }}>210x90x85 cm</p>}
                      {config.showCustom && <p style={{ fontSize: `${config.customSize}px`, fontWeight: config.customBold ? '900' : 'normal', marginTop: '2px' }}>{config.customText}</p>}
                      {config.showListPrice && <p style={{ fontSize: `${config.listPriceSize}px`, fontWeight: config.listPriceBold ? '900' : 'normal', marginTop: '4px' }}>Lista: $ 100.000,00</p>}
                      {config.showCashPrice && <p style={{ fontSize: `${config.cashPriceSize}px`, fontWeight: config.cashPriceBold ? '900' : 'normal', marginTop: '2px' }}>Efectivo: $ {(100000 * (1 - (cashBonus / 100))).toLocaleString('es-AR')}</p>}
                   </div>
                 ))}
               </div>
            </div>

            <button onClick={handlePrint} className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[11px] shadow-lg hover:bg-[#a39686] transition active:scale-95 flex items-center justify-center gap-3">
               <Printer className="w-5 h-5" /> Imprimir {totalLabels} Etiquetas
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESIÓN DINÁMICA: Agrupa en filas usando gap nativo y salto de página (row) */}
      <div id="print-area" className="hidden print:block bg-white text-black">
         {labelChunks.map((chunk, chunkIdx) => (
            <div key={chunkIdx} className="flex" style={{ breakAfter: 'page', gap: `${config.gap}mm` }}>
               {chunk.map((item, i) => (
                  <div key={i} className={`box-border flex flex-col justify-center overflow-hidden p-1 leading-tight ${config.align} ${config.font}`} style={{ width: `${config.width}mm`, height: `${config.height}mm` }}>
                     {config.showName && <p style={{ fontSize: `${config.nameSize}px`, fontWeight: config.nameBold ? '900' : 'normal' }}>{item.name}</p>}
                     {config.showDimensions && <p style={{ fontSize: `${config.dimensionsSize}px`, fontWeight: config.dimensionsBold ? '900' : 'normal', marginTop: '2px' }}>{item.dimensions}</p>}
                     {config.showCustom && <p style={{ fontSize: `${config.customSize}px`, fontWeight: config.customBold ? '900' : 'normal', marginTop: '2px' }}>{config.customText}</p>}
                     {config.showListPrice && <p style={{ fontSize: `${config.listPriceSize}px`, fontWeight: config.listPriceBold ? '900' : 'normal', marginTop: '4px' }}>Lista: {formatCurrency(item.price)}</p>}
                     {config.showCashPrice && <p style={{ fontSize: `${config.cashPriceSize}px`, fontWeight: config.cashPriceBold ? '900' : 'normal', marginTop: '2px' }}>Efectivo: {formatCurrency(item.price * (1 - (cashBonus / 100)))}</p>}
                  </div>
               ))}
            </div>
         ))}
      </div>

    </div>
  );
}

function VariablesView({ categories, setCategories, expenseCategories, setExpenseCategories, paymentMethods, setPaymentMethods, taxRules, setTaxRules, paymentBonuses, setPaymentBonuses, categoryMargins, setCategoryMargins, taxConcepts, setTaxConcepts, accounts, setAccounts }) {
  const [activeTab, setActiveTab] = useState('categories');
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm w-fit overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveTab('categories')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'categories' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Tags className="w-3.5 h-3.5" /> Categorías</button>
        <button onClick={() => setActiveTab('margins')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'margins' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Percent className="w-3.5 h-3.5" /> Márgenes</button>
        <button onClick={() => setActiveTab('accounts')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'accounts' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Landmark className="w-3.5 h-3.5" /> Cuentas/Cajas</button>
        <button onClick={() => setActiveTab('payments')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'payments' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><CreditCard className="w-3.5 h-3.5" /> Medios Pago</button>
        <button onClick={() => setActiveTab('bonuses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'bonuses' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Gift className="w-3.5 h-3.5" /> Descuentos</button>
        <button onClick={() => setActiveTab('taxes')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'taxes' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Coins className="w-3.5 h-3.5" /> Reglas P&L</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'expenses' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><ShoppingBag className="w-3.5 h-3.5" /> Cat. Egresos</button>
      </div>
      <div className="bg-[#f4f2f0] p-8 md:p-12 rounded-[3rem] border border-stone-200 shadow-inner min-h-[500px]">
        {activeTab === 'categories' && <VariableManager title="Categorías de Inventario" list={categories} setList={setCategories} icon={Tags} placeholder="Ej: Escritorios..." />}
        {activeTab === 'margins' && <MarginManager categories={categories} categoryMargins={categoryMargins} setCategoryMargins={setCategoryMargins} />}
        {activeTab === 'accounts' && <AccountManager accounts={accounts} setAccounts={setAccounts} />}
        {activeTab === 'payments' && <PaymentMethodManager paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} accounts={accounts} />}
        {activeTab === 'bonuses' && <BonusManager paymentBonuses={paymentBonuses} setPaymentBonuses={setPaymentBonuses} paymentMethods={paymentMethods} />}
        {activeTab === 'taxes' && <TaxManager taxRules={taxRules} setTaxRules={setTaxRules} categories={categories} paymentMethods={paymentMethods} taxConcepts={taxConcepts} setTaxConcepts={setTaxConcepts} />}
        {activeTab === 'expenses' && <VariableManager title="Categorías de Egresos" list={expenseCategories} setList={setExpenseCategories} icon={ShoppingBag} placeholder="Ej: Servicios Generales..." />}
      </div>
    </div>
  );
}

// --- APP ROOT CON FIREBASE ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [products, setProductsLocal] = useState([]);
  const [sales, setSalesLocal] = useState([]);
  const [purchases, setPurchasesLocal] = useState([]); 
  const [transfers, setTransfersLocal] = useState([]); // ¡Añadido!
  
  const [categories, setCategoriesLocal] = useState(INITIAL_CATEGORIES);
  const [categoryMargins, setCategoryMarginsLocal] = useState(INITIAL_CATEGORY_MARGINS);
  const [expenseCategories, setExpenseCategoriesLocal] = useState(INITIAL_PURCHASE_CATEGORIES);
  const [accounts, setAccountsLocal] = useState(INITIAL_ACCOUNTS);
  const [paymentMethods, setPaymentMethodsLocal] = useState(INITIAL_PAYMENTS);
  const [taxRules, setTaxRulesLocal] = useState(INITIAL_TAX_RULES);
  const [paymentBonuses, setPaymentBonusesLocal] = useState(INITIAL_PAYMENT_BONUSES);
  const [taxConcepts, setTaxConceptsLocal] = useState(INITIAL_TAX_CONCEPTS);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return; 
    const unsubscribeData = onSnapshot(doc(db, "sistema", "datosGenerales"), (documento) => {
      if (documento.exists()) {
        const data = documento.data();
        if (data.productos) setProductsLocal(data.productos);
        if (data.ventas) setSalesLocal(data.ventas);
        if (data.gastos) setPurchasesLocal(data.gastos);
        if (data.transferencias) setTransfersLocal(data.transferencias); // ¡Añadido!
        if (data.categories) setCategoriesLocal(data.categories);
        if (data.categoryMargins) setCategoryMarginsLocal(data.categoryMargins);
        if (data.expenseCategories) setExpenseCategoriesLocal(data.expenseCategories);
        if (data.accounts) setAccountsLocal(data.accounts);
        if (data.paymentMethods) setPaymentMethodsLocal(data.paymentMethods);
        if (data.taxRules) setTaxRulesLocal(data.taxRules);
        if (data.paymentBonuses) setPaymentBonusesLocal(data.paymentBonuses);
        if (data.taxConcepts) setTaxConceptsLocal(data.taxConcepts);
      }
    });
    return () => unsubscribeData();
  }, [user]);

  const setProducts = (n) => { setProductsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { productos: n }, { merge: true }); };
  const setSales = (n) => { setSalesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { ventas: n }, { merge: true }); };
  const setPurchases = (n) => { setPurchasesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { gastos: n }, { merge: true }); };
  const setTransfers = (n) => { setTransfersLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { transferencias: n }, { merge: true }); }; // ¡Añadido!
  const setCategories = (n) => { setCategoriesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { categories: n }, { merge: true }); };
  const setCategoryMargins = (n) => { setCategoryMarginsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { categoryMargins: n }, { merge: true }); };
  const setExpenseCategories = (n) => { setExpenseCategoriesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { expenseCategories: n }, { merge: true }); };
  const setAccounts = (n) => { setAccountsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { accounts: n }, { merge: true }); };
  const setPaymentMethods = (n) => { setPaymentMethodsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { paymentMethods: n }, { merge: true }); };
  const setTaxRules = (n) => { setTaxRulesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { taxRules: n }, { merge: true }); };
  const setPaymentBonuses = (n) => { setPaymentBonusesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { paymentBonuses: n }, { merge: true }); };
  const setTaxConcepts = (n) => { setTaxConceptsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { taxConcepts: n }, { merge: true }); };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#f4f2f0]">
      <div className="font-black text-stone-400 uppercase tracking-widest flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        Cargando Sistema...
      </div>
    </div>
  );
  
  if (!user) return <Login />;

  const NavItem = ({ icon: Icon, label, id }) => (
    <button 
      onClick={() => { setCurrentView(id); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
        currentView === id ? 'bg-[#b5a898] text-white shadow-md' : 'text-stone-400 hover:bg-stone-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" /><span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f4f2f0] font-sans text-[#1a1a1a] overflow-hidden text-[13px]">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden no-print" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed lg:relative h-full w-72 bg-[#1a1a1a] text-white z-50 transition-transform duration-300 no-print ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="mb-10 flex flex-col gap-2">
            <h1 className="text-2xl font-black tracking-tighter">MobiliaHome</h1>
            <p className="text-[9px] text-[#b5a898] font-bold uppercase tracking-[0.3em] pl-1">Design & Deco</p>
          </div>
          <nav className="flex-1 space-y-2">
            <NavItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
            <NavItem icon={Activity} label="Flujo de Caja" id="cashflow" />
            <NavItem icon={FileText} label="P&L (Resultados)" id="pnl" />
            <NavItem icon={PieChart} label="Rentabilidad" id="profitability" />
            <NavItem icon={Package} label="Inventario" id="inventory" />
            <NavItem icon={ShoppingCart} label="Ventas" id="sales" />
            <NavItem icon={ShoppingBag} label="Egresos" id="purchases" />
            <NavItem icon={Printer} label="Etiquetas" id="labels" />
            <div className="pt-4 mt-4 border-t border-stone-800/50"><NavItem icon={Settings} label="Configuración" id="variables" /></div>
          </nav>
          
          <div className="pt-6 border-t border-stone-800/50 shrink-0">
            <div className="bg-black p-4 rounded-xl flex items-center gap-3 border border-stone-800">
              <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center font-black text-xs text-[#b5a898]">MH</div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white truncate">{user.email}</p>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">Activo</p>
              </div>
            </div>
            <button 
              onClick={() => signOut(auth)} 
              className="mt-3 w-full bg-rose-500/10 text-rose-500 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition"
            >
              Cerrar Sesión
            </button>
          </div>

        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b flex items-center justify-between px-6 lg:px-10 shrink-0 z-10 font-bold uppercase tracking-tight no-print">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-stone-600" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
            <h2 className="text-lg font-black text-[#1a1a1a] uppercase">{currentView}</h2>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-stone-50 px-4 py-2.5 rounded-xl border focus-within:ring-2 focus-within:ring-[#b5a898] group">
            <Search className="w-4 h-4 text-stone-400 group-focus-within:text-[#b5a898]" />
            <input type="text" placeholder="Buscar..." className="bg-transparent border-none focus:ring-0 text-sm w-48 lg:w-72 font-bold outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#f4f2f0]">
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #d6d3d1; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a8a29e; }
          `}</style>
          {currentView === 'dashboard' && <DashboardView sales={sales} products={products} purchases={purchases} transfers={transfers} accounts={accounts} paymentMethods={paymentMethods} taxRules={taxRules} paymentBonuses={paymentBonuses} />}
          {currentView === 'cashflow' && <CashFlowView sales={sales} purchases={purchases} transfers={transfers} setTransfers={setTransfers} accounts={accounts} searchTerm={searchTerm} />}
          {currentView === 'pnl' && <PnLView sales={sales} purchases={purchases} paymentBonuses={paymentBonuses} taxRules={taxRules} />}
          {currentView === 'profitability' && <ProfitabilityView sales={sales} taxRules={taxRules} paymentBonuses={paymentBonuses} searchTerm={searchTerm} />}
          {currentView === 'inventory' && <InventoryView products={products} setProducts={setProducts} categories={categories} categoryMargins={categoryMargins} searchTerm={searchTerm} />}
          {currentView === 'sales' && <SalesView sales={sales} setSales={setSales} products={products} paymentMethods={paymentMethods} taxRules={taxRules} categories={categories} paymentBonuses={paymentBonuses} />}
          {currentView === 'purchases' && <PurchasesView purchases={purchases} setPurchases={setPurchases} paymentMethods={paymentMethods} expenseCategories={expenseCategories} searchTerm={searchTerm} />}
          {currentView === 'labels' && <LabelPrinterView products={products} categories={categories} paymentBonuses={paymentBonuses} />}
          {currentView === 'variables' && (
            <VariablesView 
              categories={categories} setCategories={setCategories}
              expenseCategories={expenseCategories} setExpenseCategories={setExpenseCategories}
              paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods}
              taxRules={taxRules} setTaxRules={setTaxRules}
              paymentBonuses={paymentBonuses} setPaymentBonuses={setPaymentBonuses}
              categoryMargins={categoryMargins} setCategoryMargins={setCategoryMargins}
              taxConcepts={taxConcepts} setTaxConcepts={setTaxConcepts}
              accounts={accounts} setAccounts={setAccounts}
            />
          )}
        </div>
      </main>
    </div>
  );
}