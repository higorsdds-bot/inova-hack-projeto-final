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
  AlertOctagon
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
    title: "Relatório de Ponto - Semana Anterior",
    type: "RH",
    timestamp: new Date(Date.now() - 86400000 * 2),
    content: "**ANÁLISE DE FREQUÊNCIA**\n\n- **Maria:** 100% de pontualidade. Sem horas extras.\n- **João:** 2 ocorrências de esquecimento de ponto. Impacto: Risco trabalhista leve.\n- **Carlos:** Férias regulamentares.\n- **Pedro:** Adicional noturno contabilizado (Escala 12x36).\n\n**Conclusão:** Equipe operando dentro da normalidade, exceto pelas pendências de registro manual de João."
  },
  {
    id: "hist-2",
    title: "Análise de Produtividade Mensal",
    type: "FINANCEIRO",
    timestamp: new Date(Date.now() - 86400000 * 5),
    content: "**ANÁLISE FINANCEIRA**\n\n- **Produção Bruta:** 98.5%\n- **Perdas:** R$ 1.240,00 (Variação de Dosagem)\n\n**Ação Recomendada:** Calibração dos sensores de dosagem para evitar desperdício de matéria-prima."
  },
  {
    id: "hist-3",
    title: "Registro de Turno Noturno",
    type: "RH",
    timestamp: new Date(),
    content: "**STATUS ATUAL**\n\n- **Funcionário:** Pedro\n- **Horário de Entrada:** 22:00\n- **Atividade:** Monitoramento Supervisório\n\n**OBSERVAÇÃO:** Colaborador ativo e cobrindo turno da noite. Adicional noturno vigente."
  }
];

const QUICK_COMMANDS = [
  { icon: Wrench, label: "Diagnóstico", cmd: "Realizar diagnóstico completo do sistema" },
  { icon: HardHat, label: "Segurança", cmd: "Verificar status de EPIs e riscos" },
  { icon: Leaf, label: "Energia", cmd: "Análise de eficiência energética" },
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
    autoCorrectionStartTime: 0
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
    { id: '0', role: 'model', text: 'Nexus IA online. Sistemas nominais. Aguardando comando para análise.', timestamp: new Date() }
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
    
    // Reset Sensors visually
    setSensors(prev => prev.map(s => ({ ...s, current: 0, status: 'OK' })));

    // Report
    const emergencyReport: SystemReport = {
      id: Date.now().toString(),
      title: `DESLIGAMENTO DE EMERGÊNCIA - ${new Date().toLocaleTimeString('pt-BR')}`,
      type: 'INCIDENTE',
      timestamp: new Date(),
      content: `**CRITICIDADE MÁXIMA DETECTADA**\n\n**CAUSA:** ${reason}\n**FALHA:** A auto-correção automática não conseguiu estabilizar os níveis em 1s.\n**AÇÃO:** Corte de energia imediato para preservação do equipamento.\n**IMPACTO:** Parada total da linha.`
    };
    setReports(prev => [emergencyReport, ...prev]);
    setActiveTab('reports');
    
    addNotification(`FALHA CRÍTICA: ${reason}. Desligamento de emergência acionado.`, 'ALERT');
    
    setChatHistory(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'system', 
      text: "NEXUS: Protocolo de emergência executado. Auto-correção falhou. Máquina desligada.", 
      timestamp: new Date() 
    }]);
  };

  // --- SIMULATION LOOP ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const isGracePeriod = now < gracePeriodEnd;

      // Simulate Neural Load fluctuations
      setNeuralLoad(prev => Math.max(5, Math.min(98, prev + (Math.random() - 0.5) * 10)));
      setNetworkLatency(prev => Math.max(10, Math.min(150, prev + (Math.random() - 0.5) * 20)));

      // 1. Machine Logic
      if (machine.isOn) {
        
        // --- SENSOR UPDATES ---
        let criticalSensors: string[] = [];
        
        setSensors(prev => {
          return prev.map(s => {
            let change = (Math.random() - 0.5) * 2; 

            // If auto-correcting, try to force values back to mean (Damping)
            if (machine.isAutoCorrecting) {
               const ideal = (s.min + s.max) / 2;
               // Strong pull towards ideal value
               change = (ideal - s.current) * 0.3; 
            } else if (!isGracePeriod && Math.random() < 0.08) {
               change += (Math.random() * 25); // Random spike
            }

            let newVal = Math.max(0, s.current + change);
            
            // Grace period logic
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

        // --- CHECK FOR CRITICAL STATE AFTER UPDATE ---
        // We need to check the state we just calculated. 
        // Since setState is async, we'll do a "look-ahead" check or rely on the previous cycle's effect if using refs, 
        // but here we can iterate the sensors state in the next tick. 
        // Simpler approach: Check current sensors state inside the SetInterval before update? No, check updated values.
        
        // Since we can't access the *just set* state immediately, we will use a functional update for logic
        // or check the *previous* state at the start of the next interval.
        // Let's check `sensors` state which is from the *last* render.
        
        const currentCriticals = sensors.filter(s => 
          s.status === 'CRITICAL' && 
          ['Temperatura', 'Pressão', 'Vibração'].includes(s.name)
        );

        if (currentCriticals.length > 0) {
           
           if (!machine.isAutoCorrecting) {
             // START AUTO CORRECTION
             setMachine(prev => ({
               ...prev,
               isAutoCorrecting: true,
               autoCorrectionStartTime: Date.now()
             }));
             addNotification(`ANOMALIA DETECTADA (${currentCriticals.map(s=>s.name).join(', ')}). Tentando auto-correção (1s)...`, 'ALERT');
             setChatHistory(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'system', 
                text: "NEXUS: Iniciando sub-rotina de estabilização autônoma...", 
                timestamp: new Date() 
             }]);

           } else {
             // ALREADY AUTO CORRECTING - CHECK TIME
             const elapsed = Date.now() - machine.autoCorrectionStartTime;
             if (elapsed > 1500) { // Giving it ~1.5s (allow 1 tick buffer over 1s)
                // TIME IS UP. DID IT FIX?
                // If we are here, `currentCriticals` is still > 0 based on the last render.
                // Emergency Shutdown.
                handleEmergencyShutdown(`Falha Crítica persistente em: ${currentCriticals.map(s => s.name).join(', ')}`);
             }
           }
        } else {
           // No criticals. If we were correcting, we succeeded.
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
        // Machine OFF
        setMachine(prev => ({
          ...prev,
          totalDowntimeSeconds: prev.totalDowntimeSeconds + 1,
          productionLoss: prev.productionLoss + 0.85 
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [machine.isOn, machine.isAutoCorrecting, machine.autoCorrectionStartTime, sensors, gracePeriodEnd]);

  // --- HANDLERS ---
  const togglePower = () => {
    if (machine.isOn) {
      const correctionReport: SystemReport = {
        id: Date.now().toString(),
        title: `Manutenção Corretiva - ${new Date().toLocaleTimeString('pt-BR')}`,
        content: `**ANÁLISE DE CAUSA:** Parada manual solicitada pelo operador.\n\n**AÇÕES EXECUTADAS:**\n- Recalibragem de sensores.\n- Reset de protocolos de segurança.\n\n**STATUS:** Sistema seguro. Notificação de parada enviada à gerência.`,
        timestamp: new Date(),
        type: 'GERAL'
      };
      setReports(prev => [correctionReport, ...prev]);
      setActiveTab('reports');

      setSensors(INITIAL_SENSORS.map(s => ({
        ...s,
        current: (s.min + s.max) / 2,
        status: 'OK'
      })));

      setMachine(prev => ({ ...prev, isOn: false, isAutoCorrecting: false }));
      addNotification("Máquina parada manualmente. Logs sincronizados na nuvem.", 'INFO');
      
      setChatHistory(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        text: "NEXUS: Sistema em stand-by. Relatório de interrupção gerado.", 
        timestamp: new Date() 
      }]);

    } else {
      setGracePeriodEnd(Date.now() + 15000);
      setMachine(prev => ({ ...prev, isOn: true, isAutoCorrecting: false }));
      addNotification("Inicializando motor. Notificação de início de turno enviada.", 'SUCCESS');

      setChatHistory(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        text: "NEXUS: Inicializando... Modo de Segurança ativo por 15 segundos.", 
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
                clockOut: "17:00 (Manual)"
            };
        }
        return e;
    }));

    addNotification(`Correção aplicada: ${issues.length} ponto(s) ajustado(s). Gerência notificada via Mobile.`, 'SUCCESS');
    
    const rhReport: SystemReport = {
        id: Date.now().toString(),
        title: `Ajuste de Ponto - ${new Date().toLocaleTimeString('pt-BR')}`,
        type: 'RH',
        timestamp: new Date(),
        content: `**ANÁLISE DE OCORRÊNCIA:** Falha no registro de saída (Ponto Eletrônico).\n\n**IMPACTO FINANCEIRO:** Risco de hora extra indevida mitigado.\n\n**AÇÃO:** Ajuste manual realizado pelo supervisor. Funcionário notificado no app.`
    };
    setReports(prev => [rhReport, ...prev]);

    setChatHistory(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'system', 
        text: `NEXUS: Pendências de ponto corrigidas. Relatório de RH gerado automaticamente.`, 
        timestamp: new Date() 
    }]);
  };

  const clearChat = () => {
      setChatHistory([
        { id: Date.now().toString(), role: 'model', text: 'Histórico limpo. Nexus IA pronta.', timestamp: new Date() }
      ]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage('');
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Increase simulated load during request
    setNeuralLoad(85);

    const responseText = await generateSupervisorResponse(
      userText,
      machine,
      sensors,
      employees,
      [] 
    );

    setIsTyping(false);
    setNeuralLoad(15); // Reset load
    
    const lowerText = userText.toLowerCase();
    let reportType: 'GERAL' | 'FINANCEIRO' | 'RH' = 'GERAL';
    if (lowerText.includes('financeiro') || lowerText.includes('custo') || lowerText.includes('dinheiro')) reportType = 'FINANCEIRO';
    else if (lowerText.includes('ponto') || lowerText.includes('funcionario') || lowerText.includes('rh')) reportType = 'RH';

    const isReportRequest = lowerText.includes('relatório') || lowerText.includes('analise') || lowerText.includes('status');

    if (isReportRequest || responseText.length > 300) {
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
        text: `📄 Relatório de ${reportType} gerado. Detalhes de Causa e Impacto disponíveis na aba Relatórios.`,
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
    const warningSensors = sensors.filter(s => s.status === 'WARNING');
    if (criticalSensors.length > 0) return { label: 'CRÍTICO', color: 'text-red-500 animate-pulse' };
    if (warningSensors.length > 0) return { label: 'ATENÇÃO', color: 'text-yellow-400' };
    return { label: 'NORMAL', color: 'text-emerald-500' };
  };

  const getEmployeeRiskStatus = () => {
    const laborErrors = employees.filter(e => e.status === 'MISSING_EXIT').length;
    if (laborErrors > 0) return { label: `PENDÊNCIA (${laborErrors})`, color: 'text-red-500 animate-pulse' };
    return { label: 'REGULAR', color: 'text-emerald-500' };
  };

  const machineRisk = getMachineRiskStatus();
  const employeeRisk = getEmployeeRiskStatus();
  const isGracePeriod = Date.now() < gracePeriodEnd && machine.isOn;
  const hasLaborIssues = employees.some(e => e.status === 'MISSING_EXIT');

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
            <p className="text-xs text-blue-400 font-mono tracking-widest">SISTEMA SUPERVISÓRIO v3.1</p>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-center md:justify-end">
          <div className="text-center md:text-right">
             <p className="text-xs text-slate-500 uppercase font-bold">Risco Máquina</p>
             <p className={`font-mono font-bold ${machineRisk.color}`}>
               {machineRisk.label}
             </p>
          </div>
          <div className="text-center md:text-right border-l border-slate-800 pl-4 md:pl-6">
             <p className="text-xs text-slate-500 uppercase font-bold">Risco Equipe</p>
             <p className={`font-mono font-bold ${employeeRisk.color}`}>
               {employeeRisk.label}
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
                      machine.isAutoCorrecting ? "AUTO-CORREÇÃO" : 
                      "OPERANDO"
                    }</h2>
                    {isGracePeriod && (
                      <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded text-xs font-bold border border-emerald-900 animate-pulse whitespace-nowrap">
                        <ShieldCheck size={14} /> Estabilizando
                      </span>
                    )}
                    {machine.isAutoCorrecting && (
                      <span className="flex items-center gap-1.5 text-orange-400 bg-orange-950/50 px-2 py-0.5 rounded text-xs font-bold border border-orange-900 animate-pulse whitespace-nowrap">
                        <AlertOctagon size={14} /> Tentando estabilizar (1s)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {machine.isOn 
                      ? (machine.isAutoCorrecting ? "Aplicando protocolos de recuperação autônoma..." : isGracePeriod ? "Iniciando protocolos de segurança (15s)..." : "Sistemas nominais. Monitoramento ativo.") 
                      : "Produção interrompida. Correção aplicada."}
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

          {/* Neural Monitor Panel (Replaces Graph) */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex-1 min-h-[300px] flex flex-col relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
               <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                 <Activity size={18} className="text-emerald-400"/> Monitoramento Neural & Eficiência
               </h3>
               <span className="text-xs text-slate-500 font-mono flex items-center gap-1 border border-slate-700 px-2 py-1 rounded-full bg-slate-950/50">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> 
                 REDE ESTÁVEL
               </span>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              
              {/* Circular Efficiency Indicator */}
              <div className="flex flex-col items-center justify-center">
                 <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                    {/* Animated Spin Ring */}
                    <div className={`absolute inset-0 rounded-full border-4 border-transparent ${machine.isAutoCorrecting ? 'border-t-orange-500 animate-spin duration-[0.5s]' : 'border-t-emerald-500 animate-spin duration-[3s]'}`}></div>
                    {/* Inner Content */}
                    <div className="flex flex-col items-center">
                      <span className={`text-4xl font-bold tracking-tighter ${machine.isAutoCorrecting ? 'text-orange-500' : 'text-white'}`}>
                        {machine.isOn ? (machine.isAutoCorrecting ? 'WARN' : isGracePeriod ? '84%' : '98%') : '0%'}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Eficiência</span>
                    </div>
                 </div>
                 <p className="mt-4 text-xs text-slate-400 text-center max-w-[200px]">
                   {machine.isOn 
                      ? (machine.isAutoCorrecting ? "TENTATIVA DE CORREÇÃO..." : "Otimização de processos em tempo real ativa.") 
                      : "Aguardando inicialização do sistema."}
                 </p>
              </div>

              {/* Metrics Bars */}
              <div className="flex flex-col justify-center gap-6">
                
                {/* Latency */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Wifi size={12}/> Latência de Rede</span>
                    <span className="text-blue-400">{networkLatency.toFixed(0)}ms</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (networkLatency / 150) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Processing Load */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Zap size={12}/> Carga Neural</span>
                    <span className="text-purple-400">{neuralLoad.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-300" 
                      style={{ width: `${neuralLoad}%` }}
                    ></div>
                  </div>
                </div>

                {/* Server Status */}
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 mt-2">
                   <div className="bg-slate-900 p-2 rounded text-emerald-400">
                     <Server size={16} />
                   </div>
                   <div>
                     <div className="text-xs text-slate-400">Status do Servidor</div>
                     <div className="text-sm font-bold text-white">Online • <span className="text-emerald-500">Estável</span></div>
                   </div>
                </div>

              </div>
            </div>
          </div>

          {/* Employee Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <User size={18} className="text-purple-400"/> Monitoramento de Equipe
                </h3>
                {hasLaborIssues ? (
                    <button 
                        onClick={handleCorrectEmployees}
                        className="w-full sm:w-auto justify-center flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                    >
                        <UserCheck size={14} />
                        Corrigir Erro de Ponto & Notificar
                    </button>
                ) : (
                  <span className="text-xs text-emerald-500 flex items-center gap-1 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                    <ShieldCheck size={12} /> Equipe Regularizada
                  </span>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Interface Neural v3.1</p>
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
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
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
                    <button 
                      onClick={clearChat}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-950/30 hover:bg-red-900/50 rounded-lg border border-red-900/50 transition-colors shrink-0"
                      title="Limpar Histórico"
                    >
                      <Trash2 size={14} className="text-red-400" />
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