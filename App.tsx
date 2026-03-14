
import React, { useState, useEffect, useRef } from 'react';
import { KilnOCRResult, ExtractionRecord } from './types';
import { processUnifiedImages } from './services/geminiService';
import ChatBot from './src/components/ChatBot';

const KILN_CONFIGS: Record<string, string[]> = {
  "DC1": ["M31_M031", "M33_M033", "M35_M035", "M37_M037", "M39_M039", "M41_M041", "M43_M043", "M45_M045", "M47_M047", "M49_M049", "M51_M051", "M53_M053", "M55_M055", "M57_M057"],
  "DC2": ["M31_M031", "M33_M033", "M35_M035", "M37_M037", "M39_M039", "M41_M041", "M43_M043", "M45_M045", "M47_M047", "M49_M049", "M51_M051", "M53_M053", "M55_M055", "M57_M057"]
};

const LAB_LABELS: Record<string, string> = {
  CUONG_DO_BE: 'Cường độ bẻ',
  DO_DAY_MIN: 'Độ dày Min',
  PHA_HUY: 'Phá hủy',
  BEN_UON: 'Bền uốn'
};

const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyTQNsxBgcORWAWQOKXBJBTIaIr_3aGSqbXfxhsiWZnfOdDwSQGnlzngGWPWVSFbcTrLw/exec";

interface ImageItem {
  src: string;
  brightness: number;
  contrast: number;
}

interface LineImages {
  loXuong: ImageItem | null;
  loMen: ImageItem | null;
  phieuLab: ImageItem | null;
}

interface ResultBoxProps {
  key?: React.Key;
  label: string;
  value: any;
  accentColor: string;
  isOutRange?: boolean;
}

const ResultBox = ({ label, value, accentColor, isOutRange }: ResultBoxProps) => {
  const formatLabData = (val: any) => {
    if (!val) return "";
    return val.toString()
      .replace(/['"‘’]/g, ' ÷ ')
      .replace(/\.\./g, ' ÷ ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanValue = label.includes('M') ? value : formatLabData(value);
  const isError = !cleanValue || cleanValue === "ERR / ERR" || cleanValue === "ERR_READ" || cleanValue === "NOT_FOUND" || String(cleanValue)?.toLowerCase().includes("missing");
  const displayLabel = label.replace('_', '/');

  return (
    <div className={`p-3 rounded-xl border transition-all ${isError ? 'bg-red-900/40 border-red-500 animate-pulse' : 'bg-slate-800 border-slate-700'}`}>
      <span className="text-[8px] text-slate-400 uppercase font-bold block mb-1">{displayLabel}</span>
      <span className={`text-sm font-mono font-black ${isError ? 'text-red-200' : isOutRange ? 'text-red-400' : accentColor}`}>
        {isError ? "⚠️ LỖI ĐỌC" : cleanValue}
      </span>
    </div>
  );
};

const App: React.FC = () => {
  const [history, setHistory] = useState<ExtractionRecord[]>(() => {
    const saved = localStorage.getItem('kiln_history_final_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dc1Images, setDc1Images] = useState<LineImages>({ loXuong: null, loMen: null, phieuLab: null });
  const [dc2Images, setDc2Images] = useState<LineImages>({ loXuong: null, loMen: null, phieuLab: null });
  const [finalResult, setFinalResult] = useState<KilnOCRResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [line, setLine] = useState("DC1");
  const [kilnType, setKilnType] = useState("Men");

  const resultsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('kiln_history_final_v1', JSON.stringify(history));
  }, [history]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, targetLine: 'DC1' | 'DC2', slot: keyof LineImages) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: ImageItem = { 
          src: reader.result as string,
          brightness: 100,
          contrast: 100,
        };
        if (targetLine === 'DC1') {
          setDc1Images(prev => ({ ...prev, [slot]: newItem }));
        } else {
          setDc2Images(prev => ({ ...prev, [slot]: newItem }));
        }
        setFinalResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateImageFilter = (targetLine: 'DC1' | 'DC2', slot: keyof LineImages, filter: 'brightness' | 'contrast', value: number) => {
    if (targetLine === 'DC1') {
      setDc1Images(prev => {
        const img = prev[slot];
        if (!img) return prev;
        return { ...prev, [slot]: { ...img, [filter]: value } };
      });
    } else {
      setDc2Images(prev => {
        const img = prev[slot];
        if (!img) return prev;
        return { ...prev, [slot]: { ...img, [filter]: value } };
      });
    }
  };

  const compressAndFilterImage = (imgItem: ImageItem): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imgItem.src;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imgItem.src);
        const scale = 1200 / img.width; // Tăng độ phân giải một chút để AI dễ đọc
        canvas.width = 1200;
        canvas.height = img.height * scale;
        ctx.filter = `brightness(${imgItem.brightness}%) contrast(${imgItem.contrast}%)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
    });
  };

  const runAnalysis = async (retryCount = 0) => {
    const hasDc1 = dc1Images.loXuong || dc1Images.loMen || dc1Images.phieuLab;
    const hasDc2 = dc2Images.loXuong || dc2Images.loMen || dc2Images.phieuLab;
    if (!hasDc1 && !hasDc2) return;

    setIsProcessing(true);
    setError(null);
    if (retryCount === 0) {
      setFinalResult(null);
      setStatusMessage(null);
    }
    
    try {
      const configs: Record<string, string[]> = {};
      if (hasDc1) configs["DC1"] = KILN_CONFIGS["DC1"];
      if (hasDc2) configs["DC2"] = KILN_CONFIGS["DC2"];

      const prepareImages = async (lineImages: LineImages, lineId: string) => {
        const parts = [];
        if (lineImages.loXuong) {
          const base64 = await compressAndFilterImage(lineImages.loXuong);
          parts.push({ base64, description: `${lineId}_Slot1: Lò Xương ${lineId}` });
        }
        if (lineImages.loMen) {
          const base64 = await compressAndFilterImage(lineImages.loMen);
          parts.push({ base64, description: `${lineId}_Slot2: Lò Men ${lineId}` });
        }
        if (lineImages.phieuLab) {
          const base64 = await compressAndFilterImage(lineImages.phieuLab);
          parts.push({ base64, description: `${lineId}_Slot3: Phiếu LAB ${lineId}` });
        }
        return parts;
      };

      const dc1ImagesForAI = await prepareImages(dc1Images, "DC1");
      const dc2ImagesForAI = await prepareImages(dc2Images, "DC2");

      const allImagesForAI = [...dc1ImagesForAI, ...dc2ImagesForAI];

      const data = await processUnifiedImages(allImagesForAI, configs);
      
      setFinalResult(data);
      setStatusMessage("🟢 Dữ liệu đã trích xuất thành công.");
      setTimeout(() => resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    } catch (err: any) {
      if (retryCount < 2) {
        setStatusMessage("🔴 Lỗi kết nối - Đang tự động thử lại...");
        setTimeout(() => runAnalysis(retryCount + 1), 2000);
        return;
      } else {
        setError("Hệ thống Vision AI đang bận hoặc ảnh không đạt tiêu chuẩn. Vui lòng thử lại.");
        setStatusMessage("🔴 Lỗi kết nối - Vui lòng kiểm tra mạng.");
      }
    } finally {
      if (retryCount === 0 || retryCount >= 2) {
        setIsProcessing(false);
      }
    }
  };

  const isValueInvalid = (val: any) => {
    if (!val || val === null) return true;
    const s = String(val).toLowerCase().trim();
    return s === "" || s === "missing" || s === "n/a" || s === "null" || s === "0/0" || s === "n/a/n/a" || s === "missing/missing" || s === "err_read" || s === "not_found";
  };

  const isTemperatureOutRange = (val: string) => {
    if (isValueInvalid(val)) return false;
    const parts = val.split('/');
    return parts.some(p => {
      const num = parseFloat(p.trim());
      return !isNaN(num) && (num < 500 || num > 1300);
    });
  };

  const handleDataUpdate = (path: string[], value: string) => {
    if (!finalResult) return;
    const newResult = JSON.parse(JSON.stringify(finalResult));
    let current = newResult;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setFinalResult(newResult);
  };

  const saveToHistory = () => {
    if (!finalResult) return;
    const record: ExtractionRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('vi-VN'),
      mode: 'MONITOR',
      line,
      kilnType,
      dc1Images: JSON.parse(JSON.stringify(dc1Images)),
      dc2Images: JSON.parse(JSON.stringify(dc2Images)),
      data: JSON.parse(JSON.stringify(finalResult))
    };
    setHistory(prev => [record, ...prev]);
    alert("✅ Đã lưu vào lịch sử hệ thống.");
  };

  const loadFromHistory = (record: ExtractionRecord) => {
    setLine(record.line);
    setKilnType(record.kilnType);
    setDc1Images(record.dc1Images || { loXuong: null, loMen: null, phieuLab: null });
    setDc2Images(record.dc2Images || { loXuong: null, loMen: null, phieuLab: null });
    setTimeout(() => {
      setFinalResult(JSON.parse(JSON.stringify(record.data)));
      setError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  const syncToSheets = async () => {
    if (!finalResult) return;
    setIsSyncing(true);
    try {
      // Ép kiểu gửi text/plain để vượt qua bộ chặn của Macbook
      await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({data: finalResult})
      });
      alert("✅ Đã gửi lệnh lưu! Anh kiểm tra file Sheets nhé.");
    } catch (e: any) {
      alert("🔴 Lỗi: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const renderLabSection = (title: string, dataKey: string, accentColor: string) => {
    if (!finalResult || !finalResult[dataKey]) return null;
    const labData = finalResult[dataKey];
    const hasData = Object.keys(LAB_LABELS).some(key => labData[key] && !isValueInvalid(labData[key].avg));
    if (!hasData) return null;

    return (
      <div className="space-y-4">
        <h4 className={`text-[10px] font-black uppercase tracking-widest ${accentColor} flex items-center gap-2 italic`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span> {title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.keys(LAB_LABELS).map(key => {
            const item = labData[key];
            if (!item) return null;
            const isInvalid = isValueInvalid(item.avg);
            return (
              <div key={key} className={`p-4 rounded-2xl border transition-all ${isInvalid ? 'animate-pulse-red' : 'bg-white/5 border-white/5'}`}>
                <div className="flex justify-between text-[8px] mb-1">
                  <span className="font-bold text-white/30 uppercase">{LAB_LABELS[key]}</span>
                  <span className="font-mono text-white/20 italic">{item.range || '--'}</span>
                </div>
                <div className="flex items-end gap-2">
                  <input 
                    type="text" 
                    value={item.avg || ''} 
                    onChange={(e) => handleDataUpdate([dataKey, key, 'avg'], e.target.value)} 
                    className="bg-transparent w-full text-xl font-black text-white font-mono outline-none" 
                    placeholder="Min ÷ Max" 
                  />
                  <span className="text-[7px] text-white/10 mb-1 uppercase">Khoảng</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const ImageSlot = ({ label, icon, sub, lineId, slot }: { label: string, icon: string, sub?: string, lineId: 'DC1' | 'DC2', slot: keyof LineImages }) => {
    const images = lineId === 'DC1' ? dc1Images : dc2Images;
    const img = images[slot];

    return (
      <div className="flex flex-col gap-2">
        <div className="relative group border-2 border-dashed border-slate-700 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-800/30 transition-all cursor-pointer h-36 overflow-hidden">
          {img ? (
            <>
              <img 
                src={img.src} 
                className="w-full h-full object-cover transition-all"
                style={{ filter: `brightness(${img.brightness}%) contrast(${img.contrast}%)` }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (lineId === 'DC1') setDc1Images(prev => ({ ...prev, [slot]: null }));
                    else setDc2Images(prev => ({ ...prev, [slot]: null }));
                  }} 
                  className="w-8 h-8 bg-red-500 rounded-full text-white flex items-center justify-center shadow-lg z-20"
                >✕</button>
              </div>
            </>
          ) : (
            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
              <span className="text-2xl mb-2">{icon}</span>
              <span className="text-xs font-bold text-center">{label}</span>
              {sub && <span className="text-[9px] text-slate-500 mt-1 uppercase">{sub}</span>}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, lineId, slot)} />
            </label>
          )}
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity pointer-events-none"></div>
        </div>
        {img && (
          <div className="flex flex-col gap-1 px-1">
            <div className="flex justify-between items-center">
              <span className="text-[7px] font-black text-white/20 uppercase">Brightness</span>
              <span className="text-[7px] font-mono text-blue-400">{img.brightness}%</span>
            </div>
            <input 
              type="range" min="50" max="200" value={img.brightness} 
              onChange={(e) => updateImageFilter(lineId, slot, 'brightness', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-white font-sans selection:bg-blue-500/30">
      <header className="max-w-6xl mx-auto w-full mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-blue-400 uppercase tracking-tighter italic">MODENA VISION <span className="text-white">V1.7.5</span></h1>
            <p className="text-[10px] text-white/40 font-bold tracking-[0.2em] uppercase mt-1">HỆ THỐNG KIỂM SOÁT SONG SONG</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-4 py-2 rounded-2xl border border-blue-500/20">WEBHOOK ACTIVE</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex flex-col gap-6">
            {/* DÂY CHUYỀN 1 */}
            <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl"></div>
              <h2 className="text-lg font-bold text-blue-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-500 rounded-full"></span> DÂY CHUYỀN 1 (DC1)
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <ImageSlot label="LÒ XƯƠNG DC1" icon="🔥" lineId="DC1" slot="loXuong" />
                <ImageSlot label="LÒ MEN DC1" icon="✨" lineId="DC1" slot="loMen" />
                <ImageSlot label="PHIẾU LAB DC1" icon="📝" lineId="DC1" slot="phieuLab" />
              </div>
            </div>

            {/* DÂY CHUYỀN 2 */}
            <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 blur-3xl"></div>
              <h2 className="text-lg font-bold text-green-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-green-500 rounded-full"></span> DÂY CHUYỀN 2 (DC2)
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <ImageSlot label="LÒ XƯƠNG DC2" icon="🔥" sub="Trống nếu gạch lát" lineId="DC2" slot="loXuong" />
                <ImageSlot label="LÒ MEN DC2" icon="✨" lineId="DC2" slot="loMen" />
                <ImageSlot label="PHIẾU LAB DC2" icon="📝" lineId="DC2" slot="phieuLab" />
              </div>
            </div>

            {/* NÚT ĐIỀU KHIỂN CHÍNH */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button 
                onClick={() => runAnalysis()}
                disabled={isProcessing}
                className={`py-4 bg-slate-800 border border-slate-700 rounded-xl font-bold text-lg hover:bg-slate-700 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}`}
              >
                {isProcessing ? '🔄 ĐANG TRÍCH XUẤT...' : '🚀 CHẠY TRÍCH XUẤT'}
              </button>
              <button 
                onClick={() => syncToSheets()}
                disabled={isSyncing || !finalResult}
                className={`py-4 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl font-bold text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all ${(isSyncing || !finalResult) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSyncing ? '⌛ ĐANG LƯU...' : '💾 LƯU KẾT QUẢ (SHEETS)'}
              </button>
            </div>
            
            {statusMessage && (
              <div className="text-[10px] font-bold text-center text-blue-400 uppercase tracking-widest bg-blue-500/10 py-2 rounded-xl border border-blue-500/20">
                {statusMessage}
              </div>
            )}
          </div>

          <section className="glass rounded-[32px] p-6 border-white/5 shadow-xl">
            <h3 className="text-[9px] font-black text-white/30 uppercase mb-4 italic flex items-center gap-2">
              <span className="w-2 h-[1px] bg-white/10"></span> LỊCH SỬ NHẬT KÝ
            </h3>
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {history.length > 0 ? history.map(h => (
                <div key={h.id} onClick={() => loadFromHistory(h)} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white/10 transition-all border border-white/5 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-xs group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">📋</div>
                    <div>
                      <p className="text-[10px] font-black text-white">{h.timestamp}</p>
                      <p className="text-[8px] text-white/30 font-bold uppercase">{h.line} • {h.kilnType}</p>
                    </div>
                  </div>
                </div>
              )) : <div className="text-center py-8"><p className="text-[9px] text-white/10 uppercase font-bold italic">Chưa có dữ liệu snapshot</p></div>}
            </div>
          </section>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6" ref={resultsEndRef}>
          <section className="glass rounded-[40px] p-8 border-white/5 min-h-[600px] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] rounded-full"></div>
            
            <div className="flex justify-between items-center mb-10 relative z-10">
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-white uppercase tracking-widest italic">PARALLEL EXTRACTION RESULTS</h2>
                <span className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">v1.7.5 Production Monitor</span>
              </div>
              {finalResult && (
                <div className="flex gap-2">
                  <button onClick={saveToHistory} className="text-[9px] font-black bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl transition-all border border-white/10">LƯU NHẬT KÝ</button>
                  <button onClick={() => syncToSheets()} disabled={isSyncing} className="text-[9px] font-black bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-green-900/20">
                    {isSyncing ? 'ĐANG LƯU...' : 'ĐỒNG BỘ SHEETS'}
                  </button>
                </div>
              )}
            </div>

            {error && <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[32px] text-red-400 text-xs font-bold mb-6 flex items-start gap-4 animate-shake">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="uppercase tracking-widest text-[10px] opacity-60 mb-1 font-black">Lỗi hệ thống vision</p>
                {error}
              </div>
            </div>}

            {finalResult ? (
              <div className="space-y-12 animate-slide-up pb-10 relative z-10 overflow-y-auto max-h-[800px] pr-4 custom-scrollbar">
                {Object.keys(finalResult).map(lineId => {
                  const lineData = finalResult[lineId];
                  const isDC1 = lineId === 'DC1';
                  const accentColor = isDC1 ? 'text-blue-400' : 'text-green-400';
                  const borderColor = isDC1 ? 'border-blue-500/20' : 'border-green-500/20';
                  const bgColor = isDC1 ? 'bg-blue-500/5' : 'bg-green-500/5';

                  return (
                    <div key={lineId} className={`p-8 rounded-[40px] border ${borderColor} ${bgColor} space-y-8`}>
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <h3 className={`text-xl font-black uppercase italic ${accentColor}`}>{lineId} EXTRACTION</h3>
                        <div className="flex gap-3">
                          <ResultBox label="Mã SP (LAB)" value={lineData.MA_SP} accentColor="text-white" />
                        </div>
                      </div>

                      {/* NHIỆT ĐỘ LÒ XƯƠNG */}
                      {lineData.LO_XUONG && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">● NHIỆT ĐỘ LÒ XƯƠNG (SV)</p>
                            <div className="flex gap-2">
                              <span className="text-[8px] text-white/30 uppercase font-bold">CK: {lineData.LO_XUONG.CK_LO || '--'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {lineData.LO_XUONG.NHIET_DO && Object.keys(lineData.LO_XUONG.NHIET_DO).map(pair => (
                              <ResultBox key={pair} label={pair} value={lineData.LO_XUONG.NHIET_DO[pair]} accentColor={accentColor} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* NHIỆT ĐỘ LÒ MEN */}
                      {lineData.LO_MEN && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">● NHIỆT ĐỘ LÒ MEN (SV)</p>
                            <div className="flex gap-2">
                              <span className="text-[8px] text-white/30 uppercase font-bold">CK: {lineData.LO_MEN.CK_LO || '--'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {lineData.LO_MEN.NHIET_DO && Object.keys(lineData.LO_MEN.NHIET_DO).map(pair => (
                              <ResultBox key={pair} label={pair} value={lineData.LO_MEN.NHIET_DO[pair]} accentColor={accentColor} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* LAB CƠ LÝ */}
                      {lineData.LAB_CO_LY && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {['XUONG', 'MEN'].map(labKey => {
                            const labData = lineData.LAB_CO_LY[labKey];
                            if (!labData || Object.values(labData).every(v => !v || v === 'null')) return null;
                            return (
                              <div key={labKey} className="space-y-3">
                                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest italic">
                                  {labKey === 'MEN' ? 'LAB MEN (CĐM)' : 'LAB XƯƠNG (CĐX)'}
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.keys(LAB_LABELS).map(key => (
                                    <ResultBox 
                                      key={key} 
                                      label={LAB_LABELS[key]} 
                                      value={labData[key]} 
                                      accentColor="text-white/80" 
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 bg-blue-500/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <svg className="w-10 h-10 text-blue-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.5em] italic">Awaiting Parallel Input Data</p>
                <p className="text-[8px] text-white/10 mt-2 uppercase font-bold">Tải ảnh cho DC1 và DC2 để bắt đầu trích xuất song song</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <ChatBot pageData={finalResult} />
    </div>
  );
};

export default App;
