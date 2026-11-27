import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { getFallbackAnswer, getContextualQuestions } from '../services/chatService.js';
import { buildChatUserContext } from '../prompts/chat.js';
import type { HouseholdProfile, AirQualitySummary } from '@airwise/shared';

const mockProfile: HouseholdProfile = {
  householdSize: 4,
  hasChildren: true,
  hasElderly: false,
  hasSensitiveMembers: false,
  commuteMode: 'metro',
  commuteMinutesPerDay: 40,
  cookingFuel: 'biomass',
  hasAirPurifier: false,
  homeType: 'apartment',
  heatingType: 'none',
  language: 'en',
};

const mockAir: AirQualitySummary = {
  current: {
    pm25: 220,
    pm10: 320,
    usAqi: 270,
    category: {
      level: 'very-unhealthy',
      label: 'Very Unhealthy',
      icon: '🟣',
      color: '#7c3aed',
      bgColor: '#ede9fe',
      min: 201,
      max: 300,
    },
  },
  hourly: [],
  bestVentilationWindow: {
    startHour: 13,
    endHour: 15,
    avgAqi: 110,
    label: '1:00 PM - 3:00 PM',
  },
  worstOutdoorWindow: {
    startHour: 7,
    endHour: 9,
    avgAqi: 310,
    label: '7:00 AM - 9:00 AM',
  },
  fetchedAt: new Date().toISOString(),
};

describe('Ask AirWise Chat Service & API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds chat context from the household profile and air quality summary', () => {
    const context = JSON.parse(buildChatUserContext(mockProfile, mockAir));

    expect(context).toEqual({
      locationAir: {
        aqi: 270,
        category: 'Very Unhealthy',
        pm25: 220,
        pm10: 320,
        bestVentilationWindow: '1:00 PM - 3:00 PM',
        worstOutdoorWindow: '7:00 AM - 9:00 AM',
      },
      household: {
        householdSize: 4,
        hasChildren: true,
        hasElderly: false,
        hasSensitiveMembers: false,
        commuteMode: 'metro',
        cookingFuel: 'biomass',
        hasAirPurifier: false,
        homeType: 'apartment',
        language: 'en',
      },
      planSummary: 'Standard winter smog harm-reduction plan',
    });
  });

  it('includes a supplied plan summary in chat context', () => {
    const context = JSON.parse(buildChatUserContext(mockProfile, mockAir, 'Custom plan'));

    expect(context.planSummary).toBe('Custom plan');
  });

  it('generates contextual question chips based on profile', () => {
    const questions = getContextualQuestions(mockProfile, mockAir);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((q) => q.includes('toddler') || q.includes('play'))).toBe(true);
    expect(questions.some((q) => q.includes('cooking') || q.includes('smoke'))).toBe(true);
  });

  it('refuses medical advice and redirects to healthcare professional', () => {
    const res = getFallbackAnswer('My child has severe chest pain and coughing', mockProfile, mockAir);
    expect(res.message.toLowerCase()).toContain('medical');
    expect(res.message.toLowerCase()).toContain('emergency');
  });

  it('provides evidence-based toddler play advice grounded in AQI', () => {
    const res = getFallbackAnswer('Is it safe for my toddler to play outside?', mockProfile, mockAir);
    expect(res.message).toContain('NOT safe');
    expect(res.message).toContain('270');
  });

  it('POST /api/chat handles message turns with fallback when no Groq key', async () => {
    const app = createApp({
      PORT: 3001,
      NODE_ENV: 'test',
      GROQ_API_KEY: '',
      GROQ_MODEL: 'llama-3.3-70b-versatile',
      CORS_ORIGINS: 'http://localhost:5173',
    });

    const res = await request(app)
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: 'What mask should I wear?' }],
        profile: mockProfile,
        airSummary: mockAir,
      });

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('rules');
    expect(res.body.message).toContain('N95');
    expect(res.body.suggestedQuestions.length).toBeGreaterThan(0);
  });
});
