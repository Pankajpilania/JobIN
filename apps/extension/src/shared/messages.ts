// ─── Message type constants ───────────────────────────────────────────────────

export const MSG = {
  // Content script → Background
  JOB_DETECTED:       'JOB_DETECTED',
  REQUEST_MATCH_SCORE:'REQUEST_MATCH_SCORE',

  // Popup / SidePanel → Background
  GET_AUTH:           'GET_AUTH',
  GET_RESUMES:        'GET_RESUMES',
  GET_SETTINGS:       'GET_SETTINGS',
  GET_DETECTED_JOB:   'GET_DETECTED_JOB',
  TAILOR_RESUME:      'TAILOR_RESUME',
  GENERATE_COVER_LETTER:'GENERATE_COVER_LETTER',
  SAVE_APPLICATION:   'SAVE_APPLICATION',
  OPEN_SIDE_PANEL:    'OPEN_SIDE_PANEL',

  // Background → Content script
  START_AUTOFILL:     'START_AUTOFILL',
  AUTOFILL_FORM:      'AUTOFILL_FORM',

  // Content script → Background (autofill result)
  AUTOFILL_SUCCESS:   'AUTOFILL_SUCCESS',
  AUTOFILL_ERROR:     'AUTOFILL_ERROR',
} as const;

export type MsgType = typeof MSG[keyof typeof MSG];

// ─── Message payload interfaces ───────────────────────────────────────────────

export interface BaseMessage { type: MsgType }

export interface JobDetectedMessage extends BaseMessage {
  type:    typeof MSG.JOB_DETECTED;
  payload: import('./types').DetectedJob;
}

export interface TailorResumeMessage extends BaseMessage {
  type:    typeof MSG.TAILOR_RESUME;
  payload: { resumeId: string; jobDescription: string; jobTitle?: string; companyName?: string };
}

export interface GenerateCoverLetterMessage extends BaseMessage {
  type:    typeof MSG.GENERATE_COVER_LETTER;
  payload: {
    resumeId: string; jobTitle: string; companyName: string;
    jobDescription: string; variant: import('./types').CoverLetterVariant;
    hiringManagerName?: string;
  };
}

export interface SaveApplicationMessage extends BaseMessage {
  type:    typeof MSG.SAVE_APPLICATION;
  payload: {
    jobTitle: string; companyName: string; location?: string;
    jobUrl?: string; status?: string; jobDescription?: string;
  };
}

export interface AutofillFormMessage extends BaseMessage {
  type:    typeof MSG.AUTOFILL_FORM;
  payload: import('./types').UserProfile;
}

export type ExtensionMessage =
  | JobDetectedMessage
  | TailorResumeMessage
  | GenerateCoverLetterMessage
  | SaveApplicationMessage
  | AutofillFormMessage
  | { type: Exclude<MsgType, typeof MSG.JOB_DETECTED | typeof MSG.TAILOR_RESUME | typeof MSG.GENERATE_COVER_LETTER | typeof MSG.SAVE_APPLICATION | typeof MSG.AUTOFILL_FORM>; payload?: unknown };
