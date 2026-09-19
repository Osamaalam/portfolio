# -*- coding: utf-8 -*-
"""
High-Performance, Clinical-Grade ICD-10 XML Parser & Qdrant Seeder
Parses both Tabular and Index XML files, merges them, runs a local Medical Rules Engine
to enrich each of the 47,025 codes with physiological, anatomical, and symptomatic profiles,
generates 2,560d vector embeddings using LM Studio, and streams vectors + payloads to Qdrant.
"""

import os
import sys
import xml.etree.ElementTree as ET
import json
import time
import uuid
import re
import urllib.request
import urllib.error

# ==========================================================
# MEDICAL RULES ENGINE CONFIGURATION
# ==========================================================

# Map Chapter titles directly to systems, locations, and default types
CHAPTER_MAPPINGS = {
    "Chapter 1": {
        "body_system": "Infectious and parasitic diseases",
        "default_locations": ["systemic", "bloodstream", "lymph nodes"],
        "disease_type": "infectious disease"
    },
    "Chapter 2": {
        "body_system": "Oncology (Neoplasms)",
        "default_locations": ["cellular tissues", "organ systems", "lymphatic nodes"],
        "disease_type": "neoplasm / tumor"
    },
    "Chapter 3": {
        "body_system": "Blood and immune systems",
        "default_locations": ["bloodstream", "bone marrow", "spleen", "lymph nodes"],
        "disease_type": "hematologic / immunological disorder"
    },
    "Chapter 4": {
        "body_system": "Endocrine, Nutritional & Metabolic",
        "default_locations": ["bloodstream", "pancreas", "thyroid gland", "endocrine system"],
        "disease_type": "endocrine / metabolic disorder"
    },
    "Chapter 5": {
        "body_system": "Mental, Behavioral and Neurodevelopmental",
        "default_locations": ["brain", "central nervous system", "cognitive pathways"],
        "disease_type": "mental / psychiatric disorder"
    },
    "Chapter 6": {
        "body_system": "Nervous system",
        "default_locations": ["brain", "spinal cord", "peripheral nerves", "synapses"],
        "disease_type": "neurological condition"
    },
    "Chapter 7": {
        "body_system": "Eye and adnexa",
        "default_locations": ["eye", "retina", "cornea", "optic nerve", "eyelid"],
        "disease_type": "ophthalmic condition"
    },
    "Chapter 8": {
        "body_system": "Ear and mastoid",
        "default_locations": ["ear", "middle ear", "eardrum", "inner ear", "cochlea"],
        "disease_type": "otologic condition"
    },
    "Chapter 9": {
        "body_system": "Circulatory system",
        "default_locations": ["heart", "blood vessels", "coronary arteries", "myocardium", "valves"],
        "disease_type": "cardiovascular disease"
    },
    "Chapter 10": {
        "body_system": "Respiratory system",
        "default_locations": ["lungs", "bronchus", "airways", "trachea", "nasal passages"],
        "disease_type": "respiratory condition"
    },
    "Chapter 11": {
        "body_system": "Digestive system",
        "default_locations": ["gastrointestinal tract", "stomach", "intestine", "colon", "esophagus", "liver", "gallbladder"],
        "disease_type": "gastrointestinal disorder"
    },
    "Chapter 12": {
        "body_system": "Skin and subcutaneous",
        "default_locations": ["skin", "dermis", "epidermis", "hair follicles", "sebaceous glands"],
        "disease_type": "dermatological condition"
    },
    "Chapter 13": {
        "body_system": "Musculoskeletal and connective",
        "default_locations": ["joints", "bones", "muscles", "tendons", "cartilage", "ligaments"],
        "disease_type": "musculoskeletal condition"
    },
    "Chapter 14": {
        "body_system": "Genitourinary system",
        "default_locations": ["kidneys", "bladder", "urinary tract", "ureter", "urethra", "uterus", "prostate"],
        "disease_type": "genitourinary disorder"
    },
    "Chapter 15": {
        "body_system": "Pregnancy, childbirth and puerperium",
        "default_locations": ["uterus", "placenta", "fetus", "maternal reproductive tract"],
        "disease_type": "obstetric condition"
    },
    "Chapter 16": {
        "body_system": "Perinatal conditions",
        "default_locations": ["systemic", "placenta", "umbilical cord"],
        "disease_type": "perinatal condition"
    },
    "Chapter 17": {
        "body_system": "Congenital malformations and anomalies",
        "default_locations": ["organ structures", "bones", "chromosomes"],
        "disease_type": "congenital anomaly"
    },
    "Chapter 18": {
        "body_system": "Symptoms, signs and findings NEC",
        "default_locations": ["systemic", "various tissues", "bloodstream"],
        "disease_type": "clinical symptom / finding"
    },
    "Chapter 19": {
        "body_system": "Injury, poisoning and external causes",
        "default_locations": ["limbs", "brain", "skin", "internal organs"],
        "disease_type": "injury / trauma / poisoning"
    },
    "Chapter 20": {
        "body_system": "External causes of morbidity",
        "default_locations": ["external environment"],
        "disease_type": "external hazard factor"
    },
    "Chapter 21": {
        "body_system": "Factors influencing health status",
        "default_locations": ["systemic"],
        "disease_type": "health status index factor"
    },
    "Chapter 22": {
        "body_system": "Special purpose codes",
        "default_locations": ["systemic"],
        "disease_type": "special purpose classification"
    }
}

# Regex rules for symptom mapping, organism tracking, and anatomical location overrides
CLINICAL_RULES = {
    "suffixes": [
        (r"itis", "inflammatory / infectious"),
        (r"osis", "chronic / degenerative"),
        (r"oma", "neoplastic / tumor"),
        (r"megaly", "organ hypertrophic"),
        (r"pathy", "pathological condition"),
        (r"algia|pain", "pain condition"),
    ],
    "symptoms": [
        (r"enteritis|gastroenteritis|cholera|diarrhea|colitis|dysentery", ["diarrhea", "vomiting", "abdominal cramps", "nausea", "dehydration", "loose stools"]),
        (r"pneumonia|bronchitis|asthma|influenza|cough|respiratory|copd", ["cough", "fever", "shortness of breath", "dyspnea", "chest congestion", "wheezing"]),
        (r"arthritis|osteoarthritis|gout|rheumat", ["joint pain", "stiffness", "swelling", "decreased range of motion", "joint inflammation"]),
        (r"angina|infarction|ischemia|myocard|coronary|heart|cardiac", ["chest pain", "pressure", "angina pectoris", "shortness of breath", "sweating", "palpitations"]),
        (r"neuropathy|neuralgia|neuritis|nerve|paresthesia", ["burning pain", "numbness", "tingling", "paresthesia", "nerve sensitivity", "loss of sensation"]),
        (r"migraine|headache|cephalalgia", ["throbbing headache", "nausea", "sensitivity to light", "photophobia", "dizziness"]),
        (r"neoplasm|carcinoma|cancer|tumor|malignant|adenoma|leukemia", ["unexplained weight loss", "fatigue", "mass", "abnormal tissue growth", "localized pain"]),
        (r"infection|sepsis|septicemia|fever|abscess|pyogenic", ["fever", "chills", "elevated heart rate", "fatigue", "sweating", "localized inflammation"]),
        (r"kidney|renal|nephritis|uremia|calculus", ["decreased urine output", "fluid retention", "fatigue", "flank pain", "nausea"]),
        (r"skin|dermatitis|rash|eczema|pruritus|cellulitis", ["itching", "redness", "skin rash", "dry skin", "blisters", "scaling skin"]),
    ],
    "organisms": [
        (r"calicivirus|norovirus|norwalk", ["calicivirus", "norovirus"]),
        (r"salmonella", ["salmonella enterica", "salmonella bacterium"]),
        (r"shigella|shigellosis", ["shigella bacterium"]),
        (r"vibrio|cholerae", ["vibrio cholerae"]),
        (r"tuberculosis|tb", ["mycobacterium tuberculosis"]),
        (r"streptococc", ["streptococcus bacterium"]),
        (r"staphylococc", ["staphylococcus bacterium"]),
        (r"influenza|flu", ["influenza virus"]),
        (r"herpes", ["herpes simplex virus", "herpesvirus"]),
        (r"covid|coronavirus", ["sars-cov-2", "coronavirus"]),
        (r"fungal|candida|mycosis|tinea", ["fungal pathogen", "candida yeast"]),
        (r"viral|virus", ["viral pathogen"]),
        (r"bacterial|bacterium|bacillus", ["bacterial pathogen"]),
    ],
    "locations": [
        (r"cardiac|heart|myocardial|valvular|coronary|aortic|atrial", ["heart", "myocardium", "coronary arteries", "heart valves"]),
        (r"pulmonary|lung|bronch|alveol|pleura", ["lungs", "bronchus", "airways", "alveoli"]),
        (r"gastric|stomach|duoden|peptic", ["stomach", "duodenum", "upper gastrointestinal tract"]),
        (r"intestinal|colon|enter|rectal|appendi|ileum", ["intestine", "colon", "rectum", "gastrointestinal tract", "small intestine"]),
        (r"hepatic|liver|biliary|gallbladder|chole", ["liver", "gallbladder", "biliary tract"]),
        (r"renal|kidney|nephr|ureter|bladder", ["kidneys", "renal tubules", "urinary tract", "bladder"]),
        (r"cerebral|brain|mening|spinal|cerebell", ["brain", "meninges", "spinal cord", "central nervous system"]),
        (r"joint|arthr|knee|hip|shoulder|elbow", ["joints", "articular cartilage", "articular capsule"]),
        (r"derm|skin|cutan|epiderm", ["skin", "dermis", "epidermis"]),
        (r"ophthalmic|eye|ocular|retin|corne", ["eye", "retina", "optic nerve", "cornea"]),
        (r"aural|ear|mastoid|otitis|tympan", ["ear", "auditory canal", "tympanic membrane", "middle ear"]),
    ]
}

# Generate logical negative exclusions based on terms
def infer_excludes(name_text):
    text_lower = name_text.lower()
    excludes = []
    if "viral" in text_lower or "virus" in text_lower:
        excludes.extend(["bacterial infection", "noninfectious disease"])
    elif "bacterial" in text_lower or "bacterium" in text_lower:
        excludes.extend(["viral infection", "parasitic infestation"])
    
    if "acute" in text_lower:
        excludes.append("chronic form of condition")
    elif "chronic" in text_lower:
        excludes.append("acute episode / onset")
        
    if "congenital" in text_lower:
        excludes.append("acquired form of same condition")
    elif "acquired" in text_lower:
        excludes.append("congenital deformity")
        
    return list(set(excludes))

# Gathers clinical rules mapping
def run_rules_engine(code, name, chapter_title, index_paths, synonyms):
    # Retrieve base defaults from chapter mapping
    chapter_key = "Chapter 22" # fallback
    for k in CHAPTER_MAPPINGS.keys():
        if k in chapter_title:
            chapter_key = k
            break
            
    ch_map = CHAPTER_MAPPINGS[chapter_key]
    
    body_system = ch_map["body_system"]
    body_locations = list(ch_map["default_locations"])
    disease_type = ch_map["disease_type"]
    organisms = []
    symptoms = []
    
    # Merge searchable text for token matching
    merged_search_text = " ".join([name] + index_paths + synonyms).lower()
    
    # 1. Refine Disease Type Suffixes
    for pattern, val in CLINICAL_RULES["suffixes"]:
        if re.search(pattern, merged_search_text):
            disease_type = val
            break
            
    # 2. Refine Body Locations
    for pattern, locations_list in CLINICAL_RULES["locations"]:
        if re.search(pattern, merged_search_text):
            body_locations = list(set(body_locations + locations_list))
            
    # 3. Extract path organisms
    for pattern, organisms_list in CLINICAL_RULES["organisms"]:
        if re.search(pattern, merged_search_text):
            organisms = list(set(organisms + organisms_list))
            
    # 4. Extract path symptoms
    for pattern, symptoms_list in CLINICAL_RULES["symptoms"]:
        if re.search(pattern, merged_search_text):
            symptoms = list(set(symptoms + symptoms_list))
            
    # 5. Extract logic excludes
    excludes = infer_excludes(name)
    
    return {
        "body_system": body_system,
        "body_locations": body_locations,
        "disease_type": disease_type,
        "organisms": organisms,
        "symptoms": symptoms,
        "excludes": excludes
    }

# ==========================================================
# SEEDER RUNTIME METHODS
# ==========================================================

# Load environment variables from .env
def load_dotenv():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dotenv_path = os.path.join(base_dir, '.env')
    if os.path.exists(dotenv_path):
        print(f"[SEEDER] Loading environment from {dotenv_path}...")
        with open(dotenv_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip()

# Clean up XML element text extraction, preserving all nested text nodes
def get_clean_text(elem):
    if elem is None:
        return ""
    return "".join(elem.itertext()).strip()

# Parse the Tabular XML
def parse_tabular_xml(file_path):
    print(f"[SEEDER] Parsing Tabular XML: {file_path}...")
    start_time = time.time()
    
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    records = {}
    
    # Iterate over Chapters
    for chapter in root.findall('chapter'):
        ch_num = get_clean_text(chapter.find('name'))
        ch_desc = get_clean_text(chapter.find('desc'))
        ch_title = f"Chapter {ch_num}: {ch_desc}" if ch_num else ch_desc
        
        # Iterate over Sections/Blocks
        for section in chapter.findall('section'):
            sec_desc = get_clean_text(section.find('desc'))
            
            # Recursive function to traverse nested diags
            def traverse_diag(diag_elem, parent_code=None):
                code_elem = diag_elem.find('name')
                desc_elem = diag_elem.find('desc')
                if code_elem is None or desc_elem is None:
                    return
                
                code = get_clean_text(code_elem)
                desc = get_clean_text(desc_elem)
                
                # Extract tabular synonyms/inclusion terms
                synonyms = []
                inc_term = diag_elem.find('inclusionTerm')
                if inc_term is not None:
                    for note in inc_term.findall('note'):
                        note_text = get_clean_text(note)
                        if note_text:
                            synonyms.append(note_text)
                
                records[code] = {
                    "code": code,
                    "name": desc,
                    "chapter": ch_title,
                    "block": sec_desc,
                    "parent_code": parent_code,
                    "synonyms": synonyms,
                    "index_paths": [] # To be filled from index XML
                }
                
                # Traverse nested diagnostics
                for child in diag_elem.findall('diag'):
                    traverse_diag(child, parent_code=code)
            
            for diag in section.findall('diag'):
                traverse_diag(diag)
                
    elapsed = time.time() - start_time
    print(f"[SEEDER] Successfully parsed {len(records)} Tabular codes in {elapsed:.2f} seconds!")
    return records

# Parse the Index XML and merge terms with Tabular codes
def merge_index_xml(file_path, tabular_records):
    print(f"[SEEDER] Parsing and merging Index XML: {file_path}...")
    start_time = time.time()
    
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    match_count = 0
    
    # Iterate over letters and mainTerms
    for main_term in root.findall('.//mainTerm'):
        title_elem = main_term.find('title')
        if title_elem is None:
            continue
        main_title = get_clean_text(title_elem)
        
        # Check direct code
        code_elem = main_term.find('code')
        if code_elem is not None:
            code = get_clean_text(code_elem).replace(" ", "")
            if code in tabular_records:
                tabular_records[code]["index_paths"].append(main_title)
                match_count += 1
                
        # Recursive traverse for subterms
        def traverse_subterms(elem, path):
            nonlocal match_count
            for term in elem.findall('term'):
                t_title_elem = term.find('title')
                if t_title_elem is None:
                    continue
                t_title = get_clean_text(t_title_elem)
                curr_path = f"{path} > {t_title}"
                
                t_code_elem = term.find('code')
                if t_code_elem is not None:
                    code = get_clean_text(t_code_elem).replace(" ", "")
                    if code in tabular_records:
                        tabular_records[code]["index_paths"].append(curr_path)
                        match_count += 1
                        
                traverse_subterms(term, curr_path)
                
        traverse_subterms(main_term, main_title)
        
    elapsed = time.time() - start_time
    print(f"[SEEDER] Successfully parsed Index XML and merged {match_count} terms in {elapsed:.2f} seconds!")

# Setup Qdrant Collection
def setup_qdrant_collection(qdrant_url, qdrant_api_key, collection_name):
    print(f"[SEEDER] Setting up Qdrant collection '{collection_name}' at {qdrant_url}...")
    
    headers = {
        "Content-Type": "application/json"
    }
    if qdrant_api_key:
        headers["api-key"] = qdrant_api_key
        
    url = f"{qdrant_url}/collections/{collection_name}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as res:
            print(f"[SEEDER] Collection '{collection_name}' already exists. Recreating it for clean start...")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"[SEEDER] Collection '{collection_name}' does not exist yet. Creating...")
        else:
            print(f"[SEEDER] Error checking Qdrant: {e.read().decode()}")
            raise e
    except Exception as e:
        print(f"[SEEDER] Qdrant connection error: {e}")
        raise e

    # Delete if exists
    try:
        req = urllib.request.Request(url, headers=headers, method="DELETE")
        with urllib.request.urlopen(req, timeout=5) as res:
            pass
    except Exception:
        pass
        
    # Create fresh collection with 1024 dimensions and Cosine distance
    payload = {
        "vectors": {
            "size": 1024,
            "distance": "Cosine"
        }
    }
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="PUT")
        with urllib.request.urlopen(req, timeout=5) as res:
            response = json.loads(res.read().decode())
            print(f"[SEEDER] Created collection '{collection_name}' successfully: {response}")
    except Exception as e:
        print(f"[SEEDER] Failed to create collection: {e}")
        raise e

# Embed context texts using LM Studio in batch
def get_embeddings_batch(texts, embedding_url, model_name):
    payload = {
        "model": model_name,
        "input": texts
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(embedding_url, data=json.dumps(payload).encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=120) as res:
                response = json.loads(res.read().decode())
                embeddings = [item["embedding"] for item in response["data"]]
                return embeddings
        except Exception as e:
            print(f"[SEEDER] LM Studio Embedding attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise e

# Upsert points to Qdrant
def upsert_to_qdrant(points, qdrant_url, qdrant_api_key, collection_name):
    url = f"{qdrant_url}/collections/{collection_name}/points"
    payload = {
        "points": points
    }
    headers = {
        "Content-Type": "application/json"
    }
    if qdrant_api_key:
        headers["api-key"] = qdrant_api_key
        
    max_retries = 3
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="PUT")
            with urllib.request.urlopen(req, timeout=20) as res:
                res.read()
                return True
        except Exception as e:
            print(f"[SEEDER] Qdrant upsert attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise e

# Main Seeding Process
def main():
    load_dotenv()
    
    # Resolve Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    tabular_xml_path = os.path.join(base_dir, "ICD-10", "icd10cm-tabular_-2027.xml")
    index_xml_path = os.path.join(base_dir, "ICD-10", "icd10cm-index-2027.xml")
    output_index_json_path = os.path.join(base_dir, "src", "data", "icd10_index.json")
    checkpoint_path = os.path.join(base_dir, "src", "scripts", "seed_checkpoint.txt")
    
    # Configuration
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_api_key = os.getenv("QDRANT_API_KEY", "")
    embedding_url = os.getenv("EMBEDDING_API_URL", "http://127.0.0.1:6969/v1/embeddings")
    model_name = os.getenv("EMBEDDING_MODEL_NAME", "text-embedding-qwen3-embedding-4b")
    collection_name = "icd10_codes"
    
    print("\n" + "="*60)
    print("HIGH-PRECISION ICD-10 VECTOR SEEDING ENGINE")
    print("="*60)
    print(f"Qdrant Endpoint:   {qdrant_url}")
    print(f"LM Studio Host:    {embedding_url}")
    print(f"Embedding Model:   {model_name}")
    print("="*60 + "\n")
    
    # 1. Parse & Merge XML Files
    records = parse_tabular_xml(tabular_xml_path)
    merge_index_xml(index_xml_path, records)
    
    # Run dynamic clinical tagging to enrich records
    print("[SEEDER] Enriching records with Medical Rules Engine (Body Systems, Locations, Symptoms, Pathfinder Organisms)...")
    start_enrich = time.time()
    for code, rec in records.items():
        clinical_profile = run_rules_engine(
            code=code,
            name=rec["name"],
            chapter_title=rec["chapter"],
            index_paths=rec["index_paths"],
            synonyms=rec["synonyms"]
        )
        # Update record with extensive fields
        rec.update(clinical_profile)
        
    print(f"[SEEDER] Completed Medical Rules tagging for all {len(records)} codes in {time.time() - start_enrich:.2f}s!")
    
    # Ensure src/data exists and save lookup JSON
    os.makedirs(os.path.dirname(output_index_json_path), exist_ok=True)
    print(f"[SEEDER] Saving local database lookup file to {output_index_json_path}...")
    with open(output_index_json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print("[SEEDER] Local lookup database saved successfully!")
    
    # 2. Checkpoint Loading
    completed_codes = set()
    if os.path.exists(checkpoint_path):
        with open(checkpoint_path, "r", encoding="utf-8") as f:
            for line in f:
                c = line.strip()
                if c:
                    completed_codes.add(c)
        print(f"[SEEDER] Checkpoint loaded. Found {len(completed_codes)} already completed codes.")
    else:
        print("[SEEDER] No checkpoint found. Starting fresh seed.")
        
    # 3. Setup Qdrant (only if starting fresh)
    if len(completed_codes) == 0:
        try:
            setup_qdrant_collection(qdrant_url, qdrant_api_key, collection_name)
        except Exception as e:
            print(f"[SEEDER] CRITICAL: Qdrant setup failed: {e}. Exiting.")
            sys.exit(1)
            
    # 4. Filter remaining codes
    all_codes = sorted(list(records.keys()))
    remaining_codes = [c for c in all_codes if c not in completed_codes]
    total_remaining = len(remaining_codes)
    
    print(f"[SEEDER] Total Codes in Catalog: {len(all_codes)}")
    print(f"[SEEDER] Remaining to Seeding:   {total_remaining}")
    
    if total_remaining == 0:
        print("[SEEDER] All codes are already seeded successfully! Nothing to do.")
        sys.exit(0)
        
    # 5. Seeding Batch Loop (LM Studio + Qdrant)
    # Batch sizes
    EMBED_BATCH_SIZE = 4 # Number of strings to vectorize in one LM Studio batch
    UPSERT_BATCH_SIZE = 16 # Number of vectors to stream to Qdrant in one transaction
    
    print(f"\n[SEEDER] Commencing vectorization. Embedding batch: {EMBED_BATCH_SIZE} | Upsert batch: {UPSERT_BATCH_SIZE}")
    print("[SEEDER] Progress will be saved continuously. Press Ctrl+C to safely pause.\n")
    
    points_buffer = []
    checkpoint_buffer = []
    
    start_time = time.time()
    processed_count = 0
    
    # We slice remaining codes in batches of EMBED_BATCH_SIZE
    for i in range(0, total_remaining, EMBED_BATCH_SIZE):
        batch_codes = remaining_codes[i : i + EMBED_BATCH_SIZE]
        
        # Compile contextual strings for embedding
        batch_texts = []
        batch_records = []
        
        for code in batch_codes:
            rec = records[code]
            
            # Format positive-only high-context string
            parts = [
                f"CHAPTER: {rec['chapter']}",
                f"BLOCK: {rec['block']}",
            ]
            if rec['parent_code']:
                parent_desc = records[rec['parent_code']]['name'] if rec['parent_code'] in records else ""
                if parent_desc:
                    parts.append(f"PARENT: {parent_desc} ({rec['parent_code']})")
                    
            parts.append(f"CODE: {code}")
            parts.append(f"DIAGNOSIS: {rec['name']}")
            parts.append(f"BODY SYSTEM: {rec['body_system']}")
            parts.append(f"BODY LOCATION: {', '.join(rec['body_locations'])}")
            parts.append(f"DISEASE TYPE: {rec['disease_type']}")
            
            if rec['organisms']:
                parts.append(f"ORGANISM: {', '.join(rec['organisms'])}")
                
            if rec['symptoms']:
                parts.append(f"SYMPTOMS: {', '.join(rec['symptoms'])}")
                
            if rec['synonyms']:
                parts.append(f"SYNONYMS: {', '.join(rec['synonyms'])}")
                
            if rec['index_paths']:
                parts.append(f"SEARCH INDEX: {'; '.join(rec['index_paths'])}")
                
            context_string = "\n".join(parts)
            batch_texts.append(context_string)
            batch_records.append(rec)
            
        # Get embeddings from LM Studio
        try:
            embed_start = time.time()
            vectors = get_embeddings_batch(batch_texts, embedding_url, model_name)
            embed_elapsed = time.time() - embed_start
            print(f"  - Vectorized batch of {len(batch_codes)} codes ({batch_codes[0]} to {batch_codes[-1]}) in {embed_elapsed:.2f}s", flush=True)
        except Exception as e:
            print(f"\n[SEEDER] Error fetching embeddings: {e}. Pausing process. Check LM Studio server.")
            break
            
        # Compile Qdrant point objects
        for code, rec, vector in zip(batch_codes, batch_records, vectors):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_OID, code))
            
            points_buffer.append({
                "id": point_id,
                "vector": vector,
                "payload": {
                    "code": code,
                    "name": rec["name"],
                    "chapter": rec["chapter"],
                    "block": rec["block"],
                    "parent_code": rec["parent_code"] or "",
                    "body_system": rec["body_system"],
                    "body_locations": rec["body_locations"],
                    "disease_type": rec["disease_type"],
                    "organisms": rec["organisms"],
                    "symptoms": rec["symptoms"],
                    "synonyms": rec["synonyms"],
                    "excludes": rec["excludes"],
                    "search_index_paths": rec["index_paths"]
                }
            })
            checkpoint_buffer.append(code)
            
        # Check if we should upsert buffer to Qdrant
        if len(points_buffer) >= UPSERT_BATCH_SIZE or (i + EMBED_BATCH_SIZE) >= total_remaining:
            try:
                upsert_to_qdrant(points_buffer, qdrant_url, qdrant_api_key, collection_name)
                
                # Append completed codes to checkpoint file
                with open(checkpoint_path, "a", encoding="utf-8") as cf:
                    for code in checkpoint_buffer:
                        cf.write(f"{code}\n")
                        
                processed_count += len(checkpoint_buffer)
                
                # Print progress telemetry
                elapsed = time.time() - start_time
                avg_speed = processed_count / elapsed if elapsed > 0 else 0
                remaining_time = (total_remaining - processed_count) / avg_speed if avg_speed > 0 else 0
                
                print(f"[PROGRESS] Seeded: {processed_count + len(completed_codes)}/{len(all_codes)} ({(processed_count + len(completed_codes))/len(all_codes)*100:.1f}%) | "
                      f"Speed: {avg_speed:.1f} codes/sec | "
                      f"ETA: {remaining_time/60:.1f}m")
                
                # Clear buffers
                points_buffer = []
                checkpoint_buffer = []
                
            except Exception as e:
                print(f"\n[SEEDER] Error uploading to Qdrant: {e}. Pausing process. Check Qdrant network connection.")
                break
                
    total_elapsed = time.time() - start_time
    print("\n" + "="*60)
    print("VECTOR SEEDING RUN COMPLETED!")
    print("="*60)
    print(f"Codes processed in this run: {processed_count}")
    print(f"Total time elapsed:          {total_elapsed/60:.2f} minutes")
    print(f"Checkpoint file saved:       {checkpoint_path}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
