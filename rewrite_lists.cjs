const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const startStr = '{/* Recent Conversations */}';
const endStr = '                  </div>\n                </>\n              ) : (';

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `
                    {/* Chat Navigation Tabs */}
                    <div className="flex gap-2 mb-4 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800" dir="rtl">
                      <button 
                        onClick={() => setChatView('main')}
                        className={\`flex-1 py-2 text-xs font-black rounded-xl transition-all \${chatView === 'main' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}\`}
                      >
                        المحادثات
                      </button>
                      <button 
                        onClick={() => setChatView('requests')}
                        className={\`flex-1 py-2 text-xs font-black rounded-xl transition-all relative flex items-center justify-center gap-1.5 \${chatView === 'requests' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}\`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        طلبات المراسلة
                        {conversations.filter(c => {
                          if (c.isGroup || c.uid === 'global') return false;
                          const inv = allInvitations.find(i => i.participants.includes(c.uid));
                          return (!inv || inv.status !== 'accepted') && c.unread;
                        }).length > 0 && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        )}
                      </button>
                    </div>

                    {chatView === 'requests' ? (
                      <div className="space-y-2">
                        {conversations.filter(c => {
                          if (c.isGroup || c.uid === 'global') return false;
                          const inv = allInvitations.find(i => i.participants.includes(c.uid));
                          return (!inv || inv.status !== 'accepted');
                        }).length === 0 ? (
                          <div className="text-center py-10">
                            <UserPlus className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                            <p className="text-slate-500 text-xs font-bold">لا توجد طلبات مراسلة</p>
                          </div>
                        ) : (
                          conversations.filter(c => {
                            if (c.isGroup || c.uid === 'global') return false;
                            const inv = allInvitations.find(i => i.participants.includes(c.uid));
                            return (!inv || inv.status !== 'accepted');
                          }).map(conv => {
                            const user = users.find(u => u.uid === conv.uid);
                            if (!user) return null;
                            return (
                              <button
                                key={\`req-\${conv.uid}\`}
                                onClick={() => setActiveChat(user)}
                                className={\`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all \${conv.unread ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/5' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}\`}
                              >
                                <div className="relative shrink-0">
                                  <img src={user.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="flex justify-between items-center bg-transparent">
                                    <h5 className={\`text-sm font-black truncate \${conv.unread ? 'text-red-400' : 'text-slate-200'}\`}>{user.displayName}</h5>
                                    {conv.unread && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                                  </div>
                                  <p className="text-[10px] font-bold text-slate-500 truncate">{conv.lastMessage}</p>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Global Chat & New Group Options */}
                        <div className="flex gap-2 mb-4">
                           <button
                            onClick={() => setActiveChat({
                              uid: 'global',
                              displayName: 'Global Teacher Lounge',
                              photoURL: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=100&h=100&fit=crop',
                              email: '',
                              createdAt: Timestamp.now()
                            } as any)}
                            className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all group"
                          >
                            <div className="relative">
                              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-white" />
                              </div>
                              <Circle className="absolute -bottom-1 -right-1 w-3 h-3 fill-green-500 text-slate-900" />
                            </div>
                            <div className="text-left">
                              <h5 className="text-sm font-black text-purple-400">Global Chat</h5>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">All Teachers</p>
                            </div>
                          </button>

                          <button
                            onClick={() => setIsCreatingGroup(true)}
                            className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                              <h5 className="text-sm font-black text-blue-400">إنشاء مجموعة</h5>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Group Chat</p>
                            </div>
                          </button>
                        </div>

                        {/* Recent Main Conversations */}
                        {conversations.filter(c => {
                          if (c.isGroup || c.uid === 'global') return true;
                          const inv = allInvitations.find(i => i.participants.includes(c.uid));
                          return inv && inv.status === 'accepted';
                        }).length > 0 && (
                          <div className="space-y-2 mb-6">
                            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">محادثات أخيرة</h5>
                            {conversations.filter(c => {
                              if (c.isGroup || c.uid === 'global') return true;
                              const inv = allInvitations.find(i => i.participants.includes(c.uid));
                              return inv && inv.status === 'accepted';
                            }).map(conv => {
                              const user = users.find(u => u.uid === conv.uid);
                              const isGroupDoc = conv.isGroup;
                              
                              return (
                                <button
                                  key={\`main-conv-\${conv.uid}\`}
                                  onClick={async () => {
                                    if (isGroupDoc) {
                                       try {
                                         const roomSnap = await getDoc(doc(db, 'chat_rooms', conv.uid));
                                         if (roomSnap.exists()) {
                                           const roomData = roomSnap.data();
                                           setActiveChat({
                                             uid: conv.uid,
                                             displayName: roomData.name,
                                             isGroup: true,
                                             participants: roomData.participants,
                                             photoURL: roomData.photoURL || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(roomData.name)}&background=random\`
                                           } as any);
                                         } else {
                                           setActiveChat({
                                             uid: conv.uid,
                                             displayName: 'مجموعة مفقودة',
                                             isGroup: true,
                                             participants: [profile.uid]
                                           } as any);
                                         }
                                       } catch (e) {
                                         console.error(e);
                                       }
                                    } else if (user) {
                                      setActiveChat(user);
                                    }
                                  }}
                                  className={\`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all \${conv.unread ? 'bg-purple-600/10 border-purple-500/50 shadow-lg shadow-purple-500/5' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}\`}
                                >
                                  <div className="relative shrink-0">
                                    {isGroupDoc ? (
                                       <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
                                         <Users className="w-6 h-6 text-white" />
                                       </div>
                                    ) : (
                                       <>
                                         <img src={user?.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                                         <div className={\`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 \${isOnline(user?.lastSeen) ? 'bg-green-500' : 'bg-slate-700'}\`}></div>
                                       </>
                                    )}
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-center bg-transparent">
                                      <h5 className={\`text-sm font-black truncate \${conv.unread ? 'text-purple-400' : 'text-slate-200'}\`}>{isGroupDoc ? (conv.displayName || 'مجموعة') : (user?.displayName || 'زميل')}</h5>
                                      {conv.unread && <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 truncate">{conv.lastMessage}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Search Results / Users List */}
                        {filteredUsers.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2">جميع الزملاء</h5>
                            {filteredUsers.map(u => (
                              <button
                                key={u.uid}
                                onClick={() => setActiveChat(u)}
                                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all group"
                              >
                                <div className="relative">
                                  <img 
                                     src={u.photoURL} 
                                     className="w-10 h-10 rounded-xl object-cover" 
                                     referrerPolicy="no-referrer"
                                  />
                                  <Circle className={\`absolute -bottom-1 -right-1 w-3 h-3 \${isOnline(u.lastSeen) ? 'fill-green-500 text-slate-900' : 'fill-slate-600 text-slate-900'}\`} />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <h5 className="text-sm font-black text-slate-200 truncate group-hover:text-white transition-colors">{u.displayName}</h5>
                                  <p className="text-[10px] font-bold text-slate-500 truncate">{u.subject || 'Teacher'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
`;

  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success replace');
} else {
  console.log('Not found');
}
