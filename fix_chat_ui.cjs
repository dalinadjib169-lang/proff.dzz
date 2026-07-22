const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const targetUI = `                        <p className="text-slate-400 text-xs font-bold mb-6">
                          {friendRequest?.senderId === profile.uid 
                            ? 'لقد ارسلت طلب صداقة، انتظر قبول الزميل لكي تتمكنا من التحدث.'
                            : 'يريد هذا الزميل التواصل معك، هل توافق؟'}
                        </p>
                        {friendRequest?.senderId !== profile.uid ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={handleDeclineRequest}
                              className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                            >
                              رفض (Decline)
                            </button>
                            <button 
                              onClick={handleAcceptRequest}
                              disabled={isAccepting}
                              className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'قبول (Accept)'}
                            </button>
                          </div>
                        ) : (
                          <div className="py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            انتظار الموافقة... Pending Approval
                          </div>
                        )}`;

const replacementUI = `                        <p className="text-slate-400 text-xs font-bold mb-6">
                          {!friendRequest 
                            ? 'أرسل رسالة للزميل لطلب التواصل معه.'
                            : friendRequest.senderId === profile.uid 
                              ? 'لقد ارسلت طلب صداقة، انتظر قبول الزميل لكي تتمكنا من التحدث.'
                              : 'يريد هذا الزميل التواصل معك، هل توافق؟'}
                        </p>
                        {!friendRequest ? null : friendRequest.senderId !== profile.uid ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={handleDeclineRequest}
                              className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                            >
                              رفض (Decline)
                            </button>
                            <button 
                              onClick={handleAcceptRequest}
                              disabled={isAccepting}
                              className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'قبول (Accept)'}
                            </button>
                          </div>
                        ) : (
                          <div className="py-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-[10px] font-black uppercase tracking-widest">
                            انتظار الموافقة... Pending Approval
                          </div>
                        )}`;

code = code.replace(targetUI, replacementUI);
fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success UI');
