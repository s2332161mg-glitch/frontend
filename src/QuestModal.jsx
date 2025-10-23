import React, { useState, useMemo, useEffect } from 'react';

// [BLANK] をハイライトする関数
const highlightBlank = (text) => {
  if (!text) return '';
  return text.split('[BLANK]').map((part, index, array) => (
    <React.Fragment key={index}>
      {part}
      {index < array.length - 1 && <span className="blank">[BLANK]</span>}
    </React.Fragment>
  ));
};

export default function QuestModal({ quest, onClose, onQuizSubmit }) {
  const [userAnswers, setUserAnswers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [view, setView] = useState('summary');

  useEffect(() => {
    if (quest) {
      setUserAnswers(Array(quest.quizzes?.length || 0).fill(''));
      setFeedback(Array(quest.quizzes?.length || 0).fill(null));
      setCurrentQuestionIndex(0);
      setView('summary');
    }
  }, [quest]);

  const allCorrect = useMemo(() => {
    return quest?.quizzes && feedback.length === quest.quizzes.length && feedback.every(f => f === true);
  }, [feedback, quest?.quizzes]);

  if (!quest || !quest.summary) {
    return null;
  }

  const currentQuiz = quest.quizzes ? quest.quizzes[currentQuestionIndex] : null;

  const handleAnswerChange = (e) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = e.target.value;
    setUserAnswers(newAnswers);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isCorrect = onQuizSubmit(currentQuestionIndex, userAnswers[currentQuestionIndex] || '');
    const newFeedback = [...feedback];
    newFeedback[currentQuestionIndex] = isCorrect;
    setFeedback(newFeedback);

    if (isCorrect && currentQuestionIndex < quest.quizzes.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 1000);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>×</button>
        <h2>クエスト詳細</h2>

        {view === 'summary' && (
          <div className="summary-section">
            <h3>概要</h3>
            <p>{quest.summary}</p>
            {/* ボタンの文言を修正 */}
            <button className="switch-view-button" onClick={() => setView('quiz')}>
              {quest.quizzes ? '理解度チェックに進む' : 'クイズがありません'}
            </button>
          </div>
        )}

        {view === 'quiz' && currentQuiz && (
          <div className="quiz-section">
            <div className="quiz-header">
              <h3>理解度チェック！ ({currentQuestionIndex + 1}/{quest.quizzes.length})</h3>
              {/* 「概要に戻る」ボタンを追加 */}
              <button className="switch-view-button secondary" onClick={() => setView('summary')}>概要に戻る</button>
            </div>
            <p>{highlightBlank(currentQuiz.quiz)}</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={userAnswers[currentQuestionIndex] || ''}
                onChange={handleAnswerChange}
                placeholder="[BLANK]に入る言葉は？"
                disabled={feedback[currentQuestionIndex] === true}
              />
              <button type="submit" disabled={feedback[currentQuestionIndex] === true}>答え合わせ</button>
            </form>
            {feedback[currentQuestionIndex] === true && <p className="feedback correct">正解！</p>}
            {feedback[currentQuestionIndex] === false && <p className="feedback incorrect">残念！もう一度考えてみよう。</p>}
            {allCorrect && <p className="feedback all-correct">全問正解！クエストクリア！</p>}
          </div>
        )}
      </div>
    </div>
  );
}