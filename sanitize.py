from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
import sys
import json

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

def sanitize(text):
    results = analyzer.analyze(text=text, language="en")
    anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
    # Collect detected entity types for reporting
    detected_entities = [{"type": r.entity_type, "start": r.start, "end": r.end} for r in results]
    return anonymized.text, detected_entities

if __name__ == "__main__":
    for line in sys.stdin:
        try:
            data = json.loads(line)
            text = data.get("text", "")
            sanitized, detected_entities = sanitize(text)
            print(json.dumps({"sanitized": sanitized, "detected_entities": detected_entities}), flush=True)
        except Exception as e:
            print(json.dumps({"error": str(e), "sanitized": text, "detected_entities": []}), flush=True)