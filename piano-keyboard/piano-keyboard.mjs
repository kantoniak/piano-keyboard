'use strict';

class PianoUtils {

static isValidKeyNumber(k) {
    return 1 <= k && k <= 88;
}

static isBlackKey(key) {
    return [0, 2, 5, 7, 10].includes(key % 12);
}

static previousWhiteKey(key) {
    key--;
    while (PianoUtils.isBlackKey(key)) key--;
    return key < 1 ? null : key;
}

static nextWhiteKey(key) {
    key++;
    while (PianoUtils.isBlackKey(key)) key++;
    return key > 88 ? null : key;
}

static keyToNote(k, addOctave) {
    console.assert(k > 0);
    let octave = Math.floor( (k+8) / 12 );
    let offset = (((k-1)%12)+12)%12;
    let note = ['A', 'B', 'H', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'][offset];
    
    let result = note;
    if (addOctave == 'always') {
        result += octave;
    } else if (addOctave =='only-c' && note == 'C') {
        result += octave;
    }

    return result;
}

}

class PianoKeyboard extends HTMLElement {

static get observedAttributes() {
    return ['pressed', 'from', 'to'];
}

get pressed() {
    return this.getAttribute('pressed');
}

set pressed(val) {
    if (val) {
        this.setAttribute('pressed', val);
    } else {
        this.removeAttribute('pressed');
    }
}

get from() {
    return this.getAttribute('from');
}

set from(val) {
    if (val) {
        if (PianoUtils.isValidKeyNumber(val)) {
            this.setAttribute('from', val);
        }
    } else {
        this.removeAttribute('from');
    }
}

get to() {
    return this.getAttribute('to');
}

set to(val) {
    if (val) {
        if (PianoUtils.isValidKeyNumber(val)) {
            this.setAttribute('to', val);
        }
    } else {
        this.removeAttribute('to');
    }
}

static get template() {
    return this._template;
}

static set template(t) {
    this._template = t;
}

attributeChangedCallback(name, oldValue, newValue) {
    const hasValue = newValue !== null;
    if (name == 'pressed') {
        this._releaseAllKeys();
        if (hasValue) {
            let newPressed = newValue.split(',').map(e => parseInt(e.trim()));
            this._pressKeys(newPressed);
        } else {
            this.removeAttribute('pressed');
        }
    }
    if (name == 'from' || name == 'to') {
        this._render();
        let pressed = this.getAttribute('pressed').split(',').map(e => parseInt(e.trim()));
        this._pressKeys(pressed);
    }
}

_pressKey(k) {
    let key = this.drawing.getElementById('key-'+k);
    if (key == null) {
        return;
    }
    key.setAttribute('class', 'pressed');
}

_pressKeys(keys) {
    keys.forEach(k => this._pressKey(k));
}

_releaseAllKeys() {
    this.drawing
    .querySelectorAll('[href="#symbol-white-key"], [href="#symbol-black-key"]')
    .forEach(e => e.setAttribute('class', ''));
}

constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.SVG_XMLNS = "http://www.w3.org/2000/svg";

    this.shadowRoot.appendChild(PianoKeyboard.template.cloneNode(true));
    this.drawing = this.shadowRoot.querySelector('svg');
    this.topCover = this.drawing.getElementById('top');

    this._render();
}

connectedCallback() {
    this._upgradeProperty('pressed');
}

_upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
        let value = this[prop];
        delete this[prop];
        this[prop] = value;
    }
}

_removeRendered() {
    this.drawing
    .querySelectorAll('[href="#symbol-white-key"], [href="#symbol-black-key"], .symbol-note')
    .forEach(node => node.parentNode.removeChild(node));
}

_render() {
    this._removeRendered();

    const startKey = parseInt(this.getAttribute('from') || 40);
    const endKey = parseInt(this.getAttribute('to') || 64);

    console.assert(!PianoUtils.isBlackKey(startKey));
    console.assert(!PianoUtils.isBlackKey(endKey));
    console.assert(startKey <= endKey);

    this._renderWhiteKeys(startKey, endKey);
    this._renderBlackKeys(startKey, endKey);
}

_renderWhiteKeys(startKey, endKey) {
    let currentX = 0;
    for (let k = startKey; k <= endKey; k++) {
        if (PianoUtils.isBlackKey(k)) {
            continue;
        }
        
        var key = document.createElementNS(this.SVG_XMLNS, 'use');
        key.setAttribute('href', '#symbol-white-key');
        key.setAttribute('x', currentX);
        key.setAttribute('id', 'key-'+k);
        this.drawing.insertBefore(key, this.topCover);

        // TODO(kantoniak): Cannot use symbol because symbol Shadow DOM is closed. Move to
        // Referenced Parameter Variables when SVG2 is published and implemented.
        var key = document.createElementNS(this.SVG_XMLNS, 'text');
        key.setAttribute('x', currentX + 8);
        key.setAttribute('y', 88.5);
        key.setAttribute('class', 'symbol-note');
        key.textContent = PianoUtils.keyToNote(k, 'only-c');
        this.drawing.insertBefore(key, this.topCover);

        currentX += 16;
    }

    let width = currentX;
    this.drawing.setAttribute('viewBox', '0 0 ' + width + ' 100');
}

_renderBlackKeys(startKey, endKey) {
    const range = (start, end) => { return new Array(end - start).fill().map((d, i) => i + start); }
    const blackKeys = range(startKey, endKey).filter(PianoUtils.isBlackKey);
    
    const offsetFix = 0.5 * [9, 11].includes(startKey % 12) - 0.5 * [3, 8].includes(startKey % 12);
    const baseOffset = this._getKeyOffset(startKey) + offsetFix;

    blackKeys.forEach((k) => {
        var key = document.createElementNS(this.SVG_XMLNS, 'use');
        key.setAttribute('href', '#symbol-black-key');
        key.setAttribute('x', (this._getKeyOffset(k) - baseOffset) * 16);
        key.setAttribute('id', 'key-'+k);
        this.drawing.insertBefore(key, this.topCover);
    });
}

_getKeyOffset(key) {
    const offsets = [0.25, 0.5, 1.3, 2, 2.5, 3.22, 3.5, 4.28, 5, 5, 6.20, 6];
    let offsetForKey = ((key%12)+12)%12;
    return 7 * Math.floor(key/12) + offsets[offsetForKey];
}

}

async function getTemplateContent(filepath) {
    let response = await fetch(filepath);
    let txt = await response.text();

    let html =  new DOMParser().parseFromString(txt, 'text/html');
    return html.querySelector('template').content;
}

const moduleDirectoryPath = import.meta.url.substr(0, import.meta.url.lastIndexOf('/')) + '/';
getTemplateContent(moduleDirectoryPath + '/piano-keyboard.html').then((template) => {
    PianoKeyboard.template = template;
    window.customElements.define('piano-keyboard', PianoKeyboard);
});
