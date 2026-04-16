import React, { useState, useMemo, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './Login';
import { 
  LayoutDashboard, Package, ShoppingCart, TrendingUp, ChevronRight, Plus, 
  Search, Filter, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Trash2, 
  Menu, X, BarChart3, Clock, Armchair, Pencil, Settings, CreditCard, Tags, 
  Coins, Receipt, Check, ArrowRight, Wallet, TrendingDown, Gift, Boxes, 
  Percent, PackagePlus, CheckCircle2, UploadCloud, FileSpreadsheet, Download, 
  ShoppingBag, Activity, FileText, ChevronDown, PieChart, Info, Landmark 
} from 'lucide-react';

// --- CONSTANTES INICIALES ---
const INITIAL_CATEGORIES = ['Sofás', 'Mesas', 'Sillas', 'Living', 'Dormitorio', 'Decoración'];
const INITIAL_PURCHASE_CATEGORIES = ['Mercadería', 'Alquiler', 'Luz', 'Internet', 'Sueldos', 'Publicidad', 'Mantenimiento', 'Impuestos', 'Financiero', 'Otros'];
const INITIAL_ACCOUNTS = ['Caja Efectivo', 'Banco Santander', 'Mercado Pago'];
const INITIAL_PAYMENTS = [
  { name: 'Efectivo', account: 'Caja Efectivo' },
  { name: 'Transferencia', account: 'Banco Santander' },
  { name: 'Tarjeta 3 Cuotas', account: 'Mercado Pago' },
  { name: 'Tarjeta 6 Cuotas', account: 'Mercado Pago' },
  { name: 'E-Check', account: 'Banco Santander' }
];

const INITIAL_CATEGORY_MARGINS = [
  { category: 'Sofás', margin: 60 },
  { category: 'Mesas', margin: 50 },
  { category: 'Sillas', margin: 40 },
  { category: 'Living', margin: 45 },
  { category: 'Dormitorio', margin: 55 },
  { category: 'Decoración', margin: 70 }
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
    concepts: [{ name: 'Costo Financiero', value: 15 }]
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
      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{String(title)}</h4>
      <p className="text-3xl font-black text-stone-900 tracking-tight">{String(value)}</p>
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
          <span className={`font-black uppercase tracking-widest ${isTotalRow ? 'text-[#8c8173] text-base' : 'text-stone-800 text-sm'}`}>{String(title)}</span>
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
function DashboardView({ sales, products, purchases, accounts, paymentMethods }) {
  const totalSales = useMemo(() => sales.reduce((acc, s) => acc + s.total, 0), [sales]);
  const totalExpenses = useMemo(() => purchases.reduce((acc, p) => acc + p.amount, 0), [purchases]);
  const netResult = totalSales - totalExpenses;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const totalValue = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
  const salesCount = sales.length;
  const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

  const balancesByAccount = useMemo(() => {
    const balances = {};
    accounts.forEach(acc => balances[acc] = 0);
    
    sales.forEach(sale => {
      sale.payments?.forEach(pay => {
        const methodObj = paymentMethods.find(m => m.name === pay.method);
        const account = methodObj ? methodObj.account : 'Otras Cuentas';
        balances[account] = (balances[account] || 0) + pay.amount;
      });
    });

    purchases.forEach(purchase => {
      const methodObj = paymentMethods.find(m => m.name === purchase.paymentMethod);
      const account = methodObj ? methodObj.account : 'Otras Cuentas';
      balances[account] = (balances[account] || 0) - purchase.amount;
    });

    return balances;
  }, [sales, purchases, accounts, paymentMethods]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Caja Total Actual" value={formatCurrency(netResult)} icon={<Wallet className="w-6 h-6" />} color={netResult >= 0 ? "emerald" : "red"} />
        <StatCard title="Ingresos Totales" value={formatCurrency(totalSales)} icon={<TrendingUp className="w-6 h-6" />} color="greige" />
        <StatCard title="Egresos Totales" value={formatCurrency(totalExpenses)} icon={<TrendingDown className="w-6 h-6" />} color="red" />
        <StatCard title="Cantidad Ventas" value={String(salesCount)} icon={<ShoppingCart className="w-6 h-6" />} color="grey" />
        <StatCard title="Ticket Promedio" value={formatCurrency(averageTicket)} icon={<Receipt className="w-6 h-6" />} color="emerald" />
        <StatCard title="Valor en Stock" value={formatCurrency(totalValue)} icon={<Boxes className="w-6 h-6" />} color="greige" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-[#1a1a1a] text-white rounded-[2rem] p-10 shadow-xl flex flex-col justify-center border border-stone-800 text-center relative overflow-hidden group">
            <h3 className="text-[#b5a898] font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Posición de Caja Actual</h3>
            <p className="text-6xl font-black tracking-tighter text-white drop-shadow-sm mb-8">{formatCurrency(netResult)}</p>
            
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-stone-800/50">
               <div><p className="text-stone-400 text-[10px] uppercase mb-1 font-bold">Ventas</p><p className="font-bold text-white text-lg">{String(salesCount)}</p></div>
               <div><p className="text-stone-400 text-[10px] uppercase mb-1 font-bold">Gastos</p><p className="font-bold text-white text-lg">{String(purchases.length)}</p></div>
               <div><p className="text-stone-400 text-[10px] uppercase mb-1 font-bold">Stock Crítico</p><p className="font-bold text-[#b5a898] text-lg">{String(lowStockCount)}</p></div>
            </div>
            
            {Object.keys(balancesByAccount).length > 0 && (
              <div className="mt-8 pt-6 border-t border-stone-800/50 text-left">
                <h4 className="text-[9px] text-stone-500 font-bold uppercase tracking-widest mb-3">Saldos por Cuenta</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {Object.entries(balancesByAccount).map(([account, amount]) => (
                    <div key={account} className="bg-black/50 rounded-xl px-4 py-3 min-w-[140px] flex-1 border border-stone-800/50 flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-stone-400 uppercase truncate tracking-widest mb-1">{String(account)}</span>
                      <span className={`text-sm font-black ${amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
         </div>
         
         <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="font-bold text-stone-800 text-xs uppercase tracking-widest mb-8">Volumen Operativo</h3>
            <div className="flex items-end justify-center gap-12 h-48 w-full px-8">
               <div className="flex-1 flex flex-col items-center gap-4">
                  <div className="w-full bg-[#b5a898] rounded-xl shadow-md transition-all duration-1000 flex items-center justify-center text-xs text-white font-bold" style={{ height: totalSales > 0 ? '100%' : '5%' }}>
                    {totalSales > 0 ? "Ingresos" : ""}
                  </div>
               </div>
               <div className="flex-1 flex flex-col items-center gap-4">
                  <div className="w-full bg-stone-800 rounded-xl shadow-md transition-all duration-1000 flex items-center justify-center text-xs text-white font-bold" style={{ height: totalSales > 0 ? `${Math.max(5, Math.min(100, (totalExpenses / totalSales) * 100))}%` : '5%' }}>
                    {totalExpenses > 0 ? "Egresos" : ""}
                  </div>
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
    const filteredSales = sales.filter(s => s.date >= startDate && s.date <= endDate);
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

    filteredSales.forEach(sale => {
      const totalPaymentsVolume = sale.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
      sale.items.forEach(item => {
         const subtotalItem = item.price * item.qty;
         const costItem = (item.cost || 0) * item.qty;
         ventasBrutas += subtotalItem;
         revenueByCategory[item.category] = (revenueByCategory[item.category] || 0) + subtotalItem;
         directCostsBreakdown['CMV (Costo de Mercadería)'] += costItem;
         totalDirectCosts += costItem;

         if (totalPaymentsVolume > 0 && sale.payments) {
           sale.payments.forEach(pay => {
             const proportion = pay.amount / totalPaymentsVolume;
             const subAmount = subtotalItem * proportion;
             const bonus = paymentBonuses.find(b => b.method === pay.method);
             if (bonus) {
                const discountVal = subAmount * (bonus.value / 100);
                directCostsBreakdown['Bonificaciones Otorgadas'] = (directCostsBreakdown['Bonificaciones Otorgadas'] || 0) + discountVal;
                totalDirectCosts += discountVal;
             }
             const rule = taxRules.find(r => (r.category === item.category || r.category === 'Todas') && (r.paymentMethod === pay.method || r.paymentMethod === 'Todas'));
             if (rule) {
                rule.concepts.forEach(c => {
                   const conceptVal = subAmount * (c.value / 100);
                   const nameUpper = String(c.name).toUpperCase();
                   if (nameUpper.includes('IVA') || nameUpper.includes('IIBB') || nameUpper.includes('IMPUESTO')) {
                      taxesBreakdown[c.name] = (taxesBreakdown[c.name] || 0) + conceptVal;
                      totalTaxes += conceptVal;
                   } else {
                      directCostsBreakdown[c.name] = (directCostsBreakdown[c.name] || 0) + conceptVal;
                      totalDirectCosts += conceptVal;
                   }
                });
             }
           });
         }
      });
    });

    filteredPurchases.forEach(p => {
      const cat = String(p.category).toLowerCase();
      if (cat.includes('mercadería') || cat.includes('mercaderia') || cat.includes('stock')) {
        comprasMercaderiaAisladas += p.amount;
      } 
      else if (cat.includes('impuesto') || cat.includes('iibb') || cat.includes('iva')) {
        taxesBreakdown[`Pagos: ${p.category}`] = (taxesBreakdown[`Pagos: ${p.category}`] || 0) + p.amount;
        totalTaxes += p.amount;
      }
      else {
        opExBreakdown[p.category] = (opExBreakdown[p.category] || 0) + p.amount;
        totalOpEx += p.amount;
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
              <h2 className="text-2xl font-black uppercase tracking-tighter text-stone-900">P&L Consolidado</h2>
              <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mt-2">Período: {String(startDate)} al {String(endDate)}</p>
           </div>

           <div className="space-y-2 text-sm">
              <ExpandableRow title="Ingresos Operativos (Ventas Brutas)" amount={pnlData.ventasBrutas} isNegative={false}>
                 <div className="space-y-3">
                   {Object.keys(pnlData.revenueByCategory).length === 0 && <p className="text-xs text-stone-400 font-bold uppercase">Sin registros</p>}
                   {Object.entries(pnlData.revenueByCategory).map(([cat, val]) => (
                     <div key={cat} className="flex justify-between items-center text-xs font-bold text-stone-600 uppercase border-b border-stone-200/50 pb-2">
                       <span>{String(cat)}</span>
                       <span className="font-black text-stone-800">{formatCurrency(val)}</span>
                     </div>
                   ))}
                 </div>
              </ExpandableRow>

              <ExpandableRow title="Costos Directos y Financieros" amount={pnlData.totalDirectCosts} isNegative={true}>
                 <div className="space-y-3">
                   {Object.keys(pnlData.directCostsBreakdown).length === 0 && <p className="text-xs text-stone-400 font-bold uppercase">Sin registros</p>}
                   {Object.entries(pnlData.directCostsBreakdown).map(([concept, val]) => (
                     <div key={concept} className="flex justify-between items-center text-xs font-bold text-stone-600 uppercase border-b border-stone-200/50 pb-2">
                       <span>{String(concept)}</span>
                       <span className="font-black text-rose-600">-{formatCurrency(val)}</span>
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
                       <span>{String(cat)}</span>
                       <span className="font-black text-rose-600">-{formatCurrency(val)}</span>
                     </div>
                   ))}
                 </div>
              </ExpandableRow>

              <ExpandableRow title="Impuestos" amount={pnlData.totalTaxes} isNegative={true}>
                 <div className="space-y-3">
                   {Object.keys(pnlData.taxesBreakdown).length === 0 && <p className="text-xs text-stone-400 font-bold uppercase">Sin registros</p>}
                   {Object.entries(pnlData.taxesBreakdown).map(([tax, val]) => (
                     <div key={tax} className="flex justify-between items-center text-xs font-bold text-stone-600 uppercase border-b border-stone-200/50 pb-2">
                       <span>{String(tax)}</span>
                       <span className="font-black text-rose-600">-{formatCurrency(val)}</span>
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
                  CONTABILIDAD: Las compras de stock por un total de <strong className="font-black underline">{formatCurrency(pnlData.comprasMercaderiaAisladas)}</strong> registradas en caja NO se restan en este estado de resultados, ya que representan un activo. El reporte solo descuenta el costo (COGS) de los productos efectivamente vendidos.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProfitabilityView({ sales, taxRules, paymentBonuses, searchTerm }) {
  const profitData = useMemo(() => {
    let data = sales.map(sale => {
      const subtotal = sale.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const totalCost = sale.items.reduce((acc, item) => acc + ((item.cost || 0) * item.qty), 0);
      
      let absorbedCosts = 0;
      const totalPaymentsVolume = sale.payments ? sale.payments.reduce((acc, p) => acc + p.amount, 0) : 0;

      if (totalPaymentsVolume > 0 && sale.payments) {
        sale.items.forEach(item => {
          const itemBaseTotal = item.price * item.qty;
          sale.payments.forEach(pay => {
            const proportion = pay.amount / totalPaymentsVolume;
            const subAmount = itemBaseTotal * proportion;
            
            const bonus = paymentBonuses.find(b => b.method === pay.method);
            if (bonus) absorbedCosts += subAmount * (bonus.value / 100);
            
            const rule = taxRules.find(r => (r.category === item.category || r.category === 'Todas') && (r.paymentMethod === pay.method || r.paymentMethod === 'Todas'));
            if (rule) absorbedCosts += subAmount * (rule.concepts.reduce((sum, c) => sum + c.value, 0) / 100);
          });
        });
      }

      const netProfit = subtotal - totalCost - absorbedCosts;
      const margin = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;
      return { ...sale, subtotal, totalCost, absorbedCosts, netProfit, margin };
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(s => String(s.id).toLowerCase().includes(term));
    }
    return data.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, searchTerm, taxRules, paymentBonuses]);

  const globalRevenue = profitData.reduce((acc, s) => acc + s.subtotal, 0);
  const globalCost = profitData.reduce((acc, s) => acc + s.totalCost, 0);
  const globalNet = profitData.reduce((acc, s) => acc + s.netProfit, 0);
  const globalMargin = globalRevenue > 0 ? (globalNet / globalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 text-stone-900 mb-8">
        <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><PieChart className="w-6 h-6" /></div>
        <h3 className="text-xl font-bold uppercase tracking-tighter">Rentabilidad de Ventas</h3>
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
                <th className="p-6 text-right">Monto Venta</th>
                <th className="p-6 text-right">Costo (COGS)</th>
                <th className="p-6 text-right">Costos Financ/Imp.</th>
                <th className="p-6 text-right">Result. Neto</th>
                <th className="p-6 text-center">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {profitData.map((s, idx) => (
                <tr key={`${s.id}-${idx}`} className="hover:bg-stone-50/50 transition">
                  <td className="p-6">
                    <p className="font-black text-sm">#{String(s.id).split('-')[1]}</p>
                    <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase">{String(s.date)}</p>
                  </td>
                  <td className="p-6 text-right font-black text-stone-900">
                    {formatCurrency(s.subtotal)}
                  </td>
                  <td className="p-6 text-right font-bold text-stone-500">
                    -{formatCurrency(s.totalCost)}
                  </td>
                  <td className="p-6 text-right font-bold text-stone-400">
                    -{formatCurrency(s.absorbedCosts)}
                  </td>
                  <td className={`p-6 text-right font-black text-lg tracking-tight ${s.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(s.netProfit)}
                  </td>
                  <td className="p-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${s.margin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {String(s.margin.toFixed(1))}%
                    </span>
                  </td>
                </tr>
              ))}
              {profitData.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-stone-400">
                    <PieChart className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-xs uppercase tracking-widest">Sin datos de rentabilidad</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CashFlowView({ sales, purchases, searchTerm }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const movements = useMemo(() => {
    const s = sales.map(sale => {
      const methods = sale.payments ? sale.payments.map(p => p.method).join(' + ') : 'Varios';
      return {
        id: sale.id, date: sale.date,
        concept: `Venta #${String(sale.id).split('-')[1] || String(sale.id)}`,
        detail: sale.items.map(i => i.name).join(', '),
        type: 'Ingreso', method: methods, amount: sale.total 
      };
    });

    const p = purchases.map(pur => ({
      id: pur.id, date: pur.date, concept: pur.category,
      detail: pur.description, type: 'Egreso', method: pur.paymentMethod, amount: -pur.amount
    }));

    let all = [...s, ...p];
    if (startDate) all = all.filter(m => m.date >= startDate);
    if (endDate) all = all.filter(m => m.date <= endDate);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      all = all.filter(m => String(m.concept).toLowerCase().includes(term) || String(m.detail).toLowerCase().includes(term) || String(m.method).toLowerCase().includes(term));
    }
    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, purchases, startDate, endDate, searchTerm]);

  const periodIn = movements.filter(m => m.amount > 0).reduce((acc, m) => acc + m.amount, 0);
  const periodOut = movements.filter(m => m.amount < 0).reduce((acc, m) => acc + Math.abs(m.amount), 0);
  const periodBalance = periodIn - periodOut;

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Concepto', 'Detalle', 'Medio de Pago', 'Monto'];
    const rows = movements.map(m => [m.date, m.type, `"${m.concept}"`, `"${m.detail}"`, `"${m.method}"`, m.amount]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Flujo_Caja_${startDate}_al_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900">
          <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Activity className="w-6 h-6" /></div>
          Movimientos de Caja (Cashflow)
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
          <button onClick={handleExportCSV} className="bg-black text-white p-2.5 rounded-xl hover:bg-stone-800 transition" title="Descargar CSV">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-stone-200 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600"><TrendingUp className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Ingresos del Período</p><p className="text-2xl font-black text-stone-900">{formatCurrency(periodIn)}</p></div>
        </div>
        <div className="bg-white border border-stone-200 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 p-4 rounded-2xl text-rose-600"><TrendingDown className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Egresos del Período</p><p className="text-2xl font-black text-stone-900">{formatCurrency(periodOut)}</p></div>
        </div>
        <div className="bg-black p-6 rounded-[2rem] shadow-xl flex items-center gap-4 text-white">
          <div className="bg-[#b5a898]/20 p-4 rounded-2xl text-[#b5a898]"><Wallet className="w-6 h-6" /></div>
          <div><p className="text-[10px] font-bold text-[#b5a898] uppercase tracking-widest">Saldo del Período</p><p className="text-2xl font-black">{formatCurrency(periodBalance)}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-stone-900">
            <thead>
              <tr className="bg-stone-50 text-stone-400 text-[10px] font-bold uppercase tracking-widest border-b border-stone-200">
                <th className="p-6">Fecha</th>
                <th className="p-6">Movimiento</th>
                <th className="p-6">Medio</th>
                <th className="p-6 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {movements.map((m, idx) => (
                <tr key={`${m.id}-${idx}`} className="hover:bg-stone-50/50 transition">
                  <td className="p-6 text-xs font-bold text-stone-500">{String(m.date)}</td>
                  <td className="p-6">
                    <p className="font-black text-sm">{String(m.concept)}</p>
                    <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase truncate max-w-[300px]">{String(m.detail)}</p>
                  </td>
                  <td className="p-6">
                    <span className="text-[9px] bg-stone-100 text-stone-500 px-2.5 py-1 rounded-md font-bold uppercase tracking-widest border border-stone-200">{String(m.method)}</span>
                  </td>
                  <td className={`p-6 text-right font-black text-lg ${m.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.amount > 0 ? '+' : ''}{formatCurrency(m.amount)}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-20 text-center text-stone-400">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-xs uppercase tracking-widest">Sin movimientos en este período</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
              <button onClick={() => fileInputRef.current.click()} className="bg-black text-white px-8 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-stone-800 transition">Seleccionar Archivo</button>
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
      const matchesSearch = !searchTerm || String(p.name).toLowerCase().includes(searchTerm.toLowerCase()) || String(p.sku).toLowerCase().includes(searchTerm.toLowerCase()) || String(p.supplier).toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 w-full">
          <button onClick={() => setSelectedCategory('Todos')} className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition ${selectedCategory === 'Todos' ? 'bg-black text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>Todos</button>
          {categories.map(cat => (<button key={String(cat)} onClick={() => setSelectedCategory(String(cat))} className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition ${selectedCategory === String(cat) ? 'bg-black text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'}`}>{String(cat)}</button>))}
        </div>
        {!isAdding && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { if(confirm('¿Eliminar inventario?')) setProducts([]); }} className="bg-white border border-rose-100 text-rose-500 px-4 py-2.5 rounded-xl hover:bg-rose-50 transition" title="Limpiar"><Trash2 className="w-4 h-4" /></button>
            <button onClick={() => setIsMassLoading(true)} className="bg-white border border-stone-200 text-stone-700 px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-50 transition flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Masivo</button>
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
function SaleDetailModal({ sale, onClose }) {
  const subtotal = sale.items.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="bg-black p-6 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><Receipt className="w-5 h-5 text-[#b5a898]" /> Comprobante de Venta #{String(sale.id).split('-')[1] || String(sale.id)}</h3>
          <button onClick={onClose} className="hover:text-[#b5a898] transition"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="mb-8">
                 <h4 className="text-[10px] text-stone-400 mb-4 tracking-widest border-b border-stone-200 pb-2 font-bold uppercase">Artículos Vendidos</h4>
                 <table className="w-full text-left">
                    <thead>
                      <tr className="text-[9px] text-stone-400 uppercase tracking-widest">
                        <th className="pb-2">Producto</th>
                        <th className="pb-2 text-center">Cant.</th>
                        <th className="pb-2 text-right">P. Lista</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {sale.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-stone-100 last:border-0">
                          <td className="py-3 font-bold text-stone-800">{String(item.name)} <span className="text-[8px] font-black text-[#b5a898] block tracking-widest mt-0.5 uppercase">{String(item.category)}</span></td>
                          <td className="py-3 text-center font-black">{String(item.qty)}</td>
                          <td className="py-3 text-right font-bold text-stone-500">{formatCurrency(item.price)}</td>
                          <td className="py-3 text-right font-black text-stone-900">{formatCurrency(item.price * item.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </div>
              <div>
                 <h4 className="text-[10px] text-stone-400 mb-4 tracking-widest border-b border-stone-200 pb-2 font-bold uppercase">Pagos Registrados</h4>
                 <div className="flex flex-wrap gap-3">
                    {sale.payments && sale.payments.map((pay, idx) => (
                      <div key={idx} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex gap-4 items-center shadow-sm">
                         <span className="text-[10px] font-bold text-stone-500 tracking-widest uppercase">{String(pay.method)}</span>
                         <span className="text-sm font-black text-emerald-600">{formatCurrency(pay.amount)}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            <div>
               <h4 className="text-[10px] text-stone-400 mb-4 tracking-widest border-b border-stone-200 pb-2 font-bold uppercase">Resumen de Operación</h4>
               <div className="bg-stone-50 rounded-[2rem] p-8 border border-stone-200 shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6 text-xs font-bold text-stone-500 uppercase tracking-widest border-b border-stone-200 pb-6">
                      <span>Suma Lista</span>
                      <span className="text-stone-800 font-black">{formatCurrency(subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 text-stone-900">
                      <span className="font-black text-xs uppercase tracking-widest text-emerald-600">Total Abonado</span>
                      <div className="text-right">
                        <span className="text-4xl font-black block tracking-tighter text-emerald-600">{formatCurrency(sale.total)}</span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewSaleForm({ products, paymentMethods, taxRules, categories, paymentBonuses, onClose, onSave }) {
  const [cart, setCart] = useState([]);
  const [payments, setPayments] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [tempCost, setTempCost] = useState(''); 
  const [tempQty, setTempQty] = useState('1');
  const [showResults, setShowResults] = useState(false);
  const [tempPaymentMethod, setTempPaymentMethod] = useState('');
  const [tempPaymentAmount, setTempPaymentAmount] = useState('');

  const filteredInventory = useMemo(() => {
    if (!productSearch || productSearch.length < 1) return [];
    return products.filter(p => String(p.name).toLowerCase().includes(productSearch.toLowerCase()));
  }, [productSearch, products]);

  const subtotalCart = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const amountCoveredBase = payments.reduce((acc, p) => acc + p.amount, 0);
  const balanceBase = subtotalCart - amountCoveredBase;
  const totalFinal = subtotalCart;

  useEffect(() => {
    if (tempPaymentMethod) setTempPaymentAmount(balanceBase > 0 ? String(balanceBase) : '');
    else setTempPaymentAmount('');
  }, [tempPaymentMethod, balanceBase]);

  const addToCart = () => {
    const p = parseFloat(tempPrice);
    const c = parseFloat(tempCost) || 0; 
    const q = parseInt(tempQty);
    if (!productSearch || !tempCategory || isNaN(p) || p <= 0) return;
    setCart([...cart, { id: Date.now() + Math.random(), name: productSearch, category: tempCategory, price: p, cost: c, qty: q || 1 }]);
    setProductSearch(''); setTempCategory(''); setTempPrice(''); setTempCost(''); setTempQty('1');
  };

  const addPayment = () => {
    const a = parseFloat(tempPaymentAmount);
    if (!tempPaymentMethod || isNaN(a) || a <= 0) return;
    setPayments([...payments, { id: Date.now() + Math.random(), method: tempPaymentMethod, amount: a }]);
    setTempPaymentMethod(''); setTempPaymentAmount('');
  };

  const handleFinalSave = () => {
    if (cart.length === 0) return;
    onSave({
      id: `V-${Math.floor(Math.random() * 9000) + 1000}`,
      items: cart,
      date: new Date().toISOString().split('T')[0],
      total: totalFinal,
      payments: payments
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
          <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 mb-6 flex items-center gap-2"><Armchair className="w-5 h-5 text-[#b5a898]" /> 1. Selección de Productos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2 relative"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Artículo (Inventario)</label>
              <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setShowResults(true); }} placeholder="Buscar o escribir..." />
              {showResults && filteredInventory.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                   {filteredInventory.map(p => (
                     <button 
                       key={p.id} 
                       type="button" 
                       onMouseDown={(e) => e.preventDefault()} 
                       onClick={() => { 
                         setProductSearch(String(p.name)); 
                         setTempCategory(String(p.category)); 
                         setTempPrice(String(p.price)); 
                         setTempCost(String(p.cost || 0)); 
                         setShowResults(false); 
                       }} 
                       className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-100 flex justify-between items-center transition"
                     >
                       <span className="font-bold text-sm text-stone-800">{String(p.name)}</span>
                       <span className="text-stone-400 text-[9px] font-black uppercase tracking-widest">{String(p.category)}</span>
                     </button>
                   ))}
                </div>
              )}
            </div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Categoría</label>
              <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={tempCategory} onChange={(e)=>setTempCategory(e.target.value)}>
                <option value="">Seleccione...</option>{categories.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
              </select>
            </div>
            <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Precio de Lista ($)</label>
              <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-[#8c8173] outline-none text-sm" value={String(tempPrice)} onChange={(e)=>setTempPrice(e.target.value)} />
            </div>
            <div className="space-y-2 flex gap-2 items-end"><div className="flex-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Cantidad</label>
              <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-sm outline-none" value={String(tempQty)} onChange={(e)=>setTempQty(e.target.value)} /></div>
              <button type="button" onClick={addToCart} className="bg-black text-white p-3.5 rounded-xl hover:bg-stone-800 transition shadow-sm"><Plus className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="border-t border-stone-100 pt-6 space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div><p className="font-bold text-sm text-stone-800">{String(item.name)}</p><p className="text-[9px] font-black uppercase text-stone-400 tracking-widest">{String(item.category)} • x{String(item.qty)}</p></div>
                <div className="flex items-center gap-6"><p className="font-black text-base text-stone-900">{formatCurrency(item.price * item.qty)}</p>
                <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="p-2 text-stone-300 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
          <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 mb-6 flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-500" /> 2. Registro de Pagos</h4>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Medio Abonado</label>
              <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={tempPaymentMethod} onChange={(e)=>setTempPaymentMethod(e.target.value)}>
                <option value="">Seleccione Pago...</option>{paymentMethods.map(p => <option key={String(p.name)} value={String(p.name)}>{String(p.name)}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Importe ($)</label>
              <div className="relative"><input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-emerald-600 text-sm pr-16 outline-none" value={String(tempPaymentAmount)} onChange={(e)=>setTempPaymentAmount(e.target.value)} />
              {balanceBase > 0 && <button type="button" onClick={()=>setTempPaymentAmount(String(balanceBase))} className="absolute right-2 top-2.5 px-2 py-1 bg-white border border-stone-200 text-[9px] font-bold uppercase rounded text-stone-500 hover:text-emerald-600 shadow-sm transition">Máx</button>}</div>
            </div>
            <button type="button" onClick={addPayment} className="self-end bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition shadow-sm">Cobrar</button>
          </div>
          <div className="space-y-3">{payments.map(pay => (<div key={pay.id} className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-4 rounded-xl"><div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="font-bold text-sm text-emerald-900">{String(pay.method)}</span></div><div className="flex items-center gap-4"><span className="font-black text-emerald-700 text-base">{formatCurrency(pay.amount)}</span><button onClick={() => setPayments(payments.filter(p => p.id !== pay.id))} className="text-stone-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4"/></button></div></div>))}</div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-black text-white rounded-[2.5rem] p-8 shadow-xl sticky top-10 text-center">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-[#b5a898]">Monto Aprobado (Cliente)</h4>
          <div className="space-y-6">
            <div className="flex justify-between items-center text-stone-400 border-b border-stone-800 pb-4"><span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Suma Precios Lista</span><span className="font-black text-white text-xl">{formatCurrency(subtotalCart)}</span></div>
            <div className="space-y-5">
              <div className="pt-4 text-center"><p className="text-[9px] font-bold uppercase text-stone-500 mb-1 tracking-[0.2em]">Total Venta</p><p className="text-5xl font-black tracking-tighter text-white">{formatCurrency(totalFinal)}</p></div>
              <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${balanceBase <= 0.1 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}><span className="text-[9px] font-bold uppercase tracking-widest">Abonado</span><span className="text-lg font-black">{formatCurrency(amountCoveredBase)}</span></div>
            </div>
          </div>
          <button 
            onClick={handleFinalSave} 
            disabled={cart.length === 0 || balanceBase > 0.1} 
            className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#a39686] transition mt-8 shadow-lg disabled:opacity-10 active:scale-95 flex items-center justify-center gap-2"
          >
            Confirmar Venta <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="w-full text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-6 hover:text-white transition">Cancelar y Volver</button>
        </div>
      </div>
    </div>
  );
}

function SalesView({ sales, setSales, products, paymentMethods, taxRules, categories, paymentBonuses, searchTerm }) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const filteredSales = useMemo(() => {
    return sales.filter(s => !searchTerm || String(s.id).toLowerCase().includes(searchTerm.toLowerCase()) || s.items.some(i => String(i.name).toLowerCase().includes(searchTerm.toLowerCase())));
  }, [sales, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><ShoppingCart className="w-6 h-6" /></div>Ventas Realizadas</h3>
        {!isAdding && <button onClick={() => setIsAdding(true)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition shadow-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva Venta</button>}
      </div>
      
      {selectedSale && <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}

      {isAdding ? <NewSaleForm products={products} paymentMethods={paymentMethods} taxRules={taxRules} categories={categories} paymentBonuses={paymentBonuses} onClose={() => setIsAdding(false)} onSave={(newSale) => { setSales([newSale, ...sales]); setIsAdding(false); }} /> : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSales.map(sale => (
            <div key={sale.id} onClick={() => setSelectedSale(sale)} className="bg-white border border-stone-200 p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition cursor-pointer group hover:border-[#b5a898]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center font-black text-stone-400 text-sm group-hover:bg-[#b5a898]/10 group-hover:text-[#b5a898] transition">#{String(sale.id).split('-')[1]}</div>
                <div><h4 className="font-bold text-stone-800 text-base">{sale.items.length === 1 ? String(sale.items[0].name) : `${sale.items.length} productos`}</h4><p className="text-[10px] font-bold uppercase text-stone-400 mt-1 flex items-center gap-1 tracking-widest"><Clock className="w-3 h-3"/> {String(sale.date)}</p></div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col md:items-end gap-1"><p className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(sale.total)}</p><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest">Cobrado</span></div>
                <button className="hidden md:flex items-center gap-2 bg-stone-50 text-stone-500 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest group-hover:bg-[#b5a898] group-hover:text-white transition shadow-sm">
                  Ver Comprobante <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
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
  const [form, setForm] = useState({ description: '', category: expenseCategories[0] || 'Otros', paymentMethod: paymentMethods[0]?.name || 'Efectivo', amount: '', date: new Date().toISOString().split('T')[0] });

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => !searchTerm || String(p.description).toLowerCase().includes(searchTerm.toLowerCase()) || String(p.category).toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [purchases, searchTerm]);

  const addDraft = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    const item = { ...form, id: Date.now() + Math.random(), amount: parseFloat(form.amount) || 0 };
    setDraftExpenses([item, ...draftExpenses]);
    setForm({...form, description: '', amount: ''});
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center text-stone-900">
        <h3 className="text-xl font-bold flex items-center gap-3"><div className="bg-rose-500/10 p-3 rounded-2xl text-rose-600 shadow-sm"><ShoppingBag className="w-6 h-6" /></div>Gastos Operativos</h3>
        {!isAdding && <button onClick={() => setIsAdding(true)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition shadow-sm flex items-center gap-2"><Plus className="w-4 h-4 text-[#b5a898]" /> Nuevo Egreso</button>}
      </div>
      {isAdding ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95">
          <div className="lg:col-span-1 bg-white border border-rose-200 rounded-[2rem] p-6 shadow-md h-fit">
            <form onSubmit={addDraft} className="space-y-4 text-stone-900">
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Fecha</label><input type="date" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Concepto / Referencia</label><input required className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descripción..." /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Categoría P&L</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{expenseCategories.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Medio Pago</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>{paymentMethods.map(m => <option key={String(m.name)} value={String(m.name)}>{String(m.name)}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-rose-600 uppercase">Monto ($)</label><input required type="number" step="0.01" className="w-full bg-rose-50 border border-rose-200 rounded-lg px-4 py-2 text-sm font-black text-rose-600 outline-none" value={String(form.amount)} onChange={e => setForm({...form, amount: e.target.value})} placeholder="Monto..." /></div>
              <button type="submit" className="w-full bg-black text-white py-3 rounded-lg font-bold uppercase text-[10px] mt-2 shadow-sm">Añadir al Lote</button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Lote a registrar</h4>
            <div className="space-y-2">{draftExpenses.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div><p className="font-bold text-stone-800 text-sm">{String(item.description)}</p><p className="text-[9px] font-bold uppercase text-stone-400 tracking-widest">{String(item.category)} • {String(item.paymentMethod)}</p></div>
                <div className="flex items-center gap-4"><p className="font-black text-rose-600">{formatCurrency(item.amount)}</p><button onClick={() => setDraftExpenses(draftExpenses.filter(i => i.id !== item.id))} className="p-2 text-stone-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            ))}</div>
            {draftExpenses.length > 0 && <button onClick={() => { setPurchases([...draftExpenses, ...purchases]); setDraftExpenses([]); setIsAdding(false); }} className="w-full mt-6 bg-emerald-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-emerald-700 transition">Confirmar Registro Definitivo</button>}
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
                  <td className="p-6 text-right font-black text-rose-600 text-lg">-{formatCurrency(p.amount)}</td>
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
  const getMargin = (cat) => {
    const m = categoryMargins.find(x => x.category === cat);
    return m ? m.margin : 50;
  };

  const updateMargin = (cat, val) => {
    const num = parseFloat(val) || 0;
    const exists = categoryMargins.find(x => x.category === cat);
    if (exists) {
      setCategoryMargins(categoryMargins.map(x => x.category === cat ? { ...x, margin: num } : x));
    } else {
      setCategoryMargins([...categoryMargins, { category: cat, margin: num }]);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center gap-3 mb-8 text-stone-900">
        <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Percent className="w-6 h-6" /></div>
        <h3 className="text-xl font-black">Márgenes Predeterminados</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {categories.map(cat => (
           <div key={cat} className="bg-white border p-5 rounded-xl flex justify-between items-center transition shadow-sm border-stone-200 hover:border-[#b5a898]">
             <span className="font-bold text-stone-800 text-sm uppercase">{String(cat)}</span>
             <div className="flex items-center gap-2">
               <input type="number" className="w-20 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-right font-black text-[#8c8173] outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(getMargin(cat))} onChange={(e) => updateMargin(cat, e.target.value)} />
               <span className="text-stone-400 font-bold">%</span>
             </div>
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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Icon className="w-6 h-6" /></div><h3 className="text-xl font-black">{String(title)}</h3></div>
      <form onSubmit={addItem} className="flex gap-3 mb-8"><input type="text" placeholder={placeholder} className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#b5a898] shadow-sm" value={newItem} onChange={(e) => setNewItem(e.target.value)} /><button type="submit" className="bg-black text-white px-6 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-800 transition shadow-sm">Agregar</button></form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((item, index) => (
          <div key={index} className={`bg-white border p-4 rounded-xl flex justify-between items-center group transition shadow-sm ${editingIndex === index ? 'border-[#b5a898] ring-2 ring-[#b5a898]/20' : 'border-stone-200'}`}>
            {editingIndex === index ? (
              <div className="flex-1 flex gap-2"><input autoFocus className="flex-1 bg-stone-50 border-none outline-none font-bold text-stone-800 py-1 px-3 rounded-lg text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(index)} /><button onClick={() => saveEdit(index)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button></div>
            ) : (
              <><span className="font-bold text-stone-800 text-sm">{String(item)}</span><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => startEdit(index, item)} className="p-2 text-stone-400 hover:text-[#b5a898] hover:bg-stone-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => setList(list.filter(i => i !== item))} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button></div></>
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
  const addItem = (e) => { e.preventDefault(); if (newName.trim() && newAccount && !paymentMethods.find(p => p.name === newName.trim())) { setPaymentMethods([...paymentMethods, { name: newName.trim(), account: newAccount }]); setNewName(''); setNewAccount(''); } };
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><CreditCard className="w-6 h-6" /></div><h3 className="text-xl font-black">Formas de Pago</h3></div>
      <form onSubmit={addItem} className="flex flex-wrap gap-3 mb-8">
        <input type="text" placeholder="Ej: Tarjeta de Débito" className="flex-1 min-w-[200px] bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#b5a898] shadow-sm" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <select className="flex-1 min-w-[200px] bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#b5a898] shadow-sm" value={newAccount} onChange={(e) => setNewAccount(e.target.value)}><option value="">Seleccione Cuenta/Banco...</option>{accounts.map(acc => <option key={acc} value={acc}>{String(acc)}</option>)}</select>
        <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-800 transition shadow-sm tracking-widest">Enlazar</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods.map((item, idx) => (
          <div key={idx} className="bg-white border border-stone-200 p-4 rounded-xl flex justify-between items-center group shadow-sm transition">
            <div><span className="font-bold text-stone-800 text-sm block">{String(item.name)}</span><span className="text-[9px] font-bold text-[#b5a898] uppercase mt-1 block">⮑ {String(item.account)}</span></div>
            <button onClick={() => setPaymentMethods(paymentMethods.filter(i => i.name !== item.name))} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BonusManager({ paymentBonuses, setPaymentBonuses, paymentMethods }) {
  const [newBonus, setNewBonus] = useState({ method: '', value: '' });
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex items-center gap-3 mb-8"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Gift className="w-6 h-6" /></div><h3 className="text-xl font-black text-stone-900">Bonificaciones</h3></div>
      <div className="flex flex-wrap gap-4 items-end mb-8 bg-white p-6 rounded-[1.5rem] border border-stone-200 shadow-sm">
        <div className="flex-1 min-w-[200px] space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Medio Pago</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 font-bold text-sm outline-none" value={newBonus.method} onChange={(e)=>setNewBonus({...newBonus, method: e.target.value})}><option value="">Seleccione...</option>{paymentMethods.map(p => <option key={String(p.name)} value={String(p.name)}>{String(p.name)}</option>)}</select></div>
        <div className="w-32 space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Valor (%)</label><div className="relative"><input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 font-black text-sm pr-8 outline-none" value={String(newBonus.value)} onChange={(e)=>setNewBonus({...newBonus, value: e.target.value})} /><Percent className="absolute right-3 top-3.5 w-3.5 h-3.5 text-stone-400"/></div></div>
        <button onClick={() => { if(newBonus.method && newBonus.value) { setPaymentBonuses([...paymentBonuses, { ...newBonus, id: Date.now(), value: parseFloat(newBonus.value) }]); setNewBonus({ method: '', value: '' }); } }} className="bg-black text-white px-8 py-3 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-stone-800 transition">Configurar</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentBonuses.map(b => (<div key={b.id} className="bg-stone-50 border border-stone-200 p-5 rounded-xl flex justify-between items-center group shadow-sm"><div><p className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-0.5">{String(b.method)}</p><p className="text-xl font-black text-[#8c8173]">{String(b.value)}% OFF</p></div><button onClick={() => setPaymentBonuses(paymentBonuses.filter(x => x.id !== b.id))} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-4 h-4" /></button></div>))}
      </div>
    </div>
  );
}

function TaxManager({ taxRules, setTaxRules, categories, paymentMethods, taxConcepts, setTaxConcepts }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newRule, setNewRule] = useState({ category: '', paymentMethod: '', concepts: [] });
  const [newConcept, setNewConcept] = useState({ name: '', value: '' });
  const [isCreatingConcept, setIsCreatingConcept] = useState(false);
  const [customConcept, setCustomConcept] = useState('');
  const handleSaveRule = () => { if (newRule.category && newRule.paymentMethod && newRule.concepts.length > 0) { if (editingId) setTaxRules(taxRules.map(r => r.id === editingId ? { ...newRule, id: editingId } : r)); else setTaxRules([...taxRules, { ...newRule, id: Date.now() }]); setNewRule({ category: '', paymentMethod: '', concepts: [] }); setEditingId(null); setShowForm(false); } };
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Coins className="w-6 h-6" /></div><h3 className="text-xl font-black text-stone-900">Reglas Financieras</h3></div>{!showForm && <button onClick={() => setShowForm(true)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-stone-800 transition shadow-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva Regla</button>}</div>
      {showForm && (
        <div className="bg-white border border-[#b5a898]/30 rounded-[2rem] p-8 mb-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Categoría</label><select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={newRule.category} onChange={(e) => setNewRule({...newRule, category: e.target.value})}><option value="">Seleccione...</option><option value="Todas">Todas</option>{categories.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}</select></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Medio Pago</label><select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={newRule.paymentMethod} onChange={(e) => setNewRule({...newRule, paymentMethod: e.target.value})}><option value="">Seleccione...</option><option value="Todas">Todas</option>{paymentMethods.map(p => <option key={String(p.name)} value={String(p.name)}>{String(p.name)}</option>)}</select></div>
          </div>
          <div className="border-t border-stone-100 pt-6 mb-6">
            <div className="flex flex-wrap gap-4 items-end mb-6 bg-stone-50 p-6 rounded-[1.5rem]">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Concepto P&L</label>
                {isCreatingConcept ? (
                   <div className="flex items-center gap-2"><input type="text" className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none" placeholder="Nombre..." value={customConcept} onChange={e => setCustomConcept(e.target.value)} autoFocus /><button onClick={() => { if (customConcept.trim()) { if (!taxConcepts.includes(customConcept.trim())) setTaxConcepts([...taxConcepts, customConcept.trim()]); setNewConcept({...newConcept, name: customConcept.trim()}); setCustomConcept(''); setIsCreatingConcept(false); } }} className="p-2.5 bg-black text-white rounded-lg"><Check className="w-4 h-4"/></button></div>
                ) : (
                   <select className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none" value={newConcept.name} onChange={(e) => e.target.value === '__NEW__' ? setIsCreatingConcept(true) : setNewConcept({...newConcept, name: e.target.value})}><option value="">Seleccionar...</option>{taxConcepts.map(opt => <option key={String(opt)} value={String(opt)}>{String(opt)}</option>)}<option value="__NEW__" className="text-[#b5a898]">+ Nuevo...</option></select>
                )}
              </div>
              <div className="w-24 space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Valor %</label><input type="number" className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-black outline-none text-rose-600" value={String(newConcept.value)} onChange={(e) => setNewConcept({...newConcept, value: e.target.value})} /></div>
              <button onClick={() => { if(newConcept.name && newConcept.value) { setNewRule({ ...newRule, concepts: [...newRule.concepts, { ...newConcept, value: parseFloat(newConcept.value) }] }); setNewConcept({ name: '', value: '' }); } }} className="bg-[#b5a898] text-white h-[42px] px-6 rounded-lg font-bold text-[10px] uppercase tracking-widest">Añadir</button>
            </div>
            <div className="space-y-3">{newRule.concepts.map((c, idx) => (<div key={idx} className="flex justify-between items-center bg-white border border-stone-100 px-5 py-3 rounded-xl shadow-sm"><span className="font-bold text-sm text-stone-800">{String(c.name)}</span><span className="font-black text-rose-600">{String(c.value)}%</span></div>))}</div>
          </div>
          <button onClick={handleSaveRule} className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-stone-800 transition">Guardar Regla</button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {taxRules.map(rule => (<div key={rule.id} className="bg-white border border-stone-200 rounded-2xl p-6 flex justify-between items-center shadow-sm group transition"><div className="flex items-center gap-3"><span className="bg-black text-white px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">{String(rule.category)}</span><Plus className="w-3.5 h-3.5 text-stone-400" /><span className="bg-stone-100 text-[#8c8173] px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">{String(rule.paymentMethod)}</span></div><button onClick={() => setTaxRules(taxRules.filter(r => r.id !== rule.id))} className="p-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-4 h-4" /></button></div>))}
      </div>
    </div>
  );
}

function VariablesView({ categories, setCategories, expenseCategories, setExpenseCategories, paymentMethods, setPaymentMethods, taxRules, setTaxRules, paymentBonuses, setPaymentBonuses, categoryMargins, setCategoryMargins, taxConcepts, setTaxConcepts, accounts, setAccounts }) {
  const [activeTab, setActiveTab] = useState('categories');
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm w-fit overflow-x-auto">
        <button onClick={() => setActiveTab('categories')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'categories' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Tags className="w-3.5 h-3.5" /> Categorías</button>
        <button onClick={() => setActiveTab('margins')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'margins' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Percent className="w-3.5 h-3.5" /> Márgenes</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'expenses' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><ShoppingBag className="w-3.5 h-3.5" /> Cat. Gastos</button>
        <button onClick={() => setActiveTab('accounts')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'accounts' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Landmark className="w-3.5 h-3.5" /> Bancos y Cajas</button>
        <button onClick={() => setActiveTab('payments')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'payments' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><CreditCard className="w-3.5 h-3.5" /> Formas Pago</button>
        <button onClick={() => setActiveTab('bonuses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'bonuses' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Gift className="w-3.5 h-3.5" /> Bonificaciones</button>
        <button onClick={() => setActiveTab('taxes')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'taxes' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Receipt className="w-3.5 h-3.5" /> Impuestos e Int.</button>
      </div>
      <div className="bg-[#f4f2f0] p-8 md:p-12 rounded-[3rem] border border-stone-200 shadow-inner min-h-[500px]">
        {activeTab === 'categories' && <VariableManager title="Categorías de Inventario" list={categories} setList={setCategories} icon={Tags} placeholder="Ej: Escritorios..." />}
        {activeTab === 'margins' && <MarginManager categories={categories} categoryMargins={categoryMargins} setCategoryMargins={setCategoryMargins} />}
        {activeTab === 'expenses' && <VariableManager title="Categorías de Egresos" list={expenseCategories} setList={setExpenseCategories} icon={ShoppingBag} placeholder="Ej: Servicios Generales..." />}
        {activeTab === 'accounts' && <VariableManager title="Cuentas, Cajas y Bancos" list={accounts} setList={setAccounts} icon={Landmark} placeholder="Ej: Banco Galicia..." />}
        {activeTab === 'payments' && <PaymentMethodManager paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} accounts={accounts} />}
        {activeTab === 'bonuses' && <BonusManager paymentBonuses={paymentBonuses} setPaymentBonuses={setPaymentBonuses} paymentMethods={paymentMethods} />}
        {activeTab === 'taxes' && <TaxManager taxRules={taxRules} setTaxRules={setTaxRules} categories={categories} paymentMethods={paymentMethods} taxConcepts={taxConcepts} setTaxConcepts={setTaxConcepts} />}
      </div>
    </div>
  );
}

// --- APLICACIÓN PRINCIPAL ---
export default function App() {
  // 1. Estados Auth
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2. Estados Navegación/UI
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 3. Estados de Datos
  const [products, setProductsLocal] = useState([]);
  const [sales, setSalesLocal] = useState([]);
  const [purchases, setPurchasesLocal] = useState([]); 
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [categoryMargins, setCategoryMargins] = useState(INITIAL_CATEGORY_MARGINS);
  const [expenseCategories, setExpenseCategories] = useState(INITIAL_PURCHASE_CATEGORIES);
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [paymentMethods, setPaymentMethods] = useState(INITIAL_PAYMENTS);
  const [taxRules, setTaxRules] = useState(INITIAL_TAX_RULES);
  const [paymentBonuses, setPaymentBonuses] = useState(INITIAL_PAYMENT_BONUSES);
  const [taxConcepts, setTaxConcepts] = useState(INITIAL_TAX_CONCEPTS);

  // 4. Efecto de Autenticación
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // 5. Efecto de Base de Datos
  useEffect(() => {
    if (!user) return; // Si no hay usuario, no intenta leer nada
    const unsubscribeData = onSnapshot(doc(db, "sistema", "datosGenerales"), (documento) => {
      if (documento.exists()) {
        const data = documento.data();
        if (data.productos) setProductsLocal(data.productos);
        if (data.ventas) setSalesLocal(data.ventas);
        if (data.gastos) setPurchasesLocal(data.gastos);
      }
    });
    return () => unsubscribeData();
  }, [user]);

  // 6. Funciones para Guardar en Nube
  const setProducts = (nuevosProductos) => {
    setProductsLocal(nuevosProductos);
    setDoc(doc(db, "sistema", "datosGenerales"), { productos: nuevosProductos }, { merge: true });
  };
  const setSales = (nuevasVentas) => {
    setSalesLocal(nuevasVentas);
    setDoc(doc(db, "sistema", "datosGenerales"), { ventas: nuevasVentas }, { merge: true });
  };
  const setPurchases = (nuevosGastos) => {
    setPurchasesLocal(nuevosGastos);
    setDoc(doc(db, "sistema", "datosGenerales"), { gastos: nuevosGastos }, { merge: true });
  };

  // --- BARRERAS DE SEGURIDAD ---
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#f4f2f0]">
      <div className="font-black text-stone-400 uppercase tracking-widest flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-stone-300 border-t-black rounded-full animate-spin"></div>
        Cargando Sistema...
      </div>
    </div>
  );
  if (!user) return <Login />;

  const NavItem = ({ icon: Icon, label, id }) => (
    <button 
      onClick={() => { setCurrentView(id); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${
        currentView === id 
        ? 'bg-[#b5a898] text-white shadow-md' 
        : 'text-stone-400 hover:bg-stone-800 hover:text-white'
      }`}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
      <span>{String(label)}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f4f2f0] font-sans text-[#1a1a1a] overflow-hidden text-[13px]">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:relative h-full w-72 bg-[#1a1a1a] text-white z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="mb-10 flex flex-col gap-2">
            <img 
              src="image_d2c046.png" 
              alt="Mobilia Logo" 
              className="h-8 object-contain object-left brightness-0 invert opacity-95"
            />
            <p className="text-[9px] text-[#b5a898] font-bold uppercase tracking-[0.3em] pl-1">Design & Deco</p>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
            <NavItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
            <NavItem icon={Activity} label="Flujo de Caja" id="cashflow" />
            <NavItem icon={FileText} label="P&L (Resultados)" id="pnl" />
            <NavItem icon={PieChart} label="Rentabilidad Ventas" id="profitability" />
            <NavItem icon={Package} label="Inventario" id="inventory" />
            <NavItem icon={ShoppingCart} label="Ventas" id="sales" />
            <NavItem icon={ShoppingBag} label="Gastos" id="purchases" />
            <div className="pt-4 mt-4 border-t border-stone-800/50">
              <NavItem icon={Settings} label="Configuración" id="variables" />
            </div>
          </nav>

          <div className="pt-6 border-t border-stone-800/50 shrink-0">
            <div className="bg-black p-4 rounded-xl flex items-center gap-3 border border-stone-800">
              <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center font-black text-xs text-[#b5a898]">MH</div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white truncate">{user.email}</p>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">Activo</p>
              </div>
            </div>
            {/* BOTÓN PARA CERRAR SESIÓN */}
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
        <header className="h-20 bg-white border-b border-stone-200 flex items-center justify-between px-6 lg:px-10 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-black text-stone-900 uppercase tracking-tighter">
              {
                currentView === 'variables' ? 'Variables y Costos' : 
                currentView === 'purchases' ? 'Gastos Operativos' : 
                currentView === 'sales' ? 'Gestión de Ventas' : 
                currentView === 'cashflow' ? 'Flujo de Caja' : 
                currentView === 'pnl' ? 'Estado de Resultados P&L' :
                currentView === 'profitability' ? 'Rentabilidad por Venta' :
                currentView === 'inventory' ? 'Inventario' :
                'Dashboard'
              }
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-stone-50 px-4 py-2.5 rounded-xl border border-stone-200 focus-within:ring-2 focus-within:ring-[#b5a898] transition-all group">
              <Search className="w-4 h-4 text-stone-400 group-focus-within:text-[#b5a898]" />
              <input 
                type="text" 
                placeholder="Buscar en el sistema..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-48 lg:w-72 font-bold text-stone-800 outline-none placeholder:font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-[#f4f2f0]">
          {currentView === 'dashboard' && <DashboardView sales={sales} products={products} purchases={purchases} accounts={accounts} paymentMethods={paymentMethods} />}
          {currentView === 'cashflow' && <CashFlowView sales={sales} purchases={purchases} searchTerm={searchTerm} />}
          {currentView === 'pnl' && <PnLView sales={sales} purchases={purchases} paymentBonuses={paymentBonuses} taxRules={taxRules} />}
          {currentView === 'profitability' && <ProfitabilityView sales={sales} taxRules={taxRules} paymentBonuses={paymentBonuses} searchTerm={searchTerm} />}
          {currentView === 'inventory' && <InventoryView products={products} setProducts={setProducts} categories={categories} categoryMargins={categoryMargins} searchTerm={searchTerm} />}
          {currentView === 'sales' && (
            <SalesView 
              sales={sales} 
              setSales={setSales} 
              products={products} 
              paymentMethods={paymentMethods} 
              taxRules={taxRules}
              categories={categories}
              paymentBonuses={paymentBonuses}
              searchTerm={searchTerm}
            />
          )}
          {currentView === 'purchases' && (
            <PurchasesView 
              purchases={purchases}
              setPurchases={setPurchases}
              paymentMethods={paymentMethods}
              expenseCategories={expenseCategories}
              searchTerm={searchTerm}
            />
          )}
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