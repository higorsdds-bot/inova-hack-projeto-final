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
    sensors: sensors.map(s => `${s.name}: ${s.current.toFixed(1)}${s.unit} (${s.status})`).join(', '),
    employees: employees.map(e => `${e.name}: ${e.status} (In: ${e.clockIn}, Out: ${e.clockOut})`).join(', '),
    criticalAlerts: sensors.filter(s => s.status === 'CRITICAL').length > 0
  });

  const systemInstruction = `
    You are NEXUS, an advanced industrial AI supervisor.
    
    Current System Telemetry:
    ${contextData}

    CORE INSTRUCTIONS:
    1. **Reports (Intelligent Analysis):** 
       If the user asks for a Report ('Relatório'), you MUST structure it with these headers:
       - **ANÁLISE DE CAUSA:** Explain *why* the issue happened based on sensor data or employee status.
       - **IMPACTO FINANCEIRO:** Explicitly state the loss (Current: R$ ${machineState.productionLoss.toFixed(2)}). Calculate projected loss if not fixed.
       - **AÇÃO RECOMENDADA:** Specific steps to fix it.
    
    2. **Employee/Time Reports (Pontos):**
       If asked about 'Pontos' or 'Funcionários', list them clearly and flag any irregularities (e.g., MISSING_EXIT). Explain the labor risk cost.

    3. **Tone:**
       Concise, professional, slightly futuristic.

    4. **Alerts:**
       If a sensor is CRITICAL or an employee is MISSING_EXIT, mention that "Remote notifications have been sent to supervisors."

    Format your response in Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, // Lower temperature for more analytical/factual responses
      }
    });

    return response.text || "Erro: Sem resposta do núcleo neural.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "ALERTA: Falha na conexão com o servidor neural (API Error).";
  }
};