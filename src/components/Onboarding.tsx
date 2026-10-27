import { useState } from 'react';
import type { Role } from '../../shared/protocol';
import { ROLE_NAMES } from '../../shared/protocol';
export function Onboarding({ roles }: {
    roles: Role[];
}) {
    const [step, setStep] = useState(0);
    const steps = [{ title: 'Separate consoles. Shared survival.', body: 'Use a voice call or sit together. You have different private information and specific numbered responsibilities. Every crew member matters.' }, { title: 'Read. Relay. Confirm.', body: 'Analysts and decoders report their assigned readings, then confirm each one. Engineers and operators adjust only their assigned controls. No one gets both sides of the puzzle.' }, { title: 'Three crises. One clock.', body: 'Restore power, balance cooling, then execute a decoded mechanical sequence. You share five minutes and 100 integrity. A wrong test costs 20 integrity and locks controls for three seconds.' }];
    return <section className="panel briefing"><div className="eyebrow">FLIGHT ACADEMY / {step + 1} OF 3</div><h2>{steps[step].title}</h2><p>{steps[step].body}</p><div className="tutorial-dots" role="group" aria-label={`Briefing step ${step + 1} of 3`}>{steps.map((_, i) => <button key={i} onClick={() => setStep(i)} className={i === step ? 'selected' : ''} aria-pressed={i === step} aria-label={`Briefing step ${i + 1}`}>{i + 1}</button>)}</div><button onClick={() => setStep((step + 1) % 3)}>{step === 2 ? 'REVIEW BRIEFING ↺' : 'NEXT BRIEFING →'}</button><div className="role-badge">YOUR DUTIES / {roles.map(r => ROLE_NAMES[r]).join(' + ')}</div><p className="caption">Your assigned controls and context-specific help appear on your console. Keep talking throughout the mission.</p></section>;
}
