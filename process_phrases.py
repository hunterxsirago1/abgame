import json
import re
import requests

def is_valid_for_game(phrase):
    # Only letters and spaces. No dashes, no apostrophes, no symbols.
    return all(c.isalpha() or c == ' ' for c in phrase)

def expand_contractions(phrase):
    # Simple substitution for common contractions
    phrase = re.sub(r"\bcan't\b", "can not", phrase, flags=re.I)
    phrase = re.sub(r"\bwon't\b", "will not", phrase, flags=re.I)
    phrase = re.sub(r"\bit's\b", "it is", phrase, flags=re.I)
    phrase = re.sub(r"\bhe's\b", "he is", phrase, flags=re.I)
    phrase = re.sub(r"\bshe's\b", "she is", phrase, flags=re.I)
    phrase = re.sub(r"\bthat's\b", "that is", phrase, flags=re.I)
    phrase = re.sub(r"\bwhat's\b", "what is", phrase, flags=re.I)
    phrase = re.sub(r"\bwho's\b", "who is", phrase, flags=re.I)
    phrase = re.sub(r"\bthere's\b", "there is", phrase, flags=re.I)
    phrase = re.sub(r"\bi'm\b", "i am", phrase, flags=re.I)
    phrase = re.sub(r"\byou're\b", "you are", phrase, flags=re.I)
    phrase = re.sub(r"\bwe're\b", "we are", phrase, flags=re.I)
    phrase = re.sub(r"\bthey're\b", "they are", phrase, flags=re.I)
    phrase = re.sub(r"\bdon't\b", "do not", phrase, flags=re.I)
    phrase = re.sub(r"\bdidn't\b", "did not", phrase, flags=re.I)
    phrase = re.sub(r"\bdoesn't\b", "does not", phrase, flags=re.I)
    phrase = re.sub(r"\bi've\b", "i have", phrase, flags=re.I)
    phrase = re.sub(r"\byou've\b", "you have", phrase, flags=re.I)
    phrase = re.sub(r"\bwe've\b", "we have", phrase, flags=re.I)
    phrase = re.sub(r"\bthey've\b", "they have", phrase, flags=re.I)
    phrase = re.sub(r"\bi'll\b", "i will", phrase, flags=re.I)
    phrase = re.sub(r"\byou'll\b", "you will", phrase, flags=re.I)
    phrase = re.sub(r"\bhe'll\b", "he will", phrase, flags=re.I)
    phrase = re.sub(r"\bshe'll\b", "she will", phrase, flags=re.I)
    phrase = re.sub(r"\bi'd\b", "i would", phrase, flags=re.I)
    phrase = re.sub(r"\byou'd\b", "you would", phrase, flags=re.I)
    
    # Generic n't expansion
    phrase = re.sub(r"n't\b", " not", phrase, flags=re.I)
    # Generic 's expansion (risk of possession, but usually OK for common phrases)
    phrase = re.sub(r"'s\b", " is", phrase, flags=re.I)
    
    return phrase

def clean_phrase(phrase):
    # Remove text in parentheses like (something)
    phrase = re.sub(r'\(.*?\)', '', phrase)
    # Remove bracketed stuff like [ex. ...]
    phrase = re.sub(r'\[.*?\]', '', phrase)
    
    # Expand contractions BEFORE stripping non-letters
    phrase = expand_contractions(phrase)
    
    # Remove leading numbers like "1. ", "10."
    phrase = re.sub(r'^\d+\.?\s*', '', phrase)
    # Remove ellipsis
    phrase = phrase.replace('...', '').replace('…', '')
    # Clean whitespace
    phrase = " ".join(phrase.split())
    # The user said "dont include dashes and any symbols"
    # So if it has any left (regex allowed only letters/spaces), we return None
    if not is_valid_for_game(phrase):
        return None
    return phrase.lower()

def main():
    phrases = set()

    # 1. Process User Phrases (First List)
    try:
        with open('user_phrases.txt', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line: continue
                # Handle slashes like "A bit/A little bit"
                if '/' in line:
                    parts = line.split('/')
                    for p in parts:
                        cleaned = clean_phrase(p)
                        if cleaned: phrases.add(cleaned)
                else:
                    cleaned = clean_phrase(line)
                    if cleaned: phrases.add(cleaned)
    except Exception as e:
        print(f"Error reading user_phrases.txt: {e}")

    # 2. Process Espresso Phrases (Second List)
    try:
        with open('espresso_phrases.txt', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line: continue
                # Look for lines starting with a number (typical Espresso phrase line)
                if re.match(r'^\d+\.', line):
                    # Could have slashes or other things
                    if '/' in line:
                        parts = line.split('/')
                        for p in parts:
                            cleaned = clean_phrase(p)
                            if cleaned: phrases.add(cleaned)
                    else:
                        cleaned = clean_phrase(line)
                        if cleaned: phrases.add(cleaned)
    except Exception as e:
        print(f"Error reading espresso_phrases.txt: {e}")

    # 3. Fetch external sources (Removed per user request "use existing ones only")
    # sources = [...]

    # 4. Filter by length (2 to 5 words, max 25 chars)
    final_phrases = []
    for p in phrases:
        words = p.split()
        word_count = len(words)
        if 2 <= word_count <= 5 and len(p) <= 25:
            final_phrases.append(p)

    final_phrases.sort()
    
    # Write to data.js as an ES module
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write("const phrases = [\n")
        for i, p in enumerate(final_phrases):
            comma = "," if i < len(final_phrases) - 1 else ""
            f.write(f'  "{p}"{comma}\n')
        f.write("];\n")
        f.write("export { phrases };\n")
    
    print(f"Total unique phrases saved to data.js: {len(final_phrases)}")

if __name__ == "__main__":
    main()
