import React, { useState, useEffect, useRef } from 'react';
import { generateSupervisorResponse } from './services/geminiService';
import { SensorData, Employee, MachineState, ChatMessage, SystemReport, SystemNotification } from './types';
import { SensorGauge } from './components/SensorGauge';
import { EmployeeCard } from './components/EmployeeCard';
import { 
  Power, 
  Send, 
  Cpu, 
  MessageSquare,
  FileText,
  User,
  ShieldCheck,
  UserCheck,
  Smartphone,
  Bell,
  X,
  Activity,
  Wifi,
  Zap,
  Server,
  BarChart3,
  Wrench,
  Trash2,
  HardHat,
  Leaf,
  AlertOctagon,
  Container, // Ícone do Tanque
  Fuel       // Ícone de Abastecer
} from 'lucide-react';

// --- INITIAL DATA ---
const INITIAL_SENSORS: SensorData[] = [
  { name: "Temperatura", min: 10, max: 80, current: 35, unit: "°C", status: 'OK', lastUpdated: '' },
  { name: "Pressão", min: 0.5, max: 3.0, current: 1.2, unit: "Bar", status: 'OK', lastUpdated: '' },
  { name: "Vibração", min: 0.0, max: 12.0, current: 2.5, unit: "mm/s", status: 'OK', lastUpdated: '' },
  { name: "Dosagem", min: 1, max: 400, current: 150, unit: "mL", status: 'OK', lastUpdated: '' },
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: "Maria", clockIn: "07:58", clockOut: "17:02", status: 'OFF_SHIFT' },
  { id: '2', name: "João", clockIn: "08:10", clockOut: null, status: 'MISSING_EXIT' },
  { id: '3', name: "Carlos", clockIn: null, clockOut: null, status: 'OFF_SHIFT' },
  { id: '4', name: "Pedro", clockIn: "22:00", clockOut: null, status: 'ACTIVE' },
];

const PRE_CANNED_REPORTS: SystemReport[] = [
  {
    id: "hist-1",
    title: "Relatório de Ponto - Turno Anterior",
    type: "RH",
    timestamp: new Date(Date.now() - 3600000 * 4), // 4 horas atrás
    content: "**ANÁLISE DE FREQUÊNCIA (06:00 - 14:00)**\n\n- **Maria:** Ponto regular. Sem ocorrências.\n- **João:** Falha no registro de saída às 14:00.\n**Ação:** Notificação enviada. Necessário ajuste manual.\n**Impacto:** Risco de inconsistência na folha."
  },
  {
    id: "hist-2",
    title: "Consumo de Insumos (Diário)",
    type: "FINANCEIRO",
    timestamp: new Date(Date.now() - 3600000 * 2),
    content: "**BALANÇO DE MATÉRIA-PRIMA**\n\n- **Consumo Total:** 450 Litros\n- **Desperdício Estimado:** 2.3% (Variação de Dosagem)\n- **Custo do Desperdício:** R$ 145,00\n\n**Observação:** Recomenda-se calibração da bomba dosadora B-04."
  },
  {
    id: "hist-3",
    title: "Previsão de Manutenção",
    type: "PREVISAO",
    timestamp: new Date(),
    content: "**ANÁLISE PREDITIVA (24h)**\n\n- **Risco de Falha:** BAIXO\n- **Componente Crítico:** Rolamento do Motor Principal (Vibração em leve alta).\n- **Recomendação:** Lubrificação programada para o próximo turno."
  }
];

const QUICK_COMMANDS = [
  { icon: Wrench, label: "Diagnóstico", cmd: "Realizar diagnóstico completo do sistema" },
  { icon: User, label: "Funcionários", cmd: "Gerar relatório detalhado dos funcionários e pontos" },
  { icon: HardHat, label: "Segurança", cmd: "Verificar status de EPIs e riscos" },
  { icon: Activity, label: "Previsão", cmd: "Previsão de falhas para as próximas 24h" },
];

export default function App() {
  // State
  const [machine, setMachine] = useState<MachineState>({
    isOn: false,
    lastToggleTime: new Date(),
    totalDowntimeSeconds: 0,
    productionLoss: 0,
    isAutoCorrecting: false,
    autoCorrectionStartTime: 0,
    refillTimer: 40, // Começa com 40s (Simulando tanque quase vazio ao ligar)
    autoCorrectionAttempts: 0
  });

  const [sensors, setSensors] = useState<SensorData[]>(INITIAL_SENSORS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  
  // Simulation State
  const [gracePeriodEnd, setGracePeriodEnd] = useState<number>(0);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat');
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { 
      id: '0', 
      role: 'model', 
      text: 'Nexus IA online.\n\nPosso gerar os seguintes relatórios:\n1. 📋 Status Geral\n2. 💰 Impacto Financeiro\n3. 👥 Funcionários & RH\n4. 🔮 Previsão de Falhas\n\nQual deseja visualizar?', 
      timestamp: new Date() 
    }
  ]);
  const [reports, setReports] = useState<SystemReport[]>(PRE_CANNED_REPORTS);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Neural Monitor State
  const [neuralLoad, setNeuralLoad] = useState(12);
  const [networkLatency, setNetworkLatency] = useState(24);

  // Initial Alert Check
  useEffect(() => {
    const hasInitialError = employees.some(e => e.status === 'MISSING_EXIT');
    if (hasInitialError) {
      addNotification("ALERTA: Ponto pendente detectado (João). Notificação enviada ao supervisor.", 'ALERT');
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  const addNotification = (msg: string, type: 'INFO' | 'ALERT' | 'SUCCESS' = 'INFO') => {
    const newNotif = { id: Date.now().toString(), message: msg, type };
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 6000);
  };

  const handleEmergencyShutdown = (reason: string) => {
    setMachine(prev => ({ 
      ...prev, 
      isOn: false, 
      isAutoCorrecting: false, 
      autoCorrectionStartTime: 0 
    }));
    
    setSensors(prev => prev.map(s => ({ ...s, current: 0, status: 'OK' })));

    const emergencyReport: SystemReport = {
      id: Date.now().toString(),
      title: `DESLIGAMENTO DE EMERGÊNCIA - ${new Date().toLocaleTimeString('pt-BR')}`,
      type: 'INCIDENTE',
      timestamp: new Date(),
      content: `**CRITICIDADE MÁXIMA DETECTADA**\n\n**CAUSA:** ${reason}\n**AÇÃO:** Corte de energia imediato.\n**STATUS:** Máquina parada. Reinício manual obrigatório.`
    };
    setReports(prev => [emergencyReport, ...prev]);
    setActiveTab('reports');
    
    addNotification(`FALHA CRÍTICA: ${reason}. Desligamento acionado.`, 'ALERT');
    
    setChatHistory(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'system', 
      text: `NEXUS: Protocolo de emergência executado. Motivo: ${reason}.`, 
      timestamp: new Date() 
    }]);
  };

  const handleRefill = () => {
      setMachine(prev => ({ ...prev, refillTimer: 720 })); // Reseta para 12 minutos (720s)
      addNotification("Abastecimento confirmado. Tanque 100%.", 'SUCCESS');
      
      // Log do abastecimento
      setChatHistory(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        text: `NEXUS: Registro de abastecimento de insumo confirmado pelo operador às ${new Date().toLocaleTimeString('pt-BR')}.`, 
        timestamp: new Date() 
      }]);
  };

  // --- SIMULATION LOOP ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const isGracePeriod = now < gracePeriodEnd;

      setNeuralLoad(prev => Math.max(5, Math.min(98, prev + (Math.random() - 0.5) * 10)));
      setNetworkLatency(prev => Math.max(10, Math.min(150, prev + (Math.random() - 0.5) * 20)));

      // 1. Machine Logic
      if (machine.isOn) {
        
        // --- TANK LOGIC ---
        setMachine(prev => {
           const newTimer = prev.refillTimer - 1;
           if (newTimer <= 0) {
               // Falha por falta de insumo (será tratado abaixo)
               return { ...prev, refillTimer: 0 };
           }
           return { ...prev, refillTimer: newTimer };
        });

        if (machine.refillTimer <= 0) {
            handleEmergencyShutdown("Falta de Insumo (Tanque Vazio)");
            // Zera dosagem visualmente
            setSensors(prev => prev.map(s => s.name === "Dosagem" ? { ...s, current: 0, status: 'CRITICAL' } : s));
            return; // Sai do loop
        }

        // --- SENSOR UPDATES ---
        let criticalSensors: string[] = [];
        
        setSensors(prev => {
          return prev.map(s => {
            let change = (Math.random() - 0.5) * 2; 

            // Se auto-corrigindo, força valores para o ideal
            if (machine.isAutoCorrecting) {
               const ideal = (s.min + s.max) / 2;
               change = (ideal - s.current) * 0.3; 
            } else if (!isGracePeriod && Math.random() < 0.08) {
               change += (Math.random() * 25); // Pico aleatório
            }

            let newVal = Math.max(0, s.current + change);
            
            if (isGracePeriod) {
               const ideal = (s.min + s.max) / 2;
               newVal = s.current + (ideal - s.current) * 0.1;
            }

            let newStatus: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
            
            if (!isGracePeriod) {
              if (newVal < s.min || newVal > s.max) {
                newStatus = 'CRITICAL';
              }
              else if (newVal < s.min * 1.1 || newVal > s.max * 0.9) newStatus = 'WARNING';
            }

            return {
              ...s,
              current: newVal,
              status: newStatus,
              lastUpdated: new Date().toLocaleTimeString('pt-BR')
            };
          });
        });

        // --- CHECK CRITICALS ---
        const currentCriticals = sensors.filter(s => 
          s.status === 'CRITICAL' && 
          ['Temperatura', 'Pressão', 'Vibração'].includes(s.name)
        );

        if (currentCriticals.length > 0) {
           
           if (!machine.isAutoCorrecting) {
             // INICIAR AUTO CORREÇÃO
             if (machine.autoCorrectionAttempts >= 3) {
                 // Limite de 3 tentativas excedido
                 handleEmergencyShutdown("Falha Sistêmica (Limite de 3 Auto-correções excedido)");
             } else {
                 setMachine(prev => ({
                   ...prev,
                   isAutoCorrecting: true,
                   autoCorrectionStartTime: Date.now(),
                   autoCorrectionAttempts: prev.autoCorrectionAttempts + 1
                 }));
                 addNotification(`ANOMALIA DETECTADA. Tentativa de auto-correção ${machine.autoCorrectionAttempts + 1}/3...`, 'ALERT');
             }

           } else {
             // JÁ ESTÁ CORRIGINDO - VERIFICAR TEMPO (1s)
             const elapsed = Date.now() - machine.autoCorrectionStartTime;
             if (elapsed > 1500) { 
                // Tempo esgotou e ainda está crítico -> Desliga
                handleEmergencyShutdown(`Correção falhou para: ${currentCriticals.map(s => s.name).join(', ')}`);
             }
           }
        } else {
           // Se estava corrigindo e limpou os erros -> Sucesso
           if (machine.isAutoCorrecting) {
              setMachine(prev => ({
                ...prev,
                isAutoCorrecting: false,
                autoCorrectionStartTime: 0
              }));
              addNotification("SISTEMA ESTABILIZADO. Auto-correção bem sucedida.", 'SUCCESS');
           }
        }

      } else {
        // Máquina PARADA
        setMachine(prev => ({
          ...prev,
          totalDowntimeSeconds: prev.totalDowntimeSeconds + 1,
          productionLoss: prev.productionLoss + 0.85 
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [machine.isOn, machine.isAutoCorrecting, machine.autoCorrectionStartTime, machine.refillTimer, machine.autoCorrectionAttempts, sensors, gracePeriodEnd]);

  // --- HANDLERS ---
  const togglePower = () => {
    if (machine.isOn) {
      const correctionReport: SystemReport = {
        id: Date.now().toString(),
        title: `Parada Manual - ${new Date().toLocaleTimeString('pt-BR')}`,
        content: `**REGISTRO DE OPERAÇÃO**\n\nO operador solicitou parada manual da linha.\nOs contadores de tentativa de correção foram resetados.\nO sistema aguarda nova inicialização.`,
        timestamp: new Date(),
        type: 'GERAL'
      };
      setReports(prev => [correctionReport, ...prev]);
      
      setSensors(INITIAL_SENSORS.map(s => ({
        ...s,
        current: (s.min + s.max) / 2,
        status: 'OK'
      })));

      setMachine(prev => ({ ...prev, isOn: false, isAutoCorrecting: false, autoCorrectionAttempts: 0 }));
      addNotification("Máquina parada manualmente. Logs salvos.", 'INFO');

    } else {
      setGracePeriodEnd(Date.now() + 25000); // 25s de estabilização
      setMachine(prev => ({ ...prev, isOn: true, isAutoCorrecting: false, autoCorrectionAttempts: 0 }));
      addNotification("Inicializando motor. Estabilização de 25s iniciada.", 'SUCCESS');

      setChatHistory(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        text: "NEXUS: Inicializando... Modo de Segurança ativo por 25 segundos.", 
        timestamp: new Date() 
      }]);
    }
  };

  const handleCorrectEmployees = () => {
    const issues = employees.filter(e => e.status === 'MISSING_EXIT');
    if (issues.length === 0) return;

    setEmployees(prev => prev.map(e => {
        if (e.status === 'MISSING_EXIT') {
            return { 
                ...e, 
                status: 'OFF_SHIFT',
                clockOut: "17:00 (Ajuste Manual)"
            };
        }
        return e;
    }));

    addNotification(`Ponto corrigido manualmente. Gerência notificada via Mobile.`, 'SUCCESS');
    
    const rhReport: SystemReport = {
        id: Date.now().toString(),
        title: `Correção de Ponto - ${new Date().toLocaleTimeString('pt-BR')}`,
        type: 'RH',
        timestamp: new Date(),
        content: `**REGISTRO DE AJUSTE MANUAL**\n\n- **Funcionário(s):** ${issues.map(i => i.name).join(', ')}\n- **Motivo:** Falha de registro na saída.\n- **Ação:** Horário ajustado para 17:00.\n- **Notificação:** Enviada ao funcionário e RH.`
    };
    setReports(prev => [rhReport, ...prev]);
  };

  const clearChat = () => {
      setChatHistory([
        { 
          id: Date.now().toString(), 
          role: 'model', 
          text: 'Nexus IA reiniciada.\n\nPosso gerar os seguintes relatórios:\n1. 📋 Status Geral\n2. 💰 Impacto Financeiro\n3. 👥 Funcionários & RH\n4. 🔮 Previsão de Falhas\n\nQual deseja visualizar?', 
          timestamp: new Date() 
        }
      ]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage('');
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setIsTyping(true);

    setNeuralLoad(85); // Simula carga

    const responseText = await generateSupervisorResponse(
      userText,
      machine,
      sensors,
      employees,
      [] 
    );

    setIsTyping(false);
    setNeuralLoad(15); 
    
    const lowerText = userText.toLowerCase();
    let reportType: 'GERAL' | 'FINANCEIRO' | 'RH' | 'PREVISAO' = 'GERAL';
    if (lowerText.includes('financeiro') || lowerText.includes('custo')) reportType = 'FINANCEIRO';
    else if (lowerText.includes('ponto') || lowerText.includes('funcionario') || lowerText.includes('rh')) reportType = 'RH';
    else if (lowerText.includes('previsão') || lowerText.includes('futuro')) reportType = 'PREVISAO';

    // Se for um "Oi" ou pedido de menu, não gera relatório como arquivo, apenas responde no chat.
    // Se tiver "relatório" ou for longo, gera o arquivo na aba lateral.
    const isGreeting = ['oi', 'ola', 'olá', 'bom dia', 'boa tarde', 'menu', 'ajuda'].includes(lowerText.trim());
    const isReportRequest = lowerText.includes('relatório') || lowerText.includes('analise') || lowerText.includes('status');

    if (!isGreeting && (isReportRequest || responseText.length > 250)) {
      const newReport: SystemReport = {
        id: Date.now().toString(),
        title: `Relatório Inteligente - ${reportType}`,
        content: responseText,
        timestamp: new Date(),
        type: reportType
      };
      setReports(prev => [newReport, ...prev]);
      
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'system',
        text: `📄 Relatório de ${reportType} gerado e arquivado.`,
        timestamp: new Date()
      }]);
    } else {
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  const getMachineRiskStatus = () => {
    if (!machine.isOn) return { label: 'PARADA', color: 'text-slate-500' };
    if (machine.isAutoCorrecting) return { label: 'AUTO-CORREÇÃO', color: 'text-orange-400 animate-pulse' };

    const criticalSensors = sensors.filter(s => s.status === 'CRITICAL');
    if (criticalSensors.length > 0) return { label: 'CRÍTICO', color: 'text-red-500 animate-pulse' };
    
    // Alerta de tanque baixo (ajustado para proporção de 720s, alerta se < 40s)
    if (machine.refillTimer < 40) return { label: 'INSUMO BAIXO', color: 'text-yellow-400 animate-pulse' };

    return { label: 'NORMAL', color: 'text-emerald-500' };
  };

  const machineRisk = getMachineRiskStatus();
  
  // Calcula porcentagem do tanque (Base 720s - 12 minutos)
  const tankPercent = Math.max(0, Math.min(100, (machine.refillTimer / 720) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 font-sans relative">
      
      {/* NOTIFICATION TOAST AREA */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 md:px-0">
        {notifications.map(n => (
          <div key={n.id} className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-2xl border backdrop-blur-md animate-in slide-in-from-right-full transition-all duration-300 ${
            n.type === 'ALERT' ? 'bg-red-950/90 border-red-500 text-white' : 
            n.type === 'SUCCESS' ? 'bg-emerald-950/90 border-emerald-500 text-white' : 
            'bg-slate-800/90 border-slate-600 text-slate-200'
          }`}>
             {n.type === 'ALERT' ? <Smartphone className="animate-pulse text-red-400 shrink-0" /> : 
              n.type === 'SUCCESS' ? <ShieldCheck className="text-emerald-400 shrink-0" /> : 
              <Bell className="text-blue-400 shrink-0" />}
             <div className="flex-1 min-w-0">
               <h4 className="font-bold text-sm uppercase mb-1">{n.type === 'ALERT' ? 'Alerta Remoto Enviado' : 'Notificação de Sistema'}</h4>
               <p className="text-xs opacity-90 break-words">{n.message}</p>
             </div>
             <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="text-white/50 hover:text-white">
               <X size={14} />
             </button>
          </div>
        ))}
      </div>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b border-slate-800 gap-4 md:gap-0">
        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50 relative overflow-hidden group">
            <Cpu className="text-white relative z-10" size={24} />
            <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-30 transition-opacity"></div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">NEXUS IA</h1>
            <p className="text-xs text-blue-400 font-mono tracking-widest">SISTEMA SUPERVISÓRIO v3.3</p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-center md:justify-end">
          <div className="text-center md:text-right">
             <p className="text-xs text-slate-500 uppercase font-bold">Risco Máquina</p>
             <p className={`font-mono font-bold ${machineRisk.color}`}>
               {machineRisk.label}
             </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-140px)]">
        
        {/* LEFT COLUMN: Controls & Sensors */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:overflow-y-auto scrollbar-hide lg:pr-2 pb-4 lg:pb-0">
          
          {/* Main Status Card */}
          <div className={`bg-slate-900/50 rounded-2xl border ${machine.isAutoCorrecting ? 'border-orange-500 shadow-orange-900/20' : 'border-slate-800'} p-6 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-sm relative overflow-hidden transition-colors duration-300`}>
             <div className={`absolute top-0 left-0 w-1 h-full ${machine.isOn ? (machine.isAutoCorrecting ? 'bg-orange-500' : 'bg-emerald-500') : 'bg-red-500'}`}></div>
             <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${
                  machine.isOn 
                    ? (machine.isAutoCorrecting ? 'bg-orange-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]')
                    : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                }`}></div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold text-white">Status: {
                      !machine.isOn ? "PARADA" : 
                      machine.isAutoCorrecting ? `AUTO-CORREÇÃO (${machine.autoCorrectionAttempts}/3)` : 
                      "OPERANDO"
                    }</h2>
                    {gracePeriodEnd > Date.now() && machine.isOn && (
                      <span className="text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-900 animate-pulse whitespace-nowrap">
                        Estabilizando (25s)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {machine.isOn 
                      ? (machine.isAutoCorrecting ? "Tentando estabilizar sensores..." : "Sistemas nominais.") 
                      : "Produção interrompida."}
                  </p>
                </div>
             </div>
             
             <div className="flex items-center gap-3 w-full md:w-auto">
               <button 
                 onClick={togglePower}
                 className={`flex-1 md:flex-none justify-center flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 transform active:scale-95 shadow-lg ${machine.isOn ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-900/20' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/20'}`}
               >
                 <Power size={20} />
                 {machine.isOn ? "PARADA MANUAL" : "INICIAR MÁQUINA"}
               </button>
             </div>
          </div>

          {/* Sensor Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sensors.map((s) => (
              <SensorGauge key={s.name} data={s} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TANK / REFILL PANEL */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                        <Container size={18} className="text-blue-400"/> Tanque de Insumo
                    </h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${tankPercent < 20 ? 'bg-red-950 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                        {machine.refillTimer}s restantes
                    </span>
                 </div>
                 
                 <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Nível Atual</span>
                        <span>{tankPercent.toFixed(0)}%</span>
                    </div>
                    <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div 
                            className={`h-full transition-all duration-500 ${tankPercent < 10 ? 'bg-red-500' : tankPercent < 40 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                            style={{ width: `${tankPercent}%` }}
                        ></div>
                    </div>
                 </div>

                 <button 
                    onClick={handleRefill}
                    disabled={!machine.isOn || machine.refillTimer > 710} // Só permite reabastecer se não estiver cheio
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 rounded-lg transition-colors border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <Fuel size={16} />
                    Confirmar Abastecimento (12min)
                 </button>
              </div>

              {/* Neural Monitor */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 relative overflow-hidden">
                 <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                        <Activity size={18} className="text-emerald-400"/> Rede Neural
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Wifi size={12} /> {networkLatency}ms
                    </div>
                 </div>
                 <div className="relative z-10 flex items-center gap-4">
                     <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-slate-800"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin"></div>
                        <span className="text-lg font-bold text-white">{neuralLoad.toFixed(0)}%</span>
                     </div>
                     <div className="text-xs text-slate-400">
                        <p>Processamento de IA</p>
                        <p className="text-emerald-400 font-bold">Otimizado</p>
                     </div>
                 </div>
                 <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
              </div>

          </div>

          {/* Employee Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <User size={18} className="text-purple-400"/> Monitoramento de Equipe
                </h3>
                {employees.some(e => e.status === 'MISSING_EXIT') && (
                    <button 
                        onClick={handleCorrectEmployees}
                        className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                    >
                        <UserCheck size={14} />
                        Corrigir Ponto & Notificar
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map(e => (
                <EmployeeCard key={e.id} employee={e} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Chat & Reports */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 flex flex-col shadow-xl overflow-hidden min-h-[500px] lg:h-auto">
          {/* Header & Tabs */}
          <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="p-4 pb-2">
               <h3 className="font-bold text-white flex items-center gap-2 mb-1">
                <MessageSquare size={18} className="text-emerald-400" />
                NEXUS IA
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Interface Neural v3.3</p>
            </div>
            
            <div className="flex px-2 gap-1">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === 'chat' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Chat ao Vivo
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={`flex-1 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${activeTab === 'reports' ? 'border-blue-500 text-blue-400 bg-blue-950/20' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Relatórios ({reports.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden relative">
            
            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm scrollbar-thin scrollbar-thumb-slate-700">
                  {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-lg p-3 ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : msg.role === 'system'
                          ? 'bg-slate-800 text-slate-400 text-xs italic border border-slate-700 text-center w-full'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[10px] opacity-50 block mt-2 text-right">
                          {msg.timestamp.toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {QUICK_COMMANDS.map((cmd, i) => (
                        <button 
                          key={i}
                          onClick={() => setInputMessage(cmd.cmd)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors shrink-0 group"
                        >
                          <cmd.icon size={14} className="text-blue-400 group-hover:text-white" />
                          <span className="text-xs text-slate-300 font-medium whitespace-nowrap">{cmd.label}</span>
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={clearChat}
                      className="flex items-center justify-center w-9 h-9 bg-red-950/30 hover:bg-red-900/50 rounded-lg border border-red-900/50 transition-colors shrink-0 mb-2"
                      title="Limpar Histórico"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Comando para Nexus..."
                      className="w-full bg-slate-950 text-slate-200 rounded-xl border border-slate-700 py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600 font-mono text-sm"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      className="absolute right-2 top-2 p-1.5 bg-emerald-600 rounded-lg text-white hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* REPORTS TAB */}
            {activeTab === 'reports' && (
              <div className="h-full overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                {reports.length === 0 ? (
                  <div className="text-center text-slate-500 mt-10">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhum relatório gerado ainda.</p>
                  </div>
                ) : (
                  reports.map(report => (
                    <div key={report.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-blue-500/50 transition-colors animate-in fade-in slide-in-from-right-4">
                       <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-700">
                          <div className="flex items-center gap-2">
                             <div className={`p-1.5 rounded-lg ${report.type === 'RH' ? 'bg-purple-900/50 text-purple-400' : report.type === 'FINANCEIRO' ? 'bg-green-900/50 text-green-400' : report.type === 'INCIDENTE' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>
                               {report.type === 'RH' ? <User size={14} /> : report.type === 'FINANCEIRO' ? <BarChart3 size={14} /> : <FileText size={14} />}
                             </div>
                             <div>
                                <h4 className={`font-bold text-sm ${report.type === 'RH' ? 'text-purple-400' : report.type === 'FINANCEIRO' ? 'text-green-400' : report.type === 'INCIDENTE' ? 'text-red-400' : 'text-blue-400'}`}>
                                  {report.title}
                                </h4>
                                <span className="text-[10px] text-slate-500">{report.timestamp.toLocaleString('pt-BR')}</span>
                             </div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded border font-bold ${
                            report.type === 'RH' ? 'bg-purple-950 border-purple-900 text-purple-400' : 
                            report.type === 'FINANCEIRO' ? 'bg-green-950 border-green-900 text-green-400' : 
                            report.type === 'INCIDENTE' ? 'bg-red-950 border-red-900 text-red-400' :
                            'bg-blue-950 border-blue-900 text-blue-400'
                          }`}>{report.type}</span>
                       </div>
                       <div className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                         {report.content}
                       </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}