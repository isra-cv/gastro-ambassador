import React, { useState, useEffect } from 'react';
import { 
  User, QrCode, DollarSign, Star, Share2, 
  Wallet, Camera, MapPin, CheckCircle, 
  History, LogOut, Lock, Key, Store, 
  TrendingUp, Users, Plus, Trash2, LayoutDashboard
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  signOut, signInWithPopup, GoogleAuthProvider,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, 
  getDoc, onSnapshot, query, orderBy, 
  addDoc, serverTimestamp, runTransaction, 
  where, limit, updateDoc, deleteDoc
} from 'firebase/firestore';

// ------------------------------------------------------------------
// CONFIGURACIÓN FIREBASE (REEMPLAZA CON TUS LLAVES)
// ------------------------------------------------------------------
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyDl2B52CKwc8kKZX3c7UK1ab8RacMDP9u4",
  authDomain: "gastro-ambassador.firebaseapp.com",
  projectId: "gastro-ambassador",
  storageBucket: "gastro-ambassador.firebasestorage.app",
  messagingSenderId: "849590508706",
  appId: "1:849590508706:web:a1ff8dacf09b0c3760cbfb"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'gastro-ambassador-v2';

// Inicialización
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- UTILIDADES ---
const generateReferralCode = (name) => {
  const cleanName = name ? name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() : 'USER';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName}${random}`;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

// --- COMPONENTES UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-semibold flex items-center justify-center transition-all active:scale-95 shadow-sm";
  const variants = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200",
    secondary: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50",
    outline: "border-2 border-orange-500 text-orange-600 hover:bg-orange-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 shadow-none",
    google: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 shadow-none",
    dark: "bg-slate-800 text-white hover:bg-slate-700 shadow-slate-900"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {Icon && <Icon size={18} className="mr-2" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
    {children}
  </div>
);

// --- PANTALLAS ---

// 1. WELCOME SCREEN (Login + Registro Restaurante)
const WelcomeScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRestaurantMode, setIsRestaurantMode] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');

  const handleLogin = async () => {
    if (isRestaurantMode && !restaurantName.trim()) {
      setError("Ingresa el nombre de tu restaurante");
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Usamos Popup de Google para ambos casos
      // Nota: En producción real, manejarías roles con Claims o perfiles separados desde el principio.
      // Aquí usamos la lógica de creación de perfil para asignar el rol.
      const result = await signInWithPopup(auth, googleProvider);
      await checkUserRecord(result.user);
    } catch (err) {
      console.error(err);
      // Fallback a anónimo para DEMO si falla Google (común en entornos de prueba sin configurar dominios)
      try {
        const result = await signInAnonymously(auth);
        await checkUserRecord(result.user);
      } catch (anonErr) {
        setError("Error de autenticación. Verifica la consola.");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkUserRecord = async (user) => {
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // REGISTRO NUEVO
      const baseData = {
        uid: user.uid,
        email: user.email || null,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
      };

      if (isRestaurantMode) {
        // Registro como RESTAURANTE
        await setDoc(userRef, {
          ...baseData,
          displayName: restaurantName,
          role: 'owner',
          stats: { revenue: 0, commissions: 0, influencersCount: 0 }
        });
        // Crear colección inicial de promociones por defecto
        await addDoc(collection(db, 'artifacts', appId, 'promotions'), {
          restaurantId: user.uid,
          restaurantName: restaurantName,
          title: "Reseña en Google Maps",
          reward: 100,
          type: 'review',
          active: true
        });

      } else {
        // Registro como INFLUENCER
        const name = user.displayName || `Foodie-${user.uid.slice(0,4)}`;
        const newCode = generateReferralCode(name);
        await setDoc(userRef, {
          ...baseData,
          displayName: name,
          referralCode: newCode,
          role: 'user',
          balance: 0,
          points: 0
        });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', newCode), {
          uid: user.uid
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-orange-200 rounded-full blur-3xl opacity-50"></div>
      
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white z-10 transition-all">
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-2xl shadow-lg transform -rotate-3 transition-colors ${isRestaurantMode ? 'bg-slate-800' : 'bg-gradient-to-tr from-orange-500 to-yellow-500'}`}>
            {isRestaurantMode ? <Store className="text-white" size={32}/> : <Share2 className="text-white" size={32} />}
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {isRestaurantMode ? 'GastroAmbassador Business' : 'GastroAmbassador'}
        </h1>
        <p className="text-gray-500 text-center mb-6 text-sm">
          {isRestaurantMode ? 'Gestiona tus embajadores y aumenta tus ventas.' : 'Convierte tus salidas a comer en ingresos.'}
        </p>

        <div className="space-y-4">
          {isRestaurantMode && (
             <div className="animate-fade-in">
               <label className="block text-xs font-bold text-gray-500 mb-1">Nombre del Restaurante</label>
               <input 
                 type="text" 
                 value={restaurantName}
                 onChange={(e) => setRestaurantName(e.target.value)}
                 className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-slate-500 outline-none"
                 placeholder="Ej. Burger House Centro"
               />
             </div>
          )}

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}

          <Button 
            onClick={handleLogin} 
            variant={isRestaurantMode ? 'dark' : 'primary'} 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Conectando...' : (isRestaurantMode ? 'Registrar Restaurante' : 'Entrar con Google')}
          </Button>

          <div className="pt-4 border-t border-gray-100 text-center">
            <button 
              onClick={() => {setIsRestaurantMode(!isRestaurantMode); setError('');}}
              className="text-sm text-gray-400 hover:text-gray-600 underline decoration-dotted"
            >
              {isRestaurantMode ? '¿Eres influencer? Entra aquí' : '¿Tienes un restaurante? Regístrate aquí'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. DASHBOARD DEL INFLUENCER (CONSUMER)
const InfluencerDashboard = ({ user, userData }) => {
  const [promotions, setPromotions] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!user) return;
    
    // Obtener promociones activas de TODOS los restaurantes (Plataforma Global)
    const promosQuery = query(collection(db, 'artifacts', appId, 'promotions'), where('active', '==', true), limit(10));
    const unsubPromos = onSnapshot(promosQuery, (snap) => {
      setPromotions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const histRef = collection(db, 'artifacts', appId, 'users', user.uid, 'history');
    const q = query(histRef, orderBy('createdAt', 'desc'), limit(15));
    const unsubHist = onSnapshot(q, (snap) => setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubPromos(); unsubHist(); };
  }, [user]);

  const copyToClipboard = () => {
    const textToCopy = `¡Usa mi código ${userData.referralCode} para obtener descuentos!`;
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    textArea.style.position = "fixed"; textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus(); textArea.select();
    try {
      document.execCommand('copy');
      alert("¡Código copiado!");
    } catch (e) { console.error(e); }
    document.body.removeChild(textArea);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Hola, {userData.displayName?.split(' ')[0]}</h2>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Foodie Influencer</p>
          </div>
          <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold border-2 border-orange-200">
             {userData.displayName?.charAt(0)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-2xl p-4 text-white shadow-xl shadow-gray-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-10"><Wallet size={48} /></div>
             <p className="text-gray-400 text-xs mb-1">Saldo Ganado</p>
             <div className="text-2xl font-bold">{formatCurrency(userData.balance || 0)}</div>
          </div>
          <div className="bg-orange-500 rounded-2xl p-4 text-white shadow-xl shadow-orange-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-10"><Star size={48} /></div>
             <p className="text-orange-100 text-xs mb-1">Puntos Acumulados</p>
             <div className="text-2xl font-bold">{userData.points || 0} pts</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Referral Card */}
        <section>
          <Card className="bg-white border-orange-100 relative text-center">
            <h3 className="font-bold text-gray-800 mb-2">Tu Pasaporte de Influencer</h3>
            <div className="flex justify-center my-4">
               <QrCode size={80} className="text-gray-800 p-2 border-2 border-dashed border-gray-300 rounded-lg" />
            </div>
            <div className="text-4xl font-mono font-bold text-gray-900 tracking-wider mb-4">{userData.referralCode}</div>
            <p className="text-xs text-gray-400 mb-4">Presenta este código en cualquier restaurante afiliado</p>
            <Button onClick={copyToClipboard} variant="outline" className="w-full">Copiar Código</Button>
          </Card>
        </section>

        {/* Global Promotions */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800">Misiones Disponibles</h3>
          </div>
          <div className="space-y-3">
            {promotions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No hay misiones activas por ahora.</p>
            ) : (
              promotions.map(promo => (
                <div key={promo.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><MapPin size={20} /></div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">{promo.title}</h4>
                      <p className="text-xs text-gray-400">{promo.restaurantName} • +{promo.reward} Pts</p>
                    </div>
                  </div>
                  <Button onClick={() => alert("¡Participando! Sube tu evidencia cuando visites el lugar.")} variant="secondary" className="px-3 py-1 text-xs h-8">Ver</Button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* History */}
        <section>
           <h3 className="font-bold text-gray-800 mb-3">Tus Ganancias</h3>
           <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
             {history.length === 0 ? <p className="p-4 text-center text-xs text-gray-400">Sin actividad aún</p> : history.map((item) => (
                 <div key={item.id} className="p-4 flex justify-between items-center">
                   <div className="flex flex-col">
                     <span className="text-sm font-medium text-gray-800">
                        {item.type.includes('commission') ? `Comisión (${item.restaurantName || 'General'})` : 'Misión Completada'}
                     </span>
                     <span className="text-[10px] text-gray-400">{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                   </div>
                   <span className={`font-bold text-sm ${item.amount ? 'text-green-600' : 'text-orange-500'}`}>
                     +{item.amount ? formatCurrency(item.amount) : item.points}
                   </span>
                 </div>
             ))}
           </div>
        </section>

        <Button onClick={() => signOut(auth)} variant="ghost" className="w-full text-red-400" icon={LogOut}>Salir</Button>
      </div>
    </div>
  );
};

// 3. PANEL DE RESTAURANTE (BUSINESS)
const RestaurantPanel = ({ user, userData }) => {
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal', 'metrics', 'promos'
  
  // States para Terminal
  const [billAmount, setBillAmount] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [terminalMsg, setTerminalMsg] = useState(null);

  // States para Promos
  const [myPromos, setMyPromos] = useState([]);
  const [newPromoTitle, setNewPromoTitle] = useState('');
  const [newPromoReward, setNewPromoReward] = useState('');

  // States para Métricas
  const [influencers, setInfluencers] = useState([]);

  useEffect(() => {
    // Escuchar mis promociones
    const qPromos = query(collection(db, 'artifacts', appId, 'promotions'), where('restaurantId', '==', user.uid));
    const unsubPromos = onSnapshot(qPromos, (snap) => setMyPromos(snap.docs.map(d => ({id:d.id, ...d.data()}))));

    // Escuchar historial de MI restaurante para calcular lista de influencers
    // Nota: Esta query puede ser costosa en producción. Mejor usar una sub-colección de 'partners' o 'referrers'.
    // Para MVP: consultamos historial global donde restaurantId == mi ID. (Requiere índice compuesto en prod)
    // Simplificación: Solo mostramos métricas agregadas del perfil.
    
    return () => { unsubPromos(); };
  }, [user]);

  // Lógica de Terminal (Caja)
  const processSale = async () => {
    if (!billAmount || !customerCode) return;
    setProcessing(true); setTerminalMsg(null);
    try {
      const code = customerCode.toUpperCase();
      const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'codes', code);
      const codeSnap = await getDoc(codeRef);
      
      if (!codeSnap.exists()) throw new Error("Código no encontrado");
      const referrerId = codeSnap.data().uid;

      if (referrerId === user.uid) throw new Error("No puedes usar tu propio código");

      const amount = parseFloat(billAmount);
      const commission = amount * 0.10; // 10% fijo por ahora

      await runTransaction(db, async (t) => {
        // 1. Pagar al Influencer
        const infRef = doc(db, 'artifacts', appId, 'users', referrerId);
        const infSnap = await t.get(infRef);
        if (!infSnap.exists()) throw new Error("Influencer inválido");
        const infData = infSnap.data();
        
        t.update(infRef, { balance: (infData.balance || 0) + commission });

        // 2. Registrar historial para el Influencer
        const histRef = doc(collection(db, 'artifacts', appId, 'users', referrerId, 'history'));
        t.set(histRef, { 
          type: 'commission_direct', 
          amount: commission, 
          fromBill: amount, 
          restaurantName: userData.displayName,
          restaurantId: user.uid,
          createdAt: serverTimestamp() 
        });

        // 3. Actualizar Mis Métricas (Restaurante)
        const myRef = doc(db, 'artifacts', appId, 'users', user.uid);
        t.update(myRef, {
          'stats.revenue': (userData.stats?.revenue || 0) + amount,
          'stats.commissions': (userData.stats?.commissions || 0) + commission
        });

        // NIVEL 2 (Referidos de Referidos)
        if (infData.parentCode) {
           // Lógica similar para pagar al 'Abuelo' (Simplificada para no alargar código)
           // Se pagaría 10% extra o dividido según modelo de negocio
        }
      });

      setTerminalMsg({ type: 'success', text: `Venta registrada. Comisión: ${formatCurrency(commission)}` });
      setBillAmount(''); setCustomerCode('');
    } catch (e) {
      setTerminalMsg({ type: 'error', text: e.message });
    } finally { setProcessing(false); }
  };

  // Lógica de Promociones
  const createPromo = async () => {
    if (!newPromoTitle || !newPromoReward) return;
    await addDoc(collection(db, 'artifacts', appId, 'promotions'), {
      restaurantId: user.uid,
      restaurantName: userData.displayName,
      title: newPromoTitle,
      reward: parseInt(newPromoReward),
      active: true,
      createdAt: serverTimestamp()
    });
    setNewPromoTitle(''); setNewPromoReward('');
  };

  const deletePromo = async (id) => {
    if(confirm("¿Borrar promoción?")) await deleteDoc(doc(db, 'artifacts', appId, 'promotions', id));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <div className="md:w-64 bg-slate-950 p-6 flex flex-col border-r border-slate-800">
        <h2 className="text-xl font-bold text-orange-500 mb-8 flex items-center gap-2">
          <Store /> Business
        </h2>
        
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('terminal')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'terminal' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Terminal (Caja)
          </button>
          <button onClick={() => setActiveTab('metrics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'metrics' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <TrendingUp size={20} /> Métricas
          </button>
          <button onClick={() => setActiveTab('promos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'promos' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Star size={20} /> Promociones
          </button>
        </nav>

        <div className="mt-8 pt-6 border-t border-slate-800">
           <div className="text-sm text-slate-500 mb-2">{userData.displayName}</div>
           <Button onClick={() => signOut(auth)} variant="ghost" className="w-full text-red-400 justify-start px-0" icon={LogOut}>Cerrar Sesión</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        {/* TAB: TERMINAL */}
        {activeTab === 'terminal' && (
          <div className="max-w-lg mx-auto mt-10">
            <h3 className="text-2xl font-bold mb-6">Registrar Nuevo Consumo</h3>
            <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
              <div className="space-y-6">
                 <div>
                   <label className="text-slate-400 text-sm mb-2 block">Monto de la Cuenta</label>
                   <div className="relative">
                     <span className="absolute left-4 top-4 text-slate-500 text-lg">$</span>
                     <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl py-4 pl-10 pr-4 text-white text-2xl font-mono focus:border-orange-500 outline-none" placeholder="0.00"/>
                   </div>
                 </div>
                 <div>
                   <label className="text-slate-400 text-sm mb-2 block">Código del Influencer</label>
                   <div className="relative">
                     <span className="absolute left-4 top-4 text-slate-500"><QrCode /></span>
                     <input type="text" value={customerCode} onChange={e => setCustomerCode(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl py-4 pl-12 pr-4 text-white text-xl uppercase tracking-widest focus:border-orange-500 outline-none" placeholder="XXXX0000"/>
                   </div>
                 </div>

                 {terminalMsg && (
                   <div className={`p-4 rounded-xl flex items-center gap-2 ${terminalMsg.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}>
                     {terminalMsg.type === 'success' ? <CheckCircle size={20}/> : <Lock size={20}/>}
                     {terminalMsg.text}
                   </div>
                 )}

                 <Button onClick={processSale} disabled={processing} className="w-full py-4 text-lg mt-4">
                   {processing ? 'Procesando...' : 'Validar y Pagar Comisión'}
                 </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: METRICS */}
        {activeTab === 'metrics' && (
          <div className="max-w-4xl mx-auto">
             <h3 className="text-2xl font-bold mb-6">Rendimiento del Restaurante</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                   <p className="text-slate-400 text-sm mb-1">Ingresos por Influencers</p>
                   <div className="text-3xl font-bold text-green-400">{formatCurrency(userData.stats?.revenue || 0)}</div>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                   <p className="text-slate-400 text-sm mb-1">Comisiones Pagadas</p>
                   <div className="text-3xl font-bold text-orange-400">{formatCurrency(userData.stats?.commissions || 0)}</div>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                   <p className="text-slate-400 text-sm mb-1">Retorno de Inversión (ROI)</p>
                   <div className="text-3xl font-bold text-white">
                     {userData.stats?.commissions > 0 
                       ? ((userData.stats.revenue - userData.stats.commissions) / userData.stats.commissions).toFixed(1) + 'x'
                       : '0x'}
                   </div>
                </div>
             </div>

             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
               <h4 className="font-bold mb-4 text-slate-300">Resumen de Actividad</h4>
               <div className="text-center py-10 text-slate-500">
                 <TrendingUp size={48} className="mx-auto mb-3 opacity-20"/>
                 <p>Las gráficas detalladas estarán disponibles cuando tengas más de 50 transacciones.</p>
               </div>
             </div>
          </div>
        )}

        {/* TAB: PROMOS */}
        {activeTab === 'promos' && (
          <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold">Gestor de Misiones</h3>
             </div>

             {/* Create Promo */}
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
               <h4 className="font-bold text-orange-400 mb-4 flex items-center gap-2"><Plus size={18}/> Crear Nueva Misión</h4>
               <div className="flex flex-col md:flex-row gap-4">
                 <input 
                   type="text" 
                   value={newPromoTitle}
                   onChange={e => setNewPromoTitle(e.target.value)}
                   className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500"
                   placeholder="Ej. Sube una story comiendo tacos"
                 />
                 <input 
                   type="number" 
                   value={newPromoReward}
                   onChange={e => setNewPromoReward(e.target.value)}
                   className="w-32 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-500"
                   placeholder="Pts"
                 />
                 <Button onClick={createPromo} disabled={!newPromoTitle || !newPromoReward}>Publicar</Button>
               </div>
             </div>

             {/* List Promos */}
             <div className="space-y-4">
               {myPromos.map(promo => (
                 <div key={promo.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                       <div className="bg-orange-500/20 p-2 rounded-lg text-orange-400"><Star size={20}/></div>
                       <div>
                         <p className="font-semibold text-white">{promo.title}</p>
                         <p className="text-xs text-slate-400">Recompensa: {promo.reward} Puntos</p>
                       </div>
                    </div>
                    <button onClick={() => deletePromo(promo.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={18} />
                    </button>
                 </div>
               ))}
               {myPromos.length === 0 && <p className="text-slate-500 text-center">No tienes misiones activas.</p>}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

// --- MAIN ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth Init
    const initAuth = async () => {
       if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
         try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {}
       }
    };
    initAuth();

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        onSnapshot(doc(db, 'artifacts', appId, 'users', u.uid), (s) => {
           setUserData(s.exists() ? s.data() : null);
           setLoading(false);
        });
      } else {
        setUserData(null); setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-orange-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;
  
  if (!user || !userData) return <WelcomeScreen />;
  
  // Router basado en Rol
  if (userData.role === 'owner') return <RestaurantPanel user={user} userData={userData} />;
  
  return <InfluencerDashboard user={user} userData={userData} />;
}
