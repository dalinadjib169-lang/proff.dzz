const fs = require('fs');
let code = fs.readFileSync('src/pages/Discussions.tsx', 'utf8');

const createTopicMethod = `  const handleCreateTopic = async (e: React.FormEvent) => {`;
const deleteTopicMethod = `  const handleDeleteTopic = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا النقاش نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'discussions', topicId));
      if (activeTopic?.id === topicId) {
        setActiveTopic(null);
      }
    } catch (error) {
      console.error("Error deleting topic:", error);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {`;

code = code.replace(createTopicMethod, deleteTopicMethod);

const topicRender = `                        <div className="p-2 text-slate-700 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all">
                          <ChevronRight className="w-6 h-6 rotate-180" />
                        </div>`;
const newTopicRender = `                        <div className="flex flex-col items-center gap-2">
                          <div className="p-2 text-slate-700 group-hover:text-indigo-500 transform group-hover:-translate-x-1 transition-all">
                            <ChevronRight className="w-5 h-5 rotate-180" />
                          </div>
                          {profile?.uid === topic.authorId && (
                            <button
                              onClick={(e) => handleDeleteTopic(e, topic.id)}
                              className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                              title="حذف النقاش"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>`;

code = code.replace(topicRender, newTopicRender);

fs.writeFileSync('src/pages/Discussions.tsx', code);
console.log('Success discussions update');
