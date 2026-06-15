'use client';

import React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mic,
  MicOff,
  Send,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FeedbackScore {
  starAlignment: number; // 0-100
  clarity: number; // 0-100
  sentiment: 'Positive' | 'Neutral' | 'Constructive';
  evaluation: string;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  text: string;
  feedback?: FeedbackScore;
}

const mockQuestions = [
  'Tell me about a time you resolved a major conflict within a development team. What was the situation and the result?',
  'Describe a situation where you had to quickly adapt to a brand-new technology stacks or frameworks to deliver a key product feature.',
  'How do you manage deadlines and prioritize competing requirements under tight launch time constraints?',
];

export default function InterviewPage() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [roleTitle, setRoleTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startSession = () => {
    if (!roleTitle || !companyName) {
      toast.error('Please enter a target role and company name');
      return;
    }
    setSessionStarted(true);
    setMessages([
      {
        role: 'assistant',
        text: `Hi there! Welcome to your mock interview session for the ${roleTitle} role at ${companyName}. Let's start with our first question: ${mockQuestions[0]}`,
      },
    ]);
    setCurrentQuestionIdx(0);
  };

  const handleSend = () => {
    if (!userInput.trim()) return;

    const userMsg = userInput;
    setUserInput('');

    // Append user message
    const updatedMessages = [...messages, { role: 'user', text: userMsg } as ChatMessage];
    setMessages(updatedMessages);
    setSubmitting(true);

    // Mock AI response & feedback evaluation after delay
    setTimeout(() => {
      const nextIdx = currentQuestionIdx + 1;
      const hasMore = nextIdx < mockQuestions.length;

      // Evaluate the user's answer for mock STAR feedback
      const clarityScore = Math.floor(Math.random() * 20) + 75; // 75-95
      const starScore = Math.floor(Math.random() * 25) + 70; // 70-95
      const mockFeedback: FeedbackScore = {
        starAlignment: starScore,
        clarity: clarityScore,
        sentiment: starScore > 85 ? 'Positive' : 'Neutral',
        evaluation: `Good STAR breakdown! Situation and Task were clear. Try expanding slightly more on the specific Actions you took to solve the conflict.`,
      };

      // Update the user's message with mock feedback
      updatedMessages[updatedMessages.length - 1].feedback = mockFeedback;

      if (hasMore) {
        setMessages([
          ...updatedMessages,
          {
            role: 'assistant',
            text: `Perfect. Let's move on to the next question: ${mockQuestions[nextIdx]}`,
          },
        ]);
        setCurrentQuestionIdx(nextIdx);
      } else {
        setMessages([
          ...updatedMessages,
          {
            role: 'assistant',
            text: `Thank you! That completes our mock interview session. You did a great job aligning your answers to the core competencies. Review your feedback details below.`,
          },
        ]);
      }
      setSubmitting(false);
    }, 1500);
  };

  const resetSession = () => {
    setSessionStarted(false);
    setRoleTitle('');
    setCompanyName('');
    setMessages([]);
    setUserInput('');
    setIsRecording(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', paddingBottom: '48px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          AI Interview <span style={{ color: 'var(--brand)' }}>Coach</span>
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, margin: '8px 0 0 0' }}>
          Practice realistic role-specific mock interviews and get instant STAR format feedback.
        </p>
      </motion.div>

      {!sessionStarted ? (
        /* Setup Form Card */
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card hoverEffect={false} style={{ padding: '32px', maxWidth: '512px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
              <div style={{
                margin: '0 auto',
                display: 'flex',
                height: '48px',
                width: '48px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                backgroundColor: 'var(--brand-light)',
                color: 'var(--brand)',
                border: '1px solid rgba(79, 70, 229, 0.2)'
              }}>
                <Sparkles style={{ height: '24px', width: '24px' }} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', margin: '8px 0 0 0' }}>Set Up Your Interview</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600, margin: 0 }}>
                Configure your target role and company to generate tailored interview questions.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Role Title</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior React Developer"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Company</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Stripe"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-2)',
                    padding: '10px 12px',
                    fontSize: '14px',
                    color: 'var(--text-1)',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
              </div>
            </div>

            <Button onClick={startSession} style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Play style={{ height: '16px', width: '16px', fill: 'currentColor' }} /> Start Practice Session
            </Button>
          </Card>
        </motion.div>
      ) : (
        /* Chat Session Interface */
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'stretch' }}>
          
          {/* Chat main block */}
          <div style={{
            flex: '2 1 500px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '580px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', userSelect: 'none' }}>
                    <span>{msg.role === 'assistant' ? 'COACH' : 'YOU'}</span>
                  </div>
                  
                  <div
                    style={{
                      maxWidth: '85%',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: 1.5,
                      backgroundColor: msg.role === 'user' ? 'var(--brand)' : 'var(--surface-2)',
                      color: msg.role === 'user' ? 'white' : 'var(--text-1)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border)'
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Feedback display on user message */}
                  {msg.feedback && (
                    <div style={{
                      width: '85%',
                      marginTop: '6px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'rgba(248, 249, 255, 0.6)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      userSelect: 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyText: 'space-between', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                        <span style={{ color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <TrendingUp style={{ height: '14px', width: '14px' }} /> STAR Feedback
                        </span>
                        <Badge variant="brand" style={{ fontSize: '10px', padding: '0px 6px' }}>
                          {msg.feedback.starAlignment}% Score
                        </Badge>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                        {msg.feedback.evaluation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {submitting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-3)', fontWeight: 700, fontSize: '12px', userSelect: 'none' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <RefreshCw style={{ height: '12px', width: '12px' }} />
                  </motion.div>
                  Analyzing response format details...
                </div>
              )}
            </div>

            {/* Input action bar */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setIsRecording(!isRecording)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: isRecording ? '#ef4444' : 'var(--border)',
                  backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: isRecording ? '#ef4444' : 'var(--text-2)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'var(--transition)'
                }}
                title={isRecording ? 'Stop Recording' : 'Record Answer'}
              >
                {isRecording ? <MicOff style={{ height: '18px', width: '18px' }} /> : <Mic style={{ height: '18px', width: '18px' }} />}
              </button>

              <input
                type="text"
                placeholder={isRecording ? 'Speaking... (recording audio)' : 'Type your answer here...'}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isRecording || submitting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                style={{
                  flex: 1,
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  padding: '10px 12px',
                  fontSize: '14px',
                  color: 'var(--text-1)',
                  outline: 'none',
                  fontWeight: 500
                }}
              />

              <Button onClick={handleSend} disabled={submitting || !userInput.trim()} style={{ padding: '10px', borderRadius: '8px', flexShrink: 0 }}>
                <Send style={{ height: '16px', width: '16px' }} />
              </Button>
            </div>
          </div>

          {/* Right Column: session metrics & options */}
          <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '16px', userSelect: 'none' }}>
            <Card hoverEffect={false} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', margin: 0 }}>Session Stats</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyText: 'space-between', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-2)' }}>Progress</span>
                  <span style={{ color: 'var(--text-1)', fontWeight: 700 }}>
                    {Math.min(currentQuestionIdx + 1, mockQuestions.length)} / {mockQuestions.length}
                  </span>
                </div>
                <div style={{ height: '8px', width: '100%', borderRadius: '999px', backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div
                    style={{
                      backgroundColor: 'var(--brand)',
                      height: '100%',
                      borderRadius: '999px',
                      transition: 'all 0.3s ease',
                      width: `${((currentQuestionIdx + 1) / mockQuestions.length) * 100}%`
                    }}
                  />
                </div>
              </div>
            </Card>

            <Card hoverEffect={false} style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.05em', margin: 0 }}>Role Details</h3>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{roleTitle}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500, marginTop: '2px', margin: '2px 0 0 0' }}>{companyName}</p>
                </div>
              </div>

              <Button variant="ghost" onClick={resetSession} style={{ width: '100%', fontSize: '12px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RotateCcw style={{ height: '14px', width: '14px' }} /> Restart Coach
              </Button>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
