import React from 'react';

export default function HistorySidebar({ history, onSelectQuest, activeQuestId }) {
  if (history.length === 0) {
    return (
      <aside className="sidebar">
        <h2>探求の記録</h2>
        <p className="no-history">まだクエストがありません。</p>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <h2>探求の記録</h2>
      <ul>
        {history.map((quest) => (
          <li key={quest.id}>
            <button
              className={quest.id === activeQuestId ? 'active' : ''}
              onClick={() => onSelectQuest(quest.id)}
            >
              {quest.question}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}