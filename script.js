        // 2. CONFIGURACIÓN FIREBASE (CLÁSICA)
        const firebaseConfig = {
            apiKey: "AIzaSyBFwzQUXNkix4u0J9asPte8OvVQph_FfPY",
            authDomain: "betfriends-81bcc.firebaseapp.com",
            projectId: "betfriends-81bcc",
            storageBucket: "betfriends-81bcc.firebasestorage.app",
            messagingSenderId: "618594781062",
            appId: "1:618594781062:web:f29996182529ad9bc04e07"
        };

        // Iniciamos Firebase
        try {
            firebase.initializeApp(firebaseConfig);
            console.log("🔥 Firebase Clásico Iniciado");
        } catch (e) {
            console.error("Error iniciando Firebase:", e);
        }

const auth = firebase.auth();
        const db = firebase.firestore();

        const app = {
            data: { user: null, leagues: [], currentLeagueId: null, filter: 'active', inviteMode: 'public', selectedInvites: [], tempAvatar: null, accounts: {}, editingUser: null },
            pendingCallback: null,
            authMode: 'login',

// 1. FUNCIÓN PARA ESCUCHAR CAMBIOS (SUSTITUYE A LEER LOCALSTORAGE)
            initRealtimeLeagues() {
                // Escuchamos la colección 'leagues' en tiempo real
                db.collection('leagues').onSnapshot((snapshot) => {
                    const cloudLeagues = [];
                    snapshot.forEach((doc) => {
                        cloudLeagues.push(doc.data());
                    });
                    // Actualizamos tus datos locales con los de la nube
                    this.data.leagues = cloudLeagues;
                    
                    // Si tienes una liga abierta, refrescamos la pantalla
                    if(this.data.currentLeagueId) this.renderDashboard();
                    // Si estás en la lista de ligas, refrescamos la lista
                    if(!document.getElementById('view-leagues').classList.contains('hidden')) this.renderLeaguesList();
                    
                    this.checkAndNotify();
                    this.checkDeepLinks(); 
                });
            },

            // 2. FUNCIÓN PARA GUARDAR (SUSTITUYE A THIS.SAVE)
            saveLeagueToCloud(league) {
// --- BLOQUE DE LIMPIEZA AUTOMÁTICA (MANTENIMIENTO) ---
            // Mantenemos TODAS las apuestas activas (pending/open)
            // Y limitamos las terminadas (resolved) a las últimas 500.
            // CAMBIO AQUÍ: Usamos 'league' en vez de 'l'
            if (league.bets && league.bets.length > 600) { 
                const activeBets = league.bets.filter(b => b.status !== 'resolved');
                const resolvedBets = league.bets.filter(b => b.status === 'resolved');
                
                // Si hay más de 500 resueltas antiguas, borramos las viejas
                if (resolvedBets.length > 500) {
                    const keepResolved = resolvedBets.slice(0, 500);
                    
                    // Reconstruimos la lista
                    league.bets = [...activeBets, ...keepResolved];
                }
            }

                // Guardamos la liga específica en Firebase
                // Usamos JSON.parse/stringify para limpiar datos raros antes de subir
                const cleanLeague = JSON.parse(JSON.stringify(league));
                db.collection('leagues').doc(String(league.id)).set(cleanLeague)
                .catch((e) => this.toast("Error guardando: " + e.message, "error"));
            },

            // INICIO
            init() {
this.notifiedIds = [];
this.appStartTime = Date.now();
                // Escuchamos si hay usuario logueado en Firebase
                firebase.auth().onAuthStateChanged((user) => {
                    if (user) {
                        console.log("Usuario detectado:", user.email);
                        // Cargar perfil desde Firestore
                        const db = firebase.firestore();
                        db.collection("users").doc(user.uid).get().then((doc) => {
                            if (doc.exists) {
                                // Usuario existente
                                const data = doc.data();
                                this.performLogin(data.nickname);
                            } else {
                                // Si por algo no tiene documento, usar la parte del email
                                this.performLogin(user.email.split('@')[0]);
                            }
                        }).catch((error) => {
                            console.error("Error recuperando perfil:", error);
                            this.performLogin(user.email.split('@')[0]);
                        });
                    } else {
                        console.log("No hay usuario activo.");
                        document.getElementById('view-login').classList.remove('hidden');
                        document.getElementById('view-login').classList.add('flex');
                    }
                });
            },

            // --- AUTHENTICATION (CONECTADO A FIREBASE) ---
            async submitAuth() {
                const emailInput = document.getElementById('auth-user').value.trim(); 
                const pass = document.getElementById('auth-pass').value.trim();

                if (!emailInput || !pass) {
                    this.toast("Faltan datos", "error");
                    return;
                }

                // Truco del email falso
                let finalEmail = emailInput;
                if (!emailInput.includes('@')) {
                    finalEmail = emailInput + "@betfriends.com"; 
                }

                this.toast("Conectando...", "info");
                const auth = firebase.auth();
                const db = firebase.firestore();

                try {
                    let userCredential;

                    if (this.authMode === 'register') {
                        // REGISTRO
                        userCredential = await auth.createUserWithEmailAndPassword(finalEmail, pass);
                        
                        // Guardar en base de datos
                        await db.collection("users").doc(userCredential.user.uid).set({
                            nickname: emailInput.split('@')[0],
                            balance: 1000,
                            createdAt: new Date()
                        });

                        this.toast("¡Cuenta creada! Entrando...");
                    } else {
                        // LOGIN
                        userCredential = await auth.signInWithEmailAndPassword(finalEmail, pass);
                        this.toast("Sesión iniciada");
                    }
                    // La redirección la hace onAuthStateChanged automáticamente

                } catch (error) {
                    console.error("Error Firebase:", error);
                    let msg = error.message;
                    if (error.code === 'auth/wrong-password') msg = "Contraseña incorrecta";
                    if (error.code === 'auth/user-not-found') msg = "Usuario no encontrado";
                    if (error.code === 'auth/email-already-in-use') msg = "Ese usuario ya existe";
                    if (error.code === 'auth/weak-password') msg = "Contraseña muy corta (min 6)";
                    this.toast(msg, "error");
                }
            },

            performLogin(u) {
                this.data.user = u;
                document.getElementById('view-login').classList.remove('flex');
                document.getElementById('view-login').classList.add('hidden');
                document.getElementById('auth-user').value = '';
                document.getElementById('auth-pass').value = '';
                this.showLeaguesView();
                // Aquí cargaríamos las ligas de Firestore si quisieras persistencia total
                // De momento usamos el localStorage para las ligas como tenías
                this.initRealtimeLeagues();
                this.checkAndNotify();
            },
            
            logout() { 
                firebase.auth().signOut().then(() => {
                    this.data.user=null; 
                    this.data.currentLeagueId=null; 
                    document.querySelectorAll('.app-view').forEach(e=>e.classList.add('hidden')); 
                    document.getElementById('view-login').classList.remove('hidden'); 
                    document.getElementById('view-login').classList.add('flex');
                    this.toast("Sesión cerrada");
                });
            },

            // --- PERSISTENCIA LOCAL PARA LIGAS (TEMPORAL) ---
            loadLocalData() {
                const d = localStorage.getItem('betfriends_v2_data');
                if (d) {
                    try {
                        const p = JSON.parse(d);
                        this.data.leagues = p.leagues || [];
                        // Asegurar compatibilidad
                        this.data.leagues.forEach(l => { 
                            Object.keys(l.members).forEach(k => { 
                                if(typeof l.members[k]==='number') l.members[k]={balance:l.members[k],nickname:k,avatar:null}; 
                            }); 
                        });
                    } catch (e) {}
                }
                // Si ya teníamos ligas, renderizamos
                if(this.data.currentLeagueId) this.renderDashboard(); else this.renderLeaguesList();
            },
            save() { localStorage.setItem('betfriends_v2_data', JSON.stringify({ leagues: this.data.leagues })); },

            // --- RESTO DE FUNCIONES (UI, BETS, ETC) ---
            copyCode() {
                const text = document.getElementById('dash-league-code').innerText;
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed"; textArea.style.left = "-9999px"; textArea.style.top = "0";
                document.body.appendChild(textArea); textArea.focus(); textArea.select();
                try { const ok = document.execCommand('copy'); if(ok) this.toast("Código copiado"); else this.toast("Error al copiar", "error"); } catch (err) { this.toast("Copia manualmente", "error"); }
                document.body.removeChild(textArea);
            },
            isUserWinner(b, user) { if(b.status !== 'resolved') return false; if(b.type === 'bank') { const r = b.selections ? b.selections[user] : null; return r && r.option === b.winningOption; } if(b.type === 'custom') { return b.selections && b.selections[user] === b.winningOption; } return b.winner === user; },
            getNotificationStats(l) { if(!l) return {pending:0, wins:0, losses:0, listPending:[], listWins:[], listLosses:[], listAdmin:[], newPending:0, adminUpdates:0}; const me = this.data.user; const lastCheck = l.members[me]?.lastViewedNotifications || 0; const listPending = l.bets.filter(b => { if (b.status !== 'active') return false; if (b.creator === me) return false; if (b.participants.includes(me)) return false; if (b.type === 'duel') return b.invites && b.invites.includes(me); if (b.invites && b.invites.includes(me)) return true; if (!b.invites || b.invites.length === 0) return true; return false; }); const newPending = listPending.filter(b => b.id > lastCheck).length; const listWins = l.bets.filter(b => { if (b.status !== 'resolved') return false; if (b.resolvedAt && b.resolvedAt <= lastCheck) return false; return this.isUserWinner(b, me); }); const listLosses = l.bets.filter(b => { if (b.status !== 'resolved') return false; if (b.resolvedAt && b.resolvedAt <= lastCheck) return false; if (b.type === 'admin') return false; const participated = b.participants.includes(me); if (!participated) return false; const isWinner = this.isUserWinner(b, me); const isRefund = b.winner === "Nadie (Devuelto)"; return !isWinner && !isRefund; }); const listAdmin = l.bets.filter(b => { if (b.status !== 'resolved') return false; if (b.type !== 'admin') return false; if (!b.participants.includes(me)) return false; if (b.resolvedAt && b.resolvedAt <= lastCheck) return false; return true; }); return { pending: listPending.length, newPending: newPending, wins: listWins.length, losses: listLosses.length, adminUpdates: listAdmin.length, listPending, listWins, listLosses, listAdmin }; },
            showNativeToast(t) { const el=document.getElementById('native-notification'); document.getElementById('native-notification-text').innerText=t; el.classList.add('show'); if(navigator.vibrate) navigator.vibrate(200); setTimeout(()=>el.classList.remove('show'),5000); },
            handleNotificationClick() { document.getElementById('native-notification').classList.remove('show'); this.openNotificationsModal(); },
            checkAndNotify() {
                if(!this.data.user) return;
                const me = this.data.user;

                if (!this.notifiedIds) this.notifiedIds = [];
                if (!this.appStartTime) {
                    this.appStartTime = Date.now();
                    return;
                }

                let tWins = 0, tLosses = 0, tAdmin = 0;
                let lastWonTitle = "";
                let lastLostTitle = "";

                this.data.leagues.forEach(l => {
                    if(l.members[me]) {
                        const stats = this.getNotificationStats(l);
                        
                        // --- DETECTAR AJUSTES DE ADMIN ---
stats.listAdmin.forEach(adj => {
    // CORRECCIÓN 1: Usamos adj.id para que el identificador sea único y exacto
    const adjId = 'adj-' + adj.id; 
    
    // CORRECCIÓN 2: Usamos adj.resolvedAt (que es número) en vez de adj.timestamp (que es texto)
    // para comparar correctamente con this.appStartTime
    if (adj.resolvedAt > this.appStartTime && !this.notifiedIds.includes(adjId)) {
        this.notifiedIds.push(adjId);
        tAdmin++;
        // LANZAMOS EL BANNER AL INSTANTE
        this.showNativeToast(`El administrador ha ajustado tu saldo ⚖️`);
    }
});

                        // --- DETECTAR VICTORIAS ---
                        stats.listWins.forEach(b => {
                            if (b.resolvedAt > this.appStartTime && !this.notifiedIds.includes(b.id)) {
                                tWins++;
                                lastWonTitle = b.title;
                                this.notifiedIds.push(b.id);
                            }
                        });

                        // --- DETECTAR DERROTAS ---
                        stats.listLosses.forEach(b => {
                            if (b.resolvedAt > this.appStartTime && !this.notifiedIds.includes(b.id)) {
                                tLosses++;
                                lastLostTitle = b.title;
                                this.notifiedIds.push(b.id);
                            }
                        });
                    }
                });

                // Notificaciones de apuestas (solo si no hubo admin para no solapar banners)
                if (tAdmin === 0) {
                    if (tWins > 0) {
                        const m = tWins === 1 ? `¡Has ganado en "${lastWonTitle}"!` : `¡Has ganado ${tWins} apuestas!`;
                        this.showNativeToast(m + " 🏆");
                    } else if (tLosses > 0) {
                        const m = tLosses === 1 ? `Has perdido en "${lastLostTitle}".` : `Has perdido ${tLosses} apuestas.`;
                        this.showNativeToast(m + " 😢");
                    }
                }
            },
            openNotificationsModal() { const l=this.getCurrentLeague(); const lst=document.getElementById('notifications-list'); lst.innerHTML=''; const stats = this.getNotificationStats(l); if (stats.listAdmin.length > 0) { lst.innerHTML += `<div class="text-[10px] text-slate-400 uppercase font-bold mb-2 ml-1">Ajustes de Comisionado</div>`; stats.listAdmin.forEach(b => { const d=document.createElement('div'); d.className="bg-slate-800 p-3 rounded-lg border-l-4 border-slate-500 flex justify-between items-center cursor-pointer hover:bg-slate-700 mb-2"; d.innerHTML=`<div><p class="text-slate-300 text-xs font-bold"><i class="fa-solid fa-scale-balanced mr-1"></i> Ajuste Saldo</p><p class="text-[10px] text-white">${b.winningOption}</p></div><div class="bg-slate-700 text-slate-400 w-8 h-8 rounded-full flex items-center justify-center text-xs"><i class="fa-solid fa-check"></i></div>`; d.onclick=()=>{ this.closeModals(); this.filterBets('resolved'); }; lst.appendChild(d); }); } if (stats.listWins.length > 0) { lst.innerHTML += `<div class="text-[10px] text-gold uppercase font-bold mb-2 ml-1 mt-4">Victorias Recientes</div>`; stats.listWins.forEach(b => { const d=document.createElement('div'); d.className="bg-slate-800 p-3 rounded-lg border-l-4 border-gold flex justify-between items-center cursor-pointer hover:bg-slate-700 mb-2"; d.innerHTML=`<div><p class="text-gold text-xs font-bold"><i class="fa-solid fa-trophy mr-1"></i> ¡Ganaste!</p><p class="text-[10px] text-white">${b.title}</p></div><div class="bg-gold/10 text-gold w-8 h-8 rounded-full flex items-center justify-center text-xs"><i class="fa-solid fa-eye"></i></div>`; d.onclick=()=>{ this.closeModals(); this.filterBets('resolved'); }; lst.appendChild(d); }); } if (stats.listLosses.length > 0) { lst.innerHTML += `<div class="text-[10px] text-danger uppercase font-bold mb-2 ml-1 mt-4">Derrotas Recientes</div>`; stats.listLosses.forEach(b => { const d=document.createElement('div'); d.className="bg-slate-800 p-3 rounded-lg border-l-4 border-danger flex justify-between items-center cursor-pointer hover:bg-slate-700 mb-2"; d.innerHTML=`<div><p class="text-danger text-xs font-bold"><i class="fa-solid fa-heart-crack mr-1"></i> Perdiste</p><p class="text-[10px] text-white">${b.title}</p></div><div class="bg-danger/10 text-danger w-8 h-8 rounded-full flex items-center justify-center text-xs"><i class="fa-solid fa-eye"></i></div>`; d.onclick=()=>{ this.closeModals(); this.filterBets('resolved'); }; lst.appendChild(d); }); } if (stats.listPending.length > 0) { lst.innerHTML += `<div class="text-[10px] text-slate-400 uppercase font-bold mb-2 ml-1 mt-4">Invitaciones / Pendientes</div>`; stats.listPending.forEach(b => { const c=this.getMember(l,b.creator).nickname; const d=document.createElement('div'); d.className="bg-slate-800 p-3 rounded-lg border-l-4 border-neonPurple flex justify-between items-center cursor-pointer hover:bg-slate-700 mb-2"; d.innerHTML=`<div><p class="text-white text-xs font-bold">${b.title}</p><p class="text-[10px] text-slate-400">De ${c} • ${b.amount} fichas</p></div><div class="bg-neonPurple/20 text-neonPurple w-8 h-8 rounded-full flex items-center justify-center text-xs"><i class="fa-solid fa-chevron-right"></i></div>`; d.onclick=()=>{ this.closeModals(); this.filterBets('pending'); setTimeout(()=>this.joinBetModal(b.id),300); }; lst.appendChild(d); }); } if (stats.listPending.length === 0 && stats.listWins.length === 0 && stats.listLosses.length === 0 && stats.listAdmin.length === 0) { lst.innerHTML=`<div class="text-center text-slate-500 py-8"><i class="fa-regular fa-bell-slash text-3xl mb-2 opacity-50"></i><p class="text-xs">Sin notificaciones nuevas</p></div>`; } l.members[this.data.user].lastViewedNotifications = Date.now(); this.saveLeagueToCloud(l); this.renderDashboard(); this.openModal('notifications'); },
            getMember(l,u) { if(!l.members[u]) return {balance:0,nickname:u,avatar:null}; return (typeof l.members[u]==='number')?{balance:l.members[u],nickname:u,avatar:null}:l.members[u]; },
            getAvatarHtml(m,s='sm') { return m.avatar?`<img src="${m.avatar}" class="avatar-circle avatar-${s} border-neonPurple" alt="${m.nickname}">`:`<div class="avatar-circle avatar-${s} bg-slate-700 text-slate-400">${m.nickname.substring(0,2).toUpperCase()}</div>`; },
            openFullscreenImage(src) { if(!src) return; document.getElementById('fullscreen-image-src').src=src; document.getElementById('modal-fullscreen-image').classList.remove('hidden'); },
            closeFullscreenImage() { document.getElementById('modal-fullscreen-image').classList.add('hidden'); },
          viewProfile(u) {
                const l = this.getCurrentLeague();
                const m = this.getMember(l, u);
                const me = this.data.user;
                const base = l.startBalance || 1000;

                // 1. Avatar y Datos Básicos
                const ac = document.getElementById('view-profile-avatar');
                ac.innerHTML = m.avatar ? `<img src="${m.avatar}" class="w-full h-full object-cover"><div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-magnifying-glass-plus text-white text-3xl"></i></div>` : `<i class="fa-solid fa-user text-4xl"></i>`;
                ac.classList[m.avatar ? 'add' : 'remove']('cursor-pointer');
                ac.onclick = m.avatar ? () => this.openFullscreenImage(m.avatar) : null;
                
                // Icono de Factura para la Deuda 🧾
                const debtHtml = (m.debt && m.debt > 0) ? ` <span class="text-danger text-sm animate-pulse font-bold" title="Deuda pendiente: ${m.debt}"><i class="fa-solid fa-file-invoice-dollar"></i> -${m.debt}</span>` : '';
                
                document.getElementById('view-profile-name').innerHTML = m.nickname + debtHtml;
                document.getElementById('view-profile-balance').innerText = m.balance;
                
                // --- (BLOQUE ELIMINADO: AQUÍ ESTABA EL BOTÓN DE PRÉSTAMO QUE NO QUERÍAS) ---

                // 2. CÁLCULOS: Estadísticas Generales
                let totalWins = 0, totalPlayed = 0;
                
                const userBets = l.bets.filter(b => b.status === 'resolved' && b.type !== 'admin' && b.participants.includes(u));
                userBets.sort((a, b) => a.id - b.id); 

                let maxStreak = 0;
                let currentStreak = 0;

                userBets.forEach(b => {
                    totalPlayed++;
                    if (this.isUserWinner(b, u)) {
                        totalWins++;
                        currentStreak++;
                    } else {
                        if (currentStreak > maxStreak) maxStreak = currentStreak;
                        currentStreak = 0;
                    }
                });
                if (currentStreak > maxStreak) maxStreak = currentStreak;

                document.getElementById('view-profile-wins').innerText = totalWins;
                document.getElementById('view-profile-played').innerText = totalPlayed;
                document.getElementById('view-profile-streak').innerText = maxStreak;

                // 3. CÁLCULO: CARA A CARA (VS)
                const vsSection = document.getElementById('dynamic-vs-section');
                
                if (u !== me && vsSection) {
                    vsSection.className = 'mb-2 col-span-2 w-full';

                    let myWinsVsHim = 0;
                    let hisWinsVsMe = 0;

                    const commonBets = l.bets.filter(b => 
                        b.status === 'resolved' && 
                        b.type !== 'admin' && 
                        b.type !== 'bank' && 
                        b.participants.includes(u) && 
                        b.participants.includes(me)
                    );

                    commonBets.forEach(b => {
                        const iWon = this.isUserWinner(b, me);
                        const heWon = this.isUserWinner(b, u);
                        if (iWon && !heWon) myWinsVsHim++; 
                        if (heWon && !iWon) hisWinsVsMe++; 
                    });

                    if (commonBets.length === 0) {
                        vsSection.classList.add('hidden');
                    } else {
                        const totalDuels = myWinsVsHim + hisWinsVsMe;
                        const myPct = totalDuels === 0 ? 50 : (myWinsVsHim / totalDuels) * 100;
                        const hisPct = 100 - myPct;

                        const htmlVS = `
                            <div class="mt-2 bg-slate-800 p-3 rounded-xl border border-slate-700 w-full">
                                <div class="grid grid-cols-3 items-end mb-2">
                                    <div class="text-left">
                                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Tú</span>
                                        <span class="text-2xl font-bold text-neonGreen">${myWinsVsHim}</span>
                                    </div>
                                    <div class="text-center pb-1">
                                        <span class="text-xs font-black text-slate-600 bg-slate-900 px-2 py-1 rounded">VS</span>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-[10px] uppercase font-bold text-slate-400 block">${m.nickname}</span>
                                        <span class="text-2xl font-bold text-danger">${hisWinsVsMe}</span>
                                    </div>
                                </div>
                                <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex">
                                    <div style="width: ${myPct}%" class="h-full bg-neonGreen transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    <div style="width: ${hisPct}%" class="h-full bg-danger transition-all duration-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                                </div>
                                <p class="text-[9px] text-center text-slate-500 mt-2 font-bold uppercase tracking-wider">Enfrentamientos directos</p>
                            </div>
                        `;
                        
                        vsSection.innerHTML = htmlVS;
                        vsSection.classList.remove('hidden');
                    }

                } else if (vsSection) {
                    vsSection.classList.add('hidden');
                }

                // 4. GENERAR GRÁFICA
                this.renderBalanceChart(m);

                this.openModal('view-profile');
            },
// --- NUEVA FUNCIÓN: RESCATE DE EMERGENCIA ---
            requestBailout() {
                const l = this.getCurrentLeague();
                const m = this.getMember(l, this.data.user);
                const base = l.startBalance || 1000;
                
                // --- 1. VALIDACIONES PREVIAS ---
                // Calculamos límites
                const maxTotalDebt = Math.floor(base * 0.50); // Límite Préstamo Normal (500)
                const currentDebt = m.debt || 0;
                const availableToBorrow = maxTotalDebt - currentDebt; // Hueco préstamo normal

                // Si aún tiene hueco en el préstamo NORMAL (>10), le mandamos allí
                if (availableToBorrow > 10) {
                     this.toast(`Aún tienes crédito (${availableToBorrow}). Pide un préstamo normal.`, "error");
                     return;
                }

                // Si tiene dinero en el bolsillo, no puede pedir rescate
                if (m.balance > 10) return this.toast("Aún tienes fichas, no puedes pedir rescate.", "error");

                // --- 2. LÓGICA DEL "GRIFO" Y EL LÍMITE ABSOLUTO ---
                
                const maxAbsoluteDebt = base * 2; // El límite del 200% (2000 fichas)
                const standardBailout = Math.floor(base * 0.15); // Lo que suele dar el rescate (150)
                
                // Calculamos cuánto espacio EXACTO queda hasta el límite absoluto
                const gapToLimit = maxAbsoluteDebt - currentDebt;

                // CASO A: Ya no cabe nada (Estás en 2000 o más)
                if (gapToLimit <= 0) {
                    // AQUÍ ABRIMOS EL NUEVO MODAL "CUTRE-FREE"
                    document.getElementById('modal-bankruptcy').classList.remove('hidden');
                    return;
                }

                // CASO B: Cabe algo, pero hay que decidir cuánto dar
                // Si el hueco (50) es menor que el rescate estándar (150), damos el hueco.
                // Si el hueco es enorme, damos el estándar.
                let amountToGive = 0;
                
                if (gapToLimit < standardBailout) {
                    amountToGive = gapToLimit; // Te doy lo justo para llegar al tope
                } else {
                    amountToGive = standardBailout; // Te doy el rescate normal
                }

                // --- 3. EJECUCIÓN ---
                m.balance += amountToGive;
                m.debt = (m.debt || 0) + amountToGive; 
                m.isGarnished = true; // Activar embargo

                if (!m.transactions) m.transactions = [];
                m.transactions.unshift({
                    type: 'loan', 
                    amount: amountToGive,
                    desc: `Rescate (Embargo) 🆘`,
                    date: new Date().toLocaleString(),
                    timestamp: Date.now()
                });

                this.saveLeagueToCloud(l);
                this.renderDashboard();
                this.showHistory(); 
                
                if (amountToGive < standardBailout) {
                    this.toast(`Solo se te han concedido ${amountToGive} hasta alcanzar el límite máximo.`);
                } else {
                    this.toast(`Rescate de ${amountToGive} activado. Retención del 70% aplicada.`);
                }
            },

            // --- NUEVA FUNCIÓN: ABRE LA VENTANA DE PRÉSTAMO ---
            openLoanModal() {
                const l = this.getCurrentLeague();
                const me = this.data.user;
                const base = l.startBalance || 1000;
                
                // --- LÓGICA DE CRÉDITO ---
                const maxPrincipal = Math.floor(base * 0.50); // Límite de Capital (ej: 500)
                const currentDebt = l.members[me].debt || 0;  // Deuda Total (con intereses)
                
                // TRUCO MATEMÁTICO: Convertimos la deuda total a "capital pedido"
                // Si debes 240, es que pediste 200 (240 / 1.2 = 200)
                const usedPrincipal = currentDebt / 1.2; 
                
                // El disponible es el Límite (500) menos lo que ya has pedido (200) = 300
                const availableToBorrow = Math.floor(maxPrincipal - usedPrincipal);

                // Validación de seguridad
                if (availableToBorrow <= 0) {
                    this.toast("Has alcanzado tu límite de crédito.", "error");
                    return;
                }

                // Referencias al HTML
                const modal = document.getElementById('modal-loan');
                const maxDisplay = document.getElementById('loan-max-display');
                const input = document.getElementById('loan-amount-input');
                const repayDisplay = document.getElementById('loan-repay-display');
                const confirmBtn = document.getElementById('confirm-loan-btn');

                // Resetear valores
                input.value = '';
                repayDisplay.innerText = "A devolver: 0 (+20%)";
                
                // Mostramos el disponible corregido
                maxDisplay.innerText = availableToBorrow;

                // Evento: Calcular en tiempo real mientras escribes
                input.oninput = () => {
                    let val = parseInt(input.value);
                    if (isNaN(val)) val = 0;
                    
                    if (val > availableToBorrow) {
                        val = availableToBorrow;
                        input.value = val; 
                        this.toast("No puedes superar tu límite restante", "info");
                    }
                    
                    const debt = Math.floor(val * 1.20);
                    repayDisplay.innerText = `A devolver: ${debt} (+20%)`;
                };

                // Evento: Click en Confirmar
                confirmBtn.onclick = () => {
                    const amount = parseInt(input.value);
                    
                    if (isNaN(amount) || amount <= 0) {
                        this.toast("Introduce una cantidad válida", "error");
                        return;
                    }

                    if (amount > availableToBorrow) {
                        this.toast("Supera el límite permitido", "error");
                        return;
                    }

                    const debtAmount = Math.floor(amount * 1.20);

                    // EJECUTAR EL PRÉSTAMO
                    l.members[me].balance += amount;
                    
                    // Sumamos a la deuda existente
                    l.members[me].debt = (l.members[me].debt || 0) + debtAmount;
                    
                    this.addTransaction(l, me, 'loan', amount, `Préstamo Mafia Solicitado 🦈`);
                    this.saveLeagueToCloud(l);
                    
                    modal.classList.add('hidden'); // Cerrar modal
                    this.renderDashboard(); // Actualizar todo
                    this.toast(`Recibido: ${amount}. Deuda Total: ${l.members[me].debt}`);
                };

                // Mostrar Modal
                modal.classList.remove('hidden');
            },
            // --- FUNCIÓN DE GRÁFICA ---
            // --- FUNCIÓN DE GRÁFICA CORREGIDA ---
            // --- FUNCIÓN DE GRÁFICA BLINDADA ---
            // --- FUNCIÓN DE GRÁFICA INTELIGENTE (Anti-Admin Bruto) ---
            renderBalanceChart(member) {
                const ctx = document.getElementById('balanceChart').getContext('2d');
                if (this.chartInstance) this.chartInstance.destroy();

                let currentBal = member.balance; 
                
                // Empezamos por el final (Ahora)
                let history = [currentBal];
                let labels = ['Actual'];

                const txs = member.transactions || [];
                
                // 1. Ordenamos por fecha (Lo más nuevo primero)
                const sortedTxs = [...txs]
                    .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0))
                    .slice(0, 30);

                // 2. Rebobinamos hacia el pasado
                sortedTxs.forEach(t => {
                    let effectiveAmount = 0;
                    
                    // A) Gastos (Siempre negativos)
                    if (t.type === 'bet' || t.type === 'debt_pay' || t.type === 'loss') {
                        effectiveAmount = -Math.abs(t.amount);
                    }
                    // B) Ingresos (Siempre positivos)
                    else if (t.type === 'win' || t.type === 'bonus' || t.type === 'refund' || t.type === 'loan') {
                        effectiveAmount = Math.abs(t.amount);
                    }
                    // C) Admin: Aquí está el truco
                    else if (t.type === 'admin') {
                        effectiveAmount = t.amount;
                    }

                    // Calculamos el saldo anterior
                    let prevBal = currentBal - effectiveAmount;

                    // --- CORRECCIÓN DE "ZAPATAZO ADMIN" ---
                    // Si el admin quitó un millón (-1.000.000) para dejarte a 0, 
                    // la matemática dice: 0 - (-1.000.000) = 1.000.000 (ERROR).
                    // Pero sabemos que el usuario probablemente tenía poco dinero.
                    // 
                    // Lógica: Si es un movimiento de ADMIN muy grande negativo 
                    // y el resultado anterior se dispara absurdamente, lo ignoramos 
                    // y asumimos que simplemente se le vació la cuenta.
                    
                    if (t.type === 'admin' && t.amount < -5000 && currentBal === 0) {
                        // Si le quitaron más de 5000 y se quedó a 0, 
                        // asumimos que fue un reset. 
                        // El saldo anterior NO era 1.000.000, era "lo que tuviera antes".
                        // Como es imposible saberlo exacto sin recalcular todo desde el inicio de los tiempos,
                        // un truco visual es suavizarlo o dejarlo igual al siguiente punto conocido válido.
                        
                        // Opción visual: Simplemente no subimos hasta el millón.
                        // Detectamos que es un reset forzoso.
                    }

                    // NOTA TÉCNICA: El método de "rebobinar" (ir del futuro al pasado) siempre fallará
                    // con los resets a 0 porque se pierde la información de cuánto había antes.
                    // (x - 1000000 = 0 -> x = 1000000).
                    
                    // CAMBIO DE ESTRATEGIA: 
                    // Para que esto sea perfecto, NO PODEMOS REBOBINAR. 
                    // TENEMOS QUE CALCULAR HACIA ADELANTE.
                });
                
                // --- ESTRATEGIA DEFINITIVA: CALCULAR DESDE EL PRINCIPIO (FORWARD) ---
                // Esta es la única forma matemática de que no falle nunca.
                
                // 1. Saldo inicial base de la liga
                const l = this.getCurrentLeague();
                let runningBalance = l.startBalance || 1000; 
                
                // 2. Cogemos TODAS las transacciones y las ordenamos por fecha ANTIGUA -> NUEVA
                const allTxs = [...txs].sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
                
                // 3. Reconstruimos la historia paso a paso
                let fullHistory = [runningBalance]; // Punto 0: Inicio
                let fullLabels = ['Inicio'];

                allTxs.forEach(t => {
                    let amount = 0;

                    if (t.type === 'bet' || t.type === 'debt_pay' || t.type === 'loss') amount = -Math.abs(t.amount);
                    else if (t.type === 'win' || t.type === 'bonus' || t.type === 'refund' || t.type === 'loan') amount = Math.abs(t.amount);
                    else if (t.type === 'admin') amount = t.amount;

                    // Aplicamos el movimiento
                    runningBalance += amount;

                    // CORRECCIÓN: Si el saldo baja de 0 (por el admin -1.000.000), lo forzamos a 0.
                    if (runningBalance < 0) runningBalance = 0;

                    fullHistory.push(runningBalance);
                    fullLabels.push('');
                });

                // 4. Recortamos para mostrar solo el final (últimos 30 puntos)
                if (fullHistory.length > 30) {
                    fullHistory = fullHistory.slice(fullHistory.length - 30);
                    fullLabels = fullLabels.slice(fullLabels.length - 30);
                }

                // Renderizamos
                this.chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: fullLabels,
                        datasets: [{
                            label: 'Saldo',
                            data: fullHistory,
                            borderColor: '#10b981',
                            backgroundColor: (context) => {
                                const ctx = context.chart.ctx;
                                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                                gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                                gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                                return gradient;
                            },
                            borderWidth: 2,
                            tension: 0.1,
                            pointRadius: 3,
                            pointBackgroundColor: '#10b981',
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: 'index' },
                        plugins: { legend: { display: false }, tooltip: { enabled: true } },
                        scales: {
                            x: { display: false },
                            y: { 
                                grid: { color: '#334155', drawBorder: false },
                                ticks: { color: '#94a3b8', font: {size: 10}, maxTicksLimit: 5 } 
                            }
                        }
                    }
                });
            },

            renderDashboard() {
                const l = this.getCurrentLeague();
                if (!l) return;

                const user = this.data.user;
                const mem = this.getMember(l, user);
                const base = l.startBalance || 1000;

                // INFO BÁSICA
                document.getElementById('dash-league-name').innerText = l.name;
                document.getElementById('dash-league-code').innerText = l.code;
                document.getElementById('dash-my-nickname').innerText = mem.nickname;

                // FUNCION COPIAR CÓDIGO
                this.copyCode = () => {
                    navigator.clipboard.writeText(l.code).then(() => this.toast('Código copiado'));
                };

                // GESTIÓN DE SALDO (Colores y Estados)
                const balWrapper = document.getElementById('balance-wrapper');
                const balText = document.getElementById('dash-balance');
                const balIcon = document.getElementById('balance-icon');

                balText.innerText = mem.balance;
                
                // Reseteo de estilos
                balWrapper.className = "flex items-center gap-1.5 mt-0.5 cursor-pointer transition active:scale-95 w-fit px-2 py-0.5 rounded";
                balText.className = "font-mono font-bold text-sm leading-none";

                if (mem.debt && mem.debt > 0) {
                    // DEUDA: Rojo
                    balWrapper.classList.add('bg-danger/10', 'border', 'border-danger/30', 'animate-pulse');
                    balText.classList.add('text-danger');
                    balText.classList.remove('text-neonGreen', 'text-orange-400');
                    balIcon.className = "fa-solid fa-skull text-[10px] text-danger";
                } 
                else if (mem.balance < (base * 0.10)) {
                    // POBRE: Naranja
                    balWrapper.classList.remove('bg-danger/10', 'border', 'border-danger/30', 'animate-pulse');
                    balText.classList.add('text-orange-400');
                    balText.classList.remove('text-neonGreen', 'text-danger');
                    balIcon.className = "fa-solid fa-coins text-[10px] text-orange-400";
                } 
                else {
                    // NORMAL: Verde
                    balWrapper.classList.remove('bg-danger/10', 'border', 'border-danger/30', 'animate-pulse');
                    balText.classList.add('text-neonGreen');
                    balText.classList.remove('text-danger', 'text-orange-400');
                    balIcon.className = "fa-solid fa-coins text-[10px] text-neonGreen";
                }

                // AVATAR
                const avDiv = document.getElementById('dash-my-avatar');
                if (mem.avatar) {
                    avDiv.innerHTML = `<img src="${mem.avatar}" class="w-full h-full object-cover">`;
                } else {
                    avDiv.innerHTML = `<span>${mem.nickname.substring(0,2).toUpperCase()}</span>`;
                }

                // BONO DIARIO (Lógica de tiempo)
                const btnDaily = document.getElementById('btn-header-daily');
                if (!l.settings?.dailyBonus) {
                    btnDaily.classList.add('hidden');
                } else {
                    btnDaily.classList.remove('hidden');
                    const last = new Date(mem.lastBonusDate || 0);
                    const now = new Date();
                    const isSameDay = last.getDate() === now.getDate() && 
                                      last.getMonth() === now.getMonth() && 
                                      last.getFullYear() === now.getFullYear();

                    if (!isSameDay) {
                        btnDaily.className = "flex items-center gap-1.5 bg-gradient-to-r from-neonGreen to-emerald-600 text-dark px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg shadow-neonGreen/20 animate-pulse active:scale-95 transition";
                        btnDaily.innerHTML = `<i class="fa-solid fa-gift animate-bounce"></i> <span>RECLAMAR</span>`;
                        btnDaily.onclick = () => this.claimDailyBonus();
                        btnDaily.disabled = false;
                    } else {
                        const tomorrow = new Date(now);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(0,0,0,0);
                        const diffMs = tomorrow - now;
                        const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
                        const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
                        
                        btnDaily.className = "flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-400 px-3 py-1.5 rounded-full text-[10px] font-mono cursor-not-allowed";
                        btnDaily.innerHTML = `<i class="fa-regular fa-clock text-[9px]"></i> <span>${diffHrs}h ${diffMins}m</span>`;
                        btnDaily.onclick = null;
                        btnDaily.disabled = true;
                    }
                }

                this.renderBets(l);
                // Notificaciones (Punto rojo)
                const stats = this.getNotificationStats(l);
                const totalNotif = stats.newPending + stats.wins + stats.losses + stats.adminUpdates;
                const badge = document.getElementById('header-bell-badge');
                if (badge) {
                     if (totalNotif > 0) badge.classList.remove('hidden');
                     else badge.classList.add('hidden');
                }
            },

           
            // --- FUNCIÓN COMPARTIR MEJORADA ---
            shareBet(id) {
                const l = this.getCurrentLeague();
                const b = l.bets.find(x => x.id === id);
                
                // 1. TU DOMINIO PÚBLICO
                const publicUrl = "https://santi06gh.github.io/betfriends-web/"; 
                
                // 2. CONSTRUIMOS EL LINK
                const smartLink = `${publicUrl}?bet=${id}&league=${l.code}`;

                // Mensaje
                const title = `🔥 ¡Apuesta en BetFriends!`;
                const text = `📢 *${b.title}*\n🏆 Liga: ${l.name}\n👇 Toca para entrar:`;
                
                const fullMsg = `${title}\n${text}\n${smartLink}`;

                // --- AQUÍ ESTÁ LA MAGIA PARA LA APP ---
                // Si la App ha inyectado el puente "AndroidApp", lo usamos:
                if (window.AndroidApp) {
                    window.AndroidApp.share(title, text, smartLink);
                    return; // ¡Terminamos aquí, la App se encarga del resto!
                }
                // -------------------------------------

                // Si no es la app (es Chrome normal), usamos lo de siempre:
                if (navigator.share) {
                    navigator.share({ title: title, text: text, url: smartLink })
                    .catch((e) => console.log('Error share', e));
                } 
                else {
                    navigator.clipboard.writeText(fullMsg).then(() => this.toast("Enlace copiado"));
                }
            },

checkDeepLinks() {
                // 1. Leer parámetros de la URL
                const params = new URLSearchParams(window.location.search);
                const betId = params.get('bet');
                const leagueCode = params.get('league');

                if (betId && leagueCode) {
                    console.log("🔗 Deep Link detectado:", betId);

                    // 2. Buscar la liga
                    const l = this.data.leagues.find(x => x.code === leagueCode);
                    
                    if (l) {
                        // Si no estamos en esa liga, entramos visualmente
                        if (this.data.currentLeagueId !== l.id) {
                            this.selectLeague(l.id);
                        }

                        // 3. Buscar y abrir la apuesta
                        // Pequeño timeout para dar tiempo a que cargue la interfaz
                        setTimeout(() => {
                            const b = l.bets.find(x => String(x.id) === String(betId));
                            if (b) {
                                if (b.status === 'resolved') {
                                    // Si está resuelta, filtramos historial y mostramos
                                    this.filterBets('resolved');
                                    // Expandir detalles (opcional, requiere lógica extra)
                                    this.toast("Mostrando apuesta del enlace 🔗");
                                } else {
                                    // Si está activa, abrimos el modal de apostar/ver
                                    this.filterBets(b.status === 'active' ? 'active' : 'pending');
                                    this.joinBetModal(b.id);
                                    this.toast("Has entrado desde WhatsApp 🚀");
                                }
                                
                                // Limpiamos la URL para que no se abra siempre al recargar
                                window.history.replaceState({}, document.title, window.location.pathname);
                            } else {
                                this.toast("La apuesta ya no existe", "error");
                            }
                        }, 1000); // Esperamos 1 segundo a que todo renderice
                    } else {
                        // Si el usuario no tiene esa liga, podrías abrir el modal de "Unirse a Liga"
                        // y pre-rellenar el código.
                        this.openModal('join-league');
                        document.getElementById('join-league-code').value = leagueCode;
                        this.toast("Únete a la liga para ver la apuesta");
                    }
                }
            },
           renderBets(l) {
                const container = document.getElementById('bets-container');
                container.innerHTML = '';

                let visibleBets = [];
                const me = this.data.user;

                // 1. FILTRADO (Exactamente igual que tu versión)
                if (this.data.filter === 'active') {
                    visibleBets = l.bets.filter(b => b.status === 'active' && 
                        (b.participants.includes(me) || b.creator === me || !b.invites || b.invites.length === 0 || b.invites.includes(me))
                    );
                    visibleBets = visibleBets.filter(b => {
                        if (b.participants.includes(me) || b.creator === me) return true;
                        if (b.invites && b.invites.includes(me)) return false; 
                        return true;
                    });

                } else if (this.data.filter === 'pending') {
                    visibleBets = l.bets.filter(b => {
                        if (b.status !== 'active') return false;
                        if (b.creator === me) return false;
                        if (b.participants.includes(me)) return false;
                        if (b.rejectedBy && b.rejectedBy.includes(me)) return false;
                        if (b.invites && b.invites.includes(me)) return true;
                        return false;
                    });

                } else if (this.data.filter === 'resolved') {
                    visibleBets = l.bets.filter(b => b.status === 'resolved');
                }

                if (visibleBets.length === 0) {
                    container.innerHTML = `<div class="text-center text-slate-500 py-10"><i class="fa-solid fa-ghost text-4xl mb-2 opacity-30"></i><p>No hay apuestas aquí.</p></div>`;
                    return;
                }

                // --- 2. ORDENACIÓN INTELIGENTE (EL ÚNICO CAMBIO) ---
                // Si la apuesta tiene 'resolvedTime' (se acaba de resolver), usamos esa fecha.
                // Si no, usamos 'id' (fecha de creación).
                visibleBets.sort((a, b) => {
                    const timeA = a.resolvedTime || a.id;
                    const timeB = b.resolvedTime || b.id;
                    return timeB - timeA; // De más reciente a más antiguo
                });

                // --- 3. OPTIMIZACIÓN ANTI-LAG (Exactamente igual que tu versión) ---
                
                // A) LIMITAR CANTIDAD
                const totalResolved = visibleBets.length;
                if (this.data.filter === 'resolved' && totalResolved > 50) {
                    visibleBets = visibleBets.slice(0, 50);
                }

                // B) RENDERIZADO EN MEMORIA (BATCHING)
                const tempDiv = document.createElement('div');
                
                // Pintamos todas las cartas en el contenedor temporal
                visibleBets.forEach(b => this.renderBetCard(b, tempDiv, l));
                
                // Pegamos todo el bloque de una sola vez
                container.innerHTML = tempDiv.innerHTML;

                // Aviso de límite
                if (this.data.filter === 'resolved' && totalResolved > 50) {
                    container.innerHTML += `<div class="text-center text-[10px] text-slate-600 py-6 italic border-t border-slate-800 mt-4">Mostrando las 50 últimas operaciones de ${totalResolved}</div>`;
                }
            },
            renderBetCard(b,c,l) { 
                const me=this.data.user; 
                const ic=b.creator===me; 
                const cd=this.getMember(l,b.creator); 
                let bg='',acts='',inf='',pt=''; 
                let avatarHtml = ''; 
                let metaHtml = ''; 

                // --- 1. FECHAS Y CIERRE ---
                const isTimeExpired = b.closingTime && Date.now() > b.closingTime;
                const isLocked = b.locked || isTimeExpired; 
                
                let timeLabel = '';
                if (b.closingTime && b.status === 'active') {
                    const d = new Date(b.closingTime);
                    const dateStr = d.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const colorTime = isTimeExpired ? 'text-danger border-danger/30' : 'text-orange-400 border-orange-400/30';
                    // Nota: 'whitespace-nowrap' evita que la fecha se parta en dos líneas
                    timeLabel = `<span class="text-[9px] ${colorTime} font-bold ml-1 border px-1 rounded whitespace-nowrap inline-block mt-1" title="Cierre automático"><i class="fa-regular fa-clock mr-1"></i>${dateStr}</span>`;
                }

                // --- 2. CABECERA ---
                if (b.type === 'bank') { 
                    avatarHtml = `<div class="avatar-circle avatar-sm bg-gradient-to-br from-amber-400 to-orange-600 text-white border-none shadow-lg flex items-center justify-center"><i class="fa-solid fa-crown text-xs"></i></div>`; 
                    metaHtml = `<div class="text-[10px] text-amber-400 mt-0.5 font-bold uppercase tracking-wider">Evento de Liga 🏆</div>`; 
                } else if (b.type === 'admin') { 
                    avatarHtml = `<div class="avatar-circle avatar-sm bg-slate-600 text-white border-none shadow-lg flex items-center justify-center"><i class="fa-solid fa-gavel text-xs"></i></div>`; 
                    metaHtml = `<div class="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Ajuste de Comisionado ⚖️</div>`; 
                } else { 
                    avatarHtml = this.getAvatarHtml(cd,'sm'); 
                    const tMap = { duel: 'Duelo', group: 'Bote', custom: 'Porra' }; 
                    metaHtml = `<div class="text-xs text-slate-500 mt-0.5">de ${cd.nickname} · ${tMap[b.type]||b.type}</div>`; 
                } 
                
                // Candado de privada (inline-block para que fluya con el texto)
                if(b.invites&&b.invites.length>0) pt=`<span class="text-[10px] text-slate-400 ml-1 border border-slate-700 px-1 rounded whitespace-nowrap inline-block"><i class="fa-solid fa-lock mr-1"></i>Privada</span>`; 

                // --- 3. ESTADOS Y BOTONES ---
                if(this.data.filter==='pending') { 
                    bg=`<span class="text-gold bg-gold/10 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">PROPUESTA</span>`; 
                    if(b.invites&&b.invites.length>0) inf=`<div class="mt-2 text-[10px] text-slate-500 border-t border-slate-700/50 pt-1">Invitados: ${b.invites.map(u=>this.getMember(l,u).nickname).join(', ')}</div>`; 
                    acts=`<div class="grid grid-cols-2 gap-2 mt-3"><button onclick="app.rejectBet(${b.id})" class="bg-slate-700 py-2 rounded text-xs font-bold text-white">Rechazar</button><button onclick="app.joinBetModal(${b.id})" class="bg-neonGreen text-dark py-2 rounded text-xs font-bold">Aceptar (${b.amount})</button></div>`; 
                
                } else if(this.data.filter==='active') { 
                    if (isLocked) {
                        bg=`<span class="text-danger bg-danger/10 px-2 py-0.5 rounded text-[10px] font-bold border border-danger/20 whitespace-nowrap"><i class="fa-solid fa-lock mr-1"></i>CERRADA</span>`;
                    } else {
                        bg=`<span class="text-neonGreen bg-neonGreen/10 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">EN JUEGO</span>`;
                    }
                    
                    inf=`<div class="mt-2 text-[10px] text-slate-500 border-t border-slate-700/50 pt-2"><div class="uppercase font-bold text-slate-600 mb-1">Participantes (${b.participants.length}):</div><div class="flex flex-wrap gap-1">${b.participants.map(u=>`<div class="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">${this.getAvatarHtml(this.getMember(l,u),'sm')}<span class="text-[10px] text-slate-300">${this.getMember(l,u).nickname}</span></div>`).join('')}</div></div>`; 
                    
                    if(ic) { 
                        const lockBtn = `<button onclick="app.toggleBetLock(${b.id})" class="flex-1 border ${b.locked ? 'border-neonGreen text-neonGreen' : 'border-slate-500 text-slate-400'} py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition mr-1" title="${b.locked ? 'Abrir' : 'Cerrar entradas'}"><i class="fa-solid ${b.locked ? 'fa-lock-open' : 'fa-lock'}"></i></button>`;
                        const resolveBtn = `<button onclick="app.resolveBetModal(${b.id})" class="flex-[4] border border-neonPurple text-neonPurple py-2 rounded-xl text-xs font-bold hover:bg-neonPurple hover:text-white transition">Resolver Evento</button>`;
                        const cancelBtn = `<button onclick="app.cancelBet(${b.id})" class="w-full mt-2 border border-danger text-danger py-2 rounded-xl text-xs font-bold hover:bg-danger hover:text-white transition"><i class="fa-solid fa-trash mr-1"></i> Cancelar</button>`;

                        if (b.type === 'custom' && !b.participants.includes(me) && !isLocked) {
                            acts = `<button onclick="app.joinBetModal(${b.id})" class="w-full mb-2 bg-gradient-to-r from-neonGreen to-emerald-600 text-dark py-2 rounded-xl text-xs font-bold shadow-lg animate-pulse">🎯 Elige tu opción</button>`;
                            acts += `<div class="flex gap-1">${lockBtn}${resolveBtn}</div>${cancelBtn}`;
                        } else if (b.type === 'bank') {
                             if (!b.selections?.[me] && !isLocked) {
                                acts = `<button onclick="app.joinBetModal(${b.id})" class="w-full mb-2 bg-slate-700 text-white py-2 rounded text-xs font-bold">Jugar contra la Banca</button>`;
                            } else if (b.selections?.[me]) {
                                acts = `<div class="mb-2 text-xs bg-slate-800 p-2 rounded text-center text-slate-400 border border-slate-700">Tu apuesta: <span class="text-white font-bold">${b.selections[me].option}</span></div>`;
                            }
                            acts += `<div class="flex gap-1">${lockBtn}${resolveBtn}</div>${cancelBtn}`;
                        } else {
                            acts = `<div class="flex gap-1 mt-2">${lockBtn}${resolveBtn}</div>${cancelBtn}`;
                        }

                    } else { 
                        const s=b.selections?b.selections[me]:null;
                        if (isLocked && !b.participants.includes(me)) {
                            acts=`<div class="mt-3 text-xs bg-danger/10 border border-danger/30 p-2 rounded text-center text-danger font-bold"><i class="fa-solid fa-lock mr-1"></i> Apuestas Cerradas</div>`;
                        } else if (b.participants.includes(me)) {
                            acts=`<div class="mt-3 text-xs bg-slate-800 p-2 rounded text-center text-slate-400">${s?`Tu apuesta: <span class="text-white font-bold">${(typeof s==='object')?s.option:s}</span>`:'Estás dentro'}</div>`;
                        } else {
                            acts=`<button onclick="app.joinBetModal(${b.id})" class="w-full mt-2 bg-neonGreen text-dark py-2 rounded-xl text-xs font-bold shadow-lg">Unirse / Apostar</button>`;
                        }
                    } 
                
                } else if(b.status==='resolved') { 
                    if (b.type === 'admin') { 
                        const targetUser = b.participants[0]; 
                        const targetMember = this.getMember(l, targetUser); 
                        const isPositive = b.winningOption.includes('+'); 
                        const colorClass = isPositive ? 'text-neonGreen' : 'text-danger'; 
                        acts = `<div class="mt-3 text-xs bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center"><div class="flex items-center gap-2">${this.getAvatarHtml(targetMember, 'sm')}<span class="font-bold text-white">${targetMember.nickname}</span></div><div class="${colorClass} font-mono font-bold text-sm">${b.winningOption}</div></div><div class="text-[9px] text-right text-slate-500 mt-1">${b.timestamp}</div>`; 
                    } else { 
                        const listHtml = b.participants.map(p => { 
                            const m = this.getMember(l, p); 
                            let wager = b.amount; 
                            let prize = 0; 
                            let isWinner = false; 
                            let selectionHtml = ''; 
                            if (b.type === 'bank') { 
                                const record = b.selections ? b.selections[p] : null; 
                                if (record) { 
                                    wager = record.wager; 
                                    const pickedOption = record.option; 
                                    const correct = pickedOption === b.winningOption; 
                                    if (correct) { isWinner = true; prize = Math.floor(record.wager * record.odd); } 
                                    selectionHtml = `<div class="text-[10px] text-slate-400">Apostó: <span class="${correct?'text-neonGreen':'text-slate-500'} font-bold">${pickedOption} (x${record.odd})</span></div>`; 
                                } 
                            } else { 
                                let winnersList = []; 
                                if (b.type === 'custom') { 
                                    winnersList = Object.entries(b.selections || {}).filter(([u, s]) => s === b.winningOption).map(([u]) => u); 
                                } else { 
                                    if (l.members[b.winner] || typeof l.members[b.winner] === 'object') winnersList = [b.winner]; 
                                } 
                                const potPrize = winnersList.length > 0 ? Math.floor(b.pot / winnersList.length) : 0; 
                                isWinner = winnersList.includes(p); 
                                prize = isWinner ? potPrize : 0; 
                                if (b.type === 'custom' && b.selections && b.selections[p]) { 
                                    const picked = b.selections[p]; 
                                    const correct = picked === b.winningOption; 
                                    selectionHtml = `<div class="text-[10px] text-slate-400">Eligió: <span class="${correct?'text-neonGreen':'text-slate-500'} font-bold">${picked}</span></div>`; 
                                } 
                            } 
                            return `<div class="flex justify-between items-center bg-slate-800/50 p-2 rounded mb-1 border border-slate-700/50"><div class="flex items-center gap-2">${this.getAvatarHtml(m, 'sm')}<div><div class="text-xs font-bold ${isWinner ? 'text-neonGreen' : 'text-white'}">${m.nickname}</div>${selectionHtml}</div></div><div class="text-right text-[10px]"><div class="text-slate-400">Entrada: ${wager}</div><div class="${isWinner ? 'text-neonGreen font-bold' : 'text-slate-600'}">Ganó: ${prize}</div></div></div>`; 
                        }).join(''); 
                        acts=`<div class="mt-3 pt-3 border-t border-slate-700/50"><div class="flex justify-between items-center mb-2"><span class="text-xs text-slate-400 font-bold uppercase">Resultado:</span><span class="text-neonGreen font-bold text-sm bg-slate-800 px-3 py-1 rounded border border-neonGreen/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">${b.winningOption || b.winner}</span></div><details class="group"><summary class="list-none cursor-pointer text-xs text-center text-slate-500 hover:text-white transition bg-slate-800/50 p-2 rounded flex items-center justify-center gap-2 select-none font-bold uppercase tracking-wider"><span>Ver Detalles</span><i class="fa-solid fa-chevron-down group-open:rotate-180 transition-transform"></i></summary><div class="mt-3 space-y-3 bg-slate-800/50 p-3 rounded text-xs text-slate-300 border border-slate-700"><div class="grid grid-cols-2 gap-2"><div class="bg-dark p-2 rounded text-center border border-slate-700"><div class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">${b.type === 'bank' ? 'Volumen Total' : 'Bote Total'}</div><div class="text-neonGreen font-mono font-bold text-lg">${b.pot}</div></div><div class="bg-dark p-2 rounded text-center border border-slate-700"><div class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Fecha</div><div class="text-white font-mono text-sm pt-1">${b.timestamp || '-'}</div></div></div><div><div class="text-[10px] text-slate-500 uppercase font-bold mb-2 border-b border-slate-600 pb-1">Desglose</div><div class="flex flex-col gap-1">${listHtml}</div></div></div></details></div>`; 
                    } 
                } 

                // --- 4. RENDER FINAL (AQUÍ ESTÁ LA CORRECCIÓN DE LAYOUT) ---
                
                const shareBtn = (b.status === 'active' || b.status === 'pending') 
                    ? `<button onclick="app.shareBet(${b.id})" class="text-slate-500 hover:text-white transition p-1" title="Compartir"><i class="fa-solid fa-share-nodes"></i></button>` 
                    : '';

                // Usamos 'shrink-0' en la derecha para que NO se encoja.
                // Usamos 'break-words' en la izquierda para que el texto salte de línea.
                c.innerHTML+=`
                <div class="bg-card p-4 rounded-xl border border-slate-700 shadow-lg relative">
                    <div class="flex justify-between items-start gap-3">
                        
                        <div class="flex gap-3 min-w-0 flex-1">
                            <div class="pt-1 shrink-0">${avatarHtml}</div>
                            <div class="min-w-0 flex-1">
                                <h4 class="font-bold text-white text-sm break-words leading-tight">${b.title} ${pt} ${timeLabel}</h4>
                                ${metaHtml}
                            </div>
                        </div>
                        
                        <div class="flex flex-col items-end gap-1 shrink-0 ml-1">
                            <div class="flex items-center gap-2">
                                ${shareBtn}
                                <div class="text-neonGreen font-mono font-bold">${b.pot}</div>
                            </div>
                            <div>${bg}</div>
                        </div>

                    </div>
                    ${(b.type==='custom'||b.type==='bank')&&b.status!=='resolved'?`<div class="flex gap-1 mt-2 overflow-x-auto opacity-60 ml-10 no-scrollbar">${b.options.map(o=>`<span class="text-[10px] border border-slate-600 px-2 rounded-full whitespace-nowrap">${o}</span>`).join('')}</div>`:''} 
                    <div class="ml-0 sm:ml-10">${inf}${acts}</div>
                </div>`; 
            },
                
         openProfileModal() { const l=this.getCurrentLeague(); const m=this.getMember(l,this.data.user); document.getElementById('profile-nickname').value=m.nickname; document.getElementById('profile-preview').innerHTML=m.avatar?`<img src="${m.avatar}" class="w-full h-full object-cover">`:`<i class="fa-solid fa-user text-4xl"></i>`; this.data.tempAvatar=m.avatar; this.openModal('profile'); },
            handleImageUpload(i) {
                if (i.files && i.files[0]) {
                    const file = i.files[0];
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imgElement = document.getElementById('crop-image-element');
                        imgElement.src = e.target.result;
                        document.getElementById('modal-crop').classList.remove('hidden');
                        document.getElementById('modal-crop').classList.add('flex');

                        if (this.cropperInstance) {
                            this.cropperInstance.destroy();
                        }

                        this.cropperInstance = new Cropper(imgElement, {
                            aspectRatio: 1,
                            viewMode: 1,
                            dragMode: 'move',
                            autoCropArea: 1,
                            background: false,
                        });
                        i.value = ''; 
                    };
                    reader.readAsDataURL(file);
                }
            },

            closeCropModal() {
                document.getElementById('modal-crop').classList.add('hidden');
                document.getElementById('modal-crop').classList.remove('flex');
                if (this.cropperInstance) {
                    this.cropperInstance.destroy();
                    this.cropperInstance = null;
                }
            },

            confirmCrop() {
                if (!this.cropperInstance) return;
                // Redimensionamos a 300x300 px para que la imagen pese poco
                const canvas = this.cropperInstance.getCroppedCanvas({ width: 300, height: 300 });
                const finalImage = canvas.toDataURL('image/jpeg', 0.7);
                
                this.data.tempAvatar = finalImage;
                document.getElementById('profile-preview').innerHTML = `<img src="${finalImage}" class="w-full h-full object-cover">`;
                
                this.closeCropModal();
                this.toast("Foto recortada y lista");
            },
            saveProfile() { const l=this.getCurrentLeague(); const n=document.getElementById('profile-nickname').value.trim()||this.data.user; if(typeof l.members[this.data.user]==='number') l.members[this.data.user]={balance:l.members[this.data.user],nickname:n,avatar:this.data.tempAvatar}; else {l.members[this.data.user].nickname=n; l.members[this.data.user].avatar=this.data.tempAvatar;} this.saveLeagueToCloud(l); this.closeModals(); this.renderDashboard(); this.toast("Perfil actualizado"); },
            toggleAuthMode() { this.authMode = this.authMode === 'login' ? 'register' : 'login'; if(this.authMode === 'login') { document.getElementById('auth-title').innerText = "Iniciar Sesión"; document.getElementById('btn-auth-action').innerText = "ENTRAR"; document.getElementById('auth-toggle-text').innerText = "¿No tienes cuenta?"; document.getElementById('auth-toggle-btn').innerText = "Regístrate aquí"; document.getElementById('btn-auth-action').classList.remove('bg-neonGreen', 'text-dark'); document.getElementById('btn-auth-action').classList.add('bg-neonPurple', 'text-white'); } else { document.getElementById('auth-title').innerText = "Crear Cuenta Nueva"; document.getElementById('btn-auth-action').innerText = "CREAR CUENTA"; document.getElementById('auth-toggle-text').innerText = "¿Ya tienes cuenta?"; document.getElementById('auth-toggle-btn').innerText = "Inicia sesión"; document.getElementById('btn-auth-action').classList.remove('bg-neonPurple', 'text-white'); document.getElementById('btn-auth-action').classList.add('bg-neonGreen', 'text-dark'); } },
            showLeaguesView() { document.querySelectorAll('.app-view').forEach(e=>e.classList.add('hidden')); document.getElementById('view-leagues').classList.remove('hidden'); document.getElementById('view-leagues').classList.add('flex'); document.getElementById('league-username').innerText=this.data.user; this.renderLeaguesList(); },
            exitLeague() { this.data.currentLeagueId=null; this.showLeaguesView(); },
            createLeague() {
                try {
                    // 1. Buscamos los datos básicos
                    const nameInput = document.getElementById('new-league-name');
                    const balanceInput = document.getElementById('conf-start-balance');
                    
                    // Si no encuentra los inputs básicos, avisamos
                    if (!nameInput || !balanceInput) throw new Error("Faltan campos básicos en el HTML (ID incorrecto)");

                    const n = nameInput.value.trim();
                    const sb = parseInt(balanceInput.value) || 1000;

                    if (!n) return this.toast("Falta poner el nombre", "error");

                    // 2. Buscamos las opciones avanzadas (con seguridad, por si no están)
                    const bonusCheck = document.getElementById('check-daily-bonus');
                    const bonusValInput = document.getElementById('conf-daily-bonus');
                    const bankCheck = document.getElementById('check-allow-bank');

                    // Solo leemos el valor si la casilla existe en el HTML
                    const dailyBonus = (bonusCheck && bonusCheck.checked && bonusValInput) ? (parseInt(bonusValInput.value) || 0) : 0;
                    const allowBank = (bankCheck && bankCheck.checked) || false;

                    // 3. Creamos el objeto Liga
                    const l = {
                        id: Date.now(),
                        name: n,
                        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                        creator: this.data.user,
                        settings: { startBalance: sb, dailyBonus: dailyBonus, allowBank: allowBank },
                        members: {},
                        bets: []
                    };

                    // 4. Añadimos al creador (tú)
                    l.members[this.data.user] = {
                        balance: sb,
                        nickname: this.data.user,
                        avatar: null,
                        lastBonusDate: 0
                    };

                    // 5. Intentamos guardar en la Nube
                    if (typeof this.saveLeagueToCloud !== 'function') {
                        throw new Error("La función saveLeagueToCloud no existe o está mal colocada.");
                    }
                    
                    this.saveLeagueToCloud(l);
                    
                    // 6. Si todo ha ido bien, cerramos
                    this.closeModals();
                    nameInput.value = '';
                    this.toast("¡Liga Creada!");

                } catch (e) {
                    // Si algo falla, esto te dirá por qué
                    console.error(e);
                    alert("Error creando liga: " + e.message); 
                }
            },
            joinLeague() { const c=document.getElementById('join-league-code').value.trim().toUpperCase(); const l=this.data.leagues.find(x=>x.code===c); if(!l) return this.toast("No encontrada","error"); if(l.members[this.data.user]) return this.toast("Ya estás dentro","error"); l.members[this.data.user]={balance:l.settings.startBalance||1000,nickname:this.data.user,avatar:null,lastLogin:Date.now()}; this.saveLeagueToCloud(l); this.closeModals(); document.getElementById('join-league-code').value=''; this.toast("Unido"); this.renderLeaguesList(); },
            selectLeague(id) { this.data.currentLeagueId=id; document.querySelectorAll('.app-view').forEach(e=>e.classList.add('hidden')); document.getElementById('view-dashboard').classList.remove('hidden'); document.getElementById('view-dashboard').classList.add('flex'); this.renderDashboard(); },
            getCurrentLeague() { return this.data.leagues.find(l=>l.id===this.data.currentLeagueId); },
            showRanking() { 
                const l = this.getCurrentLeague(); 
                const el = document.getElementById('ranking-list'); 
                el.innerHTML = ''; 
                
                // --- CAMBIO CLAVE: ORDENAR POR PATRIMONIO (Saldo - Deuda) ---
                const sorted = Object.keys(l.members).sort((a,b) => {
                    const mA = this.getMember(l, a);
                    const mB = this.getMember(l, b);
                    const netA = mA.balance - (mA.debt || 0);
                    const netB = mB.balance - (mB.debt || 0);
                    return netB - netA; // De mayor a menor
                });
                
                sorted.forEach((k, i) => { 
                    const m = this.getMember(l,k); 
                    const isAdmin = k === l.creator; 
                    
                    // 1. LÓGICA DE BORDES POR POSICIÓN
                    let borderClass = 'border-slate-700'; 
                    let textClass = 'text-slate-500';
                    let rankIcon = `<span class="font-bold ${textClass} w-6 text-center">${i+1}</span>`;
                    
                    if (i === 0) { 
                        borderClass = 'border-gold shadow-[0_0_10px_rgba(251,191,36,0.3)]'; 
                        textClass='text-gold'; 
                        rankIcon = '<i class="fa-solid fa-crown text-gold w-6 text-center"></i>'; 
                    } 
                    else if (i === 1) { 
                        borderClass = 'border-slate-300'; 
                        textClass='text-slate-300'; 
                        rankIcon = '<i class="fa-solid fa-medal text-slate-300 w-6 text-center"></i>'; 
                    } 
                    else if (i === 2) { 
                        borderClass = 'border-orange-700'; 
                        textClass='text-orange-700'; 
                        rankIcon = '<i class="fa-solid fa-medal text-orange-700 w-6 text-center"></i>'; 
                    } 
                    else if (i === sorted.length - 1 && sorted.length > 3) { 
                        borderClass = 'border-danger/50'; 
                        textClass='text-danger'; 
                    }

                    // 2. LÓGICA DE RACHA (FUEGO)
                    let streak = 0;
                    if(l.bets) {
                        const myBets = l.bets.filter(b => b.status === 'resolved' && b.type !== 'admin' && b.participants.includes(k));
                        // Nota: isUserWinner debe estar definida en tu app para que esto funcione
                        // Si no tienes isUserWinner a mano, podrías usar m.streak si lo guardas
                         for (let b of myBets) {
                             if (this.isUserWinner && this.isUserWinner(b, k)) streak++;
                             else break;
                         }
                    } else if (m.streak) {
                        streak = m.streak;
                    }
                    
                    // Icono de Racha
                    const fireIcon = streak >= 3 
                        ? `<div class="flex items-center gap-0.5 text-orange-500 animate-pulse whitespace-nowrap" title="Racha de ${streak}"><i class="fa-solid fa-fire"></i><span class="text-xs font-bold pt-0.5">${streak}</span></div>` 
                        : '';

                    // 3. LÓGICA DE DEUDA (VISUAL)
                    // Si tiene deuda, mostramos una etiquetita roja al lado del nombre
                    const debtIcon = (m.debt && m.debt > 0)
                        ? `<div class="flex items-center gap-1 text-[9px] text-red-400 border border-red-500/30 px-1 rounded bg-red-900/20 font-bold whitespace-nowrap ml-1" title="Deuda pendiente"><i class="fa-solid fa-file-invoice-dollar"></i> -${m.debt}</div>`
                        : '';

                    const adminBadge = isAdmin ? `<i class="fa-solid fa-user-shield text-neonPurple text-[10px]" title="Comisionado"></i>` : ''; 
                    
                    // 4. RENDER FINAL
                    el.innerHTML += `
                    <div class="flex justify-between items-center p-3 rounded-lg bg-slate-800 border-2 ${borderClass} cursor-pointer mb-2 transition hover:scale-[1.02]" onclick="app.viewProfile('${k}')">
                        <div class="flex items-center gap-3 min-w-0">
                            ${rankIcon}
                            ${this.getAvatarHtml(m,'sm')}
                            
                            <div class="flex flex-col min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-white text-sm truncate">${m.nickname}</span>
                                    ${adminBadge}
                                </div>
                                <div class="flex items-center gap-1 mt-0.5">
                                    ${fireIcon}
                                    ${debtIcon}
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                             <span class="font-mono ${i===0 ? 'text-gold' : 'text-neonGreen'} font-bold text-lg">${m.balance}</span>
                             ${(m.debt && m.debt > 0) ? `<div class="text-[9px] text-red-400 font-mono -mt-1">Neto: ${m.balance - m.debt}</div>` : ''}
                        </div>
                    </div>`; 
                }); 
                this.openModal('ranking'); 
            },
            filterBets(t) { this.data.filter=t; document.querySelectorAll('.filter-btn').forEach(b=>{ b.className="filter-btn px-4 py-1 rounded-full text-xs font-bold border border-slate-600 text-slate-400 relative transition-all"; if(b.innerText.toLowerCase().includes(t==='active'?'activas':(t==='pending'?'pendientes':'historial'))) {b.classList.remove('text-slate-400'); b.classList.add('bg-neonPurple','text-white');} if(b.innerText.includes('Pendientes')){ const bg=document.getElementById('badge-pending'); if(!bg.classList.contains('hidden')) b.appendChild(bg); } }); this.renderDashboard(); },
            openModal(id) { document.getElementById(`modal-${id}`).classList.remove('hidden'); },
            closeModals() { document.querySelectorAll('[id^="modal-"]').forEach(el=>el.classList.add('hidden')); },
            toast(m,t='s') { const el=document.getElementById('toast'); el.querySelector('span').innerText=m; el.querySelector('i').className=t==='error'?'fa-solid fa-circle-xmark text-danger':'fa-solid fa-circle-check text-neonGreen'; el.classList.remove('opacity-0'); setTimeout(()=>el.classList.add('opacity-0'),3000); },
            resetData() { if(confirm("¿Seguro?")) { localStorage.removeItem('betfriends_v2_data'); location.reload(); } },
            toggleCreateFields() { 
                const t=document.getElementById('create-type').value; 
                const bPub=document.getElementById('btn-mode-public'); 
                const bPriv=document.getElementById('btn-mode-private'); 
                
                // 1. Mostrar/Ocultar Opciones
                document.getElementById('field-options').style.display=(t==='custom'||t==='bank')?'block':'none'; 
                
                // 2. Mostrar/Ocultar Calendario (Solo Banca y Quiniela)
                const dateField = document.getElementById('field-deadline');
                if (dateField) dateField.classList[(t==='custom'||t==='bank') ? 'remove' : 'add']('hidden');

                // 3. Ajustes visuales de siempre
                document.querySelectorAll('.option-odd').forEach(e=>e.classList[t==='bank'?'remove':'add']('hidden')); 
                document.getElementById('create-amount').parentElement.style.display=t==='bank'?'none':'block'; 
                
                bPub.disabled=false; bPub.classList.remove('opacity-50','cursor-not-allowed'); 
                bPriv.disabled=false; bPriv.classList.remove('opacity-50','cursor-not-allowed'); 
                
                if(t==='bank') { 
                    this.setInviteMode('public'); 
                    bPriv.disabled=true; bPriv.classList.add('opacity-50','cursor-not-allowed'); 
                } else if(t==='duel') { 
                    this.setInviteMode('private'); 
                    bPub.disabled=true; bPub.classList.add('opacity-50','cursor-not-allowed'); 
                } else { 
                    this.setInviteMode(this.data.inviteMode); 
                } 
            },
            setInviteMode(m) { this.data.inviteMode=m; document.getElementById('btn-mode-public').className=`flex-1 py-2 text-xs font-bold rounded ${m==='public'?'bg-neonPurple text-white':'text-slate-400 hover:text-white'} transition`; document.getElementById('btn-mode-private').className=`flex-1 py-2 text-xs font-bold rounded ${m==='private'?'bg-neonPurple text-white':'text-slate-400 hover:text-white'} transition`; document.getElementById('invite-list-container').classList[m==='private'?'remove':'add']('hidden'); },
            addOptionInput() { const c=document.getElementById('options-list'); const d=document.createElement('div'); d.className="flex gap-2 mb-2"; d.innerHTML=`<input type="text" class="option-name neon-input flex-1 p-2 rounded text-sm" placeholder="Opción"><input type="number" class="option-odd neon-input w-20 p-2 rounded text-sm text-center border-neonPurple text-neonPurple font-bold ${document.getElementById('create-type').value!=='bank'?'hidden':''}" placeholder="x1.5" step="0.1">`; c.appendChild(d); },
            openCreateBetModal() { const l=this.getCurrentLeague(); document.getElementById('opt-bank').classList[(l.creator===this.data.user&&l.settings.allowBank)?'remove':'add']('hidden'); document.getElementById('create-type').value='duel'; this.renderInviteList(l); this.toggleCreateFields(); this.openModal('create-bet'); },
            renderInviteList(l) { const checkList = document.getElementById('invite-checklist'); checkList.innerHTML = ''; this.data.selectedInvites = []; Object.keys(l.members).forEach(key => { if (key !== this.data.user) { const mem = this.getMember(l, key); const div = document.createElement('div'); div.className = "invite-check border border-slate-600 rounded p-2 flex items-center gap-2 cursor-pointer hover:bg-slate-700 transition select-none"; div.innerHTML = `${this.getAvatarHtml(mem, 'sm')} <span class="text-xs font-bold truncate">${mem.nickname}</span>`; div.onclick = () => { if (div.classList.contains('selected')) { div.classList.remove('selected'); this.data.selectedInvites = this.data.selectedInvites.filter(u => u !== key); } else { div.classList.add('selected'); this.data.selectedInvites.push(key); } }; checkList.appendChild(div); } }); },
            createBet() {
                const l = this.getCurrentLeague();
                const t = document.getElementById('create-type').value;
                const ti = document.getElementById('create-title').value.trim();
                
                // Leemos la cantidad. Si es banca es 0, si no, lo que ponga el usuario.
                let a = t === 'bank' ? 0 : parseInt(document.getElementById('create-amount').value);
                const me = this.data.user;

                if (!ti) return this.toast("Falta título", "error");
                
                // --- 🛡️ VALIDACIÓN DE CANTIDAD (NUEVO) ---
                // Si NO es contra la banca, la entrada es obligatoria y debe ser >= 1
                if (t !== 'bank') {
                    if (isNaN(a) || a < 1) {
                        return this.toast("La entrada debe ser mínimo 1 ficha", "error");
                    }
                }
                // ------------------------------------------

                // LEEMOS LA FECHA EXACTA
                const dateInput = document.getElementById('create-deadline').value;
                const closingTime = dateInput ? new Date(dateInput).getTime() : null;

                if (this.data.inviteMode === 'private') {
                    if (t === 'group' && this.data.selectedInvites.length < 2) return this.toast("Mínimo 2 invitados para Bote", "error");
                    if (this.data.selectedInvites.length < 1) return this.toast("Selecciona al menos 1 invitado", "error");
                }

                let o = [], od = {};
                if (t === 'custom' || t === 'bank') {
                    for (let r of document.getElementById('options-list').children) {
                        const n = r.querySelector('.option-name').value.trim();
                        const v = r.querySelector('.option-odd').value;
                        if (n) {
                            o.push(n);
                            if (t === 'bank') od[n] = parseFloat(v) || 1.5;
                        }
                    }
                    if (o.length < 2) return this.toast("Mínimo 2 opciones", "error");
                }

                const b = { 
                    id: Date.now(), 
                    type: t, 
                    creator: me, 
                    title: ti, 
                    amount: a, 
                    pot: 0, 
                    participants: [], 
                    invites: t === 'bank' ? [] : (this.data.inviteMode === 'private' ? this.data.selectedInvites : []), 
                    status: 'active', 
                    options: o, 
                    odds: od, 
                    selections: {}, 
                    timestamp: new Date().toLocaleDateString(),
                    locked: false,           
                    closingTime: closingTime 
                };

                // Lógica de cobro al crear (Solo Duelo y Bote pagan al crear)
                // La Quiniela (Custom) NO paga al crear, el creador paga al unirse después eligiendo opción
                if (t !== 'bank' && t !== 'custom') {
                    if (l.members[me].balance < a) return this.toast("Saldo bajo", "error");
                    
                    // 1. RESTAR SALDO
                    l.members[me].balance -= a;
                    
                    // 2. GUARDAR EN HISTORIAL
                    if (!l.members[me].transactions) l.members[me].transactions = [];
                    l.members[me].transactions.push({
                        type: 'bet',
                        amount: -a,
                        desc: `Apuesta: ${ti}`,
                        date: new Date().toLocaleString(),
                        timestamp: Date.now()
                    });

                    b.pot = a;
                    b.participants.push(me);
                }

                l.bets.unshift(b);
                this.saveLeagueToCloud(l);
                this.closeModals();
                this.renderDashboard();
                this.toast("Creado con éxito");
                this.checkAndNotify();
            },
            joinBetModal(id) {
                const l = this.getCurrentLeague();
                const b = l.bets.find(x => x.id === id);

                // --- 🛡️ INICIO BLOQUEO SEGURIDAD (NUEVO) ---
                // Si el usuario ya está en la lista de participantes:
                if (b.participants.includes(this.data.user)) {
                    document.getElementById('modal-action').classList.remove('hidden');
                    document.getElementById('action-title').innerText = "✅ Apuesta Realizada";
                    
                    // Recuperamos qué apostó para mostrárselo
                    let mySel = "Participando";
                    let myWager = b.amount; 

                    // Lógica para recuperar el texto según el tipo de apuesta
                    if (b.selections && b.selections[this.data.user]) {
                        if (b.type === 'bank') {
                            // En banca guardamos objeto {option, wager, odd}
                            const rec = b.selections[this.data.user];
                            mySel = `${rec.option} (x${rec.odd})`;
                            myWager = rec.wager;
                        } else {
                            // En las otras guardamos el string directo
                            mySel = b.selections[this.data.user];
                        }
                    }

                    // Pintamos el Ticket (Solo lectura)
                    document.getElementById('action-content').innerHTML = `
                        <div class="bg-slate-800 p-6 rounded-xl text-center border border-neonGreen/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col items-center gap-2 mt-2">
                            <div class="bg-neonGreen/20 text-neonGreen w-12 h-12 rounded-full flex items-center justify-center text-xl mb-1">
                                <i class="fa-solid fa-ticket"></i>
                            </div>
                            <div>
                                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Tu Selección</p>
                                <p class="text-xl text-white font-bold">${mySel}</p>
                            </div>
                            <div class="w-full h-px bg-slate-700 my-1"></div>
                            <div class="flex gap-2 items-center">
                                <span class="text-xs text-slate-400">Jugado:</span>
                                <span class="text-neonGreen font-mono font-bold text-lg">${myWager} 💰</span>
                            </div>
                        </div>
                        <p class="text-[10px] text-slate-500 text-center mt-6">
                            <i class="fa-solid fa-lock mr-1"></i> No puedes modificar tu apuesta.
                        </p>
                    `;

                    // Ocultamos los controles de entrada de datos y botones
                    document.getElementById('action-bet-input-container').classList.add('hidden');
                    document.getElementById('action-dynamic-list').innerHTML = '';
                    document.getElementById('action-dynamic-list').classList.add('hidden');
                    document.getElementById('action-confirm-btn').classList.add('hidden');
                    
                    return; // 🛑 ESTO DETIENE LA FUNCIÓN AQUÍ. IMPOSIBLE APOSTAR DOBLE.
                }
                // --- FIN BLOQUEO SEGURIDAD ---

                if (b.locked) return this.toast("⛔ Apuestas Cerradas", "error");

                // Restauramos visibilidad (por si el bloque de seguridad la ocultó antes)
                document.getElementById('action-content').innerHTML = ''; 
                document.getElementById('action-dynamic-list').classList.remove('hidden');
                document.getElementById('action-confirm-btn').classList.remove('hidden');

                // --- A PARTIR DE AQUÍ ES TU CÓDIGO ORIGINAL EXACTO ---
                document.getElementById('modal-action').classList.remove('hidden');
                document.getElementById('action-title').innerText = b.type === 'bank' ? "Apostar" : "Unirse";
                document.getElementById('action-content').innerText = b.type === 'bank' ? "Elige y pon cantidad:" : "Entrada: " + b.amount;
                
                const lst = document.getElementById('action-dynamic-list');
                lst.innerHTML = '';
                let s = null, odd = 0;
                
                const ic = document.getElementById('action-bet-input-container');
                const i = document.getElementById('action-bet-amount');
                const p = document.getElementById('action-potential-win');

                if (b.type === 'bank') {
                    ic.classList.remove('hidden');
                    i.value = '';
                    i.oninput = () => { const v = parseInt(i.value) || 0; if (s) p.innerText = "Ganarás: " + Math.floor(v * odd); };
                } else {
                    ic.classList.add('hidden');
                }

                (b.type === 'custom' || b.type === 'bank' ? b.options : []).forEach(opt => {
                    const d = document.createElement('div');
                    d.className = "bg-slate-700 p-3 rounded cursor-pointer hover:bg-slate-600 border border-transparent flex justify-between mb-1";
                    d.innerHTML = b.type === 'bank' ? `${opt} <span class="text-neonPurple font-bold">x${b.odds[opt]}</span>` : opt;
                    d.onclick = () => {
                        Array.from(lst.children).forEach(x => x.classList.remove('border-neonGreen', 'text-neonGreen'));
                        d.classList.add('border-neonGreen', 'text-neonGreen');
                        s = opt;
                        if (b.type === 'bank') { odd = b.odds[opt]; i.oninput(); }
                    };
                    lst.appendChild(d);
                });

                document.getElementById('action-confirm-btn').onclick = () => {
                    const c = b.type === 'bank' ? parseInt(i.value) : b.amount;
                    if (!c || c <= 0) return this.toast("Cantidad mal", "error");
                    if (l.members[this.data.user].balance < c) return this.toast("Sin saldo", "error");
                    if ((b.type === 'custom' || b.type === 'bank') && !s) return this.toast("Elige opción", "error");

                    l.members[this.data.user].balance -= c;
                    b.pot += c;

                    // HISTORIAL
                    this.addTransaction(l, this.data.user, 'bet', c, `Apuesta: ${b.title}`);

                    if (b.type === 'bank') {
                        if (!b.selections) b.selections = {};
                        b.selections[this.data.user] = { option: s, wager: c, odd: odd };
                        if (!b.participants.includes(this.data.user)) b.participants.push(this.data.user);
                    } else {
                        if (!b.selections) b.selections = {};
                        b.selections[this.data.user] = s;
                        if (!b.participants.includes(this.data.user)) b.participants.push(this.data.user);
                    }
                    this.saveLeagueToCloud(l);
                    this.closeModals();
                    this.renderDashboard();
                    this.toast("Hecho");
                };
            },
            resolveBetModal(id) {
                const l = this.getCurrentLeague();
                const b = l.bets.find(x => x.id === id);
                
                // --- PREPARAR INTERFAZ VISUAL ---
                document.getElementById('modal-action').classList.remove('hidden');
                document.getElementById('action-title').innerText = "Resolver Apuesta";
                document.getElementById('action-content').innerText = "¿Quién ha ganado?";
                document.getElementById('action-bet-input-container').classList.add('hidden');
                
                const lst = document.getElementById('action-dynamic-list');
                lst.innerHTML = '';
                let w = null; 

                // Mostrar opciones
                const ops = (b.type === 'bank' || b.type === 'custom') ? b.options : b.participants;
                ops.forEach(c => {
                    const btn = document.createElement('button');
                    btn.className = "w-full text-left bg-slate-700 p-3 rounded mb-2 hover:bg-slate-600 font-bold transition";
                    btn.innerText = c;
                    btn.onclick = () => {
                        w = c; 
                        lst.innerHTML = `<div class="text-center py-4 text-neonGreen text-xl font-bold border border-neonGreen rounded bg-slate-800 animate-pulse">Ganador: ${c}</div>`;
                    };
                    lst.appendChild(btn);
                });

                // --- ACCIÓN AL CONFIRMAR ---
                document.getElementById('action-confirm-btn').onclick = () => {
                    if (!w) return; 
                    
                    b.winningOption = w;
                    b.status = 'resolved';
b.resolvedTime = Date.now();
                    b.winner = w;
                    b.resolvedAt = Date.now();

                    // Función auxiliar de racha
                    const getStreak = (userId) => {
                        let streak = 0;
                        const myBets = l.bets.filter(bet => bet.status === 'resolved' && bet.id !== b.id && bet.type !== 'admin' && bet.participants.includes(userId));
                        myBets.sort((x, y) => y.resolvedAt - x.resolvedAt);
                        for (let bet of myBets) {
                            if (this.isUserWinner(bet, userId)) streak++;
                            else break; 
                        }
                        return streak;
                    };

                    // --- FUNCIÓN DE PAGO CON LÓGICA DE EMBARGO ---
                    const payUser = (userId, basePrize, bonusAmount, wagerPaid, concept) => {
                        const m = l.members[userId];
                        if (!m) return;
                        
                        if (!m.transactions) m.transactions = [];

                        // 1. INGRESO DEL PREMIO BASE
                        m.balance += basePrize;
                        m.transactions.unshift({
                            type: 'win',
                            amount: basePrize,
                            desc: concept,
                            date: new Date().toLocaleString(),
                            timestamp: Date.now()
                        });

                        // 2. INGRESO DEL BONUS (Si hay)
                        if (bonusAmount > 0) {
                            m.balance += bonusAmount;
                            m.transactions.unshift({
                                type: 'bonus',
                                amount: bonusAmount,
                                desc: `Bono Racha 🔥`,
                                date: new Date().toLocaleString(),
                                timestamp: Date.now() + 1
                            });
                        }

                        // 3. COBRO DE DEUDA (SISTEMA DE EMBARGO)
                        const totalIncome = basePrize + bonusAmount;
                        const profit = totalIncome - wagerPaid; // Beneficio neto real

                        if (profit > 0 && m.debt && m.debt > 0) {
                            
                            // LÓGICA CLAVE:
                            // Si está embargado (isGarnished) -> Cobramos 70% del beneficio.
                            // Si es deuda normal -> Intentamos cobrar el 100% del beneficio (comportamiento clásico).
                            let percentageToPay = m.isGarnished ? 0.70 : 1.0;
                            
                            let amountForDebt = Math.floor(profit * percentageToPay);
                            
                            // El pago real no puede superar lo que debe
                            const payment = Math.min(m.debt, amountForDebt);
                            
                            if (payment > 0) {
                                m.balance -= payment; 
                                m.debt -= payment;    
                                
                                // Si paga toda la deuda, es libre del embargo
                                if (m.debt <= 0) {
                                    m.debt = 0;
                                    if(m.isGarnished) {
                                        m.isGarnished = false;
                                        this.toast(`¡${m.nickname} ha salido de la bancarrota! 🎉`);
                                    }
                                }

                                m.transactions.unshift({
                                    type: 'debt_pay',
                                    amount: -payment,
                                    desc: m.isGarnished ? 'Cobro Embargo (70%) ⚖️' : 'Cobro Deuda (Beneficios) 🧾',
                                    date: new Date().toLocaleString(),
                                    timestamp: Date.now() + 2 
                                });
                                
                                if (m.isGarnished) {
                                    this.toast(`Embargo aplicado a beneficios: -${payment}`, 'info');
                                }
                            }
                        }
                    };
                    // ---------------------------------------------------------------

                    if (b.type === 'bank') {
                        // --- CONTRA LA BANCA ---
                        Object.keys(b.selections).forEach(u => {
                            const r = b.selections[u];
                            if (r && r.option === w && l.members[u]) {
                                let winAmount = Math.floor(r.wager * r.odd);
                                const currentStreak = getStreak(u);
                                let bonus = 0;
                                
                                if (currentStreak >= 3) {
                                    bonus = Math.floor(winAmount * 0.15);
                                    this.toast(`¡Bonus Racha (+${bonus}) para ${l.members[u].nickname}! 🔥`);
                                }
                                
                                // Pasamos winAmount y bonus SEPARADOS
                                payUser(u, winAmount, bonus, r.wager, `Victoria: ${b.title}`);
                            }
                        });
                    } else {
                        // --- ENTRE AMIGOS ---
                        let ws = [];
                        if (b.type === 'custom') ws = Object.entries(b.selections || {}).filter(([u, s]) => s === w).map(([u]) => u);
                        else ws = [w];

                        if (ws.length > 0) {
                            const p = Math.floor(b.pot / ws.length);
                            ws.forEach(x => {
                                if (l.members[x]) {
                                    const currentStreak = getStreak(x);
                                    let bonus = 0;
                                    
                                    if (currentStreak >= 3 && b.participants.length > 1) {
                                        bonus = Math.floor(p * 0.15);
                                        this.toast(`¡Bonus Racha (+${bonus}) para ${l.members[x].nickname}! 🔥`);
                                    }
                                    
                                    // Pasamos p (bote compartido) y bonus SEPARADOS
                                    payUser(x, p, bonus, b.wager, `Victoria: ${b.title}`);
                                }
                            });
                        } else {
                            // --- DEVOLUCIÓN ---
                            if (l.members[b.creator]) {
                                l.members[b.creator].balance += b.pot;
                                
                                if(!l.members[b.creator].transactions) l.members[b.creator].transactions = [];
                                l.members[b.creator].transactions.push({
                                    type: 'refund',
                                    amount: b.pot,
                                    desc: `Devolución: ${b.title}`,
                                    date: new Date().toLocaleString(),
                                    timestamp: Date.now()
                                });
                            }
                            b.winner = "Nadie (Devuelto)";
                        }
                    }

                    this.saveLeagueToCloud(l);
                    this.closeModals();
                    this.renderDashboard();
                    this.checkAndNotify(); 
                    this.toast("Apuesta resuelta correctamente");
                };
            },
            rejectBet(id) { const l=this.getCurrentLeague(); const b=l.bets.find(x=>x.id===id); if(!b.rejectedBy) b.rejectedBy=[]; b.rejectedBy.push(this.data.user); this.saveLeagueToCloud(l); this.renderDashboard(); this.toast("Ocultada"); },
            checkDailyBonusVisibility(l) { const b=document.getElementById('btn-header-daily'); if(!l.settings?.dailyBonus){ b.classList.add('hidden'); return; } b.classList.remove('hidden'); b.classList.add('flex'); const m=l.members[this.data.user]; const n=new Date(); const la=new Date(m.lastBonusDate||0); if(la.toDateString()!==n.toDateString()){ b.className="flex px-3 py-1.5 rounded-full text-xs font-bold items-center gap-1 transition active:scale-95 border border-white/20 bg-gradient-to-r from-pink-500 to-rose-500 text-white animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.5)] cursor-pointer"; b.innerHTML=`<i class="fa-solid fa-gift animate-bounce"></i> <span>RECLAMAR</span>`; b.onclick=()=>this.claimDailyBonus(); } else { b.className="flex px-3 py-1.5 rounded-full text-[10px] font-bold items-center gap-2 transition border border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed opacity-70"; b.onclick=null; const t=new Date(); t.setHours(24,0,0,0); const d=t-n; b.innerHTML=`<i class="fa-solid fa-check text-neonGreen"></i> <span>${Math.floor(d/3600000)}h ${Math.floor((d%3600000)/60000)}m</span>`; } },
            claimDailyBonus() {
                const l = this.getCurrentLeague();
                const me = this.data.user;
                const m = l.members[me];
                
                // 1. Validar Bono Configurado
                const bonus = l.settings.dailyBonus || 0;
                if (bonus === 0) return this.toast("Esta liga no tiene bono diario", "error");

                // 2. SUMA LIMPIA AL BOLSILLO (Sin pagar deudas)
                // El dinero entra directo para que pueda jugar, aunque deba millones.
                m.balance += bonus;
                m.lastBonusDate = Date.now();

                // 3. Registro en historial
                // Usamos 'transactions' para mantener consistencia con tu HTML
                if (!m.transactions) m.transactions = [];
                m.transactions.unshift({
                    type: 'bonus',
                    amount: bonus,
                    desc: 'Bono Diario 🎁',
                    date: new Date().toLocaleString(),
                    timestamp: Date.now()
                });

                this.saveLeagueToCloud(l);
                this.checkDailyBonusVisibility(l); 
                this.renderDashboard();
                this.toast(`Has recibido +${bonus} fichas. ¡Es tu oportunidad para remontar!`);
            },
            openLeagueSettings() { const l = this.getCurrentLeague(); const isCreator = l.creator === this.data.user; document.getElementById('settings-creator-options').classList.add('hidden'); document.getElementById('settings-member-options').classList.add('hidden'); document.getElementById('settings-transfer-list').classList.add('hidden'); if (isCreator) { document.getElementById('settings-creator-options').classList.remove('hidden'); } else { document.getElementById('settings-member-options').classList.remove('hidden'); } this.openModal('league-settings'); },
            openAdminPanel() { const l = this.getCurrentLeague(); const list = document.getElementById('admin-members-list'); list.innerHTML = ''; Object.keys(l.members).sort().forEach(u => { const m = this.getMember(l, u); const item = document.createElement('div'); item.className = "flex justify-between items-center p-3 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700 transition"; item.innerHTML = `<div class="flex items-center gap-3">${this.getAvatarHtml(m, 'sm')}<div><p class="text-sm font-bold text-white">${m.nickname}</p><p class="text-[10px] text-neonGreen font-mono">Saldo: ${m.balance}</p></div></div><i class="fa-solid fa-pen-to-square text-slate-400"></i>`; item.onclick = () => this.openAdminEditUser(u); list.appendChild(item); }); this.openModal('admin-panel'); },
           openAdminEditUser(u) { 
                this.data.editingUser = u; 
                document.getElementById('admin-edit-username').innerText = "@" + u; 
                document.getElementById('admin-balance-input').value = ''; 
                this.openModal('admin-edit-user'); 
            },
            adminUpdateBalance() {
                const amount = parseInt(document.getElementById('admin-balance-input').value);
                const user = this.data.editingUser;
                const l = this.getCurrentLeague();

                if (!amount || amount === 0) return this.toast("Introduce una cantidad válida", "error");

                if (l.members[user]) {
                    // 1. Actualizamos el saldo real
                    l.members[user].balance += amount;
                    if(l.members[user].balance < 0) l.members[user].balance = 0;

                    // 2. NUEVO: Guardar en el Monedero
                    if (!l.members[user].transactions) l.members[user].transactions = [];
                    l.members[user].transactions.push({
                        type: 'admin',
                        amount: amount,
                        desc: amount > 0 ? 'Ajuste Admin (Ingreso)' : 'Ajuste Admin (Retirada)',
                        date: new Date().toLocaleString(),
                        timestamp: Date.now()
                    });

                    // 3. Registro público (Log de apuestas)
                    const adminLog = { 
                        id: Date.now(), 
                        type: 'admin', 
                        creator: this.data.user, 
                        title: `Ajuste de Saldo: ${this.getMember(l, user).nickname}`, 
                        amount: Math.abs(amount), 
                        pot: 0, 
                        participants: [user], 
                        invites: [], 
                        status: 'resolved', 
                        resolvedAt: Date.now(), 
                        options: [], 
                        odds: {}, 
                        selections: {}, 
                        timestamp: new Date().toLocaleDateString(), 
                        winningOption: amount > 0 ? `+${amount} Fichas` : `${amount} Fichas` 
                    };
                    l.bets.unshift(adminLog);

                    // 4. Guardamos todo
                    this.saveLeagueToCloud(l);
                    this.toast(`Saldo actualizado: ${amount > 0 ? '+' : ''}${amount}`);
                    this.renderDashboard();
                    
                    // Refrescamos panel y cerramos modal
                    this.openAdminPanel();
                    document.getElementById('modal-admin-edit-user').classList.add('hidden');
                }
            },
            adminKickUser() { const user = this.data.editingUser; if (user === this.data.user) return this.toast("No puedes expulsarte a ti mismo", "error"); this.showConfirm(`¿Expulsar a ${user} de la liga? Perderá sus fichas.`, () => { const l = this.getCurrentLeague(); delete l.members[user]; this.saveLeagueToCloud(l); this.toast(`${user} expulsado`); this.openAdminPanel(); document.getElementById('modal-admin-edit-user').classList.add('hidden'); }); },
            deleteLeague() {
                this.showConfirm("¿Estás seguro? Se borrará la liga de la nube para TODOS.", () => {
                    const leagueId = String(this.data.currentLeagueId);
                    db.collection('leagues').doc(leagueId).delete()
                    .then(() => {
                        this.exitLeague();
                        this.toast("Liga eliminada de la nube");
                    })
                    .catch((error) => {
                        console.error("Error borrando:", error);
                        this.toast("Error al borrar", "error");
                    });
                });
            },
            leaveLeague() { this.showConfirm("¿Seguro que quieres salir de esta liga? Perderás tus fichas acumuladas.", () => { const l = this.getCurrentLeague(); delete l.members[this.data.user]; this.saveLeagueToCloud(l); this.exitLeague(); this.toast("Has abandonado la liga"); }); },
            showTransferList() { const l = this.getCurrentLeague(); const list = document.getElementById('transfer-members-container'); list.innerHTML = ''; const members = Object.keys(l.members).filter(u => u !== this.data.user); if (members.length === 0) { this.toast("No hay otros miembros para ceder el liderazgo.", "error"); return; } document.getElementById('settings-creator-options').classList.add('hidden'); document.getElementById('settings-transfer-list').classList.remove('hidden'); members.forEach(m => { const memData = this.getMember(l, m); const btn = document.createElement('button'); btn.className = "w-full flex items-center gap-3 p-2 rounded bg-slate-800 hover:bg-slate-700 transition"; btn.innerHTML = `${this.getAvatarHtml(memData, 'sm')} <span class="text-sm font-bold text-white">${memData.nickname}</span>`; btn.onclick = () => this.confirmTransferAndLeave(m); list.appendChild(btn); }); },
            confirmTransferAndLeave(newLeader) { this.showConfirm(`¿Hacer líder a ${newLeader} y salir de la liga?`, () => { const l = this.getCurrentLeague(); l.creator = newLeader; delete l.members[this.data.user]; this.saveLeagueToCloud(l); this.exitLeague(); this.toast(`Liderazgo transferido a ${newLeader}`); }); },

// --- NUEVAS FUNCIONES DE HISTORIAL ---
            
            // Función auxiliar para registrar movimientos
            addTransaction(l, user, type, amount, desc) {
                if (!l.members[user]) return;
                
                // CORRECCIÓN: Usamos 'transactions' para que coincida con la gráfica
                if (!l.members[user].transactions) l.members[user].transactions = [];

                // Añadimos el nuevo movimiento al principio
                l.members[user].transactions.unshift({
                    date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString().slice(0,5),
                    type: type,
                    amount: amount,
                    desc: desc,
                    timestamp: Date.now()
                });

                // LÍMITE DE 500
                const MAX_HISTORY = 500; 
                if (l.members[user].transactions.length > MAX_HISTORY) {
                    l.members[user].transactions = l.members[user].transactions.slice(0, MAX_HISTORY);
                }
            },

            // Función para mostrar la pantalla
            showHistory() {
                const l = this.getCurrentLeague();
                const m = this.getMember(l, this.data.user);
                const list = document.getElementById('history-list');
                const base = l.startBalance || 1000;
                
                list.innerHTML = '';
                
                // Ocultar saldo viejo si existe
                const oldBal = document.getElementById('history-current-balance');
                if(oldBal && oldBal.parentElement) oldBal.parentElement.style.display = 'none';

                // --- 1. CABECERA ---
                const infoContainer = document.createElement('div');
                infoContainer.className = "grid grid-cols-2 gap-3 mb-4 shrink-0"; 

                // Tarjeta Saldo
                infoContainer.innerHTML += `
                    <div class="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                        <div class="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1 z-10">Saldo Actual</div>
                        <div class="text-neonGreen font-mono text-2xl font-bold z-10 tracking-tight">${m.balance}</div>
                        <i class="fa-solid fa-wallet absolute -bottom-2 -right-2 text-4xl text-slate-700 opacity-30"></i>
                    </div>
                `;

                // Tarjeta Deuda
                if (m.debt && m.debt > 0) {
                    infoContainer.innerHTML += `
                        <div class="bg-danger/10 p-3 rounded-xl border border-danger/50 flex flex-col items-center justify-center animate-pulse relative overflow-hidden">
                            <div class="text-red-400 text-[9px] uppercase tracking-wider font-bold mb-1 z-10">Deuda Pendiente</div>
                            <div class="text-white font-mono text-2xl font-bold z-10 tracking-tight">-${m.debt}</div>
                            <i class="fa-solid fa-skull absolute -bottom-2 -right-2 text-4xl text-danger opacity-20"></i>
                        </div>
                    `;
                } else {
                    infoContainer.innerHTML += `
                        <div class="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center opacity-60">
                            <div class="text-slate-500 text-[9px] uppercase tracking-wider font-bold mb-1">Deuda</div>
                            <div class="text-slate-400 font-mono text-2xl font-bold">0</div>
                        </div>
                    `;
                }
                list.appendChild(infoContainer);

                // --- 2. LÓGICA DE BOTONES (CORREGIDA) ---
                
                const isPoor = m.balance < (base * 0.10); 
                const isRuined = m.balance < 10;          
                
                const maxPrincipal = Math.floor(base * 0.50);
                const currentDebt = m.debt || 0;
                
                // CÁLCULO CORREGIDO: Usamos la división entre 1.2
                const usedPrincipal = currentDebt / 1.2;
                const availableToBorrow = Math.floor(maxPrincipal - usedPrincipal);

                // CASO A: Pedir Préstamo
                if (isPoor && availableToBorrow > 10) {
                    const loanDiv = document.createElement('div');
                    loanDiv.className = "mb-4";
                    loanDiv.innerHTML = `
                        <button onclick="app.closeModals(); app.openLoanModal()" class="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-between group transition active:scale-95 border border-orange-400/50">
                            <div class="flex items-center gap-3">
                                <div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center">
                                    <i class="fa-solid fa-hand-holding-dollar"></i>
                                </div>
                                <div class="text-left leading-tight">
                                    <div class="text-xs text-orange-100 uppercase font-bold">Disponible: ${availableToBorrow}</div>
                                    <div class="text-sm">Pedir Préstamo</div>
                                </div>
                            </div>
                            <i class="fa-solid fa-chevron-right opacity-50 group-hover:translate-x-1 transition"></i>
                        </button>
                    `;
                    list.appendChild(loanDiv);
                }
                
                // CASO B: Rescate / Embargo
                else if (isRuined && availableToBorrow <= 10) {
                    const bailoutDiv = document.createElement('div');
                    bailoutDiv.className = "mb-4";
                    bailoutDiv.innerHTML = `
                        <button onclick="app.requestBailout()" class="w-full bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-between group transition active:scale-95 border border-red-500/50 animate-pulse">
                            <div class="flex items-center gap-3">
                                <div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-red-200">
                                    <i class="fa-solid fa-life-ring"></i>
                                </div>
                                <div class="text-left leading-tight">
                                    <div class="text-xs text-red-200 uppercase font-bold">Límite Agotado</div>
                                    <div class="text-sm">Pedir Rescate (Embargo)</div>
                                </div>
                            </div>
                            <i class="fa-solid fa-triangle-exclamation opacity-50"></i>
                        </button>
                    `;
                    list.appendChild(bailoutDiv);
                }

                // --- 3. LISTADO (IGUAL QUE SIEMPRE) ---
                const title = document.createElement('p');
                title.className = "text-[10px] text-slate-500 mb-2 uppercase font-bold shrink-0 ml-1";
                title.innerText = "Historial Reciente";
                list.appendChild(title);

                if (!m.transactions || m.transactions.length === 0) {
                    list.innerHTML += `<div class="text-center text-slate-500 py-8 text-xs italic">Sin movimientos aún.</div>`;
                } else {
                    const sorted = [...m.transactions].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
                    sorted.forEach(t => {
                        let icon = 'fa-circle'; let color = 'text-white'; let amountColor = 'text-white';
                        let absValue = Math.abs(t.amount); let sign = '+';
                        
                        if (t.type === 'bet' || t.type === 'debt_pay' || t.type === 'loss') sign = '-';
                        else if (t.type === 'admin') sign = t.amount < 0 ? '-' : '+';
                        else if (t.type === 'refund') sign = '+';

                        if (t.type === 'bet') { icon = 'fa-money-bill-transfer'; color = 'text-slate-400'; amountColor = 'text-red-400 opacity-90'; }
                        else if (t.type === 'win') { icon = 'fa-trophy'; color = 'text-gold'; amountColor = 'text-neonGreen'; }
                        else if (t.type === 'bonus') { icon = 'fa-fire'; color = 'text-orange-500'; amountColor = 'text-orange-400'; }
                        else if (t.type === 'debt_pay') { icon = 'fa-file-invoice-dollar'; color = 'text-red-500'; amountColor = 'text-red-400'; }
                        else if (t.type === 'loan') { icon = 'fa-hand-holding-dollar'; color = 'text-blue-400'; amountColor = 'text-blue-300'; }
                        else if (t.type === 'admin') { icon = 'fa-user-gear'; color = 'text-neonPurple'; amountColor = t.amount > 0 ? 'text-neonGreen' : 'text-red-400'; }
                        else if (t.type === 'refund') { icon = 'fa-rotate-left'; color = 'text-slate-400'; amountColor = 'text-blue-300'; }

                        const item = document.createElement('div');
                        item.className = "flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 mb-2 hover:bg-slate-800 transition";
                        item.innerHTML = `<div class="flex items-center gap-3 overflow-hidden"><div class="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700/50 ${color} shrink-0"><i class="fa-solid ${icon} text-xs"></i></div><div class="min-w-0"><p class="text-xs font-bold text-white leading-tight truncate pr-2">${t.desc}</p><p class="text-[9px] text-slate-500">${t.date}</p></div></div><span class="font-mono font-bold text-sm ${amountColor} shrink-0">${sign}${absValue}</span>`;
                        list.appendChild(item);
                    });
                }
                this.openModal('history');
            },
            renderLeaguesList() { 
                const l = document.getElementById('leagues-list'); 
                l.innerHTML = ''; 
                const my = this.data.leagues.filter(x => x.members[this.data.user]); 
                
                if (my.length === 0) { 
                    l.innerHTML = `<div class="text-center text-slate-500 py-4">No tienes ligas.</div>`; 
                    return; 
                } 
                
                my.forEach(x => { 
                    const m = this.getMember(x, this.data.user); 
                    
                    // 1. ORDENAR POR PATRIMONIO (Saldo - Deuda)
                    const sortedMembers = Object.keys(x.members).sort((a, b) => {
                        const mA = this.getMember(x, a);
                        const mB = this.getMember(x, b);
                        const netA = mA.balance - (mA.debt || 0);
                        const netB = mB.balance - (mB.debt || 0);
                        return netB - netA;
                    });

                    // 2. CALCULAR PUESTO
                    const rank = sortedMembers.indexOf(this.data.user) + 1;
                    
                    // 3. DIBUJAR TARJETA (Añadimos indicador de deuda si existe)
                    const debtDisplay = (m.debt && m.debt > 0) ? `<div class="text-[10px] text-danger font-mono text-right leading-none mb-1">-${m.debt} deuda</div>` : '';

                    l.innerHTML += `<div class="bg-card p-4 rounded-xl border border-slate-700 flex justify-between items-center cursor-pointer hover:border-neonPurple transition mb-3" onclick="app.selectLeague(${x.id})">
                        <div>
                            <h4 class="font-bold text-white text-lg">${x.name}</h4>
                            <p class="text-xs text-slate-400">Código: ${x.code}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-neonGreen font-mono font-bold text-xl mb-1 leading-none">${m.balance}</div>
                            ${debtDisplay}
                            <div class="text-gold text-xs font-bold flex items-center justify-end gap-1 mt-1"><i class="fa-solid fa-trophy"></i> #${rank}</div>
                        </div>
                    </div>`; 
                }); // Cierre del forEach
            } // Cierre de renderLeaguesList
        }; // Cierre del objeto app

        window.onload = () => app.init();
