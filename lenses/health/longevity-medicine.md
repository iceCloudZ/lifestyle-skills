---
name: longevity-medicine
description: Use for preventive health questions where the goal is long-term risk reduction, metric trends, and better doctor conversations. Do not use for acute symptoms, diagnosis, or treatment decisions.
---

# Longevity Medicine

Use this skill to organize health thinking around long-term function, risk reduction, and preventive conversations.

## Use When

- The person wants to understand trends in sleep, blood pressure, labs, weight, or fitness.
- The goal is prevention, not acute diagnosis.
- The output should help prepare a doctor conversation.

## Avoid When

- There are acute symptoms or emergency signs.
- The person asks for diagnosis, medication changes, or treatment.
- The data is too incomplete to draw a safe conclusion.

## Evidence Card

evidence_level: B
evidence_type: preventive-care reasoning, risk-factor tracking, and clinician conversation preparation
why_included: This lens helps users organize metrics and lifestyle signals without pretending the assistant can diagnose or treat.
known_limits: It can overfit incomplete data if the assistant infers trends or risk without enough context.
safety_boundaries: Stay non-diagnostic. Encourage clinician review for symptoms, abnormal metrics, medications, or treatment decisions.
not_for: acute symptoms, diagnosis, medication changes, treatment plans, or urgent medical decisions

## Reasoning Flow

### 1. Pre-check: Should this lens be used here?

Use for prevention, trend review, and better doctor conversations. Do not use when the user needs urgent care, diagnosis, or medication guidance.

### 2. Key assessment questions

- Is the question about a trend, a one-off reading, a symptom, or a behavior?
- Has a clinician already given a diagnosis or target?
- What would be useful to prepare for the next appointment?

### 3. Reasoning branches

- Metrics trend: separate signal from noise and suggest what to track.
- Symptom present: stop lifestyle coaching and suggest appropriate medical review.
- Preventive habit: choose a low-risk behavior and one clinician question.
- Lab anxiety: organize questions rather than interpreting results as diagnosis.

### 4. Minimum complete answer

- Identify the type of signal: metric, symptom, behavior, or risk factor.
- Avoid diagnosis and treatment claims.
- Suggest one tracking or preparation step.
- Include one doctor question when health data is involved.

### 5. Hand-off conditions

Hand off for chest pain, fainting, severe symptoms, medication changes, abnormal labs, pregnancy concerns, mental health crisis, or any diagnosis request.

## Thinking Steps

1. Separate metrics, symptoms, behaviors, and risk factors.
2. Look for trends rather than one-off readings.
3. Identify what needs professional review.
4. Suggest basic tracking or lifestyle questions.
5. Keep the tone cautious and non-diagnostic.

## Output Format

- Fit: why this lens applies.
- Signals: what seems worth tracking.
- Doctor questions: what to ask a clinician.
- Next step: one low-risk action.

## Safety

Do not diagnose, prescribe, change medications, or override clinicians.
