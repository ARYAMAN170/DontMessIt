export default function MenuSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
       {[1, 2, 3, 4].map((i) => (
         <div key={i} className="glass-card rounded-3xl overflow-hidden border border-white/5 bg-slate-800/50">
            <div className="h-16 bg-slate-700/30 border-b border-white/5"></div>
            <div className="p-4 space-y-4">
              <div className="h-20 bg-slate-700/20 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-8 bg-slate-700/20 rounded-lg w-full"></div>
                <div className="h-8 bg-slate-700/20 rounded-lg w-3/4"></div>
              </div>
            </div>
         </div>
       ))}
    </div>
  );
}
