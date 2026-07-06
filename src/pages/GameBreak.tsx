import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Trophy, Clock, RefreshCcw, ArrowRight, Play, Star, Zap, X, Heart, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { playSound } from '../lib/sounds';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';

const EMOJIS = ['🦊', '🐼', '🐨', '🐸', '🐷', '🐮', '🐵', '🦉', '🦄', '🐝', '🦋', '🐢', '🐙', '🦀', '🐳', '🐧', '🐻', '🦁', '🐞', '🐠', '🦖', '🦥'];

const DHIKRS = [
  'سبحان الله', 
  'الحمد لله', 
  'لا إله إلا الله', 
  'الله أكبر', 
  'لا حول ولا قوة إلا بالله', 
  'اللهم صل وسلم على نبينا محمد', 
  'أستغفر الله العظيم', 
  'حسبنا الله ونعم الوكيل', 
  'سبحان الله وبحمده', 
  'سبحان الله العظيم'
];

type Point = { x: number, y: number };

export default function GameBreak() {
  const navigate = useNavigate();
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [grid, setGrid] = useState<(string | null)[][]>([]);
  const [cols, setCols] = useState(6);
  const [rows, setRows] = useState(4);
  
  const [selected, setSelected] = useState<Point | null>(null);
  const [path, setPath] = useState<Point[]>([]);
  const [shuffles, setShuffles] = useState(2);

  // Dhikr State
  const [dhikrEnabled, setDhikrEnabled] = useState(true);
  const [dhikrCount, setDhikrCount] = useState(0);
  const [activeDhikr, setActiveDhikr] = useState<string | null>(null);

  const hasPossibleMoves = useCallback((checkGrid: (string | null)[][], c: number, r: number) => {
    const checkEmpty = (x: number, y: number) => checkGrid[y][x] === null;

    const checkLineInternal = (p1: Point, p2: Point) => {
      if (p1.x !== p2.x && p1.y !== p2.y) return false;
      if (p1.x === p2.x) {
        const min = Math.min(p1.y, p2.y);
        const max = Math.max(p1.y, p2.y);
        for (let y = min + 1; y < max; y++) if (!checkEmpty(p1.x, y)) return false;
        return true;
      } else {
        const min = Math.min(p1.x, p2.x);
        const max = Math.max(p1.x, p2.x);
        for (let x = min + 1; x < max; x++) if (!checkEmpty(x, p1.y)) return false;
        return true;
      }
    };

    const findPathInternal = (p1: Point, p2: Point): boolean => {
      if (p1.x === p2.x && p1.y === p2.y) return false;
      if (checkGrid[p1.y][p1.x] !== checkGrid[p2.y][p2.x]) return false;
      if (checkLineInternal(p1, p2)) return true;

      const pA = { x: p1.x, y: p2.y };
      const pB = { x: p2.x, y: p1.y };
      if (checkEmpty(pA.x, pA.y) && checkLineInternal(p1, pA) && checkLineInternal(pA, p2)) return true;
      if (checkEmpty(pB.x, pB.y) && checkLineInternal(p1, pB) && checkLineInternal(pB, p2)) return true;

      for (let x = 0; x <= c + 1; x++) {
        if (x === p1.x) continue;
        const p3 = { x, y: p1.y };
        if (!checkEmpty(p3.x, p3.y)) continue;
        if (checkLineInternal(p1, p3)) {
          const p4 = { x: p3.x, y: p2.y };
          if (checkEmpty(p4.x, p4.y) && checkLineInternal(p3, p4) && checkLineInternal(p4, p2)) {
            return true;
          }
        }
      }
      for (let y = 0; y <= r + 1; y++) {
        if (y === p1.y) continue;
        const p3 = { x: p1.x, y };
        if (!checkEmpty(p3.x, p3.y)) continue;
        if (checkLineInternal(p1, p3)) {
          const p4 = { x: p2.x, y: p3.y };
          if (checkEmpty(p4.x, p4.y) && checkLineInternal(p3, p4) && checkLineInternal(p4, p2)) {
            return true;
          }
        }
      }
      return false;
    };

    const tiles: Point[] = [];
    for (let y = 1; y <= r; y++) {
      for (let x = 1; x <= c; x++) {
        if (checkGrid[y][x] !== null) {
          tiles.push({ x, y });
        }
      }
    }

    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (checkGrid[tiles[i].y][tiles[i].x] === checkGrid[tiles[j].y][tiles[j].x]) {
          if (findPathInternal(tiles[i], tiles[j])) return true;
        }
      }
    }
    return false;
  }, []);

  const forceShuffle = useCallback((currentGrid: (string | null)[][], c: number, r: number) => {
    let attempts = 0;
    let newGrid = currentGrid.map(row => [...row]);
    
    while (attempts < 10) {
      const items: string[] = [];
      for (let y = 1; y <= r; y++) {
        for (let x = 1; x <= c; x++) {
          if (newGrid[y][x]) items.push(newGrid[y][x]!);
        }
      }
      
      if (items.length === 0) return newGrid;

      items.sort(() => Math.random() - 0.5);
      
      let i = 0;
      for (let y = 1; y <= r; y++) {
        for (let x = 1; x <= c; x++) {
          if (newGrid[y][x] !== null) {
            newGrid[y][x] = items[i++];
          }
        }
      }
      
      if (hasPossibleMoves(newGrid, c, r)) {
        return newGrid;
      }
      attempts++;
    }
    return newGrid; // fallback
  }, [hasPossibleMoves]);

  // Initialize game
  const initGame = useCallback((newLevel: number) => {
    let c = 6 + Math.floor(newLevel / 2) * 2;
    let r = 4 + Math.floor((newLevel - 1) / 2) * 2;
    
    if (c > 10) c = 10;
    if (r > 12) r = 12;

    const totalPairs = (c * r) / 2;
    let emojiList: string[] = [];
    for (let i = 0; i < totalPairs; i++) {
      const emoji = EMOJIS[i % EMOJIS.length];
      emojiList.push(emoji, emoji);
    }
    
    emojiList.sort(() => Math.random() - 0.5);

    let newGrid: (string | null)[][] = Array(r + 2).fill(null).map(() => Array(c + 2).fill(null));
    
    let index = 0;
    for (let y = 1; y <= r; y++) {
      for (let x = 1; x <= c; x++) {
        newGrid[y][x] = emojiList[index++];
      }
    }

    if (!hasPossibleMoves(newGrid, c, r)) {
        newGrid = forceShuffle(newGrid, c, r);
    }

    setCols(c);
    setRows(r);
    setGrid(newGrid);
    setSelected(null);
    setPath([]);
    
    const timeForLevel = Math.max(120, 300 - (newLevel - 1) * 20);
    setTimeLeft(timeForLevel);
  }, [hasPossibleMoves, forceShuffle]);

  const startGame = () => {
    setLevel(1);
    setScore(0);
    setShuffles(2);
    setDhikrCount(0);
    initGame(1);
    setIsPlaying(true);
    playSound('notification');
  };

  const nextLevel = () => {
    const next = level + 1;
    setLevel(next);
    initGame(next);
    setShuffles(s => s + 1); 
    playSound('success');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      playSound('error');
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const isEmpty = (x: number, y: number) => grid[y][x] === null;

  const checkLine = (p1: Point, p2: Point) => {
    if (p1.x !== p2.x && p1.y !== p2.y) return false;
    if (p1.x === p2.x) {
      const min = Math.min(p1.y, p2.y);
      const max = Math.max(p1.y, p2.y);
      for (let y = min + 1; y < max; y++) if (!isEmpty(p1.x, y)) return false;
      return true;
    } else {
      const min = Math.min(p1.x, p2.x);
      const max = Math.max(p1.x, p2.x);
      for (let x = min + 1; x < max; x++) if (!isEmpty(x, p1.y)) return false;
      return true;
    }
  };

  const findPath = (p1: Point, p2: Point): Point[] | null => {
    if (p1.x === p2.x && p1.y === p2.y) return null;
    if (grid[p1.y][p1.x] !== grid[p2.y][p2.x]) return null;

    if (checkLine(p1, p2)) return [p1, p2];

    const pA = { x: p1.x, y: p2.y };
    const pB = { x: p2.x, y: p1.y };
    if (isEmpty(pA.x, pA.y) && checkLine(p1, pA) && checkLine(pA, p2)) return [p1, pA, p2];
    if (isEmpty(pB.x, pB.y) && checkLine(p1, pB) && checkLine(pB, p2)) return [p1, pB, p2];

    for (let x = 0; x <= cols + 1; x++) {
      if (x === p1.x) continue;
      const p3 = { x, y: p1.y };
      if (!isEmpty(p3.x, p3.y)) continue;
      if (checkLine(p1, p3)) {
        const p4 = { x: p3.x, y: p2.y };
        if (isEmpty(p4.x, p4.y) && checkLine(p3, p4) && checkLine(p4, p2)) {
          return [p1, p3, p4, p2];
        }
      }
    }
    for (let y = 0; y <= rows + 1; y++) {
      if (y === p1.y) continue;
      const p3 = { x: p1.x, y };
      if (!isEmpty(p3.x, p3.y)) continue;
      if (checkLine(p1, p3)) {
        const p4 = { x: p2.x, y: p3.y };
        if (isEmpty(p4.x, p4.y) && checkLine(p3, p4) && checkLine(p4, p2)) {
          return [p1, p3, p4, p2];
        }
      }
    }

    return null;
  };

  const applyGravity = (currentGrid: (string | null)[][]) => {
    const newGrid = currentGrid.map(row => [...row]);
    for (let x = 1; x <= cols; x++) {
      let emptySlots = 0;
      for (let y = rows; y >= 1; y--) {
        if (newGrid[y][x] === null) {
          emptySlots++;
        } else if (emptySlots > 0) {
          newGrid[y + emptySlots][x] = newGrid[y][x];
          newGrid[y][x] = null;
        }
      }
    }
    return newGrid;
  };

  const handleTileClick = (x: number, y: number) => {
    if (!isPlaying) return;
    if (isEmpty(x, y)) return;

    if (!selected) {
      setSelected({ x, y });
      playSound('button-click');
      return;
    }

    if (selected.x === x && selected.y === y) {
      setSelected(null);
      return;
    }

    const pPath = findPath(selected, { x, y });
    
    if (pPath) {
      playSound('success');
      setPath(pPath);
      
      const newGrid = [...grid];
      newGrid[selected.y] = [...newGrid[selected.y]];
      newGrid[y] = [...newGrid[y]];
      
      newGrid[selected.y][selected.x] = null;
      newGrid[y][x] = null;
      
      const dist = Math.abs(selected.x - x) + Math.abs(selected.y - y);
      const bonus = dist > 5 ? 50 : 0; 
      setScore(s => s + 10 + bonus);

      if (dhikrEnabled) {
        const randomDhikr = DHIKRS[Math.floor(Math.random() * DHIKRS.length)];
        setActiveDhikr(randomDhikr);
        setDhikrCount(c => c + 1);
        setTimeout(() => setActiveDhikr(null), 2500);
      }
      
      setTimeout(() => {
        let finalGrid = newGrid;
        if (level >= 3) {
          finalGrid = applyGravity(newGrid);
        }
        
        let emptyCount = 0;
        for (let r = 1; r <= rows; r++) {
          for (let c = 1; c <= cols; c++) {
            if (finalGrid[r][c] === null) emptyCount++;
          }
        }
        
        if (emptyCount === rows * cols) {
          setIsPlaying(false);
          playSound('success');
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          setTimeout(nextLevel, 2000);
          setGrid(finalGrid);
          setPath([]);
          return;
        }

        if (!hasPossibleMoves(finalGrid, cols, rows)) {
            toast('لا يوجد حركات! جاري خلط الأوراق 🔀', { icon: '✨', duration: 2000 });
            finalGrid = forceShuffle(finalGrid, cols, rows);
            playSound('button-click');
        }

        setGrid(finalGrid);
        setPath([]);
      }, 300);
      
    } else {
      playSound('error');
    }
    setSelected(null);
  };

  const shuffleGrid = () => {
    if (shuffles <= 0) return;
    setShuffles(s => s - 1);
    const newGrid = forceShuffle(grid, cols, rows);
    setGrid(newGrid);
    setSelected(null);
    playSound('button-click');
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] p-4 md:p-8 flex flex-col items-center overflow-x-hidden">
      
      <AnimatePresence>
        {activeDhikr && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-50 pointer-events-none drop-shadow-2xl"
          >
            <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white font-black text-2xl md:text-4xl px-8 py-4 rounded-full shadow-[0_0_40px_rgba(16,185,129,0.5)] border-4 border-white/30 whitespace-nowrap tracking-wide flex items-center gap-3">
              <Heart className="w-6 h-6 md:w-8 md:h-8 text-rose-300 animate-pulse" fill="currentColor" />
              {activeDhikr}
              <Heart className="w-6 h-6 md:w-8 md:h-8 text-rose-300 animate-pulse" fill="currentColor" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-3 rounded-2xl shadow-lg shadow-fuchsia-500/30">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">استراحة أستاذ</h1>
            <p className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest">تنشيط التركيز والذاكرة</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="p-3 bg-slate-900/50 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all backdrop-blur-md border border-white/5"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {!isPlaying && timeLeft === 300 && score === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-fuchsia-500/20 text-center max-w-md shadow-2xl shadow-indigo-500/10"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-fuchsia-500/20 rounded-full animate-ping opacity-50"></div>
              <Gamepad2 className="w-12 h-12 text-fuchsia-400 relative z-10" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">لعبة التركيز والأذكار</h2>
            <p className="text-slate-400 mb-8 font-bold leading-relaxed text-sm">
              قم بتوصيل الايموجيات المتشابهة بمسار لا يتجاوز 3 خطوط مستقيمة. تزداد اللعبة متعة وتحدياً مع تقدم المستويات!
            </p>
            
            <div className="bg-slate-950 p-4 rounded-2xl mb-8 flex items-center justify-between border border-slate-800">
              <div className="text-right">
                <p className="text-white font-bold text-sm mb-1">تفعيل الأذكار أثناء اللعب</p>
                <p className="text-slate-500 text-xs">تكسب أجر الذكر مع كل تطابق</p>
              </div>
              <button 
                onClick={() => setDhikrEnabled(!dhikrEnabled)}
                className={`w-14 h-8 rounded-full transition-colors relative ${dhikrEnabled ? 'bg-fuchsia-500' : 'bg-slate-700'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${dhikrEnabled ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-fuchsia-500/25 transition-all flex items-center justify-center gap-3 active:scale-95 text-lg"
            >
              <Play className="w-6 h-6" fill="currentColor" />
              ابدأ اللعب الآن
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center shadow-lg">
              <Star className="w-5 h-5 text-amber-400 mb-2" />
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">المستوى</span>
              <span className="text-2xl font-black text-white">{level}</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center shadow-lg">
              <Trophy className="w-5 h-5 text-indigo-400 mb-2" />
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">النقاط</span>
              <span className="text-2xl font-black text-white">{score}</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center shadow-lg">
              <Clock className={`w-5 h-5 mb-2 ${timeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-sky-400'}`} />
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">الوقت</span>
              <span className={`text-2xl font-black ${timeLeft < 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-rose-400 mb-2" />
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">الأذكار</span>
              <span className="text-2xl font-black text-white">{dhikrCount}</span>
            </div>
            <button 
              onClick={shuffleGrid}
              disabled={shuffles <= 0}
              className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center shadow-lg disabled:opacity-50 transition-all active:scale-95"
            >
              <RefreshCcw className="w-5 h-5 text-fuchsia-400 mb-2" />
              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">خلط (تبقّى)</span>
              <span className="text-2xl font-black text-white">{shuffles}</span>
            </button>
          </div>

          <div className="relative bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-fuchsia-900/40 backdrop-blur-xl p-3 md:p-6 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(217,70,239,0.15)]">
            {timeLeft === 0 && (
              <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center flex-col rounded-[2.5rem]">
                <h2 className="text-4xl font-black text-white mb-4">انتهى الوقت!</h2>
                <p className="text-slate-300 mb-2 font-bold text-lg">لقد حققت <span className="text-fuchsia-400">{score}</span> نقطة</p>
                <p className="text-slate-400 mb-8 font-bold">وذكرت الله <span className="text-rose-400">{dhikrCount}</span> مرة! تقبل الله.</p>
                <button 
                  onClick={startGame}
                  className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-fuchsia-500/20 transition-all active:scale-95 flex items-center gap-3 text-lg"
                >
                  <RefreshCcw className="w-6 h-6" />
                  العب من جديد
                </button>
              </div>
            )}

            <svg className="absolute inset-0 pointer-events-none z-20 w-full h-full" style={{ minWidth: '100%', minHeight: '100%' }}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {path.length > 0 && path.map((p, i) => {
                if (i === path.length - 1) return null;
                const nextP = path[i + 1];
                const x1 = ((p.x + 0.5) / (cols + 2)) * 100;
                const y1 = ((p.y + 0.5) / (rows + 2)) * 100;
                const x2 = ((nextP.x + 0.5) / (cols + 2)) * 100;
                const y2 = ((nextP.y + 0.5) / (rows + 2)) * 100;
                
                return (
                  <line
                    key={i}
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    stroke="#d946ef"
                    strokeWidth="8"
                    strokeLinecap="round"
                    filter="url(#glow)"
                    className="animate-pulse shadow-fuchsia-500"
                  />
                );
              })}
            </svg>

            <div 
              className="grid gap-1.5 md:gap-2.5 relative z-10"
              style={{ 
                gridTemplateColumns: `repeat(${cols + 2}, minmax(0, 1fr))`,
                width: 'min(95vw, 850px)' 
              }}
            >
              {grid.map((row, y) => 
                row.map((tile, x) => {
                  const isBorder = x === 0 || x === cols + 1 || y === 0 || y === rows + 1;
                  const isSelected = selected?.x === x && selected?.y === y;
                  
                  return (
                    <div 
                      key={`${x}-${y}`} 
                      className={`relative aspect-square flex items-center justify-center ${isBorder ? 'pointer-events-none' : ''}`}
                    >
                      {tile && (
                        <div
                          onClick={() => handleTileClick(x, y)}
                          className={`
                            w-full h-full rounded-xl md:rounded-2xl flex items-center justify-center text-3xl md:text-5xl cursor-pointer
                            transition-all duration-200 select-none border border-white/20 backdrop-blur-sm
                            ${isSelected 
                              ? 'bg-fuchsia-500 shadow-[inset_0_4px_10px_rgba(0,0,0,0.3),0_0_15px_rgba(217,70,239,0.6)] translate-y-1' 
                              : 'bg-gradient-to-br from-indigo-500/80 to-purple-600/80 shadow-[0_6px_0_rgba(76,29,149,0.8),0_10px_15px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:shadow-[0_8px_0_rgba(76,29,149,0.8),0_15px_20px_rgba(0,0,0,0.5)] hover:from-indigo-400 hover:to-purple-500 active:translate-y-1 active:shadow-[0_2px_0_rgba(76,29,149,0.8),0_5px_10px_rgba(0,0,0,0.5)]'}
                          `}
                          style={{
                            transformStyle: 'preserve-3d',
                            perspective: '1000px'
                          }}
                        >
                          <motion.span 
                            animate={{ 
                              rotate: isSelected ? [0, -10, 10, -10, 10, 0] : 0,
                              scale: isSelected ? 1.1 : 1
                            }}
                            transition={{ duration: 0.5 }}
                            style={{
                              filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.5))'
                            }}
                          >
                            {tile}
                          </motion.span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
