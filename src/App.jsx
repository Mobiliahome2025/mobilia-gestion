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
  ArrowRightLeft, Banknote, Users, CalendarDays, Phone, ShieldAlert, AlertCircle, BadgeDollarSign, MessageCircle, Bell, BarChart2,
  ClipboardList, Send, FileDown
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

const INITIAL_LOAN_ADVANCES = [
  { category: 'Sofás', advancePercent: 20, defaultMethod: 'Efectivo' },
  { category: 'Mesas', advancePercent: 15, defaultMethod: 'Efectivo' },
  { category: 'Sillas', advancePercent: 10, defaultMethod: 'Efectivo' },
  { category: 'Living', advancePercent: 20, defaultMethod: 'Efectivo' },
  { category: 'Dormitorio', advancePercent: 15, defaultMethod: 'Efectivo' },
  { category: 'Decoración', advancePercent: 0, defaultMethod: 'Efectivo' }
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

// --- MÓDULO DE PRESUPUESTOS ---

function QuotePrintModal({ quote, paymentBonuses, onClose }) {
  const subtotal = quote.items.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const paymentSummaries = useMemo(() => {
    return (quote.paymentOptions || []).map(methodName => {
       const bonus = paymentBonuses?.find(b => b.method === methodName)?.value || 0;
       const finalTotal = subtotal * (1 - (bonus / 100));
       let cuotasMatch = methodName.match(/(\d+)\s*cuota/i);
       let cuotas = cuotasMatch ? parseInt(cuotasMatch[1]) : 1;
       let cuotaAmount = finalTotal / cuotas;
       return { methodName, bonus, finalTotal, cuotas, cuotaAmount };
    });
  }, [quote.paymentOptions, paymentBonuses, subtotal]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!quote.client.phone) {
      alert("No hay un teléfono registrado para este cliente.");
      return;
    }
    const phone = quote.client.phone.replace(/\D/g, '');
    let text = `Hola *${quote.client.name}*! 👋\nTe enviamos tu presupuesto de *MobiliaHome* 🏡:\n\n`;
    quote.items.forEach(item => {
       text += `🛋️ ${item.qty}x *${item.name}* - ${formatCurrency(item.price * item.qty)}\n`;
    });
    
    text += `\n💰 *Precio de Lista: ${formatCurrency(subtotal)}*\n\n`;
    
    if (paymentSummaries.length > 0) {
       text += `💳 *Opciones de Financiación:*\n`;
       paymentSummaries.forEach(ps => {
          if (ps.bonus > 0) {
             text += `🔸 *${ps.methodName}* (${ps.bonus}% OFF): *${formatCurrency(ps.finalTotal)}*\n`;
          } else if (ps.cuotas > 1) {
             text += `🔸 *${ps.methodName}*: ${ps.cuotas} cuotas de *${formatCurrency(ps.cuotaAmount)}*\n`;
          } else {
             text += `🔸 *${ps.methodName}*: *${formatCurrency(ps.finalTotal)}*\n`;
          }
       });
       text += `\n`;
    }

    text += `⏳ _Válido hasta: ${quote.expiration}_\n\nQuedamos a tu disposición por cualquier consulta. ¡Saludos!`;
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quote-print-area, #quote-print-area * { visibility: visible; }
          #quote-print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: white; padding: 20px; }
          @page { size: A4; margin: 1cm; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="bg-black p-6 flex justify-between items-center text-white shrink-0 no-print">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><ClipboardList className="w-5 h-5 text-[#b5a898]" /> Presupuesto {quote.id}</h3>
          <button onClick={onClose} className="hover:text-[#b5a898] transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-stone-50">
           {/* Visual Preview */}
           <div id="quote-print-area" className="bg-white p-10 max-w-[800px] mx-auto border border-stone-200 shadow-sm min-h-[800px] relative">
              <div className="flex justify-between items-start border-b-2 border-stone-900 pb-8 mb-8">
                 <div>
                    <h1 className="text-4xl font-black tracking-tighter text-stone-900">MobiliaHome</h1>
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-[0.3em] mt-1">Design & Deco</p>
                 </div>
                 <div className="text-right">
                    <h2 className="text-2xl font-black text-[#b5a898] uppercase tracking-tighter mb-2">Presupuesto</h2>
                    <p className="text-xs font-bold text-stone-600">Nº: <span className="text-stone-900">{quote.id}</span></p>
                    <p className="text-xs font-bold text-stone-600">Fecha: <span className="text-stone-900">{quote.date}</span></p>
                    <p className="text-xs font-bold text-stone-600">Válido hasta: <span className="text-stone-900">{quote.expiration}</span></p>
                 </div>
              </div>

              <div className="mb-10 bg-stone-50 p-6 rounded-xl border border-stone-100">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Datos del Cliente</h4>
                 <p className="font-black text-lg text-stone-900 leading-tight">{quote.client.name}</p>
                 {quote.client.dni && <p className="text-xs font-bold text-stone-600 mt-1">DNI/CUIT: {quote.client.dni}</p>}
                 {quote.client.phone && <p className="text-xs font-bold text-stone-600 mt-1">Teléfono: {quote.client.phone}</p>}
              </div>

              <table className="w-full text-left mb-10">
                 <thead>
                    <tr className="border-b-2 border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-400">
                       <th className="pb-3">Cant.</th>
                       <th className="pb-3">Descripción</th>
                       <th className="pb-3 text-right">P. Unitario</th>
                       <th className="pb-3 text-right">Subtotal</th>
                    </tr>
                 </thead>
                 <tbody className="text-sm font-bold text-stone-800">
                    {quote.items.map((item, idx) => (
                       <tr key={idx} className="border-b border-stone-100">
                          <td className="py-4 text-stone-500">{item.qty}</td>
                          <td className="py-4">{item.name} <span className="block text-[9px] uppercase tracking-widest text-[#b5a898]">{item.category}</span></td>
                          <td className="py-4 text-right">{formatCurrency(item.price)}</td>
                          <td className="py-4 text-right text-stone-900 font-black">{formatCurrency(item.price * item.qty)}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>

              <div className="flex justify-end">
                 <div className="w-72 bg-stone-100 p-6 rounded-2xl">
                    <div className="flex justify-between items-center text-xs font-bold text-stone-500 mb-2 uppercase tracking-widest">
                       <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-black text-stone-900 border-t border-stone-300 pt-4 mt-2 uppercase tracking-widest">
                       <span>Total Lista</span><span className="text-[#b5a898]">{formatCurrency(subtotal)}</span>
                    </div>
                 </div>
              </div>

            {paymentSummaries.length > 0 && (
              <div className="mt-8 bg-stone-50 p-6 rounded-2xl border border-stone-200">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-4 border-b border-stone-200 pb-2">Opciones de Financiación y Pagos</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paymentSummaries.map((ps, idx) => (
                       <div key={idx} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#b5a898]">{ps.methodName}</span>
                          <div className="mt-2">
                             {ps.bonus > 0 ? (
                                <>
                                   <span className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(ps.finalTotal)}</span>
                                   <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest ml-2 bg-emerald-50 px-2 py-0.5 rounded">-{ps.bonus}% OFF</span>
                                </>
                             ) : ps.cuotas > 1 ? (
                                <>
                                   <span className="text-2xl font-black text-stone-900 tracking-tight">{ps.cuotas} x {formatCurrency(ps.cuotaAmount)}</span>
                                   <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mt-1">Suma Total: {formatCurrency(ps.finalTotal)}</span>
                                </>
                             ) : (
                                <span className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(ps.finalTotal)}</span>
                             )}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}

            <div className="absolute bottom-10 left-10 right-10 border-t border-stone-200 pt-6 text-center">
                 <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Los precios están sujetos a modificaciones sin previo aviso luego de la fecha de vencimiento.</p>
              </div>
           </div>
        </div>

        <div className="bg-white p-6 border-t border-stone-200 shrink-0 flex gap-4 no-print justify-end">
           <button onClick={handleSendWhatsApp} className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-100 transition flex items-center gap-2">
             <Send className="w-4 h-4" /> Enviar Resumen al WhatsApp
           </button>
           <button onClick={handlePrint} className="bg-[#b5a898] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-[#a39686] transition flex items-center gap-2">
             <FileDown className="w-4 h-4" /> Guardar PDF / Imprimir
           </button>
        </div>
      </div>
    </div>
  );
}

function QuotesView({ quotes, setQuotes, products, categories, paymentMethods, paymentBonuses, onConvertToSale }) {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState(null);

  // Form states
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quoteExpiration, setQuoteExpiration] = useState(() => {
     const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().split('T')[0];
  });
  const [cart, setCart] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDNI, setClientDNI] = useState('');

  // Search states
  const [productSearch, setProductSearch] = useState('');
  const [tempProductId, setTempProductId] = useState(null);
  const [tempCategory, setTempCategory] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [tempQty, setTempQty] = useState('1');
  const [showResults, setShowResults] = useState(false);
  
  const [selectedPayMethods, setSelectedPayMethods] = useState([]);

  const filteredQuotes = useMemo(() => {
    if (!searchTerm) return quotes;
    return quotes.filter(q => String(q.id).toLowerCase().includes(searchTerm.toLowerCase()) || q.client.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [quotes, searchTerm]);

  const filteredInventory = useMemo(() => {
    if (!productSearch || productSearch.length < 1) return [];
    return products.filter(p => String(p.name).toLowerCase().includes(productSearch.toLowerCase()));
  }, [productSearch, products]);

  const addToCart = () => {
    const p = parseFloat(tempPrice);
    if (!productSearch || !tempCategory || isNaN(p) || p <= 0) return;
    setCart([...cart, { id: Date.now() + Math.random(), productId: tempProductId, name: productSearch, category: tempCategory, price: p, qty: parseInt(tempQty)||1 }]);
    setProductSearch(''); setTempCategory(''); setTempPrice(''); setTempQty('1'); setTempProductId(null);
  };

  const handleSaveQuote = () => {
    if (cart.length === 0 || !clientName.trim()) return;
    const newQuote = {
       id: `P-${Math.floor(Math.random()*9000)+1000}`,
       date: quoteDate,
       expiration: quoteExpiration,
       client: { name: clientName, phone: clientPhone, dni: clientDNI },
       items: cart,
       paymentOptions: selectedPayMethods,
       status: 'pending'
    };
    setQuotes([newQuote, ...quotes]);
    setIsAdding(false);
    setCart([]); setClientName(''); setClientPhone(''); setClientDNI(''); setSelectedPayMethods([]);
  };

  const togglePayMethod = (methodName) => {
    if (selectedPayMethods.includes(methodName)) {
      setSelectedPayMethods(selectedPayMethods.filter(m => m !== methodName));
    } else {
      setSelectedPayMethods([...selectedPayMethods, methodName]);
    }
  };

  const subtotalCart = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900">
          <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><ClipboardList className="w-6 h-6" /></div>
          Presupuestos y Cotizaciones
        </h3>
        {!isAdding && (
           <button onClick={() => setIsAdding(true)} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition shadow-sm flex items-center gap-2">
             <Plus className="w-4 h-4" /> Crear Presupuesto
           </button>
        )}
      </div>

      {selectedQuote && <QuotePrintModal quote={selectedQuote} paymentBonuses={paymentBonuses} onClose={() => setSelectedQuote(null)} />}

      {isAdding ? (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95">
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
                 <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2 mb-6 border-b border-stone-100 pb-4"><Users className="w-5 h-5 text-[#b5a898]" /> 1. Datos del Cliente y Fechas</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase">Nombre *</label><input required className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={clientName} onChange={e=>setClientName(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase">WhatsApp</label><input className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="Ej: 54911..." /></div>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase">DNI/CUIT</label><input className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={clientDNI} onChange={e=>setClientDNI(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase">Emisión</label><input type="date" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={quoteDate} onChange={e=>setQuoteDate(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase">Vencimiento</label><input type="date" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none text-[#b5a898]" value={quoteExpiration} onChange={e=>setQuoteExpiration(e.target.value)} /></div>
                 </div>
               </div>

               <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
                 <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2 mb-6 border-b border-stone-100 pb-4"><Armchair className="w-5 h-5 text-[#b5a898]" /> 2. Artículos a Cotizar</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   <div className="space-y-2 relative"><label className="text-[10px] font-bold text-stone-500 uppercase">Artículo</label>
                     <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={productSearch} onChange={(e) => { setProductSearch(e.target.value); setShowResults(true); }} placeholder="Buscar o escribir..." />
                     {showResults && filteredInventory.length > 0 && (
                       <div className="absolute top-full left-0 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                          {filteredInventory.map(p => (
                            <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setTempProductId(p.id); setProductSearch(String(p.name)); setTempCategory(String(p.category)); setTempPrice(String(p.price)); setShowResults(false); }} className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-100 flex justify-between items-center transition">
                              <span className="font-bold text-sm text-stone-800">{String(p.name)}</span><span className="text-[10px] font-black text-emerald-600">{formatCurrency(p.price)}</span>
                            </button>
                          ))}
                       </div>
                     )}
                   </div>
                   <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase">Categoría</label>
                     <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={tempCategory} onChange={(e)=>setTempCategory(e.target.value)}>
                       <option value="">Seleccione...</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                   <div className="space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase">Precio Lista ($)</label>
                     <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-[#8c8173] outline-none text-sm" value={tempPrice} onChange={(e)=>setTempPrice(e.target.value)} />
                   </div>
                   <div className="space-y-2 flex gap-2 items-end"><div className="flex-1">
                     <label className="text-[10px] font-bold text-stone-500 uppercase">Cantidad</label>
                     <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-sm outline-none" value={tempQty} onChange={(e)=>setTempQty(e.target.value)} /></div>
                     <button type="button" onClick={addToCart} className="bg-black text-white p-3.5 rounded-xl hover:bg-stone-800 transition shadow-sm"><Plus className="w-5 h-5" /></button>
                   </div>
                 </div>
                 <div className="border-t border-stone-100 pt-6 space-y-3">
                   {cart.length === 0 && <p className="text-xs text-stone-400 font-bold uppercase text-center py-4">No hay artículos cotizados</p>}
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
                 <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2 mb-6 border-b border-stone-100 pb-4"><CreditCard className="w-5 h-5 text-[#b5a898]" /> 3. Formas de Pago y Financiación a mostrar</h4>
                 <p className="text-[10px] font-bold text-stone-500 uppercase mb-4">Selecciona las opciones que deseas incluir en el resumen del presupuesto para el cliente:</p>
                 <div className="flex flex-wrap gap-3">
                   {paymentMethods.map(pm => (
                     <label key={pm.name} className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition select-none ${selectedPayMethods.includes(pm.name) ? 'bg-black text-white border-black shadow-md' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'}`}>
                       <input type="checkbox" className="hidden" checked={selectedPayMethods.includes(pm.name)} onChange={() => togglePayMethod(pm.name)} />
                       <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${selectedPayMethods.includes(pm.name) ? 'border-stone-600 bg-stone-800' : 'border-stone-300 bg-white'}`}>
                         {selectedPayMethods.includes(pm.name) && <Check className="w-3 h-3 text-white" />}
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-widest">{pm.name}</span>
                     </label>
                   ))}
                 </div>
               </div>
            </div>

            <div className="space-y-6">
              <div className="bg-black text-white rounded-[2.5rem] p-8 shadow-xl sticky top-10 text-center">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-[#b5a898]">Total Cotización</h4>
                <div className="pt-4 text-center mb-8">
                   <p className="text-5xl font-black tracking-tighter text-white">{formatCurrency(subtotalCart)}</p>
                   <p className="text-[9px] font-bold uppercase text-stone-400 tracking-[0.2em] mt-2">Vigencia: {quoteExpiration}</p>
                </div>
                <button onClick={handleSaveQuote} disabled={cart.length === 0 || !clientName.trim()} className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#a39686] transition shadow-lg disabled:opacity-20 active:scale-95 flex items-center justify-center gap-2">
                  Guardar Presupuesto <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsAdding(false)} className="w-full text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-6 hover:text-white transition">Cancelar y Volver</button>
              </div>
            </div>
         </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden min-h-[400px]">
          {filteredQuotes.length === 0 ? (
             <div className="py-32 text-center text-stone-400 opacity-50 flex flex-col items-center">
                <ClipboardList className="w-12 h-12 mb-3" />
                <p className="font-bold text-xs uppercase tracking-widest">No hay presupuestos</p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-stone-900">
                <thead><tr className="bg-[#f4f2f0] text-stone-500 text-[10px] font-bold uppercase tracking-widest border-b border-stone-200"><th className="p-6">ID / Fecha</th><th className="p-6">Cliente</th><th className="p-6 text-center">Artículos</th><th className="p-6 text-right">Total</th><th className="p-6 text-center">Estado</th><th className="p-6 text-center">Acciones</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredQuotes.map(q => {
                    const total = q.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
                    const isExpired = new Date(q.expiration) < new Date();
                    return (
                    <tr key={q.id} className="hover:bg-stone-50/50 transition">
                      <td className="p-6"><p className="font-black text-sm text-stone-800">{q.id}</p><p className="text-[9px] font-bold text-stone-400 mt-1 uppercase tracking-widest">{q.date}</p></td>
                      <td className="p-6"><p className="text-sm font-black text-stone-900">{q.client.name}</p>{q.client.phone && <p className="text-[9px] text-stone-500 font-bold uppercase tracking-widest mt-0.5">{q.client.phone}</p>}</td>
                      <td className="p-6 text-center"><span className="inline-block px-3 py-1 bg-stone-100 rounded-md font-black text-xs text-stone-600">{q.items.length}</span></td>
                      <td className="p-6 text-right font-black text-lg text-stone-800">{formatCurrency(total)}</td>
                      <td className="p-6 text-center">
                         {q.status === 'converted' ? <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-widest">Convertido</span> :
                          isExpired ? <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-md text-[9px] font-black uppercase tracking-widest">Vencido</span> : 
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest">Vigente</span>}
                      </td>
                      <td className="p-6 text-center">
                         <div className="flex justify-center gap-2">
                           <button onClick={() => setSelectedQuote(q)} className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-[#b5a898] hover:text-white transition" title="Ver e Imprimir"><Printer className="w-4 h-4" /></button>
                           {q.status !== 'converted' && (
                              <button onClick={() => onConvertToSale && onConvertToSale(q)} className="p-2 bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-800 hover:text-white transition" title="Convertir a Venta"><ShoppingCart className="w-4 h-4" /></button>
                           )}
                           <button onClick={() => {if(confirm("¿Borrar presupuesto?")) setQuotes(quotes.filter(x => x.id !== q.id))}} className="p-2 text-stone-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- MÓDULO DE PRÉSTAMOS PERSONALES ---

function LoansView({ loans, setLoans, sales, setSales, paymentMethods }) {
  const [activeTab, setActiveTab] = useState('gestion'); // 'gestion' | 'reportes'
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null); // { loanId, cuotaIndex }
  const [payMethod, setPayMethod] = useState('');
  
  const todayStr = new Date().toISOString().split('T')[0];

  const activeLoans = loans.filter(l => l.status === 'active');
  const totalToCollect = activeLoans.reduce((sum, l) => sum + l.cuotas.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0), 0);
  const totalEnMora = activeLoans.reduce((sum, l) => sum + l.cuotas.filter(c => c.status === 'pending' && c.dueDate < todayStr).reduce((s, c) => s + c.amount, 0), 0);

  const handlePayCuota = () => {
    if (!payMethod || !paymentModal) return;
    
    const { loanId, cuotaIndex } = paymentModal;
    const loan = loans.find(l => l.id === loanId);
    const cuota = loan.cuotas[cuotaIndex];
    
    // 1. Actualizar Préstamo (Marcar Cuota como pagada)
    const updatedLoans = loans.map(l => {
        if (l.id === loanId) {
            const newCuotas = [...l.cuotas];
            newCuotas[cuotaIndex] = { ...cuota, status: 'paid', paidDate: todayStr, payMethod: payMethod };
            const allPaid = newCuotas.every(c => c.status === 'paid');
            return { ...l, cuotas: newCuotas, status: allPaid ? 'finished' : 'active' };
        }
        return l;
    });
    setLoans(updatedLoans);
    if (selectedLoan && selectedLoan.id === loanId) {
       setSelectedLoan(updatedLoans.find(l => l.id === loanId));
    }
    
    // 2. Actualizar Venta -> Inyectar pago en el Flujo de Caja
    const updatedSales = sales.map(s => {
        if (s.id === loan.saleId) {
            const newPayment = {
                id: Date.now() + Math.random(),
                method: payMethod,
                amount: cuota.amount,
                date: todayStr,
                note: `Cobro Cuota ${cuota.numero}/${loan.cuotas.length}`
            };
            return { ...s, payments: [...(s.payments || []), newPayment] };
        }
        return s;
    });
    setSales(updatedSales);
    setPaymentModal(null);
    setPayMethod('');
  };

  const handleSendWelcome = (loan) => {
    if (!loan.client.phone) { alert('El cliente no tiene un teléfono registrado.'); return; }
    const phone = loan.client.phone.replace(/\D/g,'');
    const total = formatCurrency(loan.totalFinanced);
    let text = `Hola ${loan.client.name}, te damos la bienvenida a MobiliaHome! 🏡\n\nEste es el detalle de tu financiación por *${total}*:\n\n`;
    loan.cuotas.forEach(c => {
        text += `🔸 Cuota ${c.numero}: *${formatCurrency(c.amount)}* - Vence: ${c.dueDate}\n`;
    });
    text += `\nCualquier duda, estamos a tu disposición. ¡Gracias por confiar en nosotros!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleSendReminder = (loan, cuota) => {
    if (!loan.client.phone) { alert('El cliente no tiene un teléfono registrado.'); return; }
    const phone = loan.client.phone.replace(/\D/g,'');
    let text = `Hola ${loan.client.name}! 🏡\nTe recordamos desde MobiliaHome que el *${cuota.dueDate}* vence tu cuota ${cuota.numero} por *${formatCurrency(cuota.amount)}*.\n\n(Omitir este mensaje si ya realizaste el pago). ¡Saludos!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900">
          <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-600 shadow-sm"><Banknote className="w-6 h-6" /></div>
          Gestión de Préstamos y Cobranzas
        </h3>
        <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm w-fit">
          <button onClick={() => setActiveTab('gestion')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'gestion' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Banknote className="w-3.5 h-3.5" /> Cartera Activa</button>
          <button onClick={() => setActiveTab('reportes')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'reportes' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><BarChart2 className="w-3.5 h-3.5" /> Análisis y Caída</button>
        </div>
      </div>

      {activeTab === 'reportes' ? (
        <LoanReportsView loans={loans} sales={sales} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-stone-200 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
              <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Users className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Préstamos Activos</p><p className="text-2xl font-black text-stone-900">{activeLoans.length}</p></div>
            </div>
            <div className="bg-white border border-stone-200 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
              <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600"><TrendingUp className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Capital a Cobrar</p><p className="text-2xl font-black text-stone-900">{formatCurrency(totalToCollect)}</p></div>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] shadow-sm flex items-center gap-4">
              <div className="bg-rose-100 p-4 rounded-2xl text-rose-600"><ShieldAlert className="w-6 h-6" /></div>
              <div><p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Capital en Mora</p><p className="text-2xl font-black text-rose-600">{formatCurrency(totalEnMora)}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden min-h-[400px]">
            {loans.length === 0 ? (
               <div className="py-32 text-center text-stone-400 opacity-50 flex flex-col items-center">
                  <Banknote className="w-12 h-12 mb-3" />
                  <p className="font-bold text-xs uppercase tracking-widest">No hay préstamos registrados</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-stone-900">
                  <thead><tr className="bg-[#f4f2f0] text-stone-500 text-[10px] font-bold uppercase tracking-widest border-b border-stone-200"><th className="p-6">ID / Ref</th><th className="p-6">Cliente</th><th className="p-6 text-center">Progreso</th><th className="p-6 text-right">Deuda Restante</th><th className="p-6 text-center">Estado</th><th className="p-6 text-center">Detalle</th></tr></thead>
                  <tbody className="divide-y divide-stone-100">
                    {loans.map(loan => {
                      const pagadas = loan.cuotas.filter(c => c.status === 'paid').length;
                      const totalCuotas = loan.cuotas.length;
                      const deuda = loan.cuotas.filter(c => c.status === 'pending').reduce((s,c) => s + c.amount, 0);
                      const hasMora = loan.cuotas.some(c => c.status === 'pending' && c.dueDate < todayStr);
                      
                      return (
                      <tr key={loan.id} className="hover:bg-stone-50/50 transition">
                        <td className="p-6"><p className="font-black text-sm text-stone-800">{loan.id}</p><p className="text-[9px] font-bold text-stone-400 mt-1 uppercase tracking-widest">Ref: {loan.saleId}</p></td>
                        <td className="p-6">
                           <p className="text-sm font-black text-stone-900">{loan.client.name}</p>
                           <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-0.5">DNI: {loan.client.dni}</p>
                        </td>
                        <td className="p-6 text-center"><span className="inline-block px-3 py-1 bg-stone-100 rounded-md font-black text-xs text-stone-600">{pagadas} / {totalCuotas}</span></td>
                        <td className="p-6 text-right font-black text-lg text-stone-800">{formatCurrency(deuda)}</td>
                        <td className="p-6 text-center">
                           {loan.status === 'finished' ? <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest">Finalizado</span> : 
                            hasMora ? <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit mx-auto"><AlertCircle className="w-3 h-3"/> Con Mora</span> : 
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-widest">Al Día</span>}
                        </td>
                        <td className="p-6 text-center"><button onClick={() => setSelectedLoan(loan)} className="p-2 bg-stone-100 text-stone-500 rounded-lg hover:bg-stone-200 transition"><ChevronRight className="w-4 h-4" /></button></td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Detalles Préstamo y Cobranza */}
          {selectedLoan && (
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="bg-black p-6 flex justify-between items-center text-white shrink-0">
                  <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><Banknote className="w-5 h-5 text-blue-400" /> Detalle Préstamo {selectedLoan.id}</h3>
                  <button onClick={() => setSelectedLoan(null)} className="hover:text-blue-400 transition"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1 bg-stone-50">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Resumen Cliente y Crédito */}
                      <div className="lg:col-span-1 space-y-6">
                         <div className="bg-white border border-stone-200 p-6 rounded-[1.5rem] shadow-sm">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4 border-b border-stone-100 pb-2">Datos del Cliente</h4>
                            <p className="font-black text-lg text-stone-900 leading-tight mb-2">{selectedLoan.client.name}</p>
                            <p className="text-xs font-bold text-stone-500 mb-1">DNI: {selectedLoan.client.dni}</p>
                            {selectedLoan.client.phone && (
                               <div className="mt-4 flex flex-wrap gap-2">
                                 <a href={`https://wa.me/${selectedLoan.client.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-100 transition">
                                    <Phone className="w-3.5 h-3.5" /> Chat
                                 </a>
                                 <button onClick={() => handleSendWelcome(selectedLoan)} className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition">
                                    <MessageCircle className="w-3.5 h-3.5" /> Enviar Plan
                                 </button>
                               </div>
                            )}
                         </div>

                         <div className="bg-black text-white p-6 rounded-[1.5rem] shadow-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#b5a898] mb-4 border-b border-stone-800 pb-2">Resumen Financiero</h4>
                            <div className="space-y-3">
                               <div className="flex justify-between items-center text-xs font-bold"><span className="text-stone-400">Capital Base</span><span>{formatCurrency(selectedLoan.baseAmount)}</span></div>
                               <div className="flex justify-between items-center text-xs font-bold"><span className="text-stone-400">Tasa Aplicada</span><span>{selectedLoan.interestRate}%</span></div>
                               <div className="flex justify-between items-center text-xs font-black pt-3 border-t border-stone-800"><span className="text-[#b5a898]">Total Financiado</span><span className="text-lg">{formatCurrency(selectedLoan.totalFinanced)}</span></div>
                            </div>
                         </div>
                      </div>

                      {/* Grilla de Cuotas */}
                      <div className="lg:col-span-2">
                         <div className="bg-white border border-stone-200 p-6 rounded-[1.5rem] shadow-sm h-full">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6 border-b border-stone-100 pb-2 flex items-center gap-2"><CalendarDays className="w-4 h-4"/> Plan de Cuotas</h4>
                            <div className="space-y-3">
                               {selectedLoan.cuotas.map((cuota, idx) => {
                                  const isMora = cuota.status === 'pending' && cuota.dueDate < todayStr;
                                  return (
                                     <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border ${cuota.status === 'paid' ? 'bg-emerald-50/50 border-emerald-100' : isMora ? 'bg-rose-50 border-rose-200' : 'bg-stone-50 border-stone-200'}`}>
                                        <div className="flex items-center gap-4">
                                           <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${cuota.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : isMora ? 'bg-rose-200 text-rose-800' : 'bg-stone-200 text-stone-600'}`}>{cuota.numero}</div>
                                           <div>
                                              <p className="font-black text-stone-900">{formatCurrency(cuota.amount)}</p>
                                              <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${cuota.status === 'paid' ? 'text-emerald-600' : isMora ? 'text-rose-600' : 'text-stone-500'}`}>Vto: {cuota.dueDate}</p>
                                           </div>
                                        </div>
                                        <div>
                                           {cuota.status === 'paid' ? (
                                              <div className="text-right">
                                                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center justify-end gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Pagada</span>
                                                 <span className="text-[8px] font-bold text-emerald-800 uppercase block mt-0.5">{cuota.paidDate} ({cuota.payMethod})</span>
                                              </div>
                                           ) : (
                                              <div className="flex items-center gap-2">
                                                 <button onClick={() => handleSendReminder(selectedLoan, cuota)} title="Enviar Recordatorio WhatsApp" className="p-2 text-stone-400 hover:text-emerald-500 bg-white border border-stone-200 rounded-lg hover:border-emerald-200 transition"><Bell className="w-4 h-4" /></button>
                                                 <button onClick={() => setPaymentModal({ loanId: selectedLoan.id, cuotaIndex: idx })} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-sm transition ${isMora ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-black text-white hover:bg-stone-800'}`}>Cobrar</button>
                                              </div>
                                           )}
                                        </div>
                                     </div>
                                  )
                               })}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Pequeño de Selector de Pago */}
          {paymentModal && (
             <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95">
                   <h3 className="font-black text-stone-800 uppercase tracking-widest text-xs mb-4 border-b border-stone-100 pb-2">Registrar Cobro de Cuota</h3>
                   <div className="space-y-4 mb-6">
                      <div className="space-y-1"><label className="text-[10px] font-bold text-stone-500 uppercase">Medio de Pago</label>
                         <select className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 font-bold text-sm outline-none" value={payMethod} onChange={e=>setPayMethod(e.target.value)}>
                            <option value="">Seleccione...</option>{paymentMethods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                         </select>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={handlePayCuota} disabled={!payMethod} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition">Confirmar Cobro</button>
                      <button onClick={() => {setPaymentModal(null); setPayMethod('');}} className="flex-1 bg-stone-200 text-stone-700 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-stone-300 transition">Cancelar</button>
                   </div>
                </div>
             </div>
          )}
        </>
      )}
    </div>
  );
}

function LoanReportsView({ loans, sales }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split('T')[0]; // Por defecto 3 meses hacia adelante
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const reportData = useMemo(() => {
    let moraARS = 0;
    let moraQ = 0;
    let vencerTotalARS = 0;
    let vencerTotalQ = 0;
    let vencerPeriodoARS = 0;
    
    const catMap = {};
    const caidaMensualMap = {};
    const caidaSemanalMap = {};

    const activeLoans = loans.filter(l => l.status === 'active');

    activeLoans.forEach(loan => {
       const sale = sales.find(s => s.id === loan.saleId);
       const mainCat = (sale && sale.items.length > 0) ? sale.items[0].category : 'General / Otros';
       
       let loanPending = 0;
       
       loan.cuotas.forEach(c => {
          if (c.status === 'pending') {
             loanPending += c.amount;
             vencerTotalARS += c.amount;
             
             if (c.dueDate < todayStr) {
                moraARS += c.amount;
             }
             
             if (c.dueDate >= startDate && c.dueDate <= endDate) {
                 vencerPeriodoARS += c.amount;
                 
                 // Agrupamiento Mensual YYYY-MM
                 const dParts = c.dueDate.split('-');
                 const mesKey = `${dParts[0]}-${dParts[1]}`; 
                 if (!caidaMensualMap[mesKey]) caidaMensualMap[mesKey] = 0;
                 caidaMensualMap[mesKey] += c.amount;
                 
                 // Agrupamiento Semanal aproximado
                 const dObj = new Date(c.dueDate);
                 const weekNum = Math.ceil(dObj.getDate() / 7);
                 const semKey = `${mesKey} (Semana ${weekNum})`;
                 if (!caidaSemanalMap[semKey]) caidaSemanalMap[semKey] = 0;
                 caidaSemanalMap[semKey] += c.amount;
             }
          }
       });
       
       if (loanPending > 0) {
          vencerTotalQ++;
          if (loan.cuotas.some(c => c.status === 'pending' && c.dueDate < todayStr)) moraQ++;
          
          if (!catMap[mainCat]) catMap[mainCat] = { ars: 0, qty: 0 };
          catMap[mainCat].ars += loanPending;
          catMap[mainCat].qty += 1;
       }
    });

    return { 
      moraARS, moraQ, vencerTotalARS, vencerTotalQ, vencerPeriodoARS,
      catData: Object.entries(catMap).map(([cat, data]) => ({ cat, ...data })).sort((a,b) => b.ars - a.ars),
      caidaMes: Object.entries(caidaMensualMap).map(([k, v]) => ({ label: k, value: v })).sort((a,b)=>a.label.localeCompare(b.label)),
      caidaSemana: Object.entries(caidaSemanalMap).map(([k, v]) => ({ label: k, value: v })).sort((a,b)=>a.label.localeCompare(b.label))
    };

  }, [loans, sales, startDate, endDate, todayStr]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
           <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Cartera Vencida (Mora)</h4>
           <p className="text-2xl font-black text-rose-600 tracking-tight">{formatCurrency(reportData.moraARS)}</p>
           <p className="text-[10px] font-bold text-stone-500 uppercase mt-2">{reportData.moraQ} créditos en mora</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
           <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total a Vencer (Global)</h4>
           <p className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(reportData.vencerTotalARS)}</p>
           <p className="text-[10px] font-bold text-stone-500 uppercase mt-2">{reportData.vencerTotalQ} créditos activos</p>
        </div>
        <div className="bg-black p-6 rounded-2xl shadow-md lg:col-span-2 flex items-center justify-between">
           <div>
             <h4 className="text-[10px] font-bold text-[#b5a898] uppercase tracking-widest mb-1">Caída en Período Seleccionado</h4>
             <p className="text-3xl font-black text-white tracking-tight">{formatCurrency(reportData.vencerPeriodoARS)}</p>
           </div>
           <div className="flex items-center gap-3 bg-stone-900 p-2 rounded-xl shadow-sm border border-stone-800">
             <div className="flex flex-col px-3">
                <span className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">Desde</span>
                <input type="date" className="bg-transparent text-xs font-bold text-white outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
             </div>
             <div className="w-px h-6 bg-stone-800"></div>
             <div className="flex flex-col px-3">
                <span className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">Hasta</span>
                <input type="date" className="bg-transparent text-xs font-bold text-white outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Distribución por Categoría */}
        <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm">
          <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Tags className="w-4 h-4 text-[#b5a898]"/> Distribución de Riesgo por Categoría</h4>
          <div className="space-y-3">
             {reportData.catData.length === 0 && <p className="text-xs text-stone-400 font-bold uppercase">Sin datos para mostrar</p>}
             {reportData.catData.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                   <div>
                      <p className="font-bold text-sm text-stone-800">{c.cat}</p>
                      <p className="text-[9px] font-black uppercase text-stone-400 tracking-widest">{c.qty} créditos</p>
                   </div>
                   <span className="font-black text-base text-stone-900">{formatCurrency(c.ars)}</span>
                </div>
             ))}
          </div>
        </div>

        {/* Caída de Cuotas */}
        <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm flex flex-col">
          <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#b5a898]"/> Proyección de Cobranzas (Caída)</h4>
          
          <div className="flex gap-4 h-full">
            <div className="flex-1 bg-stone-50 rounded-xl p-4 border border-stone-100 overflow-y-auto max-h-[300px] custom-scrollbar">
               <h5 className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-3 border-b border-stone-200 pb-2">Caída Mensual</h5>
               <div className="space-y-2">
                 {reportData.caidaMes.length === 0 && <p className="text-[10px] text-stone-400 font-bold uppercase">Sin cuotas en período</p>}
                 {reportData.caidaMes.map((cm, i) => (
                    <div key={i} className="flex justify-between items-center text-xs font-bold border-b border-stone-200/50 pb-2">
                      <span className="text-stone-600">{cm.label}</span><span className="text-emerald-600">{formatCurrency(cm.value)}</span>
                    </div>
                 ))}
               </div>
            </div>
            <div className="flex-1 bg-stone-50 rounded-xl p-4 border border-stone-100 overflow-y-auto max-h-[300px] custom-scrollbar">
               <h5 className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mb-3 border-b border-stone-200 pb-2">Caída Semanal</h5>
               <div className="space-y-2">
                 {reportData.caidaSemana.length === 0 && <p className="text-[10px] text-stone-400 font-bold uppercase">Sin cuotas en período</p>}
                 {reportData.caidaSemana.map((cs, i) => (
                    <div key={i} className="flex justify-between items-center text-xs font-bold border-b border-stone-200/50 pb-2">
                      <span className="text-stone-600">{cs.label}</span><span className="text-emerald-600">{formatCurrency(cs.value)}</span>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- VISTAS DEL SISTEMA (RESTO) ---
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

  const getY = (val) => 130 - ((val - minProfit) / rangeProfit) * 100;
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
            <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm overflow-hidden flex flex-col h-64">
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
                     <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible" onMouseLeave={() => setHoverPoint(null)}>
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
                           <text key={idx} x={getX(idx)} y="155" textAnchor="middle" fill="#9ca3af" fontSize="10" fontWeight="bold" className="uppercase tracking-widest">{m.label}</text>
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
        const bonus = sale.type === 'loan' ? 0 : (paymentBonuses.find(b => b.method === pay.method)?.value || 0);
        const amountCoveredBase = pay.amount / (1 - (bonus / 100));
        
        // P&L cost scaling logic
        const rawProportion = amountCoveredBase / subtotalCart;
        const proportionOfSale = Math.min(rawProportion, 1);

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

function ProfitabilityView({ sales, taxRules, paymentBonuses, searchTerm, products, paymentMethods }) {
  const [activeTab, setActiveTab] = useState('sales');
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
        const bonus = sale.type === 'loan' ? 0 : (paymentBonuses.find(b => b.method === p.method)?.value || 0);
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
                  absorbedCosts += conceptCost; 
                  
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
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm w-fit">
        <button onClick={() => setActiveTab('sales')} className={`px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition ${activeTab === 'sales' ? 'bg-[#b5a898] text-white shadow-md' : 'text-stone-400 hover:text-stone-700'}`}>Rentabilidad por Venta</button>
        <button onClick={() => setActiveTab('calculator')} className={`px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition ${activeTab === 'calculator' ? 'bg-[#b5a898] text-white shadow-md' : 'text-stone-400 hover:text-stone-700'}`}>Calculadora de Rentabilidad</button>
      </div>

      {activeTab === 'calculator' && (
        <RentabilidadCalculator products={products} paymentMethods={paymentMethods} paymentBonuses={paymentBonuses} taxRules={taxRules} />
      )}

      {activeTab === 'sales' && (
      <>
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
                    <td className="p-6">
                      <p className="font-black text-sm">#{String(s.id).split('-')[1]}</p>
                      <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase">{String(s.date)}</p>
                      {s.type === 'loan' && <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase tracking-widest">Préstamo</span>}
                    </td>
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
      </>
      )}
    </div>
  );
}

const BASE_OPTIONS = ['Precio Lista c/IVA', 'Lista s/IVA (Neto)', 'CMV (Costo Origen)'];

function computeCostItemAmount(item, { price, iva, cost }) {
  let baseAmount = price;
  if (item.base === 'CMV (Costo Origen)') baseAmount = cost;
  else if (item.base === 'Lista s/IVA (Neto)') baseAmount = price / (1 + (iva / 100));
  return baseAmount * ((parseFloat(item.value) || 0) / 100);
}

function RentabilidadCalculator({ products, paymentMethods, paymentBonuses, taxRules }) {
  const [productSearch, setProductSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cost, setCost] = useState(0);
  const [iva, setIva] = useState(21);
  const [margin, setMargin] = useState(50);
  const [scenarios, setScenarios] = useState([]);
  const [expandedIds, setExpandedIds] = useState({});

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => String(p.name).toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8);
  }, [productSearch, products]);

  const buildScenariosForProduct = (product) => {
    return paymentMethods.map(pm => {
      const bonus = paymentBonuses.find(b => b.method === pm.name)?.value || 0;
      const matchingRules = taxRules.filter(r => (r.category === product.category || r.category === 'Todas') && (r.paymentMethod === pm.name || r.paymentMethod === 'Todas'));
      const costItems = matchingRules.flatMap((r, ri) => r.concepts.map((c, ci) => ({
        id: `rule-${r.id}-${ri}-${ci}`, name: c.name, base: c.base || 'Precio Lista c/IVA', value: c.value
      })));
      return { id: `sys-${pm.name}`, name: pm.name, bonus, costItems, isCustom: false };
    });
  };

  const selectProduct = (p) => {
    setSelectedProduct(p);
    setProductSearch(String(p.name));
    setShowResults(false);
    setCost(p.cost || 0);
    setIva(p.iva ?? 21);
    setMargin(p.margin ?? 50);
    setScenarios(buildScenariosForProduct(p));
    setExpandedIds({});
  };

  const price = useMemo(() => {
    const c = parseFloat(cost) || 0;
    const i = parseFloat(iva) || 0;
    const m = parseFloat(margin) || 0;
    return Math.round(c * (1 + i / 100) * (1 + m / 100));
  }, [cost, iva, margin]);

  const productCostWithIva = useMemo(() => (parseFloat(cost) || 0) * (1 + (parseFloat(iva) || 0) / 100), [cost, iva]);

  const results = useMemo(() => {
    return scenarios.map(s => {
      const bonus = parseFloat(s.bonus) || 0;
      const descuento = price * (bonus / 100);
      const precioVenta = price - descuento;
      const itemAmounts = (s.costItems || []).map(item => ({ ...item, amount: computeCostItemAmount(item, { price, iva: parseFloat(iva) || 0, cost: parseFloat(cost) || 0 }) }));
      const costosAsociados = itemAmounts.reduce((acc, item) => acc + item.amount, 0);
      const costosAsociadosPct = price > 0 ? (costosAsociados / price) * 100 : 0;
      const netoRecibido = precioVenta - costosAsociados;
      const gananciaNeta = netoRecibido - productCostWithIva;
      const margenNeto = price > 0 ? (gananciaNeta / price) * 100 : 0;
      return { ...s, itemAmounts, descuento, precioVenta, costosAsociados, costosAsociadosPct, netoRecibido, gananciaNeta, margenNeto };
    }).sort((a, b) => b.margenNeto - a.margenNeto);
  }, [scenarios, price, iva, cost, productCostWithIva]);

  const updateScenario = (id, field, value) => {
    setScenarios(scenarios.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeScenario = (id) => setScenarios(scenarios.filter(s => s.id !== id));

  const addCustomScenario = () => {
    const id = `custom-${Date.now()}-${Math.random()}`;
    setScenarios([...scenarios, { id, name: '', bonus: 0, costItems: [], isCustom: true }]);
    setExpandedIds(prev => ({ ...prev, [id]: true }));
  };

  const toggleExpanded = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  const addCostItem = (scenarioId) => {
    setScenarios(scenarios.map(s => s.id === scenarioId
      ? { ...s, costItems: [...(s.costItems || []), { id: `item-${Date.now()}-${Math.random()}`, name: '', base: 'Precio Lista c/IVA', value: 0 }] }
      : s));
  };

  const updateCostItem = (scenarioId, itemId, field, value) => {
    setScenarios(scenarios.map(s => s.id === scenarioId
      ? { ...s, costItems: s.costItems.map(item => item.id === itemId ? { ...item, [field]: value } : item) }
      : s));
  };

  const removeCostItem = (scenarioId, itemId) => {
    setScenarios(scenarios.map(s => s.id === scenarioId
      ? { ...s, costItems: s.costItems.filter(item => item.id !== itemId) }
      : s));
  };

  const bestId = results[0]?.id;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8">
        <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2 mb-6 border-b border-stone-100 pb-4">
          <Package className="w-5 h-5 text-[#b5a898]" /> 1. Seleccionar Producto
        </h4>
        <div className="relative max-w-md">
          <input
            type="text"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]"
            placeholder="Buscar producto del inventario..."
            value={productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setShowResults(true); }}
          />
          {showResults && filteredProducts.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
              {filteredProducts.map(p => (
                <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectProduct(p)} className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-100 flex justify-between items-center transition">
                  <span className="font-bold text-sm text-stone-800">{String(p.name)}</span>
                  <span className="text-[10px] font-black text-stone-400 uppercase">{p.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!selectedProduct && <p className="text-xs text-stone-400 font-bold uppercase mt-4">Elegí un producto del inventario para empezar el análisis.</p>}
      </div>

      {selectedProduct && (
        <>
          <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8">
            <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2 mb-6 border-b border-stone-100 pb-4">
              <Boxes className="w-5 h-5 text-[#b5a898]" /> 2. Costos del Producto <span className="text-stone-400 normal-case font-bold tracking-normal">(editable solo para esta simulación)</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Costo ($)</label>
                <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-stone-800 outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(cost)} onChange={e => setCost(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">IVA %</label>
                <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-stone-800 outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(iva)} onChange={e => setIva(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#b5a898] uppercase ml-1">Margen %</label>
                <input type="number" className="w-full bg-white border border-[#b5a898] rounded-xl px-4 py-3 font-black text-[#8c8173] outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(margin)} onChange={e => setMargin(e.target.value)} />
              </div>
              <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 flex flex-col justify-center items-center text-center">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Precio de Lista</p>
                <p className="text-xl font-black text-stone-900 tracking-tight">{formatCurrency(price)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-stone-200 shadow-sm p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-stone-100 pb-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#b5a898]" /> 3. Formas de Pago a Comparar
              </h4>
              <button onClick={addCustomScenario} className="bg-black text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition shadow-sm flex items-center gap-2 w-fit">
                <Plus className="w-4 h-4" /> Simular Nueva Forma de Pago
              </button>
            </div>

            {results.length === 0 && <p className="text-xs text-stone-400 font-bold uppercase text-center py-8">No hay formas de pago para comparar. Agregá una con el botón de arriba.</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] text-stone-400 uppercase tracking-widest border-b border-stone-200">
                    <th className="pb-3 pr-2">Forma de Pago</th>
                    <th className="pb-3 px-2 text-center">Descuento %</th>
                    <th className="pb-3 px-2 text-center">Costo Asoc. %</th>
                    <th className="pb-3 px-2 text-right">Neto Recibido</th>
                    <th className="pb-3 px-2 text-right">Ganancia Neta</th>
                    <th className="pb-3 px-2 text-right">Margen Neto</th>
                    <th className="pb-3 pl-2 text-center">-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {results.map(s => (
                    <React.Fragment key={s.id}>
                      <tr className={s.id === bestId ? 'bg-emerald-50/60' : ''}>
                        <td className="py-3 pr-2">
                          {s.isCustom ? (
                            <input type="text" placeholder="Nombre..." className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={s.name} onChange={e => updateScenario(s.id, 'name', e.target.value)} />
                          ) : (
                            <span className="font-bold text-sm text-stone-800">{s.name}</span>
                          )}
                          {s.id === bestId && <span className="block text-[8px] font-black uppercase tracking-widest text-emerald-600 mt-1">★ Mejor Opción</span>}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input type="number" className="w-20 bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-center font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={String(s.bonus)} onChange={e => updateScenario(s.id, 'bonus', e.target.value)} />
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button type="button" onClick={() => toggleExpanded(s.id)} className="flex items-center gap-1 mx-auto px-2 py-1.5 rounded-lg hover:bg-stone-100 transition">
                            <span className="font-bold text-sm text-stone-700">{s.costosAsociadosPct.toFixed(1)}%</span>
                            <span className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                              {expandedIds[s.id] ? <ChevronDown className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </span>
                          </button>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-stone-700">{formatCurrency(s.netoRecibido)}</td>
                        <td className={`py-3 px-2 text-right font-black ${s.gananciaNeta >= 0 ? 'text-stone-900' : 'text-rose-600'}`}>{formatCurrency(s.gananciaNeta)}</td>
                        <td className={`py-3 px-2 text-right font-black text-base tracking-tight ${s.margenNeto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{s.margenNeto.toFixed(1)}%</td>
                        <td className="py-3 pl-2 text-center"><button onClick={() => removeScenario(s.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                      {expandedIds[s.id] && (
                        <tr className="bg-[#f4f2f0]/50">
                          <td colSpan="7" className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-4 border-b border-stone-100 pb-2">Cómo se llega al resultado</h5>
                                <div className="space-y-2 text-xs font-bold">
                                  <div className="flex justify-between text-stone-600"><span>Precio de Lista</span><span>{formatCurrency(price)}</span></div>
                                  <div className="flex justify-between text-rose-500"><span>Descuento ({parseFloat(s.bonus) || 0}%)</span><span>-{formatCurrency(s.descuento)}</span></div>
                                  <div className="flex justify-between text-stone-800 border-t border-stone-100 pt-2"><span>= Precio de Venta</span><span>{formatCurrency(s.precioVenta)}</span></div>
                                  <div className="flex justify-between text-rose-500"><span>Costos Asociados ({s.costosAsociadosPct.toFixed(1)}%)</span><span>-{formatCurrency(s.costosAsociados)}</span></div>
                                  <div className="flex justify-between text-stone-800 border-t border-stone-100 pt-2"><span>= Neto Recibido</span><span>{formatCurrency(s.netoRecibido)}</span></div>
                                  <div className="flex justify-between text-rose-500"><span>Costo del Producto (c/IVA)</span><span>-{formatCurrency(productCostWithIva)}</span></div>
                                  <div className={`flex justify-between border-t border-stone-200 pt-2 text-sm ${s.gananciaNeta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}><span>= Ganancia Neta</span><span>{formatCurrency(s.gananciaNeta)}</span></div>
                                </div>
                              </div>
                              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-2">
                                  <h5 className="text-[9px] font-black uppercase tracking-widest text-stone-500">Desglose de Costos Asociados</h5>
                                  <button type="button" onClick={() => addCostItem(s.id)} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#b5a898] hover:text-[#8c8173] transition"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                                </div>
                                {(s.itemAmounts || []).length === 0 && <p className="text-xs text-stone-400 font-bold uppercase py-4 text-center">Sin costos asociados configurados.</p>}
                                <div className="space-y-3">
                                  {(s.itemAmounts || []).map(item => (
                                    <div key={item.id} className="flex flex-wrap items-center gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                                      <input type="text" placeholder="Concepto..." className="flex-1 min-w-[100px] bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none" value={item.name} onChange={e => updateCostItem(s.id, item.id, 'name', e.target.value)} />
                                      <select className="bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none" value={item.base} onChange={e => updateCostItem(s.id, item.id, 'base', e.target.value)}>
                                        {BASE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                                      </select>
                                      <input type="number" className="w-16 bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-center text-xs font-bold outline-none" value={String(item.value)} onChange={e => updateCostItem(s.id, item.id, 'value', e.target.value)} />
                                      <span className="text-[10px] font-black text-rose-500 w-24 text-right">-{formatCurrency(item.amount)}</span>
                                      <button type="button" onClick={() => removeCostItem(s.id, item.id)} className="p-1 text-stone-300 hover:text-red-500 transition"><X className="w-3.5 h-3.5" /></button>
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
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
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
    setTransfers([{ ...transferForm, id: Date.now(), amount: amt }, ...transfers]);
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
          detail: pay.note ? `${sale.items.map(i => i.name).join(', ')} - ${pay.note}` : sale.items.map(i => i.name).join(', '), 
          type: 'Ingreso',
          method: pay.method, amount: pay.amount 
        });
      });
    });

    const p = purchases.map(pur => ({
      id: pur.id, date: pur.date, concept: pur.category,
      detail: pur.description, type: 'Egreso', method: pur.paymentMethod,
      amount: -pur.amount 
    }));
    
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

  const periodIn = movements.filter(m => m.amount > 0 && !m.isTransfer).reduce((acc, m) => acc + m.amount, 0);
  const periodOut = movements.filter(m => m.amount < 0 && !m.isTransfer).reduce((acc, m) => acc + Math.abs(m.amount), 0);
  const periodBalance = periodIn - periodOut;

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Concepto', 'Detalle', 'Medio de Pago/Caja', 'Monto'];
    const rows = movements.map(m => [ m.date, m.type, `"${m.concept}"`, `"${m.detail}"`, `"${m.method}"`, m.amount ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Flujo_Caja_${startDate}_al_${endDate}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
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

// --- VISTAS INVENTARIO Y EXCEL ---

function MassUploadModal({ onUpload, onClose, categoryMargins }) {
  const [step, setStep] = useState('upload');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [previewProducts, setPreviewProducts] = useState([]);
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

  const buildPreview = () => {
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
    setPreviewProducts(finalProducts);
    setStep('preview');
  };

  const confirmImport = () => {
    onUpload(previewProducts);
    setStep('success');
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
      <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="bg-black p-6 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><UploadCloud className="w-5 h-5 text-[#b5a898]" /> Importador Masivo</h3>
          <button onClick={onClose} className="hover:text-[#b5a898] transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-8 overflow-y-auto flex-1">
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
              <button onClick={buildPreview} className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-md hover:bg-[#a39686] transition">Ver Vista Previa</button>
            </div>
          )}
          {step === 'preview' && (
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                Vista Previa ({previewProducts.length} producto{previewProducts.length === 1 ? '' : 's'} a importar)
              </h4>
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto border border-stone-100 rounded-xl">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-stone-50">
                    <tr className="text-[9px] text-stone-400 uppercase tracking-widest border-b border-stone-200">
                      <th className="py-2 px-4">Nombre</th>
                      <th className="py-2 px-4">Categoría</th>
                      <th className="py-2 px-4">Proveedor</th>
                      <th className="py-2 px-4 text-center">Stock</th>
                      <th className="py-2 px-4 text-right">Costo</th>
                      <th className="py-2 px-4 text-right">Precio Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {previewProducts.map(p => (
                      <tr key={p.id} className={!p.cost ? 'bg-rose-50/60' : ''}>
                        <td className="py-2 px-4 font-bold text-xs text-stone-800">{p.name}</td>
                        <td className="py-2 px-4 text-xs font-bold text-stone-600">{p.category}</td>
                        <td className="py-2 px-4 text-xs font-bold text-stone-600">{p.supplier}</td>
                        <td className="py-2 px-4 text-center text-xs font-bold text-stone-600">{p.stock}</td>
                        <td className={`py-2 px-4 text-right text-xs font-black ${!p.cost ? 'text-rose-600' : 'text-stone-800'}`}>{formatCurrency(p.cost)}</td>
                        <td className="py-2 px-4 text-right text-xs font-black text-[#8c8173]">{formatCurrency(p.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewProducts.some(p => !p.cost) && (
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">⚠ Las filas en rojo tienen Costo $0 — revisá el mapeo de columnas antes de confirmar.</p>
              )}
              <div className="flex gap-4">
                <button onClick={() => setStep('mapping')} className="flex-1 bg-stone-100 text-stone-600 py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-stone-200 transition">Volver al Mapeo</button>
                <button onClick={confirmImport} className="flex-1 bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-md hover:bg-[#a39686] transition">Confirmar e Importar</button>
              </div>
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

function InventoryReportsView({ products, sales }) {
  const reports = useMemo(() => {
    let totalCost = 0;
    let totalPrice = 0;
    let totalItems = 0;
    let lowStockCount = 0;

    const byCat = {};
    const bySup = {};
    const salesMap = {};

    // 1. Mapear ventas históricas por ID de producto (o nombre como fallback)
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.productId || item.name;
        salesMap[key] = (salesMap[key] || 0) + item.qty;
      });
    });

    // 2. Procesar valuaciones de Inventario actual
    products.forEach(p => {
      const qty = p.stock || 0;
      const costVal = (p.cost || 0) * qty;
      const priceVal = (p.price || 0) * qty;

      totalCost += costVal;
      totalPrice += priceVal;
      totalItems += qty;
      if (qty <= (p.minStock || 0)) lowStockCount++;

      const cat = p.category || 'Sin Categoría';
      if (!byCat[cat]) byCat[cat] = { cost: 0, price: 0, qty: 0 };
      byCat[cat].cost += costVal;
      byCat[cat].price += priceVal;
      byCat[cat].qty += qty;

      const sup = p.supplier || 'Sin Proveedor';
      if (!bySup[sup]) bySup[sup] = { cost: 0, price: 0, qty: 0 };
      bySup[sup].cost += costVal;
      bySup[sup].price += priceVal;
      bySup[sup].qty += qty;
    });

    // 3. Cruzar productos con ventas
    const prodsWithSales = products.map(p => ({
      ...p,
      soldQty: salesMap[p.id] || salesMap[p.name] || 0
    }));

    // Top 10 Más Vendidos
    const bestSellers = [...prodsWithSales]
      .filter(p => p.soldQty > 0)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 10);

    // Top 10 Sin Movimiento (Ordenados por mayor capital inmovilizado)
    const deadStock = [...prodsWithSales]
      .filter(p => p.soldQty === 0 && p.stock > 0)
      .sort((a, b) => ((b.stock || 0) * (b.cost || 0)) - ((a.stock || 0) * (a.cost || 0)))
      .slice(0, 10);

    return {
      totalCost, totalPrice, totalItems, lowStockCount,
      byCat: Object.entries(byCat).map(([k, v]) => ({ name: k, ...v })).sort((a, b) => b.cost - a.cost),
      bySup: Object.entries(bySup).map(([k, v]) => ({ name: k, ...v })).sort((a, b) => b.cost - a.cost),
      bestSellers, deadStock
    };
  }, [products, sales]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      {/* KPIs Generales de Valuación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-center">
           <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Boxes className="w-3 h-3"/> Costo Total de Inventario</h4>
           <p className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(reports.totalCost)}</p>
           <p className="text-[10px] font-bold text-stone-500 uppercase mt-2">Capital Invertido Físico</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-center">
           <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Tags className="w-3 h-3"/> Valuación a Precio de Lista</h4>
           <p className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(reports.totalPrice)}</p>
           <p className="text-[10px] font-bold text-stone-500 uppercase mt-2">Venta Potencial Total</p>
        </div>
        <div className="bg-black text-white p-6 rounded-2xl shadow-md flex flex-col justify-center border border-stone-800">
           <h4 className="text-[10px] font-bold text-[#b5a898] uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Ganancia Bruta Proyectada</h4>
           <p className="text-2xl font-black text-emerald-400 tracking-tight">{formatCurrency(reports.totalPrice - reports.totalCost)}</p>
           <p className="text-[10px] font-bold text-stone-400 uppercase mt-2">Margen Global: {reports.totalPrice > 0 ? ((reports.totalPrice - reports.totalCost) / reports.totalPrice * 100).toFixed(1) : 0}%</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-center">
           <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Artículos con Bajo Stock</h4>
           <p className="text-2xl font-black text-rose-700 tracking-tight">{reports.lowStockCount} <span className="text-sm font-bold">productos</span></p>
           <p className="text-[10px] font-bold text-rose-400 uppercase mt-2">Por debajo del mínimo</p>
        </div>
      </div>

      {/* Tablas de Valuación Agrupada */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm">
          <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest mb-6 flex items-center gap-2"><PieChart className="w-4 h-4 text-[#b5a898]" /> Valuación por Categoría</h4>
          <div className="overflow-y-auto max-h-[350px] custom-scrollbar pr-2 space-y-3">
             {reports.byCat.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100 transition hover:bg-stone-100">
                   <div>
                      <p className="font-bold text-sm text-stone-800">{c.name}</p>
                      <p className="text-[9px] font-black uppercase text-stone-400 tracking-widest">{c.qty} un. en stock</p>
                   </div>
                   <div className="text-right">
                      <p className="font-black text-sm text-stone-900">{formatCurrency(c.cost)} <span className="text-[9px] text-stone-500 uppercase font-bold">(Costo)</span></p>
                      <p className="font-bold text-xs text-[#8c8173] mt-0.5">{formatCurrency(c.price)} <span className="text-[8px] uppercase">(Lista)</span></p>
                   </div>
                </div>
             ))}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm">
          <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Boxes className="w-4 h-4 text-[#b5a898]" /> Valuación por Proveedor</h4>
          <div className="overflow-y-auto max-h-[350px] custom-scrollbar pr-2 space-y-3">
             {reports.bySup.map((s, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100 transition hover:bg-stone-100">
                   <div>
                      <p className="font-bold text-sm text-stone-800">{s.name}</p>
                      <p className="text-[9px] font-black uppercase text-stone-400 tracking-widest">{s.qty} un. en stock</p>
                   </div>
                   <div className="text-right">
                      <p className="font-black text-sm text-stone-900">{formatCurrency(s.cost)} <span className="text-[9px] text-stone-500 uppercase font-bold">(Costo)</span></p>
                      <p className="font-bold text-xs text-[#8c8173] mt-0.5">{formatCurrency(s.price)} <span className="text-[8px] uppercase">(Lista)</span></p>
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Productos con Movimiento vs Sin Movimiento */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-stone-200 shadow-sm">
          <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-500" /> Top 10 Best Sellers (Más Vendidos)</h4>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead><tr className="text-[9px] text-stone-400 uppercase tracking-widest border-b border-stone-100"><th className="pb-3">Producto</th><th className="pb-3 text-center">Un. Vendidas</th><th className="pb-3 text-center">Stock Actual</th></tr></thead>
               <tbody className="text-sm">
                  {reports.bestSellers.length === 0 && <tr><td colSpan="3" className="py-8 text-center text-xs font-bold text-stone-400 uppercase tracking-widest">Sin registro de ventas</td></tr>}
                  {reports.bestSellers.map(p => (
                     <tr key={p.id} className="border-b border-stone-50">
                        <td className="py-3 font-bold text-stone-800">{p.name} <span className="block text-[8px] uppercase tracking-widest text-stone-400">{p.category}</span></td>
                        <td className="py-3 text-center font-black text-emerald-600">{p.soldQty}</td>
                        <td className="py-3 text-center font-black text-stone-500">{p.stock}</td>
                     </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-rose-200 shadow-sm">
          <h4 className="text-xs font-black text-stone-800 uppercase tracking-widest mb-6 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> Top 10 Inmovilizados (Costo Atrapado)</h4>
          <p className="text-[10px] font-bold text-stone-500 uppercase mb-4 leading-tight">Artículos que <strong className="text-rose-600">JAMÁS</strong> se han vendido, ordenados por el mayor capital inmovilizado en stock.</p>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead><tr className="text-[9px] text-stone-400 uppercase tracking-widest border-b border-stone-100"><th className="pb-3">Producto</th><th className="pb-3 text-center">Un. Stock</th><th className="pb-3 text-right">Capital Atrapado</th></tr></thead>
               <tbody className="text-sm">
                  {reports.deadStock.length === 0 && <tr><td colSpan="3" className="py-8 text-center text-xs font-bold text-emerald-500 uppercase tracking-widest">¡Excelente! Todo tu inventario tuvo movimiento.</td></tr>}
                  {reports.deadStock.map(p => (
                     <tr key={p.id} className="border-b border-stone-50">
                        <td className="py-3 font-bold text-stone-800">{p.name} <span className="block text-[8px] uppercase tracking-widest text-stone-400">{p.category}</span></td>
                        <td className="py-3 text-center font-black text-rose-600">{p.stock}</td>
                        <td className="py-3 text-right font-black text-rose-700">{formatCurrency((p.cost||0) * (p.stock||0))}</td>
                     </tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkCostUpdateModal({ products, categories, onApply, onClose }) {
  const [mode, setMode] = useState('category'); // 'category' | 'supplier' | 'product'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [pct, setPct] = useState('');

  const suppliers = useMemo(() => {
    return [...new Set(products.map(p => p.supplier).filter(Boolean))].sort();
  }, [products]);

  const searchResults = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => !selectedProductIds.includes(p.id) && String(p.name).toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8);
  }, [productSearch, products, selectedProductIds]);

  const addProduct = (p) => { setSelectedProductIds([...selectedProductIds, p.id]); setProductSearch(''); setShowResults(false); };
  const removeProduct = (id) => setSelectedProductIds(selectedProductIds.filter(pid => pid !== id));

  const affectedProducts = useMemo(() => {
    if (mode === 'category') return selectedCategory ? products.filter(p => p.category === selectedCategory) : [];
    if (mode === 'supplier') return selectedSupplier ? products.filter(p => p.supplier === selectedSupplier) : [];
    return products.filter(p => selectedProductIds.includes(p.id));
  }, [mode, selectedCategory, selectedSupplier, selectedProductIds, products]);

  const pctNum = parseFloat(pct) || 0;

  const preview = useMemo(() => {
    return affectedProducts.map(p => {
      const newCost = (p.cost || 0) * (1 + pctNum / 100);
      const newPrice = Math.round(newCost * (1 + (p.iva || 0) / 100) * (1 + (p.margin || 0) / 100));
      return { ...p, newCost, newPrice };
    });
  }, [affectedProducts, pctNum]);

  const canApply = preview.length > 0 && pct !== '' && pctNum !== 0;

  const handleApply = () => {
    onApply(preview.map(p => ({ id: p.id, newCost: p.newCost, newPrice: p.newPrice })));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="bg-black p-6 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><Percent className="w-5 h-5 text-[#b5a898]" /> Actualización Masiva de Costos</h3>
          <button onClick={onClose} className="hover:text-[#b5a898] transition"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 space-y-6">
          <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1 mb-2 block">Aplicar por</label>
            <div className="flex bg-stone-100 p-1.5 rounded-2xl w-fit">
              <button onClick={() => { setMode('category'); }} className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition ${mode === 'category' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-200'}`}>Categoría</button>
              <button onClick={() => { setMode('supplier'); }} className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition ${mode === 'supplier' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-200'}`}>Proveedor</button>
              <button onClick={() => { setMode('product'); }} className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition ${mode === 'product' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-200'}`}>Producto</button>
            </div>
          </div>

          {mode === 'category' && (
            <div className="space-y-1 max-w-sm">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Categoría</label>
              <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                <option value="">Seleccionar...</option>
                {categories.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
              </select>
            </div>
          )}

          {mode === 'supplier' && (
            <div className="space-y-1 max-w-sm">
              <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Proveedor</label>
              <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                <option value="">Seleccionar...</option>
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {mode === 'product' && (
            <div className="space-y-3 max-w-sm">
              <div className="relative">
                <label className="text-[10px] font-bold text-stone-400 uppercase ml-1">Buscar Producto</label>
                <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-[#b5a898]" placeholder="Buscar..." value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowResults(true); }} />
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {searchResults.map(p => (
                      <button key={p.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => addProduct(p)} className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-100 flex justify-between items-center transition">
                        <span className="font-bold text-sm text-stone-800">{String(p.name)}</span>
                        <span className="text-[10px] font-black text-stone-400 uppercase">{p.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProductIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {affectedProducts.map(p => (
                    <span key={p.id} className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-bold text-stone-700">
                      {p.name}
                      <button onClick={() => removeProduct(p.id)} className="text-stone-400 hover:text-red-500 transition"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1 max-w-xs">
            <label className="text-[10px] font-bold text-[#b5a898] uppercase ml-1">Ajuste de Costo %</label>
            <input type="number" className="w-full bg-white border border-[#b5a898] rounded-xl px-4 py-3 font-black text-[#8c8173] outline-none focus:ring-2 focus:ring-[#b5a898]" placeholder="Ej: 15 (aumenta 15%) o -10 (baja 10%)" value={pct} onChange={e => setPct(e.target.value)} />
            <p className="text-[9px] text-stone-400 font-bold uppercase ml-1">El precio final se recalcula solo con el nuevo costo y el margen ya asignado a cada producto.</p>
          </div>

          <div className="border-t border-stone-100 pt-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-4">
              {preview.length > 0 ? `Vista Previa (${preview.length} producto${preview.length === 1 ? '' : 's'} afectado${preview.length === 1 ? '' : 's'})` : 'Vista Previa'}
            </h4>
            {preview.length === 0 ? (
              <p className="text-xs text-stone-400 font-bold uppercase text-center py-8">Elegí un filtro para ver los productos afectados.</p>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto border border-stone-100 rounded-xl">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-stone-50">
                    <tr className="text-[9px] text-stone-400 uppercase tracking-widest border-b border-stone-200">
                      <th className="py-2 px-4">Producto</th>
                      <th className="py-2 px-4 text-right">Costo Actual</th>
                      <th className="py-2 px-4 text-right">Costo Nuevo</th>
                      <th className="py-2 px-4 text-right">Precio Actual</th>
                      <th className="py-2 px-4 text-right">Precio Nuevo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {preview.map(p => (
                      <tr key={p.id}>
                        <td className="py-2 px-4 font-bold text-xs text-stone-800">{p.name}</td>
                        <td className="py-2 px-4 text-right text-xs font-bold text-stone-500">{formatCurrency(p.cost)}</td>
                        <td className="py-2 px-4 text-right text-xs font-black text-stone-800">{formatCurrency(p.newCost)}</td>
                        <td className="py-2 px-4 text-right text-xs font-bold text-stone-500">{formatCurrency(p.price)}</td>
                        <td className="py-2 px-4 text-right text-xs font-black text-[#8c8173]">{formatCurrency(p.newPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 border-t border-stone-200 shrink-0 flex gap-4 justify-end">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] text-stone-500 hover:bg-stone-100 transition">Cancelar</button>
          <button onClick={handleApply} disabled={!canApply} className="bg-[#b5a898] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-[#a39686] transition disabled:opacity-30 disabled:cursor-not-allowed">
            Aplicar a {preview.length} producto{preview.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryView({ products, setProducts, categories, categoryMargins, searchTerm, sales }) {
  const [activeTab, setActiveTab] = useState('catalogo'); // 'catalogo' | 'reportes'
  const [isAdding, setIsAdding] = useState(false);
  const [isMassLoading, setIsMassLoading] = useState(false);
  const [isBulkCostUpdating, setIsBulkCostUpdating] = useState(false);
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
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-bold flex items-center gap-3 text-stone-900">
          <div className="bg-[#b5a898]/10 p-3 rounded-2xl text-[#b5a898] shadow-sm"><Package className="w-6 h-6" /></div>
          Gestión de Inventario
        </h3>
        <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm w-fit">
          <button onClick={() => setActiveTab('catalogo')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'catalogo' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Package className="w-3.5 h-3.5" /> Catálogo</button>
          <button onClick={() => setActiveTab('reportes')} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 ${activeTab === 'reportes' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><BarChart2 className="w-3.5 h-3.5" /> Reportes de Stock</button>
        </div>
      </div>

      {activeTab === 'reportes' ? (
         <InventoryReportsView products={products} sales={sales} />
      ) : (
        <>
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
                <button onClick={() => setIsBulkCostUpdating(true)} className="bg-white border border-stone-200 text-stone-700 px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] hover:bg-stone-50 transition shadow-sm flex items-center gap-2"><Percent className="w-4 h-4" /> Actualizar Costos</button>
                <button onClick={() => { setEditingProduct(null); setIsAdding(true); }} className="bg-[#b5a898] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] hover:bg-[#a39686] shadow-md transition flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo</button>
              </div>
            )}
          </div>

          {isMassLoading && <MassUploadModal categoryMargins={categoryMargins} onUpload={(newProds) => setProducts([...newProds, ...products])} onClose={() => setIsMassLoading(false)} />}
          {isBulkCostUpdating && (
            <BulkCostUpdateModal
              products={products}
              categories={categories}
              onClose={() => setIsBulkCostUpdating(false)}
              onApply={(updates) => {
                setProducts(products.map(p => {
                  const upd = updates.find(u => u.id === p.id);
                  return upd ? { ...p, cost: upd.newCost, price: upd.newPrice } : p;
                }));
              }}
            />
          )}

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
                    <thead><tr className="bg-[#f4f2f0] text-stone-500 text-[10px] font-bold uppercase tracking-widest border-b border-stone-200"><th className="p-6">Producto</th><th className="p-6">Detalles</th><th className="p-6 text-center">Stock</th><th className="p-6 text-right">Precio Lista</th><th className="p-6 text-center">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-stone-100">
                      {filtered.map(product => (
                        <tr key={product.id} className="hover:bg-stone-50/50 transition">
                          <td className="p-6"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400"><Armchair className="w-5 h-5" /></div><div><p className="text-[9px] font-black text-[#b5a898] uppercase tracking-wider">{String(product.sku)}</p><p className="font-bold text-[#1a1a1a]">{String(product.name)}</p></div></div></td>
                          <td className="p-6"><p className="text-xs font-bold text-[#333333]">{String(product.supplier)}</p><p className="text-[9px] text-[#a8a096] uppercase font-bold mt-0.5">{String(product.category)} • {String(product.dimensions)}</p></td>
                          <td className="p-6 text-center"><span className={`inline-block px-3 py-1 rounded-md font-black text-xs ${product.stock <= product.minStock ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-700'}`}>{String(product.stock)}</span></td>
                          <td className="p-6 text-right"><p className="text-base font-black text-[#1a1a1a]">{formatCurrency(product.price)}</p><p className="text-[9px] font-bold text-[#8c8173] uppercase mt-0.5">Mrg {String(product.margin)}%</p></td>
                          <td className="p-6 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => { setEditingProduct(product); setIsAdding(true); }} className="p-2 text-stone-400 hover:text-black hover:bg-stone-100 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => { if (confirm(`¿Eliminar "${product.name}" del inventario?`)) setProducts(products.filter(p => p.id !== product.id)); }} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- VISTAS VENTAS ---

function SaleDetailModal({ sale, onClose, paymentMethods, paymentBonuses, onUpdateSale }) {
  const subtotal = sale.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
  
  const amountCoveredBase = sale.payments?.reduce((acc, p) => {
    const bonus = sale.type === 'loan' ? 0 : (paymentBonuses.find(b => b.method === p.method)?.value || 0);
    return acc + (p.amount / (1 - (bonus / 100)));
  }, 0) || 0;
  
  const balance = subtotal - amountCoveredBase;
  const actualTotalPaid = sale.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;

  const [tempMethod, setTempMethod] = useState('');
  const [tempAmount, setTempAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const currentBonusVal = sale.type === 'loan' ? 0 : (paymentBonuses.find(b => b.method === tempMethod)?.value || 0);

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

               {balance > 0.1 && sale.type !== 'loan' && (
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
               {sale.type === 'loan' && (
                 <div className="mt-8 p-4 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-100 flex items-start gap-2">
                   <Info className="w-4 h-4 shrink-0" /> Los cobros de este comprobante se gestionan desde el módulo de Préstamos (Cuotas).
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewSaleForm({ products, paymentMethods, categories, paymentBonuses, loanAdvances, onClose, onSave, editingSale, initialQuote }) {
  const [saleMode, setSaleMode] = useState(editingSale?.type === 'loan' ? 'loan' : 'regular'); // 'regular' | 'loan'
  
  const [saleDate, setSaleDate] = useState(editingSale ? editingSale.date : new Date().toISOString().split('T')[0]);
  const [cart, setCart] = useState(editingSale ? editingSale.items : initialQuote ? initialQuote.items : []);
  const [payments, setPayments] = useState(editingSale ? editingSale.payments || [] : []);
  
  const [productSearch, setProductSearch] = useState('');
  const [tempProductId, setTempProductId] = useState(null);
  const [tempCategory, setTempCategory] = useState('');
  const [tempPrice, setTempPrice] = useState('');
  const [tempCost, setTempCost] = useState(''); 
  const [tempIva, setTempIva] = useState('21'); 
  const [tempQty, setTempQty] = useState('1');
  const [showResults, setShowResults] = useState(false);
  const [tempPaymentMethod, setTempPaymentMethod] = useState('');
  const [tempPaymentAmount, setTempPaymentAmount] = useState('');

  // Préstamo State
  const [clientName, setClientName] = useState(initialQuote ? initialQuote.client.name : '');
  const [clientPhone, setClientPhone] = useState(initialQuote ? initialQuote.client.phone : '');
  const [clientDNI, setClientDNI] = useState(initialQuote ? initialQuote.client.dni : '');
  const [loanInterest, setLoanInterest] = useState('0');
  const [loanCuotas, setLoanCuotas] = useState('3');
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0];
  });

  const filteredInventory = useMemo(() => {
    if (!productSearch || productSearch.length < 1) return [];
    return products.filter(p => String(p.name).toLowerCase().includes(productSearch.toLowerCase()));
  }, [productSearch, products]);

  const subtotalCart = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const amountCoveredBase = payments.reduce((acc, p) => {
    const bonus = saleMode === 'loan' ? 0 : (paymentBonuses.find(b => b.method === p.method)?.value || 0);
    return acc + (p.amount / (1 - (bonus / 100)));
  }, 0);
  
  const balanceBase = subtotalCart - amountCoveredBase;
  const actualTotalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const currentBonusVal = saleMode === 'loan' ? 0 : (paymentBonuses.find(b => b.method === tempPaymentMethod)?.value || 0);
  
  const consolidatedBonus = amountCoveredBase - actualTotalPaid;
  const projectedBonus = balanceBase > 0 && saleMode !== 'loan' ? balanceBase * (currentBonusVal / 100) : 0;
  
  const displayBonus = consolidatedBonus + projectedBonus;
  const displaySaldo = balanceBase > 0 ? balanceBase - projectedBonus : 0;

  const minAdvanceRequired = useMemo(() => {
     if (saleMode !== 'loan') return 0;
     return cart.reduce((acc, item) => {
       const conf = loanAdvances?.find(a => a.category === item.category) || { advancePercent: 0 };
       return acc + (item.price * item.qty * (conf.advancePercent / 100));
     }, 0);
  }, [cart, saleMode, loanAdvances]);

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
    setCart([...cart, { id: Date.now() + Math.random(), productId: tempProductId, name: productSearch, category: tempCategory, price: p, cost: parseFloat(tempCost)||0, iva: parseFloat(tempIva)||21, qty: parseInt(tempQty)||1 }]);
    setProductSearch(''); setTempCategory(''); setTempPrice(''); setTempCost(''); setTempQty('1'); setTempProductId(null);
  };

  const addPayment = () => {
    const a = parseFloat(tempPaymentAmount);
    if (!tempPaymentMethod || isNaN(a) || a <= 0) return;
    setPayments([...payments, { id: Date.now() + Math.random(), method: tempPaymentMethod, amount: a, date: saleDate, note: saleMode === 'loan' ? 'Anticipo Préstamo' : '' }]);
    setTempPaymentMethod(''); setTempPaymentAmount('');
  };

  const handleSave = () => {
    if (cart.length === 0) return;
    const saleId = editingSale ? editingSale.id : `V-${Math.floor(Math.random()*9000)+1000}`;
    const newSale = { id: saleId, items: cart, date: saleDate, total: actualTotalPaid, payments: payments, type: saleMode };
    
    let loanData = null;
    if (saleMode === 'loan') {
       const interestNum = parseFloat(loanInterest) || 0;
       const cuotasNum = parseInt(loanCuotas) || 1;
       const baseToFinance = balanceBase;
       const totalFinanced = baseToFinance * (1 + (interestNum / 100));
       const cuotaAmount = totalFinanced / cuotasNum;
       
       const cuotasArray = [];
       let currentDueDate = new Date(firstDueDate);
       for (let i = 1; i <= cuotasNum; i++) {
          cuotasArray.push({
             numero: i,
             amount: cuotaAmount,
             dueDate: currentDueDate.toISOString().split('T')[0],
             status: 'pending'
          });
          currentDueDate.setMonth(currentDueDate.getMonth() + 1);
       }
       
       loanData = {
          id: `L-${Date.now()}`,
          saleId: saleId,
          client: { name: clientName, phone: clientPhone, dni: clientDNI },
          baseAmount: baseToFinance,
          interestRate: interestNum,
          totalFinanced: totalFinanced,
          cuotas: cuotasArray,
          status: 'active'
       };
    }
    
    onSave({ sale: newSale, loan: loanData });
  };

  const isSaveDisabled = cart.length === 0 || 
                         (saleMode === 'regular' && balanceBase < -0.1) || 
                         (saleMode === 'loan' && (!clientName.trim() || !clientDNI.trim() || balanceBase <= 0 || actualTotalPaid < minAdvanceRequired));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-300">
      <div className="lg:col-span-2 space-y-6">
        
        {/* Toggle Mode */}
        {!editingSale && (
           <div className="flex gap-2 p-1.5 bg-stone-200 rounded-xl w-fit">
              <button type="button" onClick={()=>setSaleMode('regular')} className={`px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition ${saleMode === 'regular' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Venta Regular / Contado</button>
              <button type="button" onClick={()=>setSaleMode('loan')} className={`px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition flex items-center gap-2 ${saleMode === 'loan' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}><BadgeDollarSign className="w-4 h-4"/> Préstamo Personal</button>
           </div>
        )}

        {/* 1. Products */}
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
                     <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setTempProductId(p.id); setProductSearch(String(p.name)); setTempCategory(String(p.category)); setTempPrice(String(p.price)); setTempCost(String(p.cost||0)); setTempIva(String(p.iva||21)); setShowResults(false); }} className="w-full text-left p-3 hover:bg-stone-50 border-b border-stone-100 flex justify-between items-center transition">
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

        {/* 2. Payments / Anticipo */}
        <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm">
          <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 mb-6 flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-500" /> 2. {saleMode === 'loan' ? 'Anticipo (Opcional)' : 'Registro de Pagos'}</h4>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 space-y-2"><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex justify-between">Medio Abonado {currentBonusVal > 0 && saleMode !== 'loan' && <span className="text-emerald-500">(-{currentBonusVal}%)</span>}</label>
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
                    <div><span className="font-bold text-sm text-emerald-900 block">{pay.method}</span><span className="text-[9px] text-emerald-700 uppercase font-bold tracking-widest block">Saldó: {saleMode === 'loan' ? formatCurrency(pay.amount) : formatCurrency(pay.amount / (1 - (b/100)))}</span></div>
                  </div>
                  <div className="flex items-center gap-4"><span className="font-black text-emerald-700 text-base">{formatCurrency(pay.amount)}</span><button onClick={() => setPayments(payments.filter(p => p.id !== pay.id))} className="text-stone-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4"/></button></div>
                </div>
               )
            })}
            {saleMode === 'loan' && (
              <div className="mt-8 p-4 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-100 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0" /> Los cobros de este comprobante se gestionan desde el módulo de Préstamos (Cuotas). No aplican bonificaciones comerciales.
              </div>
            )}
          </div>
        </div>

        {/* 3. Loan Plan */}
        {saleMode === 'loan' && (
          <div className="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-6">
               <h4 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2">
                 <Users className="w-5 h-5 text-blue-500" /> 3. Plan de Financiación y Cliente
               </h4>
               <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${actualTotalPaid >= minAdvanceRequired ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                  Anticipo Mín. Requerido: {formatCurrency(minAdvanceRequired)}
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Nombre Cliente *</label>
                <input required type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={clientName} onChange={e=>setClientName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-500 uppercase">DNI *</label>
                <input required type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={clientDNI} onChange={e=>setClientDNI(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-500 uppercase">WhatsApp</label>
                <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="Ej: 54911..." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Interés / Recargo (%)</label>
                <input type="number" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-blue-600 text-sm outline-none" value={loanInterest} onChange={e=>setLoanInterest(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Cant. Cuotas</label>
                <input type="number" min="1" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-black text-sm outline-none" value={loanCuotas} onChange={e=>setLoanCuotas(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-stone-500 uppercase">1er Vencimiento</label>
                <input type="date" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" value={firstDueDate} onChange={e=>setFirstDueDate(e.target.value)} />
              </div>
            </div>
            
            {balanceBase > 0 && loanCuotas > 0 && (
              <div className="mt-6 bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center text-blue-900 gap-4">
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">A Financiar (con recargo)</p>
                    <p className="font-black text-xl">{formatCurrency(balanceBase * (1 + ((parseFloat(loanInterest)||0)/100)))}</p>
                 </div>
                 <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Valor de Cuota (x{loanCuotas})</p>
                    <p className="font-black text-3xl tracking-tight">{formatCurrency((balanceBase * (1 + ((parseFloat(loanInterest)||0)/100))) / (parseInt(loanCuotas)||1))}</p>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-black text-white rounded-[2.5rem] p-8 shadow-xl sticky top-10 text-center">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-[#b5a898]">
            {editingSale ? 'Editando Venta' : saleMode === 'loan' ? 'Plan de Financiación' : initialQuote ? `Liquidación (De Presup. ${initialQuote.id})` : 'Liquidación Cliente'}
          </h4>
          <div className="space-y-6">
            <div className="flex justify-between items-center text-stone-400 border-b border-stone-800 pb-4"><span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Suma Lista</span><span className="font-black text-white text-xl">{formatCurrency(subtotalCart)}</span></div>
            <div className="space-y-5">
              {saleMode !== 'loan' && (
                <div className={`p-4 rounded-xl border flex justify-between items-center transition-colors ${displayBonus > 0 ? 'bg-[#b5a898]/20 border-[#b5a898]/30 text-[#b5a898]' : 'bg-transparent border-transparent text-stone-500'}`}><span className="text-[9px] font-bold uppercase tracking-widest">Bonificaciones</span><span className="text-lg font-black">-{formatCurrency(displayBonus)}</span></div>
              )}
              <div className="pt-4 text-center"><p className="text-[9px] font-bold uppercase text-stone-500 mb-1 tracking-[0.2em]">{saleMode === 'loan' ? 'Anticipo Abonado' : 'Total Final Cobrado'}</p><p className="text-5xl font-black tracking-tighter text-emerald-400">{formatCurrency(actualTotalPaid)}</p></div>
              <div className={`p-3 rounded-xl flex justify-between items-center transition-colors ${displaySaldo <= 0.1 && saleMode !== 'loan' ? 'text-emerald-500' : saleMode === 'loan' ? 'text-blue-400' : 'text-rose-400'}`}><span className="text-[9px] font-bold uppercase tracking-widest">{saleMode === 'loan' ? 'Capital a Financiar' : 'Saldo a cubrir'}</span><span className="text-sm font-black">{formatCurrency(balanceBase)}</span></div>
            </div>
          </div>
          <button onClick={handleSave} disabled={isSaveDisabled} className="w-full bg-[#b5a898] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#a39686] transition mt-8 shadow-lg disabled:opacity-10 active:scale-95 flex items-center justify-center gap-2">
            {saleMode === 'loan' ? 'Confirmar Crédito' : balanceBase > 0.1 ? 'Vender con Saldo Pendiente' : 'Confirmar Venta'} <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="w-full text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-6 hover:text-white transition">Cancelar y Volver</button>
        </div>
      </div>
    </div>
  );
}

function SalesView({ sales, setSales, loans, setLoans, products, setProducts, paymentMethods, taxRules, categories, paymentBonuses, loanAdvances, quoteToConvert, clearQuoteToConvert, onSaleSaved }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);

  useEffect(() => {
    if (quoteToConvert) {
       setEditingSale(null);
       setIsAdding(true);
    }
  }, [quoteToConvert]);

  const filteredSales = useMemo(() => {
    let filtered = sales;
    if (startDate) filtered = filtered.filter(s => s.date >= startDate);
    if (endDate) filtered = filtered.filter(s => s.date <= endDate);
    if (searchTerm) filtered = filtered.filter(s => String(s.id).toLowerCase().includes(searchTerm.toLowerCase()) || s.items.some(i => String(i.name).toLowerCase().includes(searchTerm.toLowerCase())));
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, searchTerm, startDate, endDate]);

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
            <button onClick={() => { setEditingSale(null); setIsAdding(true); }} className="bg-black text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-stone-800 transition shadow-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Nueva Venta</button>
          </div>
        )}
      </div>

      {selectedSaleDetail && <SaleDetailModal sale={selectedSaleDetail} onClose={() => setSelectedSaleDetail(null)} paymentMethods={paymentMethods} paymentBonuses={paymentBonuses} onUpdateSale={(updated) => { setSales(sales.map(s => s.id === updated.id ? updated : s)); setSelectedSaleDetail(updated); }} />}

      {isAdding ? <NewSaleForm products={products} paymentMethods={paymentMethods} taxRules={taxRules} categories={categories} paymentBonuses={paymentBonuses} loanAdvances={loanAdvances} editingSale={editingSale} initialQuote={quoteToConvert} onClose={() => { setIsAdding(false); setEditingSale(null); if(clearQuoteToConvert) clearQuoteToConvert(); }} onSave={({ sale, loan }) => { 
          if (editingSale) {
             setSales(sales.map(s => s.id === sale.id ? sale : s));
          } else {
             setSales([sale, ...sales]);
             if (loan) setLoans([loan, ...loans]);

             // Descontar inventario automáticamente
             let updatedProducts = [...products];
             sale.items.forEach(cartItem => {
                updatedProducts = updatedProducts.map(p => 
                   (p.id === cartItem.productId || p.name === cartItem.name) 
                   ? { ...p, stock: Math.max(0, p.stock - cartItem.qty) } 
                   : p
                );
             });
             setProducts(updatedProducts);
          }
          if (onSaleSaved) onSaleSaved(sale);
          setIsAdding(false); 
          setEditingSale(null); 
          if (clearQuoteToConvert) clearQuoteToConvert();
       }} /> : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSales.map(sale => {
            const subtotal = sale.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
            const amountCoveredBase = sale.payments?.reduce((acc, p) => acc + (p.amount / (1 - (sale.type === 'loan' ? 0 : ((paymentBonuses.find(b => b.method === p.method)?.value || 0) / 100)))), 0) || 0;
            const balance = subtotal - amountCoveredBase;

            return (
            <div key={sale.id} className="bg-white border border-stone-200 p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition group hover:border-[#b5a898]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center font-black text-stone-400 text-sm group-hover:bg-[#b5a898]/10 group-hover:text-[#b5a898] transition">#{String(sale.id).split('-')[1]}</div>
                <div>
                   <h4 className="font-bold text-stone-800 text-base">{sale.items.length === 1 ? String(sale.items[0].name) : `${sale.items.length} productos`}</h4>
                   <p className="text-[10px] font-bold uppercase text-stone-400 mt-1 flex items-center gap-1 tracking-widest"><Clock className="w-3 h-3"/> {String(sale.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col md:items-end gap-1">
                  <p className="text-2xl font-black text-stone-900 tracking-tight">{formatCurrency(subtotal)}</p>
                  {sale.type === 'loan' ? <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-[9px] font-black uppercase tracking-widest">En Préstamo</span> : balance > 0.1 ? <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-md text-[9px] font-black uppercase tracking-widest">Debe {formatCurrency(balance)}</span> : <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-widest">Cobrado</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedSaleDetail(sale)} className={`hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition shadow-sm ${balance > 0.1 && sale.type !== 'loan' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-stone-50 text-stone-500 hover:bg-[#b5a898] hover:text-white'}`}>
                    {balance > 0.1 && sale.type !== 'loan' ? 'Cobrar' : 'Comprobante'} <ChevronRight className="w-4 h-4" />
                  </button>
                  {sale.type !== 'loan' ? (
                     <button onClick={() => { setEditingSale(sale); setIsAdding(true); }} className="p-3 bg-stone-50 text-stone-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition" title="Editar Venta"><Pencil className="w-4 h-4" /></button>
                  ) : (
                     <span className="p-3 text-stone-300" title="Préstamo vinculado (Edición bloqueada)"><Pencil className="w-4 h-4" /></span>
                  )}
                  <button onClick={() => {if(confirm("¿Seguro?")) { setSales(sales.filter(s => s.id !== sale.id)); setLoans(loans.filter(l => l.saleId !== sale.id)); } }} className="p-3 bg-stone-50 text-stone-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition" title="Eliminar Venta"><Trash2 className="w-4 h-4" /></button>
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

// --- VISTA DE COMPRAS Y OTRAS VISTAS SE MANTIENEN IGUAL ... ---

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

function AdvanceManager({ categories, loanAdvances, setLoanAdvances, paymentMethods }) {
  const getAdvance = (cat) => loanAdvances.find(x => x.category === cat) || { advancePercent: 10, defaultMethod: 'Efectivo' };
  const updateAdvance = (cat, field, val) => {
    const existing = loanAdvances.find(x => x.category === cat);
    if (existing) {
      setLoanAdvances(loanAdvances.map(x => x.category === cat ? { ...x, [field]: val } : x));
    } else {
      setLoanAdvances([...loanAdvances, { category: cat, advancePercent: 10, defaultMethod: 'Efectivo', [field]: val }]);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="flex items-center gap-3 mb-8 text-stone-900"><div className="bg-blue-500/10 p-3 rounded-2xl text-blue-600 shadow-sm"><BadgeDollarSign className="w-6 h-6" /></div><h3 className="text-xl font-black">Anticipos de Préstamo por Categoría</h3></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {categories.map(cat => {
           const adv = getAdvance(cat);
           return (
           <div key={cat} className="bg-white border p-5 rounded-xl flex flex-col gap-3 shadow-sm border-stone-200 hover:border-blue-300 transition">
              <span className="font-bold text-stone-800 text-sm uppercase">{String(cat)}</span>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase">Mínimo (%)</span>
                <div className="flex items-center gap-2"><input type="number" className="w-16 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-right font-black text-blue-600 outline-none" value={String(adv.advancePercent)} onChange={(e) => updateAdvance(cat, 'advancePercent', parseFloat(e.target.value) || 0)} /><Percent className="w-3.5 h-3.5 text-stone-400" /></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase">Medio Pago</span>
                <select className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-stone-700 max-w-[130px]" value={adv.defaultMethod} onChange={(e) => updateAdvance(cat, 'defaultMethod', e.target.value)}>
                  <option value="">Ninguno</option>
                  {paymentMethods.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
           </div>
           )
         })}
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

function VariablesView({ categories, setCategories, expenseCategories, setExpenseCategories, paymentMethods, setPaymentMethods, taxRules, setTaxRules, paymentBonuses, setPaymentBonuses, categoryMargins, setCategoryMargins, taxConcepts, setTaxConcepts, accounts, setAccounts, loanAdvances, setLoanAdvances }) {
  const [activeTab, setActiveTab] = useState('categories');
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm w-fit overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveTab('categories')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'categories' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Tags className="w-3.5 h-3.5" /> Categorías</button>
        <button onClick={() => setActiveTab('margins')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'margins' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Percent className="w-3.5 h-3.5" /> Márgenes</button>
        <button onClick={() => setActiveTab('accounts')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'accounts' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Landmark className="w-3.5 h-3.5" /> Cuentas/Cajas</button>
        <button onClick={() => setActiveTab('payments')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'payments' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><CreditCard className="w-3.5 h-3.5" /> Medios Pago</button>
        <button onClick={() => setActiveTab('bonuses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'bonuses' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Gift className="w-3.5 h-3.5" /> Descuentos</button>
        <button onClick={() => setActiveTab('advances')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'advances' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><BadgeDollarSign className="w-3.5 h-3.5" /> Anticipos Préstamo</button>
        <button onClick={() => setActiveTab('taxes')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'taxes' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><Coins className="w-3.5 h-3.5" /> Reglas P&L</button>
        <button onClick={() => setActiveTab('expenses')} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'expenses' ? 'bg-black text-white shadow-md' : 'text-stone-500 hover:bg-stone-50'}`}><ShoppingBag className="w-3.5 h-3.5" /> Cat. Egresos</button>
      </div>
      <div className="bg-[#f4f2f0] p-8 md:p-12 rounded-[3rem] border border-stone-200 shadow-inner min-h-[500px]">
        {activeTab === 'categories' && <VariableManager title="Categorías de Inventario" list={categories} setList={setCategories} icon={Tags} placeholder="Ej: Escritorios..." />}
        {activeTab === 'margins' && <MarginManager categories={categories} categoryMargins={categoryMargins} setCategoryMargins={setCategoryMargins} />}
        {activeTab === 'accounts' && <AccountManager accounts={accounts} setAccounts={setAccounts} />}
        {activeTab === 'payments' && <PaymentMethodManager paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} accounts={accounts} />}
        {activeTab === 'bonuses' && <BonusManager paymentBonuses={paymentBonuses} setPaymentBonuses={setPaymentBonuses} paymentMethods={paymentMethods} />}
        {activeTab === 'advances' && <AdvanceManager categories={categories} loanAdvances={loanAdvances} setLoanAdvances={setLoanAdvances} paymentMethods={paymentMethods} />}
        {activeTab === 'taxes' && <TaxManager taxRules={taxRules} setTaxRules={setTaxRules} categories={categories} paymentMethods={paymentMethods} taxConcepts={taxConcepts} setTaxConcepts={setTaxConcepts} />}
        {activeTab === 'expenses' && <VariableManager title="Categorías de Egresos" list={expenseCategories} setList={setExpenseCategories} icon={ShoppingBag} placeholder="Ej: Servicios Generales..." />}
      </div>
    </div>
  );
}

// --- APP ROOT (CONEXIÓN FIREBASE FINAL PARA V4) ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [products, setProductsLocal] = useState([]);
  const [sales, setSalesLocal] = useState([]);
  const [loans, setLoansLocal] = useState([]);
  const [quotes, setQuotesLocal] = useState([]); 
  const [purchases, setPurchasesLocal] = useState([]); 
  const [transfers, setTransfersLocal] = useState([]);
  
  const [categories, setCategoriesLocal] = useState(INITIAL_CATEGORIES);
  const [categoryMargins, setCategoryMarginsLocal] = useState(INITIAL_CATEGORY_MARGINS);
  const [expenseCategories, setExpenseCategoriesLocal] = useState(INITIAL_PURCHASE_CATEGORIES);
  const [accounts, setAccountsLocal] = useState(INITIAL_ACCOUNTS);
  const [paymentMethods, setPaymentMethodsLocal] = useState(INITIAL_PAYMENTS);
  const [taxRules, setTaxRulesLocal] = useState(INITIAL_TAX_RULES);
  const [paymentBonuses, setPaymentBonusesLocal] = useState(INITIAL_PAYMENT_BONUSES);
  const [loanAdvances, setLoanAdvancesLocal] = useState(INITIAL_LOAN_ADVANCES);
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
        if (data.prestamos) setLoansLocal(data.prestamos);
        if (data.presupuestos) setQuotesLocal(data.presupuestos);
        if (data.gastos) setPurchasesLocal(data.gastos);
        if (data.transferencias) setTransfersLocal(data.transferencias);
        if (data.categories) setCategoriesLocal(data.categories);
        if (data.categoryMargins) setCategoryMarginsLocal(data.categoryMargins);
        if (data.expenseCategories) setExpenseCategoriesLocal(data.expenseCategories);
        if (data.accounts) setAccountsLocal(data.accounts);
        if (data.paymentMethods) setPaymentMethodsLocal(data.paymentMethods);
        if (data.taxRules) setTaxRulesLocal(data.taxRules);
        if (data.paymentBonuses) setPaymentBonusesLocal(data.paymentBonuses);
        if (data.loanAdvances) setLoanAdvancesLocal(data.loanAdvances);
        if (data.taxConcepts) setTaxConceptsLocal(data.taxConcepts);
      }
    });
    return () => unsubscribeData();
  }, [user]);

  // Setters a la Nube (Firebase setDoc)
  const setProducts = (n) => { setProductsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { productos: n }, { merge: true }); };
  const setSales = (n) => { setSalesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { ventas: n }, { merge: true }); };
  const setLoans = (n) => { setLoansLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { prestamos: n }, { merge: true }); };
  const setQuotes = (n) => { setQuotesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { presupuestos: n }, { merge: true }); };
  const setPurchases = (n) => { setPurchasesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { gastos: n }, { merge: true }); };
  const setTransfers = (n) => { setTransfersLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { transferencias: n }, { merge: true }); };
  const setCategories = (n) => { setCategoriesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { categories: n }, { merge: true }); };
  const setCategoryMargins = (n) => { setCategoryMarginsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { categoryMargins: n }, { merge: true }); };
  const setExpenseCategories = (n) => { setExpenseCategoriesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { expenseCategories: n }, { merge: true }); };
  const setAccounts = (n) => { setAccountsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { accounts: n }, { merge: true }); };
  const setPaymentMethods = (n) => { setPaymentMethodsLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { paymentMethods: n }, { merge: true }); };
  const setTaxRules = (n) => { setTaxRulesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { taxRules: n }, { merge: true }); };
  const setPaymentBonuses = (n) => { setPaymentBonusesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { paymentBonuses: n }, { merge: true }); };
  const setLoanAdvances = (n) => { setLoanAdvancesLocal(n); setDoc(doc(db, "sistema", "datosGenerales"), { loanAdvances: n }, { merge: true }); };
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
            <NavItem icon={ClipboardList} label="Presupuestos" id="quotes" />
            <NavItem icon={Package} label="Inventario" id="inventory" />
            <NavItem icon={ShoppingCart} label="Ventas" id="sales" />
            <NavItem icon={Banknote} label="Préstamos" id="loans" />
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
          {currentView === 'profitability' && <ProfitabilityView sales={sales} taxRules={taxRules} paymentBonuses={paymentBonuses} searchTerm={searchTerm} products={products} paymentMethods={paymentMethods} />}
          {currentView === 'quotes' && <QuotesView quotes={quotes} setQuotes={setQuotes} products={products} categories={categories} paymentMethods={paymentMethods} paymentBonuses={paymentBonuses} onConvertToSale={(quote) => { setQuoteToConvert(quote); setCurrentView('sales'); }} />}
          {currentView === 'inventory' && <InventoryView products={products} setProducts={setProducts} categories={categories} categoryMargins={categoryMargins} searchTerm={searchTerm} sales={sales} />}
          {currentView === 'sales' && <SalesView sales={sales} setSales={setSales} loans={loans} setLoans={setLoans} products={products} setProducts={setProducts} paymentMethods={paymentMethods} taxRules={taxRules} categories={categories} paymentBonuses={paymentBonuses} loanAdvances={loanAdvances} quoteToConvert={quoteToConvert} clearQuoteToConvert={() => setQuoteToConvert(null)} onSaleSaved={() => { if(quoteToConvert) { setQuotes(quotes.map(q => q.id === quoteToConvert.id ? {...q, status: 'converted'} : q)); setQuoteToConvert(null); } }} />}
          {currentView === 'loans' && <LoansView loans={loans} setLoans={setLoans} sales={sales} setSales={setSales} paymentMethods={paymentMethods} />}
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
              loanAdvances={loanAdvances} setLoanAdvances={setLoanAdvances}
            />
          )}
        </div>
      </main>
    </div>
  );
}