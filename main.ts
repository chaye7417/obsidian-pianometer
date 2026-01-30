import { App, ItemView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { Chord, Note } from 'tonal';

const VIEW_TYPE_PIANOMETER = 'pianometer-view';

interface PianoMeterSettings {
    keyColor: string;
    rainbowMode: boolean;
    displayNoteNames: boolean;
    keyboardScale: number;
}

const DEFAULT_SETTINGS: PianoMeterSettings = {
    keyColor: '#ff0090',
    rainbowMode: false,
    displayNoteNames: false,
    keyboardScale: 100
};

export default class PianoMeterPlugin extends Plugin {
    settings: PianoMeterSettings;

    async onload() {
        await this.loadSettings();

        this.registerView(
            VIEW_TYPE_PIANOMETER,
            (leaf) => new PianoMeterView(leaf, this)
        );

        this.addRibbonIcon('music', 'PianoMeter', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-pianometer',
            name: '打开钢琴键盘显示器',
            callback: () => {
                this.activateView();
            }
        });

        this.addSettingTab(new PianoMeterSettingTab(this.app, this));
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_PIANOMETER);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf?.setViewState({ type: VIEW_TYPE_PIANOMETER, active: true });
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }
}

class PianoMeterView extends ItemView {
    plugin: PianoMeterPlugin;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    chordDisplay: HTMLElement;
    animationId: number;
    midiAccess: MIDIAccess | null = null;
    activeInputs: Map<string, MIDIInput> = new Map();
    midiDeviceList: HTMLElement;

    // Piano state
    isKeyOn: number[] = new Array(128).fill(0);
    isPedaled: number[] = new Array(128).fill(0);
    nowPedaling = false;
    cc64now = 0;
    cc67now = 0;

    // Stats
    sessionStartTime: Date = new Date();
    totalNotesPlayed = 0;
    notesThisFrame = 0;
    shortTermTotal: number[] = new Array(60).fill(0);
    legatoHistory: number[] = new Array(60).fill(0);
    notesSMax = 0;
    totalIntensityScore = 0;
    flatNames = false;

    // Layout constants
    readonly border = 3;
    readonly whiteKeyWidth = 20;
    readonly whiteKeySpace = 1;
    readonly blackKeyWidth = 17;
    readonly blackKeyHeight = 45;
    readonly radius = 5;
    readonly bRadius = 4;
    readonly keyAreaY = 3;
    readonly keyAreaHeight = 70;
    readonly isBlack = [0, 11, 0, 13, 0, 0, 11, 0, 12, 0, 13, 0];

    constructor(leaf: WorkspaceLeaf, plugin: PianoMeterPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_PIANOMETER;
    }

    getDisplayText() {
        return 'PianoMeter';
    }

    getIcon() {
        return 'music';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.addClass('pianometer-container');

        // Replace title with chord display
        const titleEl = this.containerEl.querySelector('.view-header-title');
        if (titleEl) {
            titleEl.addClass('pianometer-title-chord');
            this.chordDisplay = titleEl as HTMLElement;
        } else {
            this.chordDisplay = container.createDiv({ cls: 'pianometer-chord-display' });
        }

        // Settings button in top-left corner
        const toggleBtn = container.createEl('button', {
            cls: 'pianometer-toggle-btn',
            text: '⚙️'
        });

        // Canvas (main display)
        this.canvas = container.createEl('canvas', { cls: 'pianometer-canvas' });
        this.canvas.width = 1098;
        this.canvas.height = 76;
        this.ctx = this.canvas.getContext('2d')!;

        // Create controls (hidden by default)
        const controls = container.createDiv({ cls: 'pianometer-controls pianometer-hidden' });

        toggleBtn.addEventListener('click', () => {
            controls.classList.toggle('pianometer-hidden');
            toggleBtn.textContent = controls.classList.contains('pianometer-hidden') ? '⚙️' : '✕';
        });

        // MIDI device selector (multi-select with checkboxes)
        const midiSection = controls.createDiv({ cls: 'pianometer-midi-section' });
        midiSection.createEl('label', { text: 'MIDI 设备:' });
        this.midiDeviceList = midiSection.createDiv({ cls: 'pianometer-midi-list' });

        // Color picker
        const colorRow = controls.createDiv({ cls: 'pianometer-row' });
        colorRow.createEl('label', { text: '颜色: ' });
        const colorPicker = colorRow.createEl('input', { type: 'color' }) as HTMLInputElement;
        colorPicker.value = this.plugin.settings.keyColor;
        colorPicker.addEventListener('input', () => {
            this.plugin.settings.keyColor = colorPicker.value;
            this.plugin.saveSettings();
        });

        // Rainbow mode toggle
        const rainbowRow = controls.createDiv({ cls: 'pianometer-row' });
        rainbowRow.createEl('label', { text: '彩虹模式: ' });
        const rainbowToggle = rainbowRow.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
        rainbowToggle.checked = this.plugin.settings.rainbowMode;
        rainbowToggle.addEventListener('change', () => {
            this.plugin.settings.rainbowMode = rainbowToggle.checked;
            this.plugin.saveSettings();
        });

        // Note names toggle
        const noteNamesRow = controls.createDiv({ cls: 'pianometer-row' });
        noteNamesRow.createEl('label', { text: '显示音名: ' });
        const noteNamesToggle = noteNamesRow.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
        noteNamesToggle.checked = this.plugin.settings.displayNoteNames;
        noteNamesToggle.addEventListener('change', () => {
            this.plugin.settings.displayNoteNames = noteNamesToggle.checked;
            this.plugin.saveSettings();
        });

        // Keyboard scale slider
        const scaleRow = controls.createDiv({ cls: 'pianometer-row' });
        scaleRow.createEl('label', { text: '键盘大小: ' });
        const scaleSlider = scaleRow.createEl('input', { type: 'range' }) as HTMLInputElement;
        scaleSlider.min = '70';
        scaleSlider.max = '300';
        scaleSlider.value = String(this.plugin.settings.keyboardScale);
        const scaleValue = scaleRow.createEl('span', { cls: 'pianometer-scale-value' });
        scaleValue.textContent = `${this.plugin.settings.keyboardScale}%`;
        scaleSlider.addEventListener('input', () => {
            const scale = parseInt(scaleSlider.value);
            scaleValue.textContent = `${scale}%`;
            this.plugin.settings.keyboardScale = scale;
            this.plugin.saveSettings();
            this.applyKeyboardScale(scale);
        });

        // Apply initial scale
        this.applyKeyboardScale(this.plugin.settings.keyboardScale);

        // Reset buttons
        const resetRow = controls.createDiv({ cls: 'pianometer-row pianometer-reset-row' });
        const resetTimeBtn = resetRow.createEl('button', { text: '重置时间' });
        resetTimeBtn.addEventListener('click', () => {
            this.sessionStartTime = new Date();
        });
        const resetNotesBtn = resetRow.createEl('button', { text: '重置音符' });
        resetNotesBtn.addEventListener('click', () => {
            this.totalNotesPlayed = 0;
            this.notesSMax = 0;
            this.totalIntensityScore = 0;
        });

        // Initialize MIDI
        await this.initMIDI();

        // Start animation
        this.startAnimation();

        // Click handler for toggling flat names
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (y > 76 && x > 441 && x < 841) {
                this.flatNames = !this.flatNames;
            }
        });
    }

    async initMIDI() {
        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.updateMIDIDevices();

            this.midiAccess.onstatechange = () => {
                this.updateMIDIDevices();
            };
        } catch (err) {
            console.error('Web MIDI API not supported:', err);
            this.midiDeviceList.innerHTML = '<span class="pianometer-no-midi">MIDI 不可用</span>';
        }
    }

    updateMIDIDevices() {
        if (!this.midiAccess) return;

        this.midiDeviceList.innerHTML = '';
        const inputsMap = this.midiAccess.inputs as Map<string, MIDIInput>;
        const inputs: MIDIInput[] = [];
        inputsMap.forEach((input) => inputs.push(input));

        if (inputs.length === 0) {
            this.midiDeviceList.innerHTML = '<span class="pianometer-no-midi">未检测到 MIDI 设备</span>';
            return;
        }

        inputs.forEach((input, index) => {
            const deviceRow = this.midiDeviceList.createDiv({ cls: 'pianometer-midi-device' });
            const checkbox = deviceRow.createEl('input', { type: 'checkbox' }) as HTMLInputElement;
            checkbox.id = `midi-${input.id}`;
            checkbox.checked = true; // Default: all selected
            checkbox.addEventListener('change', () => {
                this.toggleMIDIInput(input.id, checkbox.checked);
            });
            const label = deviceRow.createEl('label');
            label.setAttribute('for', `midi-${input.id}`);
            label.textContent = input.name || `MIDI Input ${index + 1}`;

            // Auto-enable all devices by default
            this.enableMIDIInput(input);
        });
    }

    enableMIDIInput(input: MIDIInput) {
        if (this.activeInputs.has(input.id)) return;

        input.onmidimessage = (e: MIDIMessageEvent) => this.handleMIDIMessage(e);
        this.activeInputs.set(input.id, input);
    }

    disableMIDIInput(inputId: string) {
        const input = this.activeInputs.get(inputId);
        if (input) {
            input.onmidimessage = null;
            this.activeInputs.delete(inputId);
        }
    }

    toggleMIDIInput(inputId: string, enabled: boolean) {
        if (!this.midiAccess) return;

        if (enabled) {
            const inputsMap = this.midiAccess.inputs as Map<string, MIDIInput>;
            const input = inputsMap.get(inputId);
            if (input) {
                this.enableMIDIInput(input);
            }
        } else {
            this.disableMIDIInput(inputId);
        }
    }

    handleMIDIMessage(event: MIDIMessageEvent) {
        const data = event.data;
        if (!data || data.length < 2) return;

        const status = data[0] & 0xf0;
        const channel = data[0] & 0x0f;

        switch (status) {
            case 0x90: // Note On
                if (data[2] > 0) {
                    this.noteOn(data[1], data[2]);
                } else {
                    this.noteOff(data[1]);
                }
                break;
            case 0x80: // Note Off
                this.noteOff(data[1]);
                break;
            case 0xb0: // Control Change
                this.controllerChange(data[1], data[2]);
                break;
        }
    }

    noteOn(pitch: number, velocity: number) {
        this.totalNotesPlayed++;
        this.notesThisFrame++;
        this.totalIntensityScore += velocity;
        this.isKeyOn[pitch] = 1;
        if (this.nowPedaling) {
            this.isPedaled[pitch] = 1;
        }
    }

    noteOff(pitch: number) {
        this.isKeyOn[pitch] = 0;
    }

    controllerChange(number: number, value: number) {
        if (number === 64) { // Sustain pedal
            this.cc64now = value;
            if (value >= 64) {
                this.nowPedaling = true;
                for (let i = 0; i < 128; i++) {
                    this.isPedaled[i] = this.isKeyOn[i];
                }
            } else {
                this.nowPedaling = false;
                this.isPedaled.fill(0);
            }
        } else if (number === 67) { // Soft pedal
            this.cc67now = value;
        }
    }

    applyKeyboardScale(scale: number) {
        const scaleRatio = scale / 100;
        this.canvas.style.width = `${1098 * scaleRatio}px`;
        this.canvas.style.height = `${76 * scaleRatio}px`;
    }

    startAnimation() {
        const draw = () => {
            this.drawFrame();
            this.animationId = requestAnimationFrame(draw);
        };
        draw();
    }

    drawFrame() {
        const ctx = this.ctx;
        const settings = this.plugin.settings;

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Push histories
        this.shortTermTotal.push(this.notesThisFrame);
        this.shortTermTotal.shift();
        this.notesThisFrame = 0;
        this.legatoHistory.push(this.isKeyOn.reduce((a, b) => a + b, 0));
        this.legatoHistory.shift();

        // Draw white keys
        this.drawWhiteKeys(ctx, settings);

        // Draw black keys
        this.drawBlackKeys(ctx, settings);

        // Draw note names
        if (settings.displayNoteNames) {
            this.drawNoteNames(ctx);
        }

        // Draw stats text
        this.drawTexts(ctx);
    }

    hexToHSL(hex: string): { h: number; s: number; l: number } {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    getKeyColor(midiNote: number, isPedaled: boolean, settings: PianoMeterSettings): string {
        if (settings.rainbowMode) {
            const hue = ((midiNote - 21) / 87) * 1080 % 360;
            const lightness = isPedaled ? 50 : 70;
            return `hsl(${hue}, 100%, ${lightness}%)`;
        } else {
            const hsl = this.hexToHSL(settings.keyColor);
            const lightness = isPedaled ? hsl.l * 0.7 : hsl.l;
            return `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`;
        }
    }

    drawWhiteKeys(ctx: CanvasRenderingContext2D, settings: PianoMeterSettings) {
        let wIndex = 0;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;

        for (let i = 21; i < 109; i++) {
            if (this.isBlack[i % 12] === 0) {
                const x = this.border + wIndex * (this.whiteKeyWidth + this.whiteKeySpace);

                if (this.isKeyOn[i] === 1) {
                    ctx.fillStyle = this.getKeyColor(i, false, settings);
                } else if (this.isPedaled[i] === 1) {
                    ctx.fillStyle = this.getKeyColor(i, true, settings);
                } else {
                    ctx.fillStyle = '#fff';
                }

                this.roundRect(ctx, x, this.keyAreaY, this.whiteKeyWidth, this.keyAreaHeight, this.radius);
                wIndex++;
            }
        }
    }

    drawBlackKeys(ctx: CanvasRenderingContext2D, settings: PianoMeterSettings) {
        let wIndex = 0;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;

        for (let i = 21; i < 109; i++) {
            if (this.isBlack[i % 12] === 0) {
                wIndex++;
            }

            if (this.isBlack[i % 12] > 0) {
                const x = this.border + (wIndex - 1) * (this.whiteKeyWidth + this.whiteKeySpace) + this.isBlack[i % 12];

                if (this.isKeyOn[i] === 1) {
                    ctx.fillStyle = this.getKeyColor(i, false, settings);
                } else if (this.isPedaled[i] === 1) {
                    ctx.fillStyle = this.getKeyColor(i, true, settings);
                } else {
                    ctx.fillStyle = '#000';
                }

                this.roundRect(ctx, x, this.keyAreaY - 1, this.blackKeyWidth, this.blackKeyHeight, this.bRadius);
            }
        }
    }

    drawNoteNames(ctx: CanvasRenderingContext2D) {
        const noteNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let wIndex = 0;
        for (let i = 0; i < 52; i++) {
            const x = this.border + wIndex * (this.whiteKeyWidth + this.whiteKeySpace);
            const y = this.keyAreaY + this.keyAreaHeight - 11;
            ctx.fillText(noteNames[i % 7], x + this.whiteKeyWidth / 2, y);
            wIndex++;
        }
    }

    drawTexts(ctx: CanvasRenderingContext2D) {
        // Update chord display (HTML element, not canvas)
        if (this.chordDisplay) {
            const pressedKeys = this.getPressedKeys();
            const chords = this.detectChords(pressedKeys);

            if (chords.length === 0) {
                this.chordDisplay.innerHTML = '';
            } else {
                // First chord large, others smaller
                const mainChord = `<span class="pianometer-chord-main">${chords[0]}</span>`;
                const otherChords = chords.slice(1).map(c =>
                    `<span class="pianometer-chord-alt">${c}</span>`
                ).join(' ');
                this.chordDisplay.innerHTML = mainChord + (otherChords ? ' ' + otherChords : '');
            }
        }
    }

    drawMultilineText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
        const lines = text.split('\n');
        lines.forEach((line, index) => {
            ctx.fillText(line, x, y + index * 16);
        });
    }

    calculateSessionTime(): string {
        const elapsed = Date.now() - this.sessionStartTime.getTime();
        const seconds = Math.floor((elapsed / 1000) % 60);
        const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    convertToBars(value: number): string {
        const bars = Math.ceil(value / 12.8);
        return '|'.repeat(bars) + '.'.repeat(10 - bars);
    }

    getPressedKeys(): string[] {
        const noteNames = this.flatNames
            ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
            : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const pressedKeys: string[] = [];
        for (let i = 0; i < 128; i++) {
            if (this.isKeyOn[i] === 1 || this.isPedaled[i] === 1) {
                const noteName = noteNames[i % 12];
                const octave = Math.floor(i / 12) - 1;
                pressedKeys.push(`${noteName}${octave}`);
            }
        }
        return pressedKeys;
    }

    detectChords(notes: string[]): string[] {
        if (notes.length === 0) return [];
        try {
            const detected = Chord.detect(notes, { assumePerfectFifth: true });
            return detected.map((str: string) => str.replace(/M($|(?=\/))/g, ''));
        } catch {
            return [];
        }
    }

    truncate(str: string, maxLength: number): string {
        if (str.length <= maxLength) return str;
        return str.slice(0, maxLength - 3) + '...';
    }

    roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    async onClose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        // Clean up all active MIDI inputs
        this.activeInputs.forEach((input) => {
            input.onmidimessage = null;
        });
        this.activeInputs.clear();
    }
}

class PianoMeterSettingTab extends PluginSettingTab {
    plugin: PianoMeterPlugin;

    constructor(app: App, plugin: PianoMeterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'PianoMeter 设置' });

        new Setting(containerEl)
            .setName('按键颜色')
            .setDesc('设置按下琴键时的颜色')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.keyColor)
                .onChange(async (value) => {
                    this.plugin.settings.keyColor = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('彩虹模式')
            .setDesc('启用彩虹模式后，每个琴键会有不同颜色')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.rainbowMode)
                .onChange(async (value) => {
                    this.plugin.settings.rainbowMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('显示音名')
            .setDesc('在白键上显示音名')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.displayNoteNames)
                .onChange(async (value) => {
                    this.plugin.settings.displayNoteNames = value;
                    await this.plugin.saveSettings();
                }));
    }
}
