const fs = require('fs');
let code = fs.readFileSync('src/pages/GroupDetails.tsx', 'utf8');

const leaveGroupMethod = `  const handleLeaveGroup = async () => {
    if (!group || !user || !window.confirm('هل أنت متأكد من مغادرة المجموعة؟')) return;
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayRemove(user.uid),
        admins: arrayRemove(user.uid),
        memberCount: group.memberCount - 1
      });
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };`;

const newMethods = `  const handleLeaveGroup = async () => {
    if (!group || !user || !window.confirm('هل أنت متأكد من مغادرة المجموعة؟')) return;
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayRemove(user.uid),
        admins: arrayRemove(user.uid),
        memberCount: group.memberCount - 1
      });
      navigate('/groups');
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group || !user || !window.confirm('هل أنت متأكد من حذف هذه المجموعة نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'groups', group.id));
      navigate('/groups');
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const handleRemoveMember = async (targetId: string) => {
    if (!group || !user || !window.confirm('هل أنت متأكد من إزالة هذا العضو؟')) return;
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayRemove(targetId),
        admins: arrayRemove(targetId),
        memberCount: group.memberCount - 1
      });
      setMembers(members.filter(m => m.uid !== targetId));
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };`;

code = code.replace(leaveGroupMethod, newMethods);

const addDeleteGroupBtn = `               {/* Join Requests */}`;
const addDeleteGroupBtnReplace = `               {/* Danger Zone */}
               <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-red-600 uppercase tracking-wider">منطقة الخطر</h4>
                    <p className="text-[10px] text-slate-500 font-bold">إجراءات لا يمكن التراجع عنها</p>
                  </div>
                  <button onClick={handleDeleteGroup} className="bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-colors">
                    حذف المجموعة نهائياً
                  </button>
                </div>
               </div>

               {/* Join Requests */}`;

code = code.replace(addDeleteGroupBtn, addDeleteGroupBtnReplace);

const addRemoveMemberBtn = `                    {group.admins.includes(member.uid) && (
                      <div className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">أدمن</div>
                    )}`;
const addRemoveMemberBtnReplace = `                    <div className="flex items-center gap-2">
                      {group.admins.includes(member.uid) && (
                        <div className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">أدمن</div>
                      )}
                      {isAdmin && member.uid !== user?.uid && (
                        <button onClick={() => handleRemoveMember(member.uid)} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors" title="إزالة العضو">
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                    </div>`;

code = code.replace(addRemoveMemberBtn, addRemoveMemberBtnReplace);

fs.writeFileSync('src/pages/GroupDetails.tsx', code);
console.log('Success group details update');
