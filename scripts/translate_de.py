import json, re, time
from deep_translator import GoogleTranslator
from pathlib import Path

src = Path(r'c:\Hassen\src\i18n\de.json')
out = Path(r'c:\Hassen\src\i18n\de_translated.json')

data = json.loads(src.read_text(encoding='utf-8'))

translator = GoogleTranslator(source='en', target='de')

brand_terms = [
    'Home Assistant', 'OAuth2', 'Sonos', 'Nordpool', 'MediaSide', 'Nyx'
]

cache = {}

ph_re = re.compile(r'\{[^{}]+\}')
html_re = re.compile(r'<[^>]+>')


def mask_text(text):
    tokens = {}
    idx = 0

    def put_token(raw, kind='T'):
        nonlocal idx
        token = f'__{kind}{idx}__'
        idx += 1
        tokens[token] = raw
        return token

    # preserve placeholders and html first
    text = ph_re.sub(lambda m: put_token(m.group(0), 'P'), text)
    text = html_re.sub(lambda m: put_token(m.group(0), 'H'), text)

    # preserve brand/product names
    for term in brand_terms:
        if term in text:
            text = text.replace(term, put_token(term, 'B'))

    return text, tokens


def unmask_text(text, tokens):
    for token, raw in tokens.items():
        text = text.replace(token, raw)
    return text


def translate_value(val):
    if not isinstance(val, str) or val.strip() == '':
        return val
    if val in cache:
        return cache[val]

    masked, tokens = mask_text(val)

    for attempt in range(3):
        try:
            t = translator.translate(masked)
            t = unmask_text(t, tokens)
            cache[val] = t
            return t
        except Exception:
            if attempt == 2:
                cache[val] = val
                return val
            time.sleep(0.7)

translated = {}
for k, v in data.items():
    translated[k] = translate_value(v)

# post-fixes for known UI terms / required brand forms
manual = {
    'OAuth2 (Browser-Anmeldung)': 'OAuth2 (Browser-Login)',
    'Mit Home Assistant anmelden': 'Mit Home Assistant anmelden',
    'An Home Assistant weiterleiten...': 'Weiterleitung zu Home Assistant...',
}
for k, v in translated.items():
    if isinstance(v, str) and v in manual:
        translated[k] = manual[v]

out.write_text(json.dumps(translated, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Wrote {out} with {len(translated)} keys')
