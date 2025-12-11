export interface SensorData {
  name: string;
  min: number;
  max: number;
  current: number;
  unit: string;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  lastUpdated: string;
}

export interface Employee {
  id: string;
  name: string;
  clockIn: string | null;
  clockOut: string | null;
  status: 'ACTIVE' | 'OFF_SHIFT' | 'MISSING_EXIT';
}

export interface MachineState {
  isOn: boolean;
  lastToggleTime: Date;
  totalDowntimeSeconds: number;
  productionLoss: number;
  isAutoCorrecting: boolean;
  autoCorrectionStartTime: number;
  refillTimer: number; // Tempo restante do tanque em segundos (12min = 720s)
  autoCorrectionAttempts: number; // Contador de tentativas de correção (max 3)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export interface SystemReport {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  type: 'GERAL' | 'FINANCEIRO' | 'INCIDENTE' | 'RH' | 'ENERGIA' | 'PREVISAO';
}

export interface SystemNotification {
  id: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'SUCCESS';
}