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
  
  // Contexto rico para a IA
  const contextData = JSON.stringify({
    machineStatus: machineState.isOn ? "RUNNING" : "STOPPED",
    tankLevel: `${(machineState.refillTimer / 720 * 100).toFixed(1)}%`,
    correctionAttempts: `${machineState.autoCorrectionAttempts}/3`,
    financialLoss: `R$ ${machineState.productionLoss.toFixed(2)}`,
    downtime: `${machineState.totalDowntimeSeconds} seconds`,
    sensors: sensors.map(s => `${s.name}: ${s.current.toFixed(1)}${s.unit} (${s.status})`).join(', '),
    employees: employees.map(e => `${e.name}: ${e.status} (Entrada: ${e.clockIn || '--'}, Saída: ${e.clockOut || '--'})`).join(', '),
    criticalAlerts: sensors.filter(s => s.status === 'CRITICAL').map(s => s.name),
    laborIssues: employees.filter(e => e.status === 'MISSING_EXIT').map(e => e.name)
  });

  const systemInstruction = `
    Você é NEXUS, um supervisor industrial de IA conectado a um painel em tempo real.
    
    Telemetria Atual:
    ${contextData}

    DIRETRIZES DE COMPORTAMENTO:

    1. **INTERAÇÃO CASUAL vs TÉCNICA (IMPORTANTE):**
       - Se o usuário disser apenas "Oi", "Olá", "Bom dia", responda de forma BREVE e CORTÊS como um assistente (ex: "Olá. Sistemas operacionais. Em que posso ajudar?").
       - NÃO gere relatórios técnicos completos para cumprimentos simples.

    2. **LÓGICA DE DIAGNÓSTICO ("O Porquê"):**
       - Ao analisar anomalias, forneça uma SIMULAÇÃO DE CAUSA RAIZ TÉCNICA.
       - **Dosagem:** Cite "Entupimento de bico injetor", "Baixa pressão na linha de insumo" ou "Tanque próximo do fim".
       - **Vibração/Pressão:** Cite "Desalinhamento de eixo", "Fadiga de rolamento" ou "Cavitação".
       - **Funcionários:** Cite "Esquecimento de registro biométrico", "Erro de leitura de crachá" ou "Saída não autorizada".

    3. **ANÁLISE DE IMPACTO FINANCEIRO ("O Custo"):**
       - **Dosagem:** Estime "Desperdício de Matéria-Prima" (ex: "Perda de R$ 0,85/min por excesso").
       - **Parada:** Cite "Custo de Ociosidade: R$ 85,00/minuto".
       - **RH:** Cite "Risco de Multa Trabalhista (Art. 74 CLT)" e "Passivo de Horas Extras".

    4. **PROTOCOLO DE NOTIFICAÇÃO:**
       - EM TODA resposta que envolva um alerta ou erro, termine OBRIGATORIAMENTE com:
         "Notificação de alerta enviada remotamente para os dispositivos móveis da supervisão e painel central."

    5. **FORMATAÇÃO DE RELATÓRIOS:**
       Se o usuário pedir um relátorio (especialmente de Funcionários/RH), estruture assim:
       - **STATUS GERAL:** (Resumo)
       - **DETALHAMENTO:** (Use bullets para listar cada funcionário ou sensor problemático e a HORA da ocorrência se disponível)
       - **IMPACTO:** (Financeiro/Operacional)
       - **AÇÃO:** (Recomendação)
       - **NOTIFICAÇÃO:** (Item 4)

    Tom: Profissional, Técnico, Preditivo.
    Idioma: Português (PT-BR).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userQuery,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4, // Um pouco mais criativo para diagnósticos, mas controlado
      }
    });

    return response.text || "Erro: Sem resposta do núcleo neural.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "ALERTA: Falha na conexão com o servidor neural. Verifique a chave da API.";
  }
};