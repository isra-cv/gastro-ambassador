import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, QrCode, DollarSign, Star, Share2, 
  Wallet, Camera, MapPin, CheckCircle, 
  History, LogOut, Lock, Key, Store, 
  TrendingUp, Users, Plus, Trash2, LayoutDashboard,
  Instagram, Facebook, Video, Map, Globe, Link as LinkIcon,
  XCircle, Check, Search, AlertCircle, Edit, Save, List,
  Home, Coffee, Download, Calendar, Phone, MessageCircle, ExternalLink,
  ChevronRight, BarChart3, Filter, Clock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, 
  signOut, signInWithPopup, GoogleAuthProvider,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, 
  getDoc, getDocs, onSnapshot, query, orderBy, 
  addDoc, serverTimestamp, runTransaction, 
  where, limit, updateDoc, deleteDoc, arrayUnion, arrayRemove
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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'gastro-ambassador-v5-metrics';

// ------------------------------------------------------------------
// CONFIGURACIÓN DE MARCA (LOGO MIMOS Y BESITOS)
// ------------------------------------------------------------------
// IMPORTANTE: Sustituye esta URL por la URL pública de tu logo en Firebase Storage.
// Si no pones una URL válida, el QR saldrá con un icono roto en el centro o fallará.
// Usa una imagen PNG cuadrada preferiblemente.
const LOGO_URL = "https://firebasestorage.googleapis.com/v0/b/YOUR-BUCKET.appspot.com/o/logo.png?alt=media"; 

// Inicialización
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- UTILIDADES ---
const generateReferralCode = (name, prefix = '') => {
  const cleanName = name ? name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() : 'USER';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${cleanName}${random}`;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  return new Date(timestamp.seconds * 1000).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const formatTime = (date) => {
  if (!date) return '--:--';
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const getMonthName = (monthIndex) => {
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return months[monthIndex];
};

// --- COMPONENTES UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, size = 'md' }) => {
  const baseStyle = "rounded-xl font-semibold flex items-center justify-center transition-all active:scale-95 shadow-sm";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-lg"
  };
  
  const variants = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200",
    secondary: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50",
    outline: "border-2 border-orange-500 text-orange-600 hover:bg-orange-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 shadow-none",
    dark: "bg-slate-800 text-white hover:bg-slate-700 shadow-slate-900",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-green-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200",
    whatsapp: "bg-green-500 text-white hover:bg-green-600 border border-green-400"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 18} className="mr-2" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><XCircle size={20} className="text-gray-400"/></button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- PANTALLAS ---

// 1. WELCOME SCREEN
const WelcomeScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRestaurantMode, setIsRestaurantMode] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');

  const handleLogin = async () => {
    if (isRestaurantMode && !restaurantName.trim()) {
      setError("Ingresa el nombre de tu restaurante"); return;
    }
    setLoading(true); setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await checkUserRecord(result.user);
    } catch (err) {
      console.error("Google Auth Error:", err);
      try {
        const result = await signInAnonymously(auth);
        await checkUserRecord(result.user);
      } catch (anonErr) { 
        console.error("Anonymous Auth Error:", anonErr);
        let msg = "Error de autenticación.";
        if (err.code === 'auth/unauthorized-domain') {
          msg = "⚠️ Dominio no autorizado. Ve a Firebase Console > Authentication > Settings > Dominios autorizados.";
        } else if (err.code === 'auth/api-key-not-valid') {
          msg = "⚠️ API Key inválida. Verifica tu configuración.";
        }
        setError(msg); 
      }
    } finally { setLoading(false); }
  };

  const checkUserRecord = async (user) => {
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const baseData = { uid: user.uid, email: user.email || null, createdAt: serverTimestamp() };
      const newCode = generateReferralCode(isRestaurantMode ? restaurantName : user.displayName);

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', newCode), { uid: user.uid });

      if (isRestaurantMode) {
        await setDoc(userRef, {
          ...baseData,
          displayName: restaurantName,
          referralCode: newCode,
          role: 'owner',
          stats: { revenue: 0, commissions: 0 },
          pendingInfluencers: [],
          approvedInfluencers: []
        });
        await addDoc(collection(db, 'artifacts', appId, 'promotions'), {
          restaurantId: user.uid,
          restaurantName: restaurantName,
          title: "Reseña en Google Maps",
          description: "Déjanos 5 estrellas y un comentario positivo.",
          reward: 100,
          platform: 'google',
          active: true,
          createdAt: serverTimestamp()
        });
      } else {
        const name = user.displayName || `Foodie-${user.uid.slice(0,4)}`;
        await setDoc(userRef, {
          ...baseData,
          displayName: name,
          referralCode: newCode,
          role: 'user',
          commissionRate: 0.10, // Influencers ganan 10%
          balance: 0,
          points: 0,
          myRestaurants: [] 
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-orange-200 rounded-full blur-3xl opacity-50"></div>
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white z-10">
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-2xl shadow-lg transform -rotate-3 transition-colors ${isRestaurantMode ? 'bg-slate-800' : 'bg-gradient-to-tr from-orange-500 to-yellow-500'}`}>
            {isRestaurantMode ? <Store className="text-white" size={32}/> : <Share2 className="text-white" size={32} />}
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">{isRestaurantMode ? 'Panel de Restaurante' : 'GastroAmbassador'}</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">{isRestaurantMode ? 'Control total de tus embajadores.' : 'Gana por comer y compartir.'}</p>
        
        <div className="space-y-4">
          {isRestaurantMode && (
             <div className="animate-fade-in">
               <label className="block text-xs font-bold text-gray-500 mb-1">Nombre del Restaurante</label>
               <input type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-slate-500 outline-none" placeholder="Ej. Tacos El Rey"/>
             </div>
          )}
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}
          <Button onClick={handleLogin} variant={isRestaurantMode ? 'dark' : 'primary'} className="w-full" disabled={loading}>
            {loading ? 'Conectando...' : (isRestaurantMode ? 'Registrar Negocio' : 'Entrar con Google')}
          </Button>
          <div className="pt-4 border-t border-gray-100 text-center">
            <button onClick={() => {setIsRestaurantMode(!isRestaurantMode); setError('');}} className="text-sm text-gray-400 hover:text-gray-600 underline decoration-dotted">
              {isRestaurantMode ? '¿Eres Influencer? Clic aquí' : '¿Tienes un Restaurante? Clic aquí'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. INFLUENCER DASHBOARD
const InfluencerDashboard = ({ user, userData }) => {
  const [promotions, setPromotions] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [proofLink, setProofLink] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      if(data.myRestaurants && data.myRestaurants.length > 0) {
        const qPromos = query(collection(db, 'artifacts', appId, 'promotions'), where('restaurantId', 'in', data.myRestaurants), where('active', '==', true));
        onSnapshot(qPromos, (snapP) => setPromotions(snapP.docs.map(d => ({ id: d.id, ...d.data() }))));
      } else { setPromotions([]); }
    });
    return () => unsubUser();
  }, [user]);

  const handleJoinRestaurant = async () => {
    if(!joinCode) return;
    const code = joinCode.toUpperCase();
    const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'codes', code);
    const codeSnap = await getDoc(codeRef);
    let restId = null;
    if(codeSnap.exists()) { restId = codeSnap.data().uid; } 
    else {
      try {
        const q = query(collection(db, 'artifacts', appId, 'users'), where('referralCode', '==', code), where('role', '==', 'owner'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) restId = querySnapshot.docs[0].id;
      } catch (e) { console.error(e); }
    }
    
    if(restId) {
      await updateDoc(doc(db, 'artifacts', appId, 'users', restId), { pendingInfluencers: arrayUnion({ uid: user.uid, name: userData.displayName, email: userData.email }) });
      alert("¡Solicitud enviada!"); setJoinCode('');
    } else { alert("Código no encontrado."); }
  };

  const submitProof = async () => {
    if(!proofLink) return;
    await addDoc(collection(db, 'artifacts', appId, 'tasks'), {
      influencerId: user.uid, influencerName: userData.displayName, restaurantId: selectedPromo.restaurantId, restaurantName: selectedPromo.restaurantName, promoTitle: selectedPromo.title, promoId: selectedPromo.id, reward: selectedPromo.reward, platform: selectedPromo.platform || 'other', proof: proofLink, status: 'pending_review', createdAt: serverTimestamp()
    });
    alert("¡Evidencia enviada!"); setSelectedPromo(null); setProofLink('');
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'instagram': return <Instagram size={18} className="text-pink-600"/>;
      case 'google': return <Map size={18} className="text-red-500"/>;
      default: return <Globe size={18} className="text-gray-500"/>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Hola, {userData.displayName?.split(' ')[0]}</h2>
          <Button size="sm" variant="ghost" icon={LogOut} onClick={() => signOut(auth)} className="text-red-400">Salir</Button>
        </div>
        <div className="bg-orange-500 rounded-2xl p-5 text-white shadow-xl shadow-orange-200 flex justify-between items-center">
           <div><p className="text-orange-100 text-xs mb-1">Puntos</p><div className="text-3xl font-bold">{userData.points || 0}</div></div>
           <div className="text-right"><p className="text-orange-100 text-xs mb-1">Saldo</p><div className="text-xl font-bold">{formatCurrency(userData.balance || 0)}</div></div>
        </div>
      </div>
      <div className="p-6 space-y-8">
        {(!userData.myRestaurants || userData.myRestaurants.length === 0) && (
          <Card className="bg-blue-50 border-blue-100">
            <h3 className="font-bold text-blue-900 mb-2">Únete a un equipo</h3>
            <div className="flex gap-2"><input type="text" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="CÓDIGO" className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-sm uppercase"/><Button size="sm" onClick={handleJoinRestaurant}>Unirme</Button></div>
          </Card>
        )}
        <div>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Star size={18} className="text-yellow-500"/> Misiones Activas</h3>
          <div className="space-y-3">
            {promotions.map(promo => (
              <div key={promo.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="bg-gray-50 p-2 rounded-xl">{getPlatformIcon(promo.platform)}</div><div><h4 className="font-semibold text-sm text-gray-800">{promo.title}</h4><p className="text-xs text-gray-400">+{promo.reward} pts</p></div></div>
                <Button size="sm" variant="secondary" onClick={() => setSelectedPromo(promo)}>Ver</Button>
              </div>
            ))}
          </div>
        </div>
        <Modal isOpen={!!selectedPromo} onClose={() => setSelectedPromo(null)} title="Enviar Evidencia">
          <p className="text-sm text-gray-600 mb-4">{selectedPromo?.description}</p>
          <input type="url" value={proofLink} onChange={e=>setProofLink(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 text-sm"/>
          <Button className="w-full" onClick={submitProof}>Enviar</Button>
        </Modal>
      </div>
    </div>
  );
};

// 3. RESTAURANT PANEL (ADMIN)
const RestaurantPanel = ({ user, userData }) => {
  const [activeTab, setActiveTab] = useState('terminal'); 
  const [pendingReviews, setPendingReviews] = useState([]);
  const [partners, setPartners] = useState([]);
  const [partnerLog, setPartnerLog] = useState([]);
  const [viewingQR, setViewingQR] = useState(null); 
  
  // Forms & Modals
  const [promoForm, setPromoForm] = useState({ id: null, title: '', reward: '', platform: 'instagram' });
  const [isEditing, setIsEditing] = useState(false);
  const [showNewPartner, setShowNewPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerLink, setNewPartnerLink] = useState('');
  const [newPartnerImg, setNewPartnerImg] = useState('');

  // Partner Details & Search
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState(null); 
  const [selectedPartnerStats, setSelectedPartnerStats] = useState(null);
  
  // Terminal
  const [billAmount, setBillAmount] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [terminalMsg, setTerminalMsg] = useState(null);
  const [identifiedPartner, setIdentifiedPartner] = useState(null); 
  const [checkInTime, setCheckInTime] = useState(null); 

  useEffect(() => {
    const qPending = query(collection(db, 'artifacts', appId, 'tasks'), where('restaurantId', '==', user.uid), where('status', '==', 'pending_review'));
    const unsubPending = onSnapshot(qPending, (snap) => setPendingReviews(snap.docs.map(d => ({id:d.id, ...d.data()}))));

    const qPartners = query(collection(db, 'artifacts', appId, 'users'), where('createdBy', '==', user.uid), where('role', '==', 'partner'));
    const unsubPartners = onSnapshot(qPartners, (snap) => setPartners(snap.docs.map(d => ({id:d.id, ...d.data()}))));

    const qHist = query(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), orderBy('createdAt', 'desc'));
    const unsubHist = onSnapshot(qHist, (snap) => {
        const logs = snap.docs.map(d => ({id:d.id, ...d.data()}));
        setPartnerLog(logs);
    });

    return () => { unsubPending(); unsubPartners(); unsubHist(); };
  }, [user]);

  // --- ACTIONS ---
  const handleApproveReview = async (task) => {
    try {
      await runTransaction(db, async (t) => {
        const taskRef = doc(db, 'artifacts', appId, 'tasks', task.id);
        const userRef = doc(db, 'artifacts', appId, 'users', task.influencerId);
        const userSnap = await t.get(userRef);
        t.update(taskRef, { status: 'approved' });
        t.update(userRef, { points: (userSnap.data().points || 0) + task.reward });
      });
      alert("Misión aprobada.");
    } catch(e) { console.error(e); }
  };

  const handleRejectReview = async (id) => {
    if(confirm("¿Rechazar?")) await updateDoc(doc(db, 'artifacts', appId, 'tasks', id), { status: 'rejected' });
  };

  const createPartner = async () => {
    if (!newPartnerName) return;
    const partnerId = `PARTNER-${Date.now()}`;
    const code = generateReferralCode(newPartnerName, 'HOST-');

    await setDoc(doc(db, 'artifacts', appId, 'users', partnerId), {
      uid: partnerId,
      displayName: newPartnerName,
      referralCode: code,
      role: 'partner',
      commissionRate: 0.03, // 3% Commission
      balance: 0,
      createdBy: user.uid,
      phoneNumber: newPartnerPhone,
      airbnbUrl: newPartnerLink,
      photoURL: newPartnerImg, 
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', code), { uid: partnerId });
    setNewPartnerName(''); setNewPartnerPhone(''); setNewPartnerLink(''); setNewPartnerImg(''); setShowNewPartner(false);
    setViewingQR(code);
  };

  const identifyCode = async () => {
    if(!customerCode) return;
    setIdentifiedPartner(null);
    setTerminalMsg(null);
    setCheckInTime(null);
    
    try {
      const code = customerCode.toUpperCase();
      const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'codes', code);
      const codeSnap = await getDoc(codeRef);
      
      if(codeSnap.exists()) {
         const uid = codeSnap.data().uid;
         const userRef = doc(db, 'artifacts', appId, 'users', uid);
         const userSnap = await getDoc(userRef);
         if(userSnap.exists()) {
            setIdentifiedPartner(userSnap.data());
            setCheckInTime(new Date()); 
         }
      } else {
        setTerminalMsg({type: 'error', text: 'Código no encontrado'});
      }
    } catch(e) { console.error(e); }
  };

  const processSale = async () => {
      if (!billAmount || !customerCode) return;
      try {
        const code = customerCode.toUpperCase();
        const codeSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', code));
        if (!codeSnap.exists()) throw new Error("Código inválido");
        const refId = codeSnap.data().uid;
        const amount = parseFloat(billAmount);

        const refRef = doc(db, 'artifacts', appId, 'users', refId);
        
        await runTransaction(db, async (t) => {
           const infSnap = await t.get(refRef);
           if (!infSnap.exists()) throw "Usuario no encontrado";
           
           const infData = infSnap.data();
           const rate = infData.commissionRate || 0.10; 
           const comm = amount * rate;
           const isPartner = infData.role === 'partner';
           
           t.update(refRef, { balance: (infData.balance || 0) + comm });
           
           const myRef = doc(db, 'artifacts', appId, 'users', user.uid);
           t.update(myRef, { 'stats.revenue': (userData.stats?.revenue || 0) + amount, 'stats.commissions': (userData.stats?.commissions || 0) + comm });

           const logRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'));
           t.set(logRef, {
             type: 'sale',
             amount: amount,
             commission: comm,
             rate: rate,
             beneficiaryName: infData.displayName,
             beneficiaryCode: infData.referralCode,
             isPartnerSale: isPartner, 
             createdAt: serverTimestamp(),
             checkInTime: checkInTime ? checkInTime.toISOString() : null 
           });
        });
        setTerminalMsg({type: 'success', text: `Venta registrada.`});
        setBillAmount(''); setCustomerCode(''); setIdentifiedPartner(null); setCheckInTime(null);
      } catch(e) { setTerminalMsg({type:'error', text: e.message}); }
  };

  const handleSavePromo = async () => {
    if(!promoForm.title || !promoForm.reward) return;
    const data = { title: promoForm.title, reward: parseInt(promoForm.reward), platform: promoForm.platform };
    if (promoForm.id) { await updateDoc(doc(db, 'artifacts', appId, 'promotions', promoForm.id), data); } 
    else { await addDoc(collection(db, 'artifacts', appId, 'promotions'), { restaurantId: user.uid, restaurantName: userData.displayName, ...data, active: true, createdAt: serverTimestamp() }); }
    setPromoForm({ id: null, title: '', reward: '', platform: 'instagram' }); setIsEditing(false);
  };

  const downloadQR = (code) => { setViewingQR(code); };

  const openWhatsApp = (phone) => {
     if(!phone) return;
     const clean = phone.replace(/\D/g, '');
     window.open(`https://wa.me/${clean}`, '_blank');
  };

  const openPartnerDetails = (partner) => {
      setSelectedPartner(partner);
      
      const logs = partnerLog.filter(l => l.beneficiaryCode === partner.referralCode);
      const breakdown = {};
      logs.forEach(log => {
          if(!log.createdAt) return;
          const d = new Date(log.createdAt.seconds * 1000);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if(!breakdown[key]) breakdown[key] = { month: d.getMonth(), year: d.getFullYear(), amount: 0, visits: 0 };
          breakdown[key].amount += (log.commission || 0);
          breakdown[key].visits += 1;
      });
      setSelectedPartnerStats(Object.values(breakdown).sort((a,b) => b.year - a.year || b.month - a.month));
  };

  // Filter partners
  const filteredPartners = partners.filter(p => 
      p.displayName.toLowerCase().includes(partnerSearchTerm.toLowerCase()) || 
      p.referralCode.includes(partnerSearchTerm.toUpperCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col md:flex-row">
      <div className="md:w-64 bg-slate-950 p-6 flex flex-col border-r border-slate-800">
        <h2 className="text-xl font-bold text-orange-500 mb-8 flex items-center gap-2"><Store /> Admin Panel</h2>
        <nav className="space-y-2 flex-1">
          <NavItem icon={LayoutDashboard} label="Terminal" active={activeTab==='terminal'} onClick={()=>setActiveTab('terminal')}/>
          <NavItem icon={Home} label="Airbnb & Partners" active={activeTab==='partners'} onClick={()=>setActiveTab('partners')} badge={partners.length > 0 ? partners.length : null}/>
          <NavItem icon={Users} label="Influencers" active={activeTab==='influencers'} onClick={()=>setActiveTab('influencers')} badge={userData.pendingInfluencers?.length}/>
          <NavItem icon={Globe} label="Misiones" active={activeTab==='social'} onClick={()=>setActiveTab('social')} badge={pendingReviews.length}/>
          <NavItem icon={TrendingUp} label="Métricas" active={activeTab==='metrics'} onClick={()=>setActiveTab('metrics')}/>
        </nav>
        <div className="mt-8 pt-6 border-t border-slate-800">
           <div className="text-sm text-slate-500 mb-2 truncate">{userData.displayName}</div>
           <Button onClick={() => signOut(auth)} variant="ghost" className="w-full text-red-400 justify-start px-0" icon={LogOut}>Salir</Button>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        
        {/* TAB: TERMINAL */}
        {activeTab === 'terminal' && (
           <div className="max-w-md mx-auto mt-10">
              <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl mb-6">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Coffee className="text-orange-400"/> Terminal de Venta</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-widest">Código Promocional</label>
                    <div className="flex gap-2 mt-1">
                        <input type="text" value={customerCode} onChange={e=>setCustomerCode(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-xl uppercase tracking-widest" placeholder="HOST-XXXX"/>
                        <Button onClick={identifyCode} icon={Search} className="px-6">Buscar</Button>
                    </div>
                  </div>

                  {identifiedPartner && (
                      <div className="bg-slate-900 border border-slate-600 rounded-xl p-4 animate-fade-in space-y-4">
                          
                          {/* 1. TARJETA VISUAL DEL CÓDIGO (MESA ABIERTA) */}
                          <div className="bg-white rounded-lg p-6 flex flex-col items-center justify-center text-slate-900 shadow-lg aspect-square">
                              <p className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-bold">Mesa Abierta</p>
                              <div className="text-3xl font-black font-mono tracking-widest text-center break-all mb-4">
                                {identifiedPartner.referralCode}
                              </div>
                              <div className="bg-gray-100 px-4 py-2 rounded-full flex items-center gap-2">
                                <Clock size={16} className="text-orange-500"/>
                                <span className="font-bold font-mono text-lg">{checkInTime ? formatTime(checkInTime) : '--:--'}</span>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">Hora de Registro</p>
                          </div>

                          {/* 2. INFO DEL PARTNER */}
                          <div className="flex gap-4 items-start">
                              <div className="w-16 h-16 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 border border-slate-700">
                                  {identifiedPartner.photoURL ? (
                                      <img src={identifiedPartner.photoURL} alt="Airbnb" className="w-full h-full object-cover"/>
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-500"><Home size={24}/></div>
                                  )}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                  <h4 className="font-bold text-white truncate">{identifiedPartner.displayName}</h4>
                                  <p className="text-xs text-orange-400 mb-2 uppercase">{identifiedPartner.role === 'partner' ? 'Host Airbnb (3%)' : 'Influencer (10%)'}</p>
                                  <div className="flex gap-2 overflow-x-auto pb-2">
                                      {identifiedPartner.airbnbUrl && (
                                          <a href={identifiedPartner.airbnbUrl} target="_blank" rel="noreferrer" className="bg-pink-600/20 text-pink-400 p-2 rounded-lg hover:bg-pink-600/30 transition-colors" title="Ver en Airbnb">
                                              <ExternalLink size={16}/>
                                          </a>
                                      )}
                                      {identifiedPartner.phoneNumber && (
                                          <>
                                            <button onClick={()=>openWhatsApp(identifiedPartner.phoneNumber)} className="bg-green-500/20 text-green-400 p-2 rounded-lg hover:bg-green-500/30 transition-colors" title="WhatsApp">
                                                <MessageCircle size={16}/>
                                            </button>
                                            <a href={`tel:${identifiedPartner.phoneNumber}`} className="bg-blue-500/20 text-blue-400 p-2 rounded-lg hover:bg-blue-500/30 transition-colors" title="Llamar">
                                                <Phone size={16}/>
                                            </a>
                                          </>
                                      )}
                                  </div>
                              </div>
                          </div>
                          {identifiedPartner.role === 'partner' && <div className="mt-2 text-xs text-green-400 bg-green-900/20 p-2 rounded text-center border border-green-900/50">✅ Huésped verificado - Aplicar Refill</div>}
                      </div>
                  )}

                  <div className="pt-4 border-t border-slate-700">
                    <label className="text-xs text-slate-500 uppercase tracking-widest">Agregar Consumo Final</label>
                    <div className="relative mt-1"><span className="absolute left-3 top-3 text-slate-500">$</span><input type="number" value={billAmount} onChange={e=>setBillAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 pl-8 pr-4 text-white text-xl" placeholder="0.00"/></div>
                  </div>
                  
                  {terminalMsg && <p className={`text-sm text-center p-2 rounded ${terminalMsg.type === 'error' ? 'text-red-400 bg-red-900/20' : 'text-green-400 bg-green-900/20'}`}>{terminalMsg.text}</p>}
                  
                  <Button onClick={processSale} className="w-full py-4 text-lg mt-2" disabled={!identifiedPartner && !customerCode}>
                      {identifiedPartner ? `Cerrar Mesa y Pagar Comisión` : 'Registrar'}
                  </Button>
                </div>
              </div>
           </div>
        )}

        {/* TAB: PARTNERS */}
        {activeTab === 'partners' && (
          <div className="max-w-6xl mx-auto animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
               <div>
                 <h3 className="text-2xl font-bold flex items-center gap-2"><Home className="text-pink-500"/> Alianzas Airbnb</h3>
                 <p className="text-slate-400 text-sm">Gestiona hosts y comisiones del 3%.</p>
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-3 text-slate-500" size={18}/>
                    <input 
                      type="text" 
                      value={partnerSearchTerm}
                      onChange={(e) => setPartnerSearchTerm(e.target.value)}
                      placeholder="Buscar por código..." 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white focus:border-pink-500 outline-none uppercase"
                    />
                 </div>
                 <Button onClick={()=>setShowNewPartner(true)} icon={Plus} className="bg-pink-600 hover:bg-pink-700 border-none shrink-0">Nuevo Host</Button>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
               {filteredPartners.map(p => {
                 const logs = partnerLog.filter(l => l.beneficiaryCode === p.referralCode);
                 const currentMonth = new Date().getMonth();
                 const monthCommission = logs.filter(l => {
                    if(!l.createdAt) return false;
                    const d = new Date(l.createdAt.seconds * 1000);
                    return d.getMonth() === currentMonth;
                 }).reduce((acc, curr) => acc + (curr.commission || 0), 0);

                 return (
                   <div key={p.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 relative overflow-hidden group hover:border-pink-500/50 transition-colors cursor-pointer" onClick={() => openPartnerDetails(p)}>
                     <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Home size={80}/></div>
                     
                     <div className="flex items-start gap-3 mb-4 relative z-10">
                        <div className="w-14 h-14 bg-slate-700 rounded-xl overflow-hidden shrink-0 border border-slate-600">
                          {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-500"><Home size={20}/></div>}
                        </div>
                        <div className="overflow-hidden">
                           <h4 className="font-bold text-lg truncate text-white group-hover:text-pink-400 transition-colors">{p.displayName}</h4>
                           <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-mono border border-slate-700">{p.referralCode}</span>
                           </div>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                            <p className="text-[10px] text-slate-500 uppercase">Visitas Total</p>
                            <p className="text-lg font-bold text-white">{logs.length}</p>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                            <p className="text-[10px] text-slate-500 uppercase">Comisión Mes</p>
                            <p className="text-lg font-bold text-green-400">{formatCurrency(monthCommission)}</p>
                        </div>
                     </div>

                     <div className="flex justify-between items-center relative z-10 border-t border-slate-700/50 pt-3">
                       <span className="text-xs text-slate-500 flex items-center gap-1">Ver Historial <ChevronRight size={12}/></span>
                       <button 
                         onClick={(e) => { e.stopPropagation(); downloadQR(p.referralCode); }} 
                         className="p-2 bg-pink-600 text-white rounded-lg hover:bg-pink-500 transition-colors shadow-lg shadow-pink-900/20"
                         title="Ver QR"
                        >
                         <QrCode size={18}/>
                       </button>
                     </div>
                   </div>
                 );
               })}
               {filteredPartners.length === 0 && <div className="col-span-3 text-center py-10 text-slate-500 bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-700">No se encontraron hosts.</div>}
             </div>

             <Modal isOpen={showNewPartner} onClose={()=>setShowNewPartner(false)} title="Registrar Host Airbnb">
               <div className="space-y-3">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre del Host / Propiedad</label>
                    <input type="text" value={newPartnerName} onChange={e=>setNewPartnerName(e.target.value)} placeholder="Ej. Casa Azul Centro" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800"/>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Teléfono (con Clave País)</label>
                    <input type="tel" value={newPartnerPhone} onChange={e=>setNewPartnerPhone(e.target.value)} placeholder="Ej. +52 999 123 4567" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800"/>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Link Perfil Airbnb</label>
                    <input type="url" value={newPartnerLink} onChange={e=>setNewPartnerLink(e.target.value)} placeholder="https://airbnb.com/..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800"/>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Foto del Hospedaje (URL)</label>
                    <input type="url" value={newPartnerImg} onChange={e=>setNewPartnerImg(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800"/>
                 </div>
               </div>
               <Button onClick={createPartner} className="w-full mt-6">Generar Código</Button>
             </Modal>

             {/* MODAL DETALLES DEL PARTNER */}
             <Modal isOpen={!!selectedPartner} onClose={() => setSelectedPartner(null)} title="Detalle del Host">
                {selectedPartner && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                             <div className="w-16 h-16 bg-gray-100 rounded-full overflow-hidden shrink-0 border border-gray-200">
                                 {selectedPartner.photoURL ? <img src={selectedPartner.photoURL} className="w-full h-full object-cover"/> : <Home className="w-8 h-8 m-4 text-gray-400"/>}
                             </div>
                             <div>
                                 <h4 className="font-bold text-xl text-gray-800">{selectedPartner.displayName}</h4>
                                 <p className="text-gray-500 text-sm font-mono">{selectedPartner.referralCode}</p>
                                 <div className="flex gap-2 mt-2">
                                     {selectedPartner.airbnbUrl && <a href={selectedPartner.airbnbUrl} target="_blank" className="text-xs text-pink-600 underline">Ver Airbnb</a>}
                                     {selectedPartner.phoneNumber && <a href={`https://wa.me/${selectedPartner.phoneNumber.replace(/\D/g,'')}`} target="_blank" className="text-xs text-green-600 underline">WhatsApp</a>}
                                 </div>
                             </div>
                        </div>

                        <div>
                            <h5 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><BarChart3 size={18}/> Comisiones por Mes</h5>
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-2">
                                {selectedPartnerStats && selectedPartnerStats.length > 0 ? selectedPartnerStats.map((stat, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div>
                                            <p className="font-bold text-gray-800">{getMonthName(stat.month)} {stat.year}</p>
                                            <p className="text-xs text-gray-500">{stat.visits} visitas</p>
                                        </div>
                                        <p className="font-bold text-green-600">{formatCurrency(stat.amount)}</p>
                                    </div>
                                )) : <p className="text-center text-gray-400 text-sm">No hay registros de actividad aún.</p>}
                            </div>
                        </div>

                        <Button onClick={() => setSelectedPartner(null)} variant="secondary" className="w-full">Cerrar</Button>
                    </div>
                )}
             </Modal>

             {/* MODAL QR REAL OFICIAL CON LOGO */}
             <Modal isOpen={!!viewingQR} onClose={() => setViewingQR(null)} title="Código QR Oficial">
                <div className="flex flex-col items-center justify-center p-4">
                    <p className="text-sm text-gray-500 mb-4 text-center">Escanea este código para asignar la venta a <span className="font-bold text-gray-800">{viewingQR}</span></p>
                    
                    <div className="bg-white p-4 rounded-xl border-2 border-slate-200 mb-6 shadow-inner relative">
                        {/* API QuickChart para QR con Logo */}
                        <img 
                            src={`https://quickchart.io/qr?text=${viewingQR}&centerImageUrl=${LOGO_URL}&size=300&ecLevel=H&margin=1&dark=0f172a&light=ffffff`} 
                            alt="QR Code" 
                            className="w-64 h-64 object-contain"
                        />
                    </div>
                    
                    <div className="w-full space-y-2">
                        <Button 
                            variant="primary" 
                            className="w-full"
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = `https://quickchart.io/qr?text=${viewingQR}&centerImageUrl=${LOGO_URL}&size=1000&ecLevel=H&margin=2`;
                                link.target = '_blank';
                                link.download = `QR-${viewingQR}.png`; 
                                link.click();
                            }}
                        >
                            <Download size={18} className="mr-2"/> Descargar para Imprimir
                        </Button>
                        <Button onClick={() => setViewingQR(null)} variant="ghost" className="w-full">Cerrar</Button>
                    </div>
                </div>
            </Modal>
          </div>
        )}

        {/* OTHER TABS */}
        {activeTab === 'influencers' && (
           <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold mb-6">Influencers (10%)</h3>
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                {userData.approvedInfluencers?.map((inf,i)=>(
                   <div key={i} className="p-4 border-b border-slate-700 flex justify-between items-center">
                     <span>{inf.name}</span>
                     <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Influencer</span>
                   </div>
                ))}
                {(!userData.approvedInfluencers || userData.approvedInfluencers.length===0) && <p className="p-6 text-center text-slate-500">Sin influencers.</p>}
              </div>
           </div>
        )}
        
        {activeTab === 'social' && (
          <div className="max-w-5xl mx-auto">
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-8">
               <h4 className="font-bold text-orange-400 mb-4 flex items-center gap-2">{isEditing ? <Edit size={20}/> : <Plus size={20}/>} {isEditing ? "Editar Misión" : "Crear Misión"}</h4>
               <div className="flex gap-4">
                 <input type="text" value={promoForm.title} onChange={e=>setPromoForm({...promoForm, title:e.target.value})} placeholder="Título" className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white"/>
                 <input type="number" value={promoForm.reward} onChange={e=>setPromoForm({...promoForm, reward:e.target.value})} placeholder="Pts" className="w-24 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white"/>
                 <Button onClick={handleSavePromo} size="sm">{isEditing ? "Guardar" : "Crear"}</Button>
               </div>
             </div>
             <h4 className="font-bold text-slate-300 mb-4">Validaciones Pendientes</h4>
             <div className="grid gap-4">
               {pendingReviews.map(task => (
                 <div key={task.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div><p className="font-bold text-sm">{task.influencerName}</p><a href={task.proof} target="_blank" className="text-xs text-blue-400 underline">Ver Evidencia</a></div>
                    <div className="flex gap-2"><Button size="sm" variant="danger" onClick={()=>handleRejectReview(task.id)} icon={XCircle}>X</Button><Button size="sm" variant="success" onClick={()=>handleApproveReview(task)} icon={Check}>OK</Button></div>
                 </div>
               ))}
               {pendingReviews.length===0 && <p className="text-slate-500 italic">Nada pendiente.</p>}
             </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="max-w-4xl mx-auto">
             <h3 className="text-2xl font-bold mb-6">Métricas Globales</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                   <p className="text-slate-400">Ingresos Totales</p>
                   <p className="text-3xl font-bold text-green-400">{formatCurrency(userData.stats?.revenue || 0)}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                   <p className="text-slate-400">Comisiones Totales</p>
                   <p className="text-3xl font-bold text-orange-400">{formatCurrency(userData.stats?.commissions || 0)}</p>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Subcomponentes auxiliares
const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${active ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <div className="flex items-center gap-3"><Icon size={20} /> <span>{label}</span></div>
    {badge > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{badge}</span>}
  </button>
);

// --- MAIN ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {} };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        onSnapshot(doc(db, 'artifacts', appId, 'users', u.uid), (s) => { setUserData(s.exists() ? s.data() : null); setLoading(false); });
      } else { setUserData(null); setLoading(false); }
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;
  if (!user || !userData) return <WelcomeScreen />;
  if (userData.role === 'owner') return <RestaurantPanel user={user} userData={userData} />;
  return <InfluencerDashboard user={user} userData={userData} />;
}
