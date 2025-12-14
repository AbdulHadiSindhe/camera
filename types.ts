export enum AppMode {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  SCAN = 'SCAN'
}

export type WhiteBalancePreset = 'auto' | 'daylight' | 'cloudy' | 'incandescent';

export interface CameraCapabilities {
  zoom: {
    min: number;
    max: number;
    step: number;
  };
  supportsTorch: boolean;
  supportsFocus: boolean;
}

export interface CapturedMedia {
  type: 'image' | 'video';
  url: string;
  timestamp: number;
}

export interface DetectedObject {
  label: string;
  box_2d: number[];
}