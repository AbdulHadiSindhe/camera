import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { CameraCapabilities, AppMode, WhiteBalancePreset } from '../types';
import { processDocumentScan } from '../services/scannerService';

interface CameraViewProps {
  zoomLevel: number; // 1 to 100
  isEIS: boolean;
  isHDR: boolean;
  isTorchOn: boolean;
  wbPreset: WhiteBalancePreset;
  mode: AppMode;
  onCapabilitiesReady: (caps: CameraCapabilities) => void;
  onRecordingComplete: (blob: Blob) => void;
  onPhotoCaptured: (dataUrl: string) => void;
  triggerShutter: number; // Increment to trigger
  triggerRecordToggle: boolean;
}

// Helper to get max hardware zoom
const getMaxHardwareZoom = (track: MediaStreamTrack): number => {
  const caps = track.getCapabilities();
  // @ts-ignore - zoom is part of ImageCapture spec but TS might miss it
  return caps.zoom ? caps.zoom.max : 1;
};

const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(({
  zoomLevel,
  isEIS,
  isHDR,
  isTorchOn,
  wbPreset,
  mode,
  onCapabilitiesReady,
  onRecordingComplete,
  onPhotoCaptured,
  triggerShutter,
  triggerRecordToggle
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [hardwareZoomMax, setHardwareZoomMax] = useState(1);
  const [cssScale, setCssScale] = useState(1);
  const [isRecording, setIsRecording] = useState(false);

  // Expose video ref to parent if needed
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  // Initialize Camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: {
            facingMode: 'environment',
            width: { ideal: 3840 }, // 4K ideal
            height: { ideal: 2160 },
            // Request stabilization if EIS is on
            // @ts-ignore
            videoStabilizationMode: isEIS ? 'standard' : 'off',
            // @ts-ignore
            exposureMode: isHDR ? 'continuous' : 'continuous', 
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const videoTrack = stream.getVideoTracks()[0];
        trackRef.current = videoTrack;

        // Capabilities
        const caps = videoTrack.getCapabilities();
        // @ts-ignore
        const maxZoom = caps.zoom ? caps.zoom.max : 1;
        // @ts-ignore
        const minZoom = caps.zoom ? caps.zoom.min : 1;
        
        setHardwareZoomMax(maxZoom);
        
        onCapabilitiesReady({
          zoom: { min: 1, max: 100, step: 0.1 },
          supportsTorch: 'torch' in caps,
          supportsFocus: 'focusMode' in caps
        });

      } catch (err) {
        console.error("Camera access error:", err);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [onCapabilitiesReady, isEIS, isHDR]);

  // Handle Zoom, Torch, & White Balance Logic (Hardware Constraints)
  useEffect(() => {
    if (!trackRef.current) return;

    let hwZoom = 1;
    let swZoom = 1;

    if (zoomLevel <= hardwareZoomMax) {
      hwZoom = zoomLevel;
      swZoom = 1;
    } else {
      hwZoom = hardwareZoomMax;
      swZoom = zoomLevel / hardwareZoomMax;
    }

    setCssScale(swZoom);

    // Apply Hardware Constraints
    try {
      const advancedConstraints: any = { zoom: hwZoom };
      
      // Torch
      advancedConstraints.torch = isTorchOn;

      // White Balance
      if (wbPreset === 'auto') {
        advancedConstraints.whiteBalanceMode = 'continuous';
      } else {
        advancedConstraints.whiteBalanceMode = 'manual';
        // Approximate Kelvin values for standard presets
        switch (wbPreset) {
          case 'daylight': advancedConstraints.colorTemperature = 5500; break;
          case 'cloudy': advancedConstraints.colorTemperature = 6500; break;
          case 'incandescent': advancedConstraints.colorTemperature = 2850; break;
        }
      }

      trackRef.current.applyConstraints({
        advanced: [advancedConstraints]
      }).catch(e => console.debug("Constraints failed", e));
    } catch (e) {
      // Ignore if constraints not supported
    }
  }, [zoomLevel, hardwareZoomMax, isTorchOn, wbPreset]);

  // Capture Image Helper
  const captureFrame = useCallback(async (returnBase64: boolean = true) => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Flip context horizontally to match the flipped preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // We draw the raw video. 
    // If we have CSS zoom (swZoom), we should technically crop the center 
    // to simulate the zoom in the captured image if we want WYSIWYG.
    // However, for high res capture, we usually want full sensor and crop later.
    // For this app, to make it "Real 100x", we will crop the canvas if cssScale > 1.
    
    if (cssScale > 1) {
        const width = canvas.width;
        const height = canvas.height;
        const scaledWidth = width / cssScale;
        const scaledHeight = height / cssScale;
        const startX = (width - scaledWidth) / 2;
        const startY = (height - scaledHeight) / 2;

        ctx.drawImage(videoRef.current, startX, startY, scaledWidth, scaledHeight, 0, 0, width, height);
    } else {
        ctx.drawImage(videoRef.current, 0, 0);
    }

    // Process if Scan Mode
    if (mode === AppMode.SCAN) {
       const processedDataUrl = await processDocumentScan(canvas);
       return processedDataUrl || canvas.toDataURL('image/jpeg');
    }

    return returnBase64 ? canvas.toDataURL('image/jpeg', 0.95) : canvas;
  }, [cssScale, mode]);

  // Shutter Trigger
  useEffect(() => {
    if (triggerShutter === 0) return;
    
    const takePhoto = async () => {
        const dataUrl = await captureFrame(true);
        if (dataUrl && typeof dataUrl === 'string') {
            onPhotoCaptured(dataUrl);
        }
    };
    takePhoto();
  }, [triggerShutter, captureFrame, onPhotoCaptured]);

  // Recording Trigger
  useEffect(() => {
    if (!streamRef.current) return;

    if (triggerRecordToggle && !isRecording) {
        // Start Recording
        try {
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
                ? 'video/webm;codecs=vp9' 
                : 'video/webm';
                
            const recorder = new MediaRecorder(streamRef.current, { mimeType });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                onRecordingComplete(blob);
                setIsRecording(false);
            };

            recorder.start(100); // collect 100ms chunks
            setIsRecording(true);
        } catch (e) {
            console.error("Recording failed", e);
        }
    } else if (!triggerRecordToggle && isRecording) {
        // Stop Recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    }
  }, [triggerRecordToggle, isRecording, onRecordingComplete]);


  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video Element with CSS Zoom Transform and Flip */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover origin-center transition-transform duration-100 ease-linear"
        style={{
            // Negative X scale flips the video horizontally
            transform: `translate(-50%, -50%) scale(-${cssScale}, ${cssScale})`
        }}
      />
      
      {/* Grid Lines (Rule of Thirds) - Optional visual flair */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-1/3 border-b border-white"></div>
        <div className="w-full h-1/3 border-b border-white top-1/3 absolute"></div>
        <div className="h-full w-1/3 border-r border-white absolute top-0 left-0"></div>
        <div className="h-full w-1/3 border-r border-white absolute top-0 left-1/3"></div>
      </div>
    </div>
  );
});

export default CameraView;