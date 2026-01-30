// Web MIDI API type declarations
interface MIDIOptions {
    sysex?: boolean;
    software?: boolean;
}

interface MIDIAccess extends EventTarget {
    inputs: Map<string, MIDIInput>;
    outputs: Map<string, MIDIOutput>;
    onstatechange: ((this: MIDIAccess, ev: MIDIConnectionEvent) => void) | null;
    sysexEnabled: boolean;
}

interface MIDIPort extends EventTarget {
    id: string;
    manufacturer?: string;
    name?: string;
    type: 'input' | 'output';
    version?: string;
    state: 'disconnected' | 'connected';
    connection: 'open' | 'closed' | 'pending';
    onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => void) | null;
    open(): Promise<MIDIPort>;
    close(): Promise<MIDIPort>;
}

interface MIDIInput extends MIDIPort {
    type: 'input';
    onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => void) | null;
}

interface MIDIOutput extends MIDIPort {
    type: 'output';
    send(data: number[] | Uint8Array, timestamp?: number): void;
    clear(): void;
}

interface MIDIMessageEvent extends Event {
    data: Uint8Array;
}

interface MIDIConnectionEvent extends Event {
    port: MIDIPort;
}

interface Navigator {
    requestMIDIAccess(options?: MIDIOptions): Promise<MIDIAccess>;
}
