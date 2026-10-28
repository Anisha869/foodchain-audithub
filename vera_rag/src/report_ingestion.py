import os
import re
from typing import List, Dict, Any
# Clean, lightweight regex sentence segmentation (fast & zero overhead)

def segment_report(text: str) -> List[Dict[str, Any]]:
    """
    Segments raw continuous audit report prose into clean sentences and paragraphs.
    Returns a list of segments with sentence text and index.
    """
    if not text or not text.strip():
        return []
        
    cleaned_text = text.replace('\r\n', '\n').strip()
    
    # Fast, robust regex sentence segmentation without heavy spacy overhead
    raw_sents = re.split(r'(?<=[.!?])\s+', cleaned_text)
    segments = []
    idx = 0
    for s in raw_sents:
        s_clean = s.strip().replace('\n', ' ')
        if len(s_clean) > 8:
            segments.append({
                'id': idx,
                'text': s_clean
            })
            idx += 1
            
    return segments
