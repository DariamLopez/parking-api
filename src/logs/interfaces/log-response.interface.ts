import { LogType } from '../shemas/activity-log.shema';

export interface LogResponse {
  type: LogType;
  user: {
    name: string;
    email: string;
  };
  details: Record<string, any>;
  createdAt: Date;
}
