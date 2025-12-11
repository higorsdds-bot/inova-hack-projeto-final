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
  isAutoCorrecting: boolean;     // Novo
  autoCorrectionStartTime: number; // Novo
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
  type: 'GERAL' | 'FINANCEIRO' | 'INCIDENTE' | 'RH';
}

export interface SystemNotification {
  id: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'SUCCESS';
}