import { useState } from 'react';
export function FlightEntry({ code, setCode, name, setName, busy, join, create, clearError }: {
    code: string;
    setCode: (v: string) => void;
    name: string;
    setName: (v: string) => void;
    busy: boolean;
    join: () => Promise<void>;
    create: () => Promise<void>;
    clearError: () => void;
}) {
    const [mode, setMode] = useState<'create' | 'join'>(new URLSearchParams(location.search).has('room') ? 'join' : 'create');
    return <section className="entry panel"><div className="section-title"><span>01 / ASSEMBLE CREW</span><span>2–8 PLAYERS</span></div><div className="entry-modes" role="group" aria-label="Choose how to play"><button type="button" aria-pressed={mode === 'create'} disabled={busy} onClick={() => { setMode('create'); clearError(); }}>Create a room</button><button type="button" aria-pressed={mode === 'join'} disabled={busy} onClick={() => { setMode('join'); clearError(); }}>Join a room</button></div>
 <form aria-label={mode === 'create' ? 'Create a flight' : 'Join a flight'} aria-busy={busy} onSubmit={e => {
            e.preventDefault();
            if (!busy)
                void (mode === 'create' ? create() : join());
        }}>
 <label htmlFor="callsign">YOUR CALLSIGN</label><input id="callsign" name="nickname" required maxLength={20} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nova" autoComplete="nickname" aria-describedby="entry-hint"/>
 {mode === 'join' && <><label htmlFor="room-code">ROOM CODE</label><input id="room-code" name="room" className="code-input" required minLength={6} maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="ABC234" autoCapitalize="characters" autoCorrect="off" spellCheck={false}/></>}
 <p className="caption" id="entry-hint">{mode === 'create' ? 'Create a flight, then invite your crew before starting.' : 'Use the six-character code your commander shared.'}</p>
 <button className="primary" type="submit" disabled={busy || !name.trim() || (mode === 'join' && code.length !== 6)}>{busy ? (mode === 'create' ? 'CREATING FLIGHT…' : 'JOINING CREW…') : (mode === 'create' ? 'CREATE A FLIGHT' : 'JOIN FLIGHT')}<span aria-hidden="true">↗</span></button>
 </form><p className="caption entry-footnote">No accounts. Each player needs a separate browser profile or device.</p></section>;
}
