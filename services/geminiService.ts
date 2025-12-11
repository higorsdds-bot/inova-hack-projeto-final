import { GoogleGenAI } from "@google/genai";
import { MachineState, SensorData, Employee, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSupervisorResponse = async (
  userQuery: string,
  machineState: MachineState,
  sensors: SensorData[],
  employees: Employee[],
  chatHistory: ChatMessage[]
): Promise<string> => {
  
  // Construct a context-aware system prompt
  const contextData = JSON.stringify({
    machineStatus: machineState.isOn ? "RUNNING" : "STOPPED",
    financialLoss: `R$ ${machineState.productionLoss.toFixed(2)}`,
    downtime: `${machineState.totalDowntimeSeconds} seconds`,
    tankLevel: machineState.isOn ? "Consuming" : "Stable", // Inferred context
    sensors: sensors.map(s => `${s.name}: ${s.current.toFixed(1)}${s.unit} (${s.status})`).join(', '),
    employees: employees.map(e => `${e.name}: ${e.status} (In: ${e.clockIn}, Out: ${e.clockOut})`).join(', '),
    criticalAlerts: sensors.filter(s => s.status === 'CRITICAL').map(s => s.name),
    laborIssues: employees.filter(e => e.status === 'MISSING_EXIT').map(e => e.name)
  });

  const systemInstruction = `
    You are NEXUS, an advanced industrial AI supervisor connected to a real-time dashboard.
    
    Current System Telemetry:
    ${contextData}

    CORE INSTRUCTIONS & BEHAVIOR:

    1. **DIAGNOSTIC LOGIC (The "Why"):**
       - When analyzing anomalies, you MUST provide a technical ROOT CAUSE simulation.
       - **Dosagem (Dosage) Issues:** Cite "Obstrução parcial na válvula de injeção", "Variação de viscosidade do insumo" or "Bomba dosadora descalibrada".
       - **Vibração/Pressão:** Cite "Desgaste prematuro de rolamento", "Cavitação na bomba" or "Fadiga de material".
       - **Employees (Missing Exit):** Cite "Falha na leitura biométrica", "Esquecimento do operador" or "Erro de sincronização no relógio de ponto".

    2. **FINANCIAL IMPACT ANALYSIS (The Cost):**
       - **Dosagem:** If unstable, calculate/estimate "Desperdício de Matéria-Prima". (e.g., "Perda estimada de R$ 0,45 a cada ciclo falho").
       - **Downtime/Stop:** Quote "Custo de Ociosidade: R$ 85,00/minuto".
       - **Labor (RH):** For missing exits, quote "Risco de Passivo Trabalhista" and "Possível multa administrativa ou hora extra indevida".

    3. **MANDATORY NOTIFICATION PROTOCOL:**
       - IN EVERY RESPONSE involving an alert, warning, or report, you MUST conclude with:
         "Notificação de alerta enviada remotamente para os dispositivos móveis da supervisão e painel central."

    4. **REPORT FORMATTING:**
       If the user asks for a 'Relatório', structure it strictly:
       - **STATUS:** (Operational/Critical)
       - **DIAGNÓSTICO TÉCNICO:** (The "Why" from rule #1)
       - **IMPACTO FINANCEIRO:** (The "Cost" from rule #2)
       - **AÇÃO IMEDIATA:** (e.g., "Solicitar manutenção", "Ajuste manual de ponto")
       - **NOTIFICAÇÃO:** (Rule #3)

    Tone: Professional, Technical, Predictive.
    Language: Portuguese (PT-BR).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Lower temperature for consistent, factual reporting
      }
    });

    return response.text || "Erro: Sem resposta do núcleo neural.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "ALERTA: Falha na conexão com o servidor neural. Verifique sua chave de API ou conexão de rede.";
  }
};