import React, { useState, useCallback } from 'react';
import CameraView from './components/CameraView';
import Controls from './components/Controls';
import GalleryModal from './components/GalleryModal';
import { AppMode, CapturedMedia, CameraCapabilities, WhiteBalancePreset } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.PHOTO);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isEIS, setIsEIS] = useState<boolean>(true);
  const [isHDR, setIsHDR] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false);
  const [wbPreset, setWbPreset] = useState<WhiteBalancePreset>('auto');
  
  // Shutter / Record States
  const [triggerShutterCount, setTriggerShutterCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [triggerRecordToggle, setTriggerRecordToggle] = useState(false);

  // Data States
  const [mediaList, setMediaList] = useState<CapturedMedia[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Handlers
  const handleCapabilitiesReady = useCallback((caps: CameraCapabilities) => {
    console.log("Camera Ready", caps);
    setSupportsTorch(caps.supportsTorch);
  }, []);

  const handlePhotoCaptured = useCallback((dataUrl: string) => {
    // Add to gallery
    const newMedia: CapturedMedia = {
      type: 'image',
      url: dataUrl,
      timestamp: Date.now()
    };
    setMediaList(prev => [...prev, newMedia]);
    
    // Auto-download image
    try {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ultrazoom_capture_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Auto-download failed", e);
    }
    
    // Simple flash animation or haptic could go here
    const flash = document.createElement('div');
    flash.className = 'fixed inset-0 bg-white z-50 pointer-events-none opacity-100 animate-pulse';
    flash.style.transition = 'opacity 0.2s';
    document.body.appendChild(flash);
    setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 200);
    }, 50);

  }, []);

  const handleRecordingComplete = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const newMedia: CapturedMedia = {
      type: 'video',
      url: url,
      timestamp: Date.now()
    };
    setMediaList(prev => [...prev, newMedia]);
  }, []);

  const handleShutterPress = () => {
    setTriggerShutterCount(prev => prev + 1);
  };

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    setTriggerRecordToggle(!isRecording);
  };

  const toggleWB = () => {
    const modes: WhiteBalancePreset[] = ['auto', 'daylight', 'cloudy', 'incandescent'];
    const currentIndex = modes.indexOf(wbPreset);
    const nextIndex = (currentIndex + 1) % modes.length;
    setWbPreset(modes[nextIndex]);
  };

  return (
    <div className="h-full w-full bg-black relative flex flex-col overflow-hidden">
      
      {/* Camera Layer */}
      <div className="flex-1 relative overflow-hidden">
        <CameraView
          zoomLevel={zoomLevel}
          isEIS={isEIS}
          isHDR={isHDR}
          isTorchOn={isTorchOn}
          wbPreset={wbPreset}
          mode={mode}
          onCapabilitiesReady={handleCapabilitiesReady}
          onPhotoCaptured={handlePhotoCaptured}
          onRecordingComplete={handleRecordingComplete}
          triggerShutter={triggerShutterCount}
          triggerRecordToggle={triggerRecordToggle}
        />

        {/* Scan Guide Overlay */}
        {mode === AppMode.SCAN && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className="border-2 border-yellow-400 w-3/4 h-3/4 rounded-lg opacity-50 flex items-center justify-center">
                <p className="text-yellow-400 bg-black/50 px-2 rounded">Align Document</p>
             </div>
          </div>
        )}
      </div>

      {/* UI Layer */}
      <Controls
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        mode={mode}
        setMode={setMode}
        onShutter={handleShutterPress}
        isRecording={isRecording}
        toggleRecording={handleRecordToggle}
        isEIS={isEIS}
        toggleEIS={() => setIsEIS(!isEIS)}
        isHDR={isHDR}
        toggleHDR={() => setIsHDR(!isHDR)}
        isTorchOn={isTorchOn}
        toggleTorch={() => setIsTorchOn(!isTorchOn)}
        supportsTorch={supportsTorch}
        wbPreset={wbPreset}
        toggleWB={toggleWB}
        galleryThumbnail={mediaList.length > 0 ? mediaList[mediaList.length - 1].url : undefined}
        onOpenGallery={() => setIsGalleryOpen(true)}
      />

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        media={mediaList}
      />

    </div>
  );
};

export default App;