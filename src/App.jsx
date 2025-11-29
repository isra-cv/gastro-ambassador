import React, { useState, useEffect } from 'react';
import { 
  User, QrCode, DollarSign, Star, Share2, 
  Wallet, Camera, MapPin, CheckCircle, 
  History, LogOut, Lock, Key, Store, 
  TrendingUp, Users, Plus, Trash2, LayoutDashboard,
  Instagram, Facebook, Video, Map, Globe, Link as LinkIcon,
  XCircle, Check, Search, AlertCircle, Edit, Save, List
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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'gastro-ambassador-v3';

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
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
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
      console.error(err);
      try {
        const result = await signInAnonymously(auth);
        await checkUserRecord(result.user);
      } catch (anonErr) { setError("Error de autenticación."); }
    } finally { setLoading(false); }
  };

  const checkUserRecord = async (user) => {
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const baseData = { uid: user.uid, email: user.email || null, createdAt: serverTimestamp() };
      const newCode = generateReferralCode(isRestaurantMode ? restaurantName : user.displayName);

      // Guardar mapeo público del código SIEMPRE (para que sea buscable)
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', newCode), { uid: user.uid });

      if (isRestaurantMode) {
        await setDoc(userRef, {
          ...baseData,
          displayName: restaurantName,
          referralCode: newCode, // Código para invitar influencers
          role: 'owner',
          stats: { revenue: 0, commissions: 0 },
          pendingInfluencers: [],
          approvedInfluencers: []
        });
        // Promo por defecto
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
          balance: 0,
          points: 0,
          myRestaurants: [] // Lista de IDs de restaurantes donde soy influencer
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
  const [activeTab, setActiveTab] = useState('missions');
  const [promotions, setPromotions] = useState([]);
  const [myRestaurants, setMyRestaurants] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [proofLink, setProofLink] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // 1. Cargar restaurantes donde soy miembro
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      if(data.myRestaurants && data.myRestaurants.length > 0) {
        // Cargar promos solo de mis restaurantes
        const qPromos = query(collection(db, 'artifacts', appId, 'promotions'), where('restaurantId', 'in', data.myRestaurants), where('active', '==', true));
        onSnapshot(qPromos, (snapP) => setPromotions(snapP.docs.map(d => ({ id: d.id, ...d.data() }))));
      } else {
        setPromotions([]);
      }
    });

    return () => unsubUser();
  }, [user]);

  const handleJoinRestaurant = async () => {
    if(!joinCode) return;
    const code = joinCode.toUpperCase();
    
    // 1. Intentar búsqueda rápida por mapa público (Lo ideal)
    const codeRef = doc(db, 'artifacts', appId, 'public', 'data', 'codes', code);
    const codeSnap = await getDoc(codeRef);
    
    let restId = null;

    if(codeSnap.exists()) {
      restId = codeSnap.data().uid;
    } else {
      // 2. Fallback: Buscar en colección users directamente (Para cuentas antiguas o mal registradas)
      try {
        const q = query(collection(db, 'artifacts', appId, 'users'), where('referralCode', '==', code), where('role', '==', 'owner'));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          restId = querySnapshot.docs[0].id;
        }
      } catch (e) {
        console.error("Error buscando restaurante:", e);
      }
    }
    
    if(restId) {
      // Enviar solicitud al ID encontrado
      await updateDoc(doc(db, 'artifacts', appId, 'users', restId), {
        pendingInfluencers: arrayUnion({ uid: user.uid, name: userData.displayName, email: userData.email })
      });
      alert("¡Solicitud enviada! Espera a que el restaurante te apruebe.");
      setJoinCode('');
    } else {
      alert("Código de restaurante no válido o no encontrado.");
    }
  };

  const submitProof = async () => {
    if(!proofLink) return;
    await addDoc(collection(db, 'artifacts', appId, 'tasks'), {
      influencerId: user.uid,
      influencerName: userData.displayName,
      restaurantId: selectedPromo.restaurantId,
      restaurantName: selectedPromo.restaurantName,
      promoTitle: selectedPromo.title,
      promoId: selectedPromo.id, // Guardamos ID para agrupar estadísticas
      reward: selectedPromo.reward,
      platform: selectedPromo.platform || 'other',
      proof: proofLink,
      status: 'pending_review',
      createdAt: serverTimestamp()
    });
    alert("¡Evidencia enviada! El restaurante validará tu misión.");
    setSelectedPromo(null); setProofLink('');
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'instagram': return <Instagram size={18} className="text-pink-600"/>;
      case 'facebook': return <Facebook size={18} className="text-blue-600"/>;
      case 'tiktok': return <Video size={18} className="text-black"/>;
      case 'google': return <Map size={18} className="text-red-500"/>;
      default: return <Globe size={18} className="text-gray-500"/>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Hola, {userData.displayName?.split(' ')[0]}</h2>
          <Button size="sm" variant="ghost" icon={LogOut} onClick={() => signOut(auth)} className="text-red-400">Salir</Button>
        </div>
        <div className="bg-orange-500 rounded-2xl p-5 text-white shadow-xl shadow-orange-200 flex justify-between items-center">
           <div>
             <p className="text-orange-100 text-xs mb-1">Tus Puntos</p>
             <div className="text-3xl font-bold">{userData.points || 0}</div>
           </div>
           <div className="text-right">
             <p className="text-orange-100 text-xs mb-1">Tu Saldo</p>
             <div className="text-xl font-bold">{formatCurrency(userData.balance || 0)}</div>
           </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Join Team Section */}
        {(!userData.myRestaurants || userData.myRestaurants.length === 0) && (
          <Card className="bg-blue-50 border-blue-100">
            <h3 className="font-bold text-blue-900 mb-2">Únete a un equipo</h3>
            <p className="text-sm text-blue-700 mb-4">Ingresa el código del restaurante para ver sus misiones.</p>
            <div className="flex gap-2">
              <input type="text" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="CÓDIGO (Ej. TACO9382)" className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-sm uppercase"/>
              <Button size="sm" onClick={handleJoinRestaurant}>Unirme</Button>
            </div>
          </Card>
        )}

        {/* Missions List */}
        <div>
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Star size={18} className="text-yellow-500"/> Misiones Activas</h3>
          <div className="space-y-3">
            {promotions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center italic">No tienes misiones. Únete a un restaurante arriba.</p>
            ) : (
              promotions.map(promo => (
                <div key={promo.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-50 p-2 rounded-xl">{getPlatformIcon(promo.platform)}</div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-800">{promo.title}</h4>
                      <p className="text-xs text-gray-400">{promo.restaurantName} • +{promo.reward} pts</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedPromo(promo)}>Completar</Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Submit Proof */}
        <Modal isOpen={!!selectedPromo} onClose={() => setSelectedPromo(null)} title="Enviar Evidencia">
          <p className="text-sm text-gray-600 mb-4">{selectedPromo?.description || "Completa la tarea y sube el link."}</p>
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 flex items-center gap-2 text-sm text-gray-500">
            {getPlatformIcon(selectedPromo?.platform)}
            <span>Misión de {selectedPromo?.platform}</span>
          </div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Enlace a la publicación / reseña</label>
          <input 
            type="url" 
            value={proofLink} 
            onChange={e=>setProofLink(e.target.value)} 
            placeholder="https://instagram.com/stories/..." 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 text-sm"
          />
          <Button className="w-full" onClick={submitProof}>Enviar para Revisión</Button>
        </Modal>
      </div>
    </div>
  );
};

// 3. RESTAURANT PANEL (ADMIN)
const RestaurantPanel = ({ user, userData }) => {
  const [activeTab, setActiveTab] = useState('social'); // 'terminal', 'social', 'influencers', 'metrics'
  
  // Data
  const [pendingReviews, setPendingReviews] = useState([]);
  const [myPromos, setMyPromos] = useState([]);
  const [allTasks, setAllTasks] = useState([]); // Para estadísticas
  
  // State for Create/Edit Promo
  const [promoForm, setPromoForm] = useState({ id: null, title: '', reward: '', platform: 'instagram' });
  const [isEditing, setIsEditing] = useState(false);
  
  // Terminal
  const [billAmount, setBillAmount] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [terminalMsg, setTerminalMsg] = useState(null);

  useEffect(() => {
    // 1. Cargar Tareas Pendientes (Review)
    const qPending = query(collection(db, 'artifacts', appId, 'tasks'), where('restaurantId', '==', user.uid), where('status', '==', 'pending_review'));
    const unsubPending = onSnapshot(qPending, (snap) => setPendingReviews(snap.docs.map(d => ({id:d.id, ...d.data()}))));

    // 2. Cargar TODAS las tareas para estadísticas
    const qAll = query(collection(db, 'artifacts', appId, 'tasks'), where('restaurantId', '==', user.uid));
    const unsubAll = onSnapshot(qAll, (snap) => setAllTasks(snap.docs.map(d => ({id:d.id, ...d.data()}))));

    // 3. Cargar Promos
    const qPromos = query(collection(db, 'artifacts', appId, 'promotions'), where('restaurantId', '==', user.uid));
    const unsubPromos = onSnapshot(qPromos, (snap) => setMyPromos(snap.docs.map(d => ({id:d.id, ...d.data()}))));

    return () => { unsubPending(); unsubAll(); unsubPromos(); };
  }, [user]);

  // --- ACTIONS ---

  const handleApproveReview = async (task) => {
    try {
      await runTransaction(db, async (t) => {
        const taskRef = doc(db, 'artifacts', appId, 'tasks', task.id);
        const userRef = doc(db, 'artifacts', appId, 'users', task.influencerId);
        const userSnap = await t.get(userRef);
        
        if(!userSnap.exists()) throw "Usuario no existe";
        
        t.update(taskRef, { status: 'approved' });
        t.update(userRef, { points: (userSnap.data().points || 0) + task.reward });
      });
      alert("Misión aprobada y puntos enviados.");
    } catch(e) { console.error(e); alert("Error al aprobar"); }
  };

  const handleRejectReview = async (id) => {
    if(confirm("¿Rechazar esta evidencia?")) {
      await updateDoc(doc(db, 'artifacts', appId, 'tasks', id), { status: 'rejected' });
    }
  };

  const handleAcceptInfluencer = async (influencer) => {
    const userRef = doc(db, 'artifacts', appId, 'users', user.uid);
    const infRef = doc(db, 'artifacts', appId, 'users', influencer.uid);
    await updateDoc(userRef, { pendingInfluencers: arrayRemove(influencer), approvedInfluencers: arrayUnion(influencer) });
    await updateDoc(infRef, { myRestaurants: arrayUnion(user.uid) });
    alert(`${influencer.name} ahora es parte del equipo.`);
  };

  const handleSavePromo = async () => {
    if(!promoForm.title || !promoForm.reward) return;
    
    if (promoForm.id) {
      // EDITAR
      await updateDoc(doc(db, 'artifacts', appId, 'promotions', promoForm.id), {
        title: promoForm.title,
        reward: parseInt(promoForm.reward),
        platform: promoForm.platform
      });
      alert("Misión actualizada.");
    } else {
      // CREAR
      await addDoc(collection(db, 'artifacts', appId, 'promotions'), {
        restaurantId: user.uid,
        restaurantName: userData.displayName,
        title: promoForm.title,
        reward: parseInt(promoForm.reward),
        platform: promoForm.platform,
        active: true,
        createdAt: serverTimestamp()
      });
      alert("Misión creada.");
    }
    setPromoForm({ id: null, title: '', reward: '', platform: 'instagram' });
    setIsEditing(false);
  };

  const handleDeletePromo = async (id) => {
    if(confirm("¿Seguro que quieres eliminar esta misión? Los historiales se mantendrán, pero nadie nuevo podrá hacerla.")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'promotions', id));
    }
  };

  const startEditPromo = (promo) => {
    setPromoForm({ id: promo.id, title: promo.title, reward: promo.reward, platform: promo.platform });
    setIsEditing(true);
    // Scroll to form (simple logic)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getMissionStats = (promoId) => {
    const completed = allTasks.filter(t => t.promoId === promoId && t.status === 'approved').length;
    return completed;
  };

  const processSale = async () => {
      if (!billAmount || !customerCode) return;
      try {
        const codeSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'codes', customerCode.toUpperCase()));
        if (!codeSnap.exists()) throw new Error("Código inválido");
        const refId = codeSnap.data().uid;
        const amount = parseFloat(billAmount);
        const comm = amount * 0.10;
        
        await runTransaction(db, async (t) => {
           const infRef = doc(db, 'artifacts', appId, 'users', refId);
           const infSnap = await t.get(infRef);
           const myRef = doc(db, 'artifacts', appId, 'users', user.uid);
           
           t.update(infRef, { balance: (infSnap.data().balance || 0) + comm });
           t.update(myRef, { 'stats.revenue': (userData.stats?.revenue || 0) + amount, 'stats.commissions': (userData.stats?.commissions || 0) + comm });
        });
        setTerminalMsg(`Venta: ${formatCurrency(amount)}. Comisión: ${formatCurrency(comm)}`);
        setBillAmount(''); setCustomerCode('');
      } catch(e) { alert(e.message); }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(userData.referralCode);
    alert(`Código de invitación copiado: ${userData.referralCode}`);
  };

  const getPlatformIcon = (platform) => {
    switch(platform) {
      case 'instagram': return <Instagram size={18} className="text-pink-500"/>;
      case 'facebook': return <Facebook size={18} className="text-blue-600"/>;
      case 'tiktok': return <Video size={18} className="text-black"/>;
      case 'google': return <Map size={18} className="text-red-500"/>;
      default: return <Globe size={18} className="text-gray-500"/>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="md:w-64 bg-slate-950 p-6 flex flex-col border-r border-slate-800">
        <h2 className="text-xl font-bold text-orange-500 mb-8 flex items-center gap-2"><Store /> Admin Panel</h2>
        <nav className="space-y-2 flex-1">
          <NavItem icon={LayoutDashboard} label="Terminal" active={activeTab==='terminal'} onClick={()=>setActiveTab('terminal')}/>
          <NavItem icon={Users} label="Influencers" active={activeTab==='influencers'} onClick={()=>setActiveTab('influencers')} badge={userData.pendingInfluencers?.length}/>
          <NavItem icon={Globe} label="Misiones & Reseñas" active={activeTab==='social'} onClick={()=>setActiveTab('social')} badge={pendingReviews.length}/>
          <NavItem icon={TrendingUp} label="Métricas" active={activeTab==='metrics'} onClick={()=>setActiveTab('metrics')}/>
        </nav>
        <div className="mt-8 pt-6 border-t border-slate-800">
           <div className="text-sm text-slate-500 mb-2 truncate">{userData.displayName}</div>
           <Button onClick={() => signOut(auth)} variant="ghost" className="w-full text-red-400 justify-start px-0" icon={LogOut}>Salir</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        
        {/* TAB: INFLUENCERS */}
        {activeTab === 'influencers' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-bold">Gestión de Equipo</h3>
               <Button onClick={copyInviteLink} icon={LinkIcon} variant="outline">Copiar Código de Invitación</Button>
             </div>

             {/* Pending Requests */}
             {userData.pendingInfluencers?.length > 0 && (
               <div className="mb-8">
                 <h4 className="font-bold text-yellow-500 mb-4 flex items-center gap-2"><AlertCircle size={18}/> Solicitudes Pendientes</h4>
                 <div className="grid gap-4">
                   {userData.pendingInfluencers.map((inf, i) => (
                     <div key={i} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                       <div><p className="font-bold">{inf.name}</p><p className="text-xs text-slate-400">{inf.email}</p></div>
                       <div className="flex gap-2"><Button size="sm" variant="success" onClick={()=>handleAcceptInfluencer(inf)} icon={Check}>Aceptar</Button></div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* Active List */}
             <h4 className="font-bold text-slate-300 mb-4">Mis Influencers Activos ({userData.approvedInfluencers?.length || 0})</h4>
             <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                {(!userData.approvedInfluencers || userData.approvedInfluencers.length === 0) ? (
                  <p className="p-8 text-center text-slate-500">Aún no tienes influencers. Comparte tu código: <span className="text-white font-mono">{userData.referralCode}</span></p>
                ) : (
                  userData.approvedInfluencers.map((inf, i) => (
                    <div key={i} className="p-4 border-b border-slate-700 last:border-0 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold">{inf.name[0]}</div>
                        <span>{inf.name}</span>
                      </div>
                      <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">Activo</span>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {/* TAB: SOCIAL & MISSIONS */}
        {activeTab === 'social' && (
          <div className="max-w-5xl mx-auto animate-fade-in space-y-12">
             
             {/* SECTION 1: CREATE / EDIT MISSION */}
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
               <h4 className="font-bold text-orange-400 mb-4 flex items-center gap-2">
                 {isEditing ? <Edit size={20}/> : <Plus size={20}/>} 
                 {isEditing ? "Editar Misión" : "Crear Nueva Misión"}
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                 <div className="md:col-span-2">
                   <label className="text-xs text-slate-400 mb-1 block">Título de la Misión</label>
                   <input type="text" value={promoForm.title} onChange={e=>setPromoForm({...promoForm, title:e.target.value})} placeholder="Ej. Selfie con Plato" className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white outline-none focus:border-orange-500"/>
                 </div>
                 <div>
                    <label className="text-xs text-slate-400 mb-1 block">Plataforma</label>
                    <select value={promoForm.platform} onChange={e=>setPromoForm({...promoForm, platform:e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white outline-none focus:border-orange-500">
                      <option value="instagram">Instagram</option>
                      <option value="google">Google Maps</option>
                      <option value="tiktok">TikTok</option>
                      <option value="facebook">Facebook</option>
                    </select>
                 </div>
                 <div className="flex gap-2">
                   <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Puntos</label>
                      <input type="number" value={promoForm.reward} onChange={e=>setPromoForm({...promoForm, reward:e.target.value})} placeholder="Pts" className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white outline-none focus:border-orange-500"/>
                   </div>
                   <div className="flex flex-col justify-end">
                      <Button onClick={handleSavePromo} size="sm" icon={isEditing ? Save : Plus}>{isEditing ? "Guardar" : "Crear"}</Button>
                   </div>
                   {isEditing && (
                     <div className="flex flex-col justify-end">
                       <Button onClick={() => {setIsEditing(false); setPromoForm({id:null, title:'', reward:'', platform:'instagram'});}} size="sm" variant="ghost" className="text-slate-400">Cancelar</Button>
                     </div>
                   )}
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               
               {/* SECTION 2: MY MISSIONS LIST */}
               <div>
                 <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><List size={20}/> Mis Misiones Activas</h3>
                 <div className="space-y-3">
                   {myPromos.length === 0 ? (
                     <p className="text-slate-500 italic">No tienes misiones configuradas.</p>
                   ) : (
                     myPromos.map(promo => (
                       <div key={promo.id} className={`p-4 rounded-xl border flex justify-between items-center group transition-all ${promoForm.id === promo.id ? 'bg-orange-500/10 border-orange-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                         <div className="flex items-center gap-3">
                           <div className="bg-slate-900 p-2 rounded-lg text-slate-300">{getPlatformIcon(promo.platform)}</div>
                           <div>
                             <p className="font-semibold text-white">{promo.title}</p>
                             <div className="flex items-center gap-2 text-xs text-slate-400">
                               <span>{promo.reward} pts</span>
                               <span className="text-slate-600">•</span>
                               <span className="text-green-400">{getMissionStats(promo.id)} realizadas</span>
                             </div>
                           </div>
                         </div>
                         <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => startEditPromo(promo)} className="p-2 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg"><Edit size={16}/></button>
                           <button onClick={() => handleDeletePromo(promo.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-700/50 hover:bg-slate-700 rounded-lg"><Trash2 size={16}/></button>
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               </div>

               {/* SECTION 3: PENDING VALIDATIONS */}
               <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle size={20} className={pendingReviews.length > 0 ? "text-yellow-500" : "text-slate-500"}/> 
                    Validaciones ({pendingReviews.length})
                  </h3>
                  
                  <div className="space-y-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {pendingReviews.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                        <CheckCircle size={40} className="mb-2 opacity-20"/>
                        <p>¡Todo al día! No hay tareas por revisar.</p>
                      </div>
                    ) : (
                      pendingReviews.map(task => (
                        <div key={task.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg relative">
                          <div className="absolute top-4 right-4 text-xs text-slate-500">{new Date(task.createdAt?.seconds * 1000).toLocaleDateString()}</div>
                          
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-xs">
                              {task.influencerName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{task.influencerName}</p>
                              <p className="text-xs text-slate-400">Completó: <span className="text-orange-400">{task.promoTitle}</span></p>
                            </div>
                          </div>

                          <a href={task.proof} target="_blank" rel="noreferrer" className="block w-full bg-slate-900/50 hover:bg-slate-900 border border-slate-600 rounded-lg p-3 mb-4 text-xs text-blue-400 hover:underline transition-colors flex items-center gap-2">
                            <LinkIcon size={14}/> {task.proof}
                          </a>

                          <div className="grid grid-cols-2 gap-3">
                            <Button size="sm" variant="danger" onClick={()=>handleRejectReview(task.id)} className="justify-center" icon={XCircle}>Rechazar</Button>
                            <Button size="sm" variant="success" onClick={()=>handleApproveReview(task)} className="justify-center" icon={Check}>Aprobar</Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>

             </div>
          </div>
        )}

        {/* TAB: METRICS */}
        {activeTab === 'metrics' && (
          <div className="max-w-4xl mx-auto animate-fade-in">
             <h3 className="text-2xl font-bold mb-6">Métricas de Rendimiento</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard label="Ingresos Totales (Influencers)" value={formatCurrency(userData.stats?.revenue || 0)} color="green" icon={DollarSign}/>
                <MetricCard label="Comisiones Pagadas" value={formatCurrency(userData.stats?.commissions || 0)} color="orange" icon={Wallet}/>
                <MetricCard label="ROI Estimado" value={userData.stats?.commissions > 0 ? ((userData.stats.revenue - userData.stats.commissions) / userData.stats.commissions).toFixed(1) + 'x' : '0x'} color="blue" icon={TrendingUp}/>
             </div>
             <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center">
               <h4 className="text-slate-400 mb-2">Impacto en Redes</h4>
               <p className="text-sm text-slate-500">Próximamente verás gráficas de alcance en Instagram y Google Maps aquí.</p>
             </div>
          </div>
        )}
        
        {/* TAB: TERMINAL */}
        {activeTab === 'terminal' && (
           <div className="max-w-md mx-auto mt-10 bg-slate-800 p-8 rounded-3xl border border-slate-700">
              <h3 className="text-xl font-bold mb-6">Terminal de Caja</h3>
              <div className="space-y-4">
                <input type="number" value={billAmount} onChange={e=>setBillAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-xl" placeholder="Monto $"/>
                <input type="text" value={customerCode} onChange={e=>setCustomerCode(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-xl uppercase" placeholder="CÓDIGO"/>
                {terminalMsg && <p className="text-green-400 text-sm text-center bg-green-400/10 p-2 rounded">{terminalMsg}</p>}
                <Button onClick={processSale} className="w-full">Registrar Venta</Button>
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

const MetricCard = ({ label, value, color, icon: Icon }) => {
  const colors = { green: 'text-green-400 bg-green-500/10', orange: 'text-orange-400 bg-orange-500/10', blue: 'text-blue-400 bg-blue-500/10' };
  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${colors[color]}`}><Icon size={20}/></div>
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
};

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
