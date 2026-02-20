import { useState, useRef } from 'react';
import { supabase } from './supabaseClient';

interface PlateScannerProps {
  currentMenu: string[];
  onScanSuccess: (loggedItems: any) => void;
}

export default function PlateScanner({ currentMenu, onScanSuccess }: PlateScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusText('UPLOADING...');

    try {
      // 1. Create a unique file name and upload to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('plate_images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // 2. Get the Public URL so Groq can see it
      const { data: { publicUrl } } = supabase.storage
        .from('plate_images')
        .getPublicUrl(fileName);

      setStatusText('AI ANALYZING...');

      // 3. Ping your new Edge Function!
      // supabase.functions.invoke automatically uses your project URL and Anon Key
      const { data, error: functionError } = await supabase.functions.invoke('process-plate', {
        body: { 
          imageUrl: publicUrl, 
          availableMenu: currentMenu 
        }
      });

      if (functionError) throw functionError;

      // 4. Pass the AI JSON back to the dashboard!
      setStatusText('LOGGED!');
      onScanSuccess(data.logged_items);
      
      // Reset button after 2 seconds
      setTimeout(() => setIsProcessing(false), 2000);

    } catch (error: any) {
      console.error("Camera Error:", error);
      setStatusText('FAILED');
      setTimeout(() => setIsProcessing(false), 3000);
    }
  };

  return (
    <>
      <button 
        onClick={() => fileInputRef.current?.click()} 
        disabled={isProcessing}
        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all duration-300 border shadow-2xl backdrop-blur-md active:scale-95 ${
          isProcessing 
            ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-blue-900/20'
            : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
        }`}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            {statusText}
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Snap & Log Plate
          </>
        )}
      </button>

      {/* Hidden Native Camera Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        hidden 
        accept="image/*" 
        capture="environment" 
        onChange={handleCapture} 
      />
    </>
  );
}