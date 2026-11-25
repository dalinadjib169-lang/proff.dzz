import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PenTool,
  Highlighter,
  Eraser,
  Minus,
  MoveUpRight,
  Square,
  Circle,
  Type,
  Sparkles,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Maximize2,
  Minimize2,
  Share2,
  Grid3X3,
  AlignJustify,
  Axis3D,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useUpload } from '../hooks/useUpload';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { playSound } from '../lib/sounds';

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'laser';
type SurfaceType = 'chalkboard' | 'whiteboard' | 'night';
type GridType = 'none' | 'lined' | 'grid' | 'axes';

const PALETTE = [
  '#ffffff',
  '#facc15',
  '#38bdf8',
  '#34d399',
  '#fb7185',
  '#a78bfa',
  '#fb923c',
  '#0f172a',
];

const SURFACE_BG: Record<SurfaceType, string> = {
  chalkboard: '#0d3b2e',
  whiteboard: '#f8fafc',
  night: '#090d16',
};

export default function Whiteboard() {
  const { profile } = useAuth();
  const { startUpload } = useUpload();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [surface, setSurface] = useState<SurfaceType>('chalkboard');
  const [grid, setGrid] = useState<GridType>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const [laserTrail, setLaserTrail] = useState<Array<{ x: number; y: number; id: number }>>([]);

  // Text insertion state
  const [textModal, setTextModal] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [textInput, setTextInput] = useState('');
  const [sharing, setSharing] = useState(false);

  const paintSurfaceAndGrid = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, surf: SurfaceType, grd: GridType) => {
      ctx.save();
      ctx.fillStyle = SURFACE_BG[surf];
      ctx.fillRect(0, 0, width, height);

      const lineColor = surf === 'whiteboard' ? 'rgba(15, 23, 42, 0.10)' : 'rgba(255, 255, 255, 0.10)';
      const strongColor = surf === 'whiteboard' ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.40)';

      if (grd === 'lined') {
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        for (let y = 36; y < height; y += 36) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else if (grd === 'grid') {
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        for (let x = 32; x < width; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 32; y < height; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else if (grd === 'axes') {
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        for (let x = 28; x < width; x += 28) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 28; y < height; y += 28) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        const cx = Math.floor(width / 2);
        const cy = Math.floor(height / 2);
        ctx.strokeStyle = strongColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, height);
        ctx.stroke();
        ctx.fillStyle = strongColor;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('O', cx + 8, cy + 16);
        ctx.fillText('X', width - 22, cy - 8);
        ctx.fillText('Y', cx + 10, 20);
      }
      ctx.restore();
    },
    []
  );

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIdx + 1);
      const next = [...sliced, url].slice(-25);
      setHistoryIdx(next.length - 1);
      return next;
    });
  }, [historyIdx]);

  // Initialize canvas size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(window.innerWidth < 640 ? 430 : 540, 380);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      paintSurfaceAndGrid(ctx, width, height, surface, grid);
      const initialUrl = canvas.toDataURL('image/png');
      setHistory([initialUrl]);
      setHistoryIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-switch pen default color nicely when changing board surface
  const handleChangeSurface = (nextSurface: SurfaceType) => {
    setSurface(nextSurface);
    if (nextSurface === 'whiteboard' && color === '#ffffff') setColor('#0f172a');
    if (nextSurface !== 'whiteboard' && color === '#0f172a') setColor('#ffffff');

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    paintSurfaceAndGrid(ctx, canvas.width, canvas.height, nextSurface, grid);
    pushHistory();
  };

  const handleChangeGrid = (nextGrid: GridType) => {
    setGrid(nextGrid);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    paintSurfaceAndGrid(ctx, canvas.width, canvas.height, surface, nextGrid);
    pushHistory();
  };

  const restoreDataUrl = (url: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = url;
  };

  const handleUndo = () => {
    if (historyIdx <= 0) return;
    const target = historyIdx - 1;
    setHistoryIdx(target);
    restoreDataUrl(history[target]);
  };

  const handleRedo = () => {
    if (historyIdx >= history.length - 1) return;
    const target = historyIdx + 1;
    setHistoryIdx(target);
    restoreDataUrl(history[target]);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    paintSurfaceAndGrid(ctx, canvas.width, canvas.height, surface, grid);
    pushHistory();
    toast.success('تم مسح السبورة');
  };

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawShape = (
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    activeTool: ToolType
  ) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else if (activeTool === 'arrow') {
      const headLen = Math.max(12, strokeWidth * 3);
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(to.x, to.y);
      ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (activeTool === 'rect') {
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    } else if (activeTool === 'circle') {
      const rx = Math.abs(to.x - from.x) / 2;
      const ry = Math.abs(to.y - from.y) / 2;
      const cx = (from.x + to.x) / 2;
      const cy = (from.y + to.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getCoords(e);

    if (tool === 'text') {
      setTextModal({ x: pos.x, y: pos.y, visible: true });
      return;
    }

    if (tool === 'laser') {
      setIsDrawing(true);
      setLaserTrail([{ ...pos, id: Date.now() }]);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    setIsDrawing(true);
    startPointRef.current = pos;

    if (tool === 'line' || tool === 'arrow' || tool === 'rect' || tool === 'circle') {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'eraser') {
        ctx.strokeStyle = SURFACE_BG[surface];
        ctx.lineWidth = Math.max(18, strokeWidth * 4);
        ctx.globalAlpha = 1;
      } else if (tool === 'highlighter') {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(14, strokeWidth * 3);
        ctx.globalAlpha = 0.28;
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.globalAlpha = 1;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getCoords(e);

    if (tool === 'laser') {
      const id = Date.now() + Math.random();
      setLaserTrail((prev) => [...prev.slice(-16), { ...pos, id }]);
      setTimeout(() => {
        setLaserTrail((prev) => prev.filter((p) => p.id !== id));
      }, 450);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !startPointRef.current) return;

    if (tool === 'line' || tool === 'arrow' || tool === 'rect' || tool === 'circle') {
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      drawShape(ctx, startPointRef.current, pos, tool);
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(false);

    if (tool === 'laser') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && (tool === 'pen' || tool === 'highlighter' || tool === 'eraser')) {
      ctx.restore();
    }
    snapshotRef.current = null;
    startPointRef.current = null;
    pushHistory();
  };

  const handleCommitText = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !textInput.trim()) {
      setTextModal({ x: 0, y: 0, visible: false });
      setTextInput('');
      return;
    }
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(20, strokeWidth * 5)}px "Amiri", "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(textInput.trim(), textModal.x, textModal.y);
    ctx.restore();
    pushHistory();
    setTextInput('');
    setTextModal({ x: 0, y: 0, visible: false });
  };

  const insertStamp = (symbol: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = 'bold 34px "Amiri", serif';
    ctx.textAlign = 'center';
    ctx.fillText(symbol, canvas.width / 2, canvas.height / 2);
    ctx.restore();
    pushHistory();
    toast.success(`تم إدراج ${symbol} في منتصف السبورة`);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `سبورة_TeachDZ_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم حفظ صورة السبورة بجودة عالية');
    });
  };

  const handleShareBoard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !profile) return;
    setSharing(true);
    try {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('فشل تحضير الصورة');
      const file = new File([blob], `whiteboard_${Date.now()}.png`, { type: 'image/png' });
      const imageUrl = await startUpload(file, 'post', { skipFirestore: true });
      if (!imageUrl) throw new Error('فشل رفع الصورة');
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: `🖍️ شرح توضيحي من السبورة الاحترافية (${profile.subject || 'تعليمي'})`,
        imageUrl,
        likes: [],
        commentCount: 0,
        privacy: 'public',
        createdAt: serverTimestamp(),
      });
      playSound('post');
      toast.success('تم نشر السبورة على الحائط للزملاء والتلاميذ!');
    } catch {
      toast.error('تعذر نشر الصورة، يمكنك تحميلها مباشرة');
    } finally {
      setSharing(false);
    }
  };

  const tools: Array<{ id: ToolType; icon: any; label: string }> = [
    { id: 'pen', icon: PenTool, label: 'قلم' },
    { id: 'highlighter', icon: Highlighter, label: 'تظليل' },
    { id: 'eraser', icon: Eraser, label: 'ممحاة' },
    { id: 'line', icon: Minus, label: 'خط' },
    { id: 'arrow', icon: MoveUpRight, label: 'سهم' },
    { id: 'rect', icon: Square, label: 'مربع' },
    { id: 'circle', icon: Circle, label: 'دائرة' },
    { id: 'text', icon: Type, label: 'نص' },
    { id: 'laser', icon: Sparkles, label: 'ليزر' },
  ];

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-[200] bg-slate-950 p-3 sm:p-5 flex flex-col gap-3 overflow-y-auto'
          : 'space-y-4 pb-24'
      }
      dir="rtl"
    >
      {/* Top Header */}
      <div className="bg-gradient-to-l from-emerald-600/20 via-teal-600/15 to-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
            <PenTool className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white">السبورة الاحترافية التفاعلية</h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-bold">
              للشرح بالرسم، الأشكال الهندسية، المعلم المتعامد ومشاركة الدروس
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className="min-h-[44px] min-w-[44px] px-3 bg-slate-900 border border-slate-700 text-white rounded-xl flex items-center justify-center disabled:opacity-40"
            title="تراجع"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="min-h-[44px] min-w-[44px] px-3 bg-slate-900 border border-slate-700 text-white rounded-xl flex items-center justify-center disabled:opacity-40"
            title="إعادة"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="min-h-[44px] px-3 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>مسح</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="min-h-[44px] min-w-[44px] px-3 bg-slate-900 border border-slate-700 text-white rounded-xl flex items-center justify-center"
            title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownloadPng}
            className="min-h-[44px] px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>حفظ صورة</span>
          </button>
          <button
            onClick={handleShareBoard}
            disabled={sharing}
            className="min-h-[44px] px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 disabled:opacity-60"
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            <span>نشر</span>
          </button>
        </div>
      </div>

      {/* Tools Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        {/* Drawing Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tools.map((item) => (
            <button
              key={item.id}
              onClick={() => setTool(item.id)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                tool === item.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.03]'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Colors & Stroke */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c ? 'border-emerald-400 scale-115 shadow-lg' : 'border-slate-700'
                }`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-black text-slate-400">السُمك</span>
            <input
              type="range"
              min="2"
              max="18"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-20 accent-emerald-500"
            />
            <span className="text-xs font-black text-emerald-400 w-5 text-center">{strokeWidth}</span>
          </div>
        </div>
      </div>

      {/* Surface & Math Grid Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-black text-slate-400 px-2">نوع السبورة:</span>
          {([
            { id: 'chalkboard', label: 'خضراء كلاسيكية' },
            { id: 'whiteboard', label: 'بيضاء' },
            { id: 'night', label: 'ليلية' },
          ] as const).map((s) => (
            <button
              key={s.id}
              onClick={() => handleChangeSurface(s.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                surface === s.id
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-black text-slate-400 px-2">التخطيط:</span>
          {([
            { id: 'none', label: 'فارغة', icon: Square },
            { id: 'lined', label: 'مسطرة', icon: AlignJustify },
            { id: 'grid', label: 'مربعات', icon: Grid3X3 },
            { id: 'axes', label: 'معلم (O,I,J)', icon: Axis3D },
          ] as const).map((g) => (
            <button
              key={g.id}
              onClick={() => handleChangeGrid(g.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all border ${
                grid === g.id
                  ? 'bg-teal-600/20 border-teal-500 text-teal-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <g.icon className="w-3.5 h-3.5" />
              <span>{g.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Pedagogical Symbols */}
        <div className="flex items-center gap-1">
          {['√', 'π', '∑', 'Δ', '∠', '⇔', '✓', '✗'].map((sym) => (
            <button
              key={sym}
              onClick={() => insertStamp(sym)}
              className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-200 text-sm font-black transition-all"
              title={`إدراج ${sym}`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Workspace */}
      <div
        ref={containerRef}
        className="relative rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl bg-slate-950"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full block touch-none cursor-crosshair select-none"
        />

        {/* Laser Pointer Overlay */}
        {laserTrail.map((pt, idx) => (
          <div
            key={pt.id}
            className="pointer-events-none absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.95)]"
            style={{
              left: `${(pt.x / (canvasRef.current?.width || 1)) * 100}%`,
              top: `${(pt.y / (canvasRef.current?.height || 1)) * 100}%`,
              opacity: (idx + 1) / laserTrail.length,
              transform: `scale(${0.4 + (idx / laserTrail.length) * 0.8})`,
            }}
          />
        ))}

        {/* Inline Text Modal */}
        {textModal.visible && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <h4 className="text-sm font-black text-white">إضافة نص على السبورة</h4>
              <input
                type="text"
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitText();
                }}
                placeholder="اكتب القاعدة، المعادلة أو العنوان..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setTextModal({ x: 0, y: 0, visible: false });
                    setTextInput('');
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> إلغاء
                </button>
                <button
                  onClick={handleCommitText}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> تثبيت على السبورة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
