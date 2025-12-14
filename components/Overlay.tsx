import React from 'react';
import { DetectedObject } from '../types';

interface OverlayProps {
  objects: DetectedObject[];
}

const Overlay: React.FC<OverlayProps> = ({ objects }) => {
  if (objects.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {objects.map((obj, idx) => {
        // Coordinates are 0-1000
        const [ymin, xmin, ymax, xmax] = obj.box_2d;
        
        // Convert to percentage
        const top = ymin / 10;
        const left = xmin / 10;
        const height = (ymax - ymin) / 10;
        const width = (xmax - xmin) / 10;

        return (
          <div
            key={idx}
            className="absolute border-2 border-green-500 bg-green-500/10 transition-all duration-300"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${width}%`,
              height: `${height}%`
            }}
          >
            <span className="absolute -top-6 left-0 bg-green-500 text-black text-xs font-bold px-1 py-0.5 rounded-sm whitespace-nowrap">
              {obj.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default Overlay;
