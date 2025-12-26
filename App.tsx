/// <reference lib="dom" />
import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { Dropzone } from './components/Dropzone';
import { FlipbookViewer } from './FlipbookViewer';
import { AsciiPlayer } from './AsciiPlayer';
import { Loader } from './Loader';
import { DownloadIcon, FilmIcon, SparklesIcon, XCircleIcon, MonochromeIcon, PencilIcon, PhotoIcon, CelShadingIcon, PopArtIcon, AnimationSketchIcon, ColorfulIcon, ChevronDownIcon, UkiyoEIcon, EightBitIcon, AsciiArtIcon, ClipboardIcon, CheckIcon, RedoIcon, SilhouetteIcon, OutlineIcon, TransparentBgIcon, InvertIcon, ZoomInIcon, ZoomOutIcon, FitScreenIcon, EnterFullscreenIcon, ExitFullscreenIcon } from './Icons';
import { generateTitleForImage } from './services/geminiService';
import { applyPencilSketchEffect, applyCelShadingEffect, applyPopArtEffect, applyGengaEffect, applyUkiyoE_Effect, apply8BitEffect, convertImageToAscii, applySilhouetteEffect, applyColoredAsciiEffect, type GengaConfig } from './services/imageEffects';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

type Status = 'idle' | 'loading' | 'processing' | 'success' | 'error';
type Effect = 'none' | 'monochrome' | 'pencil' | 'cel' | 'popart' | 'genga' | 'ukiyo-e' | '8bit' | 'ascii' | 'silhouette';
type ViewMode = 'idle' | 'flipbook' | 'ascii';

interface DownloadInfo {
    url: string;
    filename: string;
    type: 'GIF' | 'MP4' | 'TXT' | 'JPG';
}
interface ResolutionOption {
    key: string;
    label: string;
    width: number;
    height: number;
}

const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.split(',')[1];
    if (!base64) throw new Error("Invalid data URL format");
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
    return bytes;
};

interface EffectButtonProps {
    label: string;
    icon?: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    disabled: boolean;
}
const EffectButton: React.FC<EffectButtonProps> = ({ label, icon, isActive, onClick, disabled }) => {
    const baseClasses = "w-full flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 disabled:opacity-50 disabled:cursor-not-allowed";
    const activeClasses = "bg-cyan-500 text-white shadow focus:ring-cyan-500";
    const inactiveClasses = "bg-slate-600 hover:bg-slate-500 text-slate-300 focus:ring-cyan-600";
    
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`} aria-pressed={isActive}>
            {icon}<span>{label}</span>
        </button>
    );
};

interface ColorPickerProps { label: string; colors: string[]; selectedColor: string; onChange: (color: string) => void; disabled: boolean; }
const ColorPicker: React.FC<ColorPickerProps> = ({ label, colors, selectedColor, onChange, disabled }) => (
    <div>
        <label className="block text-xs font-medium text-slate-400 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
            {colors.map(color => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onChange(color)}
                    disabled={disabled}
                    className={`w-8 h-8 rounded-full border-2 border-transparent transition-transform duration-200 transform hover:scale-110 focus:outline-none ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-cyan-400' : 'ring-slate-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={color !== 'colorful' ? { backgroundColor: color } : {}}
                    aria-label={`Select color ${color}`}
                    aria-pressed={selectedColor === color}
                >
                    {color === 'colorful' && <ColorfulIcon className="w-6 h-6" />}
                </button>
            ))}
        </div>
    </div>
);

interface RangeSliderProps { min: number; max: number; value: [number, number]; onChange: (newValue: [number, number]) => void; disabled: boolean; }
const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, value, onChange, disabled }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef(value);
    valueRef.current = value;

    const getPercent = useCallback((val: number) => (max - min === 0) ? 0 : ((val - min) / (max - min)) * 100, [min, max]);
    
    const createDragHandler = useCallback((thumb: 'min' | 'max') => (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled || !containerRef.current) return;
        e.preventDefault();
        const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
            if (!containerRef.current) return;
            const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const { left, width } = containerRef.current.getBoundingClientRect();
            const percent = Math.min(Math.max((clientX - left) / width, 0), 1);
            const newValue = min + percent * (max - min);
            const [currentMin, currentMax] = valueRef.current;
            if (thumb === 'min') onChange([Math.min(newValue, currentMax), currentMax]);
            else onChange([currentMin, Math.max(newValue, currentMin)]);
        };
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('touchend', upHandler);
        };
        document.addEventListener('mousemove', moveHandler); document.addEventListener('mouseup', upHandler);
        document.addEventListener('touchmove', moveHandler); document.addEventListener('touchend', upHandler);
    }, [min, max, disabled, onChange]);

    const minPercent = getPercent(value[0]);
    const maxPercent = getPercent(value[1]);
    return (
        <div ref={containerRef} className="range-slider-container" data-disabled={disabled}>
            <div className="range-slider-track" /><div className="range-slider-range" style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }} />
            <div className="range-slider-thumb" style={{ left: `${minPercent}%` }} onMouseDown={createDragHandler('min')} onTouchStart={createDragHandler('min')} role="slider" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value[0]} aria-label="Video start time" />
            <div className="range-slider-thumb" style={{ left: `${maxPercent}%` }} onMouseDown={createDragHandler('max')} onTouchStart={createDragHandler('max')} role="slider" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value[1]} aria-label="Video end time" />
        </div>
    );
};

const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
};

export default function App(): React.ReactNode {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('idle');
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [originalFrames, setOriginalFrames] = useState<string[]>([]);
  const [processedFrames, setProcessedFrames] = useState<string[]>([]);
  const [asciiFrames, setAsciiFrames] = useState<string[]>([]);
  const [fps, setFps] = useState(12);
  const [effect, setEffect] = useState<Effect>('none');
  const [selectedResolutionKey, setSelectedResolutionKey] = useState<string>('auto');
  const [resolutionOptions, setResolutionOptions] = useState<ResolutionOption[]>([]);
  const [aiTitle, setAiTitle] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [timeRange, setTimeRange] = useState<[number, number]>([0, 0]);
  const [gengaConfig, setGengaConfig] = useState<GengaConfig>({ outline: '#000000', shadow: '#3b82f6', highlight: '#f43f5e' });
  const [improveGengaQuality, setImproveGengaQuality] = useState(true);
  const [gengaLineThreshold, setGengaLineThreshold] = useState(50);
  const [eightBitPixelSize, setEightBitPixelSize] = useState(8);
  const [videoAsciiWidth, setVideoAsciiWidth] = useState<number>(100);
  const [videoAsciiOutlineMode, setVideoAsciiOutlineMode] = useState(false);
  const [videoAsciiLineThreshold, setVideoAsciiLineThreshold] = useState(50);
  const [videoAsciiTransparentBg, setVideoAsciiTransparentBg] = useState(false);
  const [videoAsciiBgThreshold, setVideoAsciiBgThreshold] = useState(20);
  const [videoAsciiInvertColors, setVideoAsciiInvertColors] = useState(false);
  const [videoAsciiColorMode, setVideoAsciiColorMode] = useState(false);
  
  const [silhouetteThreshold, setSilhouetteThreshold] = useState(128);
  const [isDownloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [isCopyMenuOpen, setCopyMenuOpen] = useState(false);
  const [isSaveMenuOpen, setSaveMenuOpen] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageAsciiOutput, setImageAsciiOutput] = useState<string>('');
  const [imageAsciiDataUrl, setImageAsciiDataUrl] = useState<string | null>(null); // For colored ASCII image
  const [imageAsciiWidth, setImageAsciiWidth] = useState<number>(150);
  const [imageAsciiFontSize, setImageAsciiFontSize] = useState(10);
  const [imageAsciiOutlineMode, setImageAsciiOutlineMode] = useState(false);
  const [imageAsciiLineThreshold, setImageAsciiLineThreshold] = useState(50);
  const [imageAsciiTransparentBg, setImageAsciiTransparentBg] = useState(false);
  const [imageAsciiBgThreshold, setImageAsciiBgThreshold] = useState(20);
  const [imageAsciiInvertColors, setImageAsciiInvertColors] = useState(false);
  const [imageAsciiColorMode, setImageAsciiColorMode] = useState(false);

  const [hasCopied, setHasCopied] = useState<'text' | 'html' | false>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  const imageAsciiContainerRef = useRef<HTMLDivElement>(null);
  const flipbookViewerRef = useRef<HTMLDivElement>(null);
  const asciiViewerRef = useRef<HTMLDivElement>(null);

  const isProcessing = status === 'processing' || status === 'loading';

  const ffmpegProgressListener = useCallback(({ progress: p }: { progress: number; }) => {
    if (p >= 0) setProgress(Math.round(p * 100));
  }, []);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  const toggleFullscreen = useCallback((targetRef: React.RefObject<HTMLDivElement>) => {
    if (!targetRef.current) return;
    
    if (!document.fullscreenElement) {
      targetRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (downloadMenuRef.current && !downloadMenuRef.current.contains(target)) setDownloadMenuOpen(false);
        if (copyMenuRef.current && !copyMenuRef.current.contains(target)) setCopyMenuOpen(false);
        if (saveMenuRef.current && !saveMenuRef.current.contains(target)) setSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const currentUrl = downloadInfo?.url;
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [downloadInfo]);

  const resetState = () => {
    setVideoFile(null);
    if(videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setOriginalFrames([]); setProcessedFrames([]); setAsciiFrames([]);
    setImageFile(null);
    if(imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setImageAsciiOutput('');
    setImageAsciiDataUrl(null);
    setProgress(0); setAiTitle(null); setDuration(0); setTimeRange([0, 0]);
    setResolutionOptions([]); setSelectedResolutionKey('auto');
    setDownloadInfo(null);
    setStatus('idle'); setError(null); setViewMode('idle');
    setCopyMenuOpen(false); setSaveMenuOpen(false);
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    resetState();
    if (file.type.startsWith('video/')) {
        setVideoFile(file);
        setVideoPreviewUrl(URL.createObjectURL(file));
        setViewMode('flipbook');
    } else if (file.type.startsWith('image/')) {
        setImageFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
        setViewMode('ascii');
    } else {
        setError("有効な動画ファイルまたは画像ファイルを選択してください。");
    }
  };
  
  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const videoElement = e.currentTarget;
      const { duration, videoWidth, videoHeight } = videoElement;
      setDuration(duration); setTimeRange([0, duration]);
      if (videoWidth > 0 && videoHeight > 0) {
        const aspectRatio = videoWidth / videoHeight;
        const standardHeights = [720, 480, 360];
        const options = standardHeights
            .filter(h => h <= videoHeight)
            .map(h => {
                const w = Math.round(h * aspectRatio);
                const finalWidth = w % 2 === 0 ? w : w + 1;
                return { key: `${h}p`, label: `${finalWidth}x${h}`, width: finalWidth, height: h };
            });
        setResolutionOptions(options);
        setSelectedResolutionKey(options.length > 0 ? options[0].key : 'auto');
      }
  };
  
  const handleTimeRangeChange = (newRange: [number, number]) => {
      const video = previewVideoRef.current;
      const oldRange = timeRange;
      setTimeRange(newRange);
      if (video) {
          if (newRange[0] !== oldRange[0]) video.currentTime = newRange[0];
          else if (newRange[1] !== oldRange[1]) video.currentTime = newRange[1];
      }
  };

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => { if (video.currentTime >= timeRange[1]) { video.pause(); video.currentTime = timeRange[1]; } };
    const handlePlay = () => { if (video.currentTime < timeRange[0] || video.currentTime >= timeRange[1]) { video.currentTime = timeRange[0]; } };
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
    };
  }, [timeRange]);

  const applyEffectOnFrames = useCallback(async (sourceFrames: string[]) => {
    if (sourceFrames.length === 0 || !canvasRef.current) return;
    setStatus('processing'); setLoadingText('エフェクトを適用中...'); setError(null);
    setProgress(0); setProcessedFrames([]); setAsciiFrames([]);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setError("キャンバスのコンテキストを取得できませんでした。"); setStatus('error'); return; }
    
    const totalFrames = sourceFrames.length;
    
    if (effect === 'ascii' && !videoAsciiColorMode) {
        const newAsciiFrames: string[] = [];
        for(let i = 0; i < totalFrames; i++) {
            const frameDataUrl = sourceFrames[i];
            const img = new Image();
            await new Promise<void>(resolve => {
                img.onload = () => {
                    canvas.width = img.width; canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const asciiFrame = convertImageToAscii(
                        ctx, canvas.width, canvas.height, videoAsciiWidth, 
                        videoAsciiOutlineMode ? { threshold: videoAsciiLineThreshold } : undefined,
                        videoAsciiTransparentBg ? { threshold: videoAsciiBgThreshold } : undefined,
                        videoAsciiInvertColors
                    );
                    newAsciiFrames.push(asciiFrame);
                    setProgress(Math.round(((i + 1) / totalFrames) * 100));
                    resolve();
                };
                img.src = frameDataUrl;
            });
        }
        setAsciiFrames(newAsciiFrames);
        if (newAsciiFrames.length > 0) {
            try { setAiTitle(await generateTitleForImage(newAsciiFrames[0], effect)); }
            catch (err) { console.error("AI title generation failed:", err); setAiTitle("クリエイティブなアスキーアートアニメーション"); }
        }
    } else {
        const newProcessedFrames: string[] = [];
        for(let i = 0; i < totalFrames; i++) {
            const frameDataUrl = sourceFrames[i];
            const img = new Image();
            await new Promise<void>(resolve => {
                img.onload = () => {
                    canvas.width = img.width; canvas.height = img.height;
                    ctx.filter = (effect === 'monochrome') ? 'grayscale(100%)' : 'none';
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    if (effect === 'ascii' && videoAsciiColorMode) {
                        applyColoredAsciiEffect(
                            ctx, canvas.width, canvas.height, videoAsciiWidth, videoAsciiInvertColors,
                            videoAsciiOutlineMode ? { threshold: videoAsciiLineThreshold } : undefined,
                            videoAsciiTransparentBg ? { threshold: videoAsciiBgThreshold } : undefined
                        );
                    }
                    else if (effect === 'pencil') applyPencilSketchEffect(ctx, canvas.width, canvas.height);
                    else if (effect === 'cel') applyCelShadingEffect(ctx, canvas.width, canvas.height);
                    else if (effect === 'popart') applyPopArtEffect(ctx, canvas.width, canvas.height);
                    else if (effect === 'genga') applyGengaEffect(ctx, canvas.width, canvas.height, gengaConfig, improveGengaQuality, gengaLineThreshold);
                    else if (effect === 'ukiyo-e') applyUkiyoE_Effect(ctx, canvas.width, canvas.height);
                    else if (effect === '8bit') apply8BitEffect(ctx, canvas.width, canvas.height, eightBitPixelSize);
                    else if (effect === 'silhouette') applySilhouetteEffect(ctx, canvas.width, canvas.height, silhouetteThreshold);
                    
                    newProcessedFrames.push(canvas.toDataURL('image/jpeg', 0.8));
                    setProgress(Math.round(((i + 1) / totalFrames) * 100));
                    resolve();
                };
                img.src = frameDataUrl;
            });
        }
        setProcessedFrames(newProcessedFrames);
        if (newProcessedFrames.length > 0) {
            if (effect === 'silhouette') setAiTitle("シルエットアニメーション");
            else if (effect === 'ascii') setAiTitle("カラーアスキーアートアニメーション");
            else {
                try {
                    const base64Data = newProcessedFrames[0].split(',')[1];
                    setAiTitle(await generateTitleForImage(base64Data, effect));
                } catch (err) { console.error("AI title generation failed:", err); setAiTitle("クリエイティブなパラパラ漫画"); }
            }
        }
    }
    ctx.filter = 'none'; setStatus('success');
  }, [effect, gengaConfig, improveGengaQuality, gengaLineThreshold, eightBitPixelSize, videoAsciiWidth, silhouetteThreshold, videoAsciiOutlineMode, videoAsciiLineThreshold, videoAsciiTransparentBg, videoAsciiBgThreshold, videoAsciiInvertColors, videoAsciiColorMode]);

  const extractFrames = useCallback(async () => {
    if (!videoFile || !videoRef.current || !canvasRef.current) return;
    setDownloadInfo(null); setStatus('processing'); setLoadingText('フレームを抽出中...');
    setAiTitle(null); setProgress(0); setError(null);
    setOriginalFrames([]); setProcessedFrames([]); setAsciiFrames([]);
    const video = videoRef.current; const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { setError("キャンバスのコンテキストを取得できませんでした。"); setStatus('error'); return; }
    video.src = URL.createObjectURL(videoFile);
    video.onloadedmetadata = async () => {
        const { videoWidth: originalWidth, videoHeight: originalHeight } = video;
        let targetWidth = originalWidth, targetHeight = originalHeight;
        if (selectedResolutionKey !== 'auto') {
            const selectedOpt = resolutionOptions.find(opt => opt.key === selectedResolutionKey);
            if (selectedOpt) { targetWidth = selectedOpt.width; targetHeight = selectedOpt.height; }
        }
        canvas.width = Math.floor(targetWidth / 2) * 2; canvas.height = Math.floor(targetHeight / 2) * 2;
        const [startTime, endTime] = timeRange;
        const clipDuration = endTime - startTime;
        if (clipDuration <= 0) { setError("選択された時間範囲が無効です。"); setStatus('error'); return; }
        const interval = 1 / fps; const extractedRawFrames: string[] = [];
        for (let currentTime = startTime; currentTime <= endTime; currentTime += interval) {
            video.currentTime = currentTime;
            await new Promise(resolve => { video.onseeked = resolve; });
            ctx.filter = 'none'; ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            extractedRawFrames.push(canvas.toDataURL('image/jpeg', 0.8));
            setProgress(Math.round(((currentTime - startTime) / clipDuration) * 100));
        }
        setOriginalFrames(extractedRawFrames); await applyEffectOnFrames(extractedRawFrames);
    };
    video.onerror = () => { setError("動画データの読み込みに失敗しました。"); setStatus('error'); };
  }, [videoFile, fps, timeRange, selectedResolutionKey, resolutionOptions, applyEffectOnFrames]);

  const handleGenerateClick = () => {
    if (originalFrames.length > 0) applyEffectOnFrames(originalFrames);
    else extractFrames();
  };

  const loadFfmpeg = async () => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    setLoadingText('エンコーダーを初期化中...');
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const createDownload = async (format: 'gif' | 'mp4') => {
    if (processedFrames.length === 0) return;
    setStatus('loading'); setProgress(0); setDownloadMenuOpen(false);
    setDownloadInfo(null); setError(null);
    try {
        const ffmpeg = await loadFfmpeg();
        ffmpeg.off('progress', ffmpegProgressListener); ffmpeg.on('progress', ffmpegProgressListener);
        setLoadingText(`${format.toUpperCase()}作成の準備中...`);
        for (let i = 0; i < processedFrames.length; i++) {
            await ffmpeg.writeFile(`frame-${String(i).padStart(5, '0')}.jpg`, dataUrlToUint8Array(processedFrames[i]));
        }
        let outputFilename = `output.${format}`;
        if (format === 'gif') {
            await ffmpeg.exec(['-i', 'frame-%05d.jpg', '-vf', 'palettegen', 'palette.png']);
            await ffmpeg.exec(['-framerate', String(fps), '-i', 'frame-%05d.jpg', '-i', 'palette.png', '-lavfi', 'paletteuse', outputFilename]);
        } else {
            await ffmpeg.exec(['-framerate', String(fps), '-i', 'frame-%05d.jpg', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '22', '-an', outputFilename]);
        }
        const data = await ffmpeg.readFile(outputFilename);
        const blob = new Blob([data as Uint8Array], { type: format === 'gif' ? 'image/gif' : 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const safeFilename = (aiTitle || 'flipbook').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').substring(0, 100);
        setDownloadInfo({ url, filename: `${safeFilename}.${format}`, type: format.toUpperCase() as 'GIF' | 'MP4' });
        await ffmpeg.deleteFile(outputFilename);
        if (format === 'gif') await ffmpeg.deleteFile('palette.png');
        for (let i = 0; i < processedFrames.length; i++) await ffmpeg.deleteFile(`frame-${String(i).padStart(5, '0')}.jpg`);
        setStatus('success');
    } catch (err) {
        setError(`${format.toUpperCase()}ファイルの作成に失敗しました。コンソールを確認してください。`); setStatus('error');
    } finally {
        if (ffmpegRef.current) ffmpegRef.current.off('progress', ffmpegProgressListener);
        setProgress(0); setLoadingText('');
    }
  };
  
  const gengaColorPalettes = {
    outline: ['colorful', '#000000', '#4b5563', '#1e3a8a', '#166534', '#581c87', '#7f1d1d', '#9f1239'],
    shadow: ['colorful', '#3b82f6', '#ec4899', '#7e22ce', '#22c55e', '#a16207', '#64748b', '#0891b2'],
    highlight: ['colorful', '#f43f5e', '#facc15', '#f97316', '#84cc16', '#a855f7', '#67e8f9', '#d946ef'],
  };

  useEffect(() => {
    if (!imageFile || !canvasRef.current) return;
    setStatus('processing'); setLoadingText('アスキーアートを生成中...');
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
        canvas.width = img.width; canvas.height = img.height;
        if(ctx) {
            ctx.drawImage(img, 0, 0);
            const asciiText = convertImageToAscii(
                ctx, img.width, img.height, imageAsciiWidth, 
                imageAsciiOutlineMode ? { threshold: imageAsciiLineThreshold } : undefined,
                imageAsciiTransparentBg ? { threshold: imageAsciiBgThreshold } : undefined,
                imageAsciiInvertColors
            );
            setImageAsciiOutput(asciiText);
            if (imageAsciiColorMode) {
                applyColoredAsciiEffect(
                    ctx, canvas.width, canvas.height, imageAsciiWidth, imageAsciiInvertColors,
                    imageAsciiOutlineMode ? { threshold: imageAsciiLineThreshold } : undefined,
                    imageAsciiTransparentBg ? { threshold: imageAsciiBgThreshold } : undefined
                );
                setImageAsciiDataUrl(canvas.toDataURL('image/jpeg', 0.9));
            } else {
                setImageAsciiDataUrl(null);
            }
        }
        setStatus('success'); setLoadingText('');
    };
    img.src = URL.createObjectURL(imageFile);
  }, [imageFile, imageAsciiWidth, imageAsciiOutlineMode, imageAsciiLineThreshold, imageAsciiTransparentBg, imageAsciiBgThreshold, imageAsciiInvertColors, imageAsciiColorMode]);
  
  const handleImageZoomIn = () => setImageAsciiFontSize(s => s + 2);
  const handleImageZoomOut = () => setImageAsciiFontSize(s => Math.max(2, s - 2));

  const handleImageResetZoom = useCallback(() => {
    const container = imageAsciiContainerRef.current;
    if (!container || !imageAsciiOutput) return;
    const { width, height } = container.getBoundingClientRect();
    const lines = imageAsciiOutput.split('\n');
    const asciiWidthChars = lines[0]?.length || 1;
    const asciiHeightChars = lines.length || 1;
    const charAspectRatio = 0.6; 
    const widthBasedFontSize = (width / asciiWidthChars) / charAspectRatio;
    const heightBasedFontSize = height / asciiHeightChars;
    const newSize = Math.floor(Math.min(widthBasedFontSize, heightBasedFontSize));
    setImageAsciiFontSize(Math.max(2, newSize));
  }, [imageAsciiOutput]);

  useEffect(() => {
      if (imageAsciiOutput) {
          const timer = setTimeout(() => handleImageResetZoom(), 50);
          return () => clearTimeout(timer);
      }
  }, [imageAsciiOutput, handleImageResetZoom]);

  const handleCopyAscii = (type: 'text' | 'html' = 'text') => {
    if (!imageAsciiOutput) return;
    setCopyMenuOpen(false);
    if (type === 'text') {
        navigator.clipboard.writeText(imageAsciiOutput);
        setHasCopied('text');
    } else {
        if (imageAsciiColorMode && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const charAspectRatio = 0.6;
                const asciiHeight = Math.floor(imageAsciiWidth * (canvas.height / canvas.width) * charAspectRatio);
                const blockWidth = canvas.width / imageAsciiWidth;
                const blockHeight = canvas.height / asciiHeight;
                let html = `<pre style="background: black; color: white; font-family: monospace; line-height: 1; font-size: 10px;">`;
                const lines = imageAsciiOutput.split('\n');
                for (let y = 0; y < asciiHeight; y++) {
                    for (let x = 0; x < imageAsciiWidth; x++) {
                        const px = Math.floor(x * blockWidth + blockWidth / 2);
                        const py = Math.floor(y * blockHeight + blockHeight / 2);
                        const i = (py * canvas.width + px) * 4;
                        const r = data[i], g = data[i+1], b = data[i+2];
                        const char = lines[y]?.[x] || ' ';
                        html += `<span style="color: rgb(${r},${g},${b});">${char === ' ' ? '&nbsp;' : char}</span>`;
                    }
                    html += '\n';
                }
                html += `</pre>`;
                const blob = new Blob([html], { type: 'text/html' });
                const item = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([imageAsciiOutput], { type: 'text/plain' }) });
                navigator.clipboard.write([item]);
                setHasCopied('html');
            }
        } else {
            const html = `<pre style="background: #1e293b; color: #cbd5e1; font-family: monospace; line-height: 1;">${imageAsciiOutput}</pre>`;
            const blob = new Blob([html], { type: 'text/html' });
            const item = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([imageAsciiOutput], { type: 'text/plain' }) });
            navigator.clipboard.write([item]);
            setHasCopied('html');
        }
    }
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleSaveAsTxt = () => {
    if (!imageAsciiOutput) return;
    setSaveMenuOpen(false);
    const blob = new Blob([imageAsciiOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (aiTitle || 'ascii_art').replace(/\s+/g, '_') + '.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderFlipbookView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      <div className="flex flex-col space-y-6">
        <div className="relative group">
          <video ref={previewVideoRef} src={videoPreviewUrl!} controls className="w-full rounded-lg shadow-lg" onLoadedMetadata={handleVideoMetadata} />
          <button onClick={resetState} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 opacity-0 group-hover:opacity-100">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-slate-700/50 p-4 rounded-lg space-y-4">
          {duration > 0 && (
              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">動画のトリミング</label>
                <RangeSlider min={0} max={duration} value={timeRange} onChange={handleTimeRangeChange} disabled={isProcessing} />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>開始: <span className="font-mono text-cyan-400">{formatTime(timeRange[0])}</span></span>
                    <span>終了: <span className="font-mono text-cyan-400">{formatTime(timeRange[1])}</span></span>
                </div>
              </div>
          )}
          <div>
            <label htmlFor="fps" className="block text-sm font-medium text-slate-300 mb-2">フレームレート (FPS): <span className="font-bold text-cyan-400">{fps}</span></label>
            <input type="range" id="fps" min="1" max="30" value={fps} onChange={(e) => setFps(parseInt(e.currentTarget.value, 10))} className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500" disabled={isProcessing} />
          </div>
          <div className="pt-4 border-t border-slate-600/50">
            <label className="block text-sm font-medium text-slate-300 mb-3">エフェクト選択</label>
            <div className="grid grid-cols-3 gap-2">
                <EffectButton label="標準" icon={<PhotoIcon className="w-5 h-5" />} isActive={effect === 'none'} onClick={() => setEffect('none')} disabled={isProcessing} />
                <EffectButton label="鉛筆画" icon={<PencilIcon className="w-5 h-5" />} isActive={effect === 'pencil'} onClick={() => setEffect('pencil')} disabled={isProcessing} />
                <EffectButton label="アスキー" icon={<AsciiArtIcon className="w-5 h-5" />} isActive={effect === 'ascii'} onClick={() => setEffect('ascii')} disabled={isProcessing} />
                <EffectButton label="セル画" icon={<CelShadingIcon className="w-5 h-5" />} isActive={effect === 'cel'} onClick={() => setEffect('cel')} disabled={isProcessing} />
                <EffectButton label="ポップアート" icon={<PopArtIcon className="w-5 h-5" />} isActive={effect === 'popart'} onClick={() => setEffect('popart')} disabled={isProcessing} />
                <EffectButton label="8ビット" icon={<EightBitIcon className="w-5 h-5" />} isActive={effect === '8bit'} onClick={() => setEffect('8bit')} disabled={isProcessing} />
            </div>
            {effect === 'ascii' && (
              <div className="mt-4 pt-4 border-t border-slate-600/50 space-y-4">
                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-300">カラーモード (高精細)</label><button onClick={() => setVideoAsciiColorMode(!videoAsciiColorMode)} className={`${videoAsciiColorMode ? 'bg-cyan-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}><span className={`${videoAsciiColorMode ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} /></button></div>
                <input type="range" min="40" max="800" step="10" value={videoAsciiWidth} onChange={(e) => setVideoAsciiWidth(parseInt(e.currentTarget.value, 10))} className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-500" />
                
                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-300">輪郭強調モード</label><button onClick={() => setVideoAsciiOutlineMode(!videoAsciiOutlineMode)} className={`${videoAsciiOutlineMode ? 'bg-cyan-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}><span className={`${videoAsciiOutlineMode ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} /></button></div>
                {videoAsciiOutlineMode && <input type="range" min="10" max="150" value={videoAsciiLineThreshold} onChange={(e) => setVideoAsciiLineThreshold(parseInt(e.currentTarget.value, 10))} className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-500" />}

                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-300">背景透過</label><button onClick={() => setVideoAsciiTransparentBg(!videoAsciiTransparentBg)} className={`${videoAsciiTransparentBg ? 'bg-cyan-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}><span className={`${videoAsciiTransparentBg ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} /></button></div>
                {videoAsciiTransparentBg && <input type="range" min="1" max="100" value={videoAsciiBgThreshold} onChange={(e) => setVideoAsciiBgThreshold(parseInt(e.currentTarget.value, 10))} className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-500" />}
                
                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-300">文字反転</label><button onClick={() => setVideoAsciiInvertColors(!videoAsciiInvertColors)} className={`${videoAsciiInvertColors ? 'bg-cyan-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}><span className={`${videoAsciiInvertColors ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} /></button></div>
              </div>
            )}
          </div>
        </div>
        <button onClick={handleGenerateClick} disabled={isProcessing} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:from-cyan-600 hover:to-teal-700 transition-all duration-300">
          <SparklesIcon className="w-5 h-5" />
          <span>パラパラ漫画を生成</span>
        </button>
      </div>
      <div ref={flipbookViewerRef} className="flex flex-col items-center justify-center bg-slate-700/50 rounded-lg p-4 min-h-[30rem] relative">
        {(asciiFrames.length > 0 || processedFrames.length > 0) && !isProcessing && (
          <button onClick={() => toggleFullscreen(flipbookViewerRef)} title={isFullscreen ? '全画面表示を終了' : '全画面表示'} className="absolute top-3 right-3 z-20 p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-full">{isFullscreen ? <ExitFullscreenIcon className="w-5 h-5" /> : <EnterFullscreenIcon className="w-5 h-5" />}</button>
        )}
        {isProcessing ? (<Loader progress={progress} statusText={loadingText} />) : 
          (asciiFrames.length > 0 || processedFrames.length > 0) ? (
          <div className="w-full h-full space-y-4 flex flex-col">
            <div className="flex-grow min-h-0">{processedFrames.length > 0 ? (<FlipbookViewer frames={processedFrames} fps={fps} />) : (<AsciiPlayer frames={asciiFrames} fps={fps} />)}</div>
            <div className="flex items-center justify-center gap-4 pt-2">
              <div ref={downloadMenuRef} className="dropdown">
                  <button onClick={() => setDownloadMenuOpen(!isDownloadMenuOpen)} className="flex items-center gap-2 bg-slate-600 text-white font-bold py-2 px-4 rounded-lg"><DownloadIcon className="w-5 h-5" /><span>ダウンロード</span><ChevronDownIcon className={`w-4 h-4 transition-transform ${isDownloadMenuOpen ? 'rotate-180' : ''}`} /></button>
                  <div className="dropdown-content" data-open={isDownloadMenuOpen}><button onClick={() => createDownload('gif')}>GIF形式</button><button onClick={() => createDownload('mp4')}>MP4形式</button></div>
              </div>
            </div>
          </div>) : (<div className="text-center text-slate-500"><FilmIcon className="w-16 h-16 mx-auto mb-4" /><p>ここに結果が表示されます</p></div>)}
      </div>
    </div>
  );

  const renderAsciiView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
        <div className="flex flex-col space-y-6">
            <div className="relative group"><img src={imagePreviewUrl!} alt="Preview" className="w-full rounded-lg shadow-lg max-h-[60vh] object-contain" /><button onClick={resetState} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100"><XCircleIcon className="w-6 h-6" /></button></div>
            <div className="bg-slate-700/50 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">アスキーアート設定</h3>
                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-300">カラーモード (高精細)</label><button onClick={() => setImageAsciiColorMode(!imageAsciiColorMode)} className={`${imageAsciiColorMode ? 'bg-cyan-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}><span className={`${imageAsciiColorMode ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} /></button></div>
                <div><label className="block text-sm font-medium text-slate-300 mb-2">幅 (文字数): <span className="font-bold text-cyan-400">{imageAsciiWidth}</span></label><input type="range" min="40" max="800" step="10" value={imageAsciiWidth} onChange={(e) => setImageAsciiWidth(parseInt(e.currentTarget.value, 10))} className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-500" disabled={isProcessing} /></div>
                
                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-300">輪郭強調モード</label><button onClick={() => setImageAsciiOutlineMode(!imageAsciiOutlineMode)} className={`${imageAsciiOutlineMode ? 'bg-cyan-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}><span className={`${imageAsciiOutlineMode ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} /></button></div>
                {imageAsciiOutlineMode && <input type="range" min="10" max="150" value={imageAsciiLineThreshold} onChange={(e) => setImageAsciiLineThreshold(parseInt(e.currentTarget.value, 10))} className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-500" disabled={isProcessing} />}

                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-300">背景透過</label><button onClick={() => setImageAsciiTransparentBg(!imageAsciiTransparentBg)} className={`${imageAsciiTransparentBg ? 'bg-cyan-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}><span className={`${imageAsciiTransparentBg ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} /></button></div>
                {imageAsciiTransparentBg && <input type="range" min="1" max="100" value={imageAsciiBgThreshold} onChange={(e) => setImageAsciiBgThreshold(parseInt(e.currentTarget.value, 10))} className="w-full h-2 bg-slate-600 rounded-lg accent-cyan-500" disabled={isProcessing} />}

                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-300">文字反転</label><button onClick={() => setImageAsciiInvertColors(!imageAsciiInvertColors)} className={`${imageAsciiInvertColors ? 'bg-cyan-500' : 'bg-slate-600'} relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}><span className={`${imageAsciiInvertColors ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} /></button></div>
            </div>
             <button onClick={resetState} className="w-full flex items-center justify-center gap-3 bg-slate-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg">
                <RedoIcon className="w-5 h-5" /><span>最初に戻る</span>
            </button>
        </div>
        <div ref={asciiViewerRef} className="flex flex-col items-center justify-center bg-slate-900/70 rounded-lg p-1 min-h-[30rem] relative">
            {(imageAsciiOutput || imageAsciiDataUrl) && !isProcessing && (
                <button onClick={() => toggleFullscreen(asciiViewerRef)} title={isFullscreen ? '全画面表示を終了' : '全画面表示'} className="absolute top-3 right-3 z-20 p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-full">{isFullscreen ? <ExitFullscreenIcon className="w-5 h-5" /> : <EnterFullscreenIcon className="w-5 h-5" />}</button>
            )}
            {isProcessing ? (<Loader statusText={loadingText} />) : 
            (imageAsciiOutput || imageAsciiDataUrl) ? (
                <>
                    <div ref={imageAsciiContainerRef} className="w-full h-full overflow-auto flex items-center justify-center p-4">
                        {imageAsciiDataUrl ? (<img src={imageAsciiDataUrl} alt="Colored ASCII" className="max-w-full max-h-full object-contain" />) : (<pre className="font-mono text-slate-300 select-text text-center" style={{ fontSize: `${imageAsciiFontSize}px`, whiteSpace: 'pre', lineHeight: 1 }}>{imageAsciiOutput}</pre>)}
                    </div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap justify-center items-center gap-1 bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-lg p-1 border border-slate-700 max-w-[90vw]">
                        {!imageAsciiDataUrl && (
                          <>
                            <button onClick={handleImageZoomOut} title="縮小" className="p-2 text-slate-300 hover:text-white"><ZoomOutIcon className="w-5 h-5" /></button>
                            <button onClick={handleImageResetZoom} title="画面に合わせる" className="p-2 text-slate-300 hover:text-white"><FitScreenIcon className="w-5 h-5" /></button>
                            <button onClick={handleImageZoomIn} title="拡大" className="p-2 text-slate-300 hover:text-white"><ZoomInIcon className="w-5 h-5" /></button>
                            <div className="w-px h-6 bg-slate-600 mx-1"></div>
                          </>
                        )}
                        <div ref={copyMenuRef} className="dropdown">
                            <button onClick={() => setCopyMenuOpen(!isCopyMenuOpen)} className="flex items-center gap-2 py-2 px-3 rounded-md transition-colors text-slate-300 hover:text-white hover:bg-slate-700/50">
                                {hasCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                                <span className="text-sm font-semibold">{hasCopied === 'text' ? 'テキストをコピー！' : hasCopied === 'html' ? 'HTMLをコピー！' : 'コピー...'}</span>
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isCopyMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className="dropdown-content" data-open={isCopyMenuOpen}>
                                <button onClick={() => handleCopyAscii('text')}>テキスト形式 (.txt)</button>
                                <button onClick={() => handleCopyAscii('html')}>カラーHTML (Word/メール用)</button>
                            </div>
                        </div>
                        <div className="w-px h-6 bg-slate-600 mx-1"></div>
                        <div ref={saveMenuRef} className="dropdown">
                            <button onClick={() => setSaveMenuOpen(!isSaveMenuOpen)} className="flex items-center gap-2 py-2 px-3 rounded-md transition-colors text-slate-300 hover:text-white hover:bg-slate-700/50">
                                <DownloadIcon className="w-5 h-5" />
                                <span className="text-sm font-semibold">保存...</span>
                                <ChevronDownIcon className={`w-4 h-4 transition-transform ${isSaveMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className="dropdown-content" data-open={isSaveMenuOpen}>
                                <button onClick={handleSaveAsTxt}>.txt を保存</button>
                                {imageAsciiDataUrl && (<a href={imageAsciiDataUrl} download="colored-ascii.jpg" className="block w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors">画像 (.jpg) を保存</a>)}
                            </div>
                        </div>
                    </div>
                </>
            ) : (<div className="text-center text-slate-500"><AsciiArtIcon className="w-16 h-16 mx-auto mb-4" /><p>画像をアップロードしてください</p></div>)}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-8"><h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">Creative Converter AI</h1><p className="mt-2 text-slate-400 max-w-2xl mx-auto">動画や写真を魅力的なパラパラ漫画やアスキーアートに変換します。</p></header>
        <main className="bg-slate-800/50 rounded-2xl shadow-2xl p-6 backdrop-blur-sm border border-slate-700">
          {viewMode === 'idle' && <Dropzone onFileSelect={handleFileSelect} disabled={isProcessing} accept="video/*,image/*" />}
          {viewMode === 'flipbook' && renderFlipbookView()}
          {viewMode === 'ascii' && renderAsciiView()}
        </main>
        <video ref={videoRef} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}