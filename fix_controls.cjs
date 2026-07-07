const fs = require('fs');
let code = fs.readFileSync('src/components/SoulMedicine.tsx', 'utf8');

const targetRegex = /\{\/\* Controls \*\/\}.*?\{\/\* Branding \*\/\}/s;

const replacement = `              {/* Controls */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-col gap-3 z-50 items-end">
                <button 
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white transition-all border border-red-500/50 shadow-2xl cursor-pointer hover:scale-[1.03] active:scale-95"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsThemeSelectorOpen(!isThemeSelectorOpen)}
                    className={\`p-3 rounded-2xl transition-all border backdrop-blur-md shadow-lg flex items-center justify-center \${isThemeSelectorOpen ? 'bg-white text-slate-900 border-white' : 'bg-white/10 text-white border-white/20'}\`}
                    title="تغيير المظهر"
                  >
                    <Palette className="w-5 h-5" />
                  </button>
                  <AnimatePresence>
                    {isThemeSelectorOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: 20 }}
                        className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl min-w-[200px]"
                      >
                        <div className="flex flex-wrap gap-2 justify-end" dir="rtl">
                          {THEMES.map(theme => (
                            <button
                              key={theme.id}
                              onClick={() => {
                                setSelectedTheme(theme);
                                setIsThemeSelectorOpen(false);
                                localStorage.setItem('soul_theme', theme.id);
                              }}
                              className={\`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all \${
                                selectedTheme.id === theme.id
                                  ? 'bg-white text-slate-900 shadow-md scale-105 border border-white'
                                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                              }\`}
                            >
                              {theme.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Branding */}`;

code = code.replace(targetRegex, replacement);

fs.writeFileSync('src/components/SoulMedicine.tsx', code);
