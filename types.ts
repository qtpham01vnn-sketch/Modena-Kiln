
export type KilnOCRResult = Record<string, any>;

export interface ExtractionRecord {
  id: string;
  timestamp: string;
  mode: 'MONITOR' | 'LAB';
  line: string;
  kilnType: string;
  dc1Images: any;
  dc2Images: any;
  data: KilnOCRResult;
}
