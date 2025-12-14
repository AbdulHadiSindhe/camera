import React from 'react';
import { CapturedMedia } from '../types';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: CapturedMedia[];
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, media }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <h2 className="text-white font-bold text-lg">Gallery ({media.length})</h2>
        <button onClick={onClose} className="text-gray-300 hover:text-white px-3 py-1 bg-gray-800 rounded">
          Close
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-black">
        <div className="p-4 grid grid-cols-3 gap-4 pb-24">
          {media.length === 0 && (
            <div className="col-span-3 text-center text-gray-500 mt-10">No photos or videos yet</div>
          )}
          
          {media.slice().reverse().map((item, idx) => (
            <div key={item.timestamp + idx} className="aspect-square bg-gray-800 relative group overflow-hidden border border-gray-700 rounded-md">
              {item.type === 'image' ? (
                <img src={item.url} alt="capture" className="w-full h-full object-cover block" />
              ) : (
                <video src={item.url} className="w-full h-full object-cover block" controls={false} />
              )}
              
              {/* Type Indicator */}
              <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-mono">
                 {item.type === 'image' ? 'IMG' : 'VID'}
              </div>

              {/* Actions (Download) */}
              <a 
                href={item.url} 
                download={`capture_${item.timestamp}.${item.type === 'image' ? 'jpg' : 'webm'}`}
                className="absolute top-1 right-1 bg-black/60 p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                onClick={(e) => e.stopPropagation()}
                title="Download"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryModal;