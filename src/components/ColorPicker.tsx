import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  presets?: string[];
  label?: string;
}

// =====================================================
// HSV ↔ RGB ↔ HEX utilities
// =====================================================

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, v * 100];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h /= 360; s /= 100; v /= 100;
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// =====================================================
// ColorPicker Component
// =====================================================

export function ColorPicker({ color, onChange, presets, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'hex' | 'rgb'>('hex');
  const [hexInput, setHexInput] = useState(color);
  const [rgbInput, setRgbInput] = useState({ r: '0', g: '0', b: '0' });

  // HSV state for the picker
  const [hsv, setHsv] = useState<[number, number, number]>(() => {
    const [r, g, b] = hexToRgb(color);
    return rgbToHsv(r, g, b);
  });

  const satBrightRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingSB = useRef(false);
  const isDraggingHue = useRef(false);

  // Sync external color changes
  useEffect(() => {
    const [r, g, b] = hexToRgb(color);
    const newHsv = rgbToHsv(r, g, b);
    setHsv(newHsv);
    setHexInput(color);
    setRgbInput({ r: r.toString(), g: g.toString(), b: b.toString() });
  }, [color]);

  const emitColor = useCallback((h: number, s: number, v: number) => {
    const [r, g, b] = hsvToRgb(h, s, v);
    const hex = rgbToHex(r, g, b);
    setHexInput(hex);
    setRgbInput({ r: r.toString(), g: g.toString(), b: b.toString() });
    onChange(hex);
  }, [onChange]);

  // Saturation/Brightness drag
  const handleSBInteraction = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!satBrightRef.current) return;
    const rect = satBrightRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const newS = x * 100;
    const newV = (1 - y) * 100;
    const newHsv: [number, number, number] = [hsv[0], newS, newV];
    setHsv(newHsv);
    emitColor(newHsv[0], newHsv[1], newHsv[2]);
  }, [hsv, emitColor]);

  // Hue drag
  const handleHueInteraction = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newH = x * 360;
    const newHsv: [number, number, number] = [newH, hsv[1], hsv[2]];
    setHsv(newHsv);
    emitColor(newHsv[0], newHsv[1], newHsv[2]);
  }, [hsv, emitColor]);

  // Mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSB.current) handleSBInteraction(e);
      if (isDraggingHue.current) handleHueInteraction(e);
    };
    const handleMouseUp = () => {
      isDraggingSB.current = false;
      isDraggingHue.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleSBInteraction, handleHueInteraction]);

  // Hex input handler
  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      const [r, g, b] = hexToRgb(val);
      const newHsv = rgbToHsv(r, g, b);
      setHsv(newHsv);
      setRgbInput({ r: r.toString(), g: g.toString(), b: b.toString() });
      onChange(val.toLowerCase());
    }
  };

  // RGB input handler
  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: string) => {
    const newRgb = { ...rgbInput, [channel]: val };
    setRgbInput(newRgb);
    const r = parseInt(newRgb.r) || 0;
    const g = parseInt(newRgb.g) || 0;
    const b = parseInt(newRgb.b) || 0;
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      const hex = rgbToHex(r, g, b);
      const newHsv = rgbToHsv(r, g, b);
      setHsv(newHsv);
      setHexInput(hex);
      onChange(hex);
    }
  };

  // Pure hue color for background
  const [pureR, pureG, pureB] = hsvToRgb(hsv[0], 100, 100);
  const pureHueColor = `rgb(${pureR}, ${pureG}, ${pureB})`;

  return (
    <div>
      {label && (
        <label className="text-foreground-muted text-sm block mb-2">{label}</label>
      )}

      {/* Trigger: swatch + presets */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Current color swatch (opens picker) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-10 h-10 rounded-xl border-2 border-border transition-all hover:scale-105 shrink-0",
            isOpen && "ring-2 ring-primary ring-offset-2"
          )}
          style={{ backgroundColor: color }}
          title="Abrir selector de color"
        />

        {/* Preset swatches */}
        {presets && presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={cn(
              "w-8 h-8 rounded-full transition-all",
              color === preset && "ring-2 ring-offset-2 ring-primary scale-110"
            )}
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>

      {/* Color Picker Panel */}
      {isOpen && (
        <div className="mt-3 p-4 bg-card border border-border rounded-2xl shadow-lg space-y-3 animate-in">
          {/* Close button */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground-muted">Selector de color</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-background"
            >
              <X className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>

          {/* Saturation/Brightness Canvas */}
          <div
            ref={satBrightRef}
            className="relative w-full h-40 rounded-xl cursor-crosshair overflow-hidden"
            style={{ backgroundColor: pureHueColor }}
            onMouseDown={(e) => {
              isDraggingSB.current = true;
              handleSBInteraction(e);
            }}
          >
            {/* White gradient (left to right) */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, #fff, transparent)' }}
            />
            {/* Black gradient (top to bottom) */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent, #000)' }}
            />
            {/* Selector circle */}
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `calc(${hsv[1]}% - 8px)`,
                top: `calc(${100 - hsv[2]}% - 8px)`,
                backgroundColor: color,
              }}
            />
          </div>

          {/* Hue Slider */}
          <div
            ref={hueRef}
            className="relative w-full h-4 rounded-full cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
            }}
            onMouseDown={(e) => {
              isDraggingHue.current = true;
              handleHueInteraction(e);
            }}
          >
            {/* Hue selector */}
            <div
              className="absolute top-0 w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `calc(${(hsv[0] / 360) * 100}% - 8px)`,
                backgroundColor: pureHueColor,
              }}
            />
          </div>

          {/* Mode toggle + inputs */}
          <div className="flex items-center gap-2">
            <div className="flex bg-background rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => setInputMode('hex')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  inputMode === 'hex'
                    ? "bg-primary text-white"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                HEX
              </button>
              <button
                onClick={() => setInputMode('rgb')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  inputMode === 'rgb'
                    ? "bg-primary text-white"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                RGB
              </button>
            </div>

            {inputMode === 'hex' ? (
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                maxLength={7}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="#000000"
              />
            ) : (
              <div className="flex-1 flex gap-1">
                {(['r', 'g', 'b'] as const).map((ch) => (
                  <div key={ch} className="flex-1">
                    <label className="text-[10px] text-foreground-muted uppercase block text-center">{ch}</label>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={rgbInput[ch]}
                      onChange={(e) => handleRgbChange(ch, e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground text-center font-mono focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg border border-border shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-foreground-muted font-mono">{color}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes animate-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: animate-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
