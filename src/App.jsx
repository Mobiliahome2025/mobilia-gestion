import React, { useState, useMemo, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './Login';
import { 
  LayoutDashboard, Package, ShoppingCart, BarChart3, Plus, Search, Clock, 
  Armchair, Trash2, Pencil, X, Menu, Settings, CreditCard, Tags, Coins, 
  Receipt, Check, ArrowRight, Wallet, TrendingDown, TrendingUp, Gift, Boxes, 
  Percent, PackagePlus, CheckCircle2, UploadCloud, FileSpreadsheet, Download, 
  ShoppingBag, Calendar, Activity, FileText, Filter, ChevronRight, ChevronDown, 
  PieChart, Info, Landmark 
} from 'lucide-react';

// --- CONSTANTES INICIALES ---
const INITIAL_CATEGORIES = ['Sofás', 'Mesas', 'Sillas', 'Living', 'Dormitorio', 'Decoración'];
const INITIAL_PURCHASE_CATEGORIES = ['Mercadería', 'Alquiler', 'Luz', 'Internet', 'Sueldos', 'Publicidad', 'Mantenimiento', 'Impuestos', 'Financiero', 'Otros'];
const INITIAL_ACCOUNTS = [
  { name: 'Caja Efectivo', initialBalance: 0 },
  { name: 'Banco Santander', initialBalance: 0 },
  { name: 'Mercado Pago', initialBalance: 0 }
];
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

function DashboardView({ sales, products, purchases, accounts, paymentMethods }) {
  const totalSales = useMemo(() => sales.reduce((acc, s) => acc + (s.payments?.reduce((sum, p) => sum + p.amount, 0) || 0), 0), [sales]);
  const totalExpenses = useMemo(() => purchases.reduce((acc, p) => acc + p.amount, 0), [purchases]);
  const totalInitialBalances = useMemo(() => accounts.reduce((acc, account) => acc + (typeof account === 'string' ? 0 : (account.initialBalance || 0)), 0), [accounts]);
  const netResult = totalSales - totalExpenses + totalInitialBalances;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const totalValue = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);

  const salesCount = sales.length;
  const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

  const balancesByAccount = useMemo(() => {
    const balances = {};
    accounts.forEach(acc => {
      const accName = typeof acc === 'string' ? acc : acc.name;
      balances[accName] = typeof acc === 'string' ? 0 : (acc.initialBalance || 0);
    });
    
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
        <StatCard title="Ingresos Cobrados" value={formatCurrency(totalSales)} icon={<TrendingUp className="w-6 h-6" />} color="greige" />
        <StatCard title="Egresos Totales" value={formatCurrency(totalExpenses)} icon={<TrendingDown className="w-6 h-6" />} color="red" />
        <StatCard title="Cantidad Ventas" value={String(salesCount)} icon={<ShoppingCart className="w-6 h-6" />} color="grey" />
        <StatCard title="Ticket Cobrado Prom." value={formatCurrency(averageTicket)} icon={<Receipt className="w-6 h-6" />} color="emerald" />
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
                      <span className="text-[9px] font-bold text-stone-400 uppercase truncate tracking-widest mb-1">{account}</span>
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
                  <div className="w-full bg-stone-800 rounded-xl shadow-md transition-all duration-1000 flex items-center justify-center text-xs text-white font-bold" style={{ height: totalSales > 0 ? `${Math.max(5, Math.min(100, (totalExpenses/totalSales)*100))}%` : '5%' }}>
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
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
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
      const subtotalCart = sale.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const totalPaymentsVolume = sale.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
      
      const amountCoveredBase = sale.payments?.reduce((acc, p) => {
        const bonus = paymentBonuses.find(b => b.method === p.method)?.value || 0;
        return acc + (p.amount / (1 - (bonus / 100)));
      }, 0) || 0;

      // Para P&L tomamos como ingreso el subtotal de lista (devengado)
      ventasBrutas += subtotalCart;
      
      // Los descuentos comerciales sobre la parte cobrada son costos
      const descuentos = amountCoveredBase - totalPaymentsVolume;
      if (descuentos > 0) {
        directCostsBreakdown['Bonificaciones Otorgadas'] = (directCostsBreakdown['Bonificaciones Otorgadas'] || 0) + descuentos;
        totalDirectCosts += descuentos;
      }

      sale.items.forEach(item => {
         const subtotalItem = item.price * item.qty;
         const costItem = (item.cost || 0) * item.qty;
         
         revenueByCategory[item.category] = (revenueByCategory[item.category] || 0) + subtotalItem;
         directCostsBreakdown['CMV (Costo de Mercadería)'] += costItem;
         totalDirectCosts += costItem;

         if (totalPaymentsVolume > 0 && sale.payments) {
           sale.payments.forEach(pay => {
             const proportion = pay.amount / totalPaymentsVolume;
             
             const matchingRules = taxRules.filter(r => (r.category === item.category || r.category === 'Todas') && (r.paymentMethod === pay.method || r.paymentMethod === 'Todas'));
             matchingRules.forEach(rule => {
                rule.concepts.forEach(c => {
                   let baseAmount = subtotalItem * proportion; // Default c/IVA
                   if (c.base === 'CMV (Costo)') {
                       baseAmount = costItem * proportion;
                   } else if (c.base === 'Precio Lista s/IVA') {
                       baseAmount = (subtotalItem / (1 + (item.iva || 21) / 100)) * proportion;
                   }
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
         }
      });
    });

    filteredPurchases.forEach(p => {
      const iva = parseFloat(p.ivaAmount) || 0;
      const iibb = parseFloat(p.iibbAmount) || 0;
      const cat = String(p.category).toLowerCase();
      
      const netAmount = p.netAmount !== undefined ? parseFloat(p.netAmount) : (parseFloat(p.amount) - iva - iibb);
      
      if (cat.includes('mercadería') || cat.includes('mercaderia') || cat.includes('stock')) {
        comprasMercaderiaAisladas += netAmount;
      } 
      else if (cat.includes('impuesto') || cat.includes('iibb') || cat.includes('iva')) {
        taxesBreakdown[`Pagos: ${p.category}`] = (taxesBreakdown[`Pagos: ${p.category}`] || 0) + netAmount;
        totalTaxes += netAmount;
      }
      else {
        opExBreakdown[p.category] = (opExBreakdown[p.category] || 0) + netAmount;
        totalOpEx += netAmount;
      }

      // Descontamos los créditos fiscales de la carga impositiva
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
      ventasBrutas,
      revenueByCategory,
      totalDirectCosts,
      directCostsBreakdown,
      utilidadBruta,
      totalOpEx,
      opExBreakdown,
      totalTaxes,
      taxesBreakdown,
      resultadoNeto,
      comprasMercaderiaAisladas,
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
                       <span className={`font-black ${val >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{val >= 0 ? '-' : '+'}{formatCurrency(Math.abs(val))}</span>
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
                       <span className={`font-black ${val >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{val >= 0 ? '-' : '+'}{formatCurrency(Math.abs(val))}</span>
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
                       <span className={`font-black ${val >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{val >= 0 ? '-' : '+'}{formatCurrency(Math.abs(val))}</span>
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
                  CONTABILIDAD: Las ventas se registran por su valor total de lista como ingreso. Las compras de stock por un total de <strong className="font-black underline">{formatCurrency(pnlData.comprasMercaderiaAisladas)}</strong> registradas en caja NO se restan en este estado de resultados, ya que representan un activo. El reporte solo descuenta el costo (COGS) de los productos efectivamente vendidos en el período.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ProfitabilityView({ sales, taxRules, paymentBonuses, searchTerm }) {
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  const profitData = useMemo(() => {
    let data = sales.map(sale => {
      const subtotal = sale.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
      const totalCost = sale.items.reduce((acc, item) => acc + ((item.cost || 0) * item.qty), 0);
      
      let absorbedCosts = 0;
      let breakdown = [];

      const totalPaymentsVolume = sale.payments ? sale.payments.reduce((acc, p) => acc + p.amount, 0) : 0;
      
      const amountCoveredBase = sale.payments?.reduce((acc, p) => {
        const bonus = paymentBonuses.find(b => b.method === p.method)?.value || 0;
        return acc + (p.amount / (1 - (bonus / 100)));
      }, 0) || 0;

      const descuentos = amountCoveredBase - totalPaymentsVolume;
      if (descuentos > 0) {
        absorbedCosts += descuentos;
        breakdown.push({ name: 'Bonificaciones / Descuentos Otorgados', amount: descuentos });
      }

      if (totalPaymentsVolume > 0 && sale.payments) {
        sale.items.forEach(item => {
          const itemBaseTotal = item.price * item.qty;
          sale.payments.forEach(pay => {
            const proportion = pay.amount / totalPaymentsVolume;
            
            const matchingRules = taxRules.filter(r => (r.category === item.category || r.category === 'Todas') && (r.paymentMethod === pay.method || r.paymentMethod === 'Todas'));
            matchingRules.forEach(rule => {
              rule.concepts.forEach(c => {
                let baseAmount = itemBaseTotal * proportion;
                if (c.base === 'CMV (Costo)') {
                   baseAmount = ((item.cost || 0) * item.qty) * proportion;
                } else if (c.base === 'Precio Lista s/IVA') {
                   baseAmount = (itemBaseTotal / (1 + (item.iva || 21) / 100)) * proportion;
                }
                const conceptCost = baseAmount * (c.value / 100);
                
                // Corrección: Acumulamos el costo extra en la variable principal de absorción
                absorbedCosts += conceptCost;
                
                const existing = breakdown.find(b => b.name === c.name);
                if (existing) existing.amount += conceptCost;
                else breakdown.push({ name: c.name, amount: conceptCost });
              });
            });
          });
        });
      }

      const netProfit = subtotal - totalCost - absorbedCosts;
      const margin = subtotal > 0 ? (netProfit / subtotal) * 100 : 0;
      return { ...sale, subtotal, totalCost, absorbedCosts, netProfit, margin, breakdown };
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
      <div className="flex items-center gap-3 text-stone-900 mb-8 uppercase">
        <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><PieChart className="w-6 h-6" /></div>
        <h3 className="text-xl font-bold tracking-tighter">Rentabilidad por Venta</h3>
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
                <th className="p-6 text-right">Costo (COGS)</th>
                <th className="p-6 text-right">Costos Financ/Imp.</th>
                <th className="p-6 text-right">Result. Neto</th>
                <th className="p-6 text-center">Margen / Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {profitData.map((s, idx) => (
                <React.Fragment key={`${s.id}-${idx}`}>
                  <tr className="hover:bg-stone-50/50 transition">
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
                      <div className="flex items-center justify-center gap-3">
                        <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${s.margin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {String(s.margin.toFixed(1))}%
                        </span>
                        <button 
                          onClick={() => setExpandedSaleId(expandedSaleId === s.id ? null : s.id)} 
                          className={`p-1.5 rounded-lg transition ${expandedSaleId === s.id ? 'bg-[#b5a898] text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                          title="Ver detalle de costos"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedSaleId === s.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedSaleId === s.id && (
                    <tr className="bg-stone-50/50 border-b-2 border-[#b5a898]/20">
                      <td colSpan="6" className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                           <div>
                               <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4 border-b border-stone-100 pb-3 flex items-center gap-2"><Boxes className="w-4 h-4"/> Desglose Costo de Mercadería (COGS)</h5>
                               <div className="space-y-3">
                                 {s.items.map((item, i) => (
                                     <div key={i} className="flex justify-between items-center text-xs">
                                         <span className="font-bold text-stone-600">{item.name} <span className="text-[10px] font-black text-stone-400 ml-1">x{item.qty}</span></span>
                                         <span className="font-black text-stone-800">{formatCurrency((item.cost || 0) * item.qty)}</span>
                                     </div>
                                 ))}
                               </div>
                               <div className="flex justify-between items-center text-xs mt-4 pt-3 border-t border-stone-100">
                                   <span className="font-black uppercase tracking-widest text-stone-500">Total COGS</span>
                                   <span className="font-black text-stone-800 text-sm">{formatCurrency(s.totalCost)}</span>
                               </div>
                           </div>
                           <div>
                               <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4 border-b border-stone-100 pb-3 flex items-center gap-2"><Coins className="w-4 h-4"/> Desglose Costos Extra (Financieros / Impuestos)</h5>
                               <div className="space-y-3">
                                 {s.breakdown && s.breakdown.length > 0 ? (
                                     s.breakdown.map((b, i) => (
                                         <div key={i} className="flex justify-between items-center text-xs">
                                             <span className="font-bold text-stone-600 uppercase">{b.name}</span>
                                             <span className="font-black text-rose-600">-{formatCurrency(b.amount)}</span>
                                         </div>
                                     ))
                                 ) : (
                                     <p className="text-xs text-stone-400 font-bold uppercase tracking-widest text-center py-2">Sin costos extra absorbidos</p>
                                 )}
                               </div>
                               <div className="flex justify-between items-center text-xs mt-4 pt-3 border-t border-stone-100">
                                   <span className="font-black uppercase tracking-widest text-stone-500">Total Costos Extra</span>
                                   <span className="font-black text-rose-600 text-sm">-{formatCurrency(s.absorbedCosts)}</span>
                               </div>
                           </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const movements = useMemo(() => {
    const s = [];
    sales.forEach(sale => {
      sale.payments?.forEach(pay => {
        s.push({
          id: pay.id || Math.random(),
          date: pay.date || sale.date,
          concept: `Cobro Venta #${String(sale.id).split('-')[1] || String(sale.id)}`,
          detail: sale.items.map(i => i.name).join(', '),
          type: 'Ingreso',
          method: pay.method,
          amount: pay.amount 
        });
      });
    });

    const p = purchases.map(pur => ({
      id: pur.id,
      date: pur.date,
      concept: pur.category,
      detail: pur.description,
      type: 'Egreso',
      method: pur.paymentMethod,
      amount: -pur.amount
    }));

    let all = [...s, ...p];

    if (startDate) all = all.filter(m => m.date >= startDate);
    if (endDate) all = all.filter(m => m.date <= endDate);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      all = all.filter(m => 
        String(m.concept).toLowerCase().includes(term) || 
        String(m.detail).toLowerCase().includes(term) ||
        String(m.method).toLowerCase().includes(term)
      );
    }

    return all.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, purchases, startDate, endDate, searchTerm]);

  const periodIn = movements.filter(m => m.amount > 0).reduce((acc, m) => acc + m.amount, 0);
  const periodOut = movements.filter(m => m.amount < 0).reduce((acc, m) => acc + Math.abs(m.amount), 0);
  const periodBalance = periodIn - periodOut;

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Concepto', 'Detalle', 'Medio de Pago', 'Monto'];
    const rows = movements.map(m => [
      m.date,
      m.type,
      `"${m.concept}"`,
      `"${m.detail}"`,
      `"${m.method}"`,
      m.amount
    ]);
    
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
          <button onClick={handleExportCSV} className="bg-black text-white p-2.5 rounded-xl hover:bg-stone-800 transition shadow-sm" title="Descargar CSV">
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
      const matchesSearch = !searchTerm || 
        String(p.name).toLowerCase().includes(searchTerm.toLowerCase()) || 
        String(p.sku).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.supplier).toLowerCase().includes(searchTerm.toLowerCase());
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
      method: tempMethod,
      amount: a,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedSale = {
      ...sale,
      payments: [...(sale.payments || []), newPayment]
    };
    onUpdateSale(updatedSale);
    setTempMethod('');
    setTempAmount('');
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
                 <div className="flex flex-col gap-3">
                    {sale.payments && sale.payments.map((pay, idx) => (
                      <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 flex justify-between items-center shadow-sm">
                         <div>
                           <span className="text-[10px] font-bold text-stone-500 tracking-widest uppercase block">{String(pay.method)}</span>
                           <span className="text-[8px] text-stone-400 font-bold tracking-widest uppercase">{pay.date || sale.date}</span>
                         </div>
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
                        <span>Suma Lista</span>
                        <span className="text-stone-800 font-black">{formatCurrency(subtotal)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 text-stone-900">
                        <span className="font-black text-xs uppercase tracking-widest text-emerald-600">Total Abonado</span>
                        <div className="text-right">
                          <span className="text-4xl font-black block tracking-tighter text-emerald-600">{formatCurrency(actualTotalPaid)}</span>
                        </div>
                      </div>

                      <div className={`mt-6 pt-6 border-t border-stone-200 flex justify-between items-center text-xs font-bold uppercase tracking-widest ${balance > 0.1 ? 'text-rose-500' : 'text-stone-400'}`}>
                        <span>Saldo Pendiente</span>
                        <span className="font-black text-lg">{formatCurrency(balance)}</span>
                      </div>
                    </div>
                 </div>
               </div>

               {balance > 0.1 && (
                 <div className="mt-8 bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm">
                   <h4 className="text-[10px] font-bold text-stone-800 uppercase tracking-widest mb-4">Registrar Nuevo Cobro</h4>
                   <div className="space-y-4">
                     <div>
                       <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={tempMethod} onChange={(e)=>setTempMethod(e.target.value)}>
                         <option value="">Medio de Pago...</option>
                         {paymentMethods.map(p => <option key={String(p.name)} value={String(p.name)}>{String(p.name)}</option>)}
                       </select>
                     </div>
                     <div className="flex gap-2">
                       <input type="number" className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-emerald-600 text-sm outline-none" value={tempAmount} onChange={(e)=>setTempAmount(e.target.value)} placeholder="Monto a cobrar..." />
                       <button onClick={handleAddPayment} className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition">Cobrar</button>
                     </div>
                     {currentBonusVal > 0 && tempMethod && (
                       <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest text-center mt-2">Aplicando {currentBonusVal}% descuento</p>
                     )}
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

function NewSaleForm({ products, paymentMethods, taxRules, categories, paymentBonuses, onClose, onSave, editingSale }) {
  const [cart, setCart] = useState(editingSale ? editingSale.items : []);
  const [payments, setPayments] = useState(editingSale ? editingSale.payments || [] : []);
  const [productSearch, setProductSearch] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [tempCost, setTempCost] = useState(''); 
  const [tempIva, setTempIva] = useState('');
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
      const maxToPay = balanceBase * (1 - (currentBonusVal / 100));
      setTempPaymentAmount(maxToPay.toFixed(2));
    } else if (!tempPaymentMethod) {
      setTempPaymentAmount('');
    }
  }, [tempPaymentMethod, balanceBase, currentBonusVal]);

  const handleMaxPayment = () => {
    if (balanceBase > 0) {
      const maxToPay = balanceBase * (1 - (currentBonusVal / 100));
      setTempPaymentAmount(maxToPay.toFixed(2));
    }
  };

  const addToCart = () => {
    const p = parseFloat(tempPrice);
    const c = parseFloat(tempCost) || 0; 
    const i = parseFloat(tempIva) || 21;
    const q = parseInt(tempQty);
    if (!productSearch || !tempCategory || isNaN(p) || p <= 0) return;
    setCart([...cart, { id: Date.now() + Math.random(), name: productSearch, category: tempCategory, price: p, cost: c, iva: i, qty: q || 1 }]);
    setProductSearch(''); setTempCategory(''); setTempPrice(''); setTempCost(''); setTempIva(''); setTempQty('1');
  };

  const addPayment = () => {
    const a = parseFloat(tempPaymentAmount);
    if (!tempPaymentMethod || isNaN(a) || a <= 0) return;
    setPayments([...payments, { id: Date.now() + Math.random(), method: tempPaymentMethod, amount: a, date: new Date().toISOString().split('T')[0] }]);
    setTempPaymentMethod(''); setTempPaymentAmount('');
  };

  const handleFinalSave = () => {
    if (cart.length === 0) return;
    onSave({
      id: editingSale ? editingSale.id : `V-${Math.floor(Math.random() * 9000) + 1000}`,
      items: cart,
      date: editingSale ? editingSale.date : new Date().toISOString().split('T')[0],
      total: actualTotalPaid, 
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
                       key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} 
                       onClick={() => { setProductSearch(String(p.name)); setTempCategory(String(p.category)); setTempPrice(String(p.price)); setTempCost(String(p.cost || 0)); setTempIva(String(p.iva || 21)); setShowResults(false); }} 
                       className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-100 flex justify-between items-center transition"
                     >
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
            <div className="flex-1 space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Importe ($)</label>
              <div className="relative"><input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-emerald-600 text-sm pr-16 outline-none" value={tempPaymentAmount} onChange={(e)=>setTempPaymentAmount(e.target.value)} />
              {balanceBase > 0 && tempPaymentMethod && <button type="button" onClick={handleMaxPayment} className="absolute right-2 top-2.5 px-2 py-1 bg-white border border-stone-200 text-[9px] font-bold uppercase rounded text-stone-500 hover:text-emerald-600 shadow-sm transition">Máx</button>}</div>
            </div>
            <button type="button" onClick={addPayment} className="self-end bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition shadow-sm">Añadir Pago</button>
          </div>
          <div className="space-y-3">
            {payments.map(pay => {
               const b = paymentBonuses.find(x => x.method === pay.method)?.value || 0;
               const acreditado = pay.amount / (1 - (b/100));
               return (
                <div key={pay.id} className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <div className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div><span className="font-bold text-sm text-emerald-900 block">{pay.method}</span><span className="text-[9px] text-emerald-700 uppercase font-bold tracking-widest block">Saldó: {formatCurrency(acreditado)}</span></div>
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
          <button 
            onClick={handleFinalSave} 
            disabled={cart.length === 0 || balanceBase < -0.1} // Allows saving with balance > 0
            className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#a39686] transition mt-8 shadow-lg disabled:opacity-10 active:scale-95 flex items-center justify-center gap-2"
          >
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
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => String(s.id).toLowerCase().includes(term) || s.items.some(i => String(i.name).toLowerCase().includes(term)));
    }
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

  const deleteSale = (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta venta permanentemente?")) {
      setSales(sales.filter(s => s.id !== id));
    }
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

      {isAdding ? <NewSaleForm products={products} paymentMethods={paymentMethods} taxRules={taxRules} categories={categories} paymentBonuses={paymentBonuses} editingSale={editingSale} onClose={() => { setIsAdding(false); setEditingSale(null); }} onSave={(newSale) => { if (editingSale) { setSales(sales.map(s => s.id === newSale.id ? newSale : s)); } else { setSales([newSale, ...sales]); } setIsAdding(false); setEditingSale(null); }} /> : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSales.map(sale => {
            const subtotal = sale.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
            const amountCoveredBase = sale.payments?.reduce((acc, p) => {
              const bonus = paymentBonuses.find(b => b.method === p.method)?.value || 0;
              return acc + (p.amount / (1 - (bonus / 100)));
            }, 0) || 0;
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
                  {balance > 0.1 ? 
                    <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-md text-[9px] font-black uppercase tracking-widest">Debe {formatCurrency(balance)}</span> : 
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest">Cobrado</span>
                  }
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedSaleDetail(sale)} className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition shadow-sm ${balance > 0.1 ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-stone-50 text-stone-500 hover:bg-[#b5a898] hover:text-white'}`}>
                    {balance > 0.1 ? 'Cobrar' : 'Comprobante'} <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditingSale(sale); setIsAdding(true); }} className="p-3 bg-stone-50 text-stone-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition" title="Editar Venta"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteSale(sale.id)} className="p-3 bg-stone-50 text-stone-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition" title="Eliminar Venta"><Trash2 className="w-4 h-4" /></button>
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

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => !searchTerm || String(p.description).toLowerCase().includes(searchTerm.toLowerCase()) || String(p.category).toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [purchases, searchTerm]);

  const addDraft = (e) => {
    e.preventDefault();
    if (!form.description || !form.netAmount) return;
    
    const net = parseFloat(form.netAmount) || 0;
    const iva = parseFloat(form.ivaAmount) || 0;
    const iibb = parseFloat(form.iibbAmount) || 0;
    const total = net + iva + iibb;
    
    const item = { 
        ...form, 
        id: Date.now() + Math.random(), 
        netAmount: net,
        amount: total,
        ivaAmount: iva,
        iibbAmount: iibb
    };
    setDraftExpenses([item, ...draftExpenses]);
    setForm({...form, description: '', netAmount: '', ivaAmount: '', iibbAmount: ''});
  };

  const draftNetTotal = draftExpenses.reduce((acc, item) => acc + (parseFloat(item.netAmount)||0), 0);
  const draftIvaTotal = draftExpenses.reduce((acc, item) => acc + (parseFloat(item.ivaAmount)||0), 0);
  const draftIibbTotal = draftExpenses.reduce((acc, item) => acc + (parseFloat(item.iibbAmount)||0), 0);
  const draftTotal = draftExpenses.reduce((acc, item) => acc + (parseFloat(item.amount)||0), 0);

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
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Categoría P&L</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Medio Pago</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-bold outline-none" value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value})}>{paymentMethods.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}</select></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Subtotal Neto ($)</label><input required type="number" step="0.01" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-2 text-sm font-black text-stone-800 outline-none" value={String(form.netAmount)} onChange={e => setForm({...form, netAmount: e.target.value})} placeholder="Neto..." /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-emerald-600 uppercase">IVA Cr. ($)</label><input type="number" step="0.01" className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm font-black text-emerald-700 outline-none" value={String(form.ivaAmount)} onChange={e => setForm({...form, ivaAmount: e.target.value})} placeholder="Ej: 2100" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold text-emerald-600 uppercase">IIBB Per. ($)</label><input type="number" step="0.01" className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-sm font-black text-emerald-700 outline-none" value={String(form.iibbAmount)} onChange={e => setForm({...form, iibbAmount: e.target.value})} placeholder="Ej: 500" /></div>
              </div>

              <div className="bg-stone-100 p-4 rounded-xl flex justify-between items-center border border-stone-200 mt-2 shadow-sm">
                 <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Total Fac. (Caja)</span>
                 <span className="text-xl font-black text-rose-600">{formatCurrency((parseFloat(form.netAmount)||0) + (parseFloat(form.ivaAmount)||0) + (parseFloat(form.iibbAmount)||0))}</span>
              </div>
              
              <button type="submit" className="w-full bg-black text-white py-3 rounded-lg font-bold uppercase text-[10px] mt-2 shadow-sm hover:bg-stone-800 transition">Añadir al Lote</button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Lote a registrar</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">{draftExpenses.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div>
                    <p className="font-bold text-stone-800 text-sm">{String(item.description)}</p>
                    <p className="text-[9px] font-bold uppercase text-stone-400 tracking-widest">
                      {String(item.category)} • {String(item.paymentMethod)}
                      {item.ivaAmount > 0 ? ` • IVA: ${formatCurrency(item.ivaAmount)}` : ''} 
                      {item.iibbAmount > 0 ? ` • IIBB: ${formatCurrency(item.iibbAmount)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="text-right">
                       <p className="font-black text-rose-600">{formatCurrency(item.amount)}</p>
                       <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Neto: {formatCurrency(item.netAmount)}</p>
                     </div>
                     <button onClick={() => setDraftExpenses(draftExpenses.filter(i => i.id !== item.id))} className="p-2 text-stone-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}</div>
            </div>
            
            {draftExpenses.length > 0 && (
              <div className="mt-6 bg-stone-50 border border-stone-200 p-6 rounded-2xl">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4 border-b border-stone-200 pb-3">Totalizador del Lote</h5>
                <div className="space-y-2 mb-4">
                   <div className="flex justify-between items-center text-xs font-bold text-stone-500"><span className="uppercase tracking-widest">Subtotal Neto</span><span>{formatCurrency(draftNetTotal)}</span></div>
                   <div className="flex justify-between items-center text-xs font-bold text-emerald-600"><span className="uppercase tracking-widest">Impuestos (IVA + IIBB)</span><span>+{formatCurrency(draftIvaTotal + draftIibbTotal)}</span></div>
                </div>
                <div className="flex justify-between items-center border-t border-stone-200 pt-4">
                   <span className="text-[10px] font-black uppercase tracking-widest text-stone-800">Total a Egresar Caja</span>
                   <span className="text-2xl font-black text-rose-600">{formatCurrency(draftTotal)}</span>
                </div>
                <button onClick={() => { setPurchases([...draftExpenses, ...purchases]); setDraftExpenses([]); setIsAdding(false); }} className="w-full mt-6 bg-emerald-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-emerald-700 transition">Confirmar Registro Definitivo</button>
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
                  <td className="p-6">
                    <p className="font-bold text-stone-800 text-sm">{String(p.description)}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-[8px] bg-black text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider">{String(p.category)}</span>
                      <span className="text-[8px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded uppercase font-bold tracking-wider border border-stone-200">{String(p.paymentMethod)}</span>
                      {parseFloat(p.ivaAmount) > 0 && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider border border-emerald-200">IVA +{formatCurrency(p.ivaAmount)}</span>}
                      {parseFloat(p.iibbAmount) > 0 && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider border border-emerald-200">IIBB +{formatCurrency(p.iibbAmount)}</span>}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                     <p className="font-black text-rose-600 text-lg">-{formatCurrency(p.amount)}</p>
                     <p className="text-[9px] font-bold text-stone-400 mt-1 uppercase tracking-widest">Neto: {formatCurrency(p.netAmount !== undefined ? p.netAmount : (parseFloat(p.amount) - (parseFloat(p.ivaAmount)||0) - (parseFloat(p.iibbAmount)||0)))}</p>
                  </td>
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
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Icon className="w-6 h-6" /></div><h3 className="text-xl font-black">{title}</h3></div>
      <form onSubmit={addItem} className="flex gap-3 mb-8"><input type="text" placeholder={placeholder} className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#b5a898] shadow-sm" value={newItem} onChange={(e) => setNewItem(e.target.value)} /><button type="submit" className="bg-black text-white px-6 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-800 transition shadow-sm">Agregar</button></form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((item, index) => (
          <div key={index} className={`bg-white border p-4 rounded-xl flex justify-between items-center group transition shadow-sm ${editingIndex === index ? 'border-[#b5a898] ring-2 ring-[#b5a898]/20' : 'border-stone-200'}`}>
            {editingIndex === index ? (
              <div className="flex-1 flex gap-2"><input autoFocus className="flex-1 bg-stone-50 border-none outline-none font-bold text-stone-800 py-1 px-3 rounded-lg text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(index)} /><button onClick={() => saveEdit(index)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button></div>
            ) : (
              <><span className="font-bold text-stone-800 text-sm uppercase">{item}</span><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"><button onClick={() => startEdit(index, item)} className="p-2 text-stone-400 hover:text-[#b5a898] hover:bg-stone-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => setList(list.filter(i => i !== item))} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button></div></>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountManager({ accounts, setAccounts }) {
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const addAccount = (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (trimmed && !accounts.find(a => (a.name || a) === trimmed)) {
      setAccounts([...accounts, { name: trimmed, initialBalance: 0 }]);
      setNewName('');
    }
  };

  const updateBalance = (name, value) => {
    const num = parseFloat(value) || 0;
    setAccounts(accounts.map(acc => {
      const accName = typeof acc === 'string' ? acc : acc.name;
      if (accName === name) {
        return { name: accName, initialBalance: num };
      }
      return acc;
    }));
  };

  const removeAccount = (name) => {
    setAccounts(accounts.filter(acc => (typeof acc === 'string' ? acc : acc.name) !== name));
  };

  const startEdit = (name) => { setEditingName(name); setEditValue(name); };
  
  const saveEdit = (oldName) => {
    if (editValue.trim()) {
       setAccounts(accounts.map(acc => {
         const accName = typeof acc === 'string' ? acc : acc.name;
         return accName === oldName ? { name: editValue.trim(), initialBalance: typeof acc === 'string' ? 0 : (acc.initialBalance || 0) } : acc;
       }));
    }
    setEditingName(null);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center gap-3 mb-8 text-stone-900">
        <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Landmark className="w-6 h-6" /></div>
        <h3 className="text-xl font-black">Cuentas, Cajas y Bancos</h3>
      </div>
      <form onSubmit={addAccount} className="flex gap-3 mb-8">
        <input type="text" placeholder="Ej: Banco Galicia..." className="flex-1 bg-white border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#b5a898] shadow-sm" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className="bg-black text-white px-6 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-800 transition shadow-sm">Agregar</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {accounts.map((acc, idx) => {
           const accName = typeof acc === 'string' ? acc : acc.name;
           const accBalance = typeof acc === 'string' ? 0 : (acc.initialBalance || 0);
           return (
             <div key={idx} className="bg-white border p-5 rounded-xl flex flex-col gap-3 transition shadow-sm border-stone-200 hover:border-[#b5a898] group">
               <div className="flex justify-between items-center">
                 {editingName === accName ? (
                   <div className="flex-1 flex gap-2"><input autoFocus className="flex-1 bg-stone-50 border-none outline-none font-bold text-stone-800 py-1 px-2 rounded-lg text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(accName)} /><button onClick={() => saveEdit(accName)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button></div>
                 ) : (
                   <>
                     <span className="font-bold text-stone-800 text-sm uppercase">{accName}</span>
                     <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => startEdit(accName)} className="p-1.5 text-stone-400 hover:text-[#b5a898] hover:bg-stone-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => removeAccount(accName)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                     </div>
                   </>
                 )}
               </div>
               <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg border border-stone-100 mt-2">
                 <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Saldo Inicial</span>
                 <div className="flex items-center gap-2">
                   <span className="text-stone-400 font-bold">$</span>
                   <input type="number" className="w-24 bg-white border border-stone-200 rounded-md px-2 py-1.5 text-right font-black text-emerald-600 outline-none focus:ring-2 focus:ring-[#b5a898] text-sm" value={String(accBalance)} onChange={(e) => updateBalance(accName, e.target.value)} />
                 </div>
               </div>
             </div>
           );
         })}
      </div>
    </div>
  );
}

function PaymentMethodManager({ paymentMethods, setPaymentMethods, accounts }) {
  const [newName, setNewName] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [editingName, setEditingName] = useState(null);

  const addItem = (e) => { 
    e.preventDefault(); 
    if (newName.trim() && newAccount) { 
      if (editingName) {
        setPaymentMethods(paymentMethods.map(p => p.name === editingName ? { name: newName.trim(), account: newAccount } : p));
      } else if (!paymentMethods.find(p => p.name === newName.trim())) { 
        setPaymentMethods([...paymentMethods, { name: newName.trim(), account: newAccount }]); 
      }
      setNewName(''); 
      setNewAccount('');
      setEditingName(null);
    } 
  };

  const handleEdit = (item) => {
    setNewName(item.name);
    setNewAccount(item.account);
    setEditingName(item.name);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><CreditCard className="w-6 h-6" /></div><h3 className="text-xl font-black">Formas de Pago</h3></div>
      <form onSubmit={addItem} className="flex flex-wrap gap-3 mb-8 bg-white p-6 rounded-[1.5rem] border border-stone-200 shadow-sm items-end">
        <div className="flex-1 min-w-[200px] space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Nombre</label><input type="text" placeholder="Ej: Tarjeta de Débito" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
        <div className="flex-1 min-w-[200px] space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Cuenta/Banco Asociado</label><select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={newAccount} onChange={(e) => setNewAccount(e.target.value)}>
          <option value="">Seleccione...</option>
          {accounts.map(acc => {
            const accName = typeof acc === 'string' ? acc : acc.name;
            return <option key={accName} value={accName}>{accName}</option>
          })}
        </select></div>
        <div className="flex gap-2">
           {editingName && <button type="button" onClick={() => { setEditingName(null); setNewName(''); setNewAccount(''); }} className="bg-stone-100 text-stone-500 px-6 py-3 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-200 transition shadow-sm tracking-widest">Cancelar</button>}
           <button type="submit" className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-800 transition shadow-sm tracking-widest">{editingName ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentMethods.map((item, idx) => (
          <div key={idx} className={`bg-white border p-4 rounded-xl flex justify-between items-center group shadow-sm transition ${editingName === item.name ? 'border-[#b5a898] ring-2 ring-[#b5a898]/20' : 'border-stone-200'}`}>
            <div><span className="font-bold text-stone-800 text-sm block">{item.name}</span><span className="text-[9px] font-bold text-[#b5a898] uppercase mt-1 block">⮑ {item.account}</span></div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
               <button onClick={() => handleEdit(item)} className="p-2 text-stone-400 hover:text-[#b5a898] hover:bg-stone-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
               <button onClick={() => setPaymentMethods(paymentMethods.filter(i => i.name !== item.name))} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BonusManager({ paymentBonuses, setPaymentBonuses, paymentMethods }) {
  const [newBonus, setNewBonus] = useState({ method: '', value: '' });
  const [editingId, setEditingId] = useState(null);

  const handleSave = () => {
     if(newBonus.method && newBonus.value) { 
       if (editingId) {
         setPaymentBonuses(paymentBonuses.map(b => b.id === editingId ? { ...newBonus, id: editingId, value: parseFloat(newBonus.value) } : b));
       } else {
         setPaymentBonuses([...paymentBonuses, { ...newBonus, id: Date.now(), value: parseFloat(newBonus.value) }]); 
       }
       setNewBonus({ method: '', value: '' }); 
       setEditingId(null);
     } 
  };

  const handleEdit = (b) => {
     setNewBonus({ method: b.method, value: b.value });
     setEditingId(b.id);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex items-center gap-3 mb-8"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Gift className="w-6 h-6" /></div><h3 className="text-xl font-black text-stone-900">Bonificaciones Comerciales</h3></div>
      <div className="flex flex-wrap gap-4 items-end mb-8 bg-white p-6 rounded-[1.5rem] border border-stone-200 shadow-sm">
        <div className="flex-1 min-w-[200px] space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Medio Pago</label><select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 font-bold text-sm outline-none" value={newBonus.method} onChange={(e)=>setNewBonus({...newBonus, method: e.target.value})}><option value="">Seleccione...</option>{paymentMethods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div>
        <div className="w-32 space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest ml-1">Valor (%)</label><div className="relative"><input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 font-black text-sm pr-8 outline-none" value={String(newBonus.value)} onChange={(e)=>setNewBonus({...newBonus, value: e.target.value})} /><Percent className="absolute right-3 top-3.5 w-3.5 h-3.5 text-stone-400"/></div></div>
        <div className="flex gap-2">
          {editingId && <button onClick={() => { setEditingId(null); setNewBonus({ method: '', value: '' }); }} className="bg-stone-100 text-stone-500 px-6 py-3 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-stone-200 transition">Cancelar</button>}
          <button onClick={handleSave} className="bg-black text-white px-8 py-3 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-stone-800 transition">{editingId ? 'Guardar' : 'Configurar'}</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paymentBonuses.map(b => (
          <div key={b.id} className={`bg-stone-50 border p-5 rounded-xl flex justify-between items-center group shadow-sm transition ${editingId === b.id ? 'border-[#b5a898] ring-2 ring-[#b5a898]/20' : 'border-stone-200'}`}>
             <div><p className="text-[9px] font-black text-stone-500 uppercase tracking-widest mb-0.5">{b.method}</p><p className="text-xl font-black text-[#8c8173]">{b.value}% OFF</p></div>
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => handleEdit(b)} className="p-2 text-stone-400 hover:text-[#b5a898] hover:bg-stone-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setPaymentBonuses(paymentBonuses.filter(x => x.id !== b.id))} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
             </div>
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
       if (editingId) setTaxRules(taxRules.map(r => r.id === editingId ? { ...newRule, id: editingId } : r)); 
       else setTaxRules([...taxRules, { ...newRule, id: Date.now() }]); 
       setNewRule({ category: '', paymentMethod: '', concepts: [] }); 
       setEditingId(null); 
       setShowForm(false); 
     } 
  };

  const handleEdit = (rule) => {
     setEditingId(rule.id);
     setNewRule({ category: rule.category, paymentMethod: rule.paymentMethod, concepts: [...rule.concepts] });
     setShowForm(true);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 uppercase">
      <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Coins className="w-6 h-6" /></div><h3 className="text-xl font-black text-stone-900">Costos Absorbidos e Impuestos</h3></div>{!showForm && <button onClick={() => setShowForm(true)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-stone-800 transition shadow-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva Regla</button>}</div>
      {showForm && (
        <div className="bg-white border border-[#b5a898]/30 rounded-[2rem] p-8 mb-8 shadow-lg">
          <div className="flex justify-between items-center mb-6">
             <h4 className="font-black text-sm text-stone-800">{editingId ? 'Editar Regla' : 'Crear Regla'}</h4>
             <button onClick={() => { setShowForm(false); setEditingId(null); setNewRule({ category: '', paymentMethod: '', concepts: [] }); }} className="text-stone-400 hover:text-red-500"><X className="w-5 h-5" /></button>
          </div>
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
              <div className="w-24 space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Valor %</label><input type="number" className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-black outline-none text-rose-600" value={newConcept.value} onChange={(e) => setNewConcept({...newConcept, value: e.target.value})} /></div>
              <div className="flex-1 space-y-1 min-w-[150px]"><label className="text-[10px] font-bold text-stone-500 uppercase">Base Cálculo</label><select className="w-full bg-white border border-stone-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none" value={newConcept.base} onChange={(e) => setNewConcept({...newConcept, base: e.target.value})}><option value="Precio Lista c/IVA">Lista c/IVA (Total)</option><option value="Precio Lista s/IVA">Lista s/IVA (Neto)</option><option value="CMV (Costo)">CMV (Costo Origen)</option></select></div>
              <button onClick={() => { if(newConcept.name && newConcept.value) { setNewRule({ ...newRule, concepts: [...newRule.concepts, { ...newConcept, value: parseFloat(newConcept.value) }] }); setNewConcept({ name: '', value: '', base: 'Precio Lista c/IVA' }); } }} className="bg-[#b5a898] text-white h-[42px] px-6 rounded-lg font-bold text-[10px] uppercase tracking-widest">Añadir</button>
            </div>
            <div className="space-y-3">
              {newRule.concepts.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white border border-stone-100 px-5 py-3 rounded-xl shadow-sm">
                   <span className="font-bold text-sm text-stone-800">{c.name} <span className="text-[9px] font-black text-stone-400 ml-2 uppercase tracking-widest bg-stone-100 px-2 py-1 rounded">Base: {c.base || 'Precio Lista c/IVA'}</span></span>
                   <div className="flex items-center gap-3">
                     <span className="font-black text-rose-600">{c.value}%</span>
                     <button onClick={() => setNewRule({...newRule, concepts: newRule.concepts.filter((_, i) => i !== idx)})} className="text-stone-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleSaveRule} className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-stone-800 transition">Guardar Regla</button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {taxRules.map(rule => (
          <div key={rule.id} className="bg-white border border-stone-200 rounded-2xl p-6 flex justify-between items-center shadow-sm group transition">
            <div className="flex items-center gap-3">
              <span className="bg-black text-white px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">{rule.category}</span>
              <Plus className="w-3.5 h-3.5 text-stone-400" />
              <span className="bg-stone-100 text-[#8c8173] px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">{rule.paymentMethod}</span>
              <div className="flex gap-2 ml-4 flex-wrap hidden md:flex">
                {rule.concepts.map((c, i) => <span key={i} className="text-[9px] text-stone-500 uppercase font-bold border border-stone-200 px-2 py-0.5 rounded">{c.name}: {c.value}% <span className="opacity-50">({c.base || 'c/IVA'})</span></span>)}
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => handleEdit(rule)} className="p-2 text-stone-400 hover:text-[#b5a898] rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setTaxRules(taxRules.filter(r => r.id !== rule.id))} className="p-2 text-stone-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
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
      <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm w-fit overflow-x-auto">
        <button onClick={() => setActiveTab('categories')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'categories' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Tags className="w-3.5 h-3.5" /> Categorías</button>
        <button onClick={() => setActiveTab('margins')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'margins' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Percent className="w-3.5 h-3.5" /> Márgenes</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'expenses' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><ShoppingBag className="w-3.5 h-3.5" /> Cat. Gastos</button>
        <button onClick={() => setActiveTab('accounts')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'accounts' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Landmark className="w-3.5 h-3.5" /> Cuentas</button>
        <button onClick={() => setActiveTab('payments')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'payments' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><CreditCard className="w-3.5 h-3.5" /> Formas Pago</button>
        <button onClick={() => setActiveTab('bonuses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'bonuses' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Gift className="w-3.5 h-3.5" /> Dctos</button>
        <button onClick={() => setActiveTab('concepts')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'concepts' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Tags className="w-3.5 h-3.5" /> Conceptos</button>
        <button onClick={() => setActiveTab('taxes')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'taxes' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Receipt className="w-3.5 h-3.5" /> Reglas P&L</button>
      </div>
      <div className="bg-[#f4f2f0] p-8 md:p-12 rounded-[3rem] border border-stone-200 shadow-inner min-h-[500px]">
        {activeTab === 'categories' && <VariableManager title="Categorías de Inventario" list={categories} setList={setCategories} icon={Tags} placeholder="Ej: Escritorios..." />}
        {activeTab === 'margins' && <MarginManager categories={categories} categoryMargins={categoryMargins} setCategoryMargins={setCategoryMargins} />}
        {activeTab === 'expenses' && <VariableManager title="Categorías de Egresos" list={expenseCategories} setList={setExpenseCategories} icon={ShoppingBag} placeholder="Ej: Servicios Generales..." />}
        {activeTab === 'accounts' && <AccountManager accounts={accounts} setAccounts={setAccounts} />}
        {activeTab === 'payments' && <PaymentMethodManager paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} accounts={accounts} />}
        {activeTab === 'bonuses' && <BonusManager paymentBonuses={paymentBonuses} setPaymentBonuses={setPaymentBonuses} paymentMethods={paymentMethods} />}
        {activeTab === 'concepts' && <VariableManager title="Conceptos P&L (Impuestos y Costos)" list={taxConcepts} setList={setTaxConcepts} icon={Coins} placeholder="Ej: Ingresos Brutos..." />}
        {activeTab === 'taxes' && <TaxManager taxRules={taxRules} setTaxRules={setTaxRules} categories={categories} paymentMethods={paymentMethods} taxConcepts={taxConcepts} setTaxConcepts={setTaxConcepts} />}
      </div>
    </div>
  );
}

// --- APP ROOT (CONEXIÓN FIREBASE) ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [products, setProductsLocal] = useState([]);
  const [sales, setSalesLocal] = useState([]);
  const [purchases, setPurchasesLocal] = useState([]); 
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
        currentView === id ? 'bg-[#b5a898] text-white shadow-md' : 'text-stone-400 hover:bg-stone-800 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#f4f2f0] font-sans text-[#1a1a1a] overflow-hidden text-[13px]">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed lg:relative h-full w-72 bg-[#1a1a1a] text-white z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="mb-10 flex flex-col gap-2">
            <img src="image_d2c046.png" alt="Mobilia Logo" className="h-8 object-contain object-left brightness-0 invert opacity-95" />
            <p className="text-[9px] text-[#b5a898] font-bold uppercase tracking-[0.3em] pl-1">Design & Deco</p>
          </div>
          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
            <NavItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
            <NavItem icon={Activity} label="Flujo de Caja" id="cashflow" />
            <NavItem icon={FileText} label="P&L (Resultados)" id="pnl" />
            <NavItem icon={PieChart} label="Rentabilidad" id="profitability" />
            <NavItem icon={Package} label="Inventario" id="inventory" />
            <NavItem icon={ShoppingCart} label="Ventas" id="sales" />
            <NavItem icon={ShoppingBag} label="Egresos" id="purchases" />
            <div className="pt-4 mt-4 border-t border-stone-800/50"><NavItem icon={Settings} label="Configuración" id="variables" /></div>
          </nav>
          
          {/* BOTON DE CERRAR SESION */}
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
        <header className="h-20 bg-white border-b flex items-center justify-between px-6 lg:px-10 shrink-0 z-10 font-bold uppercase tracking-tight">
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
          {currentView === 'dashboard' && <DashboardView sales={sales} products={products} purchases={purchases} accounts={accounts} paymentMethods={paymentMethods} />}
          {currentView === 'cashflow' && <CashFlowView sales={sales} purchases={purchases} searchTerm={searchTerm} />}
          {currentView === 'pnl' && <PnLView sales={sales} purchases={purchases} paymentBonuses={paymentBonuses} taxRules={taxRules} />}
          {currentView === 'profitability' && <ProfitabilityView sales={sales} taxRules={taxRules} paymentBonuses={paymentBonuses} searchTerm={searchTerm} />}
          {currentView === 'inventory' && <InventoryView products={products} setProducts={setProducts} categories={categories} categoryMargins={categoryMargins} searchTerm={searchTerm} />}
          {currentView === 'sales' && <SalesView sales={sales} setSales={setSales} products={products} paymentMethods={paymentMethods} taxRules={taxRules} categories={categories} paymentBonuses={paymentBonuses} />}
          {currentView === 'purchases' && <PurchasesView purchases={purchases} setPurchases={setPurchases} paymentMethods={paymentMethods} expenseCategories={expenseCategories} searchTerm={searchTerm} />}
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