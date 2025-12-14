import React, { useRef, useEffect } from 'react';
import { AppMode, WhiteBalancePreset } from '../types';

interface ControlsProps {
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  onShutter: () => void;
  isRecording: boolean;
  toggleRecording: () => void;
  isEIS: boolean;
  toggleEIS: () => void;
  isHDR: boolean;
  toggleHDR: () => void;
  isTorchOn: boolean;
  toggleTorch: () => void;
  supportsTorch: boolean;
  wbPreset: WhiteBalancePreset;
  toggleWB: () => void;
  galleryThumbnail?: string;
  onOpenGallery: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  zoomLevel,
  setZoomLevel,
  mode,
  setMode,
  onShutter,
  isRecording,
  toggleRecording,
  isEIS,
  toggleEIS,
  isHDR,
  toggleHDR,
  isTorchOn,
  toggleTorch,
  supportsTorch,
  wbPreset,
  toggleWB,
  galleryThumbnail,
  onOpenGallery
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Convert Zoom to 0-1 percentage using Logarithmic scale
  // 1x = 0%, 10x = 50%, 100x = 100%
  const getPercentageFromZoom = (zoom: number) => {
    return Math.log10(zoom) / 2;
  };

  const getZoomFromPercentage = (percentage: number) => {
    return Math.pow(10, percentage * 2);
  };

  const handleMove = (clientY: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    
    // Calculate distance from bottom
    const relativeY = rect.bottom - clientY;
    let percentage = relativeY / rect.height;
    percentage = Math.max(0, Math.min(1, percentage));
    
    const newZoom = getZoomFromPercentage(percentage);
    setZoomLevel(Math.min(100, Math.max(1, parseFloat(newZoom.toFixed(2)))));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    handleMove(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging.current) {
      handleMove(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    handleMove(e.clientY);
  };
  
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        handleMove(e.clientY);
        e.preventDefault();
      }
    };
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const currentPercent = getPercentageFromZoom(zoomLevel) * 100;

  const getWBLabel = (preset: WhiteBalancePreset) => {
    switch(preset) {
      case 'auto': return 'WB AUTO';
      case 'daylight': return 'WB SUN';
      case 'cloudy': return 'WB CLOUD';
      case 'incandescent': return 'WB BULB';
      default: return 'WB';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20 select-none">
      
      {/* Top Bar: Settings */}
      <div className="flex justify-between items-center w-full pointer-events-auto bg-black/40 backdrop-blur-md rounded-xl p-3 mt-2 border border-white/10 shadow-lg">
        <div className="flex gap-2">
          <button 
            onClick={toggleEIS}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
              isEIS ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-black/50 text-gray-300 border-gray-600'
            }`}
          >
            EIS
          </button>
          <button 
            onClick={toggleHDR}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
              isHDR ? 'bg-blue-500 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-black/50 text-gray-300 border-gray-600'
            }`}
          >
            HDR
          </button>
          <button 
            onClick={toggleWB}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all border whitespace-nowrap min-w-[70px] ${
              wbPreset !== 'auto' ? 'bg-purple-500 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-black/50 text-gray-300 border-gray-600'
            }`}
          >
            {getWBLabel(wbPreset)}
          </button>
          {supportsTorch && (
             <button 
               onClick={toggleTorch}
               className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all border ${
                 isTorchOn ? 'bg-white border-white text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-black/50 text-gray-300 border-gray-600'
               }`}
             >
               FLASH
             </button>
          )}
        </div>
        <div className="text-yellow-400 font-mono font-bold text-xl drop-shadow-md">
          {zoomLevel.toFixed(1)}<span className="text-xs ml-1 opacity-70">x</span>
        </div>
      </div>

      {/* Right Side: Zoom Controls (Vertical) */}
      <div className="absolute right-4 bottom-48 flex flex-row items-center gap-6 pointer-events-auto z-30">
         
         {/* Professional Zoom Slider */}
         <div 
            ref={sliderRef}
            className="relative w-12 h-72 bg-black/40 backdrop-blur-md rounded-full border border-white/10 overflow-visible touch-none select-none group cursor-pointer"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
         >
            {/* Track Line */}
            <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-white/20 rounded-full"></div>
            
            {/* Active Track (Fill) */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-1 bottom-0 bg-yellow-500 rounded-b-full transition-all duration-75"
              style={{ height: `${currentPercent}%` }}
            ></div>

            {/* Thumb/Knob */}
            <div 
               className="absolute left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-yellow-500 flex items-center justify-center transform transition-transform duration-75 active:scale-110"
               style={{ bottom: `calc(${currentPercent}% - 16px)` }}
            >
               <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
            </div>
         </div>
      </div>

      {/* Bottom Area: Mode & Shutter */}
      <div className="flex flex-col gap-4 pointer-events-auto w-full mb-6">
        
        {/* Mode Selector */}
        <div className="flex justify-center gap-6 overflow-x-auto no-scrollbar py-2 mask-linear-fade">
          {Object.values(AppMode).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-sm font-bold uppercase tracking-widest px-2 py-1 transition-all ${
                mode === m 
                  ? 'text-yellow-400 border-b-2 border-yellow-400 shadow-[0_4px_10px_-2px_rgba(250,204,21,0.5)]' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Shutter Button Row */}
        <div className="flex justify-between items-center px-10 pb-4">
          
          {/* Gallery Preview */}
          <button onClick={onOpenGallery} className="w-14 h-14 rounded-xl bg-gray-800 overflow-hidden border-2 border-white/20 relative transition-transform active:scale-95 shadow-lg">
            {galleryThumbnail ? (
              <img src={galleryThumbnail} alt="Gallery" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                <div className="w-4 h-4 border-2 border-gray-600 rounded-sm mb-1"></div>
              </div>
            )}
          </button>

          {/* Shutter Button */}
          <div className="relative">
            {mode === AppMode.VIDEO ? (
               <button
                 onClick={toggleRecording}
                 className={`w-20 h-20 rounded-full border-[5px] flex items-center justify-center transition-all duration-200 shadow-[0_0_20px_rgba(220,38,38,0.4)] ${
                   isRecording ? 'border-red-500 scale-110' : 'border-white'
                 }`}
               >
                 <div className={`transition-all duration-200 ${isRecording ? 'w-8 h-8 bg-red-500 rounded-sm' : 'w-16 h-16 bg-red-600 rounded-full'}`} />
               </button>
            ) : (
               <button
                 onClick={onShutter}
                 className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
               >
                 <div className="w-16 h-16 bg-white rounded-full" />
               </button>
            )}
          </div>

          {/* Flip Camera (Visual Placeholder) */}
          <button className="w-14 h-14 rounded-full bg-gray-800/60 flex items-center justify-center text-white backdrop-blur-md border border-white/10 active:scale-95 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0-6-8-6-8-6s-8 0-8 6h16z"/><path d="M4 14c0 6 8 6 8 6s8 0 8-6H4z"/><path d="M12 10v4"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Controls;