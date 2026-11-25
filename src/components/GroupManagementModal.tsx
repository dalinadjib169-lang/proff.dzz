import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Users,
  Shield,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Settings,
  Lock,
  Unlock,
  Image as ImageIcon,
  Mic,
  Forward,
  Trash2,
  LogOut,
  Search,
  Check,
  Camera,
  Loader2,
  Crown,
  Pin,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { db } from '../firebase';
import {
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ChatRoom, ChatRoomSettings, UserProfile } from '../types';
import { toast } from 'react-hot-toast';
import { sendRemotePushNotification } from '../lib/notifications';

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onRoomUpdated: (updated: Partial<ChatRoom>) => void;
  onRoomExited: () => void;
}

export default function GroupManagementModal({
  isOpen,
  onClose,
  room,
  currentUser,
  allUsers,
  onRoomUpdated,
  onRoomExited,
}: GroupManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'tools' | 'info'>('members');
  const [name, setName] = useState(room.name || room.displayName || '');
  const [description, setDescription] = useState(room.description || '');
  const [photoURL, setPhotoURL] = useState(room.photoURL || '');
  const [settings, setSettings] = useState<ChatRoomSettings>({
    onlyAdminsCanSend: room.settings?.onlyAdminsCanSend ?? false,
    allowMedia: room.settings?.allowMedia ?? true,
    allowVoice: room.settings?.allowVoice ?? true,
    allowForward: room.settings?.allowForward ?? true,
    allowMembersAdd: room.settings?.allowMembersAdd ?? false,
  });

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'leave' | 'disband' | null>(null);

  useEffect(() => {
    setName(room.name || room.displayName || '');
    setDescription(room.description || '');
    setPhotoURL(room.photoURL || '');
    setSettings({
      onlyAdminsCanSend: room.settings?.onlyAdminsCanSend ?? false,
      allowMedia: room.settings?.allowMedia ?? true,
      allowVoice: room.settings?.allowVoice ?? true,
      allowForward: room.settings?.allowForward ?? true,
      allowMembersAdd: room.settings?.allowMembersAdd ?? false,
    });
    setConfirmAction(null);
  }, [room]);

  if (!isOpen) return null;

  const roomId = room.uid || room.id || '';
  const adminsList = Array.isArray(room.admins) && room.admins.length > 0 ? room.admins : [room.createdBy];
  const isCreator = room.createdBy === currentUser.uid;
  const isGroupAdmin = isCreator || adminsList.includes(currentUser.uid);
  const canAddMembers = isGroupAdmin || !!room.settings?.allowMembersAdd;

  const participantsList = room.participants || [];
  const memberProfiles = participantsList.map((uid) => {
    if (uid === currentUser.uid) return currentUser;
    return (
      allUsers.find((u) => u.uid === uid) ||
      ({
        uid,
        displayName: 'زميل في المجموعة',
        photoURL: `https://ui-avatars.com/api/?name=User&background=random`,
      } as UserProfile)
    );
  });

  const filteredMembers = memberProfiles.filter((m) =>
    (m.displayName || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  const nonMembers = allUsers.filter(
    (u) =>
      !participantsList.includes(u.uid) &&
      (u.displayName || '').toLowerCase().includes(addSearch.toLowerCase())
  );

  const postSystemMessage = async (text: string, targetParticipants: string[]) => {
    try {
      await addDoc(collection(db, 'messages'), {
        roomId,
        roomName: name || room.displayName || 'مجموعة',
        participants: targetParticipants,
        senderId: currentUser.uid,
        senderName: 'إدارة المجموعة',
        text,
        createdAt: serverTimestamp(),
        clientCreatedAt: Date.now(),
        seen: false,
      });
    } catch (e) {
      console.warn('Could not post system message:', e);
    }
  };

  const handleAddSelectedMembers = async () => {
    if (!roomId || selectedNewMembers.length === 0) return;
    setSaving(true);
    try {
      const updatedParticipants = Array.from(new Set([...participantsList, ...selectedNewMembers]));
      await updateDoc(doc(db, 'chat_rooms', roomId), {
        participants: arrayUnion(...selectedNewMembers),
      });

      const addedNames = selectedNewMembers
        .map((id) => allUsers.find((u) => u.uid === id)?.displayName || 'زميل')
        .join('، ');

      await postSystemMessage(
        `قام ${currentUser.displayName} بإضافة: ${addedNames}`,
        updatedParticipants
      );

      await Promise.all(
        selectedNewMembers.map((uid) =>
          addDoc(collection(db, 'notifications'), {
            recipientId: uid,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            type: 'group_addition',
            groupId: roomId,
            groupName: name || room.displayName || 'مجموعة',
            message: `تمت إضافتك إلى مجموعة "${name || room.displayName}"`,
            read: false,
            createdAt: serverTimestamp(),
          })
        )
      );

      sendRemotePushNotification({
        recipientIds: selectedNewMembers,
        title: `إضافة لمجموعة: ${name || room.displayName}`,
        body: `قام ${currentUser.displayName} بإضافتك إلى المجموعة`,
        icon: photoURL || currentUser.photoURL || '/prof_dali_logo.png',
        tag: `group-add-${roomId}`,
        url: '/',
        type: 'notification',
      });

      onRoomUpdated({ participants: updatedParticipants });
      setSelectedNewMembers([]);
      setIsAddingMode(false);
      setAddSearch('');
      toast.success('تمت إضافة الأعضاء بنجاح');
    } catch (e) {
      console.error('Error adding members:', e);
      toast.error('تعذر إضافة الأعضاء');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member: UserProfile) => {
    if (!roomId || !isGroupAdmin || member.uid === room.createdBy) return;
    setSaving(true);
    try {
      const updatedParticipants = participantsList.filter((id) => id !== member.uid);
      const updatedAdmins = adminsList.filter((id) => id !== member.uid);

      await updateDoc(doc(db, 'chat_rooms', roomId), {
        participants: arrayRemove(member.uid),
        admins: arrayRemove(member.uid),
      });

      await postSystemMessage(
        `قام المشرف ${currentUser.displayName} بإخراج ${member.displayName} من المجموعة`,
        updatedParticipants
      );

      await addDoc(collection(db, 'notifications'), {
        recipientId: member.uid,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        type: 'group_removed',
        groupId: roomId,
        groupName: name || room.displayName || 'مجموعة',
        message: `تم إخراجك من مجموعة "${name || room.displayName}"`,
        read: false,
        createdAt: serverTimestamp(),
      });

      sendRemotePushNotification({
        recipientId: member.uid,
        title: `تحديث مجموعة: ${name || room.displayName}`,
        body: `تمت إزالتك من المجموعة بواسطة المشرف`,
        icon: '/prof_dali_logo.png',
        tag: `group-rem-${roomId}`,
        url: '/notifications',
        type: 'notification',
      });

      onRoomUpdated({ participants: updatedParticipants, admins: updatedAdmins });
      toast.success(`تم إخراج ${member.displayName} من المجموعة`);
    } catch (e) {
      console.error('Error removing member:', e);
      toast.error('تعذر إخراج العضو');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async (member: UserProfile) => {
    if (!roomId || !isGroupAdmin || member.uid === room.createdBy) return;
    const isAlreadyAdmin = adminsList.includes(member.uid);
    setSaving(true);
    try {
      const updatedAdmins = isAlreadyAdmin
        ? adminsList.filter((id) => id !== member.uid)
        : Array.from(new Set([...adminsList, member.uid]));

      await updateDoc(doc(db, 'chat_rooms', roomId), {
        admins: updatedAdmins,
      });

      await postSystemMessage(
        isAlreadyAdmin
          ? `تم سحب صلاحية الإشراف من ${member.displayName}`
          : `تمت ترقية ${member.displayName} إلى مشرف في المجموعة`,
        participantsList
      );

      onRoomUpdated({ admins: updatedAdmins });
      toast.success(isAlreadyAdmin ? 'تم سحب الإشراف' : `تم تعيين ${member.displayName} مشرفاً`);
    } catch (e) {
      console.error('Error toggling admin:', e);
      toast.error('فشل تحديث الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettingsAndTools = async () => {
    if (!roomId || !isGroupAdmin) return;
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم للمجموعة');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'chat_rooms', roomId), {
        name: name.trim(),
        description: description.trim(),
        photoURL: photoURL || room.photoURL || '',
        settings,
      });

      onRoomUpdated({
        name: name.trim(),
        displayName: name.trim(),
        description: description.trim(),
        photoURL: photoURL || room.photoURL || '',
        settings,
      });

      toast.success('تم حفظ إعدادات وأدوات المجموعة بنجاح');
    } catch (e) {
      console.error('Error saving group tools:', e);
      toast.error('تعذر حفظ إعدادات المجموعة');
    } finally {
      setSaving(false);
    }
  };

  const handleUnpinMessage = async () => {
    if (!roomId || !isGroupAdmin) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'chat_rooms', roomId), { pinnedMessage: null });
      onRoomUpdated({ pinnedMessage: null });
      toast.success('تم إلغاء تثبيت الرسالة');
    } catch (e) {
      toast.error('تعذر إلغاء التثبيت');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!roomId) return;
    setSaving(true);
    try {
      const updatedParticipants = participantsList.filter((id) => id !== currentUser.uid);
      const leavePayload: any = {
        participants: arrayRemove(currentUser.uid),
      };
      if (isGroupAdmin) {
        leavePayload.admins = arrayRemove(currentUser.uid);
      }
      await updateDoc(doc(db, 'chat_rooms', roomId), leavePayload);
      await postSystemMessage(`غادر ${currentUser.displayName} المجموعة`, updatedParticipants);
      toast.success('لقد غادرت المجموعة');
      onClose();
      onRoomExited();
    } catch (e) {
      console.error('Leave group error:', e);
      toast.error('فشل مغادرة المجموعة');
    } finally {
      setSaving(false);
    }
  };

  const handleDisbandGroup = async () => {
    if (!roomId || !isGroupAdmin) return;
    setSaving(true);
    try {
      const others = participantsList.filter((id) => id !== currentUser.uid);
      await Promise.all(
        others.map((uid) =>
          addDoc(collection(db, 'notifications'), {
            recipientId: uid,
            senderId: currentUser.uid,
            senderName: currentUser.displayName,
            type: 'group_disbanded',
            groupId: roomId,
            groupName: name || room.displayName || 'مجموعة',
            message: `قام المشرف بتفكيك مجموعة "${name || room.displayName}"`,
            read: false,
            createdAt: serverTimestamp(),
          })
        )
      );

      await deleteDoc(doc(db, 'chat_rooms', roomId));
      toast.success('تم تفكيك المجموعة وحذفها بنجاح');
      onClose();
      onRoomExited();
    } catch (e) {
      console.error('Disband group error:', e);
      toast.error('تعذر حذف المجموعة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.94, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 20 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={
                  photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Group')}&background=random`
                }
                className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0"
                alt=""
              />
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white truncate">{name || room.displayName}</h3>
                <p className="text-[11px] font-bold text-slate-400">
                  {participantsList.length} عضو • {isGroupAdmin ? 'أنت مشرف المجموعة' : 'عضو'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1.5 p-2 bg-slate-950/60 border-b border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('members');
                setIsAddingMode(false);
              }}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'members' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الأعضاء ({participantsList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tools')}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'tools' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>أدوات المجموعة</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'info' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>إجراءات</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {activeTab === 'members' && (
              <>
                {!isAddingMode ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="ابحث داخل أعضاء المجموعة..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-9 pl-3 py-2.5 text-xs text-white font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                      {canAddMembers && (
                        <button
                          type="button"
                          onClick={() => setIsAddingMode(true)}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-blue-600/20 shrink-0"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>إضافة عضو</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {filteredMembers.map((member) => {
                        const memberIsCreator = member.uid === room.createdBy;
                        const memberIsAdmin = memberIsCreator || adminsList.includes(member.uid);
                        const isSelf = member.uid === currentUser.uid;

                        return (
                          <div
                            key={member.uid}
                            className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={
                                  member.photoURL ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'U')}&background=random`
                                }
                                className="w-10 h-10 rounded-xl object-cover shrink-0"
                                alt=""
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black text-white truncate">
                                    {member.displayName} {isSelf ? '(أنت)' : ''}
                                  </span>
                                  {memberIsCreator ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 text-[9px] font-black flex items-center gap-1">
                                      <Crown className="w-2.5 h-2.5" />
                                      المؤسس
                                    </span>
                                  ) : memberIsAdmin ? (
                                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400 text-[9px] font-black flex items-center gap-1">
                                      <ShieldCheck className="w-2.5 h-2.5" />
                                      مشرف
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold truncate">
                                  {member.subject || 'عضو'}
                                </p>
                              </div>
                            </div>

                            {isGroupAdmin && !isSelf && !memberIsCreator && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleToggleAdmin(member)}
                                  title={memberIsAdmin ? 'سحب الإشراف' : 'ترقية لمشرف'}
                                  className={`p-2 rounded-xl border text-xs font-black transition-all ${
                                    memberIsAdmin
                                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
                                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-purple-400'
                                  }`}
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleRemoveMember(member)}
                                  title="إخراج من المجموعة"
                                  className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white">اختر الزملاء لإضافتهم للمجموعة</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMode(false);
                          setSelectedNewMembers([]);
                        }}
                        className="text-xs font-black text-slate-400 hover:text-white"
                      >
                        رجوع للقائمة
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={addSearch}
                        onChange={(e) => setAddSearch(e.target.value)}
                        placeholder="ابحث عن زميل بالاسم..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pr-9 pl-3 py-2.5 text-xs text-white font-bold outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {nonMembers.length === 0 ? (
                        <p className="text-center text-xs text-slate-500 py-8 font-bold">
                          لا يوجد زملاء متاحون للإضافة حالياً
                        </p>
                      ) : (
                        nonMembers.map((u) => {
                          const selected = selectedNewMembers.includes(u.uid);
                          return (
                            <button
                              key={u.uid}
                              type="button"
                              onClick={() =>
                                setSelectedNewMembers((prev) =>
                                  prev.includes(u.uid) ? prev.filter((id) => id !== u.uid) : [...prev, u.uid]
                                )
                              }
                              className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                                selected
                                  ? 'bg-blue-600/20 border-blue-500 text-white'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <img src={u.photoURL} className="w-9 h-9 rounded-xl object-cover" alt="" />
                                <div className="text-right">
                                  <p className="text-xs font-black">{u.displayName}</p>
                                  <p className="text-[10px] text-slate-400">{u.subject || 'أستاذ'}</p>
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  selected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600'
                                }`}
                              >
                                {selected && <Check className="w-3 h-3" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={saving || selectedNewMembers.length === 0}
                      onClick={handleAddSelectedMembers}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      <span>إضافة ({selectedNewMembers.length}) عضو للمجموعة</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'tools' && (
              <div className="space-y-4">
                {!isGroupAdmin && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
                    صلاحيات التعديل على أدوات المجموعة متاحة لمشرفي المجموعة فقط.
                  </div>
                )}

                <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="relative shrink-0">
                    <img
                      src={
                        photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Group')}&background=random`
                      }
                      className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                      alt=""
                    />
                    {isGroupAdmin && (
                      <label className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const reader = new FileReader();
                              reader.onload = (re) => setPhotoURL((re.target?.result as string) || '');
                              reader.readAsDataURL(f);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      disabled={!isGroupAdmin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="اسم المجموعة..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-black outline-none focus:border-purple-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      disabled={!isGroupAdmin}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="وصف المجموعة أو قوانينها..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 font-bold outline-none focus:border-purple-500 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Group Tools Toggles */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase px-1">أدوات التحكم في المحادثة</h4>

                  {[
                    {
                      key: 'onlyAdminsCanSend',
                      label: 'قفل الإرسال للمشرفين فقط',
                      desc: 'منع الأعضاء من إرسال رسائل جديدة والاكتفاء برسائل المشرفين',
                      icon: settings.onlyAdminsCanSend ? Lock : Unlock,
                      color: 'text-amber-400',
                    },
                    {
                      key: 'allowMedia',
                      label: 'السماح بإرسال الصور والملفات',
                      desc: 'التحكم في مشاركة الصور والمستندات من طرف الأعضاء',
                      icon: ImageIcon,
                      color: 'text-sky-400',
                    },
                    {
                      key: 'allowVoice',
                      label: 'السماح بالرسائل الصوتية',
                      desc: 'تفعيل أو إيقاف تسجيل المقاطع الصوتية للأعضاء',
                      icon: Mic,
                      color: 'text-emerald-400',
                    },
                    {
                      key: 'allowForward',
                      label: 'السماح بإعادة التوجيه (Transfer)',
                      desc: 'السماح بتحويل رسائل المجموعة إلى محادثات أخرى',
                      icon: Forward,
                      color: 'text-purple-400',
                    },
                    {
                      key: 'allowMembersAdd',
                      label: 'السماح للأعضاء بإضافة زملاء',
                      desc: 'تمكين الأعضاء العاديين من دعوة زملائهم للمجموعة',
                      icon: UserPlus,
                      color: 'text-blue-400',
                    },
                  ].map((tool) => {
                    const IconComp = tool.icon;
                    const enabled = !!(settings as any)[tool.key];
                    return (
                      <div
                        key={tool.key}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                            <IconComp className={`w-4 h-4 ${tool.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white">{tool.label}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{tool.desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!isGroupAdmin}
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, [tool.key]: !(prev as any)[tool.key] }))
                          }
                          className={`w-12 h-7 rounded-full p-1 flex items-center transition-all shrink-0 disabled:opacity-50 ${
                            enabled ? 'bg-purple-600' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              enabled ? '-translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {room.pinnedMessage && isGroupAdmin && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Pin className="w-4 h-4 text-purple-400 shrink-0" />
                      <p className="text-xs font-bold text-slate-200 truncate">
                        رسالة مثبتة: {room.pinnedMessage.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnpinMessage}
                      className="text-[11px] font-black text-red-400 hover:underline shrink-0"
                    >
                      إلغاء التثبيت
                    </button>
                  </div>
                )}

                {isGroupAdmin && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveSettingsAndTools}
                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>حفظ التغييرات وأدوات المجموعة</span>
                  </button>
                )}
              </div>
            )}

            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <p className="text-xs font-black text-white">تفاصيل المجموعة</p>
                  <p className="text-xs text-slate-400 font-bold leading-relaxed">
                    {room.description || 'مجموعة محادثة تعاونية بين الأساتذة.'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                      الأعضاء: {participantsList.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                      المشرفون: {adminsList.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
                      {settings.onlyAdminsCanSend ? 'مقفلة للإرسال (مشرفون فقط)' : 'مفتوحة للجميع'}
                    </span>
                  </div>
                </div>

                {/* Leave Group */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-amber-400">مغادرة المجموعة</h4>
                      <p className="text-[11px] text-slate-400 font-bold">
                        لن تصلك رسائل هذه المجموعة بعد المغادرة.
                      </p>
                    </div>
                    {confirmAction !== 'leave' ? (
                      <button
                        type="button"
                        onClick={() => setConfirmAction('leave')}
                        className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500 hover:text-white text-amber-400 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shrink-0"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>مغادرة</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={handleLeaveGroup}
                          className="px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-black"
                        >
                          تأكيد الخروج
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction(null)}
                          className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-black"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Disband Group (Admins / Creator only) */}
                {isGroupAdmin && (
                  <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-black text-red-400">تفكيك وحذف المجموعة نهائياً</h4>
                          <p className="text-[11px] text-slate-400 font-bold">
                            سيتم إغلاق المجموعة وإزالتها لدى جميع الأعضاء.
                          </p>
                        </div>
                      </div>
                      {confirmAction !== 'disband' ? (
                        <button
                          type="button"
                          onClick={() => setConfirmAction('disband')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>تفكيك</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleDisbandGroup}
                            className="px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-black"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmAction(null)}
                            className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-black"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
