'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Play, RotateCcw, Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useResumes } from '@/hooks/use-resumes';
import { apiClient } from '@/lib/api-client';

interface AnswerEvaluation {
  score: number;
  evaluation: string;
  strengths: string[];
  improvements: string[];
}

interface InterviewMessage {
  question: string;
  answer?: string;
  evaluation?: AnswerEvaluation;
}

export default function InterviewPage() {
  const { getToken, isSignedIn } = useAuth();
  const { data: resumes } = useResumes();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [roleTitle, setRoleTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const requestQuestion = async (previousQuestions: string[]) => {
    const token = await getToken();
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    const result = await apiClient.post<{ question: string; creditsRemaining: number | null }>(
      '/interview/question',
      { resumeId, roleTitle, companyName, previousQuestions },
      token,
    );
    setCreditsRemaining(result.creditsRemaining);
    setMessages((current) => [...current, { question: result.question }]);
  };

  const startSession = async () => {
    if (!roleTitle.trim() || !companyName.trim() || !resumeId) {
      toast.error('Choose a resume and enter a target role and company.');
      return;
    }
    setSubmitting(true);
    try {
      await requestQuestion([]);
      setSessionStarted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start the interview.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async () => {
    const answer = userInput.trim();
    const current = messages[messages.length - 1];
    if (!answer || !current || current.answer) return;

    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const evaluation = await apiClient.post<AnswerEvaluation>(
        '/interview/evaluate',
        { resumeId, roleTitle, companyName, question: current.question, answer },
        token,
      );
      setMessages((items) => items.map((item, index) =>
        index === items.length - 1 ? { ...item, answer, evaluation } : item,
      ));
      setUserInput('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not evaluate the answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const generateNextQuestion = async () => {
    setSubmitting(true);
    try {
      await requestQuestion(messages.map((message) => message.question));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate the next question.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetSession = () => {
    setSessionStarted(false);
    setMessages([]);
    setUserInput('');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface-2)',
    padding: '10px 12px',
    fontSize: '14px',
    color: 'var(--text-1)',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '900px', margin: '0 auto', paddingBottom: '48px' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-1.2px' }}>
          AI Interview <span style={{ color: 'var(--brand)' }}>Coach</span>
        </h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-2)', fontSize: '14px' }}>
          Get personalized questions from your resume and target role, then receive an AI evaluation for every answer.
        </p>
      </motion.div>

      {!sessionStarted ? (
        <Card hoverEffect={false} style={{ padding: '28px', maxWidth: '560px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <Sparkles style={{ color: 'var(--brand)', width: 28, height: 28, margin: '0 auto' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '10px 0 4px', color: 'var(--text-1)' }}>Set up your practice</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>Each generated question uses one AI credit. Answer evaluations are included.</p>
          </div>
          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)' }}>
            Resume
            <select value={resumeId} onChange={(event) => setResumeId(event.target.value)} style={inputStyle}>
              <option value="">Select a resume</option>
              {resumes?.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)' }}>
            Target role
            <input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} placeholder="e.g. Senior Product Designer" style={inputStyle} />
          </label>
          <label style={{ display: 'grid', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)' }}>
            Target company
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. Acme" style={inputStyle} />
          </label>
          <Button onClick={startSession} disabled={submitting || !isSignedIn || !resumes?.length} style={{ width: '100%', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {submitting ? 'Generating your first question…' : 'Start interview · 1 AI credit'}
          </Button>
          {!resumes?.length && <p style={{ color: 'var(--text-3)', fontSize: '12px', margin: 0, textAlign: 'center' }}>Upload a resume before starting a personalized interview.</p>}
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(220px, 1fr)', gap: '20px', alignItems: 'start' }}>
          <Card hoverEffect={false} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {messages.map((message, index) => (
              <div key={`${index}-${message.question}`} style={{ display: 'grid', gap: '10px' }}>
                <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--brand)', fontSize: '10px', fontWeight: 800, margin: '0 0 6px' }}>QUESTION {index + 1}</p>
                  <p style={{ margin: 0, color: 'var(--text-1)', lineHeight: 1.6 }}>{message.question}</p>
                </div>
                {message.answer && (
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--brand)', color: 'white' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, margin: '0 0 6px' }}>YOUR ANSWER</p>
                    <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{message.answer}</p>
                  </div>
                )}
                {message.evaluation && (
                  <div style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-1)' }}>AI answer evaluation</strong>
                      <Badge variant="brand">{message.evaluation.score}/10</Badge>
                    </div>
                    <p style={{ color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6 }}>{message.evaluation.evaluation}</p>
                    {!!message.evaluation.strengths.length && <p style={{ fontSize: '12px', color: 'var(--text-2)' }}><strong>Strengths:</strong> {message.evaluation.strengths.join(' · ')}</p>}
                    {!!message.evaluation.improvements.length && <p style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: 0 }}><strong>Improve:</strong> {message.evaluation.improvements.join(' · ')}</p>}
                  </div>
                )}
              </div>
            ))}

            {submitting && <p role="status" style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>The AI coach is preparing your response…</p>}
            {messages[messages.length - 1]?.answer ? (
              <Button onClick={generateNextQuestion} disabled={submitting || creditsRemaining === 0} style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                Generate next question{creditsRemaining === null ? '' : ' · 1 AI credit'}
              </Button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <textarea
                  value={userInput}
                  onChange={(event) => setUserInput(event.target.value)}
                  disabled={submitting}
                  aria-label="Interview answer"
                  placeholder="Write your answer…"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                <Button onClick={handleSend} disabled={submitting || !userInput.trim()} aria-label="Submit answer">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
            )}
          </Card>

          <Card hoverEffect={false} style={{ padding: '20px', display: 'grid', gap: '12px' }}>
            <strong style={{ color: 'var(--text-1)' }}>Session details</strong>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-2)' }}>{roleTitle} at {companyName}</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>{messages.length} question{messages.length === 1 ? '' : 's'} generated</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-3)' }}>{creditsRemaining === null ? 'Credits remaining: unlimited' : `Credits remaining: ${creditsRemaining ?? '—'}`}</p>
            <Button variant="ghost" onClick={resetSession} style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <RotateCcw size={14} /> End practice
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
